import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerPlyStackClearance20261029 as inspectStack} from './industrialMarkerPlyStackClearance20261029.mjs'

// Disposable, six-size EXO garment: run actual marker nesting and DXF inspection.
// All roll and machine declarations are synthetic, not factory measurements.
const project = createTeeTemplate()
for (const piece of project.pieces) {
  piece.notches = []
  piece.internalLines = []
  piece.buttonholes = []
  piece.marker = {nap: 'one-way', allowCrossGrain: false}
  piece.grainAngleDeg = 0
}
const original = JSON.stringify(project)
const sizes = project.grading.sizes
const study = inspectMarker(project, {fabricWidthCm: 150, maxCandidates: 50000})
assert.equal(study.ok, true, JSON.stringify(study.issues))
const layPolicy = () => ({
  ordersBySize: Object.fromEntries(sizes.map(size => [size, 4])),
  laysBySize: Object.fromEntries(sizes.map(size => [size, {
    main: {rollId: 'ROLL-A', plies: 2, markerRepeats: 2, endLossCmPerPly: 3},
  }])),
  rollsById: {'ROLL-A': {fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000}},
})
const shadePolicy = () => ({
  orderMaterialsByFabric: {main: {shadeId: 'BLACK', dyeLotId: 'LOT-7', maxPlyCount: 8}},
  rollProvenanceById: {'ROLL-A': {
    fabricId: 'main', shadeId: 'BLACK', dyeLotId: 'LOT-7',
    batchId: 'DISPOSABLE-A', maxPlyCount: 8,
  }},
})
const baseline = inspectLay(project, study, layPolicy())
assert.equal(baseline.ok, true, JSON.stringify(baseline.issues))
const maxLength = Math.max(...baseline.rows.map(row =>
  row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly))
const spreadingPolicy = () => ({
  spreadingTableById: {'TABLE-A': {
    grossTableLengthCm: maxLength + 10, headClampCm: 5, tailClampCm: 5,
    maxContinuousLayCm: maxLength, usableWidthCm: 150, maxPlyCount: 8,
  }},
  tableBySizeFabric: Object.fromEntries(sizes.map(size => [size, {main: 'TABLE-A'}])),
})
const stackPolicy = () => ({
  rollStackById: {'ROLL-A': {maxPlyThicknessMm: 1.2, interleafThicknessMm: 0.2}},
  equipmentStackById: {'TABLE-A': {
    maxLayStackHeightMm: 3, spreaderHeadClearanceMm: 3,
    clearanceReserveMm: 0.4,
  }},
})
const run = (p = stackPolicy(), l = layPolicy(), s = shadePolicy(),
  e = spreadingPolicy(), m = study, garment = project) =>
  inspectStack(garment, m, l, s, e, p)
const rejected = (result, code) => {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(issue => issue.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(result.physicalThicknessVerified, false)
}

test('all six nested and DXF-inspected sizes pass conservative 2-ply stack arithmetic without release', () => {
  const result = run()
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.length, 6)
  assert.equal(result.sizeCount, 6)
  for (const row of result.rows) {
    assert.equal(row.maxUncompressedStackHeightMm, 2.6)
    assert.equal(row.requiredClearanceMm, 3)
  }
  assert.equal(result.physicalThicknessVerified, false)
  assert.equal(result.calibratedEquipmentVerified, false)
  assert.equal(result.independentReceivingCadVerified, false)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(JSON.stringify(project), original)
})

test('machine stack height and spreader head clearance reject independently', () => {
  const height = stackPolicy()
  height.equipmentStackById['TABLE-A'].maxLayStackHeightMm = 2.99
  rejected(run(height), 'MAX_LAY_STACK_HEIGHT_EXCEEDED')
  const head = stackPolicy()
  head.equipmentStackById['TABLE-A'].spreaderHeadClearanceMm = 2.99
  rejected(run(head), 'SPREADER_HEAD_CLEARANCE_EXCEEDED')
})

test('interleaf thickness and safety reserve cannot be silently omitted', () => {
  const interleaf = stackPolicy()
  interleaf.rollStackById['ROLL-A'].interleafThicknessMm = 0.21
  rejected(run(interleaf), 'MAX_LAY_STACK_HEIGHT_EXCEEDED')
  const reserve = stackPolicy()
  reserve.equipmentStackById['TABLE-A'].clearanceReserveMm = 0.41
  rejected(run(reserve), 'MAX_LAY_STACK_HEIGHT_EXCEEDED')
})

