// Genuine Rust-backed physical six-size POM envelope acceptance fixture.
// The project and garment are disposable; physical geometry is authored in Rust.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {verifyModarisNativePhysicalPomEnvelopeCommit20261027} from '../../src/core/modarisNativePhysicalPomEnvelopeWitness20261027.js'
import {authorModarisNativePhysicalPomEnvelope20261027} from '../../src/core/modarisNativePhysicalPomEnvelopeAuthor20261027.js'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-physical-pom-envelope-'))
const workspace=createWorkspace(root)
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.015,S:-.007,M:0,L:.005,XL:.010,XXL:.014}
const clone=structuredClone
let state,stage='initialization'
const send=async command=>{
  const result=await workspace.request({revision:state?.revision,...command})
  assert.equal(result.ok,true,`${stage}: ${command.op}: ${result.error??'Rust rejected'}`)
  if(result.data?.template)state=result.data
  return result.data
}
const failClosed=async(command,matcher)=>{
  const revision=state.revision
  const saved=clone((await send({op:'save'})).project)
  const result=await workspace.request({revision:state.revision,...command})
  assert.equal(result.ok,false,`${stage}: ${command.op} improperly accepted physical POM violation`)
  assert.match(result.error,matcher)
  await send({op:'snapshot'})
  assert.equal(state.revision,revision,'Rejected physical request changed revision')
  assert.deepEqual((await send({op:'save'})).project,saved,'Rejected physical request changed saved project')
  return result.error
}
const panel=(template,id)=>{
  const result=template.panels.find(p=>p.id===id)
  assert(result,`Missing panel ${id}`)
  return result
}
const lengthMm=(template,id)=>{
  const p=panel(template,id).polygon.points
  return Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1])*1000
}
const close=(actual,expected,label)=>assert(Math.abs(actual-expected)<1e-6,`${label}: ${actual} != ${expected}`)
const bounds=Object.fromEntries(sizes.map(size=>[size,{
  minMm:400+1000*offsets[size]-1,
  maxMm:400+1000*offsets[size]+16,
}]))
const verifyPhysical=async(project,id,expectedWidth)=>{
  const grade=project.grade_run
  assert.equal(grade.gradedTemplates.length,6)
  const audit=await send({op:'grade-run-pom-audit'})
  const rows=audit.rows.filter(row=>row.pomId==='width_pom')
  assert.equal(rows.length,6,'Rust physical POM evaluator must independently report six actual graded widths')
  for(const [i,size] of sizes.entries()){
    const mm=lengthMm(grade.gradedTemplates[i],id)
    close(mm,expectedWidth+offsets[size]*1000,`${size} native graded width`)
    close(rows[i].measuredMm,mm,`${size} native Rust POM measurement`)
    assert(mm>=bounds[size].minMm-1e-8&&mm<=bounds[size].maxMm+1e-8,
      `${size} outside physical envelope`)
  }
  const cut=await send({op:'grade-run-cutlines'})
  assert.equal(cut.format,'exo-native-graded-cutlines.v1')
  assert.equal(cut.cuttingAuthorized,false)
  for(const [i,size] of sizes.entries()){
    assert.equal(cut.sizes[i].size,size)
    for(const panelId of project.template.panels.filter(p=>p.polygon).map(p=>p.id)){
      const authored=panel(grade.gradedTemplates[i],panelId)
      const actual=cut.sizes[i].panels.find(p=>p.panel_id===panelId)
      assert(actual?.cut,`${size}/${panelId} missing physical CUT`)
      for(const edge of actual.cut.edges)close(edge.allowance_m,.01,`${size}/${panelId} allowance`)
      assert.deepEqual(actual.cut.edges.map(edge=>edge.name),authored.polygon.edges)
    }
  }
}
try{
  stage='author real two-panel source and source-bound six-size grades'
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])
    await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const oldIds=new Set(state.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++)await send({op:'edit',command:{kind:'Polygon',
    fabric:state.template.fabrics[0].id,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=state.template.panels.filter(p=>!oldIds.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2)
  const physical=(await send({op:'save'})).project
  for(const p of physical.template.panels)if(p.polygon)
    p.polygon.seam_allowances=Object.fromEntries(p.polygon.edges.map(edge=>[edge,.01]))
  physical.state=null;physical.mesh_signature=null
  await send({op:'open',project:physical})
  await send({op:'bindings-store',nativeBindings:{
    measurements:{sharedWidth:{valueMm:400}},
    bindings:ids.map((panelId,i)=>({id:`physical_pom_panel_${i+1}`,panelId,pointIndex:1,
      mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'sharedWidth',dependsOn:[]})),
  }})
  const base=clone(state.template)
  await send({op:'grade-run-commit',gradeRun:{schemaVersion:1,sizes,baseSize:'M',
    baseTemplate:clone(base),gradedTemplates:sizes.map(size=>{
      const template=clone(base)
      for(const id of ids)panel(template,id).polygon.points[1][0]+=offsets[size]
      return template
    }),pomSpecs:[{id:'width_pom',label:'Panel physical reference width',panelId:ids[0],
      kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:50,
      targetsMm:Object.fromEntries(sizes.map(size=>[size,null]))}],
  }})
  const savedSource=(await send({op:'save'})).project
  const authoredEnvelope=authorModarisNativePhysicalPomEnvelope20261027(savedSource,{
    provenance:'Author supplied physical POM envelope engineering fixture 20261027',
    fabricId:state.template.fabrics[0].id,
    measurements:{sharedWidth:Object.fromEntries(sizes.map(size=>[size,{minMm:390,maxMm:430}]))},
    physicalPomBounds:{width_pom:bounds},
  })
  assert.equal(authoredEnvelope.ok,true,authoredEnvelope.reason)
  assert.equal(authoredEnvelope.measured.length,6)
  assert.equal(authoredEnvelope.authoritative,false,'Local author must not impersonate native Rust')
  const envelope=authoredEnvelope.envelope
  stage='saved physical POM source validates in Rust before commit'
  await send({op:'fabric-grade-envelope-store',envelope})
  const before=(await send({op:'save'})).project
  assert.deepEqual(before.fabric_grade_envelope.physicalPomBounds,envelope.physicalPomBounds)
  await verifyPhysical(before,ids[0],400)
  const inspect=await send({op:'fabric-grade-envelope-inspect'})
  assert.deepEqual(inspect.envelope.physicalPomBounds,envelope.physicalPomBounds)

  stage='forged physical inventory, geometry and bounds fail atomically'
  await failClosed({op:'fabric-grade-envelope-store',envelope:{...envelope,
    physicalPomBounds:{fake_id:bounds}}},/pom|physical|bound|inventory|unknown/i)
  await failClosed({op:'fabric-grade-envelope-store',envelope:{...envelope,
    physicalPomBounds:{width_pom:{M:bounds.M}}}},/pom|physical|bound|size|coverage/i)
  await failClosed({op:'fabric-grade-envelope-store',envelope:{...envelope,
    physicalPomBounds:{width_pom:{...bounds,XL:{minMm:300,maxMm:350}}}}},/pom|physical|bound|violation/i)
  const forged=clone(before)
  forged.grade_run.gradedTemplates[4].panels.find(p=>p.id===ids[0]).polygon.points[1][0]+=.025
  await failClosed({op:'open',project:forged},/pom|physical|bound|violation|grade|source/i)

  stage='reject 420mm preview and commit with direct chart permitting 420'
  const revision=state.revision
  await failClosed({op:'bindings-grade-regenerate-preview',overrides:{sharedWidth:420}},
    /pom|physical|bound|violation/i)
  await failClosed({op:'bindings-grade-regenerate',overrides:{sharedWidth:420}},
    /pom|physical|bound|violation/i)
  await failClosed({op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,
    position:[.42,0]}},/pom|physical|bound|violation/i)
  assert.equal(state.revision,revision)

  stage='physical 400 to 410mm preview and exactly-one-revision commit'
  const preview=await send({op:'bindings-grade-regenerate-preview',overrides:{sharedWidth:410}})
  assert.equal(preview.sourceRevision,revision)
  assert.equal(state.revision,revision)
  assert.deepEqual((await send({op:'save'})).project,before)
  const committed=await send({op:'bindings-grade-regenerate',overrides:{sharedWidth:410}})
  assert.equal(state.revision,revision+1)
  assert.deepEqual(committed.regenerationEvidence,preview)
  const after=(await send({op:'save'})).project
  assert.deepEqual(after.fabric_grade_envelope.physicalPomBounds,envelope.physicalPomBounds)
  assert.deepEqual(after.fabric_grade_envelope.sourceTemplate,after.template)
  await verifyPhysical(after,ids[0],410)
  const witness=verifyModarisNativePhysicalPomEnvelopeCommit20261027({
    beforeProject:before,afterProject:after,beforeRevision:revision,
    afterRevision:state.revision,pomId:'width_pom',
  })
  assert.equal(witness.ok,true,`Independent physical POM witness: ${witness.reason}`)
  assert.equal(witness.changedSizes,6)

  stage='reverse 420mm physical Anchor violation and full rollback'
  await failClosed({op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,
    position:[.42,0]}},/pom|physical|bound|violation/i)
  stage='undo and redo persist physical geometry and factory gates'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,before)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after)
  stage='native save and reopened physical POM envelope verification'
  await send({op:'open',project:clone(after)})
  const reopened=(await send({op:'save'})).project
  assert.deepEqual(reopened.fabric_grade_envelope,after.fabric_grade_envelope)
  await verifyPhysical(reopened,ids[0],410)
  await failClosed({op:'bindings-grade-regenerate-preview',overrides:{sharedWidth:420}},
    /pom|physical|bound|violation/i)
  console.log(JSON.stringify({passed:true,native:true,sizes,physicalPomId:'width_pom',
    independentWitness:witness.format,factoryApproved:false,
    checks:['two physical Rust panels with 10mm CUT and six graded sizes',
    'independent exact-size operator authoring remeasured six graded physical anchors before native store',
    'forged persisted physical POM inventory, bounds and graded geometry rejected',
    '420mm physical XL/XXL violation rejected for preview, commit, inverse Anchor',
    '400→410mm native preview and one revision commit, actual Rust POM/CUT pass',
    'independent saved graded geometry POM witness covers all six sizes',
    'Undo/Redo/save/reopen retains physical geometry and envelope'] } ))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack}))
  process.exitCode=1
}finally{
  workspace.close()
  fs.rmSync(root,{recursive:true,force:true})
}
