// Opt-in digital inspection of declared roll defect zones and physical lay
// positions. This does NOT authenticate roll inspection or authorize CUT.
import {inspectIndustrialMarkerLayDemand20261028} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerShadeLotGuard20261028} from './industrialMarkerShadeLotGuard20261028.mjs'

const record = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const exact = (x, names) => record(x) && Object.keys(x).length === names.length &&
  names.every(name => Object.hasOwn(x, name))
const distance = x => typeof x === 'number' && Number.isFinite(x) && x >= 0
const block = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}],
  rollDefectPlanInspected: false, physicalRollVerified: false,
  independentReceivingCadVerified: false, cuttingAuthorized: false,
  factoryApproved: false, manufacturingApproved: false,
})
const identity = (size, fabricId, plyIndex) => JSON.stringify([size, fabricId, plyIndex])

/**
 * Every ply consumes one contiguous roll interval of marker length times
 * repeats plus ONE end loss. Declared unusable intervals must not intersect
 * any planned ply, even when the aggregate roll length is sufficient.
 * All intervals are in centimeters measured from the same roll origin.
 */
export function inspectIndustrialMarkerRollDefectPlan20261028(
  project, markerStudy, layPolicy, shadePolicy, {rollPlanById = null} = {},
) {
  try {
    const shade = inspectIndustrialMarkerShadeLotGuard20261028(
      project, markerStudy, layPolicy, shadePolicy,
    )
    if (!shade.ok) return block('SHADE_LOT_PREREQUISITE_BLOCKED', shade.issues)
    const lay = inspectIndustrialMarkerLayDemand20261028(project, markerStudy, layPolicy)
    if (!lay.ok) return block('LAY_DEMAND_PREREQUISITE_BLOCKED', lay.issues)
    const rollIds = [...new Set(lay.rows.map(row => row.rollId))]
    if (!exact(rollPlanById, rollIds))
      return block('INCOMPLETE_ROLL_DEFECT_PLAN')

    const expected = new Map()
    for (const row of lay.rows) {
      if (!Number.isSafeInteger(row.plies) || row.plies < 1 || row.plies > 1000)
        return block('UNSUPPORTED_ROLL_PLY_COUNT')
      for (let plyIndex = 0; plyIndex < row.plies; plyIndex++) {
        const key = identity(row.size, row.fabricId, plyIndex)
        expected.set(key, {
          rollId: row.rollId,
          requiredLengthCm: row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly,
        })
      }
    }
    const checked = []
    for (const rollId of rollIds) {
      const plan = rollPlanById[rollId]
      const roll = layPolicy?.rollsById?.[rollId]
      if (!exact(plan, ['defects', 'plySegments']) ||
          !Array.isArray(plan.defects) || !Array.isArray(plan.plySegments) ||
          !roll || !distance(roll.availableLengthCm))
        return block('INVALID_ROLL_DEFECT_PLAN', rollId)
      const defects = []
      for (const defect of plan.defects) {
        if (!exact(defect, ['startCm', 'endCm']) ||
            !distance(defect.startCm) || !distance(defect.endCm) ||
            defect.endCm <= defect.startCm ||
            defect.endCm > roll.availableLengthCm)
          return block('INVALID_ROLL_DEFECT_INTERVAL', rollId)
        defects.push(defect)
      }
      defects.sort((a, b) => a.startCm - b.startCm)
      for (let i = 1; i < defects.length; i++)
        if (defects[i].startCm < defects[i - 1].endCm)
          return block('OVERLAPPING_ROLL_DEFECT_INTERVALS', rollId)

      const segments = []
      for (const segment of plan.plySegments) {
        if (!exact(segment, ['size', 'fabricId', 'plyIndex', 'startCm', 'endCm']) ||
            !Number.isSafeInteger(segment.plyIndex) || segment.plyIndex < 0 ||
            !distance(segment.startCm) || !distance(segment.endCm) ||
            segment.endCm <= segment.startCm ||
            segment.endCm > roll.availableLengthCm)
          return block('INVALID_ROLL_PLY_SEGMENT', rollId)
        const key = identity(segment.size, segment.fabricId, segment.plyIndex)
        const requirement = expected.get(key)
        if (!requirement || requirement.rollId !== rollId)
          return block('UNEXPECTED_OR_DUPLICATE_ROLL_PLY', key)
        if (Math.abs(segment.endCm - segment.startCm - requirement.requiredLengthCm) > 1e-5)
          return block('ROLL_PLY_LENGTH_DRIFT', key)
        for (const defect of defects)
          if (segment.startCm <= defect.endCm &&
              defect.startCm <= segment.endCm)
            return block('ROLL_PLY_INTERSECTS_DECLARED_DEFECT', key)
        expected.delete(key)
        segments.push(segment)
      }
      segments.sort((a, b) => a.startCm - b.startCm)
      for (let i = 1; i < segments.length; i++)
        if (segments[i].startCm < segments[i - 1].endCm)
          return block('ROLL_PLY_SEGMENTS_OVERLAP', rollId)
      checked.push({
        rollId, defectCount: defects.length, plySegmentCount: segments.length,
        declaredAvailableLengthCm: roll.availableLengthCm,
        highestUsedPositionCm: segments.reduce((max, s) => Math.max(max, s.endCm), 0),
      })
    }
    if (expected.size) return block('MISSING_ROLL_PLY_SEGMENT', [...expected.keys()][0])
    return {
      ok: true, status: 'LOCAL_ROLL_DEFECT_LAYOUT_INSPECTED', issues: [],
      rolls: checked, sizeCount: lay.sizeCount, fabricCount: lay.fabricCount,
      rollDefectPlanInspected: true, physicalRollVerified: false,
      independentReceivingCadVerified: false, cuttingAuthorized: false,
      factoryApproved: false, manufacturingApproved: false,
      limitations: 'Roll defect coordinates, roll origin, usable length and material identity '
        + 'are caller-declared digital inputs, not authenticated roll inspection. '
        + 'CUT geometry inspection does not authorize spreading, cutting or factory release.',
    }
  } catch (error) {
    return block('ROLL_DEFECT_PLAN_INSPECTION_REFUSED', String(error?.message || error))
  }
}
