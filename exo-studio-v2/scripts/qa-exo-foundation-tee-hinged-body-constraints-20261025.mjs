import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeHingedBody20261025} from '../src/core/backends/nativeFoundationTeeHingedBodyResearch20261025.js'
import {auditFoundationTeeHingedBodyConstraintInventory20261025 as audit} from '../src/core/backends/nativeFoundationTeeHingedBodyConstraintInventory20261025.js'

const sourceFixture = () => buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality: 'quality'})
const restSplit = source => researchFoundationTeeHingedBody20261025(source,
  {anglesRadians: [0], depthsM: [0]}).splitTopologyPayload
const edge = (a, b) => [a, b].sort((x, y) => x - y).join(':')
const area = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) -
  (b[1] - a[1]) * (c[0] - a[0])) / 2

test('independent material edge/hinge/area inventory for both real body panels', () => {
  const source = sourceFixture(), sourceBefore = JSON.stringify(source)
  const split = restSplit(source), splitBefore = JSON.stringify(split)
  const result = audit(source, split)
  assert.equal(result.generatedParticles, 45)
  assert.equal(result.sewingCorrespondences, 102)
  assert.equal(result.panels.length, 2)
  let massAreaTotal = 0
  for (const p of result.panels) {
    const mesh = split.pieces.find(x => x.id === p.panelId)
    const original = source.pieces.find(x => x.id === p.panelId)
    const edgeFaces = new Map(), weights = mesh.flatVerticesM.map(() => 0)
    let totalArea = 0
    for (let i = 0; i < mesh.faces.length; i++) {
      const face = mesh.faces[i], uv = face.map(v => mesh.flatVerticesM[v])
      const a = area(...uv)
      assert.ok(a > 1e-12)
      totalArea += a
      for (const v of face) weights[v] += a / 3
      for (let j = 0; j < 3; j++) {
        const k = edge(face[j], face[(j + 1) % 3])
        edgeFaces.set(k, [...(edgeFaces.get(k) || []), i])
      }
    }
    const crease = [...edgeFaces].filter(([key, faces]) => {
      const [a, b] = key.split(':').map(Number)
      return faces.length === 2 &&
        Math.abs(mesh.flatVerticesM[a][0]) <= 1e-12 &&
        Math.abs(mesh.flatVerticesM[b][0]) <= 1e-12
    })
    const expectedOriginalArea = original.faces.reduce((sum, face) => sum +
      area(...face.map(v => original.flatVerticesM[v])), 0)
    assert.ok(Math.abs(totalArea - expectedOriginalArea) < 1e-10)
    assert.ok(Math.abs(totalArea - p.splitMaterialAreaM2) < 1e-10)
    assert.ok(Math.abs(totalArea - p.lumpedVertexAreaM2.reduce((s, x) => s + x, 0)) < 1e-10)
    p.lumpedVertexAreaM2.forEach((x, i) => assert.ok(Math.abs(x - weights[i]) < 1e-12))
    assert.equal(p.structuralCount, edgeFaces.size)
    assert.equal(p.bendingHingeCount, [...edgeFaces.values()].filter(x => x.length === 2).length)
    assert.equal(p.creaseHingeCount, crease.length)
    assert.equal(p.hinges.filter(x => x.crease).length, crease.length)
    assert.equal(p.sourceSewingConstraints, 56)
    assert.equal(p.structural.length, p.structuralCount)
    assert.equal(p.hinges.length, p.bendingHingeCount)
    const shared = new Map(), owners = mesh.flatVerticesM.map(() => [])
    mesh.faces.forEach((face, f) => face.forEach(v => owners[v].push(f)))
    for (const faces of owners) for (let i = 0; i < faces.length; i++)
      for (let j = i + 1; j < faces.length; j++) {
        const key = edge(faces[i], faces[j])
        shared.set(key, (shared.get(key) || 0) + 1)
      }
    const totalPairs = mesh.faces.length * (mesh.faces.length - 1) / 2
    const edgeNeighborPairs = [...shared.values()].filter(n => n === 2).length
    const vertexNeighborPairs = [...shared.values()].filter(n => n === 1).length
    assert.deepEqual(p.contactPairClassification, {totalPairs,
      edgeNeighborPairs, vertexNeighborPairs,
      nonAdjacentPairs: totalPairs - edgeNeighborPairs - vertexNeighborPairs,
      creaseEdgeNeighborPairs: crease.length})
    for (const s of p.structural) {
      const [a, b] = s.edge
      assert.ok(edgeFaces.has(edge(a, b)))
      assert.ok(Math.abs(s.restLengthM - Math.hypot(
        mesh.flatVerticesM[a][0] - mesh.flatVerticesM[b][0],
        mesh.flatVerticesM[a][1] - mesh.flatVerticesM[b][1])) < 1e-12)
    }
    massAreaTotal += totalArea
  }
  assert.deepEqual(result.panels.map(p => [p.vertexCount, p.faceCount,
    p.structuralCount, p.bendingHingeCount, p.creaseHingeCount]),
  [[174, 278, 451, 383, 20], [181, 292, 472, 404, 27]])
  assert.ok(Math.abs(massAreaTotal - .686095) < 1e-9)
  assert.equal(result.solverConstraintsRebuilt, false)
  assert.equal(result.contactExclusionsCreated, 0)
  assert.equal(result.physicalAcceptance, false)
  assert.equal(result.safeToAutoApply, false)
  assert.equal(result.continuousDeformableCCDCertified, false)
  assert.equal(JSON.stringify(source), sourceBefore)
  assert.equal(JSON.stringify(split), splitBefore)
  console.log('HINGED_BODY_CONSTRAINT_INVENTORY ' + JSON.stringify({
    panels: result.panels.map(p => ({panelId: p.panelId,
      structural: p.structuralCount, hinges: p.bendingHingeCount,
      crease: p.creaseHingeCount, materialAreaM2: p.splitMaterialAreaM2})),
    generated: result.generatedParticles, massAreaTotal}))
})

