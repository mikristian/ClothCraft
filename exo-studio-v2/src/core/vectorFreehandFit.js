// Original EXO implementation inspired by the openly licensed VectorCraft
// Pencil gesture concept (MIT OR Apache-2.0): https://github.com/storytold/vectorcraft
// Geometry here is expressed in physical metres; no upstream code is copied.
import {rustSegmentErrorSquared} from './rustVectorFitKernel.js'
const MAX_POINTS = 64

function validPoint(p) {
  return p && Number.isFinite(p.x) && Number.isFinite(p.y)
}

function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}

function segmentErrorSquared(p, a, b) {
  const rust = rustSegmentErrorSquared(p, a, b)
  if (rust !== null) return rust
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  if (length2 === 0) return distanceSquared(p, a)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2))
  return (p.x - a.x - dx * t) ** 2 + (p.y - a.y - dy * t) ** 2
}

function simplify(points, tolerance) {
  if (points.length < 3) return points.slice()
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  const threshold = tolerance * tolerance
  while (stack.length) {
    const [start, end] = stack.pop()
    let farthest = -1
    let error = threshold
    for (let i = start + 1; i < end; i += 1) {
      const e = segmentErrorSquared(points[i], points[start], points[end])
      if (e > error) {
        error = e
        farthest = i
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1
      stack.push([farthest, end], [start, farthest])
    }
  }
  return points.filter((_, i) => keep[i])
}

export function fitPencilStroke(points, { toleranceM = 0.002, closed = false } = {}) {
  if (!Array.isArray(points)) throw new TypeError('Pencil points must be an array')
  if (!Number.isFinite(toleranceM) || toleranceM < 0) throw new RangeError('toleranceM must be finite and nonnegative')
  const clean = []
  for (const point of points) {
    if (!validPoint(point)) continue
    const p = { x: point.x, y: point.y }
    if (!clean.length || distanceSquared(clean[clean.length - 1], p) > 0) clean.push(p)
  }
  // Closure is a geometric coincidence, not a smoothing preference. A large
  // Pencil tolerance must never erase a real final corner of the cutline.
  // Strip repeated closing samples, including a few sub-micron pen jitters.
  if (closed) while (clean.length > 1 && distanceSquared(clean[0], clean[clean.length - 1]) <= 1e-12) clean.pop()
  if (!clean.length) return []
  // Open RDP retains first and final samples; for closed paths we represent
  // closure implicitly and retain the first unique anchor without duplicating it.
  const first = clean[0]
  const last = clean[clean.length - 1]
  let result = simplify(clean, toleranceM)
  if (result.length > MAX_POINTS) {
    // A deterministic secondary RDP tolerance search enforces the point budget.
    // A final sampling fallback handles degenerate floating-point inputs.
    let lo = toleranceM
    let hi = Math.max(1, ...clean.map(p => Math.hypot(p.x - first.x, p.y - first.y)))
    while (simplify(clean, hi).length > MAX_POINTS) hi *= 2
    for (let i = 0; i < 48; i += 1) {
      const mid = (lo + hi) / 2
      if (simplify(clean, mid).length > MAX_POINTS) lo = mid
      else hi = mid
    }
    result = simplify(clean, hi)
    if (result.length > MAX_POINTS) result = Array.from({ length: MAX_POINTS }, (_, i) => result[Math.floor(i * (result.length - 1) / (MAX_POINTS - 1))])
  }
  if (closed && result.length < 3) {
    // RDP on an open representation can reduce a perfectly valid closed
    // triangle to its endpoints. Recover the strongest original third corner
    // rather than submitting a two-point cutting polygon to the Rust editor.
    if (clean.length < 3 || result.length < 2) return []
    const a = result[0], b = result[result.length - 1]
    const dx = b.x - a.x, dy = b.y - a.y
    const length = Math.hypot(dx, dy)
    if (!(length > 0)) return []
    let best = null, bestHeight = 0
    for (const point of clean) {
      const height = Math.abs((point.x - a.x) * dy - (point.y - a.y) * dx) / length
      if (height > bestHeight) { bestHeight = height; best = point }
    }
    if (!(bestHeight > 1e-9)) return []
    result = [a, best, b]
  }
  if (!closed && result.length > 1) {
    result[0] = first
    result[result.length - 1] = last
  }
  return result
}

// Catmull-Rom-like tangents expressed as absolute cubic controls; open paths
// have one control pair per consecutive segment, with no implicit closing edge.
export function pathCubicControls(points) {
  if (!Array.isArray(points)) throw new TypeError('Path points must be an array')
  if (!points.every(validPoint)) throw new TypeError('Path points must be finite')
  const controls = []
  for (let i = 0; i + 1 < points.length; i += 1) {
    const a = points[i]
    const b = points[i + 1]
    const before = points[Math.max(0, i - 1)]
    const after = points[Math.min(points.length - 1, i + 2)]
    controls.push({
      c1: { x: a.x + (b.x - before.x) / 6, y: a.y + (b.y - before.y) / 6 },
      c2: { x: b.x - (after.x - a.x) / 6, y: b.y - (after.y - a.y) / 6 },
    })
  }
  return controls
}
