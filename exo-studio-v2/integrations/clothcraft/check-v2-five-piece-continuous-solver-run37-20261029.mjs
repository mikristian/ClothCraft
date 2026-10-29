// RUN37: actual native five-panel single sewn component acceptance.
// All native operations run in the authoritative workspace. Factory approval remains false.
// Opt-in native Rust acceptance for four authored panels plus a regenerated facing.
// Uses one authoritative persisted native project through CUT and marker placement.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {generateNativeOrderMarkers,nativeSourceFingerprint,nativeCutlineFingerprint} from './native-production-order-marker-20261029.mjs'
import {generateNativeVerifiedOrderMarkersRun36} from './native-verified-order-handoff-run36-20261029.mjs'
import {verifyNativeContinuousGarment20261029} from '../../src/core/nativeContinuousGarmentAcceptance20261029.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-five-panel-marker-'))
const workspace=createWorkspace(root)
const sizes=['XS','S','M','L','XL','XXL']
const solverRows=[]
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const offsets=[-.015,-.007,0,.005,.010,.014]
const copy=structuredClone
let state,stage='open'
let originalSeams,newSeam
let bridgeSeam,originalIds,newIds
const verifySingleComponent=template=>{
  const ids=template.panels.map(p=>p.id)
  const graph=new Map(ids.map(id=>[id,new Set()]))
  for(const seam of template.seams){
    assert(graph.has(seam.a.panel)&&graph.has(seam.b.panel),'Seam references a missing panel')
    graph.get(seam.a.panel).add(seam.b.panel)
    graph.get(seam.b.panel).add(seam.a.panel)
  }
  const visited=new Set([ids[0]]),queue=[ids[0]]
  for(let i=0;i<queue.length;i++)for(const id of graph.get(queue[i]))if(!visited.has(id)){
    visited.add(id);queue.push(id)
  }
  assert.equal(visited.size,ids.length,`Disconnected sewn graph: ${ids.filter(id=>!visited.has(id)).join(', ')}`)
  assert(template.seams.some(s=>[s.a.panel,s.b.panel].includes(newIds[0])&&[s.a.panel,s.b.panel].some(id=>originalIds.has(id))),
    'New rectangle must be sewn to original T-shirt body')
}
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
  const sewn=await send({op:'grade-run-sewing-balance-audit'})
  assert.equal(cuts.format,'exo-native-graded-cutlines.v1')
  assert.equal(cuts.cuttingAuthorized,false)
  assert.deepEqual(project.grade_run.sizes,sizes)
  assert.equal(project.template.seams.length,11,'8 original plus bridge, new-piece and facing seams')
  verifySingleComponent(project.template)
  for(const original of originalSeams)assert(project.template.seams.some(s=>s.id===original.id),'Original seam lost: '+original.id)
  assert.equal(sewn.easeReviewRequired,false)
  assert.equal(sewn.factoryApproved,false)
  assert.equal(project.template.panels.length,5)
  const continuous=verifyNativeContinuousGarment20261029({project,sewing:sewn,cutlines:cuts,expectedPanels:5,requiredSeamIds:originalSeams.map(s=>s.id)})
  assert.equal(continuous.componentCount,1)
  const ids=project.template.panels.map(p=>p.id)
  const facing=project.native_facing_dependency
  assert(facing&&ids.includes(facing.facingId))
  assert.deepEqual(cuts.sizes.map(row=>row.size),sizes)
  for(let i=0;i<sizes.length;i++){
    const audited=sewn.sizes[i].seams
    assert.equal(audited.length,11,'Missing sewn audits at '+sizes[i])
    for(const seam of [...originalSeams,newSeam,bridgeSeam]){
      const a=audited.find(x=>x.seamId===seam.id)
      assert(a,'Missing original/native added seam '+seam.id)
      assert.equal(a.requiresEaseReview,false)
      assert(Math.abs(a.mismatchM)<1e-6,'Sew mismatch '+seam.id+' '+sizes[i]+': '+a.mismatchM)
    }
    const facingSewn=audited.find(x=>x.seamId===project.native_facing_dependency.facingId+'_attach')
    assert(facingSewn&&Math.abs(facingSewn.mismatchM)<1e-6)
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
    materialsByPanel:Object.fromEntries(ids.map(id=>{
      const sourcePanel=panel(project.template,id)
      return [id,{fabricId:sourcePanel.fabric,
        groupId:id===facing.facingId?'facing-group':'shell-group',
        grainAngleDeg:sourcePanel.grain_degrees,nap:'one-way'}]
    })),
    nativeSourceMaterialByPanel:Object.fromEntries(ids.map(id=>{
      const sourcePanel=panel(project.template,id)
      return [id,{sourceFabricId:sourcePanel.fabric,sourceGrainDegrees:sourcePanel.grain_degrees}]
    })),
    cuttingAuthorized:false
  }
  const markers=await generateNativeVerifiedOrderMarkersRun36(workspace,order)
  assert.equal(markers.cuttingAuthorized,false)
  assert.equal(markers.results.length,sizes.length)
  let instances=0
  for(const entry of markers.results){
    assert.deepEqual(entry.markers.map(m=>m.fabricId),[...new Set(ids.map(id=>order.materialsByPanel[id].fabricId))].sort())
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
  assert.notEqual(nativeCutlineFingerprint(wrongPoint),order.nativeCutlineFingerprint)
  const wrongSize=copy(cuts);wrongSize.sizes[0].size='XXL'
  assert.notEqual(nativeCutlineFingerprint(wrongSize),order.nativeCutlineFingerprint)
  const wrongSource=copy(project);wrongSource.grade_run.baseSize='XXL'
  assert.notEqual(nativeSourceFingerprint(wrongSource),order.sourceFingerprint)
  const wrongQty=copy(order);wrongQty.quantitiesBySize.XS[facing.facingId]=0
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,wrongQty),/INVALID_ORDER_QUANTITY/)
  const wrongMaterial=copy(order);wrongMaterial.materialsByPanel[facing.facingId].fabricId=''
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,wrongMaterial),/UNVALIDATED_PRODUCTION_MATERIAL_OR_GRAIN_OVERRIDE/)
  return {project,cuts,order,markers,instances,ids,facing}
}