test('headroom is evaluated for plies, not marker repeats or total roll consumption', () => {
  const result = run()
  assert.equal(result.ok, true)
  for (const row of result.rows) {
    assert.equal(row.plies, 2)
    assert.equal(row.requiredClearanceMm, 3)
  }
  // More garment yield through repeats does not increase the number of layers.
  const l = layPolicy()
  for (const size of sizes) {
    l.ordersBySize[size] = 6
    l.laysBySize[size].main.markerRepeats = 3
  }
  const e = spreadingPolicy()
  e.spreadingTableById['TABLE-A'].grossTableLengthCm *= 2
  e.spreadingTableById['TABLE-A'].maxContinuousLayCm *= 2
  const result2 = run(stackPolicy(), l, shadePolicy(), e)
  assert.equal(result2.ok, true, JSON.stringify(result2.issues))
  assert(result2.rows.every(row => row.requiredClearanceMm === 3))
})

test('single-ply lays require zero interleaf interfaces even when interleaf material is declared', () => {
  const l = layPolicy()
  for (const size of sizes) {
    l.laysBySize[size].main.plies = 1
    l.ordersBySize[size] = 2
  }
  const p = stackPolicy()
  p.rollStackById['ROLL-A'].interleafThicknessMm = 100
  p.equipmentStackById['TABLE-A'].maxLayStackHeightMm = 1.6
  p.equipmentStackById['TABLE-A'].spreaderHeadClearanceMm = 1.6
  const result = run(p, l)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert(result.rows.every(row => row.maxUncompressedStackHeightMm === 1.2))
})

test('same-fabric sizes assigned to distinct rolls must use each roll maximum thickness', () => {
  const l = layPolicy()
  l.rollsById['ROLL-B'] = structuredClone(l.rollsById['ROLL-A'])
  l.laysBySize.XXL.main.rollId = 'ROLL-B'
  const s = shadePolicy()
  s.rollProvenanceById['ROLL-B'] = {
    ...s.rollProvenanceById['ROLL-A'], batchId: 'DISPOSABLE-B',
  }
  const p = stackPolicy()
  rejected(run(p, l, s), 'INCOMPLETE_PLY_STACK_POLICY')
  p.rollStackById['ROLL-B'] = {maxPlyThicknessMm: 1.3, interleafThicknessMm: 0.2}
  rejected(run(p, l, s), 'MAX_LAY_STACK_HEIGHT_EXCEEDED')
  p.rollStackById['ROLL-B'].maxPlyThicknessMm = 1.2
  const result = run(p, l, s)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.find(row => row.size === 'XXL').rollId, 'ROLL-B')
})

test('separate table headroom is checked per assigned size, never inherited from another table', () => {
  const e = spreadingPolicy()
  e.spreadingTableById['TABLE-B'] = structuredClone(e.spreadingTableById['TABLE-A'])
  e.tableBySizeFabric.XXL.main = 'TABLE-B'
  const p = stackPolicy()
  rejected(run(p, layPolicy(), shadePolicy(), e), 'INCOMPLETE_PLY_STACK_POLICY')
  p.equipmentStackById['TABLE-B'] = {
    maxLayStackHeightMm: 3, spreaderHeadClearanceMm: 2.99,
    clearanceReserveMm: 0.4,
  }
  rejected(run(p, layPolicy(), shadePolicy(), e), 'SPREADER_HEAD_CLEARANCE_EXCEEDED')
  p.equipmentStackById['TABLE-B'].spreaderHeadClearanceMm = 3
  assert.equal(run(p, layPolicy(), shadePolicy(), e).ok, true)
})

test('missing, extra or wrong equipment and roll stack declarations block all-size inspection', () => {
  const missing = stackPolicy()
  delete missing.rollStackById['ROLL-A']
  rejected(run(missing), 'INCOMPLETE_PLY_STACK_POLICY')
  const extra = stackPolicy()
  extra.equipmentStackById.UNUSED = structuredClone(extra.equipmentStackById['TABLE-A'])
  rejected(run(extra), 'INCOMPLETE_PLY_STACK_POLICY')
  const wrong = stackPolicy()
  wrong.rollStackById.WRONG = wrong.rollStackById['ROLL-A']
  delete wrong.rollStackById['ROLL-A']
  rejected(run(wrong), 'INCOMPLETE_PLY_STACK_POLICY')
})

