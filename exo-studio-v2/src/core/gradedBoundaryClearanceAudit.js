import { gradeProject } from './grading.js'
import { samplePieceBoundary } from './project.js'
import { findBoundaryCrossingPairs } from './gradedBoundaryCrossingsAudit.js'

// Read-only early warning for graded stitchlines that nearly touch themselves.
// Proper crossings have a separate audit; this catches close approaches,
// tangencies and endpoint contacts before a cutter encounters a sliver.
const finite = point => Number.isFinite(point?.x) && Number.isFinite(point?.y)
const squaredDistance = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

function pointSegmentDistanceSquared(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return squaredDistance(p, a)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return squaredDistance(p, { x: a.x + t * dx, y: a.y + t * dy })
}

function segmentsIntersect(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const ac = cross(a, b, c), ad = cross(a, b, d)
  const ca = cross(c, d, a), cb = cross(c, d, b)
  if ((ac > 0 && ad < 0 || ac < 0 && ad > 0) && (ca > 0 && cb < 0 || ca < 0 && cb > 0)) return true
  // Collinear overlaps and exact endpoint contacts also have zero clearance.
  const onSegment = (p, q, r) => Math.min(p.x, q.x) <= r.x && r.x <= Math.max(p.x, q.x) &&
    Math.min(p.y, q.y) <= r.y && r.y <= Math.max(p.y, q.y)
  return (ac === 0 && onSegment(a, b, c)) || (ad === 0 && onSegment(a, b, d)) ||
    (ca === 0 && onSegment(c, d, a)) || (cb === 0 && onSegment(c, d, b))
}

function edgeDistanceSquared(first, second, upperBoundSquared) {
  let best = upperBoundSquared
  for (let i = 0; i < first.length - 1; i++) {
    const a = first[i], b = first[i + 1]
    for (let j = 0; j < second.length - 1; j++) {
      const c = second[j], d = second[j + 1]
      // Bounding-box distance is a conservative lower bound. This avoids
      // evaluating distant sampled curves without losing close contacts.
      const dx = Math.max(0, Math.min(a.x, b.x) - Math.max(c.x, d.x), Math.min(c.x, d.x) - Math.max(a.x, b.x))
      const dy = Math.max(0, Math.min(a.y, b.y) - Math.max(c.y, d.y), Math.min(c.y, d.y) - Math.max(a.y, b.y))
      if (dx * dx + dy * dy >= best) continue
      if (segmentsIntersect(a, b, c, d)) return 0
      best = Math.min(best,
        pointSegmentDistanceSquared(a, c, d), pointSegmentDistanceSquared(b, c, d),
        pointSegmentDistanceSquared(c, a, b), pointSegmentDistanceSquared(d, a, b))
    }
  }
  return best
}

function sampledPaths(piece, segmentsPerCurve) {
  if (!Array.isArray(piece?.points) || piece.points.length < 3 || piece.points.some(point => !finite(point))) {
    throw new TypeError('Clearance audit requires at least three finite pattern vertices')
  }
  const paths = samplePieceBoundary(piece, segmentsPerCurve).edgePaths
  if (paths.some(path => path.length < 2 || path.some(point => !finite(point)))) {
    throw new TypeError('Clearance audit requires finite sampled stitchline edges')
  }
  return paths
}

/** Only non-neighboring source edges are compared; neighboring edges share an intentional corner. */
export function findBoundaryNearContacts(piece, { minClearanceCm = 0.1, minArcSeparationCm = 1, segmentsPerCurve = 24 } = {}) {
  if (!Number.isFinite(minClearanceCm) || minClearanceCm <= 0) throw new RangeError('Minimum clearance must be positive and finite')
  if (!Number.isFinite(minArcSeparationCm) || minArcSeparationCm < 0) throw new RangeError('Minimum arc separation must be finite and nonnegative')
  if (!Number.isInteger(segmentsPerCurve) || segmentsPerCurve < 2 || segmentsPerCurve > 64) {
    throw new RangeError('Boundary sampling must use 2 to 64 segments per curve')
  }
  const paths = sampledPaths(piece, segmentsPerCurve)
  const thresholdSquared = minClearanceCm ** 2
  // Dense imported outlines have many short edges along one smooth contour.
  // Exclude edge pairs close along the contour itself, not only index neighbors.
  const edgeLengths = paths.map(path => path.slice(1).reduce((sum, point, index) =>
    sum + Math.hypot(point.x - path[index].x, point.y - path[index].y), 0))
  const prefix = [0]
  for (const length of edgeLengths) prefix.push(prefix[prefix.length - 1] + length)
  const perimeter = prefix[prefix.length - 1]
  // Crossing pairs already have a dedicated, stronger failure category.
  // Keep this audit focused on near-misses and tangencies instead.
  const crossingPairs = new Set(findBoundaryCrossingPairs(piece, segmentsPerCurve))
  const contacts = []
  for (let firstEdge = 0; firstEdge < paths.length; firstEdge++) {
    for (let secondEdge = firstEdge + 2; secondEdge < paths.length; secondEdge++) {
      if (firstEdge === 0 && secondEdge === paths.length - 1) continue
      if (crossingPairs.has(`${firstEdge}:${secondEdge}`)) continue
      const forwardGap = prefix[secondEdge] - prefix[firstEdge + 1]
      const reverseGap = perimeter - prefix[secondEdge + 1] + prefix[firstEdge]
      if (Math.min(forwardGap, reverseGap) < minArcSeparationCm) {
        // Skip only near-parallel *same-direction* neighbors. Opposing edges
        // of a genuinely narrow panel must still be reported.
        const a = paths[firstEdge], b = paths[secondEdge]
        const av = { x: a.at(-1).x - a[0].x, y: a.at(-1).y - a[0].y }
        const bv = { x: b.at(-1).x - b[0].x, y: b.at(-1).y - b[0].y }
        const norm = Math.hypot(av.x, av.y) * Math.hypot(bv.x, bv.y)
        if (norm > 0 && (av.x * bv.x + av.y * bv.y) / norm > 0.8) continue
      }
      const distanceSquared = edgeDistanceSquared(paths[firstEdge], paths[secondEdge], thresholdSquared)
      if (distanceSquared < thresholdSquared) contacts.push({ firstEdge, secondEdge, clearanceCm: Math.sqrt(distanceSquared) })
    }
  }
  return contacts
}

/** Report only contacts introduced by grading, not already-close base geometry. */
export function auditGradedBoundaryClearance(project, options = {}) {
  if (!project || !Array.isArray(project.pieces)) throw new TypeError('A project with pattern pieces is required')
  const originalById = new Map(project.pieces.map(piece => [piece.id, piece]))
  if (originalById.size !== project.pieces.length) throw new Error('Pattern piece IDs must be unique')
  const baseContacts = new Map(project.pieces.map(piece => [piece.id,
    new Set([
      ...findBoundaryNearContacts(piece, options).map(contact => `${contact.firstEdge}:${contact.secondEdge}`),
      ...findBoundaryCrossingPairs(piece, options.segmentsPerCurve ?? 24),
    ])]))
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
      for (const contact of findBoundaryNearContacts(piece, options)) {
        if (baseContacts.get(original.id).has(`${contact.firstEdge}:${contact.secondEdge}`)) continue
        issues.push({ code: 'GRADED_BOUNDARY_NEAR_CONTACT', size, pieceId: original.id, ...contact })
      }
    }
  }
  return { pass: issues.length === 0, inspectedSizes: sizes.length, inspectedPieces, issues }
}
