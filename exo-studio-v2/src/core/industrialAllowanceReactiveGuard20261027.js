import { ALLOWANCE_GRAPH_SCHEMA } from './industrialAllowanceGraph20261027.js'

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const refusal = (code, message) => ({ shouldReapply: false, safe: false, code, reason: message, changedSources: [] })
const ignored = () => ({ shouldReapply: false, safe: true, code: 'NO_SOURCE_CHANGE', reason: 'No linked source allowance changed', changedSources: [] })
const value = (piece, edge) => own(piece.edgeSeamAllowances || {}, String(edge))
  ? piece.edgeSeamAllowances[String(edge)] : (piece.seamAllowance ?? 0)
const valid = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100
const key = ref => JSON.stringify([ref.pieceId, ref.edgeIndex, ref.pointCount])
const withoutGradeRule = points => points.map(point => {
  if (!point || typeof point !== 'object' || Array.isArray(point)) return point
  const { industrialGradeRule, ...geometry } = point
  return geometry
})

/**
 * A read-only eligibility check for automatic reapplication on an immutable before/after
 * legacy-project pair. Caller must still invoke reapplyIndustrialAllowanceGraph(next,
 * { expectedRevision: next.revision }) and replace its project atomically.
 *
 * `safe:false` is a refusal; `safe:true,shouldReapply:false` is a no-op.
 * This deliberately never calls the mutating/recomputing graph API.
 */
export function guardIndustrialAllowanceReactiveReapply(before, next, {verifiedGradeMutation=false}={}) {
  const graph = before?.industrialAllowanceGraph
  if (!graph || graph.schema !== ALLOWANCE_GRAPH_SCHEMA ||
      !Array.isArray(graph.links) || !graph.links.length || !Array.isArray(graph.applied))
    return refusal('UNSUPPORTED_GRAPH', 'A supported saved graph is required')
  if (!same(graph, next?.industrialAllowanceGraph))
    return refusal('GRAPH_CHANGED', 'Graph metadata changed during the project edit')
  if (!Number.isSafeInteger(before.revision) || !Number.isSafeInteger(next?.revision) ||
      next.revision <= before.revision || !Number.isSafeInteger(graph.lastAppliedRevision) ||
      graph.lastAppliedRevision > before.revision)
    return refusal('INVALID_REVISION', 'The edit must advance the revision with valid graph provenance')
  if (!Array.isArray(before.pieces) || !Array.isArray(next.pieces) ||
      !Array.isArray(before.grading?.sizes) || !same(before.grading, next.grading) ||
      !same(graph.sizes, next.grading.sizes) || graph.baseSize !== next.grading.baseSize)
    return refusal('STALE_GRADING', 'Full grading metadata must remain unchanged')
  const previous = new Map(before.pieces.map(p => [p?.id, p]))
  const current = new Map(next.pieces.map(p => [p?.id, p]))
  if (previous.size !== before.pieces.length || current.size !== next.pieces.length)
    return refusal('INVALID_PIECES', 'Piece identifiers must remain unique')
  const sources = new Map(), targets = new Map()
  for (const link of graph.links) {
    for (const [set, ref] of [[sources, link?.source], [targets, link?.target]]) {
      if (typeof ref?.pieceId !== 'string' || !Number.isInteger(ref.edgeIndex) || ref.edgeIndex < 0 ||
          !Number.isInteger(ref.pointCount) || ref.pointCount < 3)
        return refusal('INVALID_ENDPOINT', 'Graph endpoint metadata is invalid')
      const oldPiece = previous.get(ref.pieceId), newPiece = current.get(ref.pieceId)
      if (!oldPiece || !newPiece || !Array.isArray(oldPiece.points) || !Array.isArray(newPiece.points) ||
          oldPiece.points.length !== ref.pointCount || newPiece.points.length !== ref.pointCount ||
          ref.edgeIndex >= ref.pointCount ||
          !(verifiedGradeMutation
            ? same(withoutGradeRule(oldPiece.points),withoutGradeRule(newPiece.points))
            : same(oldPiece.points,newPiece.points)))
        return refusal('STALE_TOPOLOGY', 'Linked endpoint geometry or topology changed')
      set.set(key(ref), ref)
    }
  }
  // Protect all targets even when they also serve as intermediate chain sources.
  const applied = new Map()
  for (const entry of graph.applied) {
    if (!entry?.ref || !valid(entry.value) || applied.has(key(entry.ref)))
      return refusal('INVALID_PROVENANCE', 'Saved applied target inventory is invalid')
    applied.set(key(entry.ref), entry.value)
  }
  if (applied.size !== targets.size || [...targets.keys()].some(k => !applied.has(k)))
    return refusal('INVALID_PROVENANCE', 'Saved target inventory differs from graph links')
  for (const [k, ref] of targets) {
    if (value(previous.get(ref.pieceId), ref.edgeIndex) !== applied.get(k) ||
        value(current.get(ref.pieceId), ref.edgeIndex) !== applied.get(k))
      return refusal('TARGET_MODIFIED', 'A linked target was modified outside propagation')
  }
  const changedSources = []
  for (const [k, ref] of sources) {
    if (targets.has(k)) continue // Intermediate chain nodes belong to the graph, never to manual source edits.
    const from = value(previous.get(ref.pieceId), ref.edgeIndex)
    const to = value(current.get(ref.pieceId), ref.edgeIndex)
    if (!valid(from) || !valid(to)) return refusal('INVALID_ALLOWANCE', 'Source allowance is outside its valid range')
    if (from !== to) changedSources.push({ ...ref, before: from, after: to })
  }
  if (!changedSources.length) return ignored()
  changedSources.sort((a, b) => key(a).localeCompare(key(b), 'en'))
  return { shouldReapply: true, safe: true, code: 'SOURCE_ALLOWANCE_CHANGED',
    reason: 'Linked source allowance changed with intact graph targets', changedSources }
}
