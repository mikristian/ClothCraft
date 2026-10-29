// Digital order→marker→ply-roll planner, including explicit declared defects.
// No inferred physical inventory, authenticated roll inspection or CUT release.
import {inspectIndustrialMarkerLayDemand20261028} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerRollDefectPlan20261028} from './industrialMarkerRollDefectPlan20261028.mjs'
import {fingerprintIndustrialMarkerSource20261029, fingerprintIndustrialMarkerStudy20261029} from './industrialMarkerSourceFreshness20261029.mjs'
import {inspectIndustrialMarkerCutWorkflow20261028, getLocallyVerifiedIndustrialMarkerStudyDigest20261029} from './industrialMarkerCutWorkflow20261028.mjs'

const record = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const finite = x => typeof x === 'number' && Number.isFinite(x)
const reject = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], rollPlanById: null,
  cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
})
const GAP_CM = 0.01 // Conservative 0.1-mm clearance around declared roll defects.
// One-fabric 24-size x 1,000-ply orders can fit this bounded digital workload.
// Multi-fabric orders beyond the cap require separate production batches.
export const MAX_INDUSTRIAL_ROLL_SEGMENTS_20261029 = 24000

/** Deterministically recalculate full-ply roll positions after marker edits.
 * Rows remain on their declared roll and retain their existing ply/order recipe.
 * A failing roll blocks the entire plan; no fabric/lot substitution is attempted.
 */
