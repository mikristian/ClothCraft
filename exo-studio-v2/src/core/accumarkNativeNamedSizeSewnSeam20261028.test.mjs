import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeGradedSewnSeamQA20261023 as inspect} from './accumarkNativeGradedSewnSeamQA20261023.js'
import {proposeAccuMarkNativeGradedTemplateTransaction20261024 as propose} from './accumarkNativeGradedTemplateTransaction20261024.js'

const sizes=['2','4','6','8','10']
const snapshot=()=>({revision:4,template:{panels:['front','back'].map(id=>({id,polygon:{
 points:[[0,0],[.4,0],[.4,.2],[0,.2]],edges:['hem','right','top','left'],
 }})),seams:[{id:'join',a:{panel:'front',edge:'hem',range:[0,1]},
 b:{panel:'back',edge:'hem',range:[0,1]},reverse_b:true,allow_ease:false}],fabrics:[]}})
const rules=s=>{
 const created=createAccuMarkNativeRuleSet(s,{sizes,baseSize:'6'})
 assert(created.ok,created.reason)
 return created.ruleSet
}
const edit=(s,r,panelId,size,dxMm)=>{
 const result=editAccuMarkNativePointRule(s,r,{panelId,pointIndex:1,size,dxMm,dyMm:0})
 assert(result.ok,result.reason)
 return result.ruleSet
}

test('five arbitrary canonical sizes measure every physical sewn interval, including nonuniform growth',()=>{
 const s=snapshot();let r=rules(s)
 for(const [size,dx] of [['2',-8],['4',-3],['8',6],['10',13]]){
  r=edit(s,r,'front',size,dx);r=edit(s,r,'back',size,dx)
 }
 const before=structuredClone([s,r])
 const report=inspect(s,r,{allowNamedSizes:true})
 assert.equal(report.ok,true,JSON.stringify(report.issues))
 assert.deepEqual(report.sizes,sizes)
 assert.equal(report.rows.length,5)
 assert(report.rows.every(row=>row.mismatchMm<1e-7&&row.pass))
 const proposed=propose(s,r,{selectedSize:'10',allowNamedSizes:true})
 assert.equal(proposed.ok,true,proposed.reason)
 assert.deepEqual(Object.keys(proposed.templatesBySize),sizes)
 assert.deepEqual([s,r],before)
 assert.equal(report.manufacturingApproved,false)
})

test('one mismatched named size blocks the entire sewn grading transaction',()=>{
 const s=snapshot();let r=rules(s)
 r=edit(s,r,'back','10',12)
 const report=inspect(s,r,{allowNamedSizes:true})
 assert.equal(report.ok,false)
 assert.equal(report.rows.length,5)
 assert.equal(report.blocks,1)
 assert.equal(report.issues[0].size,'10')
 assert(report.issues[0].mismatchMm>11)
 const proposed=propose(s,r,{selectedSize:'10',allowNamedSizes:true})
 assert.equal(proposed.ok,false)
 assert.match(proposed.reason,/Sewn seam validation failed/)
})

test('legacy default remains six-size-only and named catalog cannot bypass explicit mode',()=>{
 const s=snapshot(),r=rules(s)
 assert.equal(inspect(s,r).ok,false)
 assert.equal(propose(s,r,{selectedSize:'10'}).ok,false)
})

test('duplicate or unsafe canonical sizes fail closed even with named mode',()=>{
 const s=snapshot()
 for(const bad of [['2','4','6','8','8'],['2','4','6','8','__proto__']]){
  const r=rules(s)
  r.sizes=bad
  assert.equal(inspect(s,r,{allowNamedSizes:true}).ok,false)
  assert.equal(propose(s,r,{selectedSize:'6',allowNamedSizes:true}).ok,false)
 }
})