test('missing, duplicated, reversed and escaped material faces fail closed', () => {
  const source = sourceFixture(), split = restSplit(source)
  const edits = [
    p => { p.pieces.find(x => x.id === 'front').faces.pop() },
    p => { const f = p.pieces.find(x => x.id === 'front').faces; f.push([...f[0]]) },
    p => { const f = p.pieces.find(x => x.id === 'back').faces[0]; [f[1], f[2]] = [f[2], f[1]] },
    p => { p.pieces.find(x => x.id === 'front').faces[0][0] = 9999 },
    p => { p.pieces.find(x => x.id === 'front').flatVerticesM[0][0] += .002 },
  ]
  for (const edit of edits) {
    const bad = structuredClone(split)
    edit(bad)
    assert.throws(() => audit(source, bad))
  }
})

test('generated intersection, sewing and unchanged-panel provenance fail closed', () => {
  const source = sourceFixture(), split = restSplit(source)
  const edits = [
    p => { p.pieces.find(x => x.id === 'front').flatVerticesM.at(-1)[1] += .002 },
    p => { p.particles.at(-1).id = 'back:hinge:0:0' },
    p => { p.particles.at(-1).seamBoundary = true },
    p => { p.particles.at(-1).position[0] += .002 },
    p => { p.particles.at(-1).previous[1] += .002 },
    p => { p.constraints.find(c => c.type === 'seam').a += 1 },
    p => { p.pieces.find(x => x.id === 'sleeve-left').faces.pop() },
    p => { p.particles[0].position[0] += .001 },
  ]
  for (const edit of edits) {
    const bad = structuredClone(split)
    edit(bad)
    assert.throws(() => audit(source, bad))
  }
  // Adversarial independent review: a sorted crossing-edge id has two source
  // endpoints, but only the FIRST oriented clipping-edge start is authentic.
  const alternate = structuredClone(split)
  const original = source.pieces.find(p => p.id === 'front')
  const body = alternate.pieces.find(p => p.id === 'front')
  const generated = alternate.particles[body.particleIndices[original.flatVerticesM.length]]
  const [, a, b] = generated.id.match(/:hinge:(\d+):(\d+)$/).map(Number)
  const other = [a, b].map(i => source.particles[original.particleIndices[i]])
    .find(p => JSON.stringify(p.position) !== JSON.stringify(generated.position))
  assert.ok(other, 'source endpoints must have distinct positions')
  alternate.particles[body.particleIndices[original.flatVerticesM.length]] = {
    ...structuredClone(other), id: generated.id, seamBoundary: false,
    seamIds: [], position: [...other.position], previous: [...other.position]}
  assert.throws(() => audit(source, alternate), /interpolation mismatch/)
  const changedSource = structuredClone(source)
  changedSource.pieces.find(x => x.id === 'back').faces.pop()
  assert.throws(() => audit(changedSource, split), /fixture identity/)
})
