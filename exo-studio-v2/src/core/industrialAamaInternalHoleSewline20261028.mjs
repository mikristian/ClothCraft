// Opt-in local inspection of explicit sewlines around AAMA layer-11 closed holes.
// A passing CUT/STITCH geometry inspection is NEVER authorization to cut.
import {inspectIndustrialAamaStitchHoleClearance20261028} from './industrialAamaStitchHoleClearance20261028.mjs'
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const keys = (x, names) => plain(x) && Object.keys(x).length === names.length &&
  names.every(n => Object.hasOwn(x, n))
const fail = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}],
  internalHoleSewlinesInspected: false, independentSewlineAuthenticated: false,
  receiverCadVerified: false, aamaCertified: false, astmCertified: false,
  cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
})
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const edges = poly => poly.map((p, i) => [p, poly[(i + 1) % poly.length]])
const onSegment = (p, a, b) => Math.abs(cross(a, b, p)) <= 1e-7 &&
  p.x >= Math.min(a.x, b.x) - 1e-7 && p.x <= Math.max(a.x, b.x) + 1e-7 &&
  p.y >= Math.min(a.y, b.y) - 1e-7 && p.y <= Math.max(a.y, b.y) + 1e-7
const intersect = (a, b, c, d) => {
  const s = cross(a, b, c), t = cross(a, b, d)
  const u = cross(c, d, a), v = cross(c, d, b)
  return (s * t < -1e-12 && u * v < -1e-12) ||
    onSegment(a, c, d) || onSegment(b, c, d) ||
    onSegment(c, a, b) || onSegment(d, a, b)
}
const overlaps = (a, b) => edges(a).some(e => edges(b).some(f => intersect(...e, ...f)))
const inside = (p, poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) &&
        p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit
  }
  return hit
}
const segmentDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return distance(p, {x: a.x + dx * t, y: a.y + dy * t})
}
const edgeDistance = (p, poly) =>
  Math.min(...edges(poly).map(([a, b]) => segmentDistance(p, a, b)))
