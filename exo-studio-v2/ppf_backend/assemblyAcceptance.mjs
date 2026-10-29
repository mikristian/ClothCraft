import { analyzePpfStagingSeams } from './stagingDiagnostics.mjs'
import { inspectAssemblyGeometry } from './assemblyGeometryIntegrity.mjs'

// A zero-intersection exploded pattern is not a fitting-ready garment.
// This preflight is deliberately independent of the final PPF fit gate.
export function evaluatePpfAssembly(payload, { allowExplodedExperimental = false, deformation = null } = {}) {
  const seams = analyzePpfStagingSeams(payload)
  const geometry = inspectAssemblyGeometry(payload)
  // Near seam endpoints alone cannot certify a warped pattern. A deformed
  // initial arrangement must also satisfy the explicit fabric distortion
  // bound before it is eligible for a native PPF job.
  const deformationValid = deformation == null || (
    deformation.geometryPreservedOrWithinLimit === true &&
    deformation.bodyAndSelfIntersectionFreeAtInitialPose === true &&
    Number.isFinite(Number(deformation.maximumRelativeIntrinsicEdgeChange)) &&
    Number(deformation.maximumRelativeIntrinsicEdgeChange) <= 0.05 &&
    Number(deformation.bodyIntersectionPairs) === 0 &&
    Number(deformation.selfIntersectionPairs) === 0
  )
  const accepted = seams.nearAssembled && deformationValid && geometry.geometryValid
  // An experimental exploded layout may bypass seam proximity only. Invalid
  // triangles, vertices or stitch endpoints must never reach the native solver.
  const experimentalOverride = !accepted && allowExplodedExperimental === true && geometry.geometryValid
  return {
    ...seams,
    ...geometry,
    deformationValid,
    accepted,
    experimentalOverride,
    mayRun: accepted || experimentalOverride,
    reason: accepted ? null : !geometry.geometryValid
      ? `Invalid shell geometry: ${geometry.geometryErrors[0]}.`
      : !deformationValid
      ? 'Nonrigid arrangement failed fabric deformation or initial body/self collision validation.'
      : `Pattern pieces are not near-assembled: maximum stitch gap ${seams.maximumInitialSeamGapCm.toFixed(1)} cm (limit 3 cm).`,
  }
}
