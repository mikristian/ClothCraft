// Local opt-in manufacturing guard: a valid outer CUT/STITCH allowance can
// still place the sewline through a layer-11 internal CUT hole. No release.
import {inspectIndustrialAamaAllowanceOffset20261028} from './industrialAamaAllowanceOffset20261028.mjs'
import {inspectIndustrialAamaInternalCutCoverage20261028} from './industrialAamaInternalCutCoverage20261028.mjs'
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

const fail = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}],
  stitchHoleClearanceInspected: false, receiverCadVerified: false,
  independentSewlineAuthenticated: false, cuttingAuthorized: false,
  factoryApproved: false, manufacturingApproved: false,
  aamaCertified: false, astmCertified: false,
})
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const segmentDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0
  return distance(p, {x: a.x + dx * t, y: a.y + dy * t})
}
const edges = poly => poly.map((p, i) => [p, poly[(i + 1) % poly.length]])
const bounds = ([a, b]) => ({minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
  minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y)})
const within = (x, a, b) => x >= Math.min(a, b) - 1e-8 && x <= Math.max(a, b) + 1e-8
const onSegment = (p, a, b) => Math.abs(cross(a, b, p)) <= 1e-8 &&
  within(p.x, a.x, b.x) && within(p.y, a.y, b.y)
const intersects = (a, b, c, d) => {
  const s1 = cross(a, b, c), s2 = cross(a, b, d)
  const t1 = cross(c, d, a), t2 = cross(c, d, b)
  return (s1 * s2 < 0 && t1 * t2 < 0) ||
    onSegment(a, c, d) || onSegment(b, c, d) ||
    onSegment(c, a, b) || onSegment(d, a, b)
}
const segmentGap = (ab, cd) => {
  const a = bounds(ab), b = bounds(cd)
  const lowerBound = Math.hypot(Math.max(0, a.minX - b.maxX, b.minX - a.maxX),
    Math.max(0, a.minY - b.maxY, b.minY - a.maxY))
  if (lowerBound > 40) return lowerBound // valid policy clearance is <= 40 mm
  if (intersects(...ab, ...cd)) return 0
  return Math.min(segmentDistance(ab[0], ...cd), segmentDistance(ab[1], ...cd),
    segmentDistance(cd[0], ...ab), segmentDistance(cd[1], ...ab))
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

/** Composes explicit all-size outer allowance and internal-hole inventories.
 * A layer-11 hole must not intersect, touch, enclose or approach the separately
 * supplied STITCH outline more closely than the declared minimum clearance.
 * This does not inspect separate sewlines around internal holes.
 */
export function inspectIndustrialAamaStitchHoleClearance20261028(wiresBySize, {
  unit = null, allowancesBySize = null, holesBySize = null,
  minStitchToHoleMm = null, toleranceMm = 1, sampleStepMm = 4,
  minCutClearanceMm = 2, centerToleranceMm = 3,
  areaToleranceMm2 = 10, perimeterToleranceMm = 5,
} = {}) {
  try {
    if (!Number.isFinite(minStitchToHoleMm) ||
        minStitchToHoleMm < 0.5 || minStitchToHoleMm > 40)
      return fail('INVALID_AAMA_STITCH_HOLE_CLEARANCE_POLICY')
    const allowance = inspectIndustrialAamaAllowanceOffset20261028(wiresBySize,
      {unit, allowancesBySize, toleranceMm, sampleStepMm})
    if (!allowance.ok) return fail('AAMA_OUTER_ALLOWANCE_NOT_VERIFIED', allowance.issues)
    const holes = inspectIndustrialAamaInternalCutCoverage20261028(wiresBySize,
      {unit, holesBySize, minCutClearanceMm, centerToleranceMm,
        areaToleranceMm2, perimeterToleranceMm})
    if (!holes.ok) return fail('AAMA_INTERNAL_CUT_INVENTORY_NOT_VERIFIED', holes.issues)
    const rows = []
    for (const size of Object.keys(allowancesBySize)) {
      const parsed = parseSeamlyAamaManufacturingSemantics(wiresBySize[size], {unit})
      for (const piece of parsed.pieces) {
        const stitch = allowancesBySize[size][piece.name].stitchOutlineMm
        for (const hole of piece.internalCuts) {
          // A hole enclosing the entire STITCH loop has no intersecting edges.
          if (stitch.some(p => inside(p, hole.points)))
            return fail('AAMA_STITCH_INSIDE_INTERNAL_CUT', `${size}: ${piece.name}`)
          for (const a of edges(stitch)) for (const b of edges(hole.points)) {
            if (segmentGap(a, b) < minStitchToHoleMm - 1e-8)
              return fail('AAMA_STITCH_INTERNAL_CUT_CLEARANCE_DRIFT',
                `${size}: ${piece.name}`)
          }
        }
        rows.push({size, piece: piece.name, internalCuts: piece.internalCuts.length,
          minRequiredStitchToHoleMm: minStitchToHoleMm})
      }
    }
    return {ok: true, status: 'LOCAL_AAMA_STITCH_HOLE_CLEARANCE_INSPECTED',
      issues: [], sizeCount: Object.keys(allowancesBySize).length, rows,
      stitchHoleClearanceInspected: true, independentSewlineAuthenticated: false,
      receiverCadVerified: false, aamaCertified: false, astmCertified: false,
      cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
      limitations: 'Local geometry only. All-size explicit outer STITCH and layer-11 hole '
        + 'policies required; internal-hole sewing allowances, licensed receiving CAD, '
        + 'cutter qualification, physical samples and factory release remain unverified.'}
  } catch (error) {
    return fail('AAMA_STITCH_HOLE_INSPECTION_REFUSED', String(error.message || error))
  }
}
