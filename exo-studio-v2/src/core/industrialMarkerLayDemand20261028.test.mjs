import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from './industrialMarkerLayDemand20261028.mjs'

// Real EXO six-size polygon nesting + DXF parity, generated once from a
// disposable garment. Neither physical rolls nor factory receipts are forged.
const project = createTeeTemplate()
for (const piece of project.pieces) {
  piece.notches = []
  piece.internalLines = []
  piece.buttonholes = []
  piece.marker = {nap: 'one-way', allowCrossGrain: false}
  piece.grainAngleDeg = 0
}
const before = JSON.stringify(project)
const study = inspectMarker(project, {fabricWidthCm: 150, maxCandidates: 50000})
assert.equal(study.ok, true, JSON.stringify(study.issues).slice(0, 700))
const clone = x => structuredClone(x)
function policy() {
  return {
    ordersBySize: Object.fromEntries(project.grading.sizes.map(size => [size, 2])),
    laysBySize: Object.fromEntries(project.grading.sizes.map(size =>
      [size, {main: {rollId: 'ROLL-A', plies: 2, markerRepeats: 1, endLossCmPerPly: 3}}])),
    rollsById: {'ROLL-A': {fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000}},
  }
}
const blocked = (result, code) => {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(i => i.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
}

test('real six-size DXF-checked marker: exact all-size lay and roll demand is inspectable but never authorized', () => {
  const r = inspectLay(project, study, policy())
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.sizeCount, 6)
  assert.equal(r.rows.length, 6)
  assert.equal(r.rows.reduce((sum, row) => sum + row.garmentDemand, 0), 12)
  assert(r.rollEstimates[0].estimatedConsumedLengthCm > 0)
  assert.equal(r.cuttingAuthorized, false)
  assert.equal(r.physicalRollVerified, false)
  assert.equal(r.receiverCadVerified, false)
  assert.equal(JSON.stringify(project), before)
})

test('old digital marker study passes while one size is short by one garment; lay demand rejects it', () => {
  assert.equal(study.ok, true)
  const p = policy()
  p.ordersBySize.XL = 3
  blocked(inspectLay(project, study, p), 'MARKER_LAY_ORDER_QUANTITY_DRIFT')
})

test('overproduction is also blocked rather than treated as acceptable spare pieces', () => {
  const p = policy()
  p.ordersBySize.XL = 1
  blocked(inspectLay(project, study, p), 'MARKER_LAY_ORDER_QUANTITY_DRIFT')
})

test('roll exhaustion accounts for marker length per ply plus explicit end loss', () => {
  const p = policy()
  const valid = inspectLay(project, study, p)
  assert.equal(valid.ok, true)
  p.rollsById['ROLL-A'].availableLengthCm = valid.rollEstimates[0].estimatedConsumedLengthCm - 0.1
  blocked(inspectLay(project, study, p), 'MARKER_LAY_ROLL_LENGTH_EXCEEDED')
  p.rollsById['ROLL-A'].availableLengthCm = valid.rollEstimates[0].estimatedConsumedLengthCm
  assert.equal(inspectLay(project, study, p).ok, true)
})

test('wrong material roll and narrower usable width cannot be substituted', () => {
  const p = policy()
  p.rollsById['ROLL-A'].fabricId = 'lining'
  blocked(inspectLay(project, study, p), 'INVALID_LAY_ROLL_DECLARATION')
  p.rollsById['ROLL-A'].fabricId = 'main'
  p.rollsById['ROLL-A'].usableWidthCm = 100
  blocked(inspectLay(project, study, p), 'MARKER_LAY_ROLL_TOO_NARROW')
})

test('a missing size, unlisted fabric or malformed lay recipe fails closed', () => {
  const p = policy()
  delete p.ordersBySize.XXL
  blocked(inspectLay(project, study, p), 'INVALID_LAY_DEMAND_POLICY')
  const q = policy()
  q.laysBySize.XS.lining = clone(q.laysBySize.XS.main)
  blocked(inspectLay(project, study, q), 'INVALID_LAY_SIZE_ORDER')
  const z = policy()
  delete z.laysBySize.M.main.endLossCmPerPly
  blocked(inspectLay(project, study, z), 'INVALID_LAY_RECIPE')
})

