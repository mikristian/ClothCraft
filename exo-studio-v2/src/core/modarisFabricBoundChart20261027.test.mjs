import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateModarisFabricBoundChart20261027 as validate,
  proposeModarisFabricBoundChartEdit20261027 as edit,
  planModarisFabricBoundNativeChart20261027 as plan,
  reviewModarisFabricBoundNativeInverse20261027 as inverseReview,
} from './modarisFabricBoundChart20261027.js'
import {
  createNativePatternConstraintSidecar20261023 as createSidecar,
  fingerprintNativePatternBindingsSource20261023 as fingerprint,
} from './nativePatternConstraintBindings20261023.js'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const widths = [380, 400, 420, 440, 460, 480]
const snapshot = () => ({ revision: 7, template: { panels: [{ id: 'front', layout_2d: [0, 0],
  pattern: { width: .42, height: .3 }, polygon: {
    points: [[0, 0], [.42, 0], [.42, .3], [0, .3]], edges: ['a', 'b', 'c', 'd'],
  },
}] } })
function fixture() {
  const source = snapshot()
  const chart = {
    version: 1, revision: 2, sourceRevision: source.revision,
    sourceFingerprint: fingerprint(source), fabricId: 'lab-twill-7',
    sizes: [...sizes], baseSize: 'M', measurements: {
      width: { kind: 'direct', values: Object.fromEntries(sizes.map((size, i) =>
        [size, { value: widths[i] / 10, unit: 'cm' }])) },
      halfWidth: { kind: 'formula', expression: 'width / 2' },
    },
  }
  const envelope = { version: 1, fabricId: chart.fabricId,
    provenance: 'Lab specimen TW7, approved patternmaker limits (test fixture only)',
    bounds: sizes.flatMap((size, i) => [
      { measurement: 'width', size, minMm: widths[i] - 5, maxMm: widths[i] + 5 },
      { measurement: 'halfWidth', size, minMm: widths[i] / 2 - 3, maxMm: widths[i] / 2 + 3 },
    ]),
  }
  const created = createSidecar(source, { measurements: {
    width: { valueMm: 420 }, halfWidth: { formula: 'width / 2' },
  }, bindings: [{ id: 'point-width', panelId: 'front', pointIndex: 1, mode: 'polar',
    a: 0, b: 3, angleDeg: 0, distanceFormula: 'width' }] })
  assert.equal(created.ok, true, created.reason)
  return { source, chart, envelope, sidecar: created.sidecar }
}

test('six sizes and computed measurements are evaluated independently with explicit lab bounds', () => {
  const { source, chart, envelope } = fixture()
  const before = structuredClone({ source, chart, envelope })
  const result = validate(source, chart, envelope)
  assert.equal(result.ok, true, result.reason)
  assert.deepEqual(result.sizes, sizes)
  assert.deepEqual(result.perSize.map(row => row.valuesMm.width), widths)
  assert.deepEqual(result.perSize.map(row => row.valuesMm.halfWidth), widths.map(x => x / 2))
  assert.deepEqual(result.perSize[0].dependencyOrder, ['width', 'halfWidth'])
  assert.equal(result.perSize[3].marginsMm.width.lower, 5)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.calibratedFabricPhysics, false)
  assert(Object.isFrozen(result.perSize[0].valuesMm))
  assert.deepEqual({ source, chart, envelope }, before)
})

test('size-scoped source-verified native binding preview computes physical point displacement', () => {
  const { source, chart, envelope, sidecar } = fixture()
  const before = structuredClone(sidecar)
  const result = plan(source, sidecar, chart, envelope, { size: 'L' })
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.sidecar.measurements.width.valueMm, 440)
  assert.equal(result.sidecar.measurements.halfWidth.formula, 'width / 2')
  assert.equal(result.nativePlan.ok, true)
  assert.equal(result.nativePlan.steps[0].distanceMm, 440)
  assert(Math.abs(result.nativePlan.steps[0].command.position[0] - .44) < 1e-9)
  assert.equal(result.applied, false)
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(sidecar, before)
})

test('single direct cell update is revisioned and all-size revalidated without mutating input', () => {
  const { source, chart, envelope, sidecar } = fixture()
  const before = structuredClone(chart)
  const result = edit(source, chart, envelope, { expectedRevision: 2, size: 'M',
    measurement: 'width', value: 42.3, unit: 'cm' })
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.chart.revision, 3)
  assert.equal(result.changed.valueMm, 423)
  assert.equal(result.perSize.find(row => row.size === 'M').valuesMm.halfWidth, 211.5)
  assert.deepEqual(chart, before)
  assert(Object.isFrozen(result.chart.measurements.width.values.M))
  const preview = plan(source, sidecar, result.chart, envelope, { size: 'M' })
  assert.equal(preview.ok, true, preview.reason)
  assert(Math.abs(preview.nativePlan.steps[0].command.position[0] - .423) < 1e-9)
  assert.equal(edit(source, result.chart, envelope, { expectedRevision: 2, size: 'M',
    measurement: 'width', value: 42.4, unit: 'cm' }).ok, false)
})

