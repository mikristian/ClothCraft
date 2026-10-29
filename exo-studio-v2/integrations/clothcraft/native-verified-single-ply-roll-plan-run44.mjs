// Rust-authoritative graded CUT → per-size/fabric marker → single-ply digital
// roll assignment. Separate from JS garment-order model: native quantities are
// physical PANEL CUTS per verified marker, not garment units per ply.
// Absolutely NO physical CUT, spreader, factory or issuer authority.
import {createHash} from 'node:crypto'
import {
  createNativeVerifiedProductionOrderRun37,
  inspectNativeVerifiedProductionSourceRun37,
} from './native-verified-production-order-run37.mjs'
import {buildNativeVerifiedCutroomIntakeRun44,digestNativeCutroomIntakeRun44}
  from './native-verified-cutroom-intake-run44.mjs'

const reject = (code, detail = code) => ({
  ok:false,status:'BLOCKED',issues:[{code,detail}],
  cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
})
const object = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value))
const exact = (value,keys) => object(value) &&
  Object.keys(value).length === keys.length &&
  keys.every(k=>Object.hasOwn(value,k))
const finite = x => typeof x === 'number' && Number.isFinite(x)
const positive = x => finite(x) && x > 0
const nonnegative = x => finite(x) && x >= 0
const id = x => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(x)
const GAP_CM = .01
const MAX_ROWS = 5000
const MAX_DEFECTS = 200

// A snapshot is required to prevent an input getter from altering the order
// while a native project is being reloaded and its CUT is regenerated.
const copyJson = (value,parents=new Set(),depth=0) => {
  if(depth>60)throw Error('NATIVE_ROLL_DEPTH_LIMIT')
  if(value===null || typeof value==='string' || typeof value==='boolean')return value
  if(finite(value))return value
  if(!Array.isArray(value)&&!object(value))throw Error('NATIVE_ROLL_NON_JSON')
  if(parents.has(value))throw Error('NATIVE_ROLL_CYCLE')
  const descriptors=Object.getOwnPropertyDescriptors(value)
  const keys=Object.keys(value)
  if(Reflect.ownKeys(value).some(k=>typeof k==='symbol') ||
    keys.length+(Array.isArray(value)?1:0)!==Object.keys(descriptors).length ||
    (Array.isArray(value)&&keys.length!==value.length))
    throw Error('NATIVE_ROLL_NON_DATA_FIELDS')
  parents.add(value)
  const clone=Array.isArray(value)?[]:{}
  for(const k of keys){
    const field=descriptors[k]
    if(!field || !Object.hasOwn(field,'value') ||
      k==='__proto__'||k==='constructor'||k==='prototype')
      throw Error('NATIVE_ROLL_UNSAFE_FIELD')
    Object.defineProperty(clone,k,{value:copyJson(field.value,parents,depth+1),
      enumerable:true,writable:true,configurable:true})
  }
  parents.delete(value)
  return clone
}
const canonical = value => {
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value)
  if(finite(value))return JSON.stringify(value)
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']'
  if(object(value))return '{'+Object.keys(value).sort().map(k=>
    JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'
  throw Error('NATIVE_ROLL_DIGEST_REFUSED')
}
const digest = x => createHash('sha256').update(canonical(x)).digest('hex')
const dependencyHash = project => digestNativeCutroomIntakeRun44({
  grade_run:project?.grade_run,template:project?.template,
  native_point_bindings:project?.native_point_bindings??null,
  native_facing_dependency:project?.native_facing_dependency??null,
  fabric_grade_envelope:project?.fabric_grade_envelope??null,
  piece_variant:project?.piece_variant??null,
})

