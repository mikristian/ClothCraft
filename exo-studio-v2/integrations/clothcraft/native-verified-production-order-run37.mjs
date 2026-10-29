import {nativeSourceFingerprint,nativeCutlineFingerprint} from './native-production-order-marker-20261029.mjs'
import {generateNativeVerifiedOrderMarkersRun36,
  snapshotNativeVerifiedOrderRun47} from './native-verified-order-handoff-run36-20261029.mjs'

const fail=code=>{throw Error(code)}
const record=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
  [Object.prototype,null].includes(Object.getPrototypeOf(v))&&
  Object.keys(v).length===keys.length&&keys.every(key=>Object.hasOwn(v,key))
const safeText=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=96&&
  !/[\u0000-\u001f\u007f<>]/.test(s)
const rpc=async(workspace,packet)=>{
  const result=await workspace.request(packet)
  if(result?.ok!==true||!result.data)fail('NATIVE_WORKSPACE_REQUEST_FAILED')
  return result.data
}

// The browser receives physical source identity but never CUT points or
// authority to manufacture. The server independently retrieves the CUT from
// the same native Rust workspace on final verification.
export async function inspectNativeVerifiedProductionSourceRun37(workspace){
  if(typeof workspace?.request!=='function')fail('NATIVE_WORKSPACE_REQUIRED')
  const before=await rpc(workspace,{op:'snapshot'})
  if(!Number.isSafeInteger(before.revision)||before.revision<0||
    before.gradeRunPersisted!==true||before.running===true||before.activeGradedSize)
    fail('RESTORE_SAVED_NATIVE_GRADE_CATALOG_FIRST')
  const revision=before.revision
  const project=(await rpc(workspace,{op:'save',revision})).project
  const sizes=project?.grade_run?.sizes,panels=project?.template?.panels
  if(!Array.isArray(sizes)||!sizes.length||sizes.length>50||
    !Array.isArray(panels)||!panels.length||panels.length>100||
    new Set(sizes).size!==sizes.length||new Set(panels.map(p=>p.id)).size!==panels.length||
    sizes.some(size=>!safeText(size))||
    panels.some(p=>!safeText(p.id)||!safeText(p.fabric)||!Number.isFinite(p.grain_degrees)))
    fail('INVALID_NATIVE_GRADE_SOURCE')
  const cuts=await rpc(workspace,{op:'grade-run-cutlines',revision})
  const after=await rpc(workspace,{op:'snapshot',revision})
  if(after.revision!==revision||after.gradeRunPersisted!==true||after.running===true||
    after.activeGradedSize||JSON.stringify(after.template)!==JSON.stringify(before.template))
    fail('NATIVE_PROJECT_CHANGED_DURING_INSPECTION')
  // A native open can reuse a session revision with the same base pattern
  // while restoring a different six-size grade catalog or linked dependency.
  // The initial save, observed CUT and final inspection must describe the
  // SAME fully linked Rust project, not merely the same template/revision.
  const confirmed=(await rpc(workspace,{op:'save',revision})).project
  const linkedKeys=['native_point_bindings','native_facing_dependency',
    'fabric_grade_envelope','piece_variant']
  if(nativeSourceFingerprint(confirmed)!==nativeSourceFingerprint(project)||
     linkedKeys.some(key=>JSON.stringify(confirmed?.[key]??null)!==
       JSON.stringify(project?.[key]??null)))
    fail('NATIVE_PROJECT_CHANGED_DURING_INSPECTION')
  return {revision,sizes:[...sizes],
    panels:panels.map(p=>({id:p.id,name:p.name||p.id,
      sourceFabricId:p.fabric,sourceGrainDegrees:p.grain_degrees})),
    sourceFingerprint:nativeSourceFingerprint(project),
    nativeCutlineFingerprint:nativeCutlineFingerprint(cuts),
    factoryApproved:false,cuttingAuthorized:false,
    note:'Verified local native project metadata; operator-assigned cutting fabrics and quantities are not independently factory certified.'}
}

// Strongly typed operator declaration. Never takes order CUT points or hashes
// from the browser; they are sourced internally from the trusted Rust bridge.
export async function createNativeVerifiedProductionOrderRun37(workspace,input){
  input=snapshotNativeVerifiedOrderRun47(input)
  if(!input||Object.keys(input).sort().join(',')!=='expectedRevision,materialsByPanel,quantitiesBySize')
    fail('INVALID_NATIVE_PRODUCTION_ORDER_FIELDS')
  const observed=await inspectNativeVerifiedProductionSourceRun37(workspace)
  if(!Number.isSafeInteger(input.expectedRevision)||observed.revision!==input.expectedRevision)
    fail('STALE_NATIVE_PRODUCTION_REVISION')
  const ids=observed.panels.map(p=>p.id),sizes=observed.sizes
  if(!record(input.quantitiesBySize,sizes)||!record(input.materialsByPanel,ids))
    fail('PRODUCTION_ORDER_SIZE_PANEL_MISMATCH')
  for(const size of sizes){
    const qty=input.quantitiesBySize[size]
    if(!record(qty,ids)||ids.some(id=>!Number.isSafeInteger(qty[id])||qty[id]<1||qty[id]>99))
      fail('INVALID_PHYSICAL_CUT_QUANTITY')
  }
  const materials=Object.create(null)
  const groupsByFabric=new Map()
  for(const panel of observed.panels){
    const item=input.materialsByPanel[panel.id]
    if(!record(item,['fabricId','groupId'])||!safeText(item.fabricId)||!safeText(item.groupId))
      fail('INVALID_CUTTING_MATERIAL_DECLARATION')
    if(item.fabricId!==panel.sourceFabricId)fail('UNVALIDATED_PRODUCTION_MATERIAL_OVERRIDE')
    // The currently verified native marker and artifact routes partition by
    // source fabric. Two declared marker groups for that fabric would be
    // silently nested together and exported under one fabric-only filename.
    // Refuse such an order until both marker and artifact routes carry group
    // identity end-to-end.
    const existing=groupsByFabric.get(item.fabricId)
    if(existing!==undefined&&existing!==item.groupId)
      fail('DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT')
    groupsByFabric.set(item.fabricId,item.groupId)
    materials[panel.id]={fabricId:panel.sourceFabricId,groupId:item.groupId,
      grainAngleDeg:panel.sourceGrainDegrees,nap:'one-way'}
  }
  const order={
    sourceFingerprint:observed.sourceFingerprint,
    nativeCutlineFingerprint:observed.nativeCutlineFingerprint,
    sizes:[...sizes],panelIds:[...ids],
    nativeSourceMaterialByPanel:Object.fromEntries(observed.panels.map(p=>[
      p.id,{sourceFabricId:p.sourceFabricId,sourceGrainDegrees:p.sourceGrainDegrees}])),
    quantitiesBySize:input.quantitiesBySize,materialsByPanel:materials,
    cuttingAuthorized:false,
  }
  const verified=await generateNativeVerifiedOrderMarkersRun36(workspace,order)
  if(verified.sourceRevision!==observed.revision)fail('STALE_NATIVE_PRODUCTION_REVISION')
  return {...verified,
    workflow:'exo-native-verified-graded-production-order.v1',
    sourceRevision:observed.revision,
    orderQuantities:structuredClone(input.quantitiesBySize),
    cuttingMaterialDeclarations:structuredClone(input.materialsByPanel),
    operatorApproved:false,factoryApproved:false,cuttingAuthorized:false}
}