test('inch inputs are converted exactly into the millimetre chart domain', () => {
  const { source, chart, envelope } = fixture()
  const proposed = edit(source, chart, envelope, { expectedRevision: 2, size: 'M',
    measurement: 'width', value: 423 / 25.4, unit: 'in' })
  assert.equal(proposed.ok, true, proposed.reason)
  assert(Math.abs(proposed.changed.valueMm - 423) < 1e-9)
  assert(Math.abs(proposed.perSize[2].valuesMm.halfWidth - 211.5) < 1e-9)
})

test('computed cells, wrong units, nonfinite values and out-of-range direct values reject atomically', () => {
  const { source, chart, envelope } = fixture()
  const before = structuredClone(chart)
  const options = { expectedRevision: 2, size: 'M', measurement: 'width' }
  assert.match(edit(source, chart, envelope, { ...options, value: 43, unit: 'cm' }).reason, /limit exceeded/)
  assert.match(edit(source, chart, envelope, { ...options, value: 42, unit: 'feet' }).reason, /unit/)
  assert.match(edit(source, chart, envelope, { ...options, value: Infinity, unit: 'mm' }).reason, /finite/)
  assert.match(edit(source, chart, envelope, { ...options, value: 1e10, unit: 'mm' }).reason, /finite/)
  assert.match(edit(source, chart, envelope, { ...options, measurement: 'halfWidth', value: 210, unit: 'mm' }).reason, /Computed/)
  assert.deepEqual(chart, before)
})

test('missing bounds, duplicate bounds, invalid fabric, provenance and size catalogs refuse', () => {
  const { source, chart, envelope } = fixture()
  const missing = structuredClone(envelope); missing.bounds.pop()
  assert.match(validate(source, chart, missing).reason, /cover every/)
  const duplicate = structuredClone(envelope); duplicate.bounds.push(duplicate.bounds[0])
  assert.match(validate(source, chart, duplicate).reason, /Duplicate/)
  const wrongFabric = structuredClone(envelope); wrongFabric.fabricId = 'other'
  assert.match(validate(source, chart, wrongFabric).reason, /fabric envelope provenance/)
  const unverified = structuredClone(envelope); unverified.provenance = ''
  assert.equal(validate(source, chart, unverified).ok, false)
  const badCatalog = structuredClone(chart); badCatalog.sizes[1] = 'XS'
  assert.match(validate(source, badCatalog, envelope).reason, /size catalog/)
  const foreign = structuredClone(envelope); foreign.bounds[0].size = 'not-a-size'
  assert.match(validate(source, chart, foreign).reason, /Invalid fabric envelope bound/)
})

test('cyclic formulas, changed source geometry, forged chart fields and corrupt other sizes reject', () => {
  const { source, chart, envelope } = fixture()
  const cyclic = structuredClone(chart); cyclic.measurements.halfWidth.expression = 'halfWidth + 1'
  assert.match(validate(source, cyclic, envelope).reason, /Circular/)
  const changed = structuredClone(source); changed.template.panels[0].polygon.points[1][0] += .01
  assert.match(validate(changed, chart, envelope).reason, /Stale/)
  const extra = structuredClone(chart); extra.factoryCertified = true
  assert.match(validate(source, extra, envelope).reason, /Stale or invalid/)
  const otherSize = structuredClone(chart); otherSize.measurements.width.values.XXL.value = 100
  assert.match(validate(source, otherSize, envelope).reason, /XXL\/width/)
})

test('native sidecar mismatches, invalid selected size and stale sidecar source refuse preview', () => {
  const { source, chart, envelope, sidecar } = fixture()
  assert.match(plan(source, sidecar, chart, envelope, { size: 'unknown' }).reason, /Unknown selected/)
  const badFormula = structuredClone(sidecar)
  badFormula.measurements.halfWidth.formula = 'width / 3'
  assert.match(plan(source, badFormula, chart, envelope, { size: 'M' }).reason, /differs from chart/)
  const extraName = structuredClone(sidecar)
  extraName.measurements.other = { valueMm: 2 }
  assert.match(plan(source, extraName, chart, envelope, { size: 'M' }).reason, /identities differ/)
  const stale = structuredClone(sidecar); stale.sourceRevision++
  assert.match(plan(source, stale, chart, envelope, { size: 'M' }).reason, /does not match chart/)
})

