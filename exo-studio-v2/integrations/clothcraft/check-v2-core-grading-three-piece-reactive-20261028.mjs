// Real native Rust multi-piece measurement regeneration witness (not factory certification).
// Independent of the UI / grading sidecar; isolated garment and one native revision.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-grade-reactive-three-'))
const workspace=createWorkspace(root)
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.012,S:-.006,M:0,L:.006,XL:.012,XXL:.018}
let snapshot
const send=async payload=>{
 const result=await workspace.request({revision:snapshot?.revision,...payload})
 assert(result.ok,`${payload.op}: ${result.error}`)
 if(result.data?.template)snapshot=result.data
 return result.data
}
const panel=(template,id)=>template.panels.find(piece=>piece.id===id)
const stable=value=>JSON.stringify(value)
try{
 await send({op:'open',preset:'tshirt'})
 const ids=new Set(snapshot.template.panels.map(piece=>piece.id))
 const fabric=snapshot.template.fabrics[0]?.id
 for(let i=0;i<3;i++){
  await send({op:'edit',command:{kind:'Polygon',fabric,
   points:[[0,0],[.4,0],[.4,.3],[0,.3]]}})
 }
 const targets=snapshot.template.panels.filter(piece=>!ids.has(piece.id)).map(piece=>piece.id)
 assert.equal(targets.length,3)
 await send({op:'bindings-store',nativeBindings:{
  measurements:{width:{valueMm:400}},
  bindings:targets.map((id,index)=>({id:`grade-linked-${index}`,panelId:id,
   pointIndex:1,mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]})),
 }})
 const base=structuredClone(snapshot.template)
 const run={schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(base),
  gradedTemplates:sizes.map(size=>{
   const template=structuredClone(base)
   for(const id of targets)panel(template,id).polygon.points[1][0]+=offsets[size]
   return template
  }),pomSpecs:[]}
 await send({op:'grade-run-commit',gradeRun:run})
 assert.equal(snapshot.gradeRunPersisted,true)
 const initial=(await send({op:'save'})).project
 const revision=snapshot.revision
 const preview=await send({op:'bindings-grade-regenerate-preview',overrides:{width:382}})
 assert.deepEqual(preview.bySize.map(row=>row.size),sizes)
 assert.deepEqual((await send({op:'save'})).project,initial,'Preview mutated persisted native garment')
 const committed=await send({op:'bindings-grade-regenerate',overrides:{width:382}})
 assert.equal(snapshot.revision,revision+1)
 assert.deepEqual(committed.regenerationEvidence,preview)
 const after=(await send({op:'save'})).project
 assert.equal(after.grade_run.gradedTemplates.length,6)
 for(const id of targets){
  assert(Math.abs(panel(after.template,id).polygon.points[1][0]-.382)<1e-8)
  for(let i=0;i<6;i++){
   const value=panel(after.grade_run.gradedTemplates[i],id).polygon.points[1][0]
   assert(Math.abs(value-(.382+offsets[sizes[i]]))<1e-8,`${id}/${sizes[i]} not regenerated`)
  }
 }
 // Unbound original sewn T-shirt remains byte-for-byte unaffected.
 for(const original of initial.template.panels.filter(piece=>ids.has(piece.id))){
  assert.equal(stable(panel(after.template,original.id)),stable(original))
 }
 assert.deepEqual(after.template.seams,initial.template.seams)
 const bad=await workspace.request({op:'bindings-grade-regenerate',revision:snapshot.revision,
  overrides:{width:5500}})
 assert.equal(bad.ok,false)
 assert.deepEqual((await send({op:'save'})).project,after)
 await send({op:'undo'})
 assert.deepEqual(snapshot.template,initial.template)
 await send({op:'redo'})
 assert.deepEqual(snapshot.template,after.template)
 await send({op:'open',project:after})
 assert.deepEqual(snapshot.template,after.template)
 console.log(JSON.stringify({passed:true,nativeRust:true,allBoundPiecesRegenerated:true,
  boundPieces:3,sizes:6,sizePieceChecks:18,sourceRevision:revision,
  updatedRevision:revision+1,previewNoMutation:true,invalidOverrideRejected:true,
  undoRedoSaveReopen:true,unboundSeamsPreserved:true,factoryApproved:false}))
}finally{
 workspace.close()
 fs.rmSync(root,{recursive:true,force:true})
}
