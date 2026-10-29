import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeHingedBody20261025} from '../src/core/backends/nativeFoundationTeeHingedBodyResearch20261025.js'
import {auditFoundationTeeHingedBodyConstraintInventory20261025} from '../src/core/backends/nativeFoundationTeeHingedBodyConstraintInventory20261025.js'
import {auditConformingBodyMaterialPartition20261025 as partition} from '../src/core/backends/nativeBodyMaterialPartitionAudit20261025.js'

test('actual four-panel hinged body passes partition proof without source mutation', () => {
  const source = buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality: 'quality'})
  const split = researchFoundationTeeHingedBody20261025(source,
    {anglesRadians: [0], depthsM: [0]}).splitTopologyPayload
  const beforeSource = JSON.stringify(source), beforeSplit = JSON.stringify(split)
  const result = auditFoundationTeeHingedBodyConstraintInventory20261025(source, split)
  assert.deepEqual(result.panels.map(p => p.materialPartition.materialPartitionConforming),
    [true, true])
  for (const p of result.panels) {
    assert.equal(p.materialPartition.sourceDomainCoverageVerified, true)
    assert.equal(p.materialPartition.materialPartitionCertified, true)
    assert.equal(p.materialPartition.sourceDomainFaceCount, 240)
    assert.ok(p.materialPartition.overlapPairsChecked > 0)
    assert.ok(p.materialPartition.vertexEdgeChecks > 0)
    assert.equal(p.materialPartition.positiveAreaOverlaps, 0)
    assert.equal(p.materialPartition.geometricTJunctions, 0)
  }
  assert.equal(result.contactExclusionsCreated, 0)
  assert.equal(result.solverConstraintsRebuilt, false)
  assert.equal(result.physicalAcceptance, false)
  assert.equal(JSON.stringify(source), beforeSource)
  assert.equal(JSON.stringify(split), beforeSplit)
  console.log('MATERIAL_PARTITION ' + JSON.stringify(result.panels.map(p => ({
    panel: p.panelId, ...p.materialPartition}))))
})

test('area-conserving overlapping split faces with matching hole fail closed', () => {
  // The sum is exactly the source triangle area 0.5, but the triangles
  // overlap near (0,0), leaving an equal-area hole near the hypotenuse.
  const vertices = [[0, 0], [1, 0], [0, 1], [0, .5], [.5, 0]]
  const faces = [[0, 1, 3], [0, 4, 2]]
  const area = f => Math.abs((vertices[f[1]][0] - vertices[f[0]][0]) *
    (vertices[f[2]][1] - vertices[f[0]][1]) -
    (vertices[f[1]][1] - vertices[f[0]][1]) *
    (vertices[f[2]][0] - vertices[f[0]][0])) / 2
  assert.equal(faces.reduce((s, f) => s + area(f), 0), .5)
  assert.throws(() => partition(vertices, faces, [0, 0]), /Positive-area overlap/)
})

test('nonoverlapping T-junction on shared source edge fails closed', () => {
  const vertices = [[0, 0], [1, 0], [1, 1], [0, 1], [.5, .5]]
  // Upper-right source face has a midpoint on its diagonal; the lower-left
  // neighboring source face still uses the full diagonal as one edge.
  const faces = [[0, 1, 4], [4, 1, 2], [0, 2, 3]]
  assert.throws(() => partition(vertices, faces, [0, 0, 1]), /T-junction/)
})

test('valid conforming mesh and boundary-only contact do not false-positive', () => {
  const vertices = [[0, 0], [1, 0], [1, 1], [0, 1], [.5, .5]]
  const faces = [[0, 1, 4], [4, 1, 2], [0, 4, 3], [4, 2, 3]]
  const before = JSON.stringify({vertices, faces})
  const result = partition(vertices, faces, [0, 0, 1, 1])
  assert.equal(result.materialPartitionConforming, true)
  assert.equal(result.sourceDomainCoverageVerified, false)
  assert.equal(result.materialPartitionCertified, false)
  assert.equal(result.positiveAreaOverlaps, 0)
  assert.equal(result.geometricTJunctions, 0)
  assert.equal(JSON.stringify({vertices, faces}), before)
})

