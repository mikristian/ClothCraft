import {rustFoamTriangulate} from './rustFoamTriangulationKernel.js'
// Geometry-only trapunto/foam padding generator. All dimensions are centimetres.
// The input contour and returned paths live in one panel-local XY coordinate space.
const EPS = 1e-8
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
const area = p => p.reduce((sum, v, i) => sum + v[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * v[1], 0) / 2
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const fail = (code, message) => ({valid: false, error: {code, message}, vertices: [], indices: [], stitchPaths: [], cutPath: [], meshes: null, paths: null, metadata: null})
const point = p => Array.isArray(p) ? [p[0], p[1]] : [p?.x, p?.y]

function svgContour(d, subdivisions = 12) {
  if (typeof d !== 'string' || d.length > 250000) throw Error('INVALID_SVG')
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || []
  if (tokens.join('').replace(/\+/g, '') !== d.replace(/[\s,]+/g, '').replace(/\+/g, '')) throw Error('INVALID_SVG')
  let i = 0, command = '', current = [0, 0], start = null, closed = false
  let priorControl = null, priorQuadratic = null, priorCommand = ''
  const out = []
  const argc = {M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, Z: 0}
  const read = n => {
    if (i + n > tokens.length || tokens.slice(i, i + n).some(t => /^[a-zA-Z]$/.test(t))) throw Error('INVALID_SVG')
    const values = tokens.slice(i, i + n).map(Number)
    i += n
    if (!values.every(Number.isFinite)) throw Error('INVALID_SVG')
    return values
  }
  let commands = 0
  while (i < tokens.length) {
    if (++commands > 10000) throw Error('INVALID_SVG')
    if (/^[a-zA-Z]$/.test(tokens[i])) command = tokens[i++]
    else if (!command) throw Error('INVALID_SVG')
    const upper = command.toUpperCase(), relative = command !== upper
    if (!(upper in argc)) throw Error('UNSUPPORTED_SVG_COMMAND')
    if (upper === 'Z') {
      if (!start || closed) throw Error('INVALID_SVG')
      closed = true
      current = start
      command = ''
      priorControl = priorQuadratic = null
      if (i < tokens.length) throw Error('MULTIPLE_CONTOURS_UNSUPPORTED')
      continue
    }
    if (closed) throw Error('MULTIPLE_CONTOURS_UNSUPPORTED')
    const v = read(argc[upper])
    const to = (x, y) => relative ? [current[0] + x, current[1] + y] : [x, y]
    if (upper === 'M') {
      if (start) throw Error('MULTIPLE_CONTOURS_UNSUPPORTED')
      current = to(...v); start = current; out.push(current)
      command = relative ? 'l' : 'L'
    } else if (upper === 'L' || upper === 'H' || upper === 'V') {
      current = upper === 'L' ? to(...v) : upper === 'H' ? [relative ? current[0] + v[0] : v[0], current[1]] : [current[0], relative ? current[1] + v[0] : v[0]]
      out.push(current)
    } else {
      const previous = current
      let controls, destination
      if (upper === 'C') {
        controls = [to(v[0], v[1]), to(v[2], v[3])]; destination = to(v[4], v[5])
      } else if (upper === 'S') {
        controls = [priorCommand === 'C' || priorCommand === 'S' ? [2 * current[0] - priorControl[0], 2 * current[1] - priorControl[1]] : current, to(v[0], v[1])]
        destination = to(v[2], v[3])
      } else {
        const ctrl = upper === 'Q' ? to(v[0], v[1]) : priorCommand === 'Q' || priorCommand === 'T' ? [2 * current[0] - priorQuadratic[0], 2 * current[1] - priorQuadratic[1]] : current
        destination = upper === 'Q' ? to(v[2], v[3]) : to(v[0], v[1])
        priorQuadratic = ctrl
        controls = [lerp(previous, ctrl, 2 / 3), lerp(destination, ctrl, 2 / 3)]
      }
      for (let k = 1; k <= subdivisions; k++) {
        const t = k / subdivisions, s = 1 - t
        out.push([0, 1].map(j => s ** 3 * previous[j] + 3 * s * s * t * controls[0][j] + 3 * s * t * t * controls[1][j] + t ** 3 * destination[j]))
      }
      current = destination
      priorControl = controls[1]
    }
    if (upper !== 'Q' && upper !== 'T') priorQuadratic = null
    if (upper !== 'C' && upper !== 'S') priorControl = null
    priorCommand = upper
  }
  if (!closed) throw Error('OPEN_CONTOUR')
  return out
}

function intersects(a, b, c, d) {
  const orient = (p, q, r) => Math.sign(Math.abs(cross(p, q, r)) <= EPS ? 0 : cross(p, q, r))
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b)
  const on = (p, q, r) => Math.min(p[0], q[0]) - EPS <= r[0] && r[0] <= Math.max(p[0], q[0]) + EPS && Math.min(p[1], q[1]) - EPS <= r[1] && r[1] <= Math.max(p[1], q[1]) + EPS
  return (o1 * o2 < 0 && o3 * o4 < 0) || (o1 === 0 && on(a, b, c)) || (o2 === 0 && on(a, b, d)) || (o3 === 0 && on(c, d, a)) || (o4 === 0 && on(c, d, b))
}

