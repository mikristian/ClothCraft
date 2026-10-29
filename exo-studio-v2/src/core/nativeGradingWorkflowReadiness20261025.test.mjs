import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectNativeGradingWorkflow20261025 as check} from './nativeGradingWorkflowReadiness20261025.js'

const panel=id=>({id,polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],
  edges:['top','right','bottom','left'],curves:{}}})
const sewn=()=>({template:{panels:[panel('front'),panel('back')],seams:[
  {id:'seam-1',a:{panel:'front',edge:'top',range:[0,1]},
    b:{panel:'back',edge:'top',range:[0,1]},reverse_b:true,allow_ease:false},
]}})
const rules=source=>{
  const result=createAccuMarkNativeRuleSet(source)
  assert(result.ok,result.reason)
  return result.ruleSet
}
test('one coherent verdict for six-size source, seam and manufacturing state',()=>{
 const source=sewn(),before=structuredClone(source),ruleSet=rules(source)
 const qa=check(source,ruleSet)
 assert.equal(qa.previewReady,true)
 assert.equal(qa.sewingReady,true)
 assert.equal(qa.stage,'source-verified')
 assert.equal(qa.productionReady,false)
 assert.equal(qa.nativeCommitted,false)
 assert.equal(qa.manufacturingApproved,false)
 assert.equal(qa.sewing.rows.length,6)
 assert.deepEqual(source,before)
})
test('no sewn relationships cannot masquerade as factory verified',()=>{
 const source=sewn();source.template.seams=[]
 const qa=check(source,rules(source))
 assert.equal(qa.previewReady,true)
 assert.equal(qa.sewingReady,false)
 assert.equal(qa.stage,'needs-sewing')
 assert(qa.issues.some(i=>i.code==='NO_SEAMS'))
})
test('size-specific sewn length mismatches block combined readiness',()=>{
 const source=sewn()
 const updated=editAccuMarkNativePointRule(source,rules(source),{
   panelId:'back',size:'XL',pointIndex:1,dxMm:20,dyMm:0,
 })
 assert(updated.ok,updated.reason)
 const qa=check(source,updated.ruleSet)
 assert.equal(qa.previewReady,true)
 assert.equal(qa.sewingReady,false)
 assert(qa.issues.some(i=>i.size==='XL'&&/MISMATCH/.test(i.code)))
})
test('stale source, malformed sidecar and missing source are blocked',()=>{
 const source=sewn(),ruleSet=rules(source)
 source.template.panels[0].polygon.points[0][0]=.014
 const stale=check(source,ruleSet)
 assert.equal(stale.previewReady,false)
 assert.equal(stale.stage,'blocked')
 assert.equal(check(source,null).productionReady,false)
 assert.equal(check({},ruleSet).ok,false)
})

test('duplicate or missing physical panel identities block grade readiness',()=>{
  const source=sewn(),ruleSet=rules(source)
  source.template.panels[1].id='front'
  const result=check(source,ruleSet)
  assert.equal(result.ok,false)
  assert.equal(result.previewReady,false)
  assert(result.issues.some(issue=>issue.code==='INVALID_PANELS'))
})
