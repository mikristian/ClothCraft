// Validate the face topology before any staging solver indexes its edges.
// Degenerate and malformed faces cannot establish meaningful rest lengths.
export function validateNativeAssemblyMeshFaces20261027(payload) {
  const owners = new Set()
  for (const piece of payload.pieces) {
    if (!Array.isArray(piece?.particleIndices) || !Array.isArray(piece?.flatVerticesM) ||
        !Array.isArray(piece?.faces) || piece.particleIndices.length !== piece.flatVerticesM.length)
      throw new RangeError('Invalid native assembly panel topology')
    // Material vertices are also sampled when staging body contact. Validate
    // unreferenced vertices before they can enter per-panel hint generation.
    for (const point of piece.flatVerticesM) {
      if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite))
        throw new RangeError('Invalid native assembly material vertex')
    }
    for (const index of piece.particleIndices) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= payload.particles.length || owners.has(index))
        throw new RangeError('Native assembly particle has invalid or multiple panel ownership')
      owners.add(index)
    }
    for (const face of piece.faces) {
      if (!Array.isArray(face) || face.length !== 3 ||
          face.some(index => !Number.isSafeInteger(index) || index < 0 || index >= piece.particleIndices.length) ||
          new Set(face).size !== 3)
        throw new RangeError('Invalid native assembly triangle indices')
      const [a,b,c] = face.map(index => piece.flatVerticesM[index])
      if ([a,b,c].some(point => !Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)))
        throw new RangeError('Invalid native assembly flat triangle coordinates')
      const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2]
      const vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2]
      const crossX=uy*vz-uz*vy, crossY=uz*vx-ux*vz, crossZ=ux*vy-uy*vx
      if (!Number.isFinite(Math.hypot(crossX,crossY,crossZ)) || Math.hypot(crossX,crossY,crossZ)<=1e-12)
        throw new RangeError('Degenerate native assembly flat triangle')
    }
  }
}
