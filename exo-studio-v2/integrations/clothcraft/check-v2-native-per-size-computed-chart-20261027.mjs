// Disposable real-Rust six-size computed chart, with native Undo/save acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'exo-size-formula-chart-'))
const workspace=createWorkspace(directory)
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.015,S:-.007,M:0,L:.005,XL:.010,XXL:.014}
const clone=structuredClone
let state,stage='setup'
async function send(payload){
  const result=await workspace.request({revision:state?.revision,...payload})
  assert.equal(result.ok,true,stage+': '+payload.op+': '+result.error)
  if(result.data?.template)state=result.data
  return result.data
}
async function refuse(payload,pattern){
  const before=clone((await send({op:'save'})).project),revision=state.revision
  const result=await workspace.request({revision,...payload})
  assert.equal(result.ok,false,stage+': unsafe request accepted')
  assert.match(result.error,pattern)
  await send({op:'snapshot'})
  assert.equal(state.revision,revision)
  assert.deepEqual((await send({op:'save'})).project,before)
}
const width=(template,id)=>template.panels.find(p=>p.id===id).polygon.points[1][0]*1000
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,String(a)+' != '+String(b))
try{
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])
    await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const old=new Set(state.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++)await send({op:'edit',command:{kind:'Polygon',
    fabric:state.template.fabrics[0].id,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=state.template.panels.filter(p=>!old.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2)
  const project=(await send({op:'save'})).project
  for(const panel of project.template.panels)if(panel.polygon)
    panel.polygon.seam_allowances=Object.fromEntries(panel.polygon.edges.map(e=>[e,.01]))
  project.state=null;project.mesh_signature=null
  await send({op:'open',project})
  await send({op:'bindings-store',nativeBindings:{
    measurements:{halfWidth:{valueMm:200},width:{formula:'halfWidth * 2'}},
    bindings:ids.map((panelId,i)=>({id:'formula_panel_'+i,panelId,pointIndex:1,
      mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]})),
  }})
  const base=clone(state.template)
  await send({op:'grade-run-commit',gradeRun:{schemaVersion:1,sizes,baseSize:'M',
    baseTemplate:clone(base),gradedTemplates:sizes.map(size=>{
      const template=clone(base)
      for(const id of ids)template.panels.find(p=>p.id===id).polygon.points[1][0]+=offsets[size]
      return template
    }),pomSpecs:[{id:'width_pom',label:'Physical width',panelId:ids[0],
      kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:50,
      targetsMm:Object.fromEntries(sizes.map(s=>[s,null]))}],
  }})
  const saved=(await send({op:'save'})).project
  const values={halfWidth:{},width:{}},physical={},limits={halfWidth:{},width:{}}
  for(const size of sizes){
    const half=200+offsets[size]*500,w=half*2
    values.halfWidth[size]={directInputMm:half,valueMm:half}
    values.width[size]={valueMm:w}
    physical[size]={minMm:w-1,maxMm:w+16}
    limits.halfWidth[size]={minMm:half-2,maxMm:half+11}
    limits.width[size]={minMm:w-4,maxMm:w+22}
  }
  const envelope={schemaVersion:1,provenance:'Explicit six-size computed QA limits',
    fabricId:state.template.fabrics[0].id,sourceTemplate:clone(state.template),
    measurements:limits,physicalPomBounds:{width_pom:physical},
    perSizeChart:{provenance:'Explicit operator direct cells; saved native formulas',
      sourceMeasurements:clone(saved.native_point_bindings.measurements),values}}
  stage='store and reject forged native chart'
  await send({op:'fabric-grade-envelope-store',envelope})
  const before=(await send({op:'save'})).project
  assert.deepEqual(before.fabric_grade_envelope.perSizeChart.values,values)
  await refuse({op:'fabric-grade-envelope-store',envelope:{...envelope,
    perSizeChart:{...envelope.perSizeChart,values:{...values,
      width:{...values.width,XL:{valueMm:999}}}}}},/size|formula|chart|stale|bound/i)
  stage='native formula-driven six-size recompute'
  const revision=state.revision
  const preview=await send({op:'bindings-grade-regenerate-preview',overrides:{halfWidth:205}})
  assert.equal(state.revision,revision)
  const committed=await send({op:'bindings-grade-regenerate',overrides:{halfWidth:205}})
  assert.equal(state.revision,revision+1)
  assert.deepEqual(committed.regenerationEvidence,preview)
  const after=(await send({op:'save'})).project
  for(let i=0;i<sizes.length;i++){
    const size=sizes[i],expected=410+offsets[size]*1000
    close(width(after.grade_run.gradedTemplates[i],ids[0]),expected)
    close(after.fabric_grade_envelope.perSizeChart.values.halfWidth[size].valueMm,
      205+offsets[size]*500)
    close(after.fabric_grade_envelope.perSizeChart.values.width[size].valueMm,expected)
  }
  assert.deepEqual(after.fabric_grade_envelope.perSizeChart.sourceMeasurements,
    after.native_point_bindings.measurements)
  stage='second native formula edit after persisted chart rebase'
  const preview2=await send({op:'bindings-grade-regenerate-preview',overrides:{halfWidth:207}})
  assert.equal(state.revision,revision+1)
  const committed2=await send({op:'bindings-grade-regenerate',overrides:{halfWidth:207}})
  assert.equal(state.revision,revision+2)
  assert.deepEqual(committed2.regenerationEvidence,preview2)
  const after2=(await send({op:'save'})).project
  for(let i=0;i<sizes.length;i++){
    const size=sizes[i],expected=414+offsets[size]*1000
    close(width(after2.grade_run.gradedTemplates[i],ids[0]),expected)
    close(after2.fabric_grade_envelope.perSizeChart.values.halfWidth[size].valueMm,
      207+offsets[size]*500)
    close(after2.fabric_grade_envelope.perSizeChart.values.width[size].valueMm,expected)
  }
  stage='physical POM limit rejects oversized formula'
  await refuse({op:'bindings-grade-regenerate',overrides:{halfWidth:215}},
    /physical|bound|violation|chart|size/i)
  stage='two Undo Redo steps and reopen'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,after)
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,before)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after2)
  await send({op:'open',project:clone(after2)})
  assert.deepEqual((await send({op:'save'})).project.fabric_grade_envelope,
    after2.fabric_grade_envelope)
  console.log(JSON.stringify({passed:true,native:true,sizeCount:6,twoSingleRevisionEdits:true,
    formula:'halfWidth * 2',twoUndoRedo:true,saveReopen:true,
    vendorCertified:false,factoryApproved:false}))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack}))
  process.exitCode=1
}finally{
  workspace.close()
  fs.rmSync(directory,{recursive:true,force:true})
}
