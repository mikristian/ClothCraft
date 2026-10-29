// Disposable real-Rust six-size chart authored through the SAME pure contract
// used by the browser UI; validates Rust store, formula regeneration and Undo.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {authorNativePerSizeChartEnvelope20261027} from '../../src/core/modarisNativePerSizeChartAuthor20261027.js'
import {verifyNativePerSizeChartStore20261027} from '../../src/core/modarisNativePerSizeChartStoreWitness20261027.js'

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'exo-ui-authored-size-formula-chart-'))
const workspace=createWorkspace(directory)
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.015,S:-.007,M:0,L:.005,XL:.010,XXL:.014}
const affine=process.argv.includes('--affine')
assert(process.argv.slice(2).every(arg=>arg==='--affine'),'Only --affine is supported')
const formula=affine?'halfWidth * 2 + 10':'halfWidth * 2'
const baseHalf=affine?195:200
const displacement=affine?10:0
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
    measurements:{halfWidth:{valueMm:baseHalf},width:{formula}},
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
    const half=baseHalf+offsets[size]*500,w=half*2+displacement
    values.halfWidth[size]={directInputMm:half,valueMm:half}
    values.width[size]={valueMm:w}
    physical[size]={minMm:w-1,maxMm:w+16}
    limits.halfWidth[size]={minMm:half-2,maxMm:half+11}
    limits.width[size]={minMm:w-4,maxMm:w+22}
  }
  const directCells={halfWidth:Object.fromEntries(sizes.map(size=>[size,values.halfWidth[size].directInputMm]))}
  const authored=authorNativePerSizeChartEnvelope20261027({project:saved,sourceRevision:state.revision,
    fabricId:state.template.fabrics[0].id,
    provenance:'Explicit six-size computed QA limits',
    chartProvenance:'Explicit operator direct cells; saved native formulas',
    directCells,bounds:limits,physicalPomBounds:{width_pom:physical},
  })
  assert.equal(authored.ok,true,`UI-authoring preflight: ${authored.reason}`)
  const envelope=authored.envelope
  assert.deepEqual(envelope.perSizeChart.values,values)
  assert.deepEqual(envelope.perSizeChart.sourceMeasurements,saved.native_point_bindings.measurements)
  assert.deepEqual(envelope.sourceTemplate,saved.template)
  const tampered=clone(saved)
  tampered.native_point_bindings.measurements.halfWidth.valueMm=baseHalf-1
  assert.equal(authorNativePerSizeChartEnvelope20261027({project:tampered,sourceRevision:state.revision,
    fabricId:state.template.fabrics[0].id,provenance:'Explicit six-size computed QA limits',
    chartProvenance:'Explicit operator direct cells; saved native formulas',
    directCells,bounds:limits,physicalPomBounds:{width_pom:physical},
  }).ok,false,'Forged stale graph accepted by UI chart author')
  stage='store and reject forged native chart'
  const storeRevision=state.revision
  await send({op:'fabric-grade-envelope-store',envelope})
  const inspected=await send({op:'fabric-grade-envelope-inspect'})
  assert.equal(inspected.nativeAuthoritative,true,'Rust did not authoritatively inspect the chart')
  assert.equal(inspected.sourceRevision,state.revision)
  assert.deepEqual(inspected.envelope,envelope,'Rust reinspection differs from the authored native chart')
  const before=(await send({op:'save'})).project
  const storeWitness=verifyNativePerSizeChartStore20261027({
    beforeProject:saved,afterProject:before,authoredEnvelope:envelope,inspected,
    beforeRevision:storeRevision,afterRevision:state.revision,
  })
  assert.equal(storeWitness.ok,true,`Independent chart-only Rust save/inspect witness: ${storeWitness.reason}`)
  assert.equal(storeWitness.changedGarmentGeometry,false)
  assert.deepEqual(before.fabric_grade_envelope.perSizeChart.values,values)
  await refuse({op:'fabric-grade-envelope-store',envelope:{...envelope,
    perSizeChart:{...envelope.perSizeChart,values:{...values,
      width:{...values.width,XL:{valueMm:999}}}}}},/size|formula|chart|stale|bound/i)
  stage='real native computed formula '+(affine?'affine':'scaled')+' inverse Anchor acceptance'
  const revision=state.revision
  const anchor=state.template.panels.find(panel=>panel.id===ids[0]).polygon.points[1]
  close(anchor[0]*1000,400)
  const moved=[anchor[0]+.010,anchor[1]]
  await send({op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,position:moved}})
  assert.equal(state.revision,revision+1,'scaled inverse must commit exactly one revision')
  const changed=clone((await send({op:'save'})).project)
  assert.equal(changed.native_point_bindings.measurements.width.formula,formula)
  for(let i=0;i<sizes.length;i++){
    const size=sizes[i],expected=410+offsets[size]*1000
    const chart=changed.fabric_grade_envelope.perSizeChart
    close(chart.values.halfWidth[size].directInputMm,values.halfWidth[size].directInputMm+5)
    close(chart.values.halfWidth[size].valueMm,values.halfWidth[size].valueMm+5)
    close(chart.values.width[size].valueMm,values.width[size].valueMm+10)
    for(const panelId of ids)close(width(changed.grade_run.gradedTemplates[i],panelId),expected)
    const actual=changed.grade_run.gradedTemplates[i].panels.find(p=>p.id===ids[0]).polygon.points
    close(Math.hypot(actual[1][0]-actual[0][0],actual[1][1]-actual[0][1])*1000,expected)
    const limits=changed.fabric_grade_envelope.physicalPomBounds?.width_pom?.[size]
    assert(limits,'physical POM bounds lost: '+size)
    assert(expected>=limits.minMm&&expected<=limits.maxMm,'physical POM violated: '+size)
  }
  stage='reject unsupported inverse gestures without revision mutation'
  const liveAnchor=state.template.panels.find(p=>p.id===ids[0]).polygon.points[1]
  await refuse({op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,
    position:[liveAnchor[0]+.001,liveAnchor[1]+.003]}},/axis|inverse|polar|bound|displacement|horizontal/i)
  const stale=await workspace.request({revision:revision,op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,
    position:[liveAnchor[0]+.001,liveAnchor[1]]}})
  assert.equal(stale.ok,false,'stale revision accepted')
  assert.equal(state.revision,revision+1)
  assert.deepEqual((await send({op:'save'})).project,changed)
  const far=state.template.panels.find(p=>p.id===ids[0]).polygon.points[1]
  await refuse({op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,
    position:[far[0]+.100,far[1]]}},/bound|violation|physical|chart|size|inverse/i)
  stage='single Undo Redo and reopen native persisted project'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,before)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,changed)
  await send({op:'open',project:clone(changed)})
  const reopened=(await send({op:'save'})).project
  assert.deepEqual(reopened.fabric_grade_envelope,changed.fabric_grade_envelope)
  assert.deepEqual(reopened.grade_run,changed.grade_run)
  // Each negative fixture is an isolated native reopen of the pre-chart project.
  // Both have a coherent 400 mm geometry at the initial computed value.
  async function rejectComputedFixture(name,configure,pattern){
    stage=name
    const fixture=clone(saved)
    configure(fixture.native_point_bindings)
    await send({op:'open',project:fixture})
    const baseline=clone((await send({op:'save'})).project)
    const baselineRevision=state.revision
    const point=state.template.panels.find(p=>p.id===ids[0]).polygon.points[1]
    await refuse({op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,
      position:[point[0]+.010,point[1]]}},pattern)
    assert.equal(state.revision,baselineRevision,name+': revision advanced')
    assert.deepEqual((await send({op:'save'})).project,baseline,name+': project mutated')
  }
  await rejectComputedFixture('nonlinear computed formula rejected',bindings=>{
    // Preserve the exact 400 mm installed point so the refusal exercises
    // inversion, not an earlier stale-bound-geometry guard.
    bindings.measurements.width.formula=`halfWidth * halfWidth / ${baseHalf*baseHalf/400}`
  },/affine|inverse|source|multiplier|nonlinear/i)
  await rejectComputedFixture('ambiguous shared computed dependency rejected',bindings=>{
    bindings.measurements.widthSecond={formula}
    bindings.bindings[1].distanceFormula='widthSecond'
  },/ambiguous multiple measurement dependencies|inverse|ambiguous/i)
  console.log(JSON.stringify({passed:true,native:true,realRustInverseAttempt:true,
    sizeCount:6,formula,affine,dragMm:10,directPerSizeDeltaMm:5,
    computedPerSizeDeltaMm:10,singleRevision:true,physicalPomPreserved:true,
    offAxisRejected:true,staleRejected:true,outOfBoundsRejected:true,
    nonlinearRejected:true,ambiguousComputedRejected:true,negativeProjectsUnchanged:true,
    undoRedo:true,saveReopen:true,vendorCertified:false}))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack}))
  process.exitCode=1
}finally{
  workspace.close()
  fs.rmSync(directory,{recursive:true,force:true})
}
