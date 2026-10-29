// Source-bound 2D garment → verified CUT → roll plan → complete digital cutroom
// proposal. This is a LOCAL, unsigned planning artifact. It is NOT the native
// Rust graded-order model, an authenticated roll receipt, or CUT authorization.
import {planIndustrialCutroomRollSegments20261029,
  MAX_INDUSTRIAL_ROLL_SEGMENTS_20261029 as MAX_SEGMENTS}
  from './industrialCutroomRollSegmentPlanner20261029.mjs'
import {inspectIndustrialCutroomUnifiedPreflight20261029}
  from './industrialCutroomUnifiedPreflight20261029.mjs'
import {fingerprintIndustrialMarkerSource20261029 as sourceDigest,
  fingerprintIndustrialMarkerStudy20261029 as digest}
  from './industrialMarkerSourceFreshness20261029.mjs'

const record = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
// Capture a consistent, inert, source-owned JSON snapshot BEFORE calling any
// geometry/roll inspector. Getter-driven or concurrently mutated caller data
// must not change between the hash, regeneration and manifest stages.
// Cap deserialization complexity *before* enumerating array descriptors.
// The current planner supports at most 24,000 physical ply segments; a
// million-entry attacker-supplied JSON tree must not exhaust the 2D editor
// before the actual roll/marker validators can refuse it.
const MAX_ORDER_INPUT_ARRAY_ITEMS = 50000
const MAX_ORDER_INPUT_NODES = 1000000
const snapshotJson = (value,active=new Set(),depth=0,budget={visited:0}) => {
  if(++budget.visited>MAX_ORDER_INPUT_NODES)throw Error('ORDER_PROPOSAL_NODE_BUDGET')
  if(depth>64)throw Error('ORDER_PROPOSAL_DEPTH_LIMIT')
  if(value===null||typeof value==='string'||typeof value==='boolean')return value
  if(typeof value==='number'&&Number.isFinite(value))return value
  if(!Array.isArray(value)&&!record(value))throw Error('ORDER_PROPOSAL_NON_JSON')
  if(Array.isArray(value)&&value.length>MAX_ORDER_INPUT_ARRAY_ITEMS)
    throw Error('ORDER_PROPOSAL_ARRAY_BUDGET')
  if(active.has(value))throw Error('ORDER_PROPOSAL_CYCLE')
  const descriptors=Object.getOwnPropertyDescriptors(value)
  if(Reflect.ownKeys(value).some(key=>typeof key==='symbol') ||
    Object.keys(descriptors).length !== Object.keys(value).length+(Array.isArray(value)?1:0))
    throw Error('ORDER_PROPOSAL_NON_DATA_FIELDS')
  if(Array.isArray(value) &&
    (Object.keys(value).length!==value.length||
      !Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean)))
    throw Error('ORDER_PROPOSAL_SPARSE_ARRAY')
  active.add(value)
  const result=Array.isArray(value)?[]:{}
  for(const key of Object.keys(value)){
    const field=descriptors[key]
    if(!field||!Object.hasOwn(field,'value'))throw Error('ORDER_PROPOSAL_ACCESSOR')
    Object.defineProperty(result,key,{
      value:snapshotJson(field.value,active,depth+1,budget),
      enumerable:true,configurable:true,writable:true,
    })
  }
  active.delete(value)
  return result
}
const fail = (code, detail = code) => ({
  ok:false, status:'BLOCKED', issues:[{code,detail}],
  cuttingAuthorized:false, factoryApproved:false, manufacturingApproved:false,
})

/** Builds a digital-only QA handoff from independently regenerated CUT/roll
 * evidence and the existing whole-chain spreading, stack and carriage gate.
 * The native Rust bridge MUST NOT consume this as a trusted source/cut token.
 */
