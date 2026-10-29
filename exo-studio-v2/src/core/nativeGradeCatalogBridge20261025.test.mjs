import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025 as prepare,verifyNativeGradeCatalog20261025 as verify,recoverNativeGradeRules20261025 as recover,isVerifiedNativeGradeStatusCurrent20261026 as currentStatus} from './nativeGradeCatalogBridge20261025.js'
import {inspectNativeGradingReleaseGate20261025} from './nativeGradingReleaseGate20261025.js'
const snap=()=>({revision:7,template:{panels:[{id:'front',polygon:{
  points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d']}}],
  seams:[],fabrics:[]}})
test('six-size native full template packet validates independently and blocks stale source',()=>{
 const s=snap(),rules=createAccuMarkNativeRuleSet(s).ruleSet
 const candidate=prepare(s,{template:structuredClone(s.template)},rules)
 assert.equal(candidate.ok,true,candidate.reason)
 assert.equal(candidate.gradeRun.schemaVersion,1)
 assert.equal(candidate.gradeRun.gradedTemplates.length,6)
 assert.equal(candidate.nativeCommitted,false)
 assert.equal(prepare(s,{template:{...s.template,panels:[]}},rules).ok,false)
})
test('partially declared native envelopes cannot bypass per-size activation validation',()=>{
 const s=snap()
 s.template.panels[0].pattern={width:.2,height:.3,nx:1,ny:1}
 s.template.panels.push({...structuredClone(s.template.panels[0]),id:'back'})
 delete s.template.panels[1].pattern
 const r=createAccuMarkNativeRuleSet(s).ruleSet
 const packet=prepare(s,{template:structuredClone(s.template)},r)
 assert.equal(packet.ok,false)
 assert.match(packet.reason,/every panel requires an authored pattern envelope/)
 assert.equal(packet.nativeCommitted,false)
 const complete=structuredClone(s)
 complete.template.panels[1].pattern={width:.2,height:.3,nx:1,ny:1}
 const acceptedRules=createAccuMarkNativeRuleSet(complete).ruleSet
 const accepted=prepare(complete,{template:structuredClone(complete.template)},acceptedRules)
 assert.equal(accepted.ok,true,accepted.reason)
 const partialStatus={revision:s.revision,persistedInProject:true,catalog:accepted.gradeRun}
 assert.equal(verify(s,r,partialStatus,{durablySaved:true}).ok,false)
})
test('an unsown graded catalog persists as a draft while sewing and factory release remain blocked',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const packet=prepare(s,{template:structuredClone(s.template)},r)
 assert.equal(packet.ok,true,packet.reason)
 assert.deepEqual(packet.gradeRun.baseTemplate.seams,[])
 for(const template of packet.gradeRun.gradedTemplates)assert.deepEqual(template.seams,[])
 const status={revision:s.revision,persistedInProject:true,catalog:packet.gradeRun}
 assert.equal(verify(s,r,status,{durablySaved:true}).ok,true)
 const gate=inspectNativeGradingReleaseGate20261025(s,r,[])
 assert.equal(gate.source.previewReady,true)
 assert.equal(gate.source.sewingReady,false)
 assert.equal(gate.checks.find(check=>check.id==='seams').ok,false)
 assert.equal(gate.checks.find(check=>check.id==='cut').ok,false)
 assert.equal(gate.checks.find(check=>check.id==='cad').ok,false)
 assert.equal(gate.manufacturingApproved,false)
})
test('committed Rust status must equal independently edited size rules, not just base fingerprint',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const packet=prepare(s,{template:structuredClone(s.template)},r)
 const status={revision:s.revision,persistedInProject:true,
  catalog:{schemaVersion:1,...packet.gradeRun}}
 assert.equal(verify(s,r,status,{durablySaved:true}).ok,true)
 assert.equal(verify(s,r,status,{durablySaved:false}).ok,false)
 const changed=editAccuMarkNativePointRule(s,r,{panelId:'front',pointIndex:1,size:'L',dxMm:14,dyMm:0})
 assert(changed.ok,changed.reason)
 assert.equal(verify(s,changed.ruleSet,status,{durablySaved:true}).ok,false)
})
test('saved six-size UI badge is bound to full source rule offsets, POM and exact source geometry',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const packet=prepare(s,{template:structuredClone(s.template)},r)
 const status={revision:s.revision,persistedInProject:true,catalog:packet.gradeRun}
 const verified=verify(s,r,status,{durablySaved:true,pomDefinitions:[]})
 assert(verified.ok,verified.reason)
 assert(currentStatus(verified,s,r,[]))
 assert.notStrictEqual(verified.sourceRuleSet,r)
 const next=editAccuMarkNativePointRule(s,r,{panelId:'front',pointIndex:1,size:'L',dxMm:14,dyMm:0})
 assert(next.ok,next.reason)
 assert.equal(next.ruleSet.templateFingerprint,r.templateFingerprint)
 assert.equal(currentStatus(verified,s,next.ruleSet,[]),false,'a grade offset edit cannot display saved status')
 assert.equal(currentStatus({...verified,sourceRuleSet:undefined},s,r,[]),false,'old unpinned badge cannot pass')
 assert.equal(currentStatus(verified,{...s,revision:s.revision+1},r,[]),false)
 assert.equal(currentStatus(verified,s,r,[{id:'new-target'}]),false)
 const changed=structuredClone(s);changed.template.panels[0].polygon.edges[0]='renamed-edge'
 assert.equal(currentStatus(verified,changed,r,[]),false)
})
test('recover editable all-size rules from a persisted native catalog when local browser cache is gone',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const edited=editAccuMarkNativePointRule(s,r,{panelId:'front',pointIndex:1,size:'L',dxMm:14,dyMm:0})
 assert(edited.ok)
 const packet=prepare(s,{template:structuredClone(s.template)},edited.ruleSet)
 assert(packet.ok,packet.reason)
 const status={revision:s.revision,persistedInProject:true,catalog:packet.gradeRun}
 const restored=recover(s,status)
 assert(restored.ok,restored.reason)
 assert(Math.abs(restored.ruleSet.panels.front.pointOffsetsMm.L[1][0]-14)<1e-9)
 assert.equal(restored.catalog.persisted,true)
 assert.equal(recover({...s,revision:s.revision+1},status).ok,false)
})
test('authored POM targets are attached to native catalog and checked for unsaved local changes',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const spec={id:'front-width',label:'Front width',panelId:'front',kind:'anchor-distance',
   fromPoint:0,toPoint:1,toleranceMm:2,
   targetsMm:{XS:200,S:200,M:200,L:200,XL:200,XXL:200}}
 const packed=prepare(s,{template:structuredClone(s.template)},r,{pomDefinitions:[spec]})
 assert.equal(packed.ok,true,packed.reason)
 assert.deepEqual(packed.gradeRun.pomSpecs,[spec])
 const status={revision:s.revision,persistedInProject:true,catalog:packed.gradeRun}
 assert.equal(verify(s,r,status,{durablySaved:true,pomDefinitions:[spec]}).ok,true)
 const unsaved={...spec,toleranceMm:4}
 assert.equal(verify(s,r,status,{durablySaved:true,pomDefinitions:[unsaved]}).ok,false)
 assert.deepEqual(recover(s,status).pomSpecs,[spec])
})
test('qualified multi-edge POM now persists in native six-size catalog with explicit targets',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const draft={id:'multi-edge',label:'Sample sewn path',panelId:'front',
   kind:'sewline-path',fromPoint:0,toPoint:2,toleranceMm:2,
   targetsMm:{XS:400,S:400,M:400,L:400,XL:400,XXL:400}}
 const result=prepare(s,{template:structuredClone(s.template)},r,{pomDefinitions:[draft]})
 assert.equal(result.ok,true,result.reason)
 assert.deepEqual(result.gradeRun.pomSpecs,[draft])
 const status={revision:s.revision,persistedInProject:true,catalog:result.gradeRun}
 assert.equal(verify(s,r,status,{durablySaved:true,pomDefinitions:[draft]}).ok,true)
 assert.deepEqual(recover(s,status).pomSpecs,[draft])
 assert.equal(result.nativeCommitted,false)
 assert.equal(result.manufacturingApproved,false)
})
test('verification and recovery reject tampering outside graded point arrays',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const packet=prepare(s,{template:structuredClone(s.template)},r)
 assert(packet.ok,packet.reason)
 const status={revision:s.revision,persistedInProject:true,catalog:packet.gradeRun}
 assert(verify(s,r,status,{durablySaved:true}).ok)
 const mutations=[
  catalog=>{catalog.gradedTemplates[0].panels[0].id='impostor'},
  catalog=>{catalog.gradedTemplates[0].panels[0].polygon.edges[0]='wrong'},
  catalog=>{catalog.gradedTemplates[0].panels[0].polygon.curves={a:[[0,0],[0,1]]}},
  catalog=>{catalog.gradedTemplates[0].panels[0].fabric='changed'},
  catalog=>{catalog.gradedTemplates[0].seams=[{id:'injected'}]},
  catalog=>{catalog.gradedTemplates[0].panels.push(structuredClone(catalog.gradedTemplates[0].panels[0]))},
 ]
 for(const mutate of mutations){
  const modified=structuredClone(status)
  mutate(modified.catalog)
  assert.equal(verify(s,r,modified,{durablySaved:true}).ok,false)
  assert.equal(recover(s,modified).ok,false)
 }
})
test('legacy point rules remain reusable after seam, notch, or allowance edits, but old catalog is stale',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const packet=prepare(s,{template:structuredClone(s.template)},r)
 assert(packet.ok,packet.reason)
 const status={revision:s.revision,persistedInProject:true,catalog:packet.gradeRun}
 for(const edit of [
  template=>{template.seams=[{id:'added-seam'}]},
  template=>{template.panels[0].polygon.notches={a:[{t:0.5,depth:0.004}]}},
  template=>{template.panels[0].polygon.seam_allowances={a:0.01}},
 ]){
  const changed=structuredClone(s)
  edit(changed.template)
  assert.equal(createAccuMarkNativeRuleSet(changed).ruleSet.templateFingerprint,r.templateFingerprint)
  assert.equal(verify(changed,r,status,{durablySaved:true}).ok,false)
  assert.equal(recover(changed,status).ok,false)
 }
})
test('persisted catalog rejects corrupt POM metrology even without browser sidecar',()=>{
 const s=snap(),r=createAccuMarkNativeRuleSet(s).ruleSet
 const packed=prepare(s,{template:structuredClone(s.template)},r)
 assert(packed.ok,packed.reason)
 const status={revision:s.revision,persistedInProject:true,catalog:packed.gradeRun}
 for(const pomSpecs of [[{id:'bad',label:'Bad',panelId:'front',kind:'anchor-distance',
   fromPoint:0,toPoint:1,toleranceMm:2,targetsMm:{XS:200}}],
   [{id:'bad',label:'Bad',panelId:'front',kind:'anchor-distance',fromPoint:0,toPoint:999,
     toleranceMm:2,targetsMm:{XS:200,S:200,M:200,L:200,XL:200,XXL:200}}]]){
   const changed=structuredClone(status)
   changed.catalog.pomSpecs=pomSpecs
   assert.equal(verify(s,r,changed,{durablySaved:true}).ok,false)
   assert.equal(recover(s,changed).ok,false)
 }
})

test('unscored multi-edge POM can be retained as draft specification, without false acceptance',()=>{
 const s=snap(),rules=createAccuMarkNativeRuleSet(s).ruleSet
 const project={template:structuredClone(s.template)}
 const spec={id:'path',label:'Boundary path',panelId:'front',kind:'sewline-path',
  fromPoint:0,toPoint:2,toleranceMm:2,targetsMm:{XS:null,S:null,M:null,L:null,XL:null,XXL:null}}
 const before=structuredClone({s,project,spec})
 const result=prepare(s,project,rules,{pomDefinitions:[spec]})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.gradeRun.pomSpecs[0].targetsMm.XXL,null)
 assert.equal(result.nativeCommitted,false)
 assert.equal(result.manufacturingApproved,false)
 assert.deepEqual({s,project,spec},before)
})