async function reconstruct(workspace,order,plan){
  if(!exact(plan,['rollsById','assignmentsBySize','defectsByRoll']) ||
    !object(plan.rollsById)||!object(plan.assignmentsBySize)||
    !object(plan.defectsByRoll))
    throw Error('NATIVE_ROLL_DECLARATIONS_REQUIRED')
  // Reuse the independent Rust-intake proof: each placed marker polygon
  // is checked vertex-by-vertex against its saved Rust physical CUT,
  // verifying metre→centimetre conversion, size/panel correspondence,
  // source grain rotation and linked dependency identity.
  const intake=await buildNativeVerifiedCutroomIntakeRun44(workspace,order)
  if(intake?.ok!==true || intake.manifest?.cuttingAuthorized!==false ||
    intake.manifest.factoryApproved!==false)
    throw Error('NATIVE_ROLL_INDEPENDENT_CUT_INTAKE_REQUIRED')
  const verified=await createNativeVerifiedProductionOrderRun37(workspace,order)
  if(verified.workflow!=='exo-native-verified-graded-production-order.v1'||
    verified.factoryApproved!==false||verified.cuttingAuthorized!==false||
    verified.sourceMaterialsChecked!==true||verified.readFromNativeWorkspace!==true)
    throw Error('NATIVE_ROLL_ORDER_UNVERIFIED')
  if(intake.manifest.sourceRevision!==verified.sourceRevision||
    intake.manifest.sourceFingerprint!==verified.sourceFingerprint||
    intake.manifest.nativeCutlineFingerprint!==verified.nativeCutlineFingerprint||
    !intake.manifest.sourceDependencySha256 ||
    canonical(intake.manifest.quantitiesBySize)!==canonical(verified.orderQuantities)||
    canonical(intake.manifest.materialsByPanel)!==
      canonical(verified.cuttingMaterialDeclarations))
    throw Error('NATIVE_ROLL_INTAKE_ORDER_SOURCE_MISMATCH')
  const sizes=verified.results.map(row=>row.size)
  const expectedSizes=Object.keys(verified.orderQuantities)
  const fabrics=[...new Set(Object.values(verified.cuttingMaterialDeclarations)
    .map(material=>material.fabricId))].sort()
  if(!sizes.length||sizes.length>50||
    sizes.length!==expectedSizes.length||
    sizes.some(s=>!id(s)||!Object.hasOwn(verified.orderQuantities,s))||
    new Set(sizes).size!==sizes.length ||
    !fabrics.length||fabrics.some(f=>!id(f)) ||
    sizes.length*fabrics.length>MAX_ROWS||
    !exact(plan.assignmentsBySize,sizes))
    throw Error('NATIVE_ROLL_SIZE_FABRIC_COVERAGE')
  const expectedGroups=new Map()
  for(const [panelId,declared] of Object.entries(verified.cuttingMaterialDeclarations)){
    if(!id(panelId)||!id(declared?.fabricId)||!id(declared?.groupId))
      throw Error('NATIVE_ROLL_INVALID_MATERIAL')
    const former=expectedGroups.get(declared.fabricId)
    if(former!==undefined&&former!==declared.groupId)
      throw Error('NATIVE_ROLL_GROUP_MERGE_UNSUPPORTED')
    expectedGroups.set(declared.fabricId,declared.groupId)
  }
  const rolls=plan.rollsById
  const rollIds=Object.keys(rolls)
  if(!rollIds.length||rollIds.length>250||
    !exact(plan.defectsByRoll,rollIds))
    throw Error('NATIVE_ROLL_INVENTORY_INCOMPLETE')
  const rollState=new Map()
  for(const rollId of rollIds){
    const roll=rolls[rollId],zones=plan.defectsByRoll[rollId]
    if(!id(rollId) ||
      !exact(roll,['fabricId','groupId','usableWidthCm','availableLengthCm',
        'shadeId','dyeLotId','batchId']) ||
      !fabrics.includes(roll.fabricId) ||
      roll.groupId!==expectedGroups.get(roll.fabricId) ||
      !id(roll.shadeId)||!id(roll.dyeLotId)||!id(roll.batchId) ||
      !positive(roll.usableWidthCm)||!positive(roll.availableLengthCm) ||
      !Array.isArray(zones)||zones.length>MAX_DEFECTS)
      throw Error('NATIVE_ROLL_INVENTORY_INVALID')
    const defects=[]
    for(const z of zones){
      if(!exact(z,['startCm','endCm']) ||
        !nonnegative(z.startCm)||!positive(z.endCm)||
        z.endCm<=z.startCm||z.endCm>roll.availableLengthCm)
        throw Error('NATIVE_ROLL_DEFECT_INVALID')
      defects.push({...z})
    }
    defects.sort((a,b)=>a.startCm-b.startCm)
    if(defects.some((z,i)=>i>0&&z.startCm<defects[i-1].endCm))
      throw Error('NATIVE_ROLL_DEFECT_OVERLAP')
    rollState.set(rollId,{position:0,defectCursor:0,defects,used:0})
  }
  const rows=[]
  // One source-fabric production order cannot silently mix visible shades or
  // dye lots between graded sizes. Distinct inventory batches sharing the
  // exact declared shade+lot are allowed, but a shade/lot split needs a
  // separately authored manufacturing order and physical sign-off.
  const assignedShadeLotByFabric=new Map()
  for(const sizeRow of verified.results){
    const size=sizeRow.size
    if(!exact(plan.assignmentsBySize[size],fabrics) ||
      sizeRow.sourceFingerprint!==verified.sourceFingerprint ||
      sizeRow.cuttingAuthorized!==false ||
      !Array.isArray(sizeRow.markers)||
      sizeRow.markers.length!==fabrics.length)
      throw Error('NATIVE_ROLL_MARKER_COVERAGE')
    const markers=new Map()
    for(const entry of sizeRow.markers){
      if(!entry||!id(entry.fabricId)||markers.has(entry.fabricId)||
        !fabrics.includes(entry.fabricId))
        throw Error('NATIVE_ROLL_MARKER_DUPLICATE')
      markers.set(entry.fabricId,entry.marker)
    }
    const target=new Map()
    for(const [panelId,qty] of Object.entries(verified.orderQuantities[size])){
      const source=verified.cuttingMaterialDeclarations[panelId]
      if(!source||!Number.isSafeInteger(qty)||qty<1||qty>99)
        throw Error('NATIVE_ROLL_PANEL_QUANTITY')
      for(let i=0;i<qty;i++)target.set(JSON.stringify([panelId,i]),source.fabricId)
    }
    for(const fabricId of fabrics){
      const marker=markers.get(fabricId),assignment=plan.assignmentsBySize[size][fabricId]
      if(!exact(assignment,['rollId','endLossCm'])||
        !id(assignment.rollId)||!nonnegative(assignment.endLossCm)||
        assignment.endLossCm>100)
        throw Error('NATIVE_ROLL_INVALID_ASSIGNMENT')
      const roll=rolls[assignment.rollId],state=rollState.get(assignment.rollId)
      if(!roll||!state||roll.fabricId!==fabricId ||
        roll.groupId!==expectedGroups.get(fabricId))
        throw Error('NATIVE_ROLL_FABRIC_GROUP_DRIFT')
      const shadeLot=JSON.stringify([roll.shadeId,roll.dyeLotId])
      const earlierShadeLot=assignedShadeLotByFabric.get(fabricId)
      if(earlierShadeLot!==undefined&&earlierShadeLot!==shadeLot)
        throw Error('NATIVE_ROLL_CROSS_SHADE_OR_DYE_LOT_WITHOUT_AUTHORED_SPLIT')
      assignedShadeLotByFabric.set(fabricId,shadeLot)
      if(marker?.ok!==true||marker.manufacturingApproved!==false||
        !Array.isArray(marker.unplaced)||marker.unplaced.length ||
        !Array.isArray(marker.placements)||!marker.placements.length ||
        !positive(marker.metrics?.length)||!positive(marker.metrics?.fabricWidth) ||
        marker.metrics.fabricWidth>roll.usableWidthCm+1e-7 ||
        marker.metrics.placed!==marker.placements.length ||
        marker.metrics.requested!==marker.placements.length)
        throw Error('NATIVE_ROLL_UNVERIFIED_MARKER')
      let cutCount=0
      for(const p of marker.placements){
        const key=JSON.stringify([p?.pieceId,p?.instance])
        if(target.get(key)!==fabricId||!Array.isArray(p.outline)||
          p.outline.length<3||p.outline.length>2000||
          p.outline.some(point=>!finite(point?.x)||!finite(point?.y))||
          ![p.x,p.y,p.width,p.height].every(finite)||
          p.x<0||p.y<0||p.width<=0||p.height<=0||
          p.x+p.width>marker.metrics.fabricWidth+1e-6||
          p.y+p.height>marker.metrics.length+1e-6)
          throw Error('NATIVE_ROLL_CUT_INSTANCE_DRIFT')
        target.delete(key)
        cutCount++
      }
      const len=marker.metrics.length+assignment.endLossCm
      let start=state.position,idx=state.defectCursor
      for(;idx<state.defects.length;idx++){
        const defect=state.defects[idx]
        if(start>defect.endCm+GAP_CM)continue
        if(start+len+GAP_CM<=defect.startCm)break
        start=Math.max(start,defect.endCm+GAP_CM)
      }
      const end=start+len
      if(!finite(end)||end>roll.availableLengthCm)
        throw Error('NATIVE_ROLL_CONTIGUOUS_CAPACITY_EXCEEDED')
      rows.push({size,fabricId,groupId:roll.groupId,rollId:assignment.rollId,
        nativeCutInstances:cutCount,plies:1,markerRepeats:1,
        markerWidthCm:marker.metrics.fabricWidth,
        markerLengthCm:marker.metrics.length,
        endLossCm:assignment.endLossCm,startCm:start,endCm:end})
      state.position=end
      state.defectCursor=idx
      state.used+=len
    }
    if(target.size)throw Error('NATIVE_ROLL_INCOMPLETE_PHYSICAL_CUTS')
  }
  const after=await inspectNativeVerifiedProductionSourceRun37(workspace)
  if(after.revision!==verified.sourceRevision ||
    after.sourceFingerprint!==verified.sourceFingerprint ||
    after.nativeCutlineFingerprint!==verified.nativeCutlineFingerprint)
    throw Error('NATIVE_ROLL_SOURCE_CHANGED_DURING_PLANNING')
  const saved=await workspace.request({op:'save',revision:verified.sourceRevision})
  if(saved?.ok!==true||!saved.data?.project ||
    dependencyHash(saved.data.project)!==intake.manifest.sourceDependencySha256)
    throw Error('NATIVE_ROLL_LINKED_SOURCE_CHANGED_DURING_PLANNING')
  const rollSummaries=rollIds.sort().map(rollId=>{
    const roll=rolls[rollId],state=rollState.get(rollId)
    return {rollId,fabricId:roll.fabricId,groupId:roll.groupId,
      shadeId:roll.shadeId,dyeLotId:roll.dyeLotId,batchId:roll.batchId,
      declaredAvailableLengthCm:roll.availableLengthCm,
      allocatedExtentCm:state.position,
      reservedLengthCm:state.used,
      unallocatedHeadAndGapsCm:state.position-state.used,
      remainingTailCm:roll.availableLengthCm-state.position,
      declaredDefectCount:state.defects.length,physicalRollVerified:false}
  })
  return {schema:'exo.native-single-ply-roll-study.v1',nativeSourceRevision:verified.sourceRevision,
    nativeSourceFingerprint:verified.sourceFingerprint,
    nativeCutlineFingerprint:verified.nativeCutlineFingerprint,
    nativeDependencySha256:intake.manifest.sourceDependencySha256,
    nativeCutIntakeManifestSha256:intake.manifestSha256,
    unitSystem:{cutPolygonInput:'m',marker:'cm',roll:'cm'},
    quantitySemantics:'physical-panel-cuts-on-one-native-marker-per-size-fabric',
    orderedPhysicalCuts:verified.orderQuantities,
    cuttingMaterials:verified.cuttingMaterialDeclarations,
    rollsById:rolls,assignmentsBySize:plan.assignmentsBySize,
    defectsByRoll:plan.defectsByRoll,rows,rollSummaries,
    nativeWorkspaceChecked:true,independentNativeCutGeometryRebuilt:true,
    licensedReceivingCadVerified:false,physicalRollVerified:false,
    calibratedCutterVerified:false,manufacturingApproved:false,
    cuttingAuthorized:false,factoryApproved:false}
}

