// Opt-in CUT-to-separately-supplied STITCH geometry inspection.
// Seamly AAMA layer 8 is DRAW/INK, never a manufacturing sewline by inference.
// Geometry inspection is not independent CAD acceptance or cutting authorization.
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const sameKeys = (x, names) => plain(x) && Object.keys(x).length === names.length &&
  names.every(name => Object.hasOwn(x, name))
const finite = Number.isFinite
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const segmentDist = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy
  const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0
  return dist(p, {x: a.x + dx * t, y: a.y + dy * t})
}
const edges = poly => poly.map((a, i) => [a, poly[(i + 1) % poly.length]])
const edgeDist = (p, poly) => Math.min(...edges(poly).map(([a, b]) => segmentDist(p, a, b)))
const onSegment = (p, a, b) => Math.abs(cross(a, b, p)) < 1e-7 &&
  p.x >= Math.min(a.x, b.x) - 1e-7 && p.x <= Math.max(a.x, b.x) + 1e-7 &&
  p.y >= Math.min(a.y, b.y) - 1e-7 && p.y <= Math.max(a.y, b.y) + 1e-7
const intersects = (a, b, c, d) => {
  const abC = cross(a, b, c), abD = cross(a, b, d)
  const cdA = cross(c, d, a), cdB = cross(c, d, b)
  return (abC * abD < -1e-12 && cdA * cdB < -1e-12) ||
    onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b)
}
const validLoop = poly => {
  if (!Array.isArray(poly) || poly.length < 3 || poly.length > 512 ||
      poly.some(p => !sameKeys(p, ['x', 'y']) || !finite(p.x) || !finite(p.y))) return false
  const es = edges(poly)
  if (es.some(([a, b]) => dist(a, b) < .01)) return false
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    if (j === i + 1 || (i === 0 && j === es.length - 1)) continue
    if (intersects(...es[i], ...es[j])) return false
  }
  return Math.abs(poly.reduce((sum, p, i) => {
    const q = poly[(i + 1) % poly.length]
    return sum + p.x * q.y - q.x * p.y
  }, 0)) > 2
}
const inside = (p, poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) &&
        p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit
  }
  return hit
}
const sample = (poly, stepMm, fn) => {
  for (const [a, b] of edges(poly)) {
    const n = Math.ceil(dist(a, b) / stepMm)
    if (n > 2000) return false
    for (let i = 0; i <= n; i++) {
      const t = i / n
      if (!fn({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t})) return false
    }
  }
  return true
}
const fail = (code, detail = code) => ({ok: false, status: 'BLOCKED', issues: [{code, detail}],
  allowanceGeometryInspected: false, independentSewlineAuthenticated: false,
  receiverCadVerified: false, aamaCertified: false, astmCertified: false,
  cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false})

/** Inspect a per-size CUT against a distinct, explicitly supplied STITCH outline.
 * Caller assertions about stitchline origin are not authentication. Do not use
 * Seamly layer-8 DRAW as a substitute for independently defined sewline geometry.
 * Conservative planar-offset test; extreme corner geometry may fail closed.
 */
export function inspectIndustrialAamaAllowanceOffset20261028(wiresBySize, {
  unit = null, allowancesBySize = null, toleranceMm = 1, sampleStepMm = 4,
} = {}) {
  try {
    if (!plain(allowancesBySize) || !sameKeys(wiresBySize, Object.keys(allowancesBySize)) ||
        Object.keys(allowancesBySize).length < 2 || Object.keys(allowancesBySize).length > 24 ||
        !['mm', 'cm', 'inch'].includes(unit) || !finite(toleranceMm) ||
        toleranceMm < 0 || toleranceMm > 2 || !finite(sampleStepMm) ||
        sampleStepMm < 1 || sampleStepMm > 5) return fail('INVALID_AAMA_ALLOWANCE_POLICY')
    const rows = []
    for (const size of Object.keys(allowancesBySize)) {
      if (typeof wiresBySize[size] !== 'string') return fail('MISSING_AAMA_ALLOWANCE_SIZE', size)
      const parsed = parseSeamlyAamaManufacturingSemantics(wiresBySize[size], {unit})
      if (!sameKeys(allowancesBySize[size], parsed.pieces.map(piece => piece.name)))
        return fail('AAMA_ALLOWANCE_PIECE_IDENTITY_DRIFT', size)
      for (const piece of parsed.pieces) {
        const spec = allowancesBySize[size][piece.name]
        if (!sameKeys(spec, ['expectedAllowanceMm', 'stitchOutlineMm', 'stitchSource']) ||
            spec.stitchSource !== 'separately-supplied-manufacturing-sewline' ||
            !finite(spec.expectedAllowanceMm) || spec.expectedAllowanceMm < 1 ||
            spec.expectedAllowanceMm > 40 || !validLoop(spec.stitchOutlineMm))
          return fail('INVALID_AAMA_STITCH_EVIDENCE', `${size}: ${piece.name}`)
        const cut = piece.cutOutlineMm.points, stitch = spec.stitchOutlineMm
        if (!validLoop(cut)) return fail('INVALID_AAMA_CUT_TOPOLOGY', `${size}: ${piece.name}`)
        if (edges(stitch).some(s => edges(cut).some(c => intersects(...s, ...c))) ||
            !stitch.every(p => inside(p, cut)))
          return fail('AAMA_STITCH_OUTSIDE_CUT', `${size}: ${piece.name}`)
        const target = spec.expectedAllowanceMm
        if (!sample(stitch, sampleStepMm, p =>
          Math.abs(edgeDist(p, cut) - target) <= toleranceMm))
          return fail('AAMA_ALLOWANCE_OFFSET_DRIFT', `${size}: ${piece.name}`)
        // Reciprocal coverage detects missing/shortened stitch sections. Allow
        // corner diagonals up to 2x nominal offset; reject complex corner cases.
        if (!sample(cut, sampleStepMm, p => {
          const d = edgeDist(p, stitch)
          return d >= target - toleranceMm && d <= 2 * target + toleranceMm
        })) return fail('AAMA_ALLOWANCE_RECIPROCAL_DRIFT', `${size}: ${piece.name}`)
        rows.push({size, piece: piece.name, nominalAllowanceMm: target,
          stitchSource: spec.stitchSource, geometricOffsetInspected: true})
      }
    }
    return {ok: true, status: 'LOCAL_AAMA_ALLOWANCE_GEOMETRY_INSPECTED', issues: [],
      sizeCount: Object.keys(allowancesBySize).length, rows, allowanceGeometryInspected: true,
      independentSewlineAuthenticated: false, receiverCadVerified: false,
      aamaCertified: false, astmCertified: false, cuttingAuthorized: false,
      factoryApproved: false, manufacturingApproved: false,
      limitations: 'Separate caller-supplied sewline geometry is NOT independently authenticated. '
        + 'Seamly layer-8 DRAW is not a manufacturing STITCH declaration. '
        + 'Local conservative planar CUT-to-STITCH offset inspection only; no '
        + 'factory release, cutter qualification or receiving-CAD acceptance.'}
  } catch (error) {
    return fail('AAMA_ALLOWANCE_INSPECTION_REFUSED', String(error.message || error))
  }
}
