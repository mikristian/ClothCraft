// Independent CLO-style 2D drafting geometry. Coordinates are centimeters.
// CLO reference: Snap to Grid and Snap to Pattern are independent preferences.
import { sampleEdge } from './project.js'
import {rustGridCoordinate,rustNearestSegmentT,rustConstrainDraftAxis} from './rustGeometryKernel.js'

const finitePoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y)
// Array#every skips holes; an imported sparse vertex array would otherwise
// reach the snap loop and throw when reading the missing vertex's x/y.
const completeDraftVertices = points => {
  for (let index = 0; index < points.length; index++) {
    if (!finitePoint(points[index])) return false
  }
  return true
}

export function snapDraftGrid(point, spacingCm = 1, origin = { x: 0, y: 0 }) {
  if (!finitePoint(point) || !finitePoint(origin) || !Number.isFinite(spacingCm) || spacingCm <= 0) {
    throw new Error('Invalid 2D drafting grid')
  }
  const snapped = {
    x: rustGridCoordinate(point.x,origin.x,spacingCm),
    y: rustGridCoordinate(point.y,origin.y,spacingCm),
  }
  // Finite inputs can still overflow in the coordinate/spacing quotient.
  // Never return Infinity or NaN to the 2D editor's authored point geometry.
  if (!finitePoint(snapped)) throw new Error('Invalid 2D drafting grid result')
  return snapped
}

// Imported geometry can contain finite endpoints whose subtraction or
// projection overflows. Keep those edges out of snap candidates entirely.
const projectOnDraftSegment = (point, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null
  const t = rustNearestSegmentT(point,a,b)
  if (!Number.isFinite(t) || t < 0 || t > 1) return null
  const projected = { x: a.x + t * dx, y: a.y + t * dy, t }
  return finitePoint(projected) ? projected : null
}

export function nearestOnDraftSegment(point, a, b) {
  if (![point, a, b].every(finitePoint)) throw new Error('Invalid drafting segment')
  const projected = projectOnDraftSegment(point, a, b)
  if (!projected) throw new Error('Invalid drafting segment result')
  return projected
}

// Input/output are *global* SVG coordinates (Y down). Translate each piece's
// local drafting vertices through layout2d before testing candidates.
export function snapDraftPattern(point, pieces, {
  toleranceCm = 1, excludedPieceId = null, excludedPoint = null,
  allowEdges = true, samplesPerCurve = 16,
} = {}) {
  if (!finitePoint(point) || !Number.isFinite(toleranceCm) || toleranceCm <= 0) {
    throw new Error('Invalid drafting snap point or tolerance')
  }
  // sampleEdge loops once per requested Bézier subdivision. Non-finite or
  // unbounded values can otherwise freeze the editor during a snap preview.
  if (!Number.isSafeInteger(samplesPerCurve) || samplesPerCurve < 2 || samplesPerCurve > 256) {
    throw new Error('Invalid drafting curve sampling resolution (2-256)')
  }
  let nearestVertex = null
  let nearestEdge = null
  // Squaring a finite drafting tolerance (or coordinate delta) can overflow
  // to Infinity. Compare stable Euclidean distances instead so far-away
  // imported geometry never becomes an apparently in-range snap candidate.
  let nearestVertexDistance = toleranceCm
  let nearestEdgeDistance = toleranceCm
  const consider = (candidate, info) => {
    if (!finitePoint(candidate)) return
    const distanceCm = Math.hypot(candidate.x - point.x, candidate.y - point.y)
    if (!Number.isFinite(distanceCm)) return
    if (info.kind === 'vertex') {
      if (distanceCm > nearestVertexDistance) return
      nearestVertexDistance = distanceCm
      nearestVertex = { x: candidate.x, y: candidate.y, distanceCm, ...info }
    } else {
      if (distanceCm > nearestEdgeDistance) return
      nearestEdgeDistance = distanceCm
      nearestEdge = { x: candidate.x, y: candidate.y, distanceCm, ...info }
    }
  }
  for (const piece of pieces || []) {
    if (!piece || piece.id === excludedPieceId || !Array.isArray(piece.points)
        || !finitePoint(piece.layout2d)) continue
    // Imported or partially edited patterns may contain incomplete vertices
    // or curve handles. Exclude the entire damaged piece rather than crash
    // the live snap preview or offer a snap on an incomplete cutline.
    if (!completeDraftVertices(piece.points) || Object.values(piece.curves || {}).some(
      control => !control || !Number.isFinite(control.cx) || !Number.isFinite(control.cy))) continue
    const { x: left, y: top } = piece.layout2d
    for (let index = 0; index < piece.points.length; index++) {
      if (excludedPoint?.pieceId === piece.id && (
        excludedPoint.pointIndex === index
        || (excludedPoint.pointIndex + 1) % piece.points.length === index
        || (excludedPoint.pointIndex - 1 + piece.points.length) % piece.points.length === index
      )) continue
      const vertex = piece.points[index]
      consider({ x: left + vertex.x, y: top - vertex.y },
        { kind: 'vertex', pieceId: piece.id, pointIndex: index })
    }
    if (!allowEdges) continue
    for (let edgeIndex = 0; edgeIndex < piece.points.length; edgeIndex++) {
      // Never snap a point to its own adjacent edge: that collapses the cutline.
      if (excludedPoint?.pieceId === piece.id && (
        edgeIndex === excludedPoint.pointIndex
        || (edgeIndex + 1) % piece.points.length === excludedPoint.pointIndex
      )) continue
      const path = sampleEdge(piece, edgeIndex, samplesPerCurve)
      for (let j = 0; j < path.length - 1; j++) {
        const a = { x: left + path[j].x, y: top - path[j].y }
        const b = { x: left + path[j + 1].x, y: top - path[j + 1].y }
        if (!finitePoint(a) || !finitePoint(b)) continue
        const projected = projectOnDraftSegment(point, a, b)
        if (projected) consider(projected, { kind: 'edge', pieceId: piece.id, edgeIndex })
      }
    }
  }
  // Give explicit pattern corners a small magnetic capture zone; otherwise
  // curves and straight edge projections would steal almost every near-
  // corner cursor position and precise vertex snapping would be unusable.
  if (nearestVertex && (nearestVertexDistance <= toleranceCm * 0.6 || !nearestEdge)) return nearestVertex
  return nearestEdge
}

// CLO Shift guidelines: constrain drags to a horizontal, vertical or diagonal
// axis. Project movement onto that ray instead of rotating at equal radius.
export function constrainDraftAxis(start, destination, incrementDegrees = 45) {
  if (!finitePoint(start) || !finitePoint(destination)
    || !Number.isFinite(incrementDegrees) || incrementDegrees <= 0
    || 360 % incrementDegrees !== 0) throw new Error('Invalid drafting guideline')
  // Finite imported endpoints can still overflow when calculating a drag
  // vector. Do not return nonfinite points to the authored 2D pattern, on
  // either the synchronous fallback or compiled Rust geometry backend.
  if (!Number.isFinite(destination.x - start.x)
    || !Number.isFinite(destination.y - start.y)) throw new Error('Invalid drafting guideline movement')
  const constrained = rustConstrainDraftAxis(start,destination,incrementDegrees)
  if (!finitePoint(constrained)) throw new Error('Invalid drafting guideline result')
  return constrained
}
