// Disposable real-Rust computed-measurement dependency acceptance. Does not
// modify an installed project, use JS-planned point edits or certify fabric.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkspace } from './workspace.mjs'

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-computed-chart-'))
const workspace=createWorkspace(folder)
let snapshot
const request=async payload=>{
  const result=await workspace.request({revision:snapshot?.revision,...payload})
  assert.equal(result.ok,true,`${payload.op}: ${result.error}`)
  if(result.data?.template)snapshot=result.data
  return result.data
}
const source=()=>({revision:snapshot.revision,template:structuredClone(snapshot.template),
  bindings:structuredClone(snapshot.nativePointBindings)})
const mm=()=>snapshot.nativePointBindings.measurements.halfWidth.valueMm
const width=id=>{
  const points=snapshot.template.panels.find(p=>p.id===id).polygon.points
  return points[2][0]-points[3][0]
}
const set=(oldValue,newValue)=>request({op:'bindings-measurement-recompute',
  measurement:'halfWidth',expectedValueMm:oldValue,valueMm:newValue})
const rejected=async (id,payload,match)=>{
  const before=source()
  const result=await workspace.request({revision:snapshot.revision,...payload})
  assert.equal(result.ok,false,'Unsafe formula request unexpectedly succeeded')
  if(match)assert.match(result.error,match)
  await request({op:'snapshot'})
  assert.deepEqual(source(),before,'Invalid request mutated native project or revision')
  assert(Math.abs(width(id)-before.template.panels.find(p=>p.id===id).polygon.points[2][0]+
    before.template.panels.find(p=>p.id===id).polygon.points[3][0])<1e-8)
}
try{
  await request({op:'open',preset:'tshirt'})
  const ids=new Set(snapshot.template.panels.map(p=>p.id))
  await request({op:'edit',command:{kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.4],[0,.4]]}})
  const panelId=snapshot.template.panels.find(p=>!ids.has(p.id))?.id
  assert(panelId,'Expected detached native rectangle')
  const measurements={halfWidth:{valueMm:200},allowance:{valueMm:0},
    intermediate:{formula:'halfWidth + allowance'},hemWidth:{formula:'intermediate * 2'}}
  await request({op:'bindings-store',nativeBindings:{measurements,bindings:[{
    id:'computed_hem',panelId,pointIndex:3,mode:'polar',a:2,b:1,
    angleDeg:180,distanceFormula:'hemWidth',dependsOn:[]}]}})
  assert.equal(snapshot.nativePointBindings.active,true)
  const initial=source()
  await rejected(panelId,{op:'bindings-measurement-recompute',measurement:'halfWidth',
    expectedValueMm:201,valueMm:210},/expected|differs/i)
  await rejected(panelId,{op:'bindings-measurement-recompute',measurement:'hemWidth',
    expectedValueMm:400,valueMm:420},/Computed measurement cannot be directly edited/)
  for(const [beforeValue,nextValue] of [[200,210],[210,215]]){
    const before=source()
    const after=await set(beforeValue,nextValue)
    assert.equal(after.revision,before.revision+1)
    assert.equal(mm(),nextValue)
    assert(Math.abs(width(panelId)-nextValue*2/1000)<1e-9)
    assert.equal(snapshot.nativePointBindings.measurements.hemWidth.formula,'intermediate * 2')
    assert.deepEqual(after.nativeMeasurementRecompute.correctedBindingIds,['computed_hem'])
    const committed=source()
    await request({op:'undo'})
    assert.deepEqual(source().template,before.template)
    await request({op:'redo'})
    assert.deepEqual(source().template,committed.template)
  }
  const committed=source()
  await request({op:'undo'})
  await request({op:'undo'})
  assert.equal(mm(),200)
  assert.deepEqual(snapshot.template,initial.template)
  await request({op:'redo'})
  await request({op:'redo'})
  assert.equal(mm(),215)
  assert.deepEqual(snapshot.template,committed.template)
  const saved=await request({op:'save'})
  assert.equal(saved.project.native_point_bindings.measurements.hemWidth.formula,'intermediate * 2')
  await request({op:'open',project:saved.project})
  assert.equal(snapshot.nativePointBindings.active,true)
  assert.equal(mm(),215)
  assert(Math.abs(width(panelId)-.43)<1e-9)
  await rejected(panelId,{op:'bindings-measurement-recompute',measurement:'halfWidth',
    expectedValueMm:210,valueMm:220},/expected|differs/i)
  console.log(JSON.stringify({passed:true,nativeAuthoritative:true,
    checks:['Rust evaluates two persisted computed formula dependencies',
      '200→210→215 mm direct input regenerates 400→420→430 mm bound geometry',
      'one Undo revision per change, repeated Undo/Redo, save/reopen',
      'computed output is not directly editable, stale expected values fail atomically'],
    limits:'One unsewn ungraded straight panel; named arithmetic formulas only; no fabric envelope, physical apparel or licensed Modaris acceptance.'}))
}finally{
  workspace.close()
  fs.rmSync(folder,{recursive:true,force:true})
}