export function buildIndustrialCutroomOrderProposal20261029(
  project, markerStudy, layPolicy, shadePolicy,
  declarations = {},
) {
  try {
    if(!record(declarations) ||
      !['defectsByRoll','spreadingPolicy','stackPolicy','carriagePolicy'].every(key=>
        Object.hasOwn(declarations,key) &&
        Object.getOwnPropertyDescriptor(declarations,key)?.value !== undefined))
      return fail('ORDER_PROPOSAL_INCOMPLETE_DECLARATIONS')
    const stable=snapshotJson({project,markerStudy,layPolicy,shadePolicy,declarations})
    project=stable.project
    markerStudy=stable.markerStudy
    layPolicy=stable.layPolicy
    shadePolicy=stable.shadePolicy
    const {defectsByRoll,maxPlySegments=MAX_SEGMENTS,
      spreadingPolicy,stackPolicy,carriagePolicy}=stable.declarations
    if (![project,markerStudy,layPolicy,shadePolicy,defectsByRoll,
      spreadingPolicy,stackPolicy,carriagePolicy].every(record))
      return fail('ORDER_PROPOSAL_INCOMPLETE_DECLARATIONS')
    const sha = sourceDigest(project)
    const markerSha = digest(markerStudy)
    if (!sha || !markerSha || markerStudy.sourceProjectSha256 !== sha)
      return fail('ORDER_PROPOSAL_SOURCE_OR_MARKER_STALE')
    const generated = planIndustrialCutroomRollSegments20261029(
      project, markerStudy, layPolicy, shadePolicy, {defectsByRoll,maxPlySegments})
    if (!generated.ok)
      return fail('ORDER_PROPOSAL_ROLL_PLANNING_BLOCKED', generated.issues)
    const preflight = inspectIndustrialCutroomUnifiedPreflight20261029(
      project, markerStudy, layPolicy, shadePolicy,
      {rollPlanById:generated.rollPlanById,spreadingPolicy,stackPolicy,carriagePolicy})
    if (!preflight.ok || preflight.allSizeDigitalPreflightInspected !== true ||
      preflight.markerStudySourceDerivedMatch !== true ||
      preflight.cuttingAuthorized !== false || preflight.factoryApproved !== false)
      return fail('ORDER_PROPOSAL_FULL_PREFLIGHT_BLOCKED', preflight.issues)
    const qty = structuredClone(layPolicy.ordersBySize)
    const sizes = project.grading.sizes
    if (!record(qty) || Object.keys(qty).length !== sizes.length ||
      !sizes.every(s => Number.isSafeInteger(qty[s]) && qty[s] > 0))
      return fail('ORDER_PROPOSAL_SIZE_QUANTITY_INVALID')
    const sizeOrdinal=new Map(sizes.map((s,i)=>[s,i]))
    const fabrics=[...new Set(project.pieces.map(p=>p.fabricId||'main'))]
    const fabricOrdinal=new Map(fabrics.map((s,i)=>[s,i]))
    const rows = [...preflight.rows].sort((a,b)=>
      sizeOrdinal.get(a.size)-sizeOrdinal.get(b.size) ||
      fabricOrdinal.get(a.fabricId)-fabricOrdinal.get(b.fabricId)).map(row => {
      const lay = layPolicy.laysBySize[row.size][row.fabricId]
      const marker = markerStudy.rows.find(r =>
        r.size === row.size && r.fabricId === row.fabricId)
      return {
        size:row.size, fabricId:row.fabricId, rollId:row.rollId,
        tableId:row.tableId, orderedGarments:qty[row.size],
        markerPieceInstances:marker.marker.placements.length,
        plies:row.plies, markerRepeats:lay.markerRepeats,
        markerLengthCm:marker.marker.metrics.length,
        endLossCmPerPly:lay.endLossCmPerPly,
        requiredLayLengthCm:row.requiredLayLengthCm,
        requiredTravelCm:row.requiredTravelCm,
        requiredWidthCm:row.requiredWidthCm,
        requiredStackClearanceMm:row.requiredStackClearanceMm,
      }
    })
    const totals = {
      garmentCount:sizes.reduce((sum,size)=>sum+qty[size],0),
      fullPlySegments:generated.inspectedPlyCount,
      rollCount:generated.rollCount,
      gradedSizeCount:preflight.sizeCount,
      fabricCount:preflight.fabricCount,
    }
    if (!Number.isSafeInteger(totals.garmentCount))
      return fail('ORDER_PROPOSAL_TOTAL_QUANTITY_OVERFLOW')
    const manifest = {
      format:'exo.local-2d-cutroom-order-proposal.v1',schemaVersion:1,
      unitSystem:{rollLength:'cm',markerGeometry:'cm',stackClearance:'mm'},
      sourceProjectSha256:sha,markerStudySha256:markerSha,
      layPolicySha256:digest(layPolicy),shadePolicySha256:digest(shadePolicy),
      equipmentPoliciesSha256:digest({spreadingPolicy,stackPolicy,carriagePolicy}),
      defectDeclarationSha256:digest(defectsByRoll),
      rollPlanSha256:digest(generated.rollPlanById),
      // Self-contained digital roll/ply tickets, never cutter instructions.
      // These are rebuilt from authoritative marker geometry and caller-
      // declared material/defects on every acceptance check.
      rollPlanById:structuredClone(generated.rollPlanById),
      maxPlySegments, sourceSizes:[...sizes],ordersBySize:qty,
      totals, sizeFabricRows:rows,
      rollAllocationRows:structuredClone(generated.rollAllocationRows),
      nativeRustSourceVerified:false,licensedReceivingCadVerified:false,
      physicalRollVerified:false,calibratedEquipmentVerified:false,
      cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
    }
    const manifestSha256=digest(manifest)
    if (!manifestSha256 || [
      manifest.layPolicySha256,manifest.shadePolicySha256,
      manifest.equipmentPoliciesSha256,manifest.defectDeclarationSha256,
      manifest.rollPlanSha256].some(x=>!x))
      return fail('ORDER_PROPOSAL_NONCANONICAL')
    return {ok:true,status:'LOCAL_ALL_SIZE_PRODUCTION_PROPOSAL_INSPECTED',
      manifest,manifestSha256,issues:[],
      cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
      limitations:'Unsigned digital same-source CUT/marker/order/roll/stack/carriage QA only. '+
        'Native Rust production order identities are NOT cross-bound; no licensed receiving CAD, '+
        'physical roll verification, cutter test or factory approval.'}
  } catch(error) {
    return fail('ORDER_PROPOSAL_BUILD_REFUSED',String(error?.message||error))
  }
}

