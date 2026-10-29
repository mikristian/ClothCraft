import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {createNativeGradingPOM20261025,inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {inspectNativeGradingReleaseGate20261025 as check} from './nativeGradingReleaseGate20261025.js'
const source=()=>({revision:3,template:{panels:['front','back'].map(id=>({
  id,polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d']}})),
  seams:[{id:'join',a:{panel:'front',edge:'a',range:[0,1]},
    b:{panel:'back',edge:'a',range:[0,1]},reverse_b:true,allow_ease:false}]}})
test('source geometry and seam pass, yet empty POM/native graded CUT fail closed',()=>{
  const s=source(),r=createAccuMarkNativeRuleSet(s).ruleSet
  const gate=check(s,r,[])
  assert.equal(gate.source.previewReady,true)
  assert.equal(gate.source.sewingReady,true)
  assert.equal(gate.ok,false)
  assert.deepEqual(gate.checks.filter(x=>!x.ok).map(x=>x.id),['pom','native','cut','cad','sample'])
  assert.equal(gate.manufacturingApproved,false)
  assert.equal(gate.cuttingAuthorized,false)
})
test('fully entered native POM specifications do not verify a self-reported native catalog',()=>{
  const s=source(),r=createAccuMarkNativeRuleSet(s).ruleSet
  const definition=createNativeGradingPOM20261025(s,r,{panelId:'front'}).definition
  const rows=inspectNativeGradingPOM20261025(s,r,[definition]).rows
  definition.targetsMm=Object.fromEntries(rows.map(x=>[x.size,x.actualMm]))
  const gate=check(s,r,[definition],{
    nativeCatalog:{ok:true,persisted:true,sourceRevision:s.revision,
      templateFingerprint:r.templateFingerprint,sizes:r.sizes,pomSpecs:[definition]},
  })
  assert.equal(gate.checks.find(x=>x.id==='pom').ok,true)
  assert.equal(gate.checks.find(x=>x.id==='native').ok,false)
  assert.equal(gate.checks.find(x=>x.id==='cut').ok,false)
  assert.equal(gate.checks.find(x=>x.id==='cad').ok,false)
  assert.equal(gate.manufacturerReady,false)
})
test('legacy fingerprint cannot validate claimed manufacturing evidence after cut-mark or sewing edits',()=>{
 const s=source(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const proof={sourceRevision:s.revision,templateFingerprint:r.templateFingerprint,
  sourceTemplate:structuredClone(s.template),sourceRuleSet:structuredClone(r),independentlyVerified:true,
  authoritativeRust:true,evidenceId:'catalog-independent',ok:true,persisted:true,
  pomSpecs:[],sizes:r.sizes}
 const baseline=check(s,r,[],{nativeCatalog:proof})
 assert.equal(baseline.checks.find(c=>c.id==='native').ok,true)
 for(const edit of [
  template=>{template.seams[0].allow_ease=true},
  template=>{template.panels[0].polygon.notches={a:[{t:.5,depth:.004}]}},
  template=>{template.panels[0].polygon.seam_allowances={a:.01}},
 ]){
  const changed=structuredClone(s)
  edit(changed.template)
  assert.equal(createAccuMarkNativeRuleSet(changed).ruleSet.templateFingerprint,r.templateFingerprint)
  const result=check(changed,r,[],{nativeCatalog:proof})
  assert.equal(result.checks.find(c=>c.id==='native').ok,false)
 }
 assert.equal(check(s,r,[],{nativeCatalog:{...proof,sourceTemplate:undefined}})
  .checks.find(c=>c.id==='native').ok,false)
})
test('all manufacturing evidence rejects stale independent size rules even when the template fingerprint is unchanged',()=>{
 const s=source(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const oldRules=structuredClone(r)
 const pin={sourceRevision:s.revision,templateFingerprint:r.templateFingerprint,
  sourceTemplate:structuredClone(s.template),sourceRuleSet:oldRules,
  independentlyVerified:true,authoritativeRust:true}
 const nativeCatalog={...pin,ok:true,persisted:true,evidenceId:'native-proof',pomSpecs:[],sizes:r.sizes}
 const gradedCutProof={...pin,evidenceId:'cut-proof',approvedForSizing:true,
  cutlinesVerified:true,allowancesVerified:true,notchesVerified:true,verifiedSizes:r.sizes}
 const receivingCadProof={...pin,evidenceId:'cad-proof',verified:true,
  independentReceiver:true,appliesToAllSizes:true,verifiedSizes:r.sizes}
 const evidence={nativeCatalog,gradedCutProof,receivingCadProof}
 assert.deepEqual(check(s,r,[],evidence).checks.filter(x=>['native','cut','cad'].includes(x.id)).map(x=>x.ok),[true,true,true])
 const changed=structuredClone(r)
 changed.panels.front.pointOffsetsMm.L[1][0]+=3
 assert.equal(changed.templateFingerprint,r.templateFingerprint)
 assert.deepEqual(check(s,changed,[],evidence).checks.filter(x=>['native','cut','cad'].includes(x.id)).map(x=>x.ok),[false,false,false])
 assert.deepEqual(check(s,r,[],{nativeCatalog:{...nativeCatalog,sourceRuleSet:undefined},
  gradedCutProof:{...gradedCutProof,sourceRuleSet:undefined},receivingCadProof:{...receivingCadProof,sourceRuleSet:undefined}})
  .checks.filter(x=>['native','cut','cad'].includes(x.id)).map(x=>x.ok),[false,false,false])
})
test('even fully populated factory evidence flags cannot mark unsigned sewn samples as independently accepted',()=>{
 const s=source(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const fake={physicalSampleObservations:{verified:true,independentAuditVerified:true,
   physicalSampleApproved:true,samples:[],sourceRevision:s.revision},
   receivingCadProof:{verified:true,independentReceiver:true,independentlyVerified:true,
     evidenceId:'unsigned-cad',sourceRevision:s.revision,templateFingerprint:r.templateFingerprint,
     sourceTemplate:structuredClone(s.template),sourceRuleSet:structuredClone(r),
     verifiedSizes:r.sizes,appliesToAllSizes:true}}
 const result=check(s,r,[],fake)
 assert.equal(result.checks.find(x=>x.id==='sample').ok,false)
 assert.equal(result.physicalSamples.independentAuditVerified,false)
 assert.equal(result.manufacturingApproved,false)
 assert.equal(result.cuttingAuthorized,false)
})
