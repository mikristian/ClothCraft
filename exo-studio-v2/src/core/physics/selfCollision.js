import * as THREE from 'three'
import { selfCollisionPairScalarsInto } from '../rustSelfCollisionKernel.js'

const EPSILON = 1e-6

// Symmetric spatial-hash particle contacts. Standalone from sewing, body
// collision, rendering, and backend transport; all behavior is preserved.
export function resolveSelfCollisions(simulation, minimumDistance) {
  if (!Number.isFinite(minimumDistance) || minimumDistance < 0) {
    throw new RangeError('Self-collision distance must be finite and nonnegative')
  }
  if (minimumDistance <= EPSILON) return
  const cellSize = minimumDistance
  const grid = new Map()
  const particles = []
  // Cache cell coordinates when populating the grid rather than flooring each
  // particle's coordinates again during the 27-neighbor candidate walk.
  const particleCells = []
  const keyFor = (particle) => {
    const x = Math.floor(particle.position.x / cellSize)
    const y = Math.floor(particle.position.y / cellSize)
    const z = Math.floor(particle.position.z / cellSize)
    return { x, y, z, key: `${x}:${y}:${z}` }
  }

  for (const piece of simulation.pieces.values()) {
    for (const particle of piece.particles) {
      if (!Number.isSafeInteger(particle.simIndex) || particle.simIndex < 0 ||
          !Number.isFinite(particle.invMass) || particle.invMass < 0 ||
          !Number.isFinite(particle.position.x) || !Number.isFinite(particle.position.y) || !Number.isFinite(particle.position.z)) {
        throw new RangeError('Invalid self-collision particle state')
      }
      const cell = keyFor(particle)
      let bucket = grid.get(cell.key)
      if (!bucket) {
        bucket = []
        grid.set(cell.key, bucket)
      }
      bucket.push(particle)
      particles.push(particle)
      particleCells.push(cell)
    }
  }

  const minSq = minimumDistance * minimumDistance
  const fusedPiecePairs = simulation.fusedPiecePairs
  const collisionExclusions = simulation.collisionExclusions
  // Multiple particles often occupy one grid cell. Its ordered 27-neighbor
  // bucket list remains constant for this whole pass (positions only change
  // after accumulation), so construct it once per occupied source cell.
  const neighborhoodCache = new Map()
  // Sequential pair evaluation can safely reuse its own numeric scratch;
  // no caller retains it and all correction scalars are consumed immediately.
  const pairScalars = new Float64Array(7)
  const corrections = new Map()
  const addCorrection = (particle, direction, scale) => {
    let correction = corrections.get(particle.simIndex)
    if (!correction) {
      correction = new THREE.Vector3()
      corrections.set(particle.simIndex, correction)
    }
    correction.addScaledVector(direction, scale)
  }
  const outwardDirection = (particle) => {
    const mode = particle.wrapMode || ''
    let centerX = 0
    if (mode === 'left-arm') centerX = -0.285
    else if (mode === 'right-arm') centerX = 0.285
    else if (mode.startsWith('left-leg')) centerX = -0.105
    else if (mode.startsWith('right-leg')) centerX = 0.105
    const direction = new THREE.Vector3(particle.position.x - centerX, 0, particle.position.z)
    if (direction.lengthSq() <= EPSILON) direction.set(0, 0, particle.collisionSideZ || 1)
    else direction.normalize()
    return direction
  }
  for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
    const particle = particles[particleIndex]
    // Pinned particles still generate contacts for movable neighbors. Skipping
    // them here loses any pair whose lower simIndex belongs to a pin, because
    // pair traversal only visits neighbors with a higher index.
    const cell = particleCells[particleIndex]
    let neighborhoods = neighborhoodCache.get(cell.key)
    if (!neighborhoods) {
      neighborhoods = []
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            const candidates = grid.get(`${cell.x + dx}:${cell.y + dy}:${cell.z + dz}`)
            if (candidates) neighborhoods.push(candidates)
          }
        }
      }
      neighborhoodCache.set(cell.key, neighborhoods)
    }
    for (const candidates of neighborhoods) {
      for (const other of candidates) {
        if (other.simIndex <= particle.simIndex) continue
        if (particle.pieceId !== other.pieceId && fusedPiecePairs && fusedPiecePairs.size !== 0) {
          // Array.sort() uses lexicographic string ordering. Form the
          // identical key without allocating/sorting an array per pair for
          // valid garment string IDs. The original path is retained for
          // malformed/non-string IDs (e.g. null/undefined join semantics).
          const a = particle.pieceId
          const b = other.pieceId
          const fusedKey = typeof a === 'string' && typeof b === 'string'
            ? (a < b ? `${a}|${b}` : `${b}|${a}`)
            : [a, b].sort().join('|')
          if (fusedPiecePairs.has(fusedKey)) continue
        }
        const left = particle.simIndex
        const right = other.simIndex
        if (collisionExclusions && collisionExclusions.size !== 0 && collisionExclusions.has(`${left}:${right}`)) continue
        // Most spatial-hash candidates are not in contact. Reject by
        // squared distance BEFORE allocating a Vector3; keep the same
        // traversal, filters, pair-scalar ABI and correction summation.
        const deltaX = other.position.x - particle.position.x
        const deltaY = other.position.y - particle.position.y
        const deltaZ = other.position.z - particle.position.z
        const distanceSq = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ
        if (distanceSq >= minSq) continue
        const delta = new THREE.Vector3(deltaX, deltaY, deltaZ)
        const layerA = particle.layerIndex || 0
        const layerB = other.layerIndex || 0
        const [distance, , wa, wb, scaleA, scaleB, active] = selfCollisionPairScalarsInto(
          pairScalars, minimumDistance, distanceSq, particle.invMass, other.invMass, layerA, layerB)
        if (layerA !== layerB) {
          const higher = layerA > layerB ? particle : other
          const outward = outwardDirection(higher)
          // delta is A -> B. Orient the preferred vector so separation
          // always places the higher layer farther from the body.
          const preferred = layerB > layerA ? outward : outward.multiplyScalar(-1)
          if (distanceSq <= EPSILON) delta.copy(preferred)
          else {
            delta.multiplyScalar(1 / distance)
            if (delta.dot(preferred) < 0.65) delta.lerp(preferred, 0.82).normalize()
          }
        } else if (distanceSq <= EPSILON) delta.set(1, 0, 0)
        else delta.multiplyScalar(1 / distance)
        if (!active) continue
        if (wa > 0) addCorrection(particle, delta, scaleA)
        if (wb > 0) addCorrection(other, delta, scaleB)
      }
    }
  }

  // Apply all pair corrections together. This avoids left/right bias from the
  // iteration order of the piece map and keeps mirrored garments much closer
  // to physically symmetric behavior.
  for (const particle of particles) {
    const correction = corrections.get(particle.simIndex)
    if (correction && particle.invMass > 0) particle.position.add(correction)
  }
}

