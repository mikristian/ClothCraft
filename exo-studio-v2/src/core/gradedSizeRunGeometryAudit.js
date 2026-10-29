import { gradeProject } from './grading.js'
import { samplePieceBoundary } from './project.js'

// Inspect *changes introduced by grading*, not pre-existing source drafting
// defects. This diagnostic is deliberately read-only and is not a factory
// certification or a replacement for CAD round-trip acceptance.
function twiceSignedArea(points) {
  let area = 0
  for (let index = 0; index < points.length; index++) {
    const a = points[index]
    const b = points[(index + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area
}

const edgeLength = (points, index) => {
  const a = points[index]
  const b = points[(index + 1) % points.length]
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function auditGradedSizeRunGeometry(project, { minEdgeCm = 0.005, minAreaCm2 = 0.1 } = {}) {
  if (!project || !Array.isArray(project.pieces)) throw new TypeError('A project with pattern pieces is required')
  if (!Number.isFinite(minEdgeCm) || minEdgeCm < 0 || !Number.isFinite(minAreaCm2) || minAreaCm2 < 0) {
    throw new RangeError('Geometry audit tolerances must be finite nonnegative numbers')
  }
  const sizes = project.grading?.sizes?.length ? project.grading.sizes : [project.grading?.baseSize || 'M']
  const issues = []
  let inspectedPieces = 0
  for (const size of sizes) {
    const graded = gradeProject(project, size)
    for (const original of project.pieces) {
      const piece = graded.pieces.find(candidate => candidate.id === original.id)
      if (!piece || !Array.isArray(piece.points) || piece.points.length !== original.points.length) {
        issues.push({ code: 'GRADED_POINT_COUNT', size, pieceId: original.id })
        continue
      }
      inspectedPieces++
      const points = piece.points
      if (points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
        issues.push({ code: 'GRADED_NONFINITE', size, pieceId: original.id })
        continue
      }
      if (points.length < 3) continue
      // Curved cut-piece outlines can invert even when their control vertices
      // keep the same winding. Audit the actual sampled stitchline rather than
      // the straight polygon joining its endpoints. This is diagnostic only:
      // never silently repair a manufacturer's pattern.
      const baseBoundary = samplePieceBoundary(original, 24).points
      const gradedBoundary = samplePieceBoundary(piece, 24).points
      if (baseBoundary.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y)) ||
          gradedBoundary.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
        issues.push({ code: 'GRADED_NONFINITE_BOUNDARY', size, pieceId: original.id })
        continue
      }
      const baseArea = twiceSignedArea(baseBoundary) / 2
      const gradedArea = twiceSignedArea(gradedBoundary) / 2
      if (Math.abs(baseArea) >= minAreaCm2 && Math.abs(gradedArea) < minAreaCm2) {
        issues.push({ code: 'GRADED_AREA_COLLAPSE', size, pieceId: original.id, baseAreaCm2: baseArea, gradedAreaCm2: gradedArea })
      } else if (Math.abs(baseArea) >= minAreaCm2 && Math.abs(gradedArea) >= minAreaCm2 && Math.sign(baseArea) !== Math.sign(gradedArea)) {
        issues.push({ code: 'GRADED_WINDING_FLIP', size, pieceId: original.id, baseAreaCm2: baseArea, gradedAreaCm2: gradedArea })
      }
      for (let index = 0; index < points.length; index++) {
        if (edgeLength(original.points, index) >= minEdgeCm && edgeLength(points, index) < minEdgeCm) {
          issues.push({ code: 'GRADED_EDGE_COLLAPSE', size, pieceId: original.id, edgeIndex: index })
        }
      }
    }
  }
  return { pass: issues.length === 0, inspectedSizes: sizes.length, inspectedPieces, issues }
}
