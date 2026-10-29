// Mesh inspection selection state is independent of simulation particles.
// Face indices are stable only for the current generated topology.
import { initializeRustMeshSelectionKernel, rustMergeMeshSelection } from './rustMeshSelectionKernel.js'
// Load the compiled kernel when this module is used in the browser; early calls
// continue through the compatibility path until the asynchronous load finishes.
if (typeof window !== 'undefined' && typeof fetch === 'function') {
  void initializeRustMeshSelectionKernel()
}
export function mergeMeshFaceSelection(previous, pieceId, faceIndex, face, additive = false) {
  if (!pieceId || !Number.isInteger(faceIndex) || faceIndex < 0 || !face) return null
  const same = previous?.pieceId === pieceId
  const indices = additive && same ? [...(previous.triangleIndices || [])] : []
  const existing = indices.indexOf(faceIndex)
  if (existing >= 0) {
    if (additive) indices.splice(existing, 1)
  } else indices.push(faceIndex)
  if (!indices.length) return null
  const faceVertices = additive && same ? [...(previous.faceVertices || [])] : []
  const oldFace = faceVertices.findIndex(item => item.faceIndex === faceIndex)
  if (oldFace >= 0) faceVertices.splice(oldFace, 1)
  if (existing < 0) faceVertices.push({ faceIndex, vertices: [face.a, face.b, face.c] })
  // Pass original index list (before toggle) and updated face metadata in a single WASM call.
  // Preserve the JS path for floating-point/non-integer legacy face vertices.
  const rust = rustMergeMeshSelection(additive && same ? previous.triangleIndices || [] : [], faceVertices, faceIndex, additive && same)
  return {
    pieceId,
    triangleIndices: rust?.triangleIndices ?? indices.sort((a, b) => a - b),
    faceVertices,
    vertices: rust?.vertices ?? [...new Set(faceVertices.flatMap(item => item.vertices))].sort((a, b) => a - b),
  }
}
