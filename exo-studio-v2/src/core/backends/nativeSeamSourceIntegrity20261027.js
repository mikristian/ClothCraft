// Establish that native sewing anchors reference the actual material panels.
// This is structural source integrity, not a physical seam-fit certificate.
export function verifyNativeSeamSourceIntegrity20261027(payload) {
  if (!Array.isArray(payload?.pieces) || !Array.isArray(payload?.particles) ||
      !Array.isArray(payload?.constraints) ||
      (payload.virtualSeams !== undefined && !Array.isArray(payload.virtualSeams)))
    throw new TypeError('Invalid native seam source payload')
  const owners = new Map()
  const panelIds = new Set()
  for (const piece of payload.pieces) {
    if (typeof piece?.id !== 'string' || !piece.id || panelIds.has(piece.id) ||
        !Array.isArray(piece.particleIndices) || !Array.isArray(piece.flatVerticesM) ||
        piece.particleIndices.length !== piece.flatVerticesM.length)
      throw new Error('Invalid native panel material mapping')
    panelIds.add(piece.id)
    for (const index of piece.particleIndices) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= payload.particles.length || owners.has(index))
        throw new Error('Native particle has missing or multiple panel owners')
      owners.set(index, piece.id)
    }
  }
  if (!owners.size || owners.size !== payload.particles.length)
    throw new Error('Native particles do not match material panel ownership')
  for (let i = 0; i < payload.particles.length; i++) {
    if (payload.particles[i]?.pieceId !== owners.get(i))
      throw new Error('Native particle panel identity disagrees with material mapping')
  }
  const owner = index => {
    if (!Number.isSafeInteger(index) || !owners.has(index))
      throw new Error('Sewing correspondence references an unknown material particle')
    return owners.get(index)
  }
  let count = 0
  for (const seam of payload.constraints) {
    if (seam?.type !== 'seam') continue
    owner(seam.a); owner(seam.b)
    if (seam.a === seam.b) throw new Error('Sewing correspondence stitches a particle to itself')
    count++
  }
  for (const seam of payload.virtualSeams || []) {
    const anchor = (indices, weights) => {
      if (!Array.isArray(indices) || !Array.isArray(weights) ||
          indices.length < 1 || indices.length !== weights.length)
        throw new Error('Invalid native virtual seam anchor')
      const panel = owner(indices[0])
      let total = 0
      for (let i = 0; i < indices.length; i++) {
        if (owner(indices[i]) !== panel) throw new Error('Virtual seam anchor crosses material panels')
        if (typeof weights[i] !== 'number' || !Number.isFinite(weights[i]) || weights[i] < 0)
          throw new Error('Invalid virtual seam anchor weights')
        total += weights[i]
      }
      if (Math.abs(total - 1) > 1e-5) throw new Error('Virtual seam anchor weights do not sum to one')
      return panel
    }
    anchor(seam.sourceIndices, seam.sourceWeights)
    anchor(seam.targetIndices, seam.targetWeights)
    count++
  }
  if (!count) throw new Error('Native sewing source has no correspondences')
  return {valid:true,seamSamples:count,panelCount:panelIds.size}
}
