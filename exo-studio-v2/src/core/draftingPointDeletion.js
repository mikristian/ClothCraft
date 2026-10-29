// Plan a safe 2D outline vertex deletion before starting an undo transaction.
// All coordinates remain in the existing EXO pattern unit (centimetres).
import { inspectDraftTopology } from './draftingTopology.js'

import { rustDeletedPointEdgeIndex, rustDeletionTopologyValid } from './rustGeometryKernel.js'

const EDGE_ATTACHMENTS = ['topstitches', 'bindings', 'zippers']

export function deletedPointEdgeIndex(edgeIndex, pointIndex, count) {
  // Validate all three IDs before calling the native kernel. A corrupt deleted
  // vertex can otherwise remap a surviving attachment onto the wrong edge.
  if (!Number.isSafeInteger(count) || count < 3 ||
    !Number.isSafeInteger(pointIndex) || pointIndex < 0 || pointIndex >= count ||
    !Number.isSafeInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= count) return null
  const native = rustDeletedPointEdgeIndex(edgeIndex, pointIndex, count)
  if (native !== undefined) return native
  const previous = (pointIndex - 1 + count) % count
  if (edgeIndex === previous || edgeIndex === pointIndex) return null
  return pointIndex === 0 ? edgeIndex - 1 : (edgeIndex > pointIndex ? edgeIndex - 1 : edgeIndex)
}

export function planDraftPointDeletion(piece, pointIndex) {
  const count = piece?.points?.length || 0
  if (!piece || piece.locked) throw new Error('Unlock the pattern before deleting a point')
  if (!Number.isInteger(pointIndex) || pointIndex < 0 || pointIndex >= count) {
    throw new Error('Select a valid pattern point')
  }
  if (count <= 3) throw new Error('A closed pattern needs at least three points')
  const previous = (pointIndex - 1 + count) % count
  // The editor remaps every surviving edge attachment after deletion. Do not
  // allow malformed references to survive that remap as dangling factory data.
  for (const collection of ['notches', ...EDGE_ATTACHMENTS]) {
    const attachments = piece[collection] ?? []
    if (!Array.isArray(attachments)) throw new Error(`Invalid ${collection} collection`)
    // Array#some skips holes. A sparse attachment list must not silently pass
    // preflight and leave invalid sewing references for the editor to remap.
    for (let i = 0; i < attachments.length; i++) {
      if (!Object.hasOwn(attachments, i) || !attachments[i] ||
        !Number.isInteger(attachments[i].edgeIndex) ||
        attachments[i].edgeIndex < 0 || attachments[i].edgeIndex >= count) {
        throw new Error(`Invalid ${collection} edge index; repair the pattern before deleting a point`)
      }
    }
  }
  if ((piece.notches || []).some(n => n.edgeIndex === previous || n.edgeIndex === pointIndex)) {
    throw new Error('Move or remove notches on either adjacent edge before deleting this point')
  }
  for (const collection of EDGE_ATTACHMENTS) {
    if ((piece[collection] || []).some(item => item.edgeIndex === previous || item.edgeIndex === pointIndex)) {
      throw new Error(`Remove ${collection} on the adjacent edges before deleting this point`)
    }
  }
  const curves = {}
  for (const [key, value] of Object.entries(piece.curves || {})) {
    const index = Number(key)
    // Curve keys are outline edge IDs. Reject corrupt/aliased IDs instead of
    // silently discarding them or overwriting another curve during remapping.
    if (!Number.isInteger(index) || index < 0 || index >= count || String(index) !== key) {
      throw new Error(`Invalid curve edge index "${key}"; repair the pattern before deleting a point`)
    }
    const mapped = deletedPointEdgeIndex(index, pointIndex, count)
    if (mapped !== null) curves[mapped] = value
  }
  const points = piece.points.filter((_, index) => index !== pointIndex)
  const candidate = { ...piece, points, curves }
  if (!(rustDeletionTopologyValid(candidate) ?? inspectDraftTopology(candidate, {curveSamples: 24}).valid)) {
    throw new Error('Deleting this point would make an invalid or self-intersecting cutline')
  }
  return { points, curves, previous, count }
}
