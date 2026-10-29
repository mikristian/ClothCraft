// Opt-in AAMA layer-11 internal CUT inspection. A passing inspection NEVER
// authorizes a physical cutter, factory release, or third-party CAD acceptance.
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const sameKeys = (x, names) => plain(x) && Object.keys(x).length === names.length &&
  names.every(name => Object.hasOwn(x, name))
const finite = Number.isFinite
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const onSegment = (p, a, b, eps = 1e-7) => Math.abs(cross(a, b, p)) <= eps &&
  p.x >= Math.min(a.x, b.x) - eps && p.x <= Math.max(a.x, b.x) + eps &&
  p.y >= Math.min(a.y, b.y) - eps && p.y <= Math.max(a.y, b.y) + eps
const intersects = (a, b, c, d) => {
  const abC = cross(a, b, c), abD = cross(a, b, d)
  const cdA = cross(c, d, a), cdB = cross(c, d, b)
  return (abC * abD < -1e-12 && cdA * cdB < -1e-12) ||
    onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b)
}
const segmentDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return dist(p, {x: a.x + t * dx, y: a.y + t * dy})
}
const edges = poly => poly.map((a, i) => [a, poly[(i + 1) % poly.length]])
const edgeDistance = (p, poly) => Math.min(...edges(poly).map(([a, b]) => segmentDistance(p, a, b)))
const inside = (p, poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit
  }
  return hit
}
const simple = poly => {
  if (poly.length < 3 || poly.length > 256 || poly.some(p => !finite(p.x) || !finite(p.y))) return false
  const e = edges(poly)
  if (e.some(([a, b]) => dist(a, b) < 0.01)) return false
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) {
    if (j === i + 1 || (i === 0 && j === e.length - 1)) continue
    if (intersects(...e[i], ...e[j])) return false
  }
  return true
}
const area = poly => Math.abs(poly.reduce((sum, p, i) => {
  const q = poly[(i + 1) % poly.length]
  return sum + p.x * q.y - q.x * p.y
}, 0)) / 2
const perimeter = poly => edges(poly).reduce((sum, [a, b]) => sum + dist(a, b), 0)
const bounds = poly => ({minX: Math.min(...poly.map(p => p.x)), maxX: Math.max(...poly.map(p => p.x)),
  minY: Math.min(...poly.map(p => p.y)), maxY: Math.max(...poly.map(p => p.y))})
const uv = (p, b) => ({u: (p.x - b.minX) / (b.maxX - b.minX),
  v: (p.y - b.minY) / (b.maxY - b.minY)})
const centroid = poly => {
  let twice = 0, x = 0, y = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], w = p.x * q.y - q.x * p.y
    twice += w; x += (p.x + q.x) * w; y += (p.y + q.y) * w
  }
  return {x: x / (3 * twice), y: y / (3 * twice)}
}
const fail = (code, detail = code) => ({ok: false, status: 'BLOCKED', issues: [{code, detail}],
  internalCutsInspected: false, receiverCadVerified: false, independentReceiverAuthenticated: false,
  aamaCertified: false, astmCertified: false, cuttingAuthorized: false,
  factoryApproved: false, manufacturingApproved: false})

/** Explicit per-size/piece expectations, independently supplied by the caller.
 * Only CLOSED layer-11 holes are supported; open slits are deliberately blocked.
 * No layer-8 DRAW contour is inferred to be a production STITCH/seam allowance.
 */
