// Explicitly separate solver telemetry from garment approval. A finite
// simulation and small mean seam gap do not establish penetration-free fit.
import {rustFitThreshold} from '../rustFitTelemetryKernel.js'
export function assessSimulationFit(quality = {}, options = {}) {
  const limits = {
    maximumStructuralStrainPercent: Number(options.maximumStructuralStrainPercent ?? 15),
    maximumSeamGapMm: Number(options.maximumSeamGapMm ?? 5),
    maximumPenetrationMm: Number(options.maximumPenetrationMm ?? 0.5),
  }
  const failures = []
  const unknown = []
  // Missing and malformed telemetry must not become a measured zero: Number(null)
  // and Number('') are both zero, which could incorrectly clear acceptance.
  const measured = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : NaN
  const strain = measured(quality.structural?.maxStrainPercent)
  const seam = measured(quality.sewing?.maxGapMm)
  const collision = quality.collision || {}
  const strainState=rustFitThreshold(strain,limits.maximumStructuralStrainPercent)
  if (strainState===0) unknown.push('structural-strain-not-measured')
  else if (strainState===2) failures.push('excessive-structural-strain')
  const seamState=rustFitThreshold(seam,limits.maximumSeamGapMm)
  if (seamState===0) unknown.push('seam-gap-not-measured')
  else if (seamState===2) failures.push('open-sewing-seams')
  if (collision.triangleCcdVerified !== true || collision.allFrameIntersectionFree !== true) {
    unknown.push('triangle-ccd-and-entire-trajectory-not-certified')
  }
  const intrusion = collision.maximumIntrusionMm
  const intrusionState=rustFitThreshold(measured(intrusion),limits.maximumPenetrationMm)
  if (intrusionState===0) unknown.push('avatar-intrusion-not-measured')
  else if (intrusionState===2) failures.push('avatar-surface-penetration')
  return {
    status: failures.length ? 'FAILED' : unknown.length ? 'UNVERIFIED' : 'MEASURED_PASS',
    factoryApproved: false, // requires physical fit/sample/quality inspection.
    failures,
    unknown,
    limits,
  }
}
