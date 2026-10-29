/** Development-only, read-only authored-notch preflight across every graded size.
 * Unlike sewing-pair QA this deliberately visits UNPAIRED physical notches.
 * This is not a production release gate until explicitly integrated and reviewed.
 */
import {gradeProject} from './grading.js'
import {edgeLength, edgePointAt, getEdgeSeamAllowance} from './project.js'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const validId = value => typeof value === 'string' && value.trim().length > 0

export function inspectStandaloneNotchesAllSizes20261023(project) {
  const issues = [], checks = []
  const add = (code, size, pieceId, notchId, message) => issues.push({
    severity:'blocker', code, size, pieceId, notchId, scope:`${size} / ${pieceId} / ${notchId}`, message,
  })
  const sizes = project?.grading?.sizes
  if (!project || !Array.isArray(project.pieces) || !Array.isArray(sizes) || !sizes.length ||
      sizes.some(size => !validId(size)) || new Set(sizes).size !== sizes.length ||
      !sizes.includes(project.grading.baseSize)) {
    add('INVALID_NOTCH_SIZE_RUN', 'all', 'project', 'notch-set', 'A unique, explicit grading size run with a valid base size is required')
    return result([])
  }
  const sourceIds = new Map()
  const sourcePieces = new Set()
  for (const piece of project.pieces) {
    if (!validId(piece?.id) || !Array.isArray(piece?.points) || piece.points.length < 3 ||
        (piece.notches != null && !Array.isArray(piece.notches))) {
      add('INVALID_NOTCH_SOURCE_PIECE', 'source', String(piece?.id), 'notch-set', 'Invalid piece, contour or notch collection')
      continue
    }
    if (sourcePieces.has(piece.id)) {
      add('DUPLICATE_NOTCH_SOURCE_PIECE', 'source', piece.id, 'notch-set', 'Source piece IDs must be unique across the size run')
      continue
    }
    sourcePieces.add(piece.id)
    const ids = new Set()
    for (const [index, notch] of (piece.notches || []).entries()) {
      const id = validId(notch?.id) ? notch.id : `index-${index}`
      if (!validId(notch?.id) || ids.has(id)) add('INVALID_NOTCH_ID', 'source', piece.id, id, 'Notch ID must be nonempty and unique per piece')
      ids.add(id)
    }
    sourceIds.set(piece.id, ids)
  }
  for (const size of sizes) {
    let graded
    try { graded = gradeProject(project, size) }
    catch (error) {
      add('NOTCH_GRADING_FAILED', size, 'project', 'notch-set', String(error?.message || error))
      continue
    }
    const seenPieces = new Set()
    for (const piece of graded.pieces || []) {
      if (!validId(piece?.id) || seenPieces.has(piece.id)) {
        add('INVALID_GRADED_PIECE_ID', size, String(piece?.id), 'notch-set', 'Missing or duplicate graded piece ID')
        continue
      }
      seenPieces.add(piece.id)
      const source = project.pieces.find(row => row?.id === piece.id)
      if (!source || !Array.isArray(piece.points) || piece.points.length < 3 || !Array.isArray(piece.notches || [])) {
        add('INVALID_GRADED_NOTCH_PIECE', size, piece.id, 'notch-set', 'Missing source piece, contour or notch array')
        continue
      }
      const seen = new Set()
      for (const [index, notch] of (piece.notches || []).entries()) {
        const id = validId(notch?.id) ? notch.id : `index-${index}`
        const fail = (code, message) => add(code, size, piece.id, id, message)
        if (!validId(notch?.id) || seen.has(id)) { fail('INVALID_GRADED_NOTCH_ID', 'Notch ID missing or repeated'); continue }
        seen.add(id)
        if (!sourceIds.get(piece.id)?.has(id)) fail('UNEXPECTED_GRADED_NOTCH', 'Graded notch ID has no source counterpart')
        const edge = notch.edgeIndex
        if (!Number.isInteger(edge) || edge < 0 || edge >= piece.points.length) {
          fail('INVALID_STANDALONE_NOTCH_EDGE', 'Notch edgeIndex must reference a real graded contour edge'); continue
        }
        if (notch.type != null && !['single','double'].includes(notch.type)) {
          fail('UNSUPPORTED_STANDALONE_NOTCH_TYPE', 'Only single and double physical notch types are supported by the current manufacturing DXF exporter')
        }
        const t = notch.t ?? 0.5
        if (!finite(t) || t < 0 || t > 1) fail('INVALID_STANDALONE_NOTCH_FRACTION', 'Notch arclength fraction must be finite in [0,1]')
        const depth = notch.depthCm ?? 0.45
        if (!finite(depth) || depth <= 0) fail('INVALID_STANDALONE_NOTCH_DEPTH', 'Physical notch depth must be finite and positive')
        const a = piece.points[edge], b = piece.points[(edge+1)%piece.points.length], control = piece.curves?.[edge]
        const length = edgeLength(piece, edge)
        if (![a?.x,a?.y,b?.x,b?.y].every(finite) ||
            (control != null && ![control.cx,control.cy].every(finite)) || !finite(length) || length <= 0) {
          fail('INVALID_STANDALONE_NOTCH_EDGE_GEOMETRY', 'Notch edge must be finite and nonzero in physical units')
        }
        const hasX = Object.hasOwn(notch,'x'), hasY = Object.hasOwn(notch,'y')
        if (hasX !== hasY || (hasX && (![notch.x,notch.y].every(finite)))) {
          fail('INVALID_STANDALONE_NOTCH_CACHE', 'Cached x/y must be a complete finite pair or absent')
        } else if (hasX && finite(t) && t >= 0 && t <= 1 && finite(length) && length > 0 &&
                   [a?.x,a?.y,b?.x,b?.y].every(finite) &&
                   (control == null || [control.cx,control.cy].every(finite))) {
          let canonical
          try { canonical = edgePointAt(piece, edge, t, 64)?.point }
          catch { canonical = null }
          if (!canonical || ![canonical.x,canonical.y].every(finite)) {
            fail('INVALID_STANDALONE_NOTCH_STATION', 'Cannot resolve the canonical physical notch station')
          } else if (Math.hypot(notch.x-canonical.x,notch.y-canonical.y) > 0.001) {
            fail('STALE_STANDALONE_NOTCH_CACHE', 'Cached x/y drift by more than 0.01 mm from the graded edge station')
          }
        }
        const allowance = getEdgeSeamAllowance(piece,edge)
        if (!finite(allowance) || !finite(depth) || !(allowance > depth + 0.05)) {
          fail('UNSAFE_STANDALONE_NOTCH_ALLOWANCE', 'Physical notch depth must leave >0.05 cm uncut allowance')
        }
        checks.push({size,pieceId:piece.id,notchId:id,edgeIndex:edge,t,depthCm:depth,allowanceCm:allowance})
      }
      for (const id of sourceIds.get(piece.id) || []) if (!seen.has(id)) {
        add('NOTCH_LOST_ON_GRADE', size, piece.id, id, 'Authored physical notch is missing in this graded size')
      }
    }
    for (const piece of project.pieces) if (validId(piece?.id) && !seenPieces.has(piece.id)) {
      add('NOTCH_PIECE_LOST_ON_GRADE', size, piece.id, 'notch-set', 'Authored piece is missing in this graded size')
    }
  }
  return result(sizes)
  function result(checkedSizes) { return {
    schema:'exo-standalone-notch-all-size-preflight-study.v1',
    status:issues.length?'blocked':checks.length?'pass':'not_configured',
    blockers:issues.length, issues, checks, checkedSizes:[...checkedSizes],
    factoryCertified:false, factoryCuttingAuthorized:false,
    factoryDxfGeometryVerified:false,
    disclaimer:'Development-only all-size standalone notch diagnostics; does not exercise physical CUT offsets, double-notch cuts, manufacturing DXF or external CAD and is not connected to release.',
  } }
}