export function planIndustrialCutroomRollSegments20261029(
  project, markerStudy, layPolicy, shadePolicy,
  {defectsByRoll, maxPlySegments = MAX_INDUSTRIAL_ROLL_SEGMENTS_20261029} = {},
) {
  try {
    if (!Number.isSafeInteger(maxPlySegments) || maxPlySegments < 1 ||
        maxPlySegments > MAX_INDUSTRIAL_ROLL_SEGMENTS_20261029)
      return reject('ROLL_PLAN_INVALID_SIZE_BUDGET')
    const sourceSha = fingerprintIndustrialMarkerSource20261029(project)
    if (!sourceSha || sourceSha !== markerStudy?.sourceProjectSha256)
      return reject('ROLL_PLAN_STALE_MARKER_SOURCE')
    // A claimed automatic reference parity is only caller-owned JSON. Rebuild
    // or use a locally produced reference digest before generating a roll plan.
    // Manual edits get their own whole-study witness inside inspectLay below.
    if (markerStudy.manualMarkerEditsV1 === undefined) {
      const options = markerStudy.markerBuildOptions
      if (!record(options) || options.version !== 1 ||
          options.usesSuppliedDxf !== false || options.usesCutterProfile !== false)
        return reject('ROLL_PLAN_MARKER_SOURCE_WITNESS_MISMATCH')
      let expected = getLocallyVerifiedIndustrialMarkerStudyDigest20261029(
        sourceSha, options)
      if (!expected) {
        const rebuilt = inspectIndustrialMarkerCutWorkflow20261028(project, {
          fabricWidthCm: options.fabricWidthCm,
          spacingCm: options.spacingCm,
          maxLengthCm: options.maxLengthCm,
          maxCandidates: options.maxCandidates,
          constrainedLayout: options.constrainedLayout,
        })
        expected = rebuilt?.ok ? fingerprintIndustrialMarkerStudy20261029(rebuilt) : null
      }
      if (!expected || expected !== fingerprintIndustrialMarkerStudy20261029(markerStudy))
        return reject('ROLL_PLAN_MARKER_SOURCE_WITNESS_MISMATCH')
    }
    const demand = inspectIndustrialMarkerLayDemand20261028(project, markerStudy, layPolicy)
    if (!demand.ok) return reject('ROLL_PLAN_LAY_PREREQUISITE', demand.issues)
    // Guard BEFORE allocating any per-ply rows; do not partially build a
    // potentially huge cutting-room plan that cannot pass final inspection.
    const requestedPlyCount = demand.rows.reduce((sum, row) => sum + row.plies, 0)
    if (!Number.isSafeInteger(requestedPlyCount) ||
        requestedPlyCount > maxPlySegments)
      return reject('ROLL_PLAN_SIZE_LIMIT')
    const rolls = [...new Set(demand.rows.map(row => row.rollId))]
    if (!record(defectsByRoll) || Object.keys(defectsByRoll).length !== rolls.length ||
        !rolls.every(id => Object.hasOwn(defectsByRoll, id)))
      return reject('ROLL_PLAN_DEFECT_DECLARATIONS_REQUIRED')
    const plans = Object.create(null)
    const cursors = new Map()
    const defectCursors = new Map()
    for (const rollId of rolls) {
      const available = layPolicy?.rollsById?.[rollId]?.availableLengthCm
      const declared = defectsByRoll[rollId]
      if (!finite(available) || available <= 0 || !Array.isArray(declared) ||
          declared.length > 200)
        return reject('ROLL_PLAN_INVALID_DEFECTS', rollId)
      const defects = []
      for (const defect of declared) {
        if (!record(defect) || Object.keys(defect).length !== 2 ||
            !Object.hasOwn(defect, 'startCm') || !Object.hasOwn(defect, 'endCm') ||
            !finite(defect.startCm) || !finite(defect.endCm) ||
            defect.startCm < 0 || defect.endCm <= defect.startCm ||
            defect.endCm > available)
          return reject('ROLL_PLAN_INVALID_DEFECT_INTERVAL', rollId)
        defects.push({startCm: defect.startCm, endCm: defect.endCm})
      }
      defects.sort((a, b) => a.startCm - b.startCm)
      if (defects.some((d, i) => i > 0 && d.startCm < defects[i - 1].endCm))
        return reject('ROLL_PLAN_OVERLAPPING_DEFECTS', rollId)
      plans[rollId] = {defects, plySegments: []}
      cursors.set(rollId, 0)
      defectCursors.set(rollId, 0)
    }
    let placements = 0
    for (const row of demand.rows) {
      if (!Number.isSafeInteger(row.plies) || row.plies < 1 || row.plies > 1000)
        return reject('ROLL_PLAN_UNSUPPORTED_PLY_COUNT')
      const required = row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly
      if (!finite(required) || required <= 0)
        return reject('ROLL_PLAN_INVALID_LAY_LENGTH')
      const rollId = row.rollId
      const plan = plans[rollId]
      const available = layPolicy.rollsById[rollId].availableLengthCm
      for (let plyIndex = 0; plyIndex < row.plies; plyIndex++) {
        placements++
        let start = cursors.get(rollId)
        // Plys advance monotonically along a roll, so defects already behind
        // the cutting head never need rescanning. Equality at the clearance
        // boundary is a valid non-overlapping position, not a reason to skip
        // a whole usable fabric interval.
        let index = defectCursors.get(rollId)
        while (index < plan.defects.length) {
          const defect = plan.defects[index]
          if (start > defect.endCm + GAP_CM) { index++; continue }
          if (start + required + GAP_CM <= defect.startCm) break
          start = Math.max(start, defect.endCm + GAP_CM)
          index++
        }
        const end = start + required
        if (!finite(end) || end > available)
          return reject('ROLL_PLAN_INSUFFICIENT_CONTIGUOUS_LENGTH', rollId)
        plan.plySegments.push({
          size: row.size, fabricId: row.fabricId, plyIndex, startCm: start, endCm: end,
        })
        cursors.set(rollId, end)
        defectCursors.set(rollId, index)
      }
    }
    const rechecked = inspectIndustrialMarkerRollDefectPlan20261028(
      project, markerStudy, layPolicy, shadePolicy, {rollPlanById: plans})
    if (!rechecked.ok) return reject('ROLL_PLAN_INDEPENDENT_PREFLIGHT_BLOCKED', rechecked.issues)
    // Production reporting is derived from the INDEPENDENTLY rechecked
    // intervals, not the marker's requested lengths or issuer-controlled
    // "efficiency" metadata. Report unassigned spacing separately from
    // physical defects; it is a digital allocation estimate, not measured
    // fabric waste or cut-machine utilization.
    const rollAllocationRows = rechecked.rolls.map(checked => {
      const plan = plans[checked.rollId]
      const reservedPlyLengthCm = plan.plySegments.reduce(
        (sum, seg) => sum + (seg.endCm - seg.startCm), 0)
      const allocatedExtentCm = checked.highestUsedPositionCm
      const unallocatedHeadAndGapCm = Math.max(0, allocatedExtentCm - reservedPlyLengthCm)
      const unallocatedTailCm = Math.max(0, checked.declaredAvailableLengthCm - allocatedExtentCm)
      return {
        rollId: checked.rollId,
        fabricId: layPolicy.rollsById[checked.rollId].fabricId,
        plySegmentCount: checked.plySegmentCount,
        declaredDefectCount: checked.defectCount,
        declaredAvailableLengthCm: checked.declaredAvailableLengthCm,
        allocatedExtentCm,
        reservedPlyLengthCm,
        unallocatedHeadAndGapCm,
        unallocatedTailCm,
        allocationFractionWithinExtent: allocatedExtentCm > 0
          ? reservedPlyLengthCm / allocatedExtentCm : 0,
        physicalRollVerified: false,
      }
    })
    if (rollAllocationRows.some(row =>
      ![row.reservedPlyLengthCm, row.unallocatedHeadAndGapCm,
        row.unallocatedTailCm, row.allocationFractionWithinExtent].every(finite) ||
      row.allocationFractionWithinExtent < 0 ||
      row.allocationFractionWithinExtent > 1 + 1e-8))
      return reject('ROLL_PLAN_ALLOCATION_OVERFLOW')
    return {
      ok: true, status: 'LOCAL_DECLARED_ROLL_SEGMENTS_PLANNED',
      rollPlanById: plans, inspectedPlyCount: placements, rollCount: rolls.length,
      rollAllocationRows,
      rollDefectPlanInspected: true, physicalRollVerified: false,
      cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
      limitations: 'First-fit roll segments and digital allocation summaries from caller-declared inventory and defect intervals. ' +
        'No physical fabric, roll authentication, equipment calibration, marker print or CUT authorization.',
    }
  } catch (error) {
    return reject('ROLL_PLAN_INSPECTION_REFUSED', String(error?.message || error))
  }
}