export async function buildNativeVerifiedSinglePlyRollPlanRun44(workspace,order,planning){
  try{
    const stable=copyJson({order,planning})
    const manifest=await reconstruct(workspace,stable.order,stable.planning)
    return {ok:true,status:'NATIVE_SINGLE_PLY_DIGITAL_ROLL_STUDY',
      manifest,manifestSha256:digest(manifest),issues:[],
      cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false}
  }catch(error){return reject('NATIVE_ROLL_STUDY_REFUSED',String(error?.message||error))}
}

export async function inspectNativeVerifiedSinglePlyRollPlanRun44(workspace,order,planning,packet){
  try{
    const stable=copyJson(packet)
    if(!exact(stable,['manifest','manifestSha256']) ||
      !object(stable.manifest)||typeof stable.manifestSha256!=='string'||
      stable.manifestSha256!==digest(stable.manifest))
      return reject('NATIVE_ROLL_PACKET_INVALID')
    const rebuilt=await buildNativeVerifiedSinglePlyRollPlanRun44(workspace,order,planning)
    if(!rebuilt.ok)return rebuilt
    if(rebuilt.manifestSha256!==stable.manifestSha256)
      return reject('NATIVE_ROLL_SOURCE_OR_ALLOCATION_DRIFT')
    return {ok:true,status:'NATIVE_SINGLE_PLY_ROLL_STUDY_REINSPECTED',
      manifestSha256:rebuilt.manifestSha256,
      inspectedRows:rebuilt.manifest.rows.length,
      physicalRollVerified:false,licensedReceivingCadVerified:false,
      cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false}
  }catch(error){return reject('NATIVE_ROLL_INSPECTION_REFUSED',String(error?.message||error))}
}