test('duplicate, missing and unexpected marker cut instances are rejected even with an ok marker flag', () => {
  const duplicated = clone(study)
  duplicated.rows[0].marker.placements[1] = clone(duplicated.rows[0].marker.placements[0])
  blocked(inspectLay(project, duplicated, policy()), 'MARKER_LAY_PIECE_INVENTORY_DRIFT')
  const missing = clone(study)
  missing.rows[0].marker.placements.pop()
  blocked(inspectLay(project, missing, policy()), 'MARKER_LAY_PIECE_INVENTORY_DRIFT')
  const extra = clone(study)
  extra.rows[0].marker.placements.push({...extra.rows[0].marker.placements[0], pieceId: 'unlisted'})
  blocked(inspectLay(project, extra, policy()), 'MARKER_LAY_PIECE_INVENTORY_DRIFT')
})

test('all-size row identity, placement width and upstream CUT/mark evidence remain mandatory', () => {
  const missing = clone(study)
  missing.rows.pop()
  blocked(inspectLay(project, missing, policy()), 'MARKER_LAY_PREREQUISITE_BLOCKED')
  const width = clone(study)
  width.rows[0].marker.placements[0].x = 150
  blocked(inspectLay(project, width, policy()), 'MARKER_LAY_PLACEMENT_WIDTH_DRIFT')
  const marks = clone(study)
  marks.rows[0].markTransfer.ok = false
  blocked(inspectLay(project, marks, policy()), 'MARKER_LAY_PREREQUISITE_BLOCKED')
})

test('shortened marker metric cannot conceal real placement length and underestimate roll consumption', () => {
  const altered = clone(study)
  altered.rows[0].marker.metrics.length = 1
  blocked(inspectLay(project, altered, policy()), 'MARKER_LAY_METRIC_INVENTORY_DRIFT')
  const count = clone(study)
  count.rows[0].marker.metrics.placed -= 1
  blocked(inspectLay(project, count, policy()), 'MARKER_LAY_METRIC_INVENTORY_DRIFT')
})

test('invalid piece quantity, roll capacity, negative end loss and upstream parity fail closed', () => {
  const badProject = clone(project)
  badProject.pieces[0].cutQuantity = 0
  blocked(inspectLay(badProject, study, policy()), 'INVALID_LAY_DEMAND_POLICY')
  const p = policy()
  p.rollsById['ROLL-A'].availableLengthCm = Infinity
  blocked(inspectLay(project, study, p), 'INVALID_LAY_ROLL_DECLARATION')
  const q = policy()
  q.laysBySize.XS.main.endLossCmPerPly = -1
  blocked(inspectLay(project, study, q), 'INVALID_LAY_RECIPE')
  const altered = clone(study)
  altered.referenceMarkerParity = false
  blocked(inspectLay(project, altered, policy()), 'MARKER_LAY_PREREQUISITE_BLOCKED')
})

test('real six-size, two-fabric disposable garment reconciles 12 marker rows against separate roll inventories', () => {
  const twoFabric = clone(project)
  twoFabric.pieces[2].fabricId = 'lining'
  twoFabric.pieces[3].fabricId = 'lining'
  const twoStudy = inspectMarker(twoFabric, {fabricWidthCm: 150, maxCandidates: 50000})
  assert.equal(twoStudy.ok, true, JSON.stringify(twoStudy.issues))
  const p = policy()
  for (const size of twoFabric.grading.sizes) {
    p.laysBySize[size].lining = {
      rollId: 'LINING-ROLL', plies: 1, markerRepeats: 2, endLossCmPerPly: 5,
    }
  }
  p.rollsById['LINING-ROLL'] = {
    fabricId: 'lining', usableWidthCm: 150, availableLengthCm: 100000,
  }
  const r = inspectLay(twoFabric, twoStudy, p)
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.rows.length, 12)
  assert.equal(r.fabricCount, 2)
  assert.equal(r.rollEstimates.length, 2)
  assert.equal(r.rows.filter(row => row.fabricId === 'lining').length, 6)
  assert.equal(r.cuttingAuthorized, false)
  const wrongRoll = clone(p)
  wrongRoll.laysBySize.XXL.lining.rollId = 'ROLL-A'
  blocked(inspectLay(twoFabric, twoStudy, wrongRoll), 'MARKER_LAY_ROLL_FABRIC_MISMATCH')
})
