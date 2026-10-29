import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerSpreadEnvelope20261029 as inspectSpread} from './industrialMarkerSpreadEnvelope20261029.mjs'

// Disposable EXO six-size tee. Geometry is actually nested and DXF-checked;
// spreading tables and physical equipment are synthetic, not factory receipts.
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
assert.equal(study.ok, true, JSON.stringify(study.issues))
const sizes = project.grading.sizes
const copy = structuredClone
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
    batchId: 'SYNTHETIC-ROLL-A', maxPlyCount: 8,
  }},
})
const baseline = inspectLay(project, study, layPolicy())
assert.equal(baseline.ok, true, JSON.stringify(baseline.issues))
const maxRequired = Math.max(...baseline.rows.map(row =>
  row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly))
const equipment = () => ({
  spreadingTableById: {'TABLE-TEST': {
    grossTableLengthCm: maxRequired + 10, headClampCm: 5, tailClampCm: 5,
    maxContinuousLayCm: maxRequired, usableWidthCm: 150, maxPlyCount: 2,
  }},
  tableBySizeFabric: Object.fromEntries(sizes.map(size => [size, {main: 'TABLE-TEST'}])),
})
const run = (e = equipment(), l = layPolicy(), s = shadePolicy(), m = study) =>
  inspectSpread(project, m, l, s, e)
const rejected = (result, code) => {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(i => i.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(result.physicalTableVerified, false)
}

test('six-size DXF marker lays fit exactly, but no physical cutting or factory approval follows', () => {
  const result = run()
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.length, 6)
  assert.equal(result.sizeCount, 6)
  assert.equal(result.physicalTableVerified, false)
  assert.equal(result.physicalLayVerified, false)
  assert.equal(result.independentReceivingCadVerified, false)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(JSON.stringify(project), original)
})

test('table occupancy is per contiguous ply, not total roll consumption across plies', () => {
  const result = run()
  assert.equal(result.ok, true)
  for (const row of result.rows) {
    assert.equal(row.requiredLayLengthCm,
      row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly)
    assert.equal(row.estimatedRollConsumptionCm, row.plies * row.requiredLayLengthCm)
    assert(row.requiredLayLengthCm <= row.usableTableLengthCm)
  }
})

test('one centimeter of head clamp cannot be borrowed as usable table length', () => {
  const e = equipment()
  e.spreadingTableById['TABLE-TEST'].headClampCm += 1
  assert.equal(inspectLay(project, study, layPolicy()).ok, true)
  rejected(run(e), 'SPREADING_TABLE_USABLE_LENGTH_EXCEEDED')
})

test('tail clamp alone reduces usable length, and combined clamp zones cannot consume the table', () => {
  const tail = equipment()
  tail.spreadingTableById['TABLE-TEST'].tailClampCm += 0.01
  rejected(run(tail), 'SPREADING_TABLE_USABLE_LENGTH_EXCEEDED')
  const combined = equipment()
  combined.spreadingTableById['TABLE-TEST'].headClampCm =
    combined.spreadingTableById['TABLE-TEST'].grossTableLengthCm / 2
  combined.spreadingTableById['TABLE-TEST'].tailClampCm =
    combined.spreadingTableById['TABLE-TEST'].grossTableLengthCm / 2
  rejected(run(combined), 'INVALID_SPREADING_TABLE_CLAMP_ZONES')
})

test('binary rounding at an exact declared table boundary is not a false overrun', () => {
  const e = equipment()
  e.spreadingTableById['TABLE-TEST'].grossTableLengthCm = maxRequired + 0.1 + 0.2
  e.spreadingTableById['TABLE-TEST'].headClampCm = 0.1
  e.spreadingTableById['TABLE-TEST'].tailClampCm = 0.2
  assert.equal(run(e).ok, true)
  e.spreadingTableById['TABLE-TEST'].grossTableLengthCm -= 0.00001
  rejected(run(e), 'SPREADING_TABLE_USABLE_LENGTH_EXCEEDED')
})

test('sub-centimeter table overrun and machine continuous-lay limit fail independently', () => {
  const table = equipment()
  table.spreadingTableById['TABLE-TEST'].grossTableLengthCm -= 0.01
  rejected(run(table), 'SPREADING_TABLE_USABLE_LENGTH_EXCEEDED')
  const machine = equipment()
  machine.spreadingTableById['TABLE-TEST'].maxContinuousLayCm -= 0.01
  rejected(run(machine), 'SPREADING_MACHINE_CONTINUOUS_LAY_EXCEEDED')
})

test('a narrower physical table and exceeded equipment ply capacity are rejected', () => {
  const width = equipment()
  width.spreadingTableById['TABLE-TEST'].usableWidthCm = 149.99
  rejected(run(width), 'SPREADING_TABLE_WIDTH_EXCEEDED')
  const plies = equipment()
  plies.spreadingTableById['TABLE-TEST'].maxPlyCount = 1
  rejected(run(plies), 'SPREADING_TABLE_PLY_LIMIT_EXCEEDED')
})

