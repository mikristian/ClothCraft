// Construction references are display-only intersections of the rendered mesh.
// Proportional heights are drafting aids, not detected anatomical landmarks.
const finite = p => Array.isArray(p) && p.length >= 3 && p.slice(0, 3).every(Number.isFinite)
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const interpolate = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

export function sliceAvatarAtHeight(positions, triangles, y, centerX = 0) {
  if (!Number.isFinite(y) || !Array.isArray(positions) || !Array.isArray(triangles)) return []
  const segments = []
  for (const triangle of triangles) {
    if (!Array.isArray(triangle) || triangle.length !== 3 || !triangle.every(i => Number.isInteger(i) && i >= 0 && finite(positions[i]))) continue
    const vertices = triangle.map(i => positions[i])
    const hits = []
    for (let i = 0; i < 3; i++) {
      const a = vertices[i], b = vertices[(i + 1) % 3]
      if ((a[1] < y && b[1] > y) || (a[1] > y && b[1] < y) || (a[1] === y && b[1] !== y) || (b[1] === y && a[1] !== y)) {
        const t = (y - a[1]) / (b[1] - a[1])
        if (t >= 0 && t <= 1) hits.push(interpolate(a, b, t))
      }
    }
    if (hits.length === 2 && distance(hits[0], hits[1]) > 1e-8) segments.push(hits)
  }
  if (!segments.length) return []
  const precision = 1e-5
  const key = p => `${Math.round(p[0] / precision)},${Math.round(p[2] / precision)}`
  const nodes = new Map()
  for (const [a, b] of segments) {
    const ka = key(a), kb = key(b)
    if (ka === kb) continue
    for (const [k, p] of [[ka, a], [kb, b]]) if (!nodes.has(k)) nodes.set(k, {point:p, neighbors:new Set()})
    nodes.get(ka).neighbors.add(kb)
    nodes.get(kb).neighbors.add(ka)
  }
  const visited = new Set(), loops = []
  for (const start of nodes.keys()) {
    if (visited.has(start)) continue
    const queue = [start], component = []
    visited.add(start)
    while (queue.length) {
      const node = queue.pop()
      component.push(node)
      for (const next of nodes.get(node).neighbors) if (!visited.has(next)) {visited.add(next);queue.push(next)}
    }
    // A dangling, open or branching slice cannot provide a trustworthy contour.
    if (component.length < 3 || component.some(k => nodes.get(k).neighbors.size !== 2)) continue
    const contour = [], first = component[0]
    let prev = null, current = first
    do {
      contour.push(nodes.get(current).point)
      const next = [...nodes.get(current).neighbors].find(k => k !== prev)
      prev = current
      current = next
    } while (current && current !== first && contour.length <= component.length)
    if (current !== first || contour.length !== component.length) continue
    const perimeter = contour.reduce((sum, p, i) => sum + distance(p, contour[(i + 1) % contour.length]), 0)
    const centroidX = contour.reduce((sum, p) => sum + p[0], 0) / contour.length
    loops.push({contour, perimeter, centroidX})
  }
  // Favor the torso-sized centrally placed closed contour over disconnected arms.
  loops.sort((a, b) => (b.perimeter / (1 + Math.abs(b.centroidX - centerX))) - (a.perimeter / (1 + Math.abs(a.centroidX - centerX))))
  return loops[0]?.contour || []
}

export function avatarSurfaceConstructionCurves(positions, triangles) {
  // Large CLO avatar meshes easily exceed JavaScript's maximum argument
  // count. Scan bounds without Math.min(...allVertices)/Math.max(...allVertices)
  // or flattening 100k+ triangle vertices onto the call stack.
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, validCount = 0
  for (const triangle of Array.isArray(triangles) ? triangles : []) {
    if (!Array.isArray(triangle) || triangle.length !== 3 ||
      !triangle.every(i => Number.isInteger(i) && i >= 0 && finite(positions?.[i]))) continue
    for (const i of triangle) {
      const [x,y] = positions[i]
      minY=Math.min(minY,y); maxY=Math.max(maxY,y)
      minX=Math.min(minX,x); maxX=Math.max(maxX,x)
      validCount++
    }
  }
  if(validCount<3)return []
  const centerX=(minX+maxX)/2
  if (!(maxY - minY > 1e-5)) return []
  const height = maxY - minY
  const levels = [['chest', .73], ['waist', .57], ['navel', .53]]
  const result = []
  const centers = {front:[], back:[]}
  for (let i = 1; i <= 39; i++) {
    const y = minY + height * (i / 40)
    const contour = sliceAvatarAtHeight(positions, triangles, y, centerX)
    if (contour.length < 3) continue
    const cuts = []
    for (let j = 0; j < contour.length; j++) {
      const a = contour[j], b = contour[(j + 1) % contour.length]
      if ((a[0] <= centerX && b[0] >= centerX) || (a[0] >= centerX && b[0] <= centerX)) {
        const dx = b[0] - a[0]
        if (Math.abs(dx) > 1e-9) cuts.push(interpolate(a, b, (centerX - a[0]) / dx))
      }
    }
    if (cuts.length >= 2) {
      cuts.sort((a, b) => b[2] - a[2])
      centers.front.push(cuts[0]);centers.back.push(cuts[cuts.length - 1])
    }
  }
  for (const [name, fraction] of levels) {
    const contour = sliceAvatarAtHeight(positions, triangles, minY + height * fraction, centerX)
    if (contour.length >= 3) result.push({name:`${name}-surface-reference`, points:[...contour, contour[0]]})
  }
  for (const side of ['front','back']) if (centers[side].length >= 3) result.push({name:`center-${side}-reference`, points:centers[side]})
  return result
}
