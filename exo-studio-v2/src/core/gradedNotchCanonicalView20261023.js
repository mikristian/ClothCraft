/** Development-only, nonmutating cache repair for an already graded project or piece.
 * edgeIndex and t are the authoritative physical edge/arclength station.
 * This view does not grant manufacturing or factory approval.
 */
import {cloneProject, edgePointAt, edgeLength} from './project.js'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const validId = value => typeof value === 'string' && value.trim().length > 0

function canonicalPiece(piece) {
  if (!piece || !validId(piece.id) || !Array.isArray(piece.points) || piece.points.length < 3)
    throw new TypeError('Canonical notch view requires a piece with a unique nonempty ID and at least three points')
  if (piece.notches != null && !Array.isArray(piece.notches)) throw new TypeError(`Invalid notch collection in ${piece.id}`)
  const seen = new Set()
  const next = cloneProject(piece)
  next.notches = (piece.notches || []).map(notch => {
    if (!notch || !validId(notch.id) || seen.has(notch.id))
      throw new TypeError(`Missing or duplicate notch ID in ${piece.id}`)
    seen.add(notch.id)
    const edge = notch.edgeIndex
    const t = notch.t
    if (!Number.isInteger(edge) || edge < 0 || edge >= piece.points.length || !finite(t) || t < 0 || t > 1)
      throw new RangeError(`Invalid edgeIndex/t for notch ${notch.id} in ${piece.id}`)
    const hasX = Object.hasOwn(notch,'x')
    const hasY = Object.hasOwn(notch,'y')
    if (hasX !== hasY || (hasX && (!finite(notch.x) || !finite(notch.y))))
      throw new TypeError(`INVALID_NOTCH_CACHED_COORDINATE for notch ${notch.id} in ${piece.id}: cached x/y must be both finite or both absent`)
    const a = piece.points[edge]
    const b = piece.points[(edge + 1) % piece.points.length]
    const control = piece.curves?.[edge]
    if (![a?.x,a?.y,b?.x,b?.y].every(finite) ||
        (control != null && (![control.cx,control.cy].every(finite))) ||
        !finite(edgeLength(piece,edge)) || edgeLength(piece,edge) <= 0)
      throw new RangeError(`Nonfinite or zero-length edge geometry for notch ${notch.id} in ${piece.id}`)
    let located
    try { located = edgePointAt(piece,edge,t,64)?.point }
    catch (cause) { throw new RangeError(`Cannot evaluate edge station for notch ${notch.id} in ${piece.id}`,{cause}) }
    if (!located || !finite(located.x) || !finite(located.y))
      throw new RangeError(`Nonfinite edge station for notch ${notch.id} in ${piece.id}`)
    const result = cloneProject(notch)
    // Optional cached pair: leave wholly absent when the author never added it.
    // Only an already complete, finite cached pair may be recalculated.
    if (hasX) {
      result.x = located.x
      result.y = located.y
    }
    return result
  })
  if (piece.notches == null) delete next.notches
  return next
}

export function createGradedNotchCanonicalView(gradedProjectOrPiece) {
  if (!gradedProjectOrPiece || typeof gradedProjectOrPiece !== 'object') throw new TypeError('Graded project or piece required')
  const isProject = Array.isArray(gradedProjectOrPiece.pieces)
  const inputPieces = isProject ? gradedProjectOrPiece.pieces : [gradedProjectOrPiece]
  const seen = new Set()
  for (const piece of inputPieces) {
    if (!validId(piece?.id) || seen.has(piece.id)) throw new TypeError('Missing or duplicate piece ID')
    seen.add(piece.id)
  }
  const canonical = inputPieces.map(canonicalPiece)
  const view = isProject
    ? {...cloneProject(gradedProjectOrPiece), pieces:canonical}
    : canonical[0]
  return {view, status:'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED', factoryCertified:false,
    disclaimer:'Supplementary canonical notch coordinate view only; no factory certification or manufacturing release approval.'}
}
