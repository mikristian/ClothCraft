// Opt-in CUT-boundary to internal-hole minimum fabric web inspection.
// Local geometric inspection never authorizes cutting or factory release.
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'
import {inspectIndustrialAamaInternalCutCoverage20261028} from './industrialAamaInternalCutCoverage20261028.mjs'

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const sameKeys = (x, names) => plain(x) && Object.keys(x).length === names.length &&
  names.every(name => Object.hasOwn(x, name))
const edges = poly => poly.map((p, i) => [p, poly[(i + 1) % poly.length]])
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const pointSegment = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy
  const t = d ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d)) : 0
  return dist(p, {x: a.x + dx * t, y: a.y + dy * t})
}
// The prior hole inspector checks only HOLE vertices against CUT segments.
// Reciprocal segment distance also catches a CUT vertex approaching the middle
// of a long hole edge, with neither hole vertex near the CUT boundary.
const segmentGap = ([a, b], [c, d]) => Math.min(
  pointSegment(a, c, d), pointSegment(b, c, d),
  pointSegment(c, a, b), pointSegment(d, a, b))
const fail = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], outerHoleWebInspected: false,
  receiverCadVerified: false, independentReceiverAuthenticated: false,
  aamaCertified: false, astmCertified: false, cuttingAuthorized: false,
  factoryApproved: false, manufacturingApproved: false,
})

/**
 * Complete caller-supplied per-size/piece hole inventories and outer-web minima
 * are mandatory. This checks geometry only; no fabric strength, cutter kerf,
 * physical sample, or independently licensed receiver is inferred.
 */
export function inspectIndustrialAamaOuterHoleWeb20261028(wiresBySize, {
  unit = null, holesBySize = null, minimumOuterWebMmBySize = null,
  toleranceMm = 0, minCutClearanceMm = 2,
} = {}) {
  try {
    if (!plain(holesBySize) || !sameKeys(wiresBySize, Object.keys(holesBySize)) ||
        Object.keys(holesBySize).length < 2 || Object.keys(holesBySize).length > 24 ||
        !sameKeys(minimumOuterWebMmBySize, Object.keys(holesBySize)) ||
        !['mm', 'cm', 'inch'].includes(unit) ||
        !Number.isFinite(toleranceMm) || toleranceMm < 0 || toleranceMm > 0.25 ||
        !Number.isFinite(minCutClearanceMm) || minCutClearanceMm < 0.5 ||
        minCutClearanceMm > 20)
      return fail('INVALID_AAMA_OUTER_HOLE_WEB_POLICY')
    const baseline = inspectIndustrialAamaInternalCutCoverage20261028(wiresBySize, {
      unit, holesBySize, minCutClearanceMm,
    })
    if (!baseline.ok)
      return fail('AAMA_OUTER_HOLE_WEB_BASELINE_BLOCKED', baseline.issues.map(i => i.code).join(', '))
    const rows = []
    let comparisons = 0
    for (const size of Object.keys(holesBySize)) {
      const pieces = parseSeamlyAamaManufacturingSemantics(wiresBySize[size], {unit}).pieces
      if (!sameKeys(minimumOuterWebMmBySize[size], pieces.map(p => p.name)))
        return fail('AAMA_OUTER_HOLE_WEB_PIECE_IDENTITY_DRIFT', size)
      for (const piece of pieces) {
        const required = minimumOuterWebMmBySize[size][piece.name]
        if (!Number.isFinite(required) || required < 1 || required > 30)
          return fail('INVALID_AAMA_OUTER_HOLE_WEB_PIECE_POLICY', `${size}: ${piece.name}`)
        const boundary = edges(piece.cutOutlineMm.points)
        let minimum = null
        for (let i = 0; i < piece.internalCuts.length; i++) {
          let gap = Infinity
          for (const holeEdge of edges(piece.internalCuts[i].points)) {
            for (const cutEdge of boundary) {
              if (++comparisons > 2000000)
                return fail('AAMA_OUTER_HOLE_WEB_COMPLEXITY_LIMIT')
              gap = Math.min(gap, segmentGap(holeEdge, cutEdge))
            }
          }
          minimum = minimum === null ? gap : Math.min(minimum, gap)
          if (gap + toleranceMm < required)
            return fail('AAMA_OUTER_HOLE_WEB_TOO_NARROW',
              `${size}: ${piece.name}: hole ${i + 1}, gap ${gap.toFixed(3)}mm < ${required}mm`)
        }
        rows.push({size, piece: piece.name, holeCount: piece.internalCuts.length,
          requiredMinimumOuterWebMm: required, measuredMinimumOuterWebMm: minimum})
      }
    }
    return {ok: true, status: 'LOCAL_AAMA_OUTER_HOLE_WEB_INSPECTED', issues: [],
      outerHoleWebInspected: true, sizeCount: Object.keys(holesBySize).length,
      edgeComparisons: comparisons, rows, independentReceiverAuthenticated: false,
      receiverCadVerified: false, aamaCertified: false, astmCertified: false,
      cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
      limitations: 'Local closed-hole to outer CUT boundary clearance only. Caller-supplied limits '
        + 'are not authenticated textile, cutter, licensed receiving CAD or factory evidence. '
        + 'CUT inspection never authorizes cutting.',
    }
  } catch (error) {
    return fail('AAMA_OUTER_HOLE_WEB_INSPECTION_REFUSED', String(error.message || error))
  }
}
