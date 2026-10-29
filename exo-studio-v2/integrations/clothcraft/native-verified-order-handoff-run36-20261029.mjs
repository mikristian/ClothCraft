import {nestPolygons} from '../../src/core/accumarkPolygonNesting20261024.js'
import {nativeCutlineFingerprint,nativeSourceFingerprint} from './native-production-order-marker-20261029.mjs'

const own=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
  [Object.prototype,null].includes(Object.getPrototypeOf(obj))&&
  Object.keys(obj).length===keys.length&&keys.every(key=>Object.hasOwn(obj,key))
const fail=code=>{throw Error(code)}

// A caller-owned order may be edited while native source/CUT RPCs are
// awaiting Rust. Capture one inert JSON value BEFORE the first await, so
// material inspection, marker generation and the final receipt describe the
// exact same quantities and fabric declarations. Do not invoke getter-backed
// fields, accept forged prototypes or construct unbounded recursive inputs.
export function snapshotNativeVerifiedOrderRun47(input) {
  const active=new Set(),budget={visited:0}
  const copy=(value,depth)=>{
    if(++budget.visited>200000||depth>32)fail('UNBOUNDED_NATIVE_ORDER_DECLARATION')
    if(value===null||typeof value==='string'||typeof value==='boolean')return value
    if(typeof value==='number'&&Number.isFinite(value))return value
    if(!Array.isArray(value)&&
       !(value&&typeof value==='object'&&
         [Object.prototype,null].includes(Object.getPrototypeOf(value))))
      fail('NON_JSON_NATIVE_ORDER_DECLARATION')
    if(active.has(value))fail('CYCLIC_NATIVE_ORDER_DECLARATION')
    if(Array.isArray(value)&&value.length>50000)fail('UNBOUNDED_NATIVE_ORDER_DECLARATION')
    const fields=Object.getOwnPropertyDescriptors(value)
    if(Reflect.ownKeys(value).some(key=>typeof key==='symbol')||
       Object.keys(fields).length!==Object.keys(value).length+(Array.isArray(value)?1:0))
      fail('NON_JSON_NATIVE_ORDER_DECLARATION')
    if(Array.isArray(value) && (Object.keys(value).length!==value.length||
       !Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean)))
      fail('NON_JSON_NATIVE_ORDER_DECLARATION')
    active.add(value)
    const result=Array.isArray(value)?[]:{}
    for(const key of Object.keys(value)){
      const descriptor=fields[key]
      if(!descriptor||!Object.hasOwn(descriptor,'value'))
        fail('ACCESSOR_NATIVE_ORDER_DECLARATION')
      Object.defineProperty(result,key,{value:copy(descriptor.value,depth+1),
        enumerable:true,configurable:true,writable:true})
    }
    active.delete(value)
    return result
  }
  return copy(input,0)
}

/**
 * Source-resolving version of the native CUT → order → marker handoff.
 *
 * Unlike caller-provided CUT payloads, this route fetches the current
 * SAVED project and its physical CUT response from the same native Rust
 * workspace and verifies the unchanged revision around both reads.
 *
 * The order must explicitly bind each authored native panel's source fabric
 * and grain to its separately declared cutting-room material. A different
 * cutting material may be chosen (lining/fusing/etc), but never under an
 * unexplained/forged native source association.
 *
 * A trusted local workspace implementation is a prerequisite. This is NOT
 * cryptographic attestation of Rust, an independent factory-CAD receipt,
 * authenticated roll provenance, or permission to release a cutter.
 */
