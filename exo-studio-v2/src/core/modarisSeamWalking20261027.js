import { gradeProject } from './grading.js'
import { edgeRangeLength } from './project.js'

const finite = n => typeof n === 'number' && Number.isFinite(n)
const reject = (code, detail) => ({ ok: false, code, detail, factoryCertified: false })

// Snapshot identity includes the two source panels, seam pairing, and grade inputs.
// A caller must retain this token from the authored source before an analysis run.
export function seamWalkingSourceToken20261027(project, seamId) {
  const ids = Array.isArray(seamId) ? seamId : [seamId]
  if (!ids.length || ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length ||
      !Array.isArray(project?.seams) || !Array.isArray(project?.pieces)) return null
  const seams = ids.map(id => project.seams.find(s => s.id === id))
  if (seams.some((s, i) => !s || project.seams.filter(x => x.id === ids[i]).length !== 1)) return null
  const panels = [...new Set(seams.flatMap(s => [s.a?.pieceId, s.b?.pieceId]))].map(id => project.pieces.find(p => p.id === id))
  if (panels.some(p => !p) || new Set(project.pieces.map(p => p.id)).size !== project.pieces.length) return null
  return JSON.stringify({ seams, panels, grading: project.grading, productionSpec: project.productionSpec })
}

const only = (object, keys) => object && !Object.keys(object).some(k => !keys.includes(k))
function seamSupported(seam) {
  return only(seam, ['id', 'name', 'type', 'a', 'b', 'reverseB']) &&
    only(seam?.a, ['pieceId', 'edgeIndex', 'startT', 'endT']) &&
    only(seam?.b, ['pieceId', 'edgeIndex', 'startT', 'endT']) &&
    typeof seam.reverseB === 'boolean' && seam.a.pieceId !== seam.b.pieceId &&
    typeof seam.a.pieceId === 'string' && typeof seam.b.pieceId === 'string'
}

function edge(piece, ref) {
  if (!piece || !ref || !Number.isInteger(ref.edgeIndex) || ref.edgeIndex < 0 ||
      !Array.isArray(piece.points) || piece.points.length < 2 || ref.edgeIndex >= piece.points.length) return null
  const i = ref.edgeIndex, a = piece.points[i], b = piece.points[(i + 1) % piece.points.length]
  const control = piece.curves?.[i]
  if (![a?.x, a?.y, b?.x, b?.y].every(finite) ||
      (control && ![control.cx, control.cy].every(finite))) return null
  // Native 2D piece curves are quadratic Beziers. Reject unknown cubic notation.
  if (control && (Object.keys(control).some(k => !['cx','cy'].includes(k)))) return null
  const startT = ref.startT ?? 0, endT = ref.endT ?? 1
  if (![startT, endT].every(finite) || startT < 0 || endT > 1 || startT >= endT) return null
  const lengthCm = edgeRangeLength(piece, i, startT, endT)
  if (!finite(lengthCm) || lengthCm < 1e-6) return null
  return { pieceId: piece.id, edgeIndex: i, startT, endT, lengthCm }
}

function parameterAtStation(piece, range, distanceCm) {
  let lo = range.startT, hi = range.endT
  for (let k = 0; k < 44; k++) {
    const mid = (lo + hi) / 2
    if (edgeRangeLength(piece, range.edgeIndex, range.startT, mid) < distanceCm) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function pointOnEdge(piece, range, t) {
  const a = piece.points[range.edgeIndex], b = piece.points[(range.edgeIndex + 1) % piece.points.length]
  const c = piece.curves?.[range.edgeIndex]
  const u = 1 - t
  return c ? { x: u*u*a.x + 2*u*t*c.cx + t*t*b.x, y: u*u*a.y + 2*u*t*c.cy + t*t*b.y } :
    { x: u*a.x + t*b.x, y: u*a.y + t*b.y }
}

function joined(piece, previous, next, reverse) {
  const n = piece.points.length
  const expected = reverse ? (previous.edgeIndex - 1 + n) % n : (previous.edgeIndex + 1) % n
  if (next.edgeIndex !== expected || (reverse ? previous.startT !== 0 || next.endT !== 1 : previous.endT !== 1 || next.startT !== 0)) return false
  const end = pointOnEdge(piece, previous, reverse ? previous.startT : previous.endT)
  const start = pointOnEdge(piece, next, reverse ? next.endT : next.startT)
  return Math.hypot(end.x - start.x, end.y - start.y) <= 1e-8
}

function locate(piece, ranges, distance, reverse = false) {
  let left = Math.max(0, Math.min(distance, ranges.reduce((sum, r) => sum + r.lengthCm, 0)))
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i]
    if (left <= r.lengthCm || i === ranges.length - 1) {
      const t = parameterAtStation(piece, r, reverse ? r.lengthCm - left : left)
      return { seamIndex: i, edgeIndex: r.edgeIndex, t, pieceId: piece.id }
    }
    left -= r.lengthCm
  }
  return null
}

/** Nonmutating length walk for a verified authored seam pair across explicitly selected sizes.
 * `stationCount` samples matched *physical* arclength percentages, not Bezier t.
 * Ease proposal is the signed B-minus-A allowance in centimetres, for review only.
 */
