// Validate incoming shell geometry before treating seam proximity as assembly.
// Area is measured in metres squared. Reject essentially zero area and
// extremely thin triangles where their doubled area is <= 1e-8 times the
// square of their longest edge. The latter ratio is independent of scale.
export function inspectAssemblyGeometry(payload) {
  const vertices = payload?.shell?.vertices
  const faces = payload?.shell?.faces
  const stitches = payload?.shell?.stitchEdges
  const errors = []
  if (!Array.isArray(vertices) || vertices.length === 0) errors.push('missing shell vertices')
  else for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    if (!Array.isArray(v) || v.length !== 3 || !v.every(x => typeof x === 'number' && Number.isFinite(x))) {
      errors.push(`invalid vertex ${i}`)
    }
  }
  if (!Array.isArray(stitches) || stitches.length === 0) errors.push('missing stitches')
  else for (let i = 0; i < stitches.length; i++) {
    const { a, b } = stitches[i] ?? {}
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= (vertices?.length ?? 0) || b >= (vertices?.length ?? 0) || a === b) {
      errors.push(`invalid stitch ${i}`)
    }
  }
  if (faces !== undefined) {
    if (!Array.isArray(faces) || faces.length === 0) errors.push('missing shell triangles')
    else {
      const seenIndices = new Set()
      const seenGeometry = new Set()
      for (let i = 0; i < faces.length; i++) {
        const f = faces[i]
        if (!Array.isArray(f) || f.length !== 3 || f.some(index => !Number.isInteger(index) || index < 0 || index >= (vertices?.length ?? 0)) || new Set(f).size !== 3) {
          errors.push(`invalid triangle ${i}`)
          continue
        }
        const indexKey = [...f].sort((a, b) => a - b).join(',')
        if (seenIndices.has(indexKey)) errors.push(`duplicate triangle ${i}`)
        seenIndices.add(indexKey)
        const [a, b, c] = f.map(index => vertices[index])
        if (![a, b, c].every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite))) continue
        // Exact geometric duplicates (including independently indexed seam
        // vertices) are unsafe. Avoid quantization that could reject tiny but
        // legitimate offsets between cloth layers.
        const geometryKey = [a, b, c].map(point => point.join(',')).sort().join('|')
        if (seenGeometry.has(geometryKey) && !errors.includes(`duplicate triangle ${i}`)) errors.push(`duplicate triangle ${i}`)
        seenGeometry.add(geometryKey)
        const u = b.map((n, axis) => n - a[axis])
        const v = c.map((n, axis) => n - a[axis])
        const cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        const w = c.map((n, axis) => n - b[axis])
        const longest = Math.max(Math.hypot(...u), Math.hypot(...v), Math.hypot(...w))
        const area2 = Math.hypot(...cross)
        if (!Number.isFinite(longest) || !Number.isFinite(area2) || area2 <= 2e-12) {
          errors.push(`degenerate triangle ${i}`)
        } else if (area2 / longest / longest <= 1e-8) {
          errors.push(`thin sliver triangle ${i}`)
        }
      }
    }
  }
  return { geometryValid: errors.length === 0, geometryErrors: errors }
}