export async function generateNativeVerifiedOrderMarkersRun36(workspace,order) {
  if(!workspace||typeof workspace.request!=='function')fail('NATIVE_WORKSPACE_REQUIRED')
  order=snapshotNativeVerifiedOrderRun47(order)
  const rpc=async packet=>{
    const reply=await workspace.request(packet)
    if(reply?.ok!==true||!reply.data)fail('NATIVE_WORKSPACE_REQUEST_FAILED')
    return reply.data
  }
  const before=await rpc({op:'snapshot'})
  if(!Number.isSafeInteger(before.revision)||before.revision<0||
    before.gradeRunPersisted!==true||before.activeGradedSize||before.running===true)
    fail('NATIVE_BASE_GRADE_SOURCE_REQUIRED')
  const revision=before.revision
  const project=(await rpc({op:'save',revision})).project
  if(!project?.template||!project.grade_run||
    nativeSourceFingerprint(project)!==order?.sourceFingerprint)
    fail('STALE_OR_MISSING_ORDER_SOURCE')
  const panels=project.template.panels
  const ids=panels.map(p=>p.id)
  if(new Set(ids).size!==ids.length||!own(order.nativeSourceMaterialByPanel,ids))
    fail('NATIVE_MATERIAL_SOURCE_BINDINGS_REQUIRED')
  // This direct RUN36 entrypoint must be as fail-closed as the RUN37 HTTP
  // wrapper: the compiler partitions markers by FABRIC, not by groupId. A
  // caller taking RUN36 directly must not silently merge distinct operator
  // marker groups into one marker or fabric-only artifact name.
  const groupsByFabric=new Map()
  for(const panel of panels){
    const observed=order.nativeSourceMaterialByPanel[panel.id]
    if(!own(observed,['sourceFabricId','sourceGrainDegrees'])||
      typeof panel.fabric!=='string'||!panel.fabric.trim()||
      observed.sourceFabricId!==panel.fabric||
      !Number.isFinite(panel.grain_degrees)||
      observed.sourceGrainDegrees!==panel.grain_degrees)
      fail('NATIVE_SOURCE_MATERIAL_GRAIN_MISMATCH')
    const material=order.materialsByPanel?.[panel.id]
    if(material?.fabricId!==panel.fabric||material?.grainAngleDeg!==panel.grain_degrees)
      fail('UNVALIDATED_PRODUCTION_MATERIAL_OR_GRAIN_OVERRIDE')
    if(typeof material.groupId!=='string'||!material.groupId.trim())
      fail('INVALID_MATERIAL_GROUP_GRAIN')
    const group=groupsByFabric.get(material.fabricId)
    if(group!==undefined&&group!==material.groupId)
      fail('DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT')
    groupsByFabric.set(material.fabricId,material.groupId)
  }
  const cut=await rpc({op:'grade-run-cutlines',revision})
  if(order.nativeCutlineFingerprint!==nativeCutlineFingerprint(cut))
    fail('STALE_OR_FORGED_CUTLINE_PAYLOAD')
  const after=await rpc({op:'snapshot',revision})
  if(after.revision!==revision||after.activeGradedSize||
    after.gradeRunPersisted!==true||after.running===true||
    JSON.stringify(after.template)!==JSON.stringify(before.template))
    fail('NATIVE_PROJECT_CHANGED_DURING_HANDOFF')
  // A native open can reset a session revision; checking only the revision
  // and base template would miss a changed catalog or derived relationship.
  // Re-read the saved Rust project after the CUT inspection, including the
  // dependency graph identity ignored by the marker-only source SHA.
  const afterProject=(await rpc({op:'save',revision})).project
  const linkedKeys=['native_point_bindings','native_facing_dependency',
    'fabric_grade_envelope','piece_variant']
  if(nativeSourceFingerprint(afterProject)!==nativeSourceFingerprint(project)||
    linkedKeys.some(key=>JSON.stringify(afterProject?.[key]??null)!==
      JSON.stringify(project?.[key]??null)))
    fail('NATIVE_PROJECT_CHANGED_DURING_HANDOFF')
  const markers=compileVerifiedNativeOrderMarkers(project,cut,order)
  return {...markers,sourceRevision:revision,
    nativeCutlineFingerprint:order.nativeCutlineFingerprint,
    sourceMaterialsChecked:true,
    readFromNativeWorkspace:true,
    independentlyAuthenticated:false,
    receivingCadApproved:false,
    physicalFitCertified:false,
    factoryApproved:false,
    cuttingAuthorized:false}
}

