import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from './industrialMarkerLayDemand20261028.mjs'

// The real six-size EXO polygon nesting / DXF marker study is reused, while
// every order, lay recipe and roll capacity below is disposable test input.
const project = createTeeTemplate()
for (const piece of project.pieces) {
  piece.notches = []
  piece.internalLines = []
  piece.buttonholes = []
  piece.marker = {nap: 'one-way', allowCrossGrain: false}
  piece.grainAngleDeg = 0
}
const original = JSON.stringify(project)
const study = inspectMarker(project, {fabricWidthCm: 150, maxCandidates: 50000})
assert.equal(study.ok, true, JSON.stringify(study.issues).slice(0, 700))
const sizes = project.grading.sizes
const clone = value => structuredClone(value)
function policy(plies = 2, markerRepeats = 3, endLossCmPerPly = 4) {
  return {
    ordersBySize: Object.fromEntries(sizes.map(s => [s, plies * markerRepeats])),
    laysBySize: Object.fromEntries(sizes.map(s => [s, {
      main: {rollId: 'TEST-ROLL', plies, markerRepeats, endLossCmPerPly},
    }])),
    rollsById: {'TEST-ROLL': {
      fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000,
    }},
  }
}
function expectedLength(plies, repeats, endLoss) {
  return study.rows.reduce((sum, row) =>
    sum + plies * (row.marker.metrics.length * repeats + endLoss), 0)
}
function blocked(result, code) {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(i => i.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
}

test('two plies with three contiguous repeats charge end loss exactly once per ply', () => {
  const p = policy(2, 3, 4)
  const r = inspectLay(project, study, p)
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.rows.length, 6)
  assert.equal(r.rows.reduce((n, row) => n + row.garmentDemand, 0), 36)
  assert(Math.abs(r.rollEstimates[0].estimatedConsumedLengthCm - expectedLength(2, 3, 4)) < 1e-6)
  assert(r.rows.every(row =>
    Math.abs(row.estimatedRollConsumptionCm - (row.markerLengthCm * 6 + 8)) < 1e-6))
  assert.equal(r.cuttingAuthorized, false)
  assert.equal(r.physicalRollVerified, false)
  assert.equal(r.receiverCadVerified, false)
  assert.equal(JSON.stringify(project), original)
})

test('exact physical-length estimate is accepted, rather than false-blocked by repeat-counted end waste', () => {
  const p = policy(2, 3, 4)
  const needed = expectedLength(2, 3, 4)
  p.rollsById['TEST-ROLL'].availableLengthCm = needed
  assert.equal(inspectLay(project, study, p).ok, true)
  // Regression counterexample: the old formula rejects this exact-fit roll.
  // It incorrectly charges end waste once per repeat, 96 cm extra overall.
  const legacyEstimate = study.rows.reduce((sum, row) =>
    sum + (row.marker.metrics.length + 4) * 2 * 3, 0)
  assert(Math.abs(legacyEstimate - needed - 96) < 1e-6)
  assert(legacyEstimate > p.rollsById['TEST-ROLL'].availableLengthCm)
})

test('a roll short by 0.1 cm is still rejected across all six graded sizes', () => {
  const p = policy(2, 3, 4)
  p.rollsById['TEST-ROLL'].availableLengthCm = expectedLength(2, 3, 4) - 0.1
  blocked(inspectLay(project, study, p), 'MARKER_LAY_ROLL_LENGTH_EXCEEDED')
})

test('one repeat and zero end loss retain their original correct accounting', () => {
  const one = inspectLay(project, study, policy(2, 1, 4))
  assert.equal(one.ok, true)
  assert(Math.abs(one.rollEstimates[0].estimatedConsumedLengthCm - expectedLength(2, 1, 4)) < 1e-6)
  const zero = inspectLay(project, study, policy(2, 3, 0))
  assert.equal(zero.ok, true)
  assert(Math.abs(zero.rollEstimates[0].estimatedConsumedLengthCm - expectedLength(2, 3, 0)) < 1e-6)
})

test('repeated markers cannot hide a missing garment or an invalid repeat declaration', () => {
  const shortage = policy(2, 3, 4)
  shortage.ordersBySize.M += 1
  blocked(inspectLay(project, study, shortage), 'MARKER_LAY_ORDER_QUANTITY_DRIFT')
  const invalid = policy(2, 3, 4)
  invalid.laysBySize.M.main.markerRepeats = 0
  blocked(inspectLay(project, study, invalid), 'INVALID_LAY_RECIPE')
})

test('unsafe repeat multiplication and insufficient capacity cannot authorize physical cutting', () => {
  const overflow = policy(2, 3, 4)
  overflow.laysBySize.XS.main.plies = Number.MAX_SAFE_INTEGER
  overflow.laysBySize.XS.main.markerRepeats = 2
  blocked(inspectLay(project, study, overflow), 'MARKER_LAY_ORDER_QUANTITY_DRIFT')
  const capacity = policy(2, 3, 4)
  capacity.rollsById['TEST-ROLL'].availableLengthCm = expectedLength(2, 3, 4) / 2
  blocked(inspectLay(project, study, capacity), 'MARKER_LAY_ROLL_LENGTH_EXCEEDED')
})
