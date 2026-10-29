// Centralize the interactive PBD's avatar clearance policy. Contact is an
// iterative particle projection, NOT collision-certified triangle CCD.
// Keep this module independent of a particular avatar implementation by
// injecting the collision projector from the solver.
import {rustAvatarLayerOffset,rustAvatarMargin} from '../rustAvatarContactParametersKernel.js'

export function avatarContactParameters(project, piece) {
  const thickness = piece.fabric?.thickness ?? 0.002
  const layerIndex = piece.layerIndex || 0
  const layerOffset = typeof layerIndex === 'number' && typeof thickness === 'number'
    ? rustAvatarLayerOffset(layerIndex, thickness)
    : layerIndex * Math.max(0.0025, thickness * 1.15)
  const baseMargin = project.simulation?.collisionMargin ?? 0.012
  return {
    margin: typeof baseMargin === 'number' && typeof thickness === 'number'
      ? rustAvatarMargin(baseMargin,thickness,layerOffset)
      : baseMargin + thickness + layerOffset,
    friction: piece.fabric?.friction ?? 0.3,
  }
}

export function projectAvatarContacts(simulation, project, collide, { movableOnly = false } = {}) {
  if (project.simulation?.collisions === false) return 0
  let processed = 0
  for (const piece of simulation.pieces.values()) {
    const { margin, friction } = avatarContactParameters(project, piece)
    for (const particle of piece.particles) {
      if (movableOnly && !(particle.invMass > 0)) continue
      collide(particle, project.avatar, margin, friction)
      processed++
    }
  }
  return processed
}
