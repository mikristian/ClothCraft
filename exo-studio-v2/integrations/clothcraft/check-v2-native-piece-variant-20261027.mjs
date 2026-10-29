// Acceptance of native production/3D piece selection in a disposable real Rust
// fitting workspace. This does not certify cutting, mirrored pieces or release.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-piece-variant-'))
const workspace=createWorkspace(root)
const checks=[]
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.013,S:-.007,M:0,L:.006,XL:.013,XXL:.020}
let snapshot
const project=async()=> {
  const reply=await workspace.request({op:'save'})
  assert.equal(reply.ok,true,`save: ${reply.error??'native refusal'}`)
  assert(reply.data?.project,'Rust save must return a fitting project')
  return reply.data.project
}
const run=async(request,{snapshotResult=true}={})=>{
  const reply=await workspace.request({revision:snapshot?.revision,...request})
  assert.equal(reply.ok,true,`${request.op}: ${reply.error??'native refusal'}`)
  if(snapshotResult){
    assert(reply.data?.template,`${request.op} must return an authored source snapshot`)
    snapshot=reply.data
  }
  return reply.data
}
const deny=async(request,label)=>{
  const before=await project()
  const revision=snapshot.revision
  const reply=await workspace.request({revision,...request})
  assert.equal(reply.ok,false,`${label}: Rust must refuse request`)
  assert(typeof reply.error==='string'&&reply.error.length>0,`${label}: refusal needs explanation`)
  await run({op:'snapshot'})
  assert.equal(snapshot.revision,revision,`${label}: rejected command changed revision`)
  assert.deepEqual(await project(),before,`${label}: rejected command changed project`)
  checks.push(`${label}: ${reply.error}`)
}
const variant=()=>({version:1,sourceTemplate:structuredClone(snapshot.template),pieces:snapshot.template.panels.map(p=>({
  panelId:p.id,fabricId:p.fabric,quantity:1,production:true,sendTo3D:true,
}))})
const identicalPhysical=(before,after,label)=>{
  assert.deepEqual(after.template,before.template,`${label}: authored source changed`)
  assert.deepEqual(after.state,before.state,`${label}: physical drape changed`)
  assert.deepEqual(after.mesh_signature,before.mesh_signature,`${label}: mesh signature changed`)
  assert.deepEqual(after.grade_run,before.grade_run,`${label}: grade catalog changed`)
  assert.deepEqual(after.native_point_bindings,before.native_point_bindings,`${label}: native bindings changed`)
}
const expectVariant=(actual,expected,label)=>{
  assert.deepEqual(actual,expected,`${label}: persisted native variant differs`)
}
try{
  await run({op:'open',preset:'tshirt'})
  assert(snapshot.template.panels.length>=2,'Expected multiple physical garment panels')
  const baseline=await project()
  assert.equal(baseline.piece_variant??null,null,'New garment must start without a stored selection')
  const selection=variant()
  const beforeRevision=snapshot.revision
  await run({op:'piece-variant-inspect'},{snapshotResult:false})
  assert.equal(snapshot.revision,beforeRevision,'Inspection must not advance revision')
  identicalPhysical(baseline,await project(),'pre-store inspection')
  checks.push('Initial real Rust inspection does not mutate source, drape or project')

  await run({op:'piece-variant-store',variant:selection})
  const stored=await project()
  expectVariant(stored.piece_variant,selection,'store')
  identicalPhysical(baseline,stored,'store')
  const storedRevision=snapshot.revision
  const inspection=await run({op:'piece-variant-inspect'},{snapshotResult:false})
  assert(inspection&&typeof inspection==='object','Inspection must provide a native result packet')
  assert.equal(snapshot.revision,storedRevision,'Inspection must not alter source revision')
  expectVariant((await project()).piece_variant,selection,'inspect')
  checks.push('Store persists the strict physical selection and inspection preserves source and mesh')

  await deny({op:'piece-variant-store',revision:storedRevision-1,variant:selection},'stale CAS store')
  const wrong=structuredClone(selection)
  wrong.pieces[0].fabricId='nonexistent-fabric'
  await deny({op:'piece-variant-store',variant:wrong},'incorrect fabric identity')
  const duplicate=structuredClone(selection)
  duplicate.pieces[1].panelId=duplicate.pieces[0].panelId
  await deny({op:'piece-variant-store',variant:duplicate},'duplicate source pieces')
  const absent=structuredClone(selection)
  absent.pieces.pop()
  await deny({op:'piece-variant-store',variant:absent},'missing source piece')
  const unknown=structuredClone(selection)
  unknown.extra='unexpected schema field'
  await deny({op:'piece-variant-store',variant:unknown},'unknown schema field')

  const saved=await project()
  await run({op:'open',project:saved})
  expectVariant((await project()).piece_variant,selection,'reopen')
  identicalPhysical(baseline,await project(),'reopen')
  checks.push('Native fitting project save/reopen retains piece_variant and the same physical source')

  // Exercise standard native edit history without imposing a specific undo
  // implementation on the newly introduced variant metadata.
  await run({op:'piece-variant-clear'})
  const cleared=await project()
  assert.equal(cleared.piece_variant??null,null,'Clear must remove the durable selection')
  identicalPhysical(baseline,cleared,'clear')
  await deny({op:'piece-variant-clear',revision:snapshot.revision-1},'stale CAS clear')
  const clearedSaved=await project()
  await run({op:'open',project:clearedSaved})
  assert.equal((await project()).piece_variant??null,null,'Clear must survive save/reopen')
  checks.push('Clear is persisted and rejects stale CAS while preserving physical drape')

  // Source changes invalidate a saved selection. The native engine may clear
  // obsolete metadata or keep it as stale evidence, but it cannot validate or
  // store a graph whose sourceTemplate predates the edit.
  await run({op:'piece-variant-store',variant:variant()})
  const oldVariant=structuredClone((await project()).piece_variant)
  const panel=snapshot.template.panels[0]
  const previousName=panel.name
  await run({op:'set-property',target:'panel',id:panel.id,field:'name',value:`${panel.name??'Piece'}-revision-check`})
  const afterEdit=await project()
  await deny({op:'piece-variant-store',variant:oldVariant},'stale source graph after native edit')
  if(snapshot.canUndo){
    await run({op:'undo'})
    assert.equal(snapshot.template.panels.find(p=>p.id===panel.id)?.name,previousName,
      'Native undo must restore authored source')
    if(snapshot.canRedo){
      await run({op:'redo'})
      assert.equal(snapshot.template.panels.find(p=>p.id===panel.id)?.name,afterEdit.template.panels.find(p=>p.id===panel.id)?.name,
        'Native redo must restore the source edit')
    }
    checks.push('Existing native undo/redo remains operational after durable variant operations')
  }
  checks.push('Source edit prevents reaccepting a stale native variant graph')

  // A separate disposable fitted garment is used for the grade/variant
  // coexistence test so the source edit history above cannot leak into it.
  await run({op:'open',preset:'tshirt'})
  for(const seam of [...snapshot.template.seams])
    await run({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const originalIds=new Set(snapshot.template.panels.map(p=>p.id))
  const fabric=snapshot.template.fabrics[0].id
  for(let i=0;i<2;i++)
    await run({op:'edit',command:{kind:'Polygon',fabric,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const gradedIds=snapshot.template.panels.filter(p=>!originalIds.has(p.id)).map(p=>p.id)
  assert.equal(gradedIds.length,2,'Expected two independent graded native rectangles')
  const gradeBase=structuredClone(snapshot.template)
  const gradeRun={schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(gradeBase),
    gradedTemplates:sizes.map(size=>{
      const candidate=structuredClone(gradeBase)
      if(size!=='M')for(const p of candidate.panels)
        if(gradedIds.includes(p.id))p.polygon.points[1][0]+=offsets[size]
      return candidate
    }),pomSpecs:[]}
  await run({op:'grade-run-commit',gradeRun})
  const gradedProject=await project()
  assert.deepEqual(gradedProject.template,gradeBase,'Grade commit must retain exact authored source')
  assert.deepEqual(gradedProject.grade_run.baseTemplate,gradedProject.template,
    'Grade source and saved FittingProject template must be byte-for-byte structurally identical')
  assert.deepEqual(gradedProject.grade_run.sizes,sizes)
  assert.equal(gradedProject.grade_run.gradedTemplates.length,6)
  for(const [index,size] of sizes.entries()){
    const graded=gradedProject.grade_run.gradedTemplates[index]
    assert.deepEqual(gradedProject.grade_run.gradedTemplates[2],gradeBase,
      'Base size M must equal authored base template')
    for(const id of gradedIds){
      const sourcePoint=gradeBase.panels.find(p=>p.id===id).polygon.points[1]
      const sizedPoint=graded.panels.find(p=>p.id===id).polygon.points[1]
      assert(Math.abs((sizedPoint[0]-sourcePoint[0])-offsets[size])<1e-8,
        `Physical ${size} size differs from expected authored grade offset`)
    }
  }
  checks.push('Native XS–XXL catalog persists six geometrically distinct size templates with an identical authored grade source')

  const gradedSelection=variant()
  await run({op:'piece-variant-store',variant:gradedSelection})
  const linked=await project()
  expectVariant(linked.piece_variant,gradedSelection,'graded source coexistence')
  assert.deepEqual(linked.grade_run,gradedProject.grade_run,'Variant store altered six-size catalog')
  assert.deepEqual(linked.template,gradedProject.template,'Variant store altered authored base')
  assert.deepEqual(linked.piece_variant.sourceTemplate,linked.grade_run.baseTemplate,
    'Variant must refer to the exact saved grade source template')
  await run({op:'grade-run-activate',size:'XL'})
  assert.equal(snapshot.activeGradedSize,'XL','Native viewport must activate the requested fitted XL size')
  const activatedSave=await project()
  expectVariant(activatedSave.piece_variant,gradedSelection,'active XL saved authored base')
  assert.deepEqual(activatedSave.grade_run,gradedProject.grade_run,'Active XL changed saved catalog')
  assert.deepEqual(activatedSave.template,gradeBase,'Active XL changed saved base source')
  assert.deepEqual(activatedSave.piece_variant.sourceTemplate,activatedSave.template,
    'Active XL detached variant from authored base')
  await run({op:'grade-run-restore'})
  assert.equal(snapshot.activeGradedSize??null,null,'Restore must return native viewport to base')
  const restoredProject=await project()
  expectVariant(restoredProject.piece_variant,gradedSelection,'restored base variant')
  assert.deepEqual(restoredProject.grade_run,gradedProject.grade_run)
  assert.deepEqual(restoredProject.template,gradeBase)
  await run({op:'open',project:restoredProject})
  const finalProject=await project()
  expectVariant(finalProject.piece_variant,gradedSelection,'grade coexistence save/reopen')
  assert.deepEqual(finalProject.grade_run,gradedProject.grade_run)
  assert.deepEqual(finalProject.grade_run.baseTemplate,finalProject.template)
  assert.deepEqual(finalProject.piece_variant.sourceTemplate,finalProject.template)
  checks.push('Native XL activate/restore and save/reopen preserve the base-linked production/3D variant alongside all six graded templates')
  console.log(JSON.stringify({passed:true,checks,manufacturerApproved:false,mirroredInstancesProven:false},null,2))
}catch(error){
  console.error(JSON.stringify({passed:false,checks,error:error.stack??String(error)},null,2))
  process.exitCode=1
}finally{
  workspace.close()
  fs.rmSync(root,{recursive:true,force:true})
}
