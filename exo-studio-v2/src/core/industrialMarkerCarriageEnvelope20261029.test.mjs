import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerCarriageEnvelope20261029 as inspectCarriage} from './industrialMarkerCarriageEnvelope20261029.mjs'

// Disposable EXO tee, all six graded sizes; real local nesting and DXF inspection.
// All roll/table/carriage specifications are synthetic, not factory measurements.
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
  rollsById: {'ROLL-A': {
    fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000,
  }},
})
const shadePolicy = () => ({
  orderMaterialsByFabric: {main: {shadeId: 'BLACK', dyeLotId: 'LOT-7', maxPlyCount: 8}},
  rollProvenanceById: {'ROLL-A': {
    fabricId: 'main', shadeId: 'BLACK', dyeLotId: 'LOT-7',
    batchId: 'DISPOSABLE-A', maxPlyCount: 8,
  }},
})
const lay = inspectLay(project, study, layPolicy())
assert.equal(lay.ok, true, JSON.stringify(lay.issues))
const maxLength = Math.max(...lay.rows.map(row =>
  row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly))
const spreadingPolicy = () => ({
  spreadingTableById: {'TABLE-A': {
    grossTableLengthCm: maxLength + 10, headClampCm: 5, tailClampCm: 5,
    maxContinuousLayCm: maxLength, usableWidthCm: 154, maxPlyCount: 8,
  }},
  tableBySizeFabric: Object.fromEntries(sizes.map(size => [size, {main: 'TABLE-A'}])),
})
const carriagePolicy = () => ({
  carriageByTableId: {'TABLE-A': {
    leftSideMarginCm: 2, rightSideMarginCm: 2, carriageUsableWidthCm: 154,
    maxCarriageTravelCm: maxLength + 8,
    headTravelOverrunCm: 4, tailTravelOverrunCm: 4,
  }},
})
const run = (c = carriagePolicy(), e = spreadingPolicy(),
  l = layPolicy(), s = shadePolicy(), m = study, garment = project) =>
  inspectCarriage(garment, m, l, s, e, c)
const rejected = (result, code) => {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(issue => issue.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(result.physicalMachineVerified, false)
}

test('all six nested DXF-inspected sizes pass declared carriage bounds, without CUT authorization', () => {
  const result = run()
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.length, 6)
  assert.equal(result.sizeCount, 6)
  assert(result.rows.every(row => row.requiredWidthCm === 154))
  assert(result.rows.every(row => row.requiredTravelCm <= maxLength + 8))
  assert.equal(result.physicalMachineVerified, false)
  assert.equal(result.independentReceivingCadVerified, false)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(JSON.stringify(project), original)
})

test('positive side margins cannot be hidden by otherwise sufficient marker fabric width', () => {
  const e = spreadingPolicy()
  e.spreadingTableById['TABLE-A'].usableWidthCm = 153.99
  rejected(run(carriagePolicy(), e), 'CARRIAGE_TABLE_SIDE_CLEARANCE_EXCEEDED')
  const c = carriagePolicy()
  c.carriageByTableId['TABLE-A'].carriageUsableWidthCm = 153.99
  rejected(run(c), 'CARRIAGE_USABLE_WIDTH_EXCEEDED')
})

test('head/tail carriage overshoot is independent of roll end loss and table clamps', () => {
  const c = carriagePolicy()
  c.carriageByTableId['TABLE-A'].maxCarriageTravelCm = maxLength + 7.99
  rejected(run(c), 'CARRIAGE_TRAVEL_EXCEEDED')
  const result = run()
  assert.equal(result.ok, true)
  assert(result.rows.every(row => row.requiredTravelCm - row.requiredLayLengthCm === 8))
})

test('zero margins and zero overshoot are allowed only when explicitly declared', () => {
  const c = carriagePolicy()
  Object.assign(c.carriageByTableId['TABLE-A'], {
    leftSideMarginCm: 0, rightSideMarginCm: 0,
    headTravelOverrunCm: 0, tailTravelOverrunCm: 0,
    carriageUsableWidthCm: 150, maxCarriageTravelCm: maxLength,
  })
  const result = run(c)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert(result.rows.every(row => row.requiredWidthCm === 150))
})

test('missing, extra and unassigned carriage machine IDs fail closed', () => {
  const missing = carriagePolicy()
  delete missing.carriageByTableId['TABLE-A']
  rejected(run(missing), 'INCOMPLETE_CARRIAGE_POLICY')
  const extra = carriagePolicy()
  extra.carriageByTableId.UNUSED = structuredClone(extra.carriageByTableId['TABLE-A'])
  rejected(run(extra), 'INCOMPLETE_CARRIAGE_POLICY')
  const e = spreadingPolicy()
  e.spreadingTableById['TABLE-B'] = structuredClone(e.spreadingTableById['TABLE-A'])
  e.tableBySizeFabric.XXL.main = 'TABLE-B'
  rejected(run(carriagePolicy(), e), 'INCOMPLETE_CARRIAGE_POLICY')
})

