// Existing native binary; disposable Rust workspace; no browser or compilation.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {nativeSourceFingerprint,nativeCutlineFingerprint,generateNativeOrderMarkers} from './native-production-order-marker-20261029.mjs'
import {generateNativeVerifiedOrderMarkersRun36} from './native-verified-order-handoff-run36-20261029.mjs'
import {createNativeVerifiedProductionOrderRun37,inspectNativeVerifiedProductionSourceRun37}
  from './native-verified-production-order-run37.mjs'

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-fivepiece-verified-r36-'))
const workspace=createWorkspace(folder)
const sizes=['XS','S','M','L','XL','XXL'],offsets=[-.015,-.007,0,.005,.010,.014]
let latest,stage='open'
const clone=structuredClone
const send=async req=>{
  const reply=await workspace.request({revision:latest?.revision,...req})
  assert.equal(reply.ok,true,`${stage} ${req.op}: ${reply.error}`)
  if(reply.data?.template)latest=reply.data
  return reply.data
}
const panel=(t,id)=>{const match=t.panels.filter(p=>p.id===id);assert.equal(match.length,1);return match[0]}
const orderFor=async()=>{
  const project=(await send({op:'save'})).project
  const cuts=await send({op:'grade-run-cutlines'})
  const ids=project.template.panels.map(p=>p.id)
  return {project,cuts,order:{sourceFingerprint:nativeSourceFingerprint(project),
    nativeCutlineFingerprint:nativeCutlineFingerprint(cuts),sizes:[...sizes],panelIds:ids,
    quantitiesBySize:Object.fromEntries(sizes.map((size,i)=>[size,Object.fromEntries(ids.map((id,j)=>[id,1+(i+j)%2]))])),
    materialsByPanel:Object.fromEntries(project.template.panels.map(p=>[p.id,{fabricId:p.fabric,groupId:p.fabric,grainAngleDeg:p.grain_degrees,nap:'one-way'}])),
    nativeSourceMaterialByPanel:Object.fromEntries(project.template.panels.map(p=>[p.id,{sourceFabricId:p.fabric,sourceGrainDegrees:p.grain_degrees}])),
    cuttingAuthorized:false}}
}
try{
  await send({op:'open',preset:'tshirt'})
  stage='four source panels'
  for(const seam of [...latest.template.seams])await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const originals=new Set(latest.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++)await send({op:'edit',command:{kind:'Polygon',fabric:latest.template.fabrics[0].id,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=latest.template.panels.filter(p=>!originals.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2)
  stage='native allowances and graded source'
  const source=(await send({op:'save'})).project
  for(const p of source.template.panels)p.polygon.seam_allowances=Object.fromEntries(p.polygon.edges.map(e=>[e,.01]))
  source.state=null;source.mesh_signature=null
  await send({op:'open',project:source})
  const rules=[]
  ids.forEach((panelId,i)=>{
    rules.push({id:`width_upper_${i}`,panelId,pointIndex:1,mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]})
    rules.push({id:`width_lower_${i}`,panelId,pointIndex:2,mode:'polar',a:3,b:3,angleDeg:0,distanceFormula:'width',dependsOn:[]})
  })
  await send({op:'bindings-store',nativeBindings:{measurements:{width:{valueMm:400}},bindings:rules}})
  const base=clone(latest.template)
  await send({op:'grade-run-commit',gradeRun:{schemaVersion:1,sizes,baseSize:'M',baseTemplate:clone(base),
    gradedTemplates:sizes.map((size,i)=>{const t=clone(base);for(const id of ids)for(const index of [1,2])panel(t,id).polygon.points[index][0]+=offsets[i];return t}),pomSpecs:[]}})
  stage='install facing'
  await send({op:'facing-dependency-install',parentPanelId:ids[0],parentEdgeId:panel(latest.template,ids[0]).polygon.edges[0],
    facingId:'run36_facing',depthMm:40,allowanceMm:10})
  const installed=(await send({op:'save'})).project
  assert.equal(installed.template.panels.length,5)
  assert.equal(installed.grade_run.gradedTemplates.length,6)
  stage='verified handoff before regeneration'
  const first=await orderFor()
  const initial=await generateNativeVerifiedOrderMarkersRun36(workspace,first.order)
  assert.equal(initial.results.length,6)
  stage='native qualified regeneration'
  const preview=await send({op:'bindings-grade-regenerate-preview',overrides:{width:380}})
  assert(preview)
  await send({op:'bindings-grade-regenerate',overrides:{width:380}})
  const after=(await send({op:'save'})).project
  assert.equal(after.template.panels.length,5)
  assert.equal(after.grade_run.gradedTemplates.length,6)
  const handoff=await orderFor()
  stage='five-piece native verified CUT markers'
  const verified=await generateNativeVerifiedOrderMarkersRun36(workspace,handoff.order)
  const expected=sizes.reduce((sum,size)=>sum+handoff.order.panelIds.reduce((count,id)=>count+handoff.order.quantitiesBySize[size][id],0),0)
  const actual=verified.results.reduce((sum,row)=>sum+row.markers.reduce((count,m)=>count+m.marker.placements.length,0),0)
  assert.equal(actual,expected)
  assert.equal(verified.results.length,6)
  assert.equal(verified.sourceMaterialsChecked,true)
  assert.equal(verified.readFromNativeWorkspace,true)
  // RUN47: Caller order declarations can be changed while Rust awaits its
  // CUT. The source/quantity/material receipt must represent the immutable
  // submission as it existed BEFORE the first native read, not a later object
  // mutation caused by a second panel, client or malicious bridge wrapper.
  stage='native handoff immutable input across awaited CUT'
  const mutable=clone(handoff.order)
  let mutated=false
  const racingSource={
    request:async packet=>{
      const response=await workspace.request(packet)
      if(!mutated&&packet.op==='grade-run-cutlines'){
        mutated=true
        const id=mutable.panelIds[0],size=mutable.sizes[0]
        mutable.quantitiesBySize[size][id]=99
        mutable.materialsByPanel[id].groupId='changed-after-native-cut'
      }
      return response
    },
  }
  const stable=await generateNativeVerifiedOrderMarkersRun36(racingSource,mutable)
  assert.equal(mutated,true)
  assert.deepEqual(stable.results,verified.results,
    'RUN47: mutable browser order altered marker quantities after initial validation')
  const originalQty=clone(handoff.order.quantitiesBySize)
  const originalMaterial=Object.fromEntries(handoff.order.panelIds.map(id=>[
    id,{fabricId:handoff.order.materialsByPanel[id].fabricId,
      groupId:handoff.order.materialsByPanel[id].groupId},
  ]))
  const mutableRequest={expectedRevision:latest.revision,
    quantitiesBySize:clone(originalQty),materialsByPanel:clone(originalMaterial)}
  let requestChanged=false
  const racingRequest={
    request:async packet=>{
      const response=await workspace.request(packet)
      if(!requestChanged&&packet.op==='grade-run-cutlines'){
        requestChanged=true
        mutableRequest.quantitiesBySize[sizes[0]][handoff.order.panelIds[0]]=99
        mutableRequest.materialsByPanel[handoff.order.panelIds[0]].groupId='late-mutated-group'
      }
      return response
    },
  }
  const submitted=await createNativeVerifiedProductionOrderRun37(racingRequest,mutableRequest)
  assert.equal(requestChanged,true)
  assert.deepEqual(submitted.orderQuantities,originalQty,
    'RUN47: final receipt did not bind submitted quantities')
  assert.deepEqual(submitted.cuttingMaterialDeclarations,originalMaterial,
    'RUN47: final receipt did not bind submitted fabric groups')
  assert.deepEqual(submitted.results,verified.results,
    'RUN47: final receipt CUT/marker placements do not match source-bound order')
  assert.equal(submitted.cuttingAuthorized,false)
  assert.equal(submitted.factoryApproved,false)
  // Same-session revision and base template cannot hide an exchanged graded
  // catalog when the final Rust project is re-read for the source preview.
  let savedViews=0
  const forgedCatalogSource={request:async packet=>{
    const response=await workspace.request(packet)
    if(packet.op==='save'&&++savedViews===2&&response.ok){
      const bad=structuredClone(response)
      bad.data.project.grade_run.gradedTemplates[0].panels[0].name='RUN47-FORGED-CATALOG'
      return bad
    }
    return response
  }}
  await assert.rejects(()=>inspectNativeVerifiedProductionSourceRun37(forgedCatalogSource),
    /NATIVE_PROJECT_CHANGED_DURING_INSPECTION/,
    'Native source UI accepted an inconsistent grade catalog after CUT read')
  assert.equal(savedViews,2)
  const forged=clone(handoff.cuts)
  forged.sizes[0].panels[0].cut.points[0][0]+=.001
  const forgedOrder={...handoff.order,nativeCutlineFingerprint:nativeCutlineFingerprint(forged)}
  assert.throws(()=>generateNativeOrderMarkers(handoff.project,forged,forgedOrder),/VERIFIED_NATIVE_WORKSPACE_HANDOFF_REQUIRED/)
  for(const row of verified.results)for(const group of row.markers)for(const placement of group.marker.placements){
    const grain=handoff.order.materialsByPanel[placement.pieceId].grainAngleDeg
    assert.equal(placement.rotationDeg,(((-grain)%360)+360)%360)
  }
  const override=clone(handoff.order);override.materialsByPanel[handoff.order.panelIds[0]].fabricId='forged-cutting-fabric'
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,override),/UNVALIDATED_PRODUCTION_MATERIAL_OR_GRAIN_OVERRIDE/)
  override.materialsByPanel[handoff.order.panelIds[0]]={...handoff.order.materialsByPanel[handoff.order.panelIds[0]],grainAngleDeg:0}
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,override),/UNVALIDATED_PRODUCTION_MATERIAL_OR_GRAIN_OVERRIDE/)
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,forgedOrder),/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const material=clone(handoff.order)
  material.nativeSourceMaterialByPanel[handoff.order.panelIds[0]].sourceFabricId='forged-material'
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,material),/NATIVE_SOURCE_MATERIAL_GRAIN_MISMATCH/)
  stage='six 3D native grades with restoration'
  const fit=[]
  for(const size of sizes){
    const activated=await send({op:'grade-run-activate',size})
    assert.equal(activated.activeGradedSize,size)
    assert.equal(activated.gradedFitEvidence?.nativeMeshCompiled,true)
    assert.equal(activated.template.panels.length,5)
    const restored=await send({op:'grade-run-restore'})
    assert.equal(restored.activeGradedSize??null,null)
    fit.push(size)
  }
  assert.deepEqual((await generateNativeVerifiedOrderMarkersRun36(workspace,handoff.order)).results,verified.results)
  stage='undo redo reopen'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,installed)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after)
  await send({op:'open',project:after})
  assert.deepEqual((await generateNativeVerifiedOrderMarkersRun36(workspace,handoff.order)).results,verified.results)
  console.log(JSON.stringify({passed:true,nativeRust:true,sourcePanels:4,derivedFacing:1,sizes:6,fitActivatedAndRestored:fit,
    placed:actual,forgedCutRejected:true,forgedSourceMaterialRejected:true,undoRedoReopen:true,
    orderMutableDuringCutSnapshotPreserved:true,receiptQuantitiesAndGroupsBound:true,
    inspectedGradeCatalogDriftRejected:true,
    independentlyAuthenticated:false,factoryApproved:false,cuttingAuthorized:false}))
}catch(error){console.error(JSON.stringify({passed:false,stage,error:error.stack??String(error)}));process.exitCode=1}
finally{workspace.close();fs.rmSync(folder,{recursive:true,force:true})}
