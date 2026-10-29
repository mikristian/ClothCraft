// Opt-in native Rust acceptance for four authored panels plus a regenerated facing.
// Uses one authoritative persisted native project through CUT and marker placement.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {generateNativeOrderMarkers,nativeSourceFingerprint,nativeCutlineFingerprint} from './native-production-order-marker-20261029.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-five-panel-marker-'))
const workspace=createWorkspace(root)
const sizes=['XS','S','M','L','XL','XXL']
const offsets=[-.015,-.007,0,.005,.010,.014]
const copy=structuredClone
let state,stage='open'
const send=async request=>{
  const result=await workspace.request({revision:state?.revision,...request})
  assert.equal(result.ok,true,`${request.op}: ${result.error??'native Rust refused'}`)
  if(result.data?.template)state=result.data
  return result.data
}
const panel=(template,id)=>{
  const matches=template.panels.filter(p=>p.id===id)
  assert.equal(matches.length,1,`missing or duplicate panel ${id}`)
  return matches[0]
}
const rejected=async (request,label,pattern)=>{
  const before=(await send({op:'save'})).project
  const revision=state.revision
  const result=await workspace.request({revision,...request})
  assert.equal(result.ok,false,`${label}: invalid native command was accepted`)
  if(pattern)assert.match(result.error??'',pattern)
  await send({op:'snapshot'})
  assert.equal(state.revision,revision,`${label}: revision changed`)
  assert.deepEqual((await send({op:'save'})).project,before,`${label}: project changed`)
  return result.error
}
const verifyMarkers=async(expectedWidth)=>{
  const project=(await send({op:'save'})).project
  const cuts=await send({op:'grade-run-cutlines'})
  assert.equal(cuts.format,'exo-native-graded-cutlines.v1')
  assert.equal(cuts.cuttingAuthorized,false)
  assert.deepEqual(project.grade_run.sizes,sizes)
  assert.equal(project.template.panels.length,5)
  const ids=project.template.panels.map(p=>p.id)
  const facing=project.native_facing_dependency
  assert(facing&&ids.includes(facing.facingId))
  assert.deepEqual(cuts.sizes.map(row=>row.size),sizes)
  for(let i=0;i<sizes.length;i++){
    const graded=project.grade_run.gradedTemplates[i]
    assert.deepEqual(graded.panels.map(p=>p.id),ids)
    for(const id of [facing.parentPanelId,facing.facingId]){
      assert(Math.abs(panel(graded,id).polygon.points[1][0]-(expectedWidth+offsets[i]))<1e-7)
      assert(Math.abs(panel(graded,id).polygon.points[2][0]-(expectedWidth+offsets[i]))<1e-7)
    }
    assert.deepEqual(cuts.sizes[i].panels.map(p=>p.panel_id),ids)
    const faceCut=cuts.sizes[i].panels.find(p=>p.panel_id===facing.facingId)?.cut
    assert(faceCut?.points?.length>=3,`missing physical facing cutline ${sizes[i]}`)
    assert.equal(faceCut.notches.length,2)
    assert(faceCut.edges.every(e=>Math.abs(e.allowance_m-.01)<1e-9))
  }
  const order={
    sourceFingerprint:nativeSourceFingerprint(project),
    nativeCutlineFingerprint:nativeCutlineFingerprint(cuts),
    sizes:[...sizes],
    panelIds:[...ids],
    quantitiesBySize:Object.fromEntries(sizes.map((size,i)=>[size,Object.fromEntries(ids.map((id,j)=>[id,1+(i+j)%2]))])),
    materialsByPanel:Object.fromEntries(ids.map(id=>[id,{
      fabricId:id===facing.facingId?'facing-fabric':'shell-fabric',
      groupId:id===facing.facingId?'facing-group':'shell-group',
      grainAngleDeg:0,nap:'one-way'
    }])),
    cuttingAuthorized:false
  }
  const markers=generateNativeOrderMarkers(project,cuts,order)
  assert.equal(markers.cuttingAuthorized,false)
  assert.equal(markers.results.length,sizes.length)
  let instances=0
  for(const entry of markers.results){
    assert.deepEqual(entry.markers.map(m=>m.fabricId),['facing-fabric','shell-fabric'])
    for(const fabric of entry.markers){
      const expected=ids.filter(id=>order.materialsByPanel[id].fabricId===fabric.fabricId)
        .flatMap(id=>Array.from({length:order.quantitiesBySize[entry.size][id]},(_,i)=>JSON.stringify([id,i]))).sort()
      const actual=fabric.marker.placements.map(p=>JSON.stringify([p.pieceId,p.instance])).sort()
      assert.deepEqual(actual,expected)
      assert.notEqual(fabric.marker.manufacturingApproved,true,'marker unexpectedly claims manufacturing approval')
      instances+=actual.length
    }
  }
  // Negative integrity tests bind the exact observed native CUT and source.
  const wrongPoint=copy(cuts)
  wrongPoint.sizes[0].panels.find(p=>p.panel_id===facing.facingId).cut.points[0][0]+=.00001
  assert.throws(()=>generateNativeOrderMarkers(project,wrongPoint,order),/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const wrongSize=copy(cuts);wrongSize.sizes[0].size='XXL'
  assert.throws(()=>generateNativeOrderMarkers(project,wrongSize,order),/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const wrongSource=copy(project);wrongSource.grade_run.baseSize='XXL'
  assert.throws(()=>generateNativeOrderMarkers(wrongSource,cuts,order),/STALE_OR_MISSING_ORDER_SOURCE/)
  const wrongQty=copy(order);wrongQty.quantitiesBySize.XS[facing.facingId]=0
  assert.throws(()=>generateNativeOrderMarkers(project,cuts,wrongQty),/INVALID_ORDER_QUANTITY/)
  const wrongMaterial=copy(order);wrongMaterial.materialsByPanel[facing.facingId].fabricId=''
  assert.throws(()=>generateNativeOrderMarkers(project,cuts,wrongMaterial),/INVALID_MATERIAL_GROUP_GRAIN/)
  return {project,cuts,order,markers,instances,ids,facing}
}

try{
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const originalIds=new Set(state.template.panels.map(p=>p.id))
  assert.equal(originalIds.size,2,'Expected exactly two source panels from native T-shirt preset')
  for(let i=0;i<2;i++)await send({op:'edit',command:{kind:'Polygon',
    fabric:state.template.fabrics[0].id,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const newIds=state.template.panels.filter(p=>!originalIds.has(p.id)).map(p=>p.id)
  assert.equal(newIds.length,2)
  const source=(await send({op:'save'})).project
  for(const p of source.template.panels)p.polygon.seam_allowances=Object.fromEntries(p.polygon.edges.map(edge=>[edge,.01]))
  source.state=null;source.mesh_signature=null
  await send({op:'open',project:source})
  stage='author native bindings and grade run'
  const rules=newIds.flatMap((id,i)=>[
    {id:`width_upper_${i}`,panelId:id,pointIndex:1,mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]},
    {id:`width_lower_${i}`,panelId:id,pointIndex:2,mode:'polar',a:3,b:3,angleDeg:0,distanceFormula:'width',dependsOn:[]}
  ])
  await send({op:'bindings-store',nativeBindings:{measurements:{width:{valueMm:400}},bindings:rules}})
  const base=copy(state.template)
  await send({op:'grade-run-commit',gradeRun:{
    schemaVersion:1,sizes,baseSize:'M',baseTemplate:copy(base),
    gradedTemplates:sizes.map((size,i)=>{
      const template=copy(base)
      for(const id of newIds)for(const index of [1,2])panel(template,id).polygon.points[index][0]+=offsets[i]
      return template
    }),pomSpecs:[]
  }})
  stage='install persisted derived facing'
  const parentId=newIds[0]
  const parentEdgeId=panel(state.template,parentId).polygon.edges[0]
  await send({op:'facing-dependency-install',parentPanelId:parentId,parentEdgeId,
    facingId:'five_panel_native_facing_worker1',depthMm:40,allowanceMm:10})
  const before=await verifyMarkers(.4)
  stage='invalid stale facing source'
  const badProject=copy(before.project)
  badProject.native_facing_dependency.sourceTemplate.panels[0].polygon.points[0][0]+=.001
  await rejected({op:'open',project:badProject},'stale derived facing',/Stale or invalid facing sourceTemplate/)
  const invalidEdit=await rejected({op:'edit',command:{kind:'Anchor',panel:parentId,anchor:0,position:[.005,0]}},
    'unqualified source change',/Native facing dependency requires qualified regeneration/)
  stage='qualified native regeneration and marker handoff'
  const preview=await send({op:'bindings-grade-regenerate-preview',overrides:{width:380}})
  assert.equal(preview.sourceRevision,state.revision)
  assert.deepEqual((await send({op:'save'})).project,before.project)
  await send({op:'bindings-grade-regenerate',overrides:{width:380}})
  const after=await verifyMarkers(.38)
  assert.notEqual(before.order.sourceFingerprint,after.order.sourceFingerprint)
  assert.notEqual(before.order.nativeCutlineFingerprint,after.order.nativeCutlineFingerprint)
  assert.throws(()=>generateNativeOrderMarkers(after.project,after.cuts,before.order),/STALE_OR_MISSING_ORDER_SOURCE/)
  assert.throws(()=>generateNativeOrderMarkers(before.project,after.cuts,before.order),/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  stage='native six-size 3D activation and restoration'
  for(const size of sizes){
    const activated=await send({op:'grade-run-activate',size})
    assert.equal(activated.activeGradedSize,size)
    assert.equal(activated.gradedFitEvidence?.nativeMeshCompiled,true)
    await send({op:'grade-run-restore'})
    assert.deepEqual((await send({op:'save'})).project,after.project)
  }
  stage='undo redo save reopen'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,before.project)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after.project)
  await send({op:'open',project:after.project})
  const reopened=await verifyMarkers(.38)
  assert.deepEqual(reopened.markers,after.markers)
  console.log(JSON.stringify({result:'PASS',source:'one-persisted-authoritative-native-project',
    authoredPanels:4,derivedFacingPanels:1,sizes,instanceCount:after.instances,
    originalInstanceCount:before.instances,negativeCases:9,
    qualifiedRegeneration:true,undoRedo:true,saveReopen:true,
    native3DSizeActivation:true,cuttingAuthorized:false,physicalFitVerified:false,
    factoryApproved:false,sourceFingerprint:after.order.sourceFingerprint,
    nativeCutlineFingerprint:after.order.nativeCutlineFingerprint}))
}catch(error){
  console.error(JSON.stringify({result:'FAIL',stage,reason:error?.stack??String(error)}))
  process.exitCode=1
}finally{
  workspace.close()
  fs.rmSync(root,{recursive:true,force:true})
}
