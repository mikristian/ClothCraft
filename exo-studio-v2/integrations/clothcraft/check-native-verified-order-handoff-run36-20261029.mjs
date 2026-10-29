// Strict native workspace → saved size catalog → observed CUT → quantity-
// controlled marker acceptance. All real Rust writes live in a disposable dir.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {
  generateNativeOrderMarkers,nativeCutlineFingerprint,nativeSourceFingerprint,
} from './native-production-order-marker-20261029.mjs'
import {generateNativeVerifiedOrderMarkersRun36} from './native-verified-order-handoff-run36-20261029.mjs'

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-verified-native-handoff-r36-'))
const workspace=createWorkspace(folder)
const sizes=['XS','S','M','L','XL','XXL']
let latest
const send=async packet=>{
  const response=await workspace.request({revision:latest?.revision,...packet})
  assert.equal(response.ok,true,`${packet.op}: ${response.error}`)
  if(response.data?.template)latest=response.data
  return response.data
}
const reject=async (order,pattern,source=workspace)=>{
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(source,order),pattern)
}
try{
  await send({op:'open',preset:'tshirt'})
  for(const panel of latest.template.panels)for(const edge of panel.polygon.edges)
    await send({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
  const snapshot=structuredClone(latest)
  const rule=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(rule.ok,true,rule.reason)
  const projectBefore=(await send({op:'save'})).project
  const prepared=prepareNativeGradeCatalog20261025(snapshot,projectBefore,rule.ruleSet)
  assert.equal(prepared.ok,true,prepared.reason)
  await send({op:'grade-run-commit',gradeRun:prepared.gradeRun})
  const project=(await send({op:'save'})).project
  const cuts=await send({op:'grade-run-cutlines'})
  const ids=project.template.panels.map(panel=>panel.id)
  assert.deepEqual(project.grade_run.sizes,sizes)
  const order={
    sourceFingerprint:nativeSourceFingerprint(project),
    nativeCutlineFingerprint:nativeCutlineFingerprint(cuts),
    sizes:[...sizes],panelIds:[...ids],
    quantitiesBySize:Object.fromEntries(sizes.map((size,i)=>[size,Object.fromEntries(
      ids.map((id,j)=>[id,1+(i+j)%2]))])),
    // RUN47: The source-bound native verifier must not receive a fabricated
    // cutting fabric merely because an obsolete test used a visual lining/
    // shell split. Production material identity is the Rust source fabric.
    materialsByPanel:Object.fromEntries(project.template.panels.map(panel=>[
      panel.id,{fabricId:panel.fabric,groupId:panel.fabric,
        grainAngleDeg:panel.grain_degrees,nap:'one-way'}])),
    nativeSourceMaterialByPanel:Object.fromEntries(project.template.panels.map(panel=>
      [panel.id,{sourceFabricId:panel.fabric,sourceGrainDegrees:panel.grain_degrees}])),
    cuttingAuthorized:false,
  }
  const verified=await generateNativeVerifiedOrderMarkersRun36(workspace,order)
  assert.equal(verified.readFromNativeWorkspace,true)
  assert.equal(verified.sourceMaterialsChecked,true)
  assert.equal(verified.results.length,6)
  assert.equal(verified.sourceRevision,latest.revision)
  assert.equal(verified.cuttingAuthorized,false)
  assert.equal(verified.factoryApproved,false)
  const sameFabricPanels=project.template.panels.filter(p=>
    p.fabric===project.template.panels[0].fabric)
  if(sameFabricPanels.length>=2){
    const split=structuredClone(order)
    split.materialsByPanel[sameFabricPanels[1].id].groupId='ANOTHER-PHYSICAL-MARKER-GROUP'
    await reject(split,/DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT/)
  }
  const placed=verified.results.reduce((n,row)=>n+row.markers.reduce(
    (m,fabric)=>m+fabric.marker.placements.length,0),0)
  const expected=sizes.reduce((n,size)=>n+ids.reduce(
    (m,id)=>m+order.quantitiesBySize[size][id],0),0)
  assert.equal(placed,expected)

  // The obsolete caller-supplied CUT entrypoint is intentionally disabled.
  // A forged client cannot rehash an altered CUT and invoke native nesting.
  const altered=structuredClone(cuts)
  altered.sizes[0].panels[0].cut.points[0][0]+=.0001
  const forgedOrder=structuredClone(order)
  forgedOrder.nativeCutlineFingerprint=nativeCutlineFingerprint(altered)
  assert.throws(()=>generateNativeOrderMarkers(project,altered,forgedOrder),
    /VERIFIED_NATIVE_WORKSPACE_HANDOFF_REQUIRED/)
  await reject(forgedOrder,/STALE_OR_FORGED_CUTLINE_PAYLOAD/)

  const alias=structuredClone(order)
  alias.nativeSourceMaterialByPanel[ids[0]].sourceFabricId='forged-fabric'
  await reject(alias,/NATIVE_SOURCE_MATERIAL_GRAIN_MISMATCH/)
  const wrongGrain=structuredClone(order)
  wrongGrain.nativeSourceMaterialByPanel[ids[0]].sourceGrainDegrees+=90
  await reject(wrongGrain,/NATIVE_SOURCE_MATERIAL_GRAIN_MISMATCH/)
  const missing=structuredClone(order)
  delete missing.nativeSourceMaterialByPanel[ids[0]]
  await reject(missing,/NATIVE_MATERIAL_SOURCE_BINDINGS_REQUIRED/)
  const noGraph=structuredClone(order)
  delete noGraph.nativeSourceMaterialByPanel
  await reject(noGraph,/NATIVE_MATERIAL_SOURCE_BINDINGS_REQUIRED/)
  const fakeRelease=structuredClone(order)
  fakeRelease.cuttingAuthorized=true
  await reject(fakeRelease,/FAKE_PRODUCTION_RELEASE/)

  const oversizedCut=structuredClone(cuts)
  oversizedCut.sizes[0].panels[0].cut.points=Array.from({length:8193},(_,i)=>[i*.000001,0])
  const oversizedOrder=structuredClone(order)
  oversizedOrder.nativeCutlineFingerprint=nativeCutlineFingerprint(oversizedCut)
  const oversizedWorkspace={request:async packet=>{
    if(packet.op==='grade-run-cutlines')
      return {ok:true,data:oversizedCut}
    return workspace.request(packet)
  }}
  await reject(oversizedOrder,/INVALID_CUT_GEOMETRY/,oversizedWorkspace)

  // A second native command between CUT read and final snapshot must
  // invalidate the handoff, even though that command was not in the order.
  let raced=false
  const racing={
    request:async packet=>{
      const reply=await workspace.request(packet)
      if(packet.op==='grade-run-cutlines'&&!raced){
        raced=true
        const cleared=await workspace.request({op:'grade-run-clear',revision:latest.revision})
        assert.equal(cleared.ok,true,cleared.error)
      }
      return reply
    },
  }
  await reject(order,/NATIVE_PROJECT_CHANGED_DURING_HANDOFF/,racing)
  assert.equal(raced,true)
  await send({op:'snapshot'})
  assert.equal(latest.gradeRunPersisted,false)
  await reject(order,/NATIVE_BASE_GRADE_SOURCE_REQUIRED/)
  await send({op:'open',project})
  const reopenedCuts=await send({op:'grade-run-cutlines'})
  assert.equal(nativeCutlineFingerprint(reopenedCuts),order.nativeCutlineFingerprint)
  const reopened=await generateNativeVerifiedOrderMarkersRun36(workspace,order)
  assert.deepEqual(reopened.results,verified.results)
  console.log(JSON.stringify({passed:true,nativeRust:true,savedGradeSizes:sizes.length,
    sourcePanels:ids.length,sourceRevision:verified.sourceRevision,
    placedPhysicalCutpieces:placed,negativeCases:8,forgedRehashedCutRejected:true,
    sourceFabricBound:true,sourceGrainBound:true,concurrentMutationRejected:true,
    saveReopen:true,cuttingAuthorized:false,factoryApproved:false,
    licensedReceivingCadApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(folder,{recursive:true,force:true})
}
