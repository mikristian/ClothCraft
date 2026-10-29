// Opt-in inspection of caller-declared spreading-table and machine envelopes.
// A passing digital geometry check is NOT permission to spread or CUT fabric.
import {inspectIndustrialMarkerLayDemand20261028} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerShadeLotGuard20261028} from './industrialMarkerShadeLotGuard20261028.mjs'

const record = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const exact = (x, keys) => record(x) && Object.keys(x).length === keys.length &&
  keys.every(key => Object.hasOwn(x, key))
const positive = x => typeof x === 'number' && Number.isFinite(x) && x > 0
const nonnegative = x => typeof x === 'number' && Number.isFinite(x) && x >= 0
const positiveInt = x => Number.isSafeInteger(x) && x > 0
// Ignore only binary floating-point rounding at an exactly equal boundary;
// do not introduce a physical manufacturing clearance tolerance.
const exceeds = (value, limit) => value > limit &&
  value - limit > 8 * Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(limit))
const blocked = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], rows: [],
  spreadingEnvelopeInspected: false, physicalTableVerified: false,
  physicalLayVerified: false, independentReceivingCadVerified: false,
  cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
})

/**
 * One marker row is a single contiguous lay, repeated along EACH ply. Table
 * occupancy is markerLength * markerRepeats + endLoss PER PLY, NOT multiplied
 * by ply count. Clamp zones are excluded from the gross table length and must
 * not be counted again as end loss. Separate rows are separate lay sessions;
 * this does not inspect simultaneous placement or roll-defect genealogy.
 * All dimensions are centimeters. All equipment declarations are unverified.
 */
export function inspectIndustrialMarkerSpreadEnvelope20261029(
  project, markerStudy, layPolicy, shadePolicy,
  {spreadingTableById = null, tableBySizeFabric = null} = {},
) {
  try {
    const shade = inspectIndustrialMarkerShadeLotGuard20261028(
      project, markerStudy, layPolicy, shadePolicy,
    )
    if (!shade.ok) return blocked('SHADE_LOT_PREREQUISITE_BLOCKED', shade.issues)
    const lay = inspectIndustrialMarkerLayDemand20261028(project, markerStudy, layPolicy)
    if (!lay.ok) return blocked('LAY_DEMAND_PREREQUISITE_BLOCKED', lay.issues)
    const sizes = project.grading.sizes
    const fabrics = [...new Set(project.pieces.map(p => p.fabricId || 'main'))]
    if (!record(spreadingTableById) || !Object.keys(spreadingTableById).length ||
        !exact(tableBySizeFabric, sizes))
      return blocked('INCOMPLETE_SPREADING_ENVELOPE_POLICY')

    const tables = new Map()
    for (const [id, table] of Object.entries(spreadingTableById)) {
      if (!id || !exact(table, [
        'grossTableLengthCm', 'headClampCm', 'tailClampCm',
        'maxContinuousLayCm', 'usableWidthCm', 'maxPlyCount',
      ]) || !positive(table.grossTableLengthCm) ||
          !nonnegative(table.headClampCm) || !nonnegative(table.tailClampCm) ||
          !positive(table.maxContinuousLayCm) || !positive(table.usableWidthCm) ||
          !positiveInt(table.maxPlyCount) || table.maxPlyCount > 1000)
        return blocked('INVALID_SPREADING_TABLE_DECLARATION', id)
      const usableLengthCm = table.grossTableLengthCm - table.headClampCm - table.tailClampCm
      if (!Number.isFinite(usableLengthCm) || usableLengthCm <= 0)
        return blocked('INVALID_SPREADING_TABLE_CLAMP_ZONES', id)
      tables.set(id, {...table, usableLengthCm})
    }

    for (const size of sizes)
      if (!exact(tableBySizeFabric[size], fabrics))
        return blocked('INCOMPLETE_SPREADING_TABLE_ASSIGNMENTS', size)

    const rows = []
    const used = new Set()
    for (const row of lay.rows) {
      const key = JSON.stringify([row.size, row.fabricId])
      const tableId = tableBySizeFabric[row.size][row.fabricId]
      if (typeof tableId !== 'string' || !tableId || !tables.has(tableId))
        return blocked('UNKNOWN_SPREADING_TABLE_ASSIGNMENT', key)
      const table = tables.get(tableId)
      used.add(tableId)
      if (row.plies > table.maxPlyCount)
        return blocked('SPREADING_TABLE_PLY_LIMIT_EXCEEDED', key)
      if (row.markerLengthCm <= 0 || !Number.isFinite(row.markerLengthCm) ||
          !positiveInt(row.markerRepeats) || !nonnegative(row.endLossCmPerPly))
        return blocked('INVALID_SPREADING_LAY_LENGTH', key)
      const markerRow = markerStudy.rows.find(m => m.size === row.size && m.fabricId === row.fabricId)
      if (!markerRow || !positive(markerRow.marker?.metrics?.fabricWidth))
        return blocked('SPREADING_MARKER_WIDTH_UNAVAILABLE', key)
      if (markerRow.marker.metrics.fabricWidth > table.usableWidthCm)
        return blocked('SPREADING_TABLE_WIDTH_EXCEEDED', key)

      const requiredLayLengthCm = row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly
      if (!positive(requiredLayLengthCm))
        return blocked('INVALID_SPREADING_LAY_LENGTH', key)
      if (exceeds(requiredLayLengthCm, table.usableLengthCm))
        return blocked('SPREADING_TABLE_USABLE_LENGTH_EXCEEDED', key)
      if (exceeds(requiredLayLengthCm, table.maxContinuousLayCm))
        return blocked('SPREADING_MACHINE_CONTINUOUS_LAY_EXCEEDED', key)
      rows.push({size: row.size, fabricId: row.fabricId, tableId,
        plies: row.plies, markerRepeats: row.markerRepeats,
        markerLengthCm: row.markerLengthCm, endLossCmPerPly: row.endLossCmPerPly,
        requiredLayLengthCm, grossTableLengthCm: table.grossTableLengthCm,
        usableTableLengthCm: table.usableLengthCm,
        maxContinuousLayCm: table.maxContinuousLayCm,
        estimatedRollConsumptionCm: row.estimatedRollConsumptionCm})
    }
    if (used.size !== tables.size)
      return blocked('UNUSED_SPREADING_TABLE_DECLARATION')
    return {
      ok: true, status: 'LOCAL_SPREADING_ENVELOPE_INSPECTED', issues: [], rows,
      sizeCount: lay.sizeCount, fabricCount: lay.fabricCount,
      spreadingEnvelopeInspected: true, physicalTableVerified: false,
      physicalLayVerified: false, independentReceivingCadVerified: false,
      cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
      limitations: 'Equipment dimensions, clamp zones, ply limits and assignments are '
        + 'caller-declared, not calibrated or authenticated. One row is one lay session. '
        + 'This inspection does not verify roll defects, actual spreading, receiving CAD, '
        + 'cutter qualification, physical CUT or factory release.',
    }
  } catch (error) {
    return blocked('SPREADING_ENVELOPE_INSPECTION_REFUSED', String(error?.message || error))
  }
}
