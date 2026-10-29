import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerShadeLotGuard20261028 as inspectShade} from './industrialMarkerShadeLotGuard20261028.mjs'
import {inspectIndustrialMarkerRollDefectPlan20261028 as inspectDefects} from './industrialMarkerRollDefectPlan20261028.mjs'

// Disposable six-size EXO tee; actual polygon nesting / DXF CUT study.
// Roll defects and inventory below are synthetic declarations, NOT physical receipts.
const project = createTeeTemplate()
for (const piece of project.pieces) {
  piece.notches = []
  piece.internalLines = []
  piece.buttonholes = []
  piece.marker = {nap: 'one-way', allowCrossGrain: false}
  piece.grainAngleDeg = 0
}
const unchanged = JSON.stringify(project)
const study = inspectMarker(project, {fabricWidthCm: 150, maxCandidates: 50000})
assert.equal(study.ok, true, JSON.stringify(study.issues))
const clone = x => structuredClone(x)
const sizes = project.grading.sizes
const layPolicy = () => ({
  ordersBySize: Object.fromEntries(sizes.map(size => [size, 4])),
  laysBySize: Object.fromEntries(sizes.map((size, index) => [size, {
    main: {rollId: index < 3 ? 'ROLL-A' : 'ROLL-B',
      plies: 2, markerRepeats: 2, endLossCmPerPly: 3},
  }])),
  rollsById: {
    'ROLL-A': {fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000},
    'ROLL-B': {fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000},
  },
})
const shadePolicy = () => ({
  orderMaterialsByFabric: {main: {
    shadeId: 'BLACK', dyeLotId: 'LOT-7', maxPlyCount: 8,
  }},
  rollProvenanceById: Object.fromEntries(['ROLL-A', 'ROLL-B'].map(id => [id, {
    fabricId: 'main', shadeId: 'BLACK', dyeLotId: 'LOT-7',
    batchId: id, maxPlyCount: 8,
  }])),
})
const lay = inspectLay(project, study, layPolicy())
assert.equal(lay.ok, true, JSON.stringify(lay.issues))
assert.equal(inspectShade(project, study, layPolicy(), shadePolicy()).ok, true)
function plan() {
  const result = {
    'ROLL-A': {defects: [], plySegments: []},
    'ROLL-B': {defects: [], plySegments: []},
  }
  const offsets = {'ROLL-A': 0, 'ROLL-B': 0}
  for (const row of lay.rows) {
    const length = row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly
    for (let plyIndex = 0; plyIndex < row.plies; plyIndex++) {
      const startCm = offsets[row.rollId]
      result[row.rollId].plySegments.push({
        size: row.size, fabricId: row.fabricId, plyIndex,
        startCm, endCm: startCm + length,
      })
      offsets[row.rollId] += length
    }
  }
  return result
}
const run = (p, l = layPolicy(), s = shadePolicy()) =>
  inspectDefects(project, study, l, s, {rollPlanById: p})
const blocked = (r, code) => {
  assert.equal(r.ok, false, JSON.stringify(r))
  assert(r.issues.some(i => i.code === code), JSON.stringify(r.issues))
  assert.equal(r.cuttingAuthorized, false)
  assert.equal(r.factoryApproved, false)
}

test('real six-size marker: complete roll-ply positions pass as digital inspection only', () => {
  const result = run(plan())
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rolls.length, 2)
  assert.equal(result.rolls.reduce((n, r) => n + r.plySegmentCount, 0), 12)
  assert.equal(result.sizeCount, 6)
  assert.equal(result.physicalRollVerified, false)
  assert.equal(result.independentReceivingCadVerified, false)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(JSON.stringify(project), unchanged)
})

test('legacy lay and shade inspections accept a roll defect crossing a ply; new guard blocks', () => {
  const p = plan()
  const first = p['ROLL-A'].plySegments[0]
  p['ROLL-A'].defects = [{startCm: first.startCm + 2, endCm: first.startCm + 4}]
  assert.equal(inspectLay(project, study, layPolicy()).ok, true)
  assert.equal(inspectShade(project, study, layPolicy(), shadePolicy()).ok, true)
  blocked(run(p), 'ROLL_PLY_INTERSECTS_DECLARED_DEFECT')
})

