// Optional production planning gate: declared shade / dye-lot / ply limits.
// These are caller-supplied digital declarations, NOT physical roll evidence.
import {inspectIndustrialMarkerLayDemand20261028} from './industrialMarkerLayDemand20261028.mjs'

const record = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const exact = (value, keys) => record(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const token = value => typeof value === 'string' &&
  /^[A-Za-z0-9_.:-]{1,96}$/.test(value)
const plyLimit = value => Number.isSafeInteger(value) && value >= 1 && value <= 1000
const block = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], rows: [],
  shadeLotInspected: false, physicalRollVerified: false,
  independentReceivingCadVerified: false, cuttingAuthorized: false,
  factoryApproved: false, manufacturingApproved: false,
})

/**
 * A multi-size marker can reconcile roll lengths yet use incompatible
 * dye lots/shades or a lay taller than the declared order/roll ply limit.
 * This gate is intentionally strict: each fabric in an order has ONE required
 * shade and dye lot. Segregated shade-band production needs a separate,
 * explicit multi-lot production plan; it must not be silently inferred.
 */
export function inspectIndustrialMarkerShadeLotGuard20261028(
  project, markerStudy, layPolicy, {
    orderMaterialsByFabric = null, rollProvenanceById = null,
  } = {},
) {
  try {
    const lay = inspectIndustrialMarkerLayDemand20261028(project, markerStudy, layPolicy)
    if (!lay.ok) return block('LAY_DEMAND_PREREQUISITE_BLOCKED', lay.issues)
    const fabrics = [...new Set(lay.rows.map(row => row.fabricId))]
    const usedRolls = [...new Set(lay.rows.map(row => row.rollId))]
    if (!exact(orderMaterialsByFabric, fabrics) ||
        !exact(rollProvenanceById, usedRolls))
      return block('INCOMPLETE_SHADE_LOT_POLICY')

    for (const fabricId of fabrics) {
      const material = orderMaterialsByFabric[fabricId]
      if (!exact(material, ['shadeId', 'dyeLotId', 'maxPlyCount']) ||
          !token(material.shadeId) || !token(material.dyeLotId) ||
          !plyLimit(material.maxPlyCount))
        return block('INVALID_ORDER_MATERIAL_SPEC', fabricId)
    }
    for (const rollId of usedRolls) {
      const source = rollProvenanceById[rollId]
      if (!token(rollId) ||
          !exact(source, ['fabricId', 'shadeId', 'dyeLotId', 'batchId', 'maxPlyCount']) ||
          !token(source.fabricId) || !token(source.shadeId) ||
          !token(source.dyeLotId) || !token(source.batchId) ||
          !plyLimit(source.maxPlyCount))
        return block('INVALID_ROLL_PROVENANCE_DECLARATION', rollId)
      if (source.fabricId !== layPolicy.rollsById[rollId]?.fabricId)
        return block('ROLL_PROVENANCE_FABRIC_DRIFT', rollId)
    }
    const rows = []
    for (const row of lay.rows) {
      const material = orderMaterialsByFabric[row.fabricId]
      const source = rollProvenanceById[row.rollId]
      if (source.fabricId !== row.fabricId)
        return block('ROLL_PROVENANCE_FABRIC_DRIFT', row.rollId)
      if (source.shadeId !== material.shadeId)
        return block('ORDER_SHADE_MISMATCH', `${row.size}/${row.fabricId}/${row.rollId}`)
      if (source.dyeLotId !== material.dyeLotId)
        return block('ORDER_DYE_LOT_MISMATCH', `${row.size}/${row.fabricId}/${row.rollId}`)
      if (row.plies > material.maxPlyCount || row.plies > source.maxPlyCount)
        return block('DECLARED_PLY_LIMIT_EXCEEDED', `${row.size}/${row.fabricId}/${row.rollId}`)
      rows.push({
        size: row.size, fabricId: row.fabricId, rollId: row.rollId,
        batchId: source.batchId, shadeId: source.shadeId,
        dyeLotId: source.dyeLotId, plies: row.plies,
        orderMaxPlyCount: material.maxPlyCount,
        rollMaxPlyCount: source.maxPlyCount,
      })
    }
    return {
      ok: true, status: 'LOCAL_SHADE_LOT_AND_PLY_POLICY_INSPECTED', issues: [],
      rows, sizeCount: lay.sizeCount, fabricCount: lay.fabricCount,
      usedRollCount: usedRolls.length, shadeLotInspected: true,
      physicalRollVerified: false, independentReceivingCadVerified: false,
      cuttingAuthorized: false, factoryApproved: false,
      manufacturingApproved: false,
      limitations: 'Shade, dye-lot, batch and ply limits are caller-declared, not independently '
        + 'authenticated physical roll labels, verified batch-to-lot genealogy, or spreader '
        + 'machine/stack-height measurements. A single-lot order '
        + 'policy is assumed. Digital CUT inspection never authorizes cutting or factory release.',
    }
  } catch (error) {
    return block('SHADE_LOT_INSPECTION_REFUSED', String(error?.message || error))
  }
}
