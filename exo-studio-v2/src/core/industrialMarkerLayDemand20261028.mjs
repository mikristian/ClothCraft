// Opt-in factory ORDER/ROLL/LAY planning inspection on top of a successful
// digital marker/CUT study. No physical spreading, cutter or factory authority.
import {fingerprintIndustrialMarkerSource20261029, fingerprintIndustrialMarkerStudy20261029} from './industrialMarkerSourceFreshness20261029.mjs'
import {inspectIndustrialManualMarkerStudy20261029, getLocallyVerifiedIndustrialManualMarkerStudyDigest20261029} from './industrialManualMarkerStudy20261029.mjs'
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const exact = (x, names) => object(x) && Object.keys(x).length === names.length &&
  names.every(name => Object.hasOwn(x, name))
const positiveInt = x => Number.isSafeInteger(x) && x > 0
const finitePositive = x => typeof x === 'number' && Number.isFinite(x) && x > 0
const fail = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], rows: [],
  layDemandInspected: false, receiverCadVerified: false, physicalRollVerified: false,
  physicalLayVerified: false, cuttingAuthorized: false, factoryApproved: false,
  manufacturingApproved: false,
})

/**
 * An individual graded marker covers one garment per ply/repeat, with exactly
 * the authored cutQuantity of EACH piece. Explicit per-size garment orders,
 * per-fabric lay recipes, and roll capacities must reconcile without silently
 * undercutting, overcutting, substituting fabrics, or exceeding roll length.
 * This is a DIGITAL estimate only: the caller's roll measurements/order are
 * not independently authenticated and no factory release is possible here.
 */