export function analyzeModarisSeamWalking20261027(project, {
  seamId, seamIds, sourceToken, sizes, toleranceCm = 0.15, stationCount = 8,
} = {}) {
  if (typeof seamId !== 'string' || !seamId || typeof sourceToken !== 'string' || !sourceToken)
    return reject('SOURCE_IDENTITY_REQUIRED')
  const ids = seamIds === undefined ? [seamId] : seamIds
  if (!Array.isArray(ids) || !ids.length || ids[0] !== seamId || ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length)
    return reject('INVALID_SEAM_PATH')
  const currentToken = seamWalkingSourceToken20261027(project, seamIds === undefined ? seamId : ids)
  if (!currentToken || currentToken !== sourceToken) return reject('STALE_OR_INVALID_SOURCE')
  const seams = ids.map(id => project.seams.find(s => s.id === id))
  const seam = seams[0]
  if (seams.some(s => !seamSupported(s) || s.a.pieceId !== seam.a.pieceId || s.b.pieceId !== seam.b.pieceId || s.reverseB !== seam.reverseB)) return reject('INVALID_SEAM_PAIR')
  if (!Array.isArray(sizes) || sizes.length === 0 || new Set(sizes).size !== sizes.length ||
      sizes.some(s => typeof s !== 'string' || !project.grading?.sizes?.includes(s))) return reject('INVALID_SIZE_RUN')
  if (!finite(toleranceCm) || toleranceCm < 0 || !Number.isInteger(stationCount) || stationCount < 2 || stationCount > 128)
    return reject('INVALID_CONFIGURATION')
  const results = []
  for (const size of sizes) {
    let graded
    try { graded = gradeProject(project, size) } catch (error) { return reject('GRADING_FAILED', { size, message: error.message }) }
    if (!Array.isArray(graded.pieces) || new Set(graded.pieces.map(p => p.id)).size !== graded.pieces.length)
      return reject('INVALID_GRADED_PANELS', { size })
    const pieceA = graded.pieces.find(p => p.id === seam.a.pieceId)
    const pieceB = graded.pieces.find(p => p.id === seam.b.pieceId)
    const baseA = project.pieces.find(p => p.id === seam.a.pieceId)
    const baseB = project.pieces.find(p => p.id === seam.b.pieceId)
    const aEdges = seams.map(s => edge(pieceA, s.a)), bEdges = seams.map(s => edge(pieceB, s.b))
    if (aEdges.some(r => !r) || bEdges.some(r => !r) || seams.some(s => !edge(baseA, s.a) || !edge(baseB, s.b)) ||
        pieceA.points.length !== baseA.points.length || pieceB.points.length !== baseB.points.length)
      return reject('INVALID_EDGE_PATH', { size })
    if (new Set(aEdges.map(r => r.edgeIndex)).size !== aEdges.length || new Set(bEdges.map(r => r.edgeIndex)).size !== bEdges.length ||
        aEdges.some((r, i) => i && !joined(pieceA, aEdges[i-1], r, false)) ||
        bEdges.some((r, i) => i && !joined(pieceB, bEdges[i-1], r, seam.reverseB)))
      return reject('DISCONNECTED_OR_BRANCHED_PATH', { size })
    const a = { ...aEdges[0], lengthCm: aEdges.reduce((n, r) => n + r.lengthCm, 0), edges: aEdges }
    const b = { ...bEdges[0], lengthCm: bEdges.reduce((n, r) => n + r.lengthCm, 0), edges: bEdges }
    const mismatchCm = b.lengthCm - a.lengthCm
    const stations = []
    for (let k = 0; k <= stationCount; k++) {
      const fraction = k / stationCount
      const stationACm = fraction * a.lengthCm
      const stationBCm = fraction * b.lengthCm
      stations.push({ fraction, stationACm, stationBCm,
        parameterA: aEdges.length === 1 ? parameterAtStation(pieceA, aEdges[0], stationACm) : null,
        parameterB: bEdges.length === 1 ? parameterAtStation(pieceB, bEdges[0], seam.reverseB ? b.lengthCm - stationBCm : stationBCm) : null,
        locationA: locate(pieceA, aEdges, stationACm), locationB: locate(pieceB, bEdges, stationBCm, seam.reverseB),
        cumulativeEaseCm: stationBCm - stationACm })
    }
    results.push({ size, a, b, mismatchCm, absoluteMismatchCm: Math.abs(mismatchCm),
      withinTolerance: Math.abs(mismatchCm) <= toleranceCm,
      stations, easeCorrectionProposal: {
        targetSide: 'b', totalAdjustmentCm: -mismatchCm,
        signedEaseCm: mismatchCm, method: 'review_distribution_only', applied: false,
      } })
  }
  return { ok: true, status: results.every(r => r.withinTolerance) ? 'within_tolerance' : 'mismatch',
    seamId, seamIds: [...ids], sizes: [...sizes], toleranceCm, results, factoryCertified: false,
    note: 'Continuous quadratic stitch-edge analysis for explicitly ordered, unbranched sewn paths only. Ease distribution, notches and physical assembly require patternmaker approval.' }
}