export function inspectIndustrialAamaInternalCutCoverage20261028(wiresBySize, {
  unit = null, holesBySize = null, minCutClearanceMm = 2,
  centerToleranceMm = 3, areaToleranceMm2 = 10, perimeterToleranceMm = 5,
} = {}) {
  try {
    if (!plain(holesBySize) || !sameKeys(wiresBySize, Object.keys(holesBySize)) ||
        Object.keys(holesBySize).length < 2 || Object.keys(holesBySize).length > 24 ||
        !['mm', 'cm', 'inch'].includes(unit) ||
        !finite(minCutClearanceMm) || minCutClearanceMm < 0.5 || minCutClearanceMm > 20 ||
        !finite(centerToleranceMm) || centerToleranceMm < 0 || centerToleranceMm > 10 ||
        !finite(areaToleranceMm2) || areaToleranceMm2 < 0 || areaToleranceMm2 > 50 ||
        !finite(perimeterToleranceMm) || perimeterToleranceMm < 0 || perimeterToleranceMm > 20)
      return fail('INVALID_AAMA_INTERNAL_CUT_POLICY')
    const rows = []
    for (const size of Object.keys(holesBySize)) {
      if (typeof wiresBySize[size] !== 'string' || !plain(holesBySize[size]))
        return fail('INVALID_AAMA_INTERNAL_CUT_SIZE', size)
      const parsed = parseSeamlyAamaManufacturingSemantics(wiresBySize[size], {unit})
      if (!sameKeys(holesBySize[size], parsed.pieces.map(p => p.name)))
        return fail('AAMA_INTERNAL_CUT_PIECE_IDENTITY_DRIFT', size)
      for (const piece of parsed.pieces) {
        const specs = holesBySize[size][piece.name]
        if (!Array.isArray(specs) || specs.length > 32 || specs.some(s =>
          !sameKeys(s, ['centerUv', 'areaMm2', 'perimeterMm']) ||
          !sameKeys(s.centerUv, ['u', 'v']) ||
          !finite(s.centerUv.u) || s.centerUv.u < 0 || s.centerUv.u > 1 ||
          !finite(s.centerUv.v) || s.centerUv.v < 0 || s.centerUv.v > 1 ||
          !finite(s.areaMm2) || s.areaMm2 < 1 || !finite(s.perimeterMm) || s.perimeterMm < 4))
          return fail('INVALID_AAMA_INTERNAL_CUT_PIECE_POLICY', `${size}: ${piece.name}`)
        if (piece.internalCuts.length !== specs.length)
          return fail('AAMA_INTERNAL_CUT_COUNT_DRIFT', `${size}: ${piece.name}`)
        const cut = piece.cutOutlineMm.points, b = bounds(cut), actual = []
        // Source exporter contours can contain repeated construction vertices;
        // do not misclassify these as an internal-hole topology failure.
        if (cut.length < 3 || cut.length > 20000 ||
            cut.some(p => !finite(p.x) || !finite(p.y)) ||
            b.maxX <= b.minX || b.maxY <= b.minY)
          return fail('INVALID_AAMA_INTERNAL_CUT_OUTLINE', `${size}: ${piece.name}`)
        for (const path of piece.internalCuts) {
          const poly = path.points
          if (!path.closed || !simple(poly) || area(poly) < 1)
            return fail('AAMA_INTERNAL_CUT_UNSUPPORTED_OR_INVALID', `${size}: ${piece.name}`)
          if (poly.some(p => !inside(p, cut) || edgeDistance(p, cut) < minCutClearanceMm) ||
              edges(poly).some(e => edges(cut).some(f => intersects(...e, ...f))))
            return fail('AAMA_INTERNAL_CUT_OUTSIDE_CUT', `${size}: ${piece.name}`)
          actual.push({centerUv: uv(centroid(poly), b), centerMm: centroid(poly),
            areaMm2: area(poly), perimeterMm: perimeter(poly), poly})
        }
        for (let i = 0; i < actual.length; i++) for (let j = i + 1; j < actual.length; j++) {
          if (edges(actual[i].poly).some(e => edges(actual[j].poly).some(f => intersects(...e, ...f))) ||
              inside(actual[i].poly[0], actual[j].poly) || inside(actual[j].poly[0], actual[i].poly))
            return fail('AAMA_INTERNAL_CUT_HOLES_OVERLAP', `${size}: ${piece.name}`)
        }
        const matches = specs.map(spec => actual.map((hole, index) =>
          dist(hole.centerMm, {x: b.minX + spec.centerUv.u * (b.maxX - b.minX),
            y: b.minY + spec.centerUv.v * (b.maxY - b.minY)}) <= centerToleranceMm &&
          Math.abs(hole.areaMm2 - spec.areaMm2) <= areaToleranceMm2 &&
          Math.abs(hole.perimeterMm - spec.perimeterMm) <= perimeterToleranceMm ? index : -1)
          .filter(index => index >= 0))
        const owner = Array(actual.length).fill(-1)
        const augment = (i, seen) => matches[i].some(index => {
          if (seen.has(index)) return false
          seen.add(index)
          if (owner[index] === -1 || augment(owner[index], seen)) {
            owner[index] = i; return true
          }
          return false
        })
        if (!matches.every((_, i) => augment(i, new Set())))
          return fail('AAMA_INTERNAL_CUT_GEOMETRY_DRIFT', `${size}: ${piece.name}`)
        rows.push({size, piece: piece.name, closedInternalCutsInspected: actual.length})
      }
    }
    return {ok: true, status: 'LOCAL_AAMA_INTERNAL_CUT_INSPECTED', issues: [], rows,
      sizeCount: Object.keys(holesBySize).length, internalCutsInspected: true,
      receiverCadVerified: false, independentReceiverAuthenticated: false,
      aamaCertified: false, astmCertified: false, cuttingAuthorized: false,
      factoryApproved: false, manufacturingApproved: false,
      limitations: 'Local AAMA layer-11 closed internal CUT hole geometry only. Open slits, '
        + 'physical cutter execution, independent receiving CAD, factory release, and seam allowances are unverified.'}
  } catch (error) {
    return fail('AAMA_INTERNAL_CUT_INSPECTION_REFUSED', String(error.message || error))
  }
}
