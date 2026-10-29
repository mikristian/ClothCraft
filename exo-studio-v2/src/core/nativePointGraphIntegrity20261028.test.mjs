import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativePatternConstraintSidecar20261023 as create} from './nativePatternConstraintBindings20261023.js'
import {auditNativePointGraphIntegrity20261028 as audit} from './nativePointGraphIntegrity20261028.js'
import {planModarisNativeReferenceRecompute20261027 as recompute} from './modarisNativeReferenceRecompute20261027.js'
import {routeModarisNativeNumericalAnchor20261027 as route} from './modarisNativeAutomaticAnchor20261027.js'
import {planNativeAtomicPointBindings20261027 as atomic} from './nativeAtomicPointBindings20261027.js'

function fixture(){
  const snapshot={revision:25,template:{panels:[
    {id:'front',layout_2d:[0,0],polygon:{
      points:[[0,0],[.4,0],[.4,.25],[0,.3]],edges:['f0','f1','f2','f3']}},
    {id:'back',layout_2d:[.6,0],polygon:{
      points:[[0,0],[.3,0],[.3,.2],[0,.2]],edges:['b0','b1','b2','b3']}},
  ]}}
  const def={measurements:{frontReach:{valueMm:250},backHeight:{valueMm:200}},bindings:[
    {id:'front-height',panelId:'front',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'frontReach'},
    {id:'back-height',panelId:'back',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'backHeight'},
  ]}
  const sidecar=create(snapshot,def)
  assert(sidecar.ok,sidecar.reason)
  const input={panelId:'front',pointIndex:1,originalPosition:[.4,0],position:[.42,0]}
  const linked=structuredClone(snapshot)
  linked.nativePointBindings={version:1,active:true,automaticRegeneration:false,
    manufacturingApproved:false,measurements:structuredClone(def.measurements),
    bindings:structuredClone(def.bindings)}
  const numeric={ok:true,revision:25,panelId:'front',pointIndex:1,
    command:{kind:'Anchor',panel:'front',anchor:1,position:[.42,0]}}
  return {snapshot,sidecar:sidecar.sidecar,def,input,linked,numeric}
}
test('one canonical audit accepts two intact detached native panels, and both UI routes produce the same batch',()=>{
  const f=fixture(),before=structuredClone(f)
  const check=audit(f.snapshot,f.sidecar,{sourcePanelId:'front'})
  assert.equal(check.ok,true,check.reason)
  assert.equal(check.verifiedBindingCount,2)
  const reference=recompute(f.snapshot,f.sidecar,f.input)
  const numeric=route(f.linked,f.numeric)
  assert.equal(reference.ok,true,reference.reason)
  assert.equal(numeric.ok,true,numeric.reason)
  assert.deepEqual(reference.proposal,numeric.batch)
  assert.equal(reference.proposal.panelCount,1)
  assert.deepEqual(reference.proposal.commands[0].edits,
    [[1,[.42,0]],[2,[.42,.25]]])
  assert.deepEqual(f,before,'Pure integrity auditing and both planners must not mutate source geometry')
})
test('unrelated native panel with a previously drifted bound anchor prevents BOTH commit paths',()=>{
  const f=fixture(),drift=structuredClone(f)
  drift.snapshot.template.panels[1].polygon.points[2][1]=.22
  drift.linked.template.panels[1].polygon.points[2][1]=.22
  const created=create(drift.snapshot,drift.def)
  assert.equal(created.ok,true,created.reason)
  const immutable=structuredClone(drift)
  assert.match(audit(drift.snapshot,created.sidecar,{sourcePanelId:'front'}).reason,/Unrelated native panel already violates/)
  assert.match(recompute(drift.snapshot,created.sidecar,drift.input).reason,/Unrelated native panel already violates/)
  assert.match(route(drift.linked,drift.numeric).reason,/Unrelated native panel already violates/)
  assert.deepEqual(drift,immutable,'Rejected plans must not repair or mutate the other panel')
})
test('a dependency declared without corresponding native reference anchor is not accepted as a real graph',()=>{
  const f=fixture()
  const declared=structuredClone(f.def)
  declared.bindings[1].dependsOn=['front-height']
  const created=create(f.snapshot,declared)
  assert.equal(created.ok,true,created.reason)
  assert.match(audit(f.snapshot,created.sidecar,{sourcePanelId:'front'}).reason,/Cross-panel dependency/)
  assert.match(recompute(f.snapshot,created.sidecar,f.input).reason,/Cross-panel dependency/)
  const orphan=structuredClone(f.def)
  orphan.bindings[1].dependsOn=['front-height']
  const linked=structuredClone(f.linked)
  linked.nativePointBindings.bindings=orphan.bindings
  assert.match(route(linked,f.numeric).reason,/Cross-panel dependency/)
})
test('missing same-panel dependency, spurious dependency and cycles all fail closed',()=>{
  const f=fixture()
  const chain=structuredClone(f.def)
  chain.measurements.frontBase={valueMm:200}
  chain.bindings[0]={id:'front-base',panelId:'front',pointIndex:1,mode:'polar',
    a:0,b:3,angleDeg:0,distanceFormula:'frontBase'}
  chain.bindings.push({id:'front-height',panelId:'front',pointIndex:2,mode:'polar',
    a:1,b:0,angleDeg:90,distanceFormula:'frontReach'})
  const stored=create(f.snapshot,chain)
  assert.equal(stored.ok,false)
  assert.match(stored.reason,/missing geometric point-binding dependency/i)
  const spurious=structuredClone(f.def)
  spurious.bindings[0].dependsOn=['back-height']
  assert.match(audit(f.snapshot,create(f.snapshot,spurious).sidecar,{sourcePanelId:'front'}).reason,/Cross-panel/)
  const cyclic=structuredClone(chain)
  cyclic.bindings.at(-1).dependsOn=['front-base']
  cyclic.bindings[0].dependsOn=['front-height']
  const created=create(f.snapshot,cyclic)
  assert.equal(created.ok,false)
  assert.match(created.reason,/Circular/)
})
test('postcommit audit requires every saved point to match, no manufacturing approval',()=>{
  const f=fixture()
  assert.equal(audit(f.snapshot,f.sidecar).ok,true)
  const drift=structuredClone(f.snapshot)
  drift.template.panels[0].polygon.points[2]=[.4,.22]
  const sidecar=create(drift,f.def)
  assert.equal(sidecar.ok,true)
  const result=audit(drift,sidecar.sidecar)
  assert.equal(result.ok,false)
  assert.match(result.reason,/does not satisfy every persisted point binding/)
  assert.equal(result.manufacturingApproved,false)
})
test('saved six-size catalog, activated size and industrial fabric-grade envelope cannot fall through to a single-size AnchorGroup',()=>{
  const f=fixture()
  for(const [field,value] of [
    ['gradeRunPersisted',true],['gradeRun',{sizes:['XS','S','M','L','XL','XXL']}],
    ['activeGradedSize','XL'],['gradedSizePreview',true],
    ['fabricGradeEnvelope',{perSizeChart:{sizes:['XS','S','M','L','XL','XXL']}}],
  ]){
    const snapshot=structuredClone(f.snapshot)
    const linked=structuredClone(f.linked)
    snapshot[field]=structuredClone(value)
    linked[field]=structuredClone(value)
    const saved=structuredClone({snapshot,linked})
    assert.match(audit(snapshot,f.sidecar,{sourcePanelId:'front'}).reason,/six-size Rust regeneration/)
    assert.match(recompute(snapshot,f.sidecar,f.input).reason,/six-size Rust regeneration/)
    assert.match(route(linked,f.numeric).reason,/six-size Rust regeneration/)
    assert.match(atomic(snapshot,f.sidecar).reason,/six-size Rust regeneration/)
    assert.deepEqual({snapshot,linked},saved,`The ${field} guard must never modify graded source state`)
  }
})
