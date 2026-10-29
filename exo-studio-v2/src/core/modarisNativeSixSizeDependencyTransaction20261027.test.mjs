import test from 'node:test'
import assert from 'node:assert/strict'
import { createNativePatternConstraintSidecar20261023 as create } from './nativePatternConstraintBindings20261023.js'
import { planModarisNativeSixSizeDependencyTransaction20261027 as plan, verifyModarisNativeSixSizeDependencyPreview20261027 as verify } from './modarisNativeSixSizeDependencyTransaction20261027.js'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const widths = [380, 400, 420, 440, 460, 480]
function fixture() {
  const snapshots = {}, sidecars = {}
  for (const [index, size] of sizes.entries()) {
    const w = widths[index] / 1000
    const snapshot = { revision: 10 + index, template: { panels: [
      { id: 'front', layout_2d: [0, 0], polygon: { points: [[0, 0], [w - .03, 0], [w - .03, .3], [0, .3]], edges: ['fa', 'fb', 'fc', 'fd'] } },
      { id: 'back', layout_2d: [1, 0], polygon: { points: [[0, 0], [w - .04, 0], [w - .04, .3], [0, .3]], edges: ['ba', 'bb', 'bc', 'bd'] } },
      { id: 'pocket', layout_2d: [2, 0], polygon: { points: [[0, 0], [.12, 0], [.12, .12], [0, .12]], edges: ['pa', 'pb', 'pc', 'pd'] } },
    ] } }
    snapshots[size] = snapshot
    const created = create(snapshot, { measurements: { width: { valueMm: widths[index] }, halfWidth: { formula: 'width / 2' } },
      bindings: [
        { id: 'frontwidth', panelId: 'front', pointIndex: 1, mode: 'polar', a: 0, b: 3, angleDeg: 0, distanceFormula: 'width' },
        { id: 'backwidth', panelId: 'back', pointIndex: 1, mode: 'polar', a: 0, b: 3, angleDeg: 0, distanceFormula: 'halfWidth * 2 - 10', dependsOn: ['frontwidth'] },
      ] })
    assert.equal(created.ok, true, created.reason)
    sidecars[size] = created.sidecar
    snapshot.nativePointBindings = { version: 1, active: true,
      automaticRegeneration: false, manufacturingApproved: false,
      sourceRevision: snapshot.revision, sourceFingerprint: created.sidecar.sourceFingerprint,
      measurements: structuredClone(created.sidecar.measurements),
      bindings: structuredClone(created.sidecar.bindings) }
    // Persisted Rust graph is authoritative for this size and must agree with
    // the source-bound sidecar down to measurement and rule identities.
    snapshot.nativePointBindings = {
      active: true,
      version: 1,
      automaticRegeneration: false,
      manufacturingApproved: false,
      sourceRevision: snapshot.revision,
      sourceFingerprint: created.sidecar.sourceFingerprint,
      measurements: structuredClone(created.sidecar.measurements),
      bindings: structuredClone(created.sidecar.bindings),
    }
  }
  const chart = { version: 1, revision: 3, sourceRevision: snapshots.M.revision,
    sourceFingerprint: sidecars.M.sourceFingerprint, fabricId: 'lab-twill', sizes, baseSize: 'M', measurements: {
      width: { kind: 'direct', values: Object.fromEntries(sizes.map((size, i) => [size, { value: widths[i], unit: 'mm' }])) },
      halfWidth: { kind: 'formula', expression: 'width / 2' },
    } }
  const envelope = { version: 1, fabricId: chart.fabricId, provenance: 'authored test limits', bounds: sizes.flatMap((size, i) => [
    { size, measurement: 'width', minMm: widths[i] - 1, maxMm: widths[i] + 1 },
    { size, measurement: 'halfWidth', minMm: widths[i] / 2 - 1, maxMm: widths[i] / 2 + 1 },
  ]) }
  return { snapshots, sidecars, chart, envelope }
}

