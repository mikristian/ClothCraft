// Pure solver scheduling. Reject non-finite inputs before they can write NaN
// into every particle and corrupt a live garment document's fitting pose.
import {rustSubsteps,rustRequestedIterations,rustIterations,rustSubDt,rustGravityStep,rustCollisionDistance} from '../rustTimestepKernel.js'
export function resolveSolverTimestep(settings = {}, dt = 1 / 60, maxThickness = 0.002) {
  if (!Number.isFinite(dt) || dt < 0) throw new RangeError(`Invalid simulation dt: ${dt}`)
  if (dt === 0) return null // A paused/no-op frame cannot advance the solver.
  if (!Number.isFinite(maxThickness) || maxThickness < 0) throw new RangeError(`Invalid maximum cloth thickness: ${maxThickness}`)
  const safeDt = Math.min(dt, 1 / 30)
  const gravity = settings.gravity ?? 9.81
  if (!Number.isFinite(gravity) || gravity < 0) throw new RangeError(`Invalid simulation gravity: ${gravity}`)
  const substeps = rustSubsteps(finiteSetting(settings.substeps, 1, 'Substeps'))
  const subDt = rustSubDt(safeDt,substeps)
  const gravityStep = rustGravityStep(gravity,subDt)
  const requestedIterations = rustRequestedIterations(finiteSetting(settings.iterations, 7, 'Iterations'))
  const iterations = rustIterations(requestedIterations,substeps)
  const selfCollisionMargin = settings.selfCollisionMargin ?? 0.002
  if (!Number.isFinite(selfCollisionMargin) || selfCollisionMargin < 0) throw new RangeError(`Invalid self-collision margin: ${selfCollisionMargin}`)
  const selfCollisionDistance = rustCollisionDistance(maxThickness,selfCollisionMargin)
  return { safeDt, gravity, substeps, subDt, gravityStep, requestedIterations, iterations, selfCollisionDistance }
}

function finiteSetting(value, fallback, name) {
  const number = value == null ? fallback : value
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${name} must be a finite positive number`)
  }
  return number
}

// Existing material damping is velocity retention per 1/60 second, not per
// rendered frame. Preserve the 60 Hz calibration while scaling with time.
export function resolveFabricDamping(retention = 0.985, subDt = 1 / 60) {
  if (!Number.isFinite(retention) || retention < 0 || retention > 1) {
    throw new RangeError('Fabric damping must be finite and between 0 and 1')
  }
  if (!Number.isFinite(subDt) || subDt < 0) {
    throw new RangeError('Damping timestep must be finite and nonnegative')
  }
  return subDt === 0 ? 1 : Math.pow(retention, subDt * 60)
}
