// Pure, atomic linked allowance resolver. Values are centimetres.
// sizeEdgeAllowances is an explicit handoff: existing grading/export paths do
// not consume size-dependent allowances automatically.
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error }
const validValue = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 256
const indexKey = value => Number.isInteger(value) && value >= 0

function cloneSafe(value, seen = new WeakSet(), depth = 0, count = { n: 0 }) {
  if (++count.n > 100000 || depth > 50) fail('UNSAFE_INPUT', 'Input exceeds safe copy limits')
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value
  if (!value || typeof value !== 'object' || seen.has(value)) fail('UNSAFE_INPUT', 'Cyclic, shared, or unsupported input')
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('UNSAFE_INPUT', 'Unsupported object prototype')
  seen.add(value)
  const result = Array.isArray(value) ? [] : Object.getPrototypeOf(value) === null ? Object.create(null) : {}
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length' && Array.isArray(value)) continue
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key)) fail('UNSAFE_INPUT', 'Unsafe metadata key')
    const d = Object.getOwnPropertyDescriptor(value, key)
    if (!d || !own(d, 'value') || !d.enumerable) fail('UNSAFE_INPUT', 'Accessors or hidden metadata cannot be copied safely')
    result[key] = cloneSafe(d.value, seen, depth + 1, count)
  }
  return result
}

/**
 * Resolve link rows {source:{pieceId,edgeIndex,pointCount}, target:{...}, sizes?:string[]}.
 * Require the caller's observed project revision to prevent stale writes.
 * Returns {project,sizeEdgeAllowances,applied}; does not change the input.
 * `sizeEdgeAllowances[size][pieceId][edgeIndex]` contains fully materialized
 * values for each requested size; the returned project's base size overrides
 * are updated, with all other piece/edge metadata preserved.
 */
export function propagateIndustrialAllowanceLinks(project, links, { expectedRevision } = {}) {
  if (!Number.isSafeInteger(project?.revision) || !Number.isSafeInteger(expectedRevision) || expectedRevision !== project.revision)
    fail('STALE_REVISION', 'Project revision differs from the authored link revision')
  const result = cloneSafe(project)
  if (!Array.isArray(result.pieces) || !Array.isArray(result.grading?.sizes) || !validId(result.grading.baseSize) ||
      result.grading.sizes.length === 0 || result.grading.sizes.length > 64 ||
      result.grading.sizes.some(s => !validId(s)) || new Set(result.grading.sizes).size !== result.grading.sizes.length ||
      !result.grading.sizes.includes(result.grading.baseSize)) fail('INVALID_GRADING', 'Invalid size inventory')
  if (!Array.isArray(links) || links.length > 4096) fail('INVALID_LINKS', 'Invalid or oversized link inventory')
  const safeLinks = cloneSafe(links)
  const pieces = new Map()
  for (const piece of result.pieces) {
    if (!validId(piece?.id) || pieces.has(piece.id) || !Array.isArray(piece.points) || piece.points.length < 3 || piece.points.length > 4096)
      fail('INVALID_PIECE', 'Piece IDs and edge topology must be unique and valid')
    if (!validValue(piece.seamAllowance ?? 0) || (piece.edgeSeamAllowances != null &&
      (typeof piece.edgeSeamAllowances !== 'object' || Array.isArray(piece.edgeSeamAllowances) || !piece.edgeSeamAllowances)))
      fail('INVALID_ALLOWANCE', 'Invalid authored allowance')
    for (const [edge, value] of Object.entries(piece.edgeSeamAllowances || {}))
      if (!/^(0|[1-9]\d*)$/.test(edge) || Number(edge) >= piece.points.length || !validValue(value))
        fail('INVALID_ALLOWANCE', 'Invalid authored edge allowance')
    pieces.set(piece.id, piece)
  }
  const sizes = result.grading.sizes
  const valueOf = (piece, edge) => own(piece.edgeSeamAllowances || {}, edge) ? piece.edgeSeamAllowances[edge] : (piece.seamAllowance ?? 0)
  const incoming = new Map(), nodes = new Map()
  const keyOf = (size, ref) => JSON.stringify([size, ref.pieceId, ref.edgeIndex])
  const ensureNode = (size, ref) => {
    const key = keyOf(size, ref)
    if (!nodes.has(key)) nodes.set(key, { size, pieceId: ref.pieceId, edgeIndex: ref.edgeIndex })
    return key
  }
  for (const link of safeLinks) {
    if (!link || typeof link !== 'object' || Array.isArray(link)) fail('INVALID_LINK', 'Link must be an object')
    for (const ref of [link.source, link.target]) {
      const piece = pieces.get(ref?.pieceId)
      if (!piece || !indexKey(ref.edgeIndex) || ref.edgeIndex >= piece.points.length ||
          !indexKey(ref.pointCount) || ref.pointCount !== piece.points.length)
        fail('STALE_TOPOLOGY', 'Link endpoint no longer matches its piece topology')
    }
    const selected = link.sizes === undefined ? sizes : link.sizes
    if (!Array.isArray(selected) || !selected.length || selected.some(s => !sizes.includes(s)) || new Set(selected).size !== selected.length)
      fail('INVALID_SIZE_SCOPE', 'Link size scope is invalid')
    for (const size of selected) {
      const source = ensureNode(size, link.source), target = ensureNode(size, link.target)
      if (source === target) fail('ALLOWANCE_CYCLE', 'Self-linked allowance')
      if (incoming.has(target)) fail('CONFLICTING_LINK', 'Multiple links target the same size and edge')
      incoming.set(target, source)
    }
  }
  const state = new Map(), resolved = new Map()
  function resolve(key) {
    if (state.get(key) === 1) fail('ALLOWANCE_CYCLE', 'Allowance link cycle')
    if (state.get(key) === 2) return resolved.get(key)
    state.set(key, 1)
    const node = nodes.get(key), piece = pieces.get(node.pieceId)
    const value = valueOf(piece, node.edgeIndex)
    if (!validValue(value)) fail('INVALID_ALLOWANCE', 'Invalid linked source allowance')
    // Reverse traversal through the single incoming edge keeps propagation deterministic.
    const parent = incoming.get(key)
    const finalValue = parent ? resolve(parent) : value
    resolved.set(key, finalValue)
    state.set(key, 2)
    return finalValue
  }
  for (const key of nodes.keys()) resolve(key)
  const sizeEdgeAllowances = Object.create(null)
  for (const size of sizes) {
    const byPiece = Object.create(null)
    for (const piece of result.pieces) {
      const edges = Object.create(null)
      for (let edge = 0; edge < piece.points.length; edge++) {
        const key = keyOf(size, { pieceId: piece.id, edgeIndex: edge })
        edges[edge] = resolved.has(key) ? resolved.get(key) : valueOf(piece, edge)
      }
      byPiece[piece.id] = edges
    }
    sizeEdgeAllowances[size] = byPiece
  }
  for (const piece of result.pieces) {
    const overrides = piece.edgeSeamAllowances || Object.create(null)
    for (const [edge, value] of Object.entries(sizeEdgeAllowances[result.grading.baseSize][piece.id])) {
      if (incoming.has(keyOf(result.grading.baseSize, { pieceId: piece.id, edgeIndex: Number(edge) }))) overrides[edge] = value
    }
    if (Object.keys(overrides).length) piece.edgeSeamAllowances = overrides
  }
  return { project: result, sizeEdgeAllowances, applied: incoming.size, factoryCertified: false }
}
