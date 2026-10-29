import { edgeLength, edgeRangeLength, getEdgeSeamAllowance } from './project.js'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const validEdge = (piece, index) => Number.isInteger(index) && index >= 0 && index < (piece?.points?.length ?? 0) && piece.points.length >= 3 && edgeLength(piece, index) > 1e-9
const fail = code => ({ ok: false, code })

// Validate before handing an existing native schema field to the editor.
export function validateSeamAllowanceEdit20261025(piece, edgeIndex, widthCm) {
  if (!validEdge(piece, edgeIndex)) return fail('INVALID_EDGE')
  if (!finite(widthCm) || widthCm < 0 || widthCm > 8) return fail('INVALID_ALLOWANCE_CM')
  return { ok: true, widthCm, previousWidthCm: getEdgeSeamAllowance(piece, edgeIndex) }
}

export function validateNotchEdit20261025(piece, notch, { minEndpointCm = 0.02, minSpacingCm = 0.05 } = {}) {
  if (!validEdge(piece, notch?.edgeIndex)) return fail('INVALID_EDGE')
  if (!finite(notch?.t) || notch.t <= 0 || notch.t >= 1) return fail('INVALID_NOTCH_FRACTION')
  if (!finite(notch?.depthCm) || notch.depthCm <= 0) return fail('INVALID_NOTCH_DEPTH')
  if (notch.type !== 'single' && notch.type !== 'double') return fail('INVALID_NOTCH_TYPE')
  if (typeof notch.id !== 'string' || !notch.id.trim()) return fail('INVALID_NOTCH_ID')
  const lengthCm = edgeLength(piece, notch.edgeIndex)
  if (Math.min(notch.t, 1 - notch.t) * lengthCm < minEndpointCm) return fail('NOTCH_TOO_CLOSE_TO_ENDPOINT')
  if ((piece.notches ?? []).some(existing => existing.id !== notch.id && existing.edgeIndex === notch.edgeIndex && finite(existing.t) && Math.abs(existing.t - notch.t) * lengthCm < minSpacingCm)) return fail('DUPLICATE_OR_OVERLAPPING_NOTCH')
  if ((piece.notches ?? []).filter(existing => existing.id === notch.id).length > 1) return fail('DUPLICATE_NOTCH_ID')
  return { ok: true, notch: { ...notch } }
}

function seamRange(piece, endpoint) {
  if (!validEdge(piece, endpoint?.edgeIndex)) return fail('INVALID_EDGE')
  const { startT = 0, endT = 1 } = endpoint
  if (!finite(startT) || !finite(endT) || startT < 0 || endT > 1 || startT >= endT) return fail('INVALID_SEAM_RANGE')
  const edgeCm = edgeLength(piece, endpoint.edgeIndex)
  const beforeCm = edgeRangeLength(piece, endpoint.edgeIndex, 0, startT)
  const rangeCm = edgeRangeLength(piece, endpoint.edgeIndex, startT, endT)
  if (!finite(rangeCm) || rangeCm <= 1e-9 || !finite(beforeCm)) return fail('INVALID_SEAM_LENGTH')
  return { ok: true, edgeCm, beforeCm, rangeCm }
}

// Notch t is a physical arclength fraction, unlike seam startT/endT (Bezier parameters).
// Produce a reversible, nonmutating proposal using only already persisted notch fields.
export function proposeMatchedSeamNotch20261025(project, seam, sourceNotch, { distanceToleranceCm = 0.15 } = {}) {
  if (!seam?.a || !seam?.b || !Array.isArray(project?.pieces)) return fail('INVALID_SEAM')
  const pieceA = project.pieces.find(p => p.id === seam.a.pieceId)
  const pieceB = project.pieces.find(p => p.id === seam.b.pieceId)
  if (!pieceA || !pieceB) return fail('MISSING_PIECE')
  const a = seamRange(pieceA, seam.a), b = seamRange(pieceB, seam.b)
  if (!a.ok) return { ...a, side: 'a' }
  if (!b.ok) return { ...b, side: 'b' }
  if (!sourceNotch || sourceNotch.edgeIndex !== seam.a.edgeIndex) return fail('NOTCH_OFF_SEAM')
  if (typeof seam.id !== 'string' || !seam.id.trim()) return fail('INVALID_SEAM_ID')
  const sourceValidation = validateNotchEdit20261025(pieceA, sourceNotch)
  if (!sourceValidation.ok) return sourceValidation
  const fromStart = sourceNotch.t * a.edgeCm - a.beforeCm
  if (fromStart <= 0 || fromStart >= a.rangeCm) return fail('NOTCH_OUTSIDE_SEAM_INTERVAL')
  if (!finite(distanceToleranceCm) || distanceToleranceCm < 0) return fail('INVALID_TOLERANCE')
  if (Math.abs(a.rangeCm - b.rangeCm) > distanceToleranceCm) return fail('SEAM_LENGTH_MISMATCH')
  const positionB = seam.reverseB ? b.beforeCm + b.rangeCm - fromStart : b.beforeCm + fromStart
  const t = positionB / b.edgeCm
  const candidate = {
    id: `${sourceNotch.id}-matched-${seam.id}`,
    edgeIndex: seam.b.edgeIndex,
    t,
    type: sourceNotch.type,
    depthCm: sourceNotch.depthCm,
    matchGroupId: sourceNotch.matchGroupId ?? `notch-${seam.id}`,
    matchedSeamId: seam.id,
  }
  const validation = validateNotchEdit20261025(pieceB, candidate)
  if (!validation.ok) return validation
  return { ok: true, pieceId: pieceB.id, notch: candidate, stationCm: fromStart, seamLengthCm: a.rangeCm }
}
