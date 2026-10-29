// Real Rust session: shared measurement → multiple detached material panels
// → complete XS-XXL persisted graded size run. No browser-generated child
// coordinates, no overwriting an installed garment, no factory release claim.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-graded-reactive-real-rust-'))
const workspace=createWorkspace(root)
let s
const send=async args=>{
  const response=await workspace.request({revision:s?.revision,...args})
  assert.equal(response.ok,true,response.error)
  if(response.data?.template)s=response.data
  return response.data
}
const refuse=async args=>{
  const before=structuredClone(s)
  const response=await workspace.request({revision:s.revision,...args})
  assert.equal(response.ok,false,'Unsafe mutation must refuse')
  await send({op:'snapshot'})
  assert.equal(s.revision,before.revision)
  assert.deepEqual(s.template,before.template)
  assert.deepEqual(s.nativePointBindings,before.nativePointBindings)
}
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-0.015,S:-0.007,M:0,L:0.005,XL:0.010,XXL:0.014}
const position=(snap,id)=>snap.template.panels.find(p=>p.id===id).polygon.points[1]
try{
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...s.template.seams])
    await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const oldIds=new Set(s.template.panels.map(panel=>panel.id))
  const fabric=s.template.fabrics[0].id
  for(let i=0;i<2;i++)
    await send({op:'edit',command:{kind:'Polygon',fabric,
      points:[[0,0],[0.4,0],[0.4,0.32],[0,0.32]]}})
  const ids=s.template.panels.filter(panel=>!oldIds.has(panel.id)).map(panel=>panel.id)
  assert.equal(ids.length,2)
  const ruleSet={measurements:{sharedWidth:{valueMm:400}},bindings:ids.map((panelId,i)=>({
    id:`shared_width_${i+1}`,panelId,pointIndex:1,mode:'polar',
    a:0,b:0,angleDeg:0,distanceFormula:'sharedWidth',dependsOn:[],
  }))}
  await send({op:'bindings-store',nativeBindings:ruleSet})
  assert.equal(s.nativePointBindings.active,true)
  const source=structuredClone(s.template)
  const gradeRun={schemaVersion:1,sizes,baseSize:'M',baseTemplate:source,
    gradedTemplates:sizes.map(size=>{
      const candidate=structuredClone(source)
      if(size!=='M')for(const panel of candidate.panels)
        if(ids.includes(panel.id))panel.polygon.points[1][0]+=offsets[size]
      return candidate
    }),pomSpecs:[]}
  const catalog=await send({op:'grade-run-commit',gradeRun})
  assert.equal(catalog.gradeCatalogResult?.persisted,true)
  assert.equal(s.gradeRunPersisted,true)
  const old=structuredClone(s)
  const payload={overrides:{sharedWidth:380}}
  await refuse({op:'bindings-grade-regenerate-preview',overrides:{unknown:380}})
  await refuse({op:'bindings-grade-regenerate',overrides:{sharedWidth:5001}})
  const preview=await send({op:'bindings-grade-regenerate-preview',...payload})
  assert.equal(preview.format,'exo-native-reactive-size-run.v1')
  assert.equal(preview.sourceRevision,s.revision)
  assert.equal(preview.changedPanels,2)
  assert.equal(preview.changedBindings,2)
  assert.deepEqual(preview.bySize.map(row=>row.size),sizes)
  assert(preview.bySize.every(row=>row.changes.length===2))
  assert.equal(preview.factoryApproved,false)
  assert.equal(s.revision,old.revision)
  assert.deepEqual(s.template,old.template)

  const committed=await send({op:'bindings-grade-regenerate',...payload})
  assert.equal(s.revision,old.revision+1)
  assert.equal(committed.regenerationEvidence.sourceRevision,old.revision)
  assert.equal(committed.gradeRunPersisted,true)
  assert.equal(committed.nativePointBindings.active,true)
  assert.equal(committed.nativePointBindings.measurements.sharedWidth.valueMm,380)
  for(const id of ids)assert(Math.abs(position(s,id)[0]-0.38)<1e-9)
  await refuse({op:'bindings-grade-regenerate',...payload,revision:old.revision})
  const save=await send({op:'save'})
  assert.equal(save.project.grade_run.gradedTemplates.length,6)
  assert.equal(save.project.native_point_bindings.measurements.sharedWidth.valueMm,380)
  for(const [i,size] of sizes.entries())for(const id of ids){
    const panel=save.project.grade_run.gradedTemplates[i].panels.find(p=>p.id===id)
    const base=save.project.template.panels.find(p=>p.id===id)
    assert(Math.abs(panel.polygon.points[1][0]-base.polygon.points[1][0]-offsets[size])<1e-8)
  }
  const after=structuredClone(s)
  await send({op:'undo'})
  assert.deepEqual(s.template,old.template)
  assert.equal(s.gradeRunPersisted,true)
  assert.equal(s.nativePointBindings.measurements.sharedWidth.valueMm,400)
  await send({op:'redo'})
  assert.deepEqual(s.template,after.template)
  assert.equal(s.gradeRunPersisted,true)
  assert.equal(s.nativePointBindings.measurements.sharedWidth.valueMm,380)
  const afterUndoSaved=await send({op:'save'})
  await send({op:'open',project:afterUndoSaved.project})
  assert.equal(s.gradeRunPersisted,true)
  assert.equal(s.nativePointBindings.active,true)
  for(const id of ids)assert(Math.abs(position(s,id)[0]-0.38)<1e-9)
  const catalogStatus=await send({op:'grade-run-status'})
  assert.equal(catalogStatus.persistedInProject,true)
  assert.equal(catalogStatus.catalog.gradedTemplates.length,6)
  console.log(JSON.stringify({passed:true,checks:[
    'two independent native material panels authored in disposable garment',
    'shared direct measurement regenerates both Rust-owned dependent points',
    'all six graded size templates preserve original independent grade offsets',
    'pure preview leaves source untouched; stale/corrupt requests refuse',
    'one source revision and Undo/Redo for chart, base geometry and entire size run',
    'Rust save/reopen retains validated source-linked rules and six graded templates',
  ],factoryApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(root,{recursive:true,force:true})
}