test('nonfinite, negative, zero and unexpected approval metadata fail closed', () => {
  const zero = stackPolicy()
  zero.rollStackById['ROLL-A'].maxPlyThicknessMm = 0
  rejected(run(zero), 'INVALID_ROLL_THICKNESS_DECLARATION')
  const negative = stackPolicy()
  negative.rollStackById['ROLL-A'].interleafThicknessMm = -0.1
  rejected(run(negative), 'INVALID_ROLL_THICKNESS_DECLARATION')
  const nan = stackPolicy()
  nan.equipmentStackById['TABLE-A'].spreaderHeadClearanceMm = NaN
  rejected(run(nan), 'INVALID_STACK_EQUIPMENT_DECLARATION')
  const claim = stackPolicy()
  claim.equipmentStackById['TABLE-A'].factoryApproved = true
  rejected(run(claim), 'INVALID_STACK_EQUIPMENT_DECLARATION')
})

test('numeric overflow cannot convert impossible stacks into passing geometry', () => {
  const p = stackPolicy()
  p.rollStackById['ROLL-A'].maxPlyThicknessMm = 1e308
  p.equipmentStackById['TABLE-A'].maxLayStackHeightMm = 1e308
  p.equipmentStackById['TABLE-A'].spreaderHeadClearanceMm = 1e308
  rejected(run(p), 'PLY_STACK_HEIGHT_OVERFLOW')
})

test('upstream shade and spreading-envelope failures cannot be bypassed', () => {
  const s = shadePolicy()
  s.rollProvenanceById['ROLL-A'].dyeLotId = 'WRONG'
  rejected(run(stackPolicy(), layPolicy(), s), 'SPREADING_ENVELOPE_PREREQUISITE_BLOCKED')
  const e = spreadingPolicy()
  e.spreadingTableById['TABLE-A'].maxContinuousLayCm = 1
  rejected(run(stackPolicy(), layPolicy(), shadePolicy(), e),
    'SPREADING_ENVELOPE_PREREQUISITE_BLOCKED')
})

test('binary floating point equality passes but 0.001 mm physical overrun fails', () => {
  const p = stackPolicy()
  p.rollStackById['ROLL-A'].maxPlyThicknessMm = 0.1
  p.rollStackById['ROLL-A'].interleafThicknessMm = 0.2
  p.equipmentStackById['TABLE-A'].clearanceReserveMm = 0.3
  p.equipmentStackById['TABLE-A'].maxLayStackHeightMm = 0.7
  p.equipmentStackById['TABLE-A'].spreaderHeadClearanceMm = 0.7
  assert.equal(run(p).ok, true)
  p.equipmentStackById['TABLE-A'].spreaderHeadClearanceMm -= 0.001
  rejected(run(p), 'SPREADER_HEAD_CLEARANCE_EXCEEDED')
})

test('two-fabric, six-size production requires separate roll thickness declarations', () => {
  const garment = structuredClone(project)
  garment.pieces[2].fabricId = 'lining'
  garment.pieces[3].fabricId = 'lining'
  const m = inspectMarker(garment, {fabricWidthCm: 150, maxCandidates: 50000})
  assert.equal(m.ok, true, JSON.stringify(m.issues))
  const l = layPolicy()
  for (const size of sizes)
    l.laysBySize[size].lining = {
      rollId: 'ROLL-LINING', plies: 2, markerRepeats: 2, endLossCmPerPly: 3,
    }
  l.rollsById['ROLL-LINING'] = {
    fabricId: 'lining', usableWidthCm: 150, availableLengthCm: 100000,
  }
  const s = shadePolicy()
  s.orderMaterialsByFabric.lining = {shadeId: 'BLACK', dyeLotId: 'LOT-7', maxPlyCount: 8}
  s.rollProvenanceById['ROLL-LINING'] = {
    fabricId: 'lining', shadeId: 'BLACK', dyeLotId: 'LOT-7',
    batchId: 'DISPOSABLE-LINING', maxPlyCount: 8,
  }
  const lays = inspectLay(garment, m, l)
  assert.equal(lays.ok, true, JSON.stringify(lays.issues))
  const e = spreadingPolicy()
  const length = Math.max(...lays.rows.map(row =>
    row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly))
  e.spreadingTableById['TABLE-A'].grossTableLengthCm = length + 10
  e.spreadingTableById['TABLE-A'].maxContinuousLayCm = length
  for (const size of sizes) e.tableBySizeFabric[size].lining = 'TABLE-A'
  const p = stackPolicy()
  rejected(run(p, l, s, e, m, garment), 'INCOMPLETE_PLY_STACK_POLICY')
  p.rollStackById['ROLL-LINING'] = {maxPlyThicknessMm: 0.8, interleafThicknessMm: 0}
  const result = run(p, l, s, e, m, garment)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.length, 12)
  assert.equal(result.fabricCount, 2)
  assert.equal(result.cuttingAuthorized, false)
})