test('missing, extra, unknown and unused equipment assignments are rejected', () => {
  const missing = equipment()
  delete missing.tableBySizeFabric.XXL
  rejected(run(missing), 'INCOMPLETE_SPREADING_ENVELOPE_POLICY')
  const extra = equipment()
  extra.tableBySizeFabric.XS.lining = 'TABLE-TEST'
  rejected(run(extra), 'INCOMPLETE_SPREADING_TABLE_ASSIGNMENTS')
  const unknown = equipment()
  unknown.tableBySizeFabric.M.main = 'UNKNOWN'
  rejected(run(unknown), 'UNKNOWN_SPREADING_TABLE_ASSIGNMENT')
  const unused = equipment()
  unused.spreadingTableById['UNUSED'] = copy(unused.spreadingTableById['TABLE-TEST'])
  rejected(run(unused), 'UNUSED_SPREADING_TABLE_DECLARATION')
})

test('negative, nonfinite, malformed or consuming clamp zones fail closed', () => {
  const negative = equipment()
  negative.spreadingTableById['TABLE-TEST'].headClampCm = -1
  rejected(run(negative), 'INVALID_SPREADING_TABLE_DECLARATION')
  const nan = equipment()
  nan.spreadingTableById['TABLE-TEST'].maxContinuousLayCm = NaN
  rejected(run(nan), 'INVALID_SPREADING_TABLE_DECLARATION')
  const consuming = equipment()
  consuming.spreadingTableById['TABLE-TEST'].headClampCm = maxRequired + 10
  rejected(run(consuming), 'INVALID_SPREADING_TABLE_CLAMP_ZONES')
  const extra = equipment()
  extra.spreadingTableById['TABLE-TEST'].approved = true
  rejected(run(extra), 'INVALID_SPREADING_TABLE_DECLARATION')
})

test('upstream shade mismatch and manipulated marker geometry cannot be bypassed', () => {
  const badShade = shadePolicy()
  badShade.rollProvenanceById['ROLL-A'].dyeLotId = 'WRONG'
  rejected(run(equipment(), layPolicy(), badShade), 'SHADE_LOT_PREREQUISITE_BLOCKED')
  const manipulated = copy(study)
  manipulated.rows[0].marker.metrics.length = 1
  rejected(run(equipment(), layPolicy(), shadePolicy(), manipulated),
    'SHADE_LOT_PREREQUISITE_BLOCKED')
})

test('machine limit can be tighter than table length without multiplying by number of plies', () => {
  const e = equipment()
  e.spreadingTableById['TABLE-TEST'].grossTableLengthCm = maxRequired * 3
  e.spreadingTableById['TABLE-TEST'].maxContinuousLayCm = maxRequired - 0.5
  rejected(run(e), 'SPREADING_MACHINE_CONTINUOUS_LAY_EXCEEDED')
  e.spreadingTableById['TABLE-TEST'].maxContinuousLayCm = maxRequired
  assert.equal(run(e).ok, true)
})

test('two-fabric graded garment requires an explicit table for all 12 size/fabric lays', () => {
  const twoFabric = copy(project)
  twoFabric.pieces[2].fabricId = 'lining'
  twoFabric.pieces[3].fabricId = 'lining'
  const twoStudy = inspectMarker(twoFabric, {fabricWidthCm: 150, maxCandidates: 50000})
  assert.equal(twoStudy.ok, true, JSON.stringify(twoStudy.issues))
  const l = layPolicy()
  for (const size of sizes)
    l.laysBySize[size].lining = {
      rollId: 'LINING-ROLL', plies: 2, markerRepeats: 2, endLossCmPerPly: 3,
    }
  l.rollsById['LINING-ROLL'] = {
    fabricId: 'lining', usableWidthCm: 150, availableLengthCm: 100000,
  }
  const s = shadePolicy()
  s.orderMaterialsByFabric.lining = {
    shadeId: 'BLACK', dyeLotId: 'LOT-7', maxPlyCount: 8,
  }
  s.rollProvenanceById['LINING-ROLL'] = {
    fabricId: 'lining', shadeId: 'BLACK', dyeLotId: 'LOT-7',
    batchId: 'SYNTHETIC-LINING', maxPlyCount: 8,
  }
  const twoLay = inspectLay(twoFabric, twoStudy, l)
  assert.equal(twoLay.ok, true, JSON.stringify(twoLay.issues))
  const required = Math.max(...twoLay.rows.map(row =>
    row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly))
  const e = equipment()
  e.spreadingTableById['TABLE-TEST'].grossTableLengthCm = required + 10
  e.spreadingTableById['TABLE-TEST'].maxContinuousLayCm = required
  e.spreadingTableById['TABLE-LINING'] = copy(e.spreadingTableById['TABLE-TEST'])
  for (const size of sizes) e.tableBySizeFabric[size].lining = 'TABLE-LINING'
  const valid = inspectSpread(twoFabric, twoStudy, l, s, e)
  assert.equal(valid.ok, true, JSON.stringify(valid.issues))
  assert.equal(valid.rows.length, 12)
  assert.equal(valid.fabricCount, 2)
  assert.equal(valid.cuttingAuthorized, false)
  delete e.tableBySizeFabric.XL.lining
  rejected(inspectSpread(twoFabric, twoStudy, l, s, e),
    'INCOMPLETE_SPREADING_TABLE_ASSIGNMENTS')
})