test('separate tables enforce their own carriage travel and margins', () => {
  const e = spreadingPolicy()
  e.spreadingTableById['TABLE-B'] = structuredClone(e.spreadingTableById['TABLE-A'])
  e.tableBySizeFabric.XXL.main = 'TABLE-B'
  const c = carriagePolicy()
  c.carriageByTableId['TABLE-B'] = structuredClone(c.carriageByTableId['TABLE-A'])
  c.carriageByTableId['TABLE-B'].maxCarriageTravelCm = 1
  rejected(run(c, e), 'CARRIAGE_TRAVEL_EXCEEDED')
  c.carriageByTableId['TABLE-B'].maxCarriageTravelCm = maxLength + 8
  c.carriageByTableId['TABLE-B'].carriageUsableWidthCm = 153.999
  rejected(run(c, e), 'CARRIAGE_USABLE_WIDTH_EXCEEDED')
  c.carriageByTableId['TABLE-B'].carriageUsableWidthCm = 154
  assert.equal(run(c, e).ok, true)
})

test('two fabrics across six sizes require separate per-table carriage clearances', () => {
  const garment = structuredClone(project)
  garment.pieces[2].fabricId = 'lining'
  garment.pieces[3].fabricId = 'lining'
  const m = inspectMarker(garment, {fabricWidthCm: 150, maxCandidates: 50000})
  assert.equal(m.ok, true, JSON.stringify(m.issues))
  const l = layPolicy()
  l.rollsById['ROLL-L'] = {
    fabricId: 'lining', usableWidthCm: 150, availableLengthCm: 100000,
  }
  for (const size of sizes)
    l.laysBySize[size].lining = {
      rollId: 'ROLL-L', plies: 2, markerRepeats: 2, endLossCmPerPly: 3,
    }
  const s = shadePolicy()
  s.orderMaterialsByFabric.lining = {
    shadeId: 'BLACK', dyeLotId: 'LOT-7', maxPlyCount: 8,
  }
  s.rollProvenanceById['ROLL-L'] = {
    fabricId: 'lining', shadeId: 'BLACK', dyeLotId: 'LOT-7',
    batchId: 'DISPOSABLE-L', maxPlyCount: 8,
  }
  const demand = inspectLay(garment, m, l)
  assert.equal(demand.ok, true, JSON.stringify(demand.issues))
  const length = Math.max(...demand.rows.map(row =>
    row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly))
  const e = spreadingPolicy()
  e.spreadingTableById['TABLE-A'].grossTableLengthCm = length + 10
  e.spreadingTableById['TABLE-A'].maxContinuousLayCm = length
  e.spreadingTableById['TABLE-B'] = structuredClone(e.spreadingTableById['TABLE-A'])
  for (const size of sizes) e.tableBySizeFabric[size].lining = 'TABLE-B'
  const c = carriagePolicy()
  c.carriageByTableId['TABLE-A'].maxCarriageTravelCm = length + 8
  c.carriageByTableId['TABLE-B'] = structuredClone(c.carriageByTableId['TABLE-A'])
  c.carriageByTableId['TABLE-B'].carriageUsableWidthCm = 153.999
  rejected(run(c, e, l, s, m, garment), 'CARRIAGE_USABLE_WIDTH_EXCEEDED')
  c.carriageByTableId['TABLE-B'].carriageUsableWidthCm = 154
  const result = run(c, e, l, s, m, garment)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.length, 12)
  assert.equal(result.fabricCount, 2)
  assert.equal(result.cuttingAuthorized, false)
})

test('invalid, nonfinite and self-declared approval fields cannot pass', () => {
  const nan = carriagePolicy()
  nan.carriageByTableId['TABLE-A'].headTravelOverrunCm = NaN
  rejected(run(nan), 'INVALID_CARRIAGE_DECLARATION')
  const negative = carriagePolicy()
  negative.carriageByTableId['TABLE-A'].leftSideMarginCm = -1
  rejected(run(negative), 'INVALID_CARRIAGE_DECLARATION')
  const claim = carriagePolicy()
  claim.carriageByTableId['TABLE-A'].factoryApproved = true
  rejected(run(claim), 'INVALID_CARRIAGE_DECLARATION')
})

test('computed overflow cannot silently pass travel or width', () => {
  const c = carriagePolicy()
  c.carriageByTableId['TABLE-A'].leftSideMarginCm = 1e308
  c.carriageByTableId['TABLE-A'].rightSideMarginCm = 1e308
  rejected(run(c), 'CARRIAGE_ENVELOPE_OVERFLOW')
  const d = carriagePolicy()
  d.carriageByTableId['TABLE-A'].headTravelOverrunCm = 1e308
  d.carriageByTableId['TABLE-A'].tailTravelOverrunCm = 1e308
  rejected(run(d), 'CARRIAGE_ENVELOPE_OVERFLOW')
})

test('upstream dye-lot and spreading-table failures remain mandatory', () => {
  const s = shadePolicy()
  s.rollProvenanceById['ROLL-A'].dyeLotId = 'WRONG'
  rejected(run(carriagePolicy(), spreadingPolicy(), layPolicy(), s),
    'SPREADING_ENVELOPE_PREREQUISITE_BLOCKED')
  const e = spreadingPolicy()
  e.spreadingTableById['TABLE-A'].maxContinuousLayCm = 1
  rejected(run(carriagePolicy(), e), 'SPREADING_ENVELOPE_PREREQUISITE_BLOCKED')
})