test('standalone local nonoverlap cannot certify absent source-domain coverage', () => {
  const vertices = [[0, 0], [1, 0], [0, 1]]
  const faces = [[0, 1, 2]]
  const domain = [vertices, [[1, 0], [2, 0], [1, 1]]]
  const before = JSON.stringify({vertices, faces, domain})
  const local = partition(vertices, faces, [0])
  assert.equal(local.materialPartitionConforming, true)
  assert.equal(local.materialPartitionCertified, false)
  assert.equal(local.sourceDomainCoverageVerified, false)
  assert.throws(() => partition(vertices, [], [], domain), /Invalid material partition inventory/)
  assert.throws(() => partition(vertices, faces, [0], domain),
    /Incomplete source material domain coverage/)
  assert.throws(() => partition(vertices, faces, [2], domain),
    /no source material owner/)
  assert.equal(JSON.stringify({vertices, faces, domain}), before)
})

test('source-domain proof rejects holes and false ownership, accepts full partition', () => {
  const vertices = [[0, 0], [1, 0], [1, 1], [0, 1], [.5, .5]]
  const domain = [
    [vertices[0], vertices[1], vertices[2]],
    [vertices[0], vertices[2], vertices[3]]]
  const faces = [[0, 1, 4], [4, 1, 2], [0, 4, 3], [4, 2, 3]]
  const before = JSON.stringify({vertices, domain, faces})
  const full = partition(vertices, faces, [0, 0, 1, 1], domain)
  assert.equal(full.materialPartitionCertified, true)
  assert.equal(full.sourceDomainFaceCount, 2)
  assert.throws(() => partition(vertices, faces.slice(1), [0, 1, 1], domain),
    /Incomplete source material domain coverage/)
  assert.throws(() => partition(vertices, faces, [1, 0, 1, 1], domain),
    /escapes its source material triangle/)
  assert.throws(() => partition(vertices, faces, [0, 0, 1, 1],
    [domain[0], [[0, 0], [0, 1], [1, 1]]]), /source material winding/)
  assert.equal(JSON.stringify({vertices, domain, faces}), before)
})

test('tiny but resolvable material-domain sliver omissions cannot be certified', () => {
  const source = [[[0, 0], [1, 0], [0, 1]]]
  // Only 1e-10 m² is missing; a coarse relative area tolerance could
  // previously have reported full coverage despite a real material hole.
  const vertices = [[0, 0], [1 - 2e-10, 0], [0, 1]]
  assert.throws(() => partition(vertices, [[0, 1, 2]], [0], source),
    /Incomplete source material domain coverage/)
})

test('independent adversarial cross-owner and sub-picometer-area overlap cases reject', () => {
  assert.throws(() => partition(
    [[0, 0], [2, 0], [0, 2], [.3, .2], [2.3, .2], [.3, 2.2]],
    [[0, 1, 2], [3, 4, 5]], [0, 1]), /Positive-area overlap/)
  assert.throws(() => partition(
    [[0, 0], [2, 0], [0, 2], [1.999999999999, 0],
      [3, 0], [1.999999999999, 2]],
    [[0, 1, 2], [3, 4, 5]], [0, 0]), /Positive-area overlap/)
})

test('near-endpoint T-junction rejects only when the intruding vertex is used', () => {
  const vertices = [[0, 0], [2, 0], [0, 2], [1e-10, 0],
    [0, -1], [2, -1]]
  assert.throws(() => partition(vertices, [[0, 1, 2], [3, 4, 5]], [0, 1]),
    /T-junction/)
  // An unused coordinate is not a mesh junction and cannot create a crack.
  assert.equal(partition(vertices, [[0, 1, 2]], [0]).materialPartitionConforming,
    true)
})

test('distinct coincident active vertices cannot create disconnected material seams', () => {
  const vertices = [[0, 0], [1, 0], [0, 1], [0, 0], [-1, 0], [0, -1]]
  assert.throws(() => partition(vertices, [[0, 1, 2], [3, 4, 5]], [0, 1]),
    /Duplicate geometric vertex/)
})
