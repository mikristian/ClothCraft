import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {inspectNativeGradingWorkflow20261025} from './nativeGradingWorkflowReadiness20261025.js'
import {inspectNativeGradingReleaseGate20261025} from './nativeGradingReleaseGate20261025.js'

const source=()=>({revision:17,template:{panels:['front','back'].map(id=>({
  id,polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['top','right','bottom','left']}})),
  seams:[{id:'join',a:{panel:'front',edge:'top',range:[0,1]},
    b:{panel:'back',edge:'top',range:[0,1]},reverse_b:true,allow_ease:false}]}})
const fixture=()=>{const snapshot=source();const ruleSet=createAccuMarkNativeRuleSet(snapshot).ruleSet;return {snapshot,ruleSet}}
const allSizes=['XS','S','M','L','XL','XXL']

test('workflow rejects missing, duplicate or wrong-order grade size sets',()=>{
  const {snapshot,ruleSet}=fixture()
  assert.equal(inspectNativeGradingWorkflow20261025(snapshot,ruleSet).sewingReady,true)
  for(const sizes of [allSizes.slice(0,5),['XS','S','M','L','XL','XL'],
    [...allSizes].reverse(),[...allSizes,'3XL']]){
    const result=inspectNativeGradingWorkflow20261025(snapshot,{...ruleSet,sizes})
    assert.equal(result.previewReady,false)
    assert.equal(result.manufacturingApproved,false)
    assert.equal(result.issues[0].code,'INVALID_SIZE_SET')
  }
})

test('missing or duplicate panel identities block workflow coverage',()=>{
  for(const mutate of [s=>{s.template.panels=[]},
    s=>{s.template.panels[1].id='front'},s=>{delete s.template.panels[1].id}]){
    const {snapshot,ruleSet}=fixture()
    mutate(snapshot)
    const result=inspectNativeGradingWorkflow20261025(snapshot,ruleSet)
    assert.equal(result.previewReady,false)
    assert.equal(result.sewingReady,false)
    assert.equal(result.manufacturingApproved,false)
  }
})

test('status-only, wrong-size, and stale manufactured proof never grant release',()=>{
  const {snapshot,ruleSet}=fixture()
  const nativeCatalog={ok:true,persisted:true,sourceRevision:snapshot.revision,
    templateFingerprint:ruleSet.templateFingerprint,pomSpecs:[],sizes:allSizes}
  const gradedCutProof={authoritativeRust:true,sourceRevision:snapshot.revision,
    approvedForSizing:true,verifiedSizes:allSizes}
  const receivingCadProof={verified:true,independentReceiver:true,
    sourceRevision:snapshot.revision,appliesToAllSizes:true}
  const cases=[{nativeCatalog,gradedCutProof,receivingCadProof},
    {nativeCatalog:{...nativeCatalog,sizes:['XS','S','M','L','XL','XL']}},
    {nativeCatalog:{...nativeCatalog,sourceRevision:snapshot.revision+1}},
    {gradedCutProof:{...gradedCutProof,verifiedSizes:['XS','S','M','L','XL','XL']}},
    {receivingCadProof:{...receivingCadProof,verifiedSizes:allSizes}}]
  for(const proofs of cases){
    const result=inspectNativeGradingReleaseGate20261025(snapshot,ruleSet,[],proofs)
    assert.equal(result.ok,false)
    assert.equal(result.manufacturingApproved,false)
    assert.equal(result.cuttingAuthorized,false)
    assert.equal(result.manufacturerReady,false)
  }
  const claimed=inspectNativeGradingReleaseGate20261025(snapshot,ruleSet,[],cases[0])
  assert.deepEqual(claimed.checks.filter(row=>row.ok).map(row=>row.id),['geometry','seams'])
})
