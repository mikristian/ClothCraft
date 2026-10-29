import test from 'node:test'
import assert from 'node:assert/strict'
import { createNativePatternConstraintSidecar20261023 as create } from './nativePatternConstraintBindings20261023.js'
import { planModarisNativeReferenceRecompute20261027 as plan } from './modarisNativeReferenceRecompute20261027.js'
import { witnessModarisNativeReferenceCommit20261027 as witness } from './modarisNativeReferenceCommitWitness20261027.js'

function fixture() {
  const before = { revision: 5, template: { panels: [
    { id: 'front', layout_2d: [0, 0], polygon: {
      points: [[0, 0], [.4, 0], [.4, .3], [0, .3]], edges: ['a', 'b', 'c', 'd'],
    } },
    { id: 'back', layout_2d: [0, 0], polygon: {
      points: [[0, 0], [.3, 0], [.3, .2], [0, .2]], edges: ['e', 'f', 'g', 'h'],
    } },
  ] } }
  const measurements = { reach: { valueMm: 250 }, backWidth: { valueMm: 300 } }
  const bindings = [
    { id: 'front-dependent', panelId: 'front', pointIndex: 2, mode: 'polar',
      a: 1, b: 0, angleDeg: 90, distanceFormula: 'reach', dependsOn: [] },
    { id: 'back-independent', panelId: 'back', pointIndex: 1, mode: 'polar',
      a: 0, b: 3, angleDeg: 0, distanceFormula: 'backWidth', dependsOn: [] },
  ]
  const created = create(before, { measurements, bindings })
  assert.equal(created.ok, true, created.reason)
  const sidecar = created.sidecar
  const input = { panelId: 'front', pointIndex: 1, originalPosition: [.4, 0], position: [.42, 0] }
  const proposed = plan(before, sidecar, input)
  assert.equal(proposed.ok, true, proposed.reason)
  const after = structuredClone(before)
  after.revision++
  after.template.panels[0].polygon.points[1] = [.42, 0]
  after.template.panels[0].polygon.points[2] = [.42, .25]
  after.nativePointBindings = {
    version: 1, active: true, automaticRegeneration: false, manufacturingApproved: false,
    measurements: structuredClone(measurements), bindings: structuredClone(bindings),
  }
  return { before, after, sidecar, input, proposal: proposed.proposal }
}

test('witnesses exact committed native geometry, saved Rust definitions and all dependent points', () => {
  const f = fixture()
  const original = structuredClone(f)
  const result = witness(f.before, f.after, f.sidecar, f.input, f.proposal)
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.committedRevision, 6)
  assert.equal(result.persistedNativeBindingCount, 2)
  assert.deepEqual(result.verifiedBindingIds, ['front-dependent', 'back-independent'])
  assert.equal(result.referenceEditCount, 2)
  assert.equal(result.nativeAutomaticRegeneration, false)
  assert.equal(result.manufacturingApproved, false)
  assert(Object.isFrozen(result.sidecar))
  assert.deepEqual(f, original)
})

test('missing, stale or forged Rust binding definitions refuse even if geometry is correct', () => {
  const f = fixture()
  for (const change of [
    x => { delete x.nativePointBindings },
    x => { x.nativePointBindings.active = false },
    x => { x.nativePointBindings.automaticRegeneration = true },
    x => { x.nativePointBindings.measurements.reach.valueMm = 260 },
    x => { x.nativePointBindings.bindings[0].pointIndex = 3 },
    x => { x.nativePointBindings.bindings.reverse() },
  ]) {
    const altered = structuredClone(f.after)
    change(altered)
    const result = witness(f.before, altered, f.sidecar, f.input, f.proposal)
    assert.equal(result.ok, false)
    assert.equal(result.nativeRollbackAttempted, false)
    assert.equal(result.requiresOperatorRecovery, true)
  }
})

test('unexpected source, command, revision and unapproved geometry refuse atomically', () => {
  const f = fixture()
  const forged = structuredClone(f.proposal)
  forged.commands[0].edits[1][1][1] = .24
  assert.match(witness(f.before, f.after, f.sidecar, f.input, forged).reason, /differs/)
  const changed = structuredClone(f.after)
  changed.template.panels[0].polygon.points[2][1] = .26
  assert.match(witness(f.before, changed, f.sidecar, f.input, f.proposal).reason, /geometry witness/)
  const unrelated = structuredClone(f.after)
  unrelated.template.panels[1].polygon.points[2][1] += .01
  assert.match(witness(f.before, unrelated, f.sidecar, f.input, f.proposal).reason, /geometry witness/)
  const wrongRevision = structuredClone(f.after)
  wrongRevision.revision += 1
  assert.equal(witness(f.before, wrongRevision, f.sidecar, f.input, f.proposal).ok, false)
})

test('other unchanged panels must already satisfy their saved bindings', () => {
  const f = fixture()
  const modified = structuredClone(f.sidecar)
  modified.measurements.backWidth.valueMm = 310
  const alteredNative = structuredClone(f.after)
  alteredNative.nativePointBindings.measurements.backWidth.valueMm = 310
  const result = witness(f.before, alteredNative, modified, f.input, f.proposal)
  assert.equal(result.ok, false)
  assert.match(result.reason, /does not satisfy every persisted point binding/)
})