test('an explicit unused defect gap between two plies is inspectable', () => {
  const p = plan()
  const segments = p['ROLL-A'].plySegments
  const gapStart = segments[0].endCm
  for (let i = 1; i < segments.length; i++) {
    segments[i].startCm += 10
    segments[i].endCm += 10
  }
  p['ROLL-A'].defects = [{startCm: gapStart + 2, endCm: gapStart + 8}]
  const result = run(p)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rolls[0].defectCount, 1)
})

test('a ply touching a defect boundary is not silently treated as clear', () => {
  const p = plan()
  const edge = p['ROLL-A'].plySegments[0].endCm
  p['ROLL-A'].defects = [{startCm: edge, endCm: edge + 1}]
  blocked(run(p), 'ROLL_PLY_INTERSECTS_DECLARED_DEFECT')
})

test('a shortened or extended declared ply cannot hide consumption drift', () => {
  const short = plan()
  short['ROLL-A'].plySegments[0].endCm -= 0.1
  blocked(run(short), 'ROLL_PLY_LENGTH_DRIFT')
  const long = plan()
  long['ROLL-A'].plySegments[0].endCm += 0.1
  blocked(run(long), 'ROLL_PLY_LENGTH_DRIFT')
})

test('missing, duplicate and wrong-roll ply identities fail closed', () => {
  const missing = plan()
  missing['ROLL-B'].plySegments.pop()
  blocked(run(missing), 'MISSING_ROLL_PLY_SEGMENT')
  const duplicate = plan()
  duplicate['ROLL-A'].plySegments.push(clone(duplicate['ROLL-A'].plySegments[0]))
  blocked(run(duplicate), 'UNEXPECTED_OR_DUPLICATE_ROLL_PLY')
  const swapped = plan()
  swapped['ROLL-A'].plySegments[0].size = 'XXL'
  blocked(run(swapped), 'UNEXPECTED_OR_DUPLICATE_ROLL_PLY')
})

test('overlapping lay intervals are rejected even when roll length is sufficient', () => {
  const p = plan()
  p['ROLL-A'].plySegments[1].startCm -= 1
  p['ROLL-A'].plySegments[1].endCm -= 1
  blocked(run(p), 'ROLL_PLY_SEGMENTS_OVERLAP')
  const tiny = plan()
  tiny['ROLL-A'].plySegments[1].startCm -= 1e-7
  tiny['ROLL-A'].plySegments[1].endCm -= 1e-7
  blocked(run(tiny), 'ROLL_PLY_SEGMENTS_OVERLAP')
})

test('invalid, overlapping, out-of-roll and nonfinite defect intervals are blocked', () => {
  const invalid = plan()
  invalid['ROLL-A'].defects = [{startCm: NaN, endCm: 5}]
  blocked(run(invalid), 'INVALID_ROLL_DEFECT_INTERVAL')
  const outside = plan()
  outside['ROLL-A'].defects = [{startCm: 99999, endCm: 100001}]
  blocked(run(outside), 'INVALID_ROLL_DEFECT_INTERVAL')
  const overlapping = plan()
  overlapping['ROLL-A'].defects = [
    {startCm: 50000, endCm: 50010}, {startCm: 50009, endCm: 50020},
  ]
  blocked(run(overlapping), 'OVERLAPPING_ROLL_DEFECT_INTERVALS')
  const tinyOverlap = plan()
  tinyOverlap['ROLL-A'].defects = [
    {startCm: 50000, endCm: 50010},
    {startCm: 50010 - 1e-7, endCm: 50020},
  ]
  blocked(run(tinyOverlap), 'OVERLAPPING_ROLL_DEFECT_INTERVALS')
  const tinyOverrun = plan()
  const segment = tinyOverrun['ROLL-A'].plySegments[0]
  const length = segment.endCm - segment.startCm
  segment.startCm = 100000 - length + 1e-7
  segment.endCm = 100000 + 1e-7
  blocked(run(tinyOverrun), 'INVALID_ROLL_PLY_SEGMENT')
})

test('missing or extra roll plan and upstream shade mismatch are blockers', () => {
  const missing = plan()
  delete missing['ROLL-B']
  blocked(run(missing), 'INCOMPLETE_ROLL_DEFECT_PLAN')
  const extra = plan()
  extra['ROLL-C'] = {defects: [], plySegments: []}
  blocked(run(extra), 'INCOMPLETE_ROLL_DEFECT_PLAN')
  const shade = shadePolicy()
  shade.rollProvenanceById['ROLL-B'].dyeLotId = 'WRONG'
  blocked(run(plan(), layPolicy(), shade), 'SHADE_LOT_PREREQUISITE_BLOCKED')
})
