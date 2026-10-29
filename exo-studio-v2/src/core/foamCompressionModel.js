/** Deterministic visual approximation of localized viscoelastic foam compression.
 * All lengths are centimeters; time is seconds, pressures are kPa.
 * This is a preview response, NOT the ZOZO PPF FEM/contact solver, nor a
 * measurement-calibrated constitutive law or sewn-fabric simulation.
 */
import {rustFoamFalloff,rustFoamStep} from './rustFoamKernel.js'
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback
const bounded = (value, fallback, min, max) => clamp(finite(value, fallback), min, max)

export const DEFAULT_FOAM_MATERIAL = Object.freeze({
  densityKgM3: 45, compressionKpa: 35, recoverySeconds: 0.45,
  dampingRatio: 1, maxCompression: 0.7, contactRadiusCm: 4,
})

export function normalizeFoamCompressionProperties(properties = {}) {
  const p = properties && typeof properties === 'object' ? properties : {}
  return {
    densityKgM3: bounded(p.densityKgM3, 45, 10, 250),
    compressionKpa: bounded(p.compressionKpa ?? p.stiffnessKpa, 35, 5, 500),
    recoverySeconds: bounded(p.recoverySeconds, 0.45, 0.1, 5),
    dampingRatio: bounded(p.dampingRatio, 1, 0.1, 2),
    maxCompression: bounded(p.maxCompression, 0.7, 0.05, 0.9),
    contactRadiusCm: bounded(p.contactRadiusCm, 4, 1, 20),
    memory: bounded(p.memory, 0, 0, 0.35),
  }
}

export const normalizeFoamMaterial = normalizeFoamCompressionProperties

/** Smooth radial surface contact mask; distance and radius must use the same units. */
export function foamPressFalloff(distanceCm, radiusCm, edgeSoftness = 1) {
  const d = finite(distanceCm, Infinity)
  const r = finite(radiusCm, 0)
  if (d < 0 || r <= 0 || d >= r) return 0
  const softness = bounded(edgeSoftness, 1, 0.05, 1)
  const rust=rustFoamFalloff(d,r,softness)
  if(rust!==null)return rust
  const plateau = r * (1 - softness)
  if (d <= plateau) return 1
  const t = clamp((r - d) / Math.max(1e-9, r - plateau), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Advance a single local press sample. Input:
 * {pressStrength:0..1, pressureKpa, distanceCm, radiusCm, edgeSoftness}.
 * Outputs compression (fraction of foam depth), velocity (fraction/second),
 * memory (fraction), and displacementCm when input.depthCm is provided.
 * The caller owns sampling the mesh and applying its displacement.
 */
export function stepFoamCompressionState(state = {}, input = {}, dt = 0, properties = {}) {
  const p = normalizeFoamCompressionProperties(properties)
  const s = state && typeof state === 'object' ? state : {}
  const command = input && typeof input === 'object' ? input : {}
  let compression = bounded(s.compression, 0, 0, p.maxCompression)
  let velocity = bounded(s.velocity, 0, -30, 30)
  let memory = bounded(s.memory, 0, 0, p.maxCompression)
  const strength = bounded(command.pressStrength ?? (typeof command.press === 'boolean' ? Number(command.press) : command.press), 0, 0, 1)
  const pressure = bounded(command.pressureKpa ?? command.pressure, 35, 0, 10000)
  const falloff = command.radiusCm === undefined && command.distanceCm === undefined ? 1 : foamPressFalloff(
    command.distanceCm ?? 0, command.radiusCm ?? p.contactRadiusCm, command.edgeSoftness,
  )
  const load = strength * falloff
  const target = p.maxCompression * load * pressure / (pressure + p.compressionKpa)
  const seconds = bounded(dt, 0, 0, 0.25)
  const depthCm = bounded(command.depthCm, 0, 0, 100)
  const native=rustFoamStep({compression,velocity,memory,strength,pressure,falloff,
    seconds,depthCm,properties:p})
  if(native!==null)return native
  if (seconds > 0) {
    // Bounded integration and substeps prevent large frame gaps from exploding.
    const omega = clamp((4.6 / p.recoverySeconds) * Math.sqrt((p.compressionKpa / 35) * (45 / p.densityKgM3)), 0.8, 90)
    const steps = Math.ceil(seconds / (1 / 240))
    const h = seconds / steps
    for (let i = 0; i < steps; i++) {
      // Slow reversible residual indentation for memory foam; decays at rest.
      const memoryTarget = target * p.memory
      memory += (memoryTarget - memory) * (1 - Math.exp(-h / (p.recoverySeconds * 2.5)))
      const equilibrium = clamp(target + (load === 0 ? memory : 0), 0, p.maxCompression)
      const acceleration = omega * omega * (equilibrium - compression) - 2 * p.dampingRatio * omega * velocity
      velocity = clamp(velocity + acceleration * h, -30, 30)
      const next = compression + velocity * h
      compression = clamp(next, 0, p.maxCompression)
      if (compression !== next) velocity = 0
    }
  }
  return {compression, velocity, memory, displacementCm: depthCm * compression, targetCompression: target}
}