/** Re-check against CURRENT sources; a copied SHA on edited operator metadata
 * cannot validate a stale proposal. Never accepts approval or machine fields.
 */
export function inspectIndustrialCutroomOrderProposal20261029(
  project,markerStudy,layPolicy,shadePolicy,policies,packet,
) {
  try {
    const copy=snapshotJson(packet)
    if (!record(copy) ||
      Object.keys(copy).sort().join(',') !== 'manifest,manifestSha256' ||
      !record(copy.manifest) || typeof copy.manifestSha256 !== 'string' ||
      digest(copy.manifest) !== copy.manifestSha256)
      return fail('ORDER_PROPOSAL_PACKET_INVALID')
    const expected = buildIndustrialCutroomOrderProposal20261029(
      project,markerStudy,layPolicy,shadePolicy,policies)
    if (!expected.ok) return expected
    if (expected.manifestSha256 !== copy.manifestSha256)
      return fail('ORDER_PROPOSAL_SOURCE_OR_POLICY_DRIFT')
    return {ok:true,status:'LOCAL_ALL_SIZE_PRODUCTION_PROPOSAL_REINSPECTED',
      manifestSha256:expected.manifestSha256,
      totals:expected.manifest.totals,issues:[],
      nativeRustSourceVerified:false,licensedReceivingCadVerified:false,
      physicalRollVerified:false,calibratedEquipmentVerified:false,
      cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false}
  } catch(error) {
    return fail('ORDER_PROPOSAL_INSPECTION_REFUSED',String(error?.message||error))
  }
}