// Internal compiler: never exported; only reached after trusted native reads.
function compileVerifiedNativeOrderMarkers(project,cuts,order) {
  const fail=message=>{throw Error(message)}
  if(!project?.template?.panels?.length||!project.grade_run)fail('MISSING_NATIVE_GRADE_RUN')
  const fingerprint=nativeSourceFingerprint(project)
  if(order?.sourceFingerprint!==fingerprint)fail('STALE_OR_MISSING_ORDER_SOURCE')
  if(cuts?.format!=='exo-native-graded-cutlines.v1'||cuts.cuttingAuthorized!==false)fail('INVALID_NATIVE_CUTLINES_OR_RELEASE')
  if(typeof order.nativeCutlineFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(order.nativeCutlineFingerprint)||
    order.nativeCutlineFingerprint!==nativeCutlineFingerprint(cuts))fail('STALE_OR_FORGED_CUTLINE_PAYLOAD')
  if(order.cuttingAuthorized!==false||order.releaseApproved===true||order.factoryCertified===true)fail('FAKE_PRODUCTION_RELEASE')
  const sizes=project.grade_run.sizes
  const ids=project.template.panels.map(p=>p.id)
  if(!Array.isArray(sizes)||sizes.length<1||sizes.length>50||
     ids.length<1||ids.length>100)
    fail('NATIVE_ORDER_SIZE_OR_PANEL_LIMIT')
  if(new Set(ids).size!==ids.length||new Set(sizes).size!==sizes.length)fail('DUPLICATE_NATIVE_ID')
  const exact=(actual,expected,reason)=>{
    if(!Array.isArray(actual)||actual.length!==expected.length||actual.some((x,i)=>x!==expected[i]))fail(reason)
  }
  exact(order.sizes,sizes,'ORDER_SIZE_MISMATCH')
  exact(order.panelIds,ids,'ORDER_PANEL_MISMATCH')
  exact(cuts.sizes?.map(x=>x.size),sizes,'CUTLINE_SIZE_MISMATCH')
  const keysEqual=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
    Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k))
  if(!keysEqual(order.quantitiesBySize,sizes)||!keysEqual(order.materialsByPanel,ids))fail('ORDER_MANIFEST_MISMATCH')
  const groupBySourceFabric=new Map()
  for(const id of ids){
    const material=order.materialsByPanel[id]
    if(!material||typeof material.fabricId!=='string'||!material.fabricId.trim()||
      !Number.isFinite(material.grainAngleDeg)||
      material.nap!=='one-way'||typeof material.groupId!=='string'||!material.groupId.trim())
      fail('INVALID_MATERIAL_GROUP_GRAIN')
    // This compiler nests by source FABRIC and emits one marker per fabric.
    // A direct caller must not bypass the RUN37-facing group restriction and
    // silently merge two different operator-declared marker groups.
    const priorGroup=groupBySourceFabric.get(material.fabricId)
    if(priorGroup!==undefined&&priorGroup!==material.groupId)
      fail('DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT')
    groupBySourceFabric.set(material.fabricId,material.groupId)
  }
  const results=[]
  for(const row of cuts.sizes){
    if(!keysEqual(order.quantitiesBySize[row.size],ids))fail('ORDER_QUANTITY_PANEL_MISMATCH')
    const panels=row.panels
    if(!Array.isArray(panels)||panels.length!==ids.length||new Set(panels.map(p=>p.panel_id)).size!==ids.length||
      panels.some(p=>!ids.includes(p.panel_id)))fail('CUTLINE_PANEL_IDENTITY_MISMATCH')
    const pieces=panels.map(panel=>{
      const qty=order.quantitiesBySize[row.size][panel.panel_id]
      if(!Number.isSafeInteger(qty)||qty<1||qty>99)fail('INVALID_ORDER_QUANTITY')
      const points=panel.cut?.points
      if(!Array.isArray(points)||points.length<3||points.length>8192||
         points.some(p=>!Array.isArray(p)||p.length!==2||
           p.some(v=>!Number.isFinite(v))))
        fail('INVALID_CUT_GEOMETRY')
      const material=order.materialsByPanel[panel.panel_id]
      return {id:panel.panel_id,name:panel.panel_id,fabricId:material.fabricId,groupId:material.groupId,
        cutQuantity:qty,grainAngleDeg:material.grainAngleDeg,marker:{nap:material.nap},
        points:points.map(([x,y])=>({x:x*100,y:y*100}))}
    })
    const groups=[...new Set(pieces.map(p=>p.fabricId))].sort()
    const markers=groups.map(fabricId=>{
      const selected=pieces.filter(p=>p.fabricId===fabricId)
      const marker=nestPolygons({pieces:selected},{fabricId,fabricWidth:150,gap:1,maxLength:1800,maxCandidates:20000})
      if(!marker.ok||marker.unplaced.length)fail('NESTING_INCOMPLETE')
      const expected=selected.flatMap(p=>Array.from({length:p.cutQuantity},(_,instance)=>JSON.stringify([p.id,instance]))).sort()
      const actual=marker.placements.map(p=>JSON.stringify([p.pieceId,p.instance])).sort()
      exact(actual,expected,'MARKER_QUANTITY_IDENTITY_MISMATCH')
      if(marker.manufacturingApproved===true)fail('FAKE_MARKER_APPROVAL')
      return {fabricId,marker}
    })
    results.push({size:row.size,sourceFingerprint:fingerprint,markers,cuttingAuthorized:false})
  }
  return {sourceFingerprint:fingerprint,results,cuttingAuthorized:false}
}