try{
  await send({op:'open',preset:'tshirt'})
  originalSeams=structuredClone(state.template.seams)
  assert.equal(originalSeams.length,8,'Expected eight original native T-shirt sewn relations')
  originalIds=new Set(state.template.panels.map(p=>p.id))
  assert.equal(originalIds.size,2,'Expected exactly two source panels from native T-shirt preset')
  for(let i=0;i<2;i++)await send({op:'edit',command:{kind:'Polygon',
    fabric:state.template.fabrics[0].id,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  newIds=state.template.panels.filter(p=>!originalIds.has(p.id)).map(p=>p.id)
  assert.equal(newIds.length,2)
  const newRef=id=>({panel:id,side:'top',edge:panel(state.template,id).polygon.edges[2],range:[0,1]})
  await send({op:'edit',command:{kind:'Sew',a:newRef(newIds[0]),b:newRef(newIds[1]),reverse:true,ease:false}})
  newSeam=state.template.seams.find(s=>s.a.panel===newIds[0]&&s.b.panel===newIds[1])
  assert(newSeam,'Native new-piece seam absent')
  stage='sew rectangle assembly to original T-shirt'
  const edgeLength=(p,i)=>Math.hypot(...p.polygon.points[i].map((x,k)=>x-p.polygon.points[(i+1)%p.polygon.points.length][k]))
  const edgeIsUnused=(id,edge)=>!state.template.seams.some(s=>
    (s.a.panel===id&&s.a.edge===edge)||(s.b.panel===id&&s.b.edge===edge))
  const candidate=state.template.panels.filter(p=>originalIds.has(p.id)).flatMap(p=>
    p.polygon.edges.map((edge,i)=>({p,edge,length:edgeLength(p,i)})))
    .filter(x=>x.length>=.32-1e-9&&edgeIsUnused(x.p.id,x.edge))
    .sort((a,b)=>a.length-b.length)[0]
  assert(candidate,'No free straight original T-shirt edge long enough for invariant 320 mm bridge')
  const target={panel:candidate.p.id,side:'top',edge:candidate.edge,range:[0,.32/candidate.length]}
  const rectangle={panel:newIds[0],side:'top',edge:panel(state.template,newIds[0]).polygon.edges[1],range:[0,1]}
  assert(Math.abs(edgeLength(panel(state.template,newIds[0]),1)-.32)<1e-9)
  await send({op:'edit',command:{kind:'Sew',a:target,b:rectangle,reverse:true,ease:false}})
  bridgeSeam=state.template.seams.find(s=>[s.a.panel,s.b.panel].includes(candidate.p.id)&&[s.a.panel,s.b.panel].includes(newIds[0]))
  assert(bridgeSeam,'Native bridge seam absent')
  verifySingleComponent(state.template)
  const source=(await send({op:'save'})).project
  for(const p of source.template.panels)p.polygon.seam_allowances=Object.fromEntries(p.polygon.edges.map(edge=>[edge,.01]))
  const placedTranslations=[[1.5,1.4,.05],[1.9,1.4,.15]]
  for(let i=0;i<newIds.length;i++){
    const sourcePanel=panel(source.template,newIds[i])
    assert(sourcePanel.placement&&Array.isArray(sourcePanel.placement.translation),
      `Native placement unavailable for ${newIds[i]}`)
    sourcePanel.placement.translation=[...placedTranslations[i]]
  }
  source.state=null;source.mesh_signature=null
  await send({op:'open',project:source})
  for(let i=0;i<newIds.length;i++)assert.deepEqual(
    panel(state.template,newIds[i]).placement.translation,placedTranslations[i])
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
      // Do not mutate seam ranges in a graded template; native Rust forbids
      // factory metadata divergence. An un-eased seam must still compile.
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
  for(const template of [after.project.template,...after.project.grade_run.gradedTemplates])
    for(let i=0;i<newIds.length;i++)assert.deepEqual(
      panel(template,newIds[i]).placement.translation,placedTranslations[i],
      `${newIds[i]} physically moved during grading or regeneration`)
  assert.notEqual(before.order.sourceFingerprint,after.order.sourceFingerprint)
  assert.notEqual(before.order.nativeCutlineFingerprint,after.order.nativeCutlineFingerprint)
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,before.order),/STALE_OR_MISSING_ORDER_SOURCE/)
  assert.notEqual(nativeCutlineFingerprint(after.cuts),before.order.nativeCutlineFingerprint)
  stage='native six-size 3D activation and restoration'
  for(const size of sizes){
    const activated=await send({op:'grade-run-activate',size})
    assert.equal(activated.activeGradedSize,size)
    assert.equal(activated.gradedFitEvidence?.nativeMeshCompiled,true)
    assert.equal(activated.gradedFitEvidence?.nativeStepEvidence,false)
    const revisionBeforeStep=activated.revision
    const stepped=await send({op:'step',steps:1})
    const evidence=stepped.gradedFitEvidence
    assert.equal(stepped.revision,revisionBeforeStep+1)
    assert.equal(evidence?.nativeStepEvidence,true,`${size}: native CPU step absent`)
    assert.equal(evidence?.measurementsFinite,true)
    assert.equal(evidence?.fitCertified,false)
    assert.equal(evidence?.manufacturingApproved,false)
    assert.equal(evidence?.seamCount,11,`${size}: assembled sewn seams missing after native step`)
    assert(finite(evidence.maxSeamGapMm)&&evidence.maxSeamGapMm>=0)
    assert(finite(evidence.maxRmsSeamGapMm)&&evidence.maxRmsSeamGapMm>=0)
    assert(finite(evidence.simulationTimeSeconds)&&evidence.simulationTimeSeconds>0)
    assert(stepped.metrics&&finite(stepped.metrics.contacts)&&stepped.metrics.contacts>=0)
    assert(Array.isArray(stepped.positions)&&stepped.positions.length>0&&
      stepped.positions.every(p=>Array.isArray(p)&&p.every(finite)))
    solverRows.push({size,seams:evidence.seamCount,contacts:stepped.metrics.contacts,
      maxSeamGapMm:evidence.maxSeamGapMm,rmsSeamGapMm:evidence.maxRmsSeamGapMm,
      simulationTimeSeconds:evidence.simulationTimeSeconds,stepMs:stepped.metrics.step_ms})
    await send({op:'grade-run-restore'})
    assert.deepEqual((await send({op:'save'})).project,after.project)
  }
  stage='undo redo save reopen'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,before.project)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after.project)
  await send({op:'open',project:after.project})
  for(let i=0;i<newIds.length;i++)assert.deepEqual(
    panel(state.template,newIds[i]).placement.translation,placedTranslations[i],
    `${newIds[i]} physical placement lost on reopen`)
  const reopened=await verifyMarkers(.38)
  assert.deepEqual(reopened.markers.results,after.markers.results)
  assert.equal(reopened.markers.sourceFingerprint,after.markers.sourceFingerprint)
  assert.equal(reopened.markers.nativeCutlineFingerprint,after.markers.nativeCutlineFingerprint)
  console.log(JSON.stringify({result:'PASS',source:'one-persisted-authoritative-native-project',
    authoredPanels:4,derivedFacingPanels:1,originalSeams:8,addedSeams:3,singleSewnComponent:true,sizes,instanceCount:after.instances,
    originalInstanceCount:before.instances,negativeCases:9,
    qualifiedRegeneration:true,undoRedo:true,saveReopen:true,
    native3DSizeActivation:true,nativeStepEvidence:true,solverStepsPerSize:1,solverRows,
    cuttingAuthorized:false,physicalFitVerified:false,fitCertified:false,
    factoryApproved:false,sourceFingerprint:after.order.sourceFingerprint,
    nativeCutlineFingerprint:after.order.nativeCutlineFingerprint}))
}catch(error){
  console.error(JSON.stringify({result:'FAIL',stage,reason:error?.stack??String(error)}))
  process.exitCode=1
}finally{
  workspace.close()
  fs.rmSync(root,{recursive:true,force:true})
}

