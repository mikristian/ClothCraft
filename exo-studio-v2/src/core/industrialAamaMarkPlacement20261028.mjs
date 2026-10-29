// Opt-in, policy-bound AAMA notch/grainline placement inspection.
// This is local CUT/mark inspection, NEVER cutting authorization or receiver attestation.
import {inspectIndustrialAamaMarkingCoverage20261028} from './industrialAamaMarkingCoverage20261028.mjs'
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value))
const keys = (value, names) => plain(value) && Object.keys(value).length === names.length &&
  names.every(name => Object.hasOwn(value, name))
const finite = Number.isFinite
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const segmentDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return distance(p, {x: a.x + t * dx, y: a.y + t * dy})
}
const edgeDistance = (p, poly) => Math.min(...poly.map((a, i) => segmentDistance(p, a, poly[(i + 1) % poly.length])))
const bounds = poly => ({minX: Math.min(...poly.map(p => p.x)), maxX: Math.max(...poly.map(p => p.x)),
  minY: Math.min(...poly.map(p => p.y)), maxY: Math.max(...poly.map(p => p.y))})
const uv = (p, b) => ({u: (p.x - b.minX) / (b.maxX - b.minX), v: (p.y - b.minY) / (b.maxY - b.minY)})
const physical = (p, b) => ({x: b.minX + p.u * (b.maxX - b.minX), y: b.minY + p.v * (b.maxY - b.minY)})
const axis = (a, b) => ((Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) % 180 + 180) % 180
const axisDiff = (a, b) => {const d = Math.abs(a - b); return Math.min(d, 180 - d)}
const validUv = p => keys(p, ['u', 'v']) && finite(p.u) && finite(p.v) &&
  p.u >= 0 && p.u <= 1 && p.v >= 0 && p.v <= 1
const fail = (code, detail = code) => ({ok: false, status: 'BLOCKED', issues: [{code, detail}],
  placementInspected: false, independentReceiverAuthenticated: false, receiverCadVerified: false,
  aamaCertified: false, astmCertified: false, cuttingAuthorized: false,
  factoryApproved: false, manufacturingApproved: false})

// Each explicit per-size placement policy is a manufacturing requirement supplied
// independently of the inspected receiver wire. Bounding-box UV positions tolerate
// piece translations; rotations or materially changed outlines require a new review.
// Grainline axes are UNDIRECTED (modulo 180), so fabric nap polarity is not proved.
export function inspectIndustrialAamaMarkPlacement20261028(wiresBySize, {
  unit = null, requirementsBySize = null, placementsBySize = null,
  notchPositionToleranceMm = 3, grainPositionToleranceMm = 5, grainAxisToleranceDeg = 5,
} = {}) {
  try {
    if (!plain(placementsBySize) || !plain(requirementsBySize) ||
        !keys(placementsBySize, Object.keys(requirementsBySize)) ||
        !finite(notchPositionToleranceMm) || notchPositionToleranceMm < 0 || notchPositionToleranceMm > 10 ||
        !finite(grainPositionToleranceMm) || grainPositionToleranceMm < 0 || grainPositionToleranceMm > 15 ||
        !finite(grainAxisToleranceDeg) || grainAxisToleranceDeg < 0 || grainAxisToleranceDeg > 15)
      return fail('INVALID_AAMA_PLACEMENT_POLICY')
    const coverage = inspectIndustrialAamaMarkingCoverage20261028(wiresBySize, {unit, requirementsBySize})
    if (!coverage.ok) return {...coverage, placementInspected: false}
    const rows = []
    for (const size of Object.keys(requirementsBySize)) {
      const parsed = parseSeamlyAamaManufacturingSemantics(wiresBySize[size], {unit})
      if (!keys(placementsBySize[size], parsed.pieces.map(piece => piece.name)))
        return fail('AAMA_PLACEMENT_PIECE_POLICY_DRIFT', size)
      for (const piece of parsed.pieces) {
        const spec = placementsBySize[size][piece.name]
        const required = requirementsBySize[size][piece.name]
        if (!keys(spec, ['notchAnchorsUv', 'grainMidpointUv', 'grainAxisDeg']) ||
            !Array.isArray(spec.notchAnchorsUv) || spec.notchAnchorsUv.length !== required.expectedNotches ||
            !spec.notchAnchorsUv.every(validUv) ||
            (required.requireGrainline && (!validUv(spec.grainMidpointUv) ||
              !finite(spec.grainAxisDeg) || spec.grainAxisDeg < 0 || spec.grainAxisDeg >= 180)) ||
            (!required.requireGrainline && (spec.grainMidpointUv !== null || spec.grainAxisDeg !== null)))
          return fail('INVALID_AAMA_PIECE_PLACEMENT_POLICY', `${size}: ${piece.name}`)
        const cut = piece.cutOutlineMm.points, b = bounds(cut)
        if (!(b.maxX > b.minX && b.maxY > b.minY))
          return fail('INVALID_AAMA_PLACEMENT_BOUNDS', `${size}: ${piece.name}`)
        const anchors = piece.notches.map(notch => {
          const [a, z] = notch.points
          return edgeDistance(a, cut) <= edgeDistance(z, cut) ? a : z
        })
        // Exact one-to-one matching, not greedy: two notches cannot satisfy one
        // required station. Small bounded bipartite matching (<=64 notches).
        const matches = spec.notchAnchorsUv.map(expected => anchors.map((actual, index) =>
          distance(actual, physical(expected, b)) <= notchPositionToleranceMm ? index : -1)
          .filter(index => index >= 0))
        const owner = Array(anchors.length).fill(-1)
        const augment = (i, seen) => matches[i].some(index => {
          if (seen.has(index)) return false
          seen.add(index)
          if (owner[index] === -1 || augment(owner[index], seen)) {
            owner[index] = i
            return true
          }
          return false
        })
        if (!matches.every((_, i) => augment(i, new Set())))
          return fail('AAMA_NOTCH_STATION_DRIFT', `${size}: ${piece.name}`)
        if (piece.grainline) {
          const [a, z] = piece.grainline.points
          const mid = {x: (a.x + z.x) / 2, y: (a.y + z.y) / 2}
          if (distance(mid, physical(spec.grainMidpointUv, b)) > grainPositionToleranceMm ||
              axisDiff(axis(a, z), spec.grainAxisDeg) > grainAxisToleranceDeg)
            return fail('AAMA_GRAINLINE_PLACEMENT_DRIFT', `${size}: ${piece.name}`)
        }
        rows.push({size, piece: piece.name, notchStationsVerified: anchors.length,
          grainAxisAndMidpointVerified: Boolean(piece.grainline)})
      }
    }
    return {ok: true, status: 'LOCAL_AAMA_MARK_PLACEMENT_INSPECTED', issues: [],
      sizeCount: Object.keys(requirementsBySize).length, rows, placementInspected: true,
      napDirectionVerified: false, independentReceiverAuthenticated: false, receiverCadVerified: false,
      aamaCertified: false, astmCertified: false, cuttingAuthorized: false,
      factoryApproved: false, manufacturingApproved: false,
      limitations: 'Local, explicit per-size CUT-relative notch/grainline placement only. '
        + 'Grainline axis is undirected. No independently authenticated receiving CAD, '
        + 'ASTM/AAMA certification, physical cutting authorization or factory release.'}
  } catch (error) {
    return fail('AAMA_PLACEMENT_INSPECTION_REFUSED', String(error.message || error))
  }
}