const loop = poly => {
  if (!Array.isArray(poly) || poly.length < 3 || poly.length > 256 ||
      poly.some(p => !keys(p, ['x', 'y']) || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false
  const e = edges(poly)
  if (e.some(([a, b]) => distance(a, b) < 0.01)) return false
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) {
    if (j === i + 1 || (i === 0 && j === e.length - 1)) continue
    if (intersect(...e[i], ...e[j])) return false
  }
  return Math.abs(poly.reduce((sum, p, i) => {
    const q = poly[(i + 1) % poly.length]
    return sum + p.x * q.y - q.x * p.y
  }, 0)) > 2
}
const samples = (poly, step, predicate) => {
  for (const [a, b] of edges(poly)) {
    const n = Math.ceil(distance(a, b) / step)
    if (n > 2000) return false
    for (let i = 0; i <= n; i++) {
      const t = i / n
      if (!predicate({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t})) return false
    }
  }
  return true
}

/** Require a distinct inner sewline outside each closed hole, with all-size
 * explicit policy. Source labels are assertions, not authentication.
 * Conservative planar inspection; unsupported corner cases fail closed.
 */
export function inspectIndustrialAamaInternalHoleSewline20261028(wiresBySize, {
  unit = null, allowancesBySize = null, holesBySize = null,
  holeSewlinesBySize = null, minStitchToHoleMm = null,
  toleranceMm = 1, sampleStepMm = 4,
} = {}) {
  try {
    if (!plain(holeSewlinesBySize) || !plain(allowancesBySize) ||
        !keys(holeSewlinesBySize, Object.keys(allowancesBySize)) ||
        !Number.isFinite(toleranceMm) || toleranceMm < 0 || toleranceMm > 2 ||
        !Number.isFinite(sampleStepMm) || sampleStepMm < 1 || sampleStepMm > 5)
      return fail('INVALID_AAMA_HOLE_SEWLINE_POLICY')
    const prior = inspectIndustrialAamaStitchHoleClearance20261028(wiresBySize, {
      unit, allowancesBySize, holesBySize, minStitchToHoleMm,
      toleranceMm, sampleStepMm,
    })
    if (!prior.ok) return fail('AAMA_HOLE_SEWLINE_PREREQUISITE_BLOCKED', prior.issues)
    const rows = []
    for (const size of Object.keys(allowancesBySize)) {
      const parsed = parseSeamlyAamaManufacturingSemantics(wiresBySize[size], {unit})
      if (!keys(holeSewlinesBySize[size], parsed.pieces.map(p => p.name)))
        return fail('AAMA_HOLE_SEWLINE_PIECE_IDENTITY_DRIFT', size)
      for (const piece of parsed.pieces) {
        const sewlines = holeSewlinesBySize[size][piece.name]
        const holes = piece.internalCuts.map(p => p.points)
        if (!Array.isArray(sewlines) || sewlines.length !== holes.length)
          return fail('AAMA_HOLE_SEWLINE_COUNT_DRIFT', `${size}: ${piece.name}`)
        const outerStitch = allowancesBySize[size][piece.name].stitchOutlineMm
        const inspected = []
        for (let i = 0; i < holes.length; i++) {
          const spec = sewlines[i]
          if (!keys(spec, ['expectedAllowanceMm', 'stitchOutlineMm', 'stitchSource']) ||
              spec.stitchSource !== 'separately-supplied-manufacturing-sewline' ||
              !Number.isFinite(spec.expectedAllowanceMm) ||
              spec.expectedAllowanceMm < 1 || spec.expectedAllowanceMm > 40 ||
              !loop(spec.stitchOutlineMm))
            return fail('INVALID_AAMA_HOLE_SEWLINE_EVIDENCE', `${size}: ${piece.name}: ${i}`)
          const hole = holes[i], stitch = spec.stitchOutlineMm
          if (overlaps(hole, stitch) || !hole.every(p => inside(p, stitch)) ||
              stitch.some(p => inside(p, hole)) ||
              overlaps(stitch, outerStitch) || !stitch.every(p => inside(p, outerStitch)))
            return fail('AAMA_HOLE_SEWLINE_TOPOLOGY_DRIFT', `${size}: ${piece.name}: ${i}`)
          const target = spec.expectedAllowanceMm
          // Reciprocal sampling catches both too-wide/too-narrow allowances
          // and shortened/oversized loops. Corner diagonals may reach sqrt(2).
          if (!samples(hole, sampleStepMm, p =>
            Math.abs(edgeDistance(p, stitch) - target) <= toleranceMm) ||
              !samples(stitch, sampleStepMm, p => {
                const d = edgeDistance(p, hole)
                return d >= target - toleranceMm &&
                  d <= Math.SQRT2 * target + toleranceMm
              }))
            return fail('AAMA_HOLE_SEWLINE_OFFSET_DRIFT', `${size}: ${piece.name}: ${i}`)
          // An inner stitch must not pass through another hole or its sewline.
          if (holes.some((other, j) => j !== i &&
              (overlaps(stitch, other) || inside(other[0], stitch) || inside(stitch[0], other))) ||
              inspected.some(other => overlaps(stitch, other) ||
                inside(other[0], stitch) || inside(stitch[0], other)))
            return fail('AAMA_HOLE_SEWLINE_COLLISION', `${size}: ${piece.name}: ${i}`)
          inspected.push(stitch)
          rows.push({size, piece: piece.name, holeIndex: i,
            nominalHoleAllowanceMm: target, geometricOffsetInspected: true})
        }
      }
    }
    return {ok: true, status: 'LOCAL_AAMA_INTERNAL_HOLE_SEWLINES_INSPECTED',
      issues: [], sizeCount: Object.keys(allowancesBySize).length,
      rows, internalHoleSewlinesInspected: true,
      independentSewlineAuthenticated: false, receiverCadVerified: false,
      aamaCertified: false, astmCertified: false, cuttingAuthorized: false,
      factoryApproved: false, manufacturingApproved: false,
      limitations: 'Local explicit inner CUT-to-STITCH geometry only; sewlines are caller-supplied, not authenticated. No third-party receiving CAD, physical sample, cutter qualification or factory release.'}
  } catch (error) {
    return fail('AAMA_HOLE_SEWLINE_INSPECTION_REFUSED', String(error.message || error))
  }
}
