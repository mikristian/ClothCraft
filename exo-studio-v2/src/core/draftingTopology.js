// CLO-inspired 2D cutting-line validity checks.
// Original, independent Garment Studio geometry. Does not inspect proprietary
// CLO internals. A production pattern must be a finite, closed, non-folding
// contour; crossing segments cannot be trusted for cut/sewing exports.
import { sampleEdge } from './project.js'
import { rustTopologyCollision } from './rustGeometryKernel.js'

const EPS = 1e-7
const cross = (a, b) => a.x * b.y - a.y * b.x
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y)
const near = (a, b, tolerance = 1e-5) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance

// Imported pattern data is untrusted. Reading inherited or accessor-backed
// geometry can execute code or cause preflight to validate a different contour
// from the one eventually persisted to the project.
function ownCoordinate(object, key) {
  if (!object || typeof object !== 'object') return null
  const descriptor = Object.getOwnPropertyDescriptor(object, key)
  return descriptor && Object.hasOwn(descriptor, 'value') && Number.isFinite(descriptor.value)
    ? descriptor.value : null
}

function ownGeometryPoint(object, xKey = 'x', yKey = 'y') {
  const x = ownCoordinate(object, xKey)
  const y = ownCoordinate(object, yKey)
  return x === null || y === null ? null : { x, y }
}

function collision(a, b, c, d) {
  const r = sub(b, a), s = sub(d, c)
  const det = cross(r, s)
  const cma = sub(c, a)
  if (Math.abs(det) >= EPS) {
    const t = cross(cma, s) / det
    const u = cross(cma, r) / det
    if (t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS) {
      return { kind: 'point', point: { x: a.x + t * r.x, y: a.y + t * r.y } }
    }
    return null
  }
  if (Math.abs(cross(cma, r)) >= EPS) return null
  const rr = r.x * r.x + r.y * r.y
  if (rr <= EPS * EPS) return near(a, c) ? { kind: 'point', point: a } : null
  const start = (cma.x * r.x + cma.y * r.y) / rr
  const fromD = sub(d, a)
  const end = (fromD.x * r.x + fromD.y * r.y) / rr
  const low = Math.max(0, Math.min(start, end))
  const high = Math.min(1, Math.max(start, end))
  if (high < low - EPS) return null
  if (high - low > EPS) return { kind: 'overlap' }
  return { kind: 'point', point: { x: a.x + low * r.x, y: a.y + low * r.y } }
}

function segmentsBoundsOverlap(a, b, c, d) {
  return Math.min(a.x,b.x) <= Math.max(c.x,d.x) + EPS
    && Math.max(a.x,b.x) >= Math.min(c.x,d.x) - EPS
    && Math.min(a.y,b.y) <= Math.max(c.y,d.y) + EPS
    && Math.max(a.y,b.y) >= Math.min(c.y,d.y) - EPS
}

function signedArea(points) {
  let value = 0
  // Translate the shoelace products to a local origin: subtracting two
  // ~1e10 products can erase a valid ~1e-5 cm² contour far from (0,0).
  const origin = points[0]
  for (let i=0; i<points.length; i++) {
    const a=points[i], b=points[(i+1)%points.length]
    value += (a.x-origin.x)*(b.y-origin.y) - (b.x-origin.x)*(a.y-origin.y)
  }
  return .5 * value
}

