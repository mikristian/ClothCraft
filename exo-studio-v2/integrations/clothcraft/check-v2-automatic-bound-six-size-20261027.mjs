// Disposable end-to-end Rust acceptance: an ordinary point edit on a bound
// source point drives the shared native measurement across pieces and sizes.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-auto-six-size-'))
const workspace=createWorkspace(root)
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.013,S:-.007,M:0,L:.006,XL:.013,XXL:.020}
let snap
const send=async req=>{
  const response=await workspace.request({revision:snap?.revision,...req})
  assert.equal(response.ok,true,`${req.op}: ${response.error}`)
  if(response.data?.template)snap=response.data
  return response.data
}
const refuses=async req=>{
  const before=structuredClone(snap)
  const response=await workspace.request({revision:snap.revision,...req})
  assert.equal(response.ok,false,`Unsafe ordinary edit was accepted`)
  await send({op:'snapshot'})
  assert.equal(snap.revision,before.revision)
  assert.deepEqual(snap.template,before.template)
  assert.deepEqual(snap.nativePointBindings,before.nativePointBindings)
  return response.error
}
const p=(id,i=1)=>snap.template.panels.find(panel=>panel.id===id).polygon.points[i]
const close=(x,y)=>assert(Math.abs(x-y)<1e-8,`${x} != ${y}`)
try{
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...snap.template.seams]) await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const originalIds=new Set(snap.template.panels.map(panel=>panel.id))
  const fabric=snap.template.fabrics[0].id
  for(let i=0;i<2;i++) await send({op:'edit',command:{kind:'Polygon',fabric,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=snap.template.panels.filter(panel=>!originalIds.has(panel.id)).map(panel=>panel.id)
  assert.equal(ids.length,2)
  await send({op:'bindings-store',nativeBindings:{measurements:{width:{valueMm:400}},bindings:ids.map((panelId,i)=>({
    id:`width_${i}`,panelId,pointIndex:1,a:0,b:0,mode:'polar',angleDeg:0,distanceFormula:'width',dependsOn:[],
  }))}})
  const base=structuredClone(snap.template)
  await send({op:'grade-run-commit',gradeRun:{schemaVersion:1,sizes,baseSize:'M',baseTemplate:base,
    gradedTemplates:sizes.map(size=>{
      const next=structuredClone(base)
      if(size!=='M')for(const panel of next.panels) if(ids.includes(panel.id)) panel.polygon.points[1][0]+=offsets[size]
      return next
    }),pomSpecs:[]}})
  assert.equal(snap.gradeRunPersisted,true)
  assert.equal(snap.nativePointBindings.active,true)
  const before=structuredClone(snap)
  assert.match(await refuses({op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,position:[.39,.02]}}),/polar|direction|bound|target|measurement/i)
  assert.match(await refuses({op:'edit',command:{kind:'AnchorGroup',panel:ids[0],edits:[[1,[.39,0]]]}}),/graph|AnchorGroup|explicit/i)
  const committed=await send({op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,position:[.38,0]}})
  assert.equal(snap.revision,before.revision+1)
  assert.equal(committed.nativePointBindings.active,true)
  assert.equal(snap.gradeRunPersisted,true)
  assert.equal(snap.nativePointBindings.measurements.width.valueMm,380)
  for(const id of ids)close(p(id)[0],.38)
  const persisted=await send({op:'save'})
  assert.equal(persisted.project.grade_run.gradedTemplates.length,6)
  assert.equal(persisted.project.native_point_bindings.measurements.width.valueMm,380)
  for(const [i,size] of sizes.entries())for(const id of ids){
    const grade=persisted.project.grade_run.gradedTemplates[i].panels.find(panel=>panel.id===id)
    close(grade.polygon.points[1][0]-.38,offsets[size])
  }
  await send({op:'undo'})
  assert.deepEqual(snap.template,before.template)
  assert.equal(snap.nativePointBindings.measurements.width.valueMm,400)
  await send({op:'redo'})
  for(const id of ids)close(p(id)[0],.38)
  assert.equal(snap.nativePointBindings.measurements.width.valueMm,380)
  await send({op:'open',project:persisted.project})
  assert.equal(snap.gradeRunPersisted,true)
  assert.equal(snap.nativePointBindings.active,true)
  for(const id of ids)close(p(id)[0],.38)
  console.log(JSON.stringify({passed:true,realNative:true,entry:'ordinary edit Anchor',
    propagatedPanels:ids.length,sizes,sharedMeasurementMm:380,
    oneUndoStep:true,saveReopenVerified:true,factoryApproved:false,vendorEquivalent:false}))
}finally{
  workspace.close()
  fs.rmSync(root,{recursive:true,force:true})
}