function normalize(points) {
  const contour = typeof points === 'string' ? svgContour(points) : Array.isArray(points) ? points.map(point) : null
  if (!contour || contour.length < 3 || contour.length > 5000 || contour.some(p => !p.every(Number.isFinite))) throw Error('INVALID_POINTS')
  if (dist(contour[0], contour.at(-1)) <= EPS) contour.pop()
  if (contour.length < 3 || contour.some((p, i) => dist(p, contour[(i + 1) % contour.length]) <= EPS)) throw Error('DEGENERATE_EDGE')
  if (Math.abs(area(contour)) <= EPS) throw Error('DEGENERATE_AREA')
  for (let i = 0; i < contour.length; i++) {
    for (let j = i + 1; j < contour.length; j++) {
      if (j === i + 1 || (i === 0 && j === contour.length - 1)) continue
      if (intersects(contour[i], contour[(i + 1) % contour.length], contour[j], contour[(j + 1) % contour.length])) throw Error('SELF_INTERSECTION')
    }
  }
  return area(contour) > 0 ? contour : contour.reverse()
}

function pointInside(p, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

function inset(p, width) {
  if (width <= EPS) return p.map(v => [...v])
  const minSpan = Math.min(Math.max(...p.map(v => v[0])) - Math.min(...p.map(v => v[0])), Math.max(...p.map(v => v[1])) - Math.min(...p.map(v => v[1])))
  if (width * 2 >= minSpan - EPS) throw Error('INSET_COLLAPSE')
  const result = p.map((v, i) => {
    const prev = p[(i + p.length - 1) % p.length], next = p[(i + 1) % p.length]
    const a = [(v[0] - prev[0]) / dist(v, prev), (v[1] - prev[1]) / dist(v, prev)]
    const b = [(next[0] - v[0]) / dist(v, next), (next[1] - v[1]) / dist(v, next)]
    const n1 = [-a[1], a[0]], n2 = [-b[1], b[0]]
    const denominator = a[0] * b[1] - a[1] * b[0]
    if (Math.abs(denominator) <= 1e-8) {
      if (a[0] * b[0] + a[1] * b[1] < 0) throw Error('INSET_COLLAPSE')
      return [v[0] + n1[0] * width, v[1] + n1[1] * width]
    }
    const a0 = [prev[0] + n1[0] * width, prev[1] + n1[1] * width]
    const b0 = [v[0] + n2[0] * width, v[1] + n2[1] * width]
    const t = ((b0[0] - a0[0]) * b[1] - (b0[1] - a0[1]) * b[0]) / denominator
    const hit = [a0[0] + a[0] * t, a0[1] + a[1] * t]
    if (dist(hit, v) > Math.max(width * 12, 0.01)) throw Error('INSET_COLLAPSE')
    return hit
  })
  if (area(result) <= EPS || result.some((v, i) => !pointInside(v, p) || dist(v, p[i]) > width * 8)) throw Error('INSET_COLLAPSE')
  for (let i = 0; i < result.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length]
    const candidate = result[i], other = result[(i + 1) % result.length]
    if (cross(a, b, candidate) <= EPS || cross(a, b, other) <= EPS) throw Error('INSET_COLLAPSE')
  }
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      if (j === i + 1 || (i === 0 && j === result.length - 1)) continue
      if (intersects(result[i], result[(i + 1) % result.length], result[j], result[(j + 1) % result.length])) throw Error('INSET_COLLAPSE')
    }
  }
  return result
}

// Ear clipping handles concave, simple polygons without placing triangles outside the cutline.
function triangulate(p) {
  const nativeIndices = rustFoamTriangulate(p)
  if (nativeIndices !== null) return nativeIndices
  const remain = p.map((_, i) => i), indices = []
  let guard = 0
  while (remain.length > 3 && guard++ < p.length * p.length) {
    let found = false
    for (let j = 0; j < remain.length; j++) {
      const a = remain[(j + remain.length - 1) % remain.length], b = remain[j], c = remain[(j + 1) % remain.length]
      if (cross(p[a], p[b], p[c]) <= EPS) continue
      const inTriangle = q => cross(p[a], p[b], q) >= -EPS && cross(p[b], p[c], q) >= -EPS && cross(p[c], p[a], q) >= -EPS
      if (remain.some(k => k !== a && k !== b && k !== c && inTriangle(p[k]))) continue
      indices.push(a, b, c)
      remain.splice(j, 1); found = true; break
    }
    if (!found) throw Error('TRIANGULATION_FAILED')
  }
  if (remain.length !== 3) throw Error('TRIANGULATION_FAILED')
  indices.push(...remain)
  return indices
}