export function inspectDraftTopology(piece, { curveSamples = 16 } = {}) {
  const errors = []
  const sourceVertices = Object.getOwnPropertyDescriptor(piece ?? {}, 'points')
  const vertices = sourceVertices && Object.hasOwn(sourceVertices, 'value') ? sourceVertices.value : null
  if (!Array.isArray(vertices) || vertices.length < 3) {
    return { valid: false, errors: ['A closed pattern needs at least three points'], areaCm2: 0, intersections: [] }
  }
  // Array#some skips sparse slots. Imported/partially edited patterns may
  // contain holes, which must fail before the adjacent-edge loop dereferences
  // the missing vertex (or edit preflight accidentally accepts bad topology).
  for (let i = 0; i < vertices.length; i++) {
    const pointDescriptor = Object.getOwnPropertyDescriptor(vertices, i)
    const p = pointDescriptor && Object.hasOwn(pointDescriptor, 'value')
      ? ownGeometryPoint(pointDescriptor.value) : null
    if (!p || Math.abs(p.x)>100000 || Math.abs(p.y)>100000) {
      return { valid: false, errors: ['Pattern point contains an invalid or out-of-range coordinate'],
        areaCm2: 0, intersections: [] }
    }
  }
  const cleanVertices = vertices.map(point => ownGeometryPoint(point))
  const curveDescriptor = Object.getOwnPropertyDescriptor(piece, 'curves')
  if (curveDescriptor && !Object.hasOwn(curveDescriptor, 'value')) {
    return { valid: false, errors: ['Pattern curve data must contain own finite coordinates'], areaCm2: 0, intersections: [] }
  }
  const sourceCurves = curveDescriptor?.value
  if (sourceCurves != null && (typeof sourceCurves !== 'object' || Array.isArray(sourceCurves))) {
    return { valid: false, errors: ['Pattern curve data must contain own finite coordinates'], areaCm2: 0, intersections: [] }
  }
  const cleanCurves = {}
  for (let edge = 0; edge < vertices.length; edge++) {
    const descriptor = sourceCurves && Object.getOwnPropertyDescriptor(sourceCurves, edge)
    if (sourceCurves && edge in sourceCurves && !descriptor || descriptor && !Object.hasOwn(descriptor, 'value')) {
      return { valid: false, errors: ['Curve control ' + (edge+1) + ' is invalid'], areaCm2: 0, intersections: [] }
    }
    const control = descriptor?.value
    if (control != null) {
      const handle = ownGeometryPoint(control, 'cx', 'cy')
      if (!handle || Math.abs(handle.x)>100000 || Math.abs(handle.y)>100000) {
        return { valid: false, errors: ['Curve control ' + (edge+1) + ' is invalid'], areaCm2: 0, intersections: [] }
      }
      cleanCurves[edge] = { cx: handle.x, cy: handle.y }
    }
  }
  const safePiece = { points: cleanVertices, curves: cleanCurves }
  // NaN would otherwise skip every sample of a curved edge and allow a
  // self-overlapping cutline to pass topology/edit preflight as valid.
  if (typeof curveSamples !== 'number' || !Number.isFinite(curveSamples)) {
    return { valid: false, errors: ['Curve sample budget must be a finite number'],
      areaCm2: 0, intersections: [] }
  }
  const n = vertices.length
  for (let i=0; i<n; i++) {
    const a=vertices[i], b=vertices[(i+1)%n]
    if (Math.hypot(b.x-a.x,b.y-a.y) < .001) {
      errors.push('Adjacent pattern points ' + (i+1) + ' and ' + ((i+1)%n+1) + ' are coincident')
    }
  }
  const pieces = []
  const boundary = []
  const sampling = Math.max(4, Math.min(64, Math.round(curveSamples)))
  for (let edge=0; edge<n; edge++) {
    const curved = safePiece.curves[edge]
    if (curved && (!Number.isFinite(curved.cx) || !Number.isFinite(curved.cy)
        || Math.abs(curved.cx) > 100000 || Math.abs(curved.cy) > 100000)) {
      errors.push('Curve control ' + (edge+1) + ' is invalid')
      continue
    }
    const path = sampleEdge(safePiece,edge,sampling)
    boundary.push(...path.slice(0,-1))
    for (let segment=0; segment<path.length-1; segment++) {
      pieces.push({ edge, segment, a:path[segment], b:path[segment+1] })
    }
  }
  if (errors.length) return { valid:false, errors, areaCm2:0, intersections:[] }
  const area = signedArea(boundary)
  if (Math.abs(area) < 1e-5) errors.push('Pattern has near-zero enclosed area')
  const intersections = []
  for (let i=0; i<pieces.length; i++) {
    const p=pieces[i]
    for (let j=i+1; j<pieces.length; j++) {
      const q=pieces[j]
      if (!segmentsBoundsOverlap(p.a,p.b,q.a,q.b)) continue
      const native = rustTopologyCollision(p.a,p.b,q.a,q.b)
      const result = native ? (native.kind === 'none' ? null : native) : collision(p.a,p.b,q.a,q.b)
      if (!result) continue
      if (p.edge === q.edge) {
        // Sampled chords of the same curve normally touch at their shared
        // endpoint. But a collinear Bézier control can fold a segment back
        // over itself, overlapping even adjacent sampled chords. Reject that
        // physical cutline instead of silently accepting a retraced edge.
        if (Math.abs(p.segment-q.segment) === 1 && result.kind === 'point'
            && near(result.point,p.b)) continue
      } else {
        const next = (p.edge+1)%n === q.edge
        const previous = (q.edge+1)%n === p.edge
        const join = next ? vertices[q.edge] : previous ? vertices[p.edge] : null
        if (result.kind === 'point' && join && near(result.point,join)) continue
      }
      intersections.push({ edgeA:p.edge,edgeB:q.edge,kind:result.kind,
        ...(result.point ? { point:result.point } : {}) })
      if (intersections.length >= 16) break
    }
    if (intersections.length >= 16) break
  }
  if (intersections.length) errors.push('Pattern contour crosses or overlaps itself')
  return {
    valid: errors.length === 0, errors, intersections,
    areaCm2: Math.abs(area), winding: area >= 0 ? 'counterclockwise' : 'clockwise',
  }
}

export function isDraftEditValid(piece, { pointIndex, point, edgeIndex, curve } = {}, options) {
  if (!piece || !Array.isArray(piece.points)) return false
  // A malformed edit must never pass by silently validating the unchanged
  // pattern. Reject orphan edit payloads and nonintegral indices up front.
  if ((pointIndex !== undefined && !Number.isInteger(pointIndex))
    || (edgeIndex !== undefined && !Number.isInteger(edgeIndex))
    || (point !== undefined && pointIndex === undefined)
    || (curve !== undefined && edgeIndex === undefined)) return false
  const updated = { ...piece }
  if (Number.isInteger(pointIndex)) {
    if (!piece.points[pointIndex] || !finitePoint(point)) return false
    updated.points = piece.points.map((p,index) => index === pointIndex
      ? { ...p, x:point.x, y:point.y } : p)
  }
  if (Number.isInteger(edgeIndex)) {
    if (edgeIndex < 0 || edgeIndex >= piece.points.length) return false
    updated.curves = { ...(piece.curves || {}) }
    if (curve === null) delete updated.curves[edgeIndex]
    else if (curve && Number.isFinite(curve.cx) && Number.isFinite(curve.cy)) {
      updated.curves[edgeIndex] = { cx:curve.cx, cy:curve.cy }
    } else return false
  }
  return inspectDraftTopology(updated, options).valid
}
