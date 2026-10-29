// Opt-in digital carriage travel and side-clearance inspection.
// Caller-declared machine limits are not authenticated physical measurements.
import {inspectIndustrialMarkerSpreadEnvelope20261029} from './industrialMarkerSpreadEnvelope20261029.mjs'

const record = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const exact = (x, keys) => record(x) && Object.keys(x).length === keys.length &&
  keys.every(key => Object.hasOwn(x, key))
const positive = x => typeof x === 'number' && Number.isFinite(x) && x > 0
const nonnegative = x => typeof x === 'number' && Number.isFinite(x) && x >= 0
const exceeds = (value, limit) => value > limit &&
  value - limit > 8 * Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(limit))
const blocked = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], rows: [],
  carriageEnvelopeInspected: false, physicalMachineVerified: false,
  independentReceivingCadVerified: false, cuttingAuthorized: false,
  factoryApproved: false, manufacturingApproved: false,
})

/**
 * The spreader carriage needs side clearance beyond the marker's full
 * declared fabric width and travel for head/tail carriage overshoot beyond
 * the continuous lay. Overshoot is NOT fabric end loss, table clamp length,
 * or roll consumption; it is a separate machine-travel requirement.
 * All dimensions in centimeters. One row is one independent lay session.
 */
export function inspectIndustrialMarkerCarriageEnvelope20261029(
  project, markerStudy, layPolicy, shadePolicy, spreadingPolicy,
  {carriageByTableId = null} = {},
) {
  try {
    const spread = inspectIndustrialMarkerSpreadEnvelope20261029(
      project, markerStudy, layPolicy, shadePolicy, spreadingPolicy)
    if (!spread.ok) return blocked('SPREADING_ENVELOPE_PREREQUISITE_BLOCKED', spread.issues)
    const tableIds = [...new Set(spread.rows.map(row => row.tableId))]
    if (!exact(carriageByTableId, tableIds))
      return blocked('INCOMPLETE_CARRIAGE_POLICY')
    for (const id of tableIds) {
      const carriage = carriageByTableId[id]
      if (!exact(carriage, [
        'leftSideMarginCm', 'rightSideMarginCm', 'carriageUsableWidthCm',
        'maxCarriageTravelCm', 'headTravelOverrunCm', 'tailTravelOverrunCm',
      ]) || !nonnegative(carriage.leftSideMarginCm) ||
          !nonnegative(carriage.rightSideMarginCm) ||
          !positive(carriage.carriageUsableWidthCm) ||
          !positive(carriage.maxCarriageTravelCm) ||
          !nonnegative(carriage.headTravelOverrunCm) ||
          !nonnegative(carriage.tailTravelOverrunCm))
        return blocked('INVALID_CARRIAGE_DECLARATION', id)
    }
    const rows = []
    for (const row of spread.rows) {
      const key = JSON.stringify([row.size, row.fabricId, row.tableId])
      const carriage = carriageByTableId[row.tableId]
      const marker = markerStudy.rows.find(m =>
        m.size === row.size && m.fabricId === row.fabricId)
      const markerWidthCm = marker?.marker?.metrics?.fabricWidth
      const tableWidthCm = spreadingPolicy.spreadingTableById[row.tableId]?.usableWidthCm
      if (!positive(markerWidthCm) || !positive(tableWidthCm))
        return blocked('CARRIAGE_MARKER_WIDTH_UNAVAILABLE', key)
      const requiredWidthCm = markerWidthCm +
        carriage.leftSideMarginCm + carriage.rightSideMarginCm
      const requiredTravelCm = row.requiredLayLengthCm +
        carriage.headTravelOverrunCm + carriage.tailTravelOverrunCm
      if (!positive(requiredWidthCm) || !positive(requiredTravelCm))
        return blocked('CARRIAGE_ENVELOPE_OVERFLOW', key)
      if (exceeds(requiredWidthCm, tableWidthCm))
        return blocked('CARRIAGE_TABLE_SIDE_CLEARANCE_EXCEEDED', key)
      if (exceeds(requiredWidthCm, carriage.carriageUsableWidthCm))
        return blocked('CARRIAGE_USABLE_WIDTH_EXCEEDED', key)
      if (exceeds(requiredTravelCm, carriage.maxCarriageTravelCm))
        return blocked('CARRIAGE_TRAVEL_EXCEEDED', key)
      rows.push({
        size: row.size, fabricId: row.fabricId, tableId: row.tableId,
        markerWidthCm, requiredWidthCm, tableWidthCm,
        carriageUsableWidthCm: carriage.carriageUsableWidthCm,
        requiredLayLengthCm: row.requiredLayLengthCm,
        requiredTravelCm, maxCarriageTravelCm: carriage.maxCarriageTravelCm,
      })
    }
    return {
      ok: true, status: 'LOCAL_DECLARED_CARRIAGE_ENVELOPE_INSPECTED',
      issues: [], rows, sizeCount: spread.sizeCount, fabricCount: spread.fabricCount,
      carriageEnvelopeInspected: true, physicalMachineVerified: false,
      independentReceivingCadVerified: false, cuttingAuthorized: false,
      factoryApproved: false, manufacturingApproved: false,
      limitations: 'All carriage widths, margins, travel limits and overshoots are ' +
        'caller-declared; no calibrated machine, physical fabric, cutter or ' +
        'external receiving-CAD acceptance evidence. CUT inspection is not ' +
        'cutting authorization or factory release.',
    }
  } catch (error) {
    return blocked('CARRIAGE_INSPECTION_REFUSED', String(error?.message || error))
  }
}
