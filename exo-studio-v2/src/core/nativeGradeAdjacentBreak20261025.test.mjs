import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {setNativeAdjacentGradeBreak20261025 as change,setNativeUniformGradeBreaks20261025 as uniform} from './nativeGradeAdjacentBreak20261025.js'

const source=()=>({template:{panels:['front','back'].map(id=>({id,polygon:{
  points:[[0,0],[0.3,0],[0.3,0.4],[0,0.4]],edges:['top','right','bottom','left'],
}}))}})
function fixture(){
 const snapshot=source(),initial=createAccuMarkNativeRuleSet(snapshot)
 assert.equal(initial.ok,true,initial.reason)
 let rules=initial.ruleSet
 for(const [size,dx] of [['XS',-12],['S',-6],['L',7],['XL',15],['XXL',24]]){
  const next=editAccuMarkNativePointRule(snapshot,rules,{panelId:'front',pointIndex:1,size,dxMm:dx,dyMm:0})
  assert.equal(next.ok,true,next.reason);rules=next.ruleSet
 }
 return {snapshot,rules}
}
const x=(r,size)=>r.panels.front.pointOffsetsMm[size][1][0]
test('larger-side step preserves all other increments and all unrelated pattern points',()=>{
 const {snapshot,rules}=fixture(),prior=structuredClone(rules)
 const result=change(snapshot,rules,{panelId:'front',pointIndex:1,fromSize:'L',toSize:'XL',dxMm:12,dyMm:2})
 assert.equal(result.ok,true,result.reason)
 assert.deepEqual(result.changedSizes,['XL','XXL'])
 assert.equal(x(result.ruleSet,'L'),7)
 assert.equal(x(result.ruleSet,'XL'),19)
 assert.equal(x(result.ruleSet,'XXL'),28)
 assert.deepEqual(result.ruleSet.panels.back,rules.panels.back)
 assert.deepEqual(result.ruleSet.panels.front.pointOffsetsMm.M,rules.panels.front.pointOffsetsMm.M)
 assert.deepEqual(rules,prior)
 assert.equal(result.nativeCommitted,false)
 assert.equal(result.manufacturingApproved,false)
})
test('smaller-side step moves only the smaller side relative to fixed base',()=>{
 const {snapshot,rules}=fixture()
 const result=change(snapshot,rules,{panelId:'front',pointIndex:1,fromSize:'S',toSize:'M',dxMm:9,dyMm:1})
 assert.equal(result.ok,true,result.reason)
 assert.deepEqual(result.changedSizes,['XS','S'])
 assert.equal(x(result.ruleSet,'S'),-9)
 assert.equal(x(result.ruleSet,'XS'),-15)
 assert.equal(x(result.ruleSet,'M'),0)
 assert.equal(x(result.ruleSet,'L'),7)
})
test('the smallest step retains the nearer-to-base size, even with negative unequal increments',()=>{
 const {snapshot,rules}=fixture()
 const result=change(snapshot,rules,{panelId:'front',pointIndex:1,fromSize:'XS',toSize:'S',dxMm:-3,dyMm:-4})
 assert.equal(result.ok,true,result.reason)
 assert.deepEqual(result.changedSizes,['XS'])
 assert.equal(x(result.ruleSet,'XS'),-3)
 assert.equal(x(result.ruleSet,'S'),-6)
 assert.deepEqual(result.ruleSet.panels.front.pointOffsetsMm.XS[1],[-3,4])
})
test('invalid adjacency, unsafe values, stale geometry and collapsed polygon fail without mutation',()=>{
 const {snapshot,rules}=fixture(),before=structuredClone(rules)
 const valid={panelId:'front',pointIndex:1,fromSize:'M',toSize:'L',dxMm:7,dyMm:0}
 for(const bad of [{toSize:'XL'},{dxMm:Infinity},{dxMm:'7'},{pointIndex:100},
   {fromSize:'XXL',toSize:'XS'},{dxMm:1e9},{dxMm:-307}]){
  const result=change(snapshot,rules,{...valid,...bad})
  assert.equal(result.ok,false,JSON.stringify(bad))
 }
 const stale=structuredClone(snapshot)
 stale.template.panels[0].polygon.points[0][0]=.01
 assert.equal(change(stale,rules,valid).ok,false)
 assert.deepEqual(rules,before)
})
test('custom size sets must not bypass physical contour QA',()=>{
 const snapshot=source()
 const seed=createAccuMarkNativeRuleSet(snapshot,{sizes:['A','B','C'],baseSize:'B'})
 assert(seed.ok,seed.reason)
 const input=structuredClone(seed.ruleSet)
 const output=change(snapshot,input,{panelId:'front',pointIndex:1,fromSize:'B',toSize:'C',dxMm:-300,dyMm:0})
 assert.equal(output.ok,false)
 assert.match(output.reason,/XS–XXL/)
 assert.equal(JSON.stringify(seed.ruleSet),JSON.stringify(input))
})
test('uniform X/Y interval distributes around base and preserves unrelated panels',()=>{
 const {snapshot,rules}=fixture(),before=structuredClone(rules)
 const result=uniform(snapshot,rules,{panelId:'front',pointIndex:1,dxMm:4,dyMm:-1})
 assert.equal(result.ok,true,result.reason)
 for(const [size,index] of ['XS','S','M','L','XL','XXL'].map((s,i)=>[s,i-2])){
  assert.deepEqual(result.ruleSet.panels.front.pointOffsetsMm[size][1],[index*4,index===0?0:index*-1])
 }
 assert.deepEqual(result.ruleSet.panels.back,rules.panels.back)
 assert.deepEqual(rules,before)
 assert.equal(result.manufacturingApproved,false)
})
test('uniform rule refuses collapsed geometry and stale input without partial mutation',()=>{
 const {snapshot,rules}=fixture(),before=structuredClone(rules)
 assert.equal(uniform(snapshot,rules,{panelId:'front',pointIndex:1,dxMm:-300,dyMm:0}).ok,false)
 assert.equal(uniform(snapshot,rules,{panelId:'front',pointIndex:100,dxMm:0,dyMm:0}).ok,false)
 assert.equal(uniform(snapshot,rules,{panelId:'front',pointIndex:1,dxMm:Infinity,dyMm:0}).ok,false)
 assert.deepEqual(rules,before)
})
