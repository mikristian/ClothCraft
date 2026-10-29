import { gradeProject } from './grading.js'
import { samplePieceBoundary } from './project.js'

// A winding/area check cannot detect a bow-tie whose signed area stays
// positive. This separate diagnostic catches *new* proper intersections of
// sampled stitchline segments; pre-existing crossings are not blamed on
// grading. Endpoint contacts and coincident edges need their own CAD review.
const finitePoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.y)
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

function properIntersection(a, b, c, d) {
  if (Math.max(a.x, b.x) <= Math.min(c.x, d.x) ||
      Math.max(c.x, d.x) <= Math.min(a.x, b.x) ||
      Math.max(a.y, b.y) <= Math.min(c.y, d.y) ||
      Math.max(c.y, d.y) <= Math.min(a.y, b.y)) return false
  const tolerance = 1e-10 * Math.hypot(b.x - a.x, b.y - a.y) *
    Math.hypot(d.x - c.x, d.y - c.y) + 1e-12
  const abC = cross(a, b, c), abD = cross(a, b, d)
  const cdA = cross(c, d, a), cdB = cross(c, d, b)
  return ((abC > tolerance && abD < -tolerance) || (abC < -tolerance && abD > tolerance)) &&
    ((cdA > tolerance && cdB < -tolerance) || (cdA < -tolerance && cdB > tolerance))
}

/** Return pairs of source edge indices that properly cross the sampled cutline. */
export function findBoundaryCrossingPairs(piece, segmentsPerCurve = 16) {
  if (!Number.isInteger(segmentsPerCurve) || segmentsPerCurve < 2 || segmentsPerCurve > 64) {
    throw new RangeError('Boundary sampling must use 2 to 64 segments per curve')
  }
  if (!Array.isArray(piece?.points) || piece.points.length < 3 ||
      piece.points.some(point => !finitePoint(point))) {
    throw new TypeError('Boundary crossing audit requires at least three finite vertices')
  }
  const paths = samplePieceBoundary(piece, segmentsPerCurve).edgePaths
  const segments = []
  for (let edgeIndex = 0; edgeIndex < paths.length; edgeIndex++) {
    for (let sample = 0; sample < paths[edgeIndex].length - 1; sample++) {
      const a = paths[edgeIndex][sample], b = paths[edgeIndex][sample + 1]
      if (!finitePoint(a) || !finitePoint(b)) throw new TypeError('Boundary curve samples must be finite')
      if (a.x !== b.x || a.y !== b.y) segments.push({ edgeIndex, a, b })
    }
  }
  const pairs = new Set()
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i], b = segments[j]
      if (a.edgeIndex === b.edgeIndex) continue
      const low = Math.min(a.edgeIndex, b.edgeIndex), high = Math.max(a.edgeIndex, b.edgeIndex)
      const key = `${low}:${high}`
      if (!pairs.has(key) && properIntersection(a.a, a.b, b.a, b.b)) pairs.add(key)
    }
  }
  return [...pairs].sort()
}

/** Read-only size-run preflight; reports only crossing edge pairs introduced by grading. */
export function auditGradedBoundaryCrossings(project, { segmentsPerCurve = 16 } = {}) {
  if (!project || !Array.isArray(project.pieces)) throw new TypeError('A project with pattern pieces is required')
  const originalById = new Map(project.pieces.map(piece => [piece.id, piece]))
  if (originalById.size !== project.pieces.length) throw new Error('Pattern piece IDs must be unique')
  const basePairs = new Map(project.pieces.map(piece => [piece.id,
    new Set(findBoundaryCrossingPairs(piece, segmentsPerCurve))]))
  const sizes = project.grading?.sizes?.length ? project.grading.sizes : [project.grading?.baseSize || 'M']
  const issues = []
  let inspectedPieces = 0
  for (const size of sizes) {
    const graded = gradeProject(project, size)
    const gradedById = new Map(graded.pieces.map(piece => [piece.id, piece]))
    for (const original of project.pieces) {
      const piece = gradedById.get(original.id)
      if (!piece || piece.points?.length !== original.points.length) {
        issues.push({ code: 'GRADED_BOUNDARY_TOPOLOGY', size, pieceId: original.id })
        continue
      }
      inspectedPieces++
      const crossings = findBoundaryCrossingPairs(piece, segmentsPerCurve)
      for (const pair of crossings) {
        if (basePairs.get(original.id).has(pair)) continue
        const [firstEdge, secondEdge] = pair.split(':').map(Number)
        issues.push({ code: 'GRADED_BOUNDARY_CROSSING', size, pieceId: original.id, firstEdge, secondEdge })
      }
    }
  }
  return { pass: issues.length === 0, inspectedSizes: sizes.length, inspectedPieces, issues }
}
