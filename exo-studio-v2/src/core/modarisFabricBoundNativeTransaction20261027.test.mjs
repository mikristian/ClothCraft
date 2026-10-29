import test from 'node:test'
import assert from 'node:assert/strict'
import { createNativePatternConstraintSidecar20261023 as create, fingerprintNativePatternBindingsSource20261023 as fingerprint } from './nativePatternConstraintBindings20261023.js'
import { prepareModarisFabricBoundNativeTransaction20261027 as prepare, verifyModarisFabricBoundNativeCommitRequest20261027 as verify, witnessModarisFabricBoundNativeTransaction20261027 as witness } from './modarisFabricBoundNativeTransaction20261027.js'

function fixture() {
  const before = { revision: 5, template: { panels: [{ id: 'front', polygon: {
    points: [[0, 0], [.42, 0], [.42, .3], [0, .3]], edges: ['a', 'b', 'c', 'd'],
  }, layout_2d: [0, 0], pattern: { width: .42, height: .3 } }] } }
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  const widths = [380, 400, 420, 440, 460, 480]
  const chart = { version: 1, revision: 2, sourceRevision: 5, sourceFingerprint: fingerprint(before),
    fabricId: 'lab-twill', sizes, baseSize: 'M', measurements: {
      width: { kind: 'direct', values: Object.fromEntries(sizes.map((size, i) => [size, { value: widths[i], unit: 'mm' }])) },
      halfWidth: { kind: 'formula', expression: 'width / 2' },
    } }
  const envelope = { version: 1, fabricId: chart.fabricId, provenance: 'test specimen measurement limits',
    bounds: sizes.flatMap((size, i) => [
      { size, measurement: 'width', minMm: widths[i] - 5, maxMm: widths[i] + 5 },
      { size, measurement: 'halfWidth', minMm: widths[i] / 2 - 3, maxMm: widths[i] / 2 + 3 },
    ]) }
  const result = create(before, { measurements: { width: { valueMm: 420 }, halfWidth: { formula: 'width / 2' } },
    bindings: [{ id: 'point-width', panelId: 'front', pointIndex: 1, mode: 'polar', a: 0, b: 3,
      angleDeg: 0, distanceFormula: 'width' }] })
  assert.equal(result.ok, true, result.reason)
  return { before, chart, envelope, sidecar: result.sidecar }
}

test('prepares six bounded sizes for selected-size atomic native request without mutating source', () => {
  const f = fixture(), original = structuredClone(f)
  const prepared = prepare(f.before, f.sidecar, f.chart, f.envelope, { size: 'L' })
  assert.equal(prepared.ok, true, prepared.reason)
  assert.equal(prepared.proposal.op, 'edit-batch')
  assert.equal(prepared.proposal.commands[0].kind, 'AnchorGroup')
  assert.equal(prepared.proposal.commands[0].edits[0][1][0], .44)
  assert.equal(verify(f.before, prepared, prepared.proposal).ok, true)
  assert.deepEqual(f, original)
})

test('rejects cross-size limits, formula edits, stale source, and altered batch', () => {
  const f = fixture()
  const bad = structuredClone(f.chart); bad.measurements.width.values.XXL.value = 1000
  assert.match(prepare(f.before, f.sidecar, bad, f.envelope, { size: 'L' }).reason, /limit exceeded/)
  assert.match(prepare(f.before, f.sidecar, f.chart, f.envelope, { size: 'wrong' }).reason, /Unknown selected/)
  const prepared = prepare(f.before, f.sidecar, f.chart, f.envelope, { size: 'L' })
  const altered = structuredClone(prepared.proposal)
  altered.commands[0].edits[0][1][0] += .02
  assert.match(verify(f.before, prepared, altered).reason, /differs/)
  const stale = structuredClone(f.before); stale.revision++
  assert.equal(verify(stale, prepared, prepared.proposal).ok, false)
  const other = structuredClone(f.before); other.template.panels[0].polygon.points[2][0] += .01
  assert.equal(verify(other, prepared, prepared.proposal).ok, false)
})

test('failed witness is explicit about native commit and cannot rollback', () => {
  const f = fixture(), prepared = prepare(f.before, f.sidecar, f.chart, f.envelope, { size: 'L' })
  assert.equal(prepared.ok, true, prepared.reason)
  const unexpected = structuredClone(f.before); unexpected.revision++
  const outcome = witness(f.before, unexpected, prepared, prepared.proposal)
  assert.equal(outcome.ok, false)
  assert.equal(outcome.nativeCommitAlreadyOccurred, true)
  assert.equal(outcome.nativeRollbackAttempted, false)
  assert.equal(outcome.requiresOperatorRecovery, true)
})

test('verified native edit-batch rebases source and binding witness across all six chart rows', () => {
  const f = fixture(), original = structuredClone(f)
  const prepared = prepare(f.before, f.sidecar, f.chart, f.envelope, { size: 'L' })
  assert.equal(prepared.ok, true, prepared.reason)
  const after = structuredClone(f.before); after.revision++
  after.template.panels[0].polygon.points[1] = [.44, 0]
  after.template.panels[0].pattern.width = .44
  const result = witness(f.before, after, prepared, prepared.proposal)
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.chart.sourceRevision, after.revision)
  assert.equal(result.sidecar.sourceFingerprint, fingerprint(after))
  assert.deepEqual(result.chart.measurements.width.values, f.chart.measurements.width.values)
  assert.deepEqual(result.sidecar.bindings, f.sidecar.bindings)
  assert.equal(result.nativeEvidenceVerified, true)
  assert.equal(result.chartSaved, false)
  assert.deepEqual(f, original)
  const forged = structuredClone(after); forged.template.panels[0].polygon.points[2][0] += .02
  assert.match(witness(f.before, forged, prepared, prepared.proposal).reason, /witness failed/)
})

test('real Rust-shaped persisted native rule receipt is checked separately from exact geometry', () => {
  const f = fixture(), prepared = prepare(f.before, f.sidecar, f.chart, f.envelope, { size: 'L' })
  const after = structuredClone(f.before); after.revision++
  after.template.panels[0].polygon.points[1] = [.44, 0]
  after.template.panels[0].pattern.width = .44
  after.nativePointBindings = { version: 1, active: true,
    automaticRegeneration: false, manufacturingApproved: false,
    measurements: structuredClone(prepared.selectedSidecar.measurements),
    bindings: structuredClone(prepared.selectedSidecar.bindings) }
  const passed = witness(f.before, after, prepared, prepared.proposal)
  assert.equal(passed.ok, true, passed.reason)
  const altered = structuredClone(after)
  altered.nativePointBindings.measurements.width.valueMm = 450
  assert.match(witness(f.before, altered, prepared, prepared.proposal).reason, /Rust saved measurement rules/)
  const inactive = structuredClone(after)
  inactive.nativePointBindings.active = false
  assert.equal(witness(f.before, inactive, prepared, prepared.proposal).ok, false)
  const stale = structuredClone(after)
  stale.nativePointBindings.sourceRevision = 1
  assert.match(witness(f.before, stale, prepared, prepared.proposal).reason, /stale source revision/)
  const extra = structuredClone(after)
  extra.unverifiedProductionApproval = true
  assert.match(witness(f.before, extra, prepared, prepared.proposal).reason, /unexpected project metadata/)
})