test('serialized chart/envelope survive JSON reopen and still enforce the same limits', () => {
  const { source, chart, envelope } = fixture()
  const reopenedChart = JSON.parse(JSON.stringify(chart))
  const reopenedEnvelope = JSON.parse(JSON.stringify(envelope))
  assert.equal(validate(source, reopenedChart, reopenedEnvelope).ok, true)
  const bad = structuredClone(reopenedEnvelope); bad.bounds[0].maxMm = bad.bounds[0].minMm - 1
  assert.match(validate(source, reopenedChart, bad).reason, /Invalid fabric envelope bound/)
})

function committedPolarEdit(source, sidecar, widthMm) {
  const proposal = { ok: true, op: 'edit-batch', sourceRevision: source.revision,
    sourceFingerprint: fingerprint(source), panelCount: 1, pointCount: 1,
    commands: [{ kind: 'AnchorGroup', panel: 'front', edits: [[1, [widthMm / 1000, 0]]] }],
  }
  const after = structuredClone(source)
  after.revision++
  after.template.panels[0].polygon.points[1] = [widthMm / 1000, 0]
  after.template.panels[0].pattern.width = widthMm / 1000
  return { proposal, after }
}

function inverseFixture() {
  const data = fixture()
  // The current native inverse intentionally refuses variables used by any
  // other computed measurement. Preserve that narrow, verified contract.
  delete data.chart.measurements.halfWidth
  data.envelope.bounds = data.envelope.bounds.filter(item => item.measurement === 'width')
  const created = createSidecar(data.source, { measurements: { width: { valueMm: 420 } },
    bindings: structuredClone(data.sidecar.bindings) })
  assert.equal(created.ok, true, created.reason)
  data.sidecar = created.sidecar
  return data
}

test('verified native inverse rebinds a selected chart size and source identity after commit', () => {
  const { source, chart, envelope, sidecar } = inverseFixture()
  const original = structuredClone({ source, chart, envelope, sidecar })
  const { proposal, after } = committedPolarEdit(source, sidecar, 423)
  const reviewed = inverseReview(source, after, sidecar, proposal, chart, envelope,
    { size: 'M', bindingId: 'point-width' })
  assert.equal(reviewed.ok, true, reviewed.reason)
  assert.equal(reviewed.changed.valueMm, 423)
  assert.equal(reviewed.chart.revision, 3)
  assert.equal(reviewed.chart.sourceRevision, 8)
  assert.equal(reviewed.chart.sourceFingerprint, fingerprint(after))
  assert.equal(reviewed.sidecar.sourceFingerprint, fingerprint(after))
  assert.equal(reviewed.chart.measurements.width.values.M.value, 423)
  assert.equal(reviewed.chart.measurements.width.values.M.unit, 'mm')
  assert.equal(reviewed.nativeCommitAlreadyOccurred, true)
  assert.equal(reviewed.chartSaved, false)
  assert.equal(validate(after, reviewed.chart, envelope).ok, true)
  assert.deepEqual({ source, chart, envelope, sidecar }, original)
})

test('postcommit over-limit native inverse refuses chart rebase without claiming a Rust rollback', () => {
  const { source, chart, envelope, sidecar } = inverseFixture()
  const { proposal, after } = committedPolarEdit(source, sidecar, 430)
  const result = inverseReview(source, after, sidecar, proposal, chart, envelope,
    { size: 'M', bindingId: 'point-width' })
  assert.equal(result.ok, false)
  assert.match(result.reason, /violates fabric chart/)
  assert.equal(result.nativeRollbackAttempted, false)
  assert.equal(result.requiresOperatorRecovery, true)
  assert.equal(chart.revision, 2)
  const other = inverseReview(source, after, sidecar, proposal, chart, envelope,
    { size: 'L', bindingId: 'point-width' })
  assert.match(other.reason, /disagree before commit/)
  const forged = structuredClone(after); forged.template.panels[0].polygon.points[2][0] += .1
  assert.match(inverseReview(source, forged, sidecar, proposal, chart, envelope,
    { size: 'M', bindingId: 'point-width' }).reason, /Native inverse not verified/)
})

test('two consecutive verified native inverse commits keep chart and sidecar source aligned', () => {
  let { source, chart, envelope, sidecar } = inverseFixture()
  for (const widthMm of [423, 424]) {
    const { proposal, after } = committedPolarEdit(source, sidecar, widthMm)
    const reviewed = inverseReview(source, after, sidecar, proposal, chart, envelope,
      { size: 'M', bindingId: 'point-width' })
    assert.equal(reviewed.ok, true, reviewed.reason)
    assert.equal(reviewed.changed.valueMm, widthMm)
    assert.equal(reviewed.chart.sourceFingerprint, fingerprint(after))
    source = after; chart = reviewed.chart; sidecar = reviewed.sidecar
  }
  assert.equal(chart.revision, 4)
  assert.equal(chart.sourceRevision, 9)
  assert.equal(validate(source, chart, envelope).ok, true)
})
