import test from 'node:test'
import assert from 'node:assert/strict'
import { createNativePatternConstraintSidecar20261023 as createSidecar } from './nativePatternConstraintBindings20261023.js'
import { planModarisNativeSixSizeDependencyTransaction20261027 as planSix } from './modarisNativeSixSizeDependencyTransaction20261027.js'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function nativeSources() {
  const snapshots = {}, sidecars = {}
  const measurements = { sharedWidth: { valueMm: 400 } }
  const bindings = ['front', 'back'].map(panelId => ({
    id: `${panelId}-shared`, panelId, pointIndex: 1, mode: 'polar',
    a: 0, b: 0, angleDeg: 0, distanceFormula: 'sharedWidth', dependsOn: [],
  }))
  for (const [index, size] of sizes.entries()) {
    const snapshot = {
      revision: index + 10,
      template: { panels: ['front', 'back', 'pocket'].map((id, panel) => ({
        id, layout_2d: [panel, 0],
        polygon: { points: [[0, 0], [.4, 0], [.4, .3], [0, .3]], edges: [0, 1, 2, 3].map(n => `${id}-${n}`) },
      })) },
    }
    const saved = createSidecar(snapshot, { measurements, bindings })
    assert.equal(saved.ok, true, saved.reason)
    snapshot.nativePointBindings = {
      version: 1, active: true, automaticRegeneration: false, manufacturingApproved: false,
      sourceRevision: snapshot.revision, sourceFingerprint: saved.sidecar.sourceFingerprint,
      measurements: structuredClone(measurements), bindings: structuredClone(bindings),
    }
    snapshots[size] = snapshot
    sidecars[size] = saved.sidecar
  }
  const chart = {
    version: 1, revision: 1, sourceRevision: snapshots.M.revision,
    sourceFingerprint: sidecars.M.sourceFingerprint, fabricId: 'lab', sizes, baseSize: 'M',
    measurements: { sharedWidth: { kind: 'direct', values: Object.fromEntries(sizes.map((size, i) => [size, { value: 380 + i * 10 + (i === 2 ? 20 : 0), unit: 'mm' }])) } },
  }
  const envelope = {
    version: 1, fabricId: 'lab', provenance: 'test bounds',
    bounds: sizes.map((size, i) => ({ size, measurement: 'sharedWidth', minMm: 370 + i * 10, maxMm: 420 + i * 10 })),
  }
  return { snapshots, sidecars, chart, envelope }
}

test('all six restored native graphs can be authenticated and previewed after session revision rebase', () => {
  const fixture = nativeSources()
  const before = structuredClone(fixture)
  const initial = planSix(...Object.values(fixture))
  assert.equal(initial.ok, true, initial.reason)
  const serialized = JSON.parse(JSON.stringify(fixture))
  for (const size of sizes) {
    const snapshot = serialized.snapshots[size]
    snapshot.revision = 0
    const saved = createSidecar(snapshot, snapshot.nativePointBindings)
    assert.equal(saved.ok, true, saved.reason)
    serialized.sidecars[size] = saved.sidecar
    snapshot.nativePointBindings.sourceRevision = 0
    snapshot.nativePointBindings.sourceFingerprint = saved.sidecar.sourceFingerprint
  }
  serialized.chart.sourceRevision = 0
  serialized.chart.sourceFingerprint = serialized.sidecars.M.sourceFingerprint
  const restored = planSix(...Object.values(serialized))
  assert.equal(restored.ok, true, restored.reason)
  assert.equal(restored.sizes.length, 6)
  assert.deepEqual(fixture, before)
})

test('inactive, missing, or modified persisted graphs refuse all-size planning without partial writes', () => {
  const original = nativeSources()
  for (const variant of ['inactive', 'missing', 'measurement', 'binding', 'source-revision', 'source-fingerprint']) {
    const f = structuredClone(original)
    const graph = f.snapshots.XL.nativePointBindings
    if (variant === 'inactive') graph.active = false
    if (variant === 'missing') delete f.snapshots.XL.nativePointBindings
    if (variant === 'measurement') graph.measurements.sharedWidth.valueMm = 415
    if (variant === 'binding') graph.bindings[0].distanceFormula = 'unrelated'
    if (variant === 'source-revision') graph.sourceRevision = 9
    if (variant === 'source-fingerprint') graph.sourceFingerprint = 'sha256:' + '0'.repeat(64)
    const before = structuredClone(f.snapshots)
    const result = planSix(f.snapshots, f.sidecars, f.chart, f.envelope)
    assert.equal(result.ok, false, `${variant} graph unexpectedly accepted`)
    assert.equal(result.committed, false)
    assert.deepEqual(f.snapshots, before)
  }
})