function map3d(p, z, anchor) {
  if (!anchor) return [p[0], p[1], z]
  if (Array.isArray(anchor)) return [p[0] + anchor[0], p[1] + anchor[1], z + anchor[2]]
  const translation = anchor.position || anchor
  return [p[0] + translation.x, p[1] + translation.y, z + translation.z]
}

function boundaryDistance(p, ring) {
  let minimum = Infinity
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    minimum = Math.min(minimum, dist(p, [a[0] + dx * t, a[1] + dy * t]))
  }
  return minimum
}

/** Builds a sealed foam mesh with a flat underside, tapered edge and raised dome.
 *  `points`: closed SVG path string, or polygon of [x,y] / {x,y} points.
 *  `anchor3d`: optional [x,y,z] or {x,y,z} translation, with no orientation change.
 */
export function createFoamPaddingGeometry({points, depthCm = 0.8, edgeWidthCm = 0.5, anchor3d} = {}) {
  try {
    if (!Number.isFinite(depthCm) || depthCm <= 0 || !Number.isFinite(edgeWidthCm) || edgeWidthCm <= 0) throw Error('INVALID_DIMENSIONS')
    if (anchor3d) {
      const v = Array.isArray(anchor3d) ? anchor3d : anchor3d.position || anchor3d
      if ((Array.isArray(v) ? v.length !== 3 || v.some(x => !Number.isFinite(x)) : ![v?.x, v?.y, v?.z].every(Number.isFinite))) throw Error('INVALID_ANCHOR')
    }
    const ring = normalize(points)
    const inner = inset(ring, edgeWidthCm)
    const indices = triangulate(inner), n = ring.length
    // Each cap triangle receives a locally raised centroid, so concave panels
    // do not require a global centroid that might fall outside the contour.
    const topVertices = [...ring.map(p => map3d(p, 0, anchor3d)), ...inner.map(p => map3d(p, depthCm * 0.65, anchor3d))]
    const topIndices = []
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      topIndices.push(i, j, n + j, i, n + j, n + i)
    }
    for (let i = 0; i < indices.length; i += 3) {
      const a = inner[indices[i]], b = inner[indices[i + 1]], c = inner[indices[i + 2]]
      const center = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3]
      const blend = Math.min(1, boundaryDistance(center, ring) / edgeWidthCm)
      const apex = topVertices.length
      topVertices.push(map3d(center, depthCm * (0.65 + 0.35 * blend), anchor3d))
      const aI = indices[i] + n, bI = indices[i + 1] + n, cI = indices[i + 2] + n
      topIndices.push(aI, bI, apex, bI, cI, apex, cI, aI, apex)
    }
    const bottom = {vertices: ring.map(p => map3d(p, 0, anchor3d)), indices: []}
    const flatIndices = triangulate(ring)
    for (let i = 0; i < flatIndices.length; i += 3) bottom.indices.push(flatIndices[i + 2], flatIndices[i + 1], flatIndices[i])
    const perimeter = ring.reduce((sum, p, i) => sum + dist(p, ring[(i + 1) % n]), 0)
    const asObjects = shape => [...shape.map(p => ({x: p[0], y: p[1]})), {x: shape[0][0], y: shape[0][1]}]
    const boundary = asObjects(ring), insetPath = asObjects(inner)
    const vertices = topVertices.map(p => ({x: p[0], y: p[1], heightCm: p[2]}))
    return {
      valid: true,
      vertices, indices: topIndices,
      stitchPaths: [boundary, insetPath], cutPath: boundary,
      meshes: {top: {vertices: topVertices, indices: topIndices}, bottom, sides: {vertices: [], indices: []}},
      paths: {boundary, inset: insetPath, cut: boundary},
      metadata: {units: 'cm', depthCm, edgeWidthCm, perimeterCm: perimeter, areaCm2: area(ring), vertexCount: topVertices.length, triangleCount: (topIndices.length + bottom.indices.length) / 3, closed: true, winding: 'CCW', svgImported: typeof points === 'string', stitchPathsAreGuides: true}
    }
  } catch (err) {
    const code = /^[A-Z_]+$/.test(err?.message || '') ? err.message : 'GEOMETRY_ERROR'
    return fail(code, `Foam padding geometry rejected: ${code.toLowerCase().replace(/_/g, ' ')}`)
  }
}
