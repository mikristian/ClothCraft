// Opt-in conservative digital stack-height inspection. All material thickness
// and equipment clearance inputs are caller-declared, NOT physical evidence.
import {inspectIndustrialMarkerSpreadEnvelope20261029} from './industrialMarkerSpreadEnvelope20261029.mjs'

const record = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const exact = (value, keys) => record(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
// Floating-point equality is not a physical clearance tolerance.
const exceeds = (value, limit) => value > limit &&
  value - limit > 8 * Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(limit))
const blocked = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], rows: [],
  plyStackInspected: false, physicalThicknessVerified: false,
  calibratedEquipmentVerified: false, independentReceivingCadVerified: false,
  cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
})

/**
 * Digital worst-case stack height = plies * declared maximum fabric thickness
 * + (plies - 1) * declared interleaf thickness. No compression credit is taken.
 * Clearance reserve must fit beneath BOTH the table's declared maximum stack
 * height and the spreader head's declared clearance. All thicknesses in mm.
 * This does not inspect layer tension, air entrainment, physical measurements,
 * cutter penetration or material-specific blade/heat constraints.
 */
export function inspectIndustrialMarkerPlyStackClearance20261029(
  project, markerStudy, layPolicy, shadePolicy, spreadingPolicy,
  {rollStackById = null, equipmentStackById = null} = {},
) {
  try {
    const spread = inspectIndustrialMarkerSpreadEnvelope20261029(
      project, markerStudy, layPolicy, shadePolicy, spreadingPolicy,
    )
    if (!spread.ok) return blocked('SPREADING_ENVELOPE_PREREQUISITE_BLOCKED', spread.issues)
    const usedRollIds = [...new Set(spread.rows.map(row =>
      layPolicy.laysBySize[row.size][row.fabricId].rollId))]
    const usedTableIds = [...new Set(spread.rows.map(row => row.tableId))]
    if (!exact(rollStackById, usedRollIds) || !exact(equipmentStackById, usedTableIds))
      return blocked('INCOMPLETE_PLY_STACK_POLICY')

    for (const rollId of usedRollIds) {
      const roll = rollStackById[rollId]
      if (!exact(roll, ['maxPlyThicknessMm', 'interleafThicknessMm']) ||
          !positive(roll.maxPlyThicknessMm) || !nonnegative(roll.interleafThicknessMm))
        return blocked('INVALID_ROLL_THICKNESS_DECLARATION', rollId)
    }
    for (const tableId of usedTableIds) {
      const machine = equipmentStackById[tableId]
      if (!exact(machine, [
        'maxLayStackHeightMm', 'spreaderHeadClearanceMm', 'clearanceReserveMm',
      ]) || !positive(machine.maxLayStackHeightMm) ||
          !positive(machine.spreaderHeadClearanceMm) ||
          !nonnegative(machine.clearanceReserveMm))
        return blocked('INVALID_STACK_EQUIPMENT_DECLARATION', tableId)
    }

    const rows = []
    for (const row of spread.rows) {
      const rollId = layPolicy.laysBySize[row.size][row.fabricId].rollId
      const fabric = rollStackById[rollId]
      const machine = equipmentStackById[row.tableId]
      const maxUncompressedStackHeightMm = row.plies * fabric.maxPlyThicknessMm +
        (row.plies - 1) * fabric.interleafThicknessMm
      const requiredClearanceMm = maxUncompressedStackHeightMm + machine.clearanceReserveMm
      const key = `${row.size}/${row.fabricId}/${rollId}/${row.tableId}`
      if (!positive(maxUncompressedStackHeightMm) || !positive(requiredClearanceMm))
        return blocked('PLY_STACK_HEIGHT_OVERFLOW', key)
      if (exceeds(requiredClearanceMm, machine.maxLayStackHeightMm))
        return blocked('MAX_LAY_STACK_HEIGHT_EXCEEDED', key)
      if (exceeds(requiredClearanceMm, machine.spreaderHeadClearanceMm))
        return blocked('SPREADER_HEAD_CLEARANCE_EXCEEDED', key)
      rows.push({size: row.size, fabricId: row.fabricId, rollId, tableId: row.tableId,
        plies: row.plies, maxPlyThicknessMm: fabric.maxPlyThicknessMm,
        interleafThicknessMm: fabric.interleafThicknessMm,
        maxUncompressedStackHeightMm, clearanceReserveMm: machine.clearanceReserveMm,
        requiredClearanceMm, maxLayStackHeightMm: machine.maxLayStackHeightMm,
        spreaderHeadClearanceMm: machine.spreaderHeadClearanceMm})
    }
    return {
      ok: true, status: 'LOCAL_DECLARED_PLY_STACK_CLEARANCE_INSPECTED', issues: [],
      rows, sizeCount: spread.sizeCount, fabricCount: spread.fabricCount,
      plyStackInspected: true, physicalThicknessVerified: false,
      calibratedEquipmentVerified: false, independentReceivingCadVerified: false,
      cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
      limitations: 'Conservative uncompressed stack estimates use caller-declared fabric '
        + 'maximum thickness, interleaf thickness and equipment clearances; no physical '
        + 'measurements, authenticated roll records or calibrated machine evidence. '
        + 'CUT inspection is not cutting authorization or factory release.',
    }
  } catch (error) {
    return blocked('PLY_STACK_INSPECTION_REFUSED', String(error?.message || error))
  }
}