test('all six authoritative native snapshots yield immutable independent groups and normalized geometry proofs', () => {
  const f = fixture(), original = structuredClone(f)
  const result = plan(f.snapshots, f.sidecars, f.chart, f.envelope)
  assert.equal(result.ok, true, result.reason)
  assert.deepEqual(result.sizeOrder, sizes)
  assert.equal(result.sizes.length, 6)
  assert.equal(result.distinctNativeRevisions, 6)
  assert.equal(result.commitAsSingleTransactionSupported, false)
  assert.equal(result.requiresAuthoritativeRustSizeRunEngine, true)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.committed, false)
  for (const [index, row] of result.sizes.entries()) {
    assert.equal(row.size, sizes[index])
    assert.deepEqual(row.commands.map(command => command.kind), ['AnchorGroup', 'AnchorGroup'])
    assert.equal(row.commands[0].edits[0][1][0], widths[index] / 1000)
    assert.deepEqual(row.unrelatedPanelIdsPreserved, ['pocket'])
    assert.equal(row.expectedNativeSnapshotPreview.revision, 11 + index)
    assert.deepEqual(row.expectedNativeSnapshotPreview.template.panels[2], f.snapshots[row.size].template.panels[2])
    assert.equal(row.normalizedGeometryProof.length, 2)
    assert(Object.isFrozen(row.normalizedGeometryProof[0].pointsAfterMetres))
  }
  assert.equal(verify(f.snapshots, f.sidecars, f.chart, f.envelope, result).ok, true)
  assert.deepEqual(f, original)
})

test('refuses modified source, tampered proof or commands and spoofed per-size sidecars', () => {
  const f = fixture(), result = plan(f.snapshots, f.sidecars, f.chart, f.envelope)
  assert.equal(result.ok, true, result.reason)
  const proof = structuredClone(result)
  proof.sizes[0].normalizedGeometryProof[0].pointsAfterMetres[1][0] += .01
  assert.match(verify(f.snapshots, f.sidecars, f.chart, f.envelope, proof).reason, /proof|changed/)
  const changed = structuredClone(f.snapshots)
  changed.XS.template.panels[2].polygon.points[1][0] = .18
  assert.equal(verify(changed, f.sidecars, f.chart, f.envelope, result).ok, false)
  const sidecars = structuredClone(f.sidecars)
  sidecars.L.bindings[0].pointIndex = 2
  assert.equal(plan(f.snapshots, sidecars, f.chart, f.envelope).ok, false)
})

test('partial failure rejects the entire staged six-size result without applying any command', () => {
  const f = fixture(), original = structuredClone(f.snapshots)
  delete f.sidecars.XL
  assert.match(plan(f.snapshots, f.sidecars, f.chart, f.envelope).reason, /Exactly six/)
  f.sidecars.XL = fixture().sidecars.XL
  f.snapshots.XXL.template.panels[1].attachments = ['stitched']
  assert.match(plan(f.snapshots, f.sidecars, f.chart, f.envelope).reason, /sewing|attachment|pinned/)
  assert.deepEqual(f.snapshots.XS, original.XS)
  assert.deepEqual(f.snapshots.L, original.L)
})

test('all-size fabric limit and inconsistent native topology fail closed', () => {
  const f = fixture()
  f.chart.measurements.width.values.XXL.value = 1000
  assert.match(plan(f.snapshots, f.sidecars, f.chart, f.envelope).reason, /limit exceeded/)
  const g = fixture()
  g.snapshots.L.template.panels[0].polygon.edges[0] = 'changed'
  assert.match(plan(g.snapshots, g.sidecars, g.chart, g.envelope).reason, /topology|source geometry differs/)
})

test('inactive or non-authoritative persisted Rust binding graph refuses all six sizes', () => {
  const f = fixture()
  f.snapshots.L.nativePointBindings.active = false
  assert.match(plan(f.snapshots, f.sidecars, f.chart, f.envelope).reason, /Inactive|inactive/)
  const g = fixture()
  g.snapshots.XL.nativePointBindings.automaticRegeneration = true
  assert.match(plan(g.snapshots, g.sidecars, g.chart, g.envelope).reason, /authoritative native binding graph/)
  const h = fixture()
  h.snapshots.S.nativePointBindings.measurements.width.valueMm += 1
  assert.match(plan(h.snapshots, h.sidecars, h.chart, h.envelope).reason, /binding values or identities differ/)
})