export function inspectIndustrialMarkerLayDemand20261028(project, markerStudy, {
  ordersBySize = null, laysBySize = null, rollsById = null,
} = {}) {
  try {
    const sizes = project?.grading?.sizes
    const pieces = project?.pieces
    if (!Array.isArray(sizes) || sizes.length < 2 || sizes.length > 24 ||
        new Set(sizes).size !== sizes.length || !Array.isArray(pieces) ||
        !pieces.length || pieces.length > 80 ||
        pieces.some(p => !p || typeof p.id !== 'string' || !p.id ||
          typeof (p.fabricId || 'main') !== 'string' ||
          !positiveInt(p.cutQuantity ?? 1)) ||
        new Set(pieces.map(p => p.id)).size !== pieces.length ||
        !exact(ordersBySize, sizes) || !exact(laysBySize, sizes) ||
        !object(rollsById) || !Object.keys(rollsById).length)
      return fail('INVALID_LAY_DEMAND_POLICY')

    const fabrics = [...new Set(pieces.map(p => p.fabricId || 'main'))]
    // A manually edited placement cannot claim it is unchanged from the DXF-
    // checked automatic nest. Accept the separately tagged source-derived
    // geometry replay here; the unified preflight independently compares
    // its whole study against a locally regenerated witness.
    const provenance = markerStudy?.manualMarkerEditsV1 === undefined
      ? markerStudy?.referenceMarkerParity === true
      : markerStudy?.referenceMarkerParity === false &&
        markerStudy?.originalAutoMarkerParity === true &&
        markerStudy?.manualSourceCutGeometryVerified === true &&
        Array.isArray(markerStudy?.manualMarkerEditsV1) &&
        markerStudy.manualMarkerEditsV1.length > 0
    if (markerStudy?.ok !== true || !provenance ||
        !Array.isArray(markerStudy.sourceSizes) ||
        markerStudy.sourceSizes.length !== sizes.length ||
        markerStudy.sourceSizes.some((size, i) => size !== sizes[i]) ||
        !Array.isArray(markerStudy.rows) ||
        markerStudy.rows.length !== sizes.length * fabrics.length)
      return fail('MARKER_LAY_PREREQUISITE_BLOCKED')

    // The manual geometry flag is merely a JSON declaration; for manual
    // layouts we require a whole-study witness built from the CURRENT source,
    // including edited CUTs, mark transfer, dimensions and the edit journal.
    // On cold process restart, recompute rather than trusting a retained hash.
    if (markerStudy.manualMarkerEditsV1 !== undefined) {
      const sourceSha = fingerprintIndustrialMarkerSource20261029(project)
      if (!sourceSha || sourceSha !== markerStudy.sourceProjectSha256)
        return fail('STALE_MANUAL_MARKER_LAY_SOURCE')
      const options = markerStudy.markerBuildOptions
      let expected = getLocallyVerifiedIndustrialManualMarkerStudyDigest20261029(
        sourceSha, options, markerStudy.manualMarkerEditsV1)
      if (!expected) {
        const rebuilt = inspectIndustrialManualMarkerStudy20261029(
          project, markerStudy.manualMarkerEditsV1, options)
        expected = rebuilt?.ok ? fingerprintIndustrialMarkerStudy20261029(rebuilt) : null
      }
      if (!expected || expected !== fingerprintIndustrialMarkerStudy20261029(markerStudy))
        return fail('MANUAL_MARKER_LAY_SOURCE_WITNESS_MISMATCH')
    }

    const rolls = new Map()
    for (const [id, roll] of Object.entries(rollsById)) {
      if (!id || !exact(roll, ['fabricId', 'usableWidthCm', 'availableLengthCm']) ||
          !fabrics.includes(roll.fabricId) ||
          !finitePositive(roll.usableWidthCm) ||
          !finitePositive(roll.availableLengthCm))
        return fail('INVALID_LAY_ROLL_DECLARATION', id)
      rolls.set(id, {...roll, consumedLengthCm: 0})
    }

    const expectedRows = new Map()
    for (const size of sizes) {
      if (!positiveInt(ordersBySize[size]) ||
          !exact(laysBySize[size], fabrics))
        return fail('INVALID_LAY_SIZE_ORDER', size)
      for (const fabricId of fabrics) {
        const key = JSON.stringify([size, fabricId])
        expectedRows.set(key, {size, fabricId})
      }
    }

    const rows = []
    for (const row of markerStudy.rows) {
      const key = JSON.stringify([row?.size, row?.fabricId])
      if (!expectedRows.has(key))
        return fail('MARKER_LAY_SIZE_FABRIC_DRIFT', key)
      expectedRows.delete(key)
      if (row.ok !== true || row.marker?.ok !== true ||
          row.cutterStudy?.ok !== true || row.markTransfer?.ok !== true ||
          !Array.isArray(row.marker.placements) ||
          !finitePositive(row.marker.metrics?.length) ||
          !finitePositive(row.marker.metrics?.fabricWidth))
        return fail('MARKER_LAY_PREREQUISITE_BLOCKED', key)

      // One complete marker must contain exactly the required cut instances.
      const expected = new Set()
      for (const piece of pieces.filter(p => (p.fabricId || 'main') === row.fabricId)) {
        for (let i = 0; i < (piece.cutQuantity ?? 1); i++)
          expected.add(JSON.stringify([piece.id, i]))
      }
      let occupiedLengthCm = 0
      for (const placement of row.marker.placements) {
        const identity = JSON.stringify([placement?.pieceId, placement?.instance])
        if (!expected.delete(identity))
          return fail('MARKER_LAY_PIECE_INVENTORY_DRIFT', key)
        if (![placement.x, placement.y, placement.width, placement.height].every(Number.isFinite) ||
            placement.width <= 0 || placement.height <= 0 ||
            placement.x < -1e-6 || placement.y < -1e-6 ||
            placement.x + placement.width > row.marker.metrics.fabricWidth + 1e-6)
          return fail('MARKER_LAY_PLACEMENT_WIDTH_DRIFT', key)
        occupiedLengthCm = Math.max(occupiedLengthCm, placement.y + placement.height)
      }
      if (expected.size)
        return fail('MARKER_LAY_PIECE_INVENTORY_DRIFT', key)
      if (Math.abs(occupiedLengthCm - row.marker.metrics.length) > 1e-5 ||
          row.marker.metrics.placed !== row.marker.placements.length ||
          row.marker.metrics.requested !== row.marker.placements.length)
        return fail('MARKER_LAY_METRIC_INVENTORY_DRIFT', key)

      const lay = laysBySize[row.size][row.fabricId]
      if (!exact(lay, ['rollId', 'plies', 'markerRepeats', 'endLossCmPerPly']) ||
          typeof lay.rollId !== 'string' || !positiveInt(lay.plies) ||
          !positiveInt(lay.markerRepeats) ||
          !Number.isFinite(lay.endLossCmPerPly) ||
          lay.endLossCmPerPly < 0 || lay.endLossCmPerPly > 100)
        return fail('INVALID_LAY_RECIPE', key)
      const roll = rolls.get(lay.rollId)
      if (!roll || roll.fabricId !== row.fabricId)
        return fail('MARKER_LAY_ROLL_FABRIC_MISMATCH', key)
      if (row.marker.metrics.fabricWidth > roll.usableWidthCm + 1e-6)
        return fail('MARKER_LAY_ROLL_TOO_NARROW', key)
      const garments = lay.plies * lay.markerRepeats
      if (!Number.isSafeInteger(garments) || garments !== ordersBySize[row.size])
        return fail('MARKER_LAY_ORDER_QUANTITY_DRIFT', key)
      // Repeated markers are contiguous along EACH ply. The declared end loss
      // is per ply, not per marker repeat: multiplying it by garment yield
      // overstates consumption and can falsely reject a feasible roll plan.
      // If a factory cuts each repeat as a separate lay, that requires a
      // separate lay recipe rather than silently charging extra end losses.
      const lengthCm = lay.plies * (
        row.marker.metrics.length * lay.markerRepeats + lay.endLossCmPerPly
      )
      if (!Number.isFinite(lengthCm) || lengthCm <= 0)
        return fail('MARKER_LAY_LENGTH_OVERFLOW', key)
      roll.consumedLengthCm += lengthCm
      if (!Number.isFinite(roll.consumedLengthCm) ||
          roll.consumedLengthCm > roll.availableLengthCm + 1e-6)
        return fail('MARKER_LAY_ROLL_LENGTH_EXCEEDED', lay.rollId)
      rows.push({size: row.size, fabricId: row.fabricId, rollId: lay.rollId,
        garmentDemand: ordersBySize[row.size], plies: lay.plies,
        markerRepeats: lay.markerRepeats, markerLengthCm: row.marker.metrics.length,
        endLossCmPerPly: lay.endLossCmPerPly, estimatedRollConsumptionCm: lengthCm,
        markerPieceInstances: row.marker.placements.length})
    }
    if (expectedRows.size) return fail('MARKER_LAY_MISSING_SIZE_FABRIC')
    return {
      ok: true, status: 'LOCAL_MARKER_LAY_DEMAND_INSPECTED', issues: [], rows,
      sizeCount: sizes.length, fabricCount: fabrics.length,
      rollEstimates: [...rolls.entries()].map(([rollId, roll]) => ({
        rollId, fabricId: roll.fabricId, availableLengthCm: roll.availableLengthCm,
        estimatedConsumedLengthCm: roll.consumedLengthCm,
      })),
      layDemandInspected: true, receiverCadVerified: false,
      physicalRollVerified: false, physicalLayVerified: false,
      cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
      limitations: 'Caller-supplied order, lay recipe and roll length are NOT authenticated '
        + 'physical factory evidence. Digital marker/roll demand inspection does not '
        + 'authorize spreading, physical CUT, or factory release.',
    }
  } catch (error) {
    return fail('MARKER_LAY_INSPECTION_REFUSED', String(error.message || error))
  }
}
