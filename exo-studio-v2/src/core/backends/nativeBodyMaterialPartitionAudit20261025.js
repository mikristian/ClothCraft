// Research-only geometric preflight. Area sums and edge incidence alone do
// not prove that a retriangulation covers material without overlap or cracks.
// This does not certify world-space contact or continuous collision safety.
const orient = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`

function positiveAreaOverlap(a, b) {
  // Strict separating-axis test avoids subtracting almost equal polygon
  // areas, which can round a real, very thin overlap down to zero.
  for (const [triangle, other] of [[a, b], [b, a]])
    for (let i = 0; i < 3; i++) {
      const p = triangle[i], q = triangle[(i + 1) % 3]
      if (other.every(r => orient(p, q, r) <= 0)) return false
    }
  return true
}

// Without sourceTriangles, only local nonoverlap/conformity is established.
// An empty or incomplete face inventory must never be mistaken for coverage.
// sourceTriangles must be the ORIGINAL material-domain triangles, in owner
// order. Certification is relative to this caller-supplied domain: the caller
// must independently establish its identity/provenance (the tee inventory
// compares its source against the canonical fixture before invoking us).
export function auditConformingBodyMaterialPartition20261025(vertices, faces, owners,
  sourceTriangles = null) {
  if (!Array.isArray(vertices) || !Array.isArray(faces) ||
      !Array.isArray(owners) || faces.length === 0 ||
      faces.length !== owners.length)
    throw new Error('Invalid material partition inventory')
  const checkingDomain = sourceTriangles !== null
  if (checkingDomain && (!Array.isArray(sourceTriangles) ||
      sourceTriangles.length === 0))
    throw new Error('Invalid source material domain')
  const sourceAreas = checkingDomain ? sourceTriangles.map(triangle => {
    if (!Array.isArray(triangle) || triangle.length !== 3 ||
        triangle.some(p => !Array.isArray(p) || p.length < 2 ||
          !Number.isFinite(p[0]) || !Number.isFinite(p[1])))
      throw new Error('Invalid source material triangle')
    const area2 = orient(...triangle)
    if (!(area2 > 2e-12)) throw new Error('Invalid source material winding')
    return area2 / 2
  }) : null
  const coveredAreas = checkingDomain ? sourceAreas.map(() => 0) : null
  const coveredFaces = checkingDomain ? sourceAreas.map(() => 0) : null
  const triangles = [], edges = new Map(), usedVertices = new Set()
  for (let i = 0; i < faces.length; i++) {
    const face = faces[i], owner = owners[i]
    if (!Array.isArray(face) || face.length !== 3 ||
        new Set(face).size !== 3 || !Number.isInteger(owner) || owner < 0 ||
        face.some(v => !Number.isInteger(v) || v < 0 || v >= vertices.length))
      throw new Error('Invalid material partition face')
    const triangle = face.map(v => vertices[v])
    if (triangle.some(v => !Array.isArray(v) || v.length < 2 ||
        !Number.isFinite(v[0]) || !Number.isFinite(v[1])) ||
        !(orient(...triangle) > 2e-12))
      throw new Error('Invalid material partition triangle')
    if (checkingDomain) {
      if (owner >= sourceTriangles.length)
        throw new Error('Split face has no source material owner')
      const source = sourceTriangles[owner], sourceArea2 = sourceAreas[owner] * 2
      for (const p of triangle) {
        // Signed barycentric areas give a scale-aware boundary check; an
        // owner label cannot authorize geometry outside its source face.
        const weights = [orient(p, source[1], source[2]),
          orient(source[0], p, source[2]),
          orient(source[0], source[1], p)].map(a => a / sourceArea2)
        if (weights.some(w => w < -1e-9 || w > 1 + 1e-9))
          throw new Error('Split face escapes its source material triangle')
      }
      coveredAreas[owner] += orient(...triangle) / 2
      coveredFaces[owner]++
    }
    triangles.push(triangle)
    face.forEach(v => usedVertices.add(v))
    for (let k = 0; k < 3; k++) {
      const a = face[k], b = face[(k + 1) % 3]
      edges.set(edgeKey(a, b), a < b ? [a, b] : [b, a])
    }
  }
  let overlapPairsChecked = 0
  for (let i = 0; i < triangles.length; i++)
    for (let j = i + 1; j < triangles.length; j++) {
      const a = triangles[i], b = triangles[j]
      // All owners must be compared: caller provenance must not be able to
      // hide a geometric overlap by assigning the faces different owners.
      const separatedAabb = [0, 1].some(axis =>
        Math.max(...a.map(p => p[axis])) <= Math.min(...b.map(p => p[axis])) ||
        Math.max(...b.map(p => p[axis])) <= Math.min(...a.map(p => p[axis])))
      if (separatedAabb) continue
      overlapPairsChecked++
      if (positiveAreaOverlap(a, b))
        throw new Error('Positive-area overlap in split material partition')
    }
  // Check all material edges, not only pairs assigned to the same source
  // triangle: a crossing-edge split must also conform to its neighbor.
  let vertexEdgeChecks = 0
  for (const v of usedVertices) {
    const p = vertices[v]
    if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))
      throw new Error('Invalid material partition vertex')
    for (const [a, b] of edges.values()) {
      if (v === a || v === b) continue
      vertexEdgeChecks++
      const u = vertices[a], w = vertices[b]
      const dx = w[0] - u[0], dy = w[1] - u[1]
      const length2 = dx * dx + dy * dy
      if (!(length2 > 1e-16)) throw new Error('Collapsed material partition edge')
      const t = ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / length2
      if (t <= 0 || t >= 1) continue
      const distance2 = ((p[0] - u[0]) * dy - (p[1] - u[1]) * dx) ** 2 / length2
      if (distance2 <= 1e-20)
        throw new Error('Geometric T-junction in split material partition')
    }
  }
  // Coincident, distinct material indices can create a disconnected seam
  // despite valid face areas; source-specific provenance is checked upstream.
  const active = [...usedVertices]
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      const a = vertices[active[i]], b = vertices[active[j]]
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 1e-12)
        throw new Error('Duplicate geometric vertex in material partition')
    }
  if (checkingDomain)
    for (let i = 0; i < sourceAreas.length; i++) {
      // Check each source face, not merely aggregate area: an empty owner
      // or a hole compensated by another owner's excess must fail closed.
      if (!coveredFaces[i] ||
          Math.abs(coveredAreas[i] - sourceAreas[i]) >
            Math.max(1e-15, sourceAreas[i] * 1e-14))
        throw new Error('Incomplete source material domain coverage')
    }
  return {overlapPairsChecked, vertexEdgeChecks,
    positiveAreaOverlaps: 0, geometricTJunctions: 0,
    materialPartitionConforming: true,
    sourceDomainCoverageVerified: checkingDomain,
    sourceDomainFaceCount: checkingDomain ? sourceTriangles.length : 0,
    // Local conformity alone cannot certify coverage of a missing domain.
    materialPartitionCertified: checkingDomain}
}
