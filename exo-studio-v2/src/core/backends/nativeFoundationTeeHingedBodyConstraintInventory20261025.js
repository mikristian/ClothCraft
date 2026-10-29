// Detached topology and mass-area inventory for the split Foundation Tee body.
// Not solver constraints, calibrated masses, contact exclusions, or a CCD proof.
import {createTemplateProject} from '../../data/templates.js'
import {buildNativeSimulationPayload} from './nativePayload.js'
import {auditConformingBodyMaterialPartition20261025} from './nativeBodyMaterialPartitionAudit20261025.js'

const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`
const signedArea = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) -
  (b[1] - a[1]) * (c[0] - a[0])) / 2
const length = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const near = (a, b, tolerance = 1e-10) => Math.abs(a - b) <= tolerance
const finite3 = v => Array.isArray(v) && v.length === 3 &&
  v.every(x => typeof x === 'number' && Number.isFinite(x))

function insideTriangle(p, triangle) {
  const [a, b, c] = triangle
  const total = signedArea(a, b, c)
  if (!(total > 1e-12)) throw new Error('Invalid authored body triangle')
  const w = [signedArea(p, b, c), signedArea(a, p, c),
    signedArea(a, b, p)].map(x => x / total)
  return w.every(x => x >= -1e-9 && x <= 1 + 1e-9) &&
    near(w.reduce((s, x) => s + x, 0), 1, 1e-9)
}

export function auditFoundationTeeHingedBodyConstraintInventory20261025(source, split) {
  if (!source || !split || !Array.isArray(split.pieces) ||
      !Array.isArray(split.particles) || !Array.isArray(split.constraints))
    throw new Error('Invalid split body inventory inputs')
  const canonical = buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality: 'quality'})
  const sourceSnapshot = JSON.stringify(source)
  const splitSnapshot = JSON.stringify(split)
  if (sourceSnapshot !== JSON.stringify(canonical))
    throw new Error('Source fixture identity mismatch')
  if (JSON.stringify(split.constraints) !== JSON.stringify(source.constraints) ||
      JSON.stringify(split.virtualSeams) !== JSON.stringify(source.virtualSeams) ||
      JSON.stringify(split.anchors) !== JSON.stringify(source.anchors) ||
      split.pieces.length !== source.pieces.length)
    throw new Error('Split body sewing or anchor provenance mismatch')
  const originalParticleCount = source.particles.length
  for (let i = 0; i < originalParticleCount; i++)
    if (JSON.stringify(split.particles[i]) !== JSON.stringify(source.particles[i]))
      throw new Error('Original garment particle changed')

  const panels = []
  const generatedGlobal = new Set()
  for (const id of ['front', 'back']) {
    const original = source.pieces.find(p => p.id === id)
    const piece = split.pieces.find(p => p.id === id)
    if (!original || !piece || !Array.isArray(piece.faces) ||
        !Array.isArray(piece.flatVerticesM) || !Array.isArray(piece.particleIndices) ||
        piece.flatVerticesM.length !== piece.particleIndices.length ||
        piece.flatVerticesM.length <= original.flatVerticesM.length ||
        piece.faces.length <= original.faces.length)
      throw new Error('Invalid split body panel')
    const originalCount = original.flatVerticesM.length
    if (JSON.stringify(piece.flatVerticesM.slice(0, originalCount)) !==
        JSON.stringify(original.flatVerticesM) ||
        JSON.stringify(piece.particleIndices.slice(0, originalCount)) !==
        JSON.stringify(original.particleIndices))
      throw new Error('Original body material vertices changed')
    if (!piece.flatVerticesM.every(p => finite3(p) && Math.abs(p[2]) <= 1e-10))
      throw new Error('Invalid body material coordinates')

    const sourceEdge = new Set(original.faces.flatMap(f =>
      [edgeKey(f[0], f[1]), edgeKey(f[1], f[2]), edgeKey(f[2], f[0])]))
    // Record the FIRST oriented crossing of each source edge. The split
    // constructor copies that oriented start particle, not either endpoint.
    // Its two clipping passes run left then right for each authored face.
    const firstCrossingStart = new Map()
    for (const face of original.faces) for (const left of [true, false])
      for (let j = 0; j < 3; j++) {
        const a = face[j], b = face[(j + 1) % 3]
        const xa = original.flatVerticesM[a][0], xb = original.flatVerticesM[b][0]
        const inA = left ? xa <= 1e-12 : xa >= -1e-12
        const inB = left ? xb <= 1e-12 : xb >= -1e-12
        if (inA !== inB && xa * xb < 0 &&
            !firstCrossingStart.has(edgeKey(a, b)))
          firstCrossingStart.set(edgeKey(a, b), a)
      }
    const expectedGenerated = new Set()
    for (let i = originalCount; i < piece.flatVerticesM.length; i++) {
      const global = piece.particleIndices[i]
      if (!Number.isInteger(global) || global < originalParticleCount ||
          global >= split.particles.length || generatedGlobal.has(global))
        throw new Error('Invalid generated body particle index')
      generatedGlobal.add(global)
      const particle = split.particles[global]
      const match = typeof particle?.id === 'string' &&
        particle.id.match(new RegExp(`^${id}:hinge:([0-9]+):([0-9]+)$`))
      if (!match) throw new Error('Invalid generated hinge provenance')
      const a = Number(match[1]), b = Number(match[2]), key = edgeKey(a, b)
      if (a >= b || b >= originalCount || !sourceEdge.has(key) ||
          expectedGenerated.has(key) || !firstCrossingStart.has(key))
        throw new Error('Generated hinge must identify a unique source edge')
      expectedGenerated.add(key)
      const u = original.flatVerticesM[a], v = original.flatVerticesM[b]
      if (!(u[0] * v[0] < 0))
        throw new Error('Generated hinge edge does not cross material centreline')
      const t = -u[0] / (v[0] - u[0])
      const expected = u.map((x, axis) => x + t * (v[axis] - x))
      expected[0] = 0
      const originalParticle = source.particles[
        original.particleIndices[firstCrossingStart.get(key)]]
      const expectedParticle = {...structuredClone(originalParticle),
        id: `${id}:hinge:${key}`, seamBoundary: false, seamIds: [],
        position: [...originalParticle.position],
        previous: [...originalParticle.position]}
      if (piece.flatVerticesM[i].some((x, axis) => !near(x, expected[axis])) ||
          JSON.stringify(particle) !== JSON.stringify(expectedParticle))
        throw new Error('Generated hinge material interpolation mismatch')
    }
    if (expectedGenerated.size !== firstCrossingStart.size)
      throw new Error('Missing generated crossing-edge particle')

    const facesBySource = original.faces.map(() => 0)
    const sourceFaceOwners = []
    const originalAreas = original.faces.map(face =>
      signedArea(...face.map(i => original.flatVerticesM[i])))
    const edges = new Map(), faceKeys = new Set()
    const areaWeights = new Array(piece.flatVerticesM.length).fill(0)
    let totalArea = 0
    for (let f = 0; f < piece.faces.length; f++) {
      const face = piece.faces[f]
      if (!Array.isArray(face) || face.length !== 3 ||
          new Set(face).size !== 3 || face.some(i =>
            !Number.isInteger(i) || i < 0 || i >= piece.flatVerticesM.length))
        throw new Error('Invalid split body triangle')
      const key = [...face].sort((a, b) => a - b).join(':')
      if (faceKeys.has(key)) throw new Error('Duplicate split body triangle')
      faceKeys.add(key)
      const uv = face.map(i => piece.flatVerticesM[i])
      const area = signedArea(...uv)
      if (!(area > 1e-12) ||
          (Math.min(...uv.map(p => p[0])) < -1e-12 &&
            Math.max(...uv.map(p => p[0])) > 1e-12))
        throw new Error('Invalid split body winding or hinge crossing')
      const sourceFace = original.faces.findIndex(originalFace => {
        const sourceUv = originalFace.map(i => original.flatVerticesM[i])
        return uv.every(p => insideTriangle(p, sourceUv))
      })
      if (sourceFace < 0) throw new Error('Split face escapes source material triangle')
      sourceFaceOwners.push(sourceFace)
      facesBySource[sourceFace] += area
      totalArea += area
      for (const vertex of face) areaWeights[vertex] += area / 3
      for (let j = 0; j < 3; j++) {
        const a = face[j], b = face[(j + 1) % 3], key = edgeKey(a, b)
        if (!edges.has(key)) edges.set(key, [])
        edges.get(key).push({face: f, a, b, opposite: face[(j + 2) % 3]})
      }
    }
    if (facesBySource.some((area, i) => !near(area, originalAreas[i], 1e-10)) ||
        areaWeights.some(x => !(x > 0)) ||
        !near(areaWeights.reduce((s, x) => s + x, 0), totalArea))
      throw new Error('Split body source-face area or mass inventory mismatch')
    const partition = auditConformingBodyMaterialPartition20261025(
      piece.flatVerticesM, piece.faces, sourceFaceOwners,
      original.faces.map(face => face.map(i => original.flatVerticesM[i])))
    if (!partition.materialPartitionCertified ||
        !partition.sourceDomainCoverageVerified)
      throw new Error('Body material source domain not certified')

    const structural = [], hinges = []
    for (const [key, incidents] of edges) {
      if (incidents.length > 2 || (incidents.length === 2 &&
          incidents[0].a === incidents[1].a))
        throw new Error('Nonmanifold or inconsistently wound body edge')
      const [a, b] = key.split(':').map(Number)
      const restLengthM = length(piece.flatVerticesM[a], piece.flatVerticesM[b])
      if (!(restLengthM > 1e-8)) throw new Error('Collapsed structural body edge')
      structural.push({edge: [a, b], restLengthM})
      if (incidents.length === 2) {
        const crease = Math.abs(piece.flatVerticesM[a][0]) <= 1e-12 &&
          Math.abs(piece.flatVerticesM[b][0]) <= 1e-12
        hinges.push({edge: [a, b], faces: incidents.map(x => x.face),
          opposite: incidents.map(x => x.opposite), crease,
          restDihedralRad: 0})
      }
    }
    const creaseEdges = structural.filter(s => s.edge.every(i =>
      Math.abs(piece.flatVerticesM[i][0]) <= 1e-12))
    if (!creaseEdges.length || creaseEdges.length !==
        hinges.filter(h => h.crease).length)
      throw new Error('Body centreline hinge has missing or boundary edges')
    // Adjacent faces are inventoried, not excluded from collision detection:
    // shared-edge foldovers and shared-vertex crossings can still be unsafe.
    const vertexOwners = piece.flatVerticesM.map(() => [])
    piece.faces.forEach((face, f) => face.forEach(v => vertexOwners[v].push(f)))
    const faceSharedVertices = new Map()
    for (const owners of vertexOwners)
      for (let i = 0; i < owners.length; i++)
        for (let j = i + 1; j < owners.length; j++) {
          const key = edgeKey(owners[i], owners[j])
          faceSharedVertices.set(key, (faceSharedVertices.get(key) || 0) + 1)
        }
    const edgeNeighbors = [...faceSharedVertices.values()].filter(n => n === 2).length
    const vertexNeighbors = [...faceSharedVertices.values()].filter(n => n === 1).length
    const totalPairs = piece.faces.length * (piece.faces.length - 1) / 2
    if ([...faceSharedVertices.values()].some(n => n > 2) ||
        edgeNeighbors !== hinges.length ||
        totalPairs < edgeNeighbors + vertexNeighbors)
      throw new Error('Body contact adjacency disagrees with hinge inventory')
    const sourceGlobals = new Set(original.particleIndices)
    const sewn = source.constraints.filter(c => c.type === 'seam' &&
      (sourceGlobals.has(c.a) || sourceGlobals.has(c.b)))
    if (!sewn.length || sewn.some(c => generatedGlobal.has(c.a) ||
        generatedGlobal.has(c.b)))
      throw new Error('Split body sewing endpoint provenance invalid')
    panels.push({panelId: id, vertexCount: piece.flatVerticesM.length,
      faceCount: piece.faces.length, generatedVertices: expectedGenerated.size,
      structural, hinges, structuralCount: structural.length,
      bendingHingeCount: hinges.length,
      creaseHingeCount: hinges.filter(h => h.crease).length,
      originalMaterialAreaM2: originalAreas.reduce((s, x) => s + x, 0),
      splitMaterialAreaM2: totalArea, lumpedVertexAreaM2: areaWeights,
      materialPartition: partition,
      contactPairClassification: {totalPairs, edgeNeighborPairs: edgeNeighbors,
        vertexNeighborPairs: vertexNeighbors,
        nonAdjacentPairs: totalPairs - edgeNeighbors - vertexNeighbors,
        creaseEdgeNeighborPairs: hinges.filter(h => h.crease).length},
      sourceSewingConstraints: sewn.length})
  }
  for (const piece of source.pieces.filter(p => !['front', 'back'].includes(p.id))) {
    const candidate = split.pieces.find(p => p.id === piece.id)
    if (JSON.stringify(piece) !== JSON.stringify(candidate))
      throw new Error('Untouched sleeve panel changed')
  }
  if (split.particles.length !== originalParticleCount + generatedGlobal.size ||
      JSON.stringify(source) !== sourceSnapshot || JSON.stringify(split) !== splitSnapshot)
    throw new Error('Split body particle inventory or source state changed')
  return {panels, generatedParticles: generatedGlobal.size,
    sewingCorrespondences: source.constraints.filter(c => c.type === 'seam').length,
    sourceNonmutationVerified: true, splitNonmutationVerified: true,
    materialCalibrationVerified: false, solverConstraintsRebuilt: false,
    contactExclusionsCreated: 0, contactPolicyImplemented: false,
    staticContactCertified: false, continuousDeformableCCDCertified: false,
    physicalAcceptance: false, safeToAutoApply: false}
}
