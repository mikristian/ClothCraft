// Native fitting-project source-linked formulas: Rust is the persistence
// authority. No browser localStorage, fake design state or implicit factory QA.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createNativePatternConstraintSidecar20261023 as create} from '../../src/core/nativePatternConstraintBindings20261023.js'
import {planNativeAtomicPointBindings20261027 as plan} from '../../src/core/nativeAtomicPointBindings20261027.js'
import {reviewNativeBindingMeasurements as review} from '../../src/core/nativeBindingMeasurementReview20261027.js'

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-rust-persistent-rules-'))
const workspace=createWorkspace(folder)
let snap=null
const req=async payload=>{
  const result=await workspace.request({revision:snap?.revision,...payload})
  assert.equal(result.ok,true,result.error)
  if(result.data?.template)snap=result.data
  return result.data
}
const snapshotIdentity=s=>({revision:s.revision,template:s.template})
try{
  await req({op:'open',preset:'tshirt'})
  const front=snap.template.panels.find(panel=>panel.id==='front')
  assert(front)
  const distance=Math.hypot(front.polygon.points[1][0]-front.polygon.points[0][0],
    front.polygon.points[1][1]-front.polygon.points[0][1])*1000
  const measurements={referenceLength:{valueMm:distance+2}}
  const bindings=[{id:'native_front_01',panelId:'front',pointIndex:1,
    mode:'along',a:0,b:1,distanceFormula:'referenceLength',dependsOn:[]}]
  const created=create(snap,{measurements,bindings})
  assert.equal(created.ok,true,created.reason)
  const old=structuredClone(snap)
  await req({op:'bindings-store',nativeBindings:{measurements,bindings}})
  assert.equal(snap.nativePointBindings.active,true)
  assert.equal(snap.canUndo,true)
  assert.equal(snap.nativePointBindings.automaticRegeneration,false)
  assert.equal(snap.revision,old.revision+1)
  assert.deepEqual(snap.template,old.template)

  // A invalid persisted measurement graph must neither mutate source nor
  // increment the native revision.
  const malformed={measurements,bindings:[{...bindings[0],pointIndex:999}]}
  const invalid=await workspace.request({op:'bindings-store',revision:snap.revision,nativeBindings:malformed})
  assert.equal(invalid.ok,false)
  await req({op:'snapshot'})
  assert.equal(snap.nativePointBindings.active,true)
  assert.equal(snap.revision,old.revision+1)

  let saved=await req({op:'save'})
  assert.equal(saved.project.native_point_bindings.sourceTemplate.panels[0].id,'front')
  await req({op:'open',project:saved.project})
  assert.equal(snap.nativePointBindings.active,true)
  assert.equal(snap.nativePointBindings.bindings[0].id,'native_front_01')

  // Native save restores authoritative source even though session-local
  // revision resets to zero on reopen.
  const rebound=create(snap,{measurements:snap.nativePointBindings.measurements,
    bindings:snap.nativePointBindings.bindings})
  assert.equal(rebound.ok,true,rebound.reason)
  const batch=plan(snap,rebound.sidecar)
  assert.equal(batch.ok,true,batch.reason)
  const beforeBatch=structuredClone(snap)
  const badBatch=await workspace.request({op:'edit-batch',revision:snap.revision,
    commands:batch.commands,nativeBindings:malformed})
  assert.equal(badBatch.ok,false)
  await req({op:'snapshot'})
  assert.deepEqual(snapshotIdentity(snap),snapshotIdentity(beforeBatch))
  await req({op:'edit-batch',commands:batch.commands,
    nativeBindings:{measurements,bindings}})
  assert.equal(snap.nativePointBindings.active,true)
  assert.equal(snap.revision,beforeBatch.revision+1)
  const committed=structuredClone(snap)
  assert.notDeepEqual(committed.template,beforeBatch.template)

  await req({op:'undo'})
  assert.equal(snap.nativePointBindings.active,true,
    'Undo restores earlier pattern geometry AND matching persisted rule definitions')
  await req({op:'redo'})
  assert.equal(snap.nativePointBindings.active,true)
  assert.deepEqual(snap.template,committed.template)

  // An edited worksheet + actual contour point movements must be applied
  // together. No chart-only stage and no second authoritative revision.
  const chartBefore=structuredClone(snap)
  const chartSource=create(snap,{measurements:snap.nativePointBindings.measurements,
    bindings:snap.nativePointBindings.bindings})
  assert.equal(chartSource.ok,true,chartSource.reason)
  const revisedChart={referenceLength:{valueMm:measurements.referenceLength.valueMm+6}}
  const reviewed=review(snap,chartSource.sidecar,revisedChart)
  assert.equal(reviewed.ok,true,reviewed.reason)
  assert(reviewed.atomic?.ok)
  await req({op:'edit-batch',commands:reviewed.atomic.commands,
    nativeBindings:{measurements:reviewed.sidecar.measurements,
      bindings:reviewed.sidecar.bindings}})
  assert.equal(snap.revision,chartBefore.revision+1)
  assert.equal(snap.nativePointBindings.active,true)
  assert.equal(snap.nativePointBindings.measurements.referenceLength.valueMm,
    revisedChart.referenceLength.valueMm)
  assert.notDeepEqual(snap.template,chartBefore.template)
  const chartAfter=structuredClone(snap)
  await req({op:'undo'})
  assert.deepEqual(snap.template,chartBefore.template)
  assert.equal(snap.nativePointBindings.measurements.referenceLength.valueMm,
    measurements.referenceLength.valueMm)
  await req({op:'redo'})
  assert.deepEqual(snap.template,chartAfter.template)
  assert.equal(snap.nativePointBindings.measurements.referenceLength.valueMm,
    revisedChart.referenceLength.valueMm)

  saved=await req({op:'save'})
  await req({op:'open',project:saved.project})
  assert.equal(snap.nativePointBindings.active,true)
  assert.equal(snap.nativePointBindings.bindings.length,bindings.length)
  assert.equal(snap.nativePointBindings.bindings[0].id,bindings[0].id)
  assert.equal(snap.nativePointBindings.bindings[0].distanceFormula,bindings[0].distanceFormula)
  assert.equal(snap.nativePointBindings.measurements.referenceLength.valueMm,
    revisedChart.referenceLength.valueMm)
  // Updated 2026-10-29: unrestricted source Annotation used to leave an
  // inactive/stale native graph. The hardened native dependency boundary
  // deliberately blocks this unqualified mutation instead. Verify exact
  // project and revision stability, then explicitly clear the bindings.
  const protectedRevision=snap.revision
  const protectedProject=(await req({op:'save'})).project
  const unqualified=await workspace.request({op:'edit',revision:snap.revision,
    command:{kind:'Annotation',panel:'front',id:null,
      text:'Check provenance',position:[0.2,0.3]}})
  assert.equal(unqualified.ok,false,'Unqualified source Annotation must not stale saved bindings')
  assert.match(String(unqualified.error),/qualified regeneration|bindings/i)
  await req({op:'snapshot'})
  assert.equal(snap.revision,protectedRevision)
  assert.equal(snap.nativePointBindings.active,true)
  assert.deepEqual((await req({op:'save'})).project,protectedProject)
  await req({op:'bindings-clear'})
  assert.equal(snap.nativePointBindings,null)
  await req({op:'undo'})
  assert.equal(snap.nativePointBindings.active,true,
    'Undo of a rule-only clear restores the existing valid rule graph')
  await req({op:'redo'})
  assert.equal(snap.nativePointBindings,null)
  await req({op:'edit',command:{kind:'Annotation',panel:'front',id:null,
    text:'Explicitly cleared bindings before source annotation',position:[0.2,0.3]}})
  saved=await req({op:'save'})
  await req({op:'open',project:saved.project})
  assert.equal(snap.nativePointBindings,null)
  console.log(JSON.stringify({passed:true,checks:[
    'Rust authoritative in-project binding source persisted',
    'invalid bindings refuse without revision or geometry mutation',
    'session restart reauthenticates saved formulas',
    'same-step atomic point batch+graph with invalid graph rollback',
    'native Undo/Redo atomically restores prior geometry AND saved rule revisions',
    'reviewed measurement worksheet and pattern geometry apply and undo atomically',
    'rule-only clear is one Undo/Redo transaction',
    'unsafe unqualified source edit is atomically rejected instead of staling saved bindings',
    'save/reopen preserves active bindings and explicit clear; clear enables unbound annotation',
  ]}))
}finally{
  workspace.close()
  fs.rmSync(folder,{recursive:true,force:true})
}
