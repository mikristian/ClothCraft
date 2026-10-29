import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialCutroomUnifiedPreflight20261029 as preflight} from './industrialCutroomUnifiedPreflight20261029.mjs'
import {inspectIndustrialManualMarkerStudy20261029 as inspectManualMarker} from './industrialManualMarkerStudy20261029.mjs'
import {planIndustrialCutroomRollSegments20261029 as planRollSegments} from './industrialCutroomRollSegmentPlanner20261029.mjs'

// Disposable six-size garment; real local EXO nesting and DXF CUT inspection.
// Roll defects, machine limits, orders and material properties are synthetic.
const garment = createTeeTemplate()
for (const piece of garment.pieces) {
  piece.notches = []
  piece.internalLines = []
  piece.buttonholes = []
  piece.marker = {nap: 'one-way', allowCrossGrain: false}
  piece.grainAngleDeg = 0
}
const original = JSON.stringify(garment)
const sizes = garment.grading.sizes
const marker = inspectMarker(garment, {fabricWidthCm: 150, maxCandidates: 50000})
assert.equal(marker.ok, true, JSON.stringify(marker.issues))
const lay = {
  ordersBySize: Object.fromEntries(sizes.map(size => [size, 4])),
  laysBySize: Object.fromEntries(sizes.map(size => [size, {
    main: {rollId: 'ROLL-A', plies: 2, markerRepeats: 2, endLossCmPerPly: 3},
  }])),
  rollsById: {'ROLL-A': {fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000}},
}
const shade = {
  orderMaterialsByFabric: {main: {shadeId: 'BLACK', dyeLotId: 'LOT-7', maxPlyCount: 8}},
  rollProvenanceById: {'ROLL-A': {fabricId: 'main', shadeId: 'BLACK',
    dyeLotId: 'LOT-7', batchId: 'SYNTHETIC-ROLL', maxPlyCount: 8}},
}
const demand = inspectLay(garment, marker, lay)
assert.equal(demand.ok, true, JSON.stringify(demand.issues))
const maxLength = Math.max(...demand.rows.map(row =>
  row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly))
const makePolicies = () => {
  const segments = []
  let offset = 0
  for (const row of demand.rows) {
    const length = row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly
    for (let plyIndex = 0; plyIndex < row.plies; plyIndex++) {
      segments.push({size: row.size, fabricId: row.fabricId, plyIndex,
        startCm: offset, endCm: offset + length})
      offset += length
    }
  }
  return {
    rollPlanById: {'ROLL-A': {defects: [], plySegments: segments}},
    spreadingPolicy: {
      spreadingTableById: {'TABLE-A': {
        grossTableLengthCm: maxLength + 10, headClampCm: 5, tailClampCm: 5,
        maxContinuousLayCm: maxLength, usableWidthCm: 154, maxPlyCount: 8,
      }},
      tableBySizeFabric: Object.fromEntries(sizes.map(size => [size, {main: 'TABLE-A'}])),
    },
    stackPolicy: {
      rollStackById: {'ROLL-A': {maxPlyThicknessMm: 1.2, interleafThicknessMm: 0.2}},
      equipmentStackById: {'TABLE-A': {maxLayStackHeightMm: 3,
        spreaderHeadClearanceMm: 3, clearanceReserveMm: 0.4}},
    },
    carriagePolicy: {carriageByTableId: {'TABLE-A': {
      leftSideMarginCm: 2, rightSideMarginCm: 2,
      carriageUsableWidthCm: 154, maxCarriageTravelCm: maxLength + 8,
      headTravelOverrunCm: 4, tailTravelOverrunCm: 4,
    }}},
  }
}
const run = (policies = makePolicies(), sourceLay = lay, sourceShade = shade) =>
  preflight(garment, marker, sourceLay, sourceShade, policies)
const blocked = (result, stage, nestedCode) => {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert.equal(result.allSizeDigitalPreflightInspected, false)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  if (stage) assert.equal(result.stage, stage)
  if (nestedCode) assert.match(JSON.stringify(result.issues), new RegExp(nestedCode))
}

test('six-size local DXF marker passes unified declared CUT inspection, never factory authorization', () => {
  const result = run()
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.length, 6)
  assert.equal(result.sizeCount, 6)
  assert.equal(result.rollCount, 1)
  assert(result.rows.every(row => row.rollId === 'ROLL-A' && row.tableId === 'TABLE-A'))
  assert(result.rows.every(row => row.requiredStackClearanceMm === 3))
  assert.equal(result.physicalRollVerified, false)
  assert.equal(result.calibratedEquipmentVerified, false)
  assert.equal(result.independentReceivingCadVerified, false)
  assert.equal(result.markerSourceRevisionMatched, true)
  assert.equal(result.markerStudySourceDerivedMatch, true)
  assert.match(result.sourceProjectSha256, /^[a-f0-9]{64}$/)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(JSON.stringify(garment), original)
})

test('same-source forged or stale marker placement cannot pass merely by copying the source fingerprint', () => {
  const changes = [
    study => { study.rows[0].marker.placements[0].x += 0.5 },
    study => { study.rows[0].marker.placements[0].outline[0].x += 0.5 },
    study => {
      study.rows[0].marker.metrics.length += 0.5
      study.rows[0].marker.placements[0].y += 0.5
    },
    study => { study.rows[0].cutterStudy.ok = false },
    study => { study.rows[0].markTransfer.ok = false },
    study => { study.markerBuildOptions.fabricWidthCm = 149 },
    study => { study.markerBuildOptions.spacingCm += 0.25 },
  ]
  for (const alter of changes) {
    const forged = structuredClone(marker)
    alter(forged)
    assert.equal(forged.sourceProjectSha256, marker.sourceProjectSha256)
    blocked(preflight(garment, forged, lay, shade, makePolicies()), null,
      'MARKER_CONTENT_OR_OPTIONS_UNBOUND')
  }
  assert.equal(run().ok, true)
})

test('legacy unbound studies, fabricated builder receipts and externally supplied wire contexts block', () => {
  const missing = structuredClone(marker)
  delete missing.markerBuildOptions
  blocked(preflight(garment, missing, lay, shade, makePolicies()), null,
    'MARKER_CONTENT_OR_OPTIONS_UNBOUND')
  const untrustedDxf = structuredClone(marker)
  untrustedDxf.markerBuildOptions.usesSuppliedDxf = true
  blocked(preflight(garment, untrustedDxf, lay, shade, makePolicies()), null,
    'MARKER_CONTENT_OR_OPTIONS_UNBOUND')
  const invalid = structuredClone(marker)
  invalid.markerBuildOptions.constrainedLayout = {foldEdge: null, defectZonesByFabric: {main: [NaN]}}
  blocked(preflight(garment, invalid, lay, shade, makePolicies()), null,
    'MARKER_CONTENT_OR_OPTIONS_UNBOUND')
})

test('invalid non-JSON and throwing constrained-layout inputs fail closed without exceptions', () => {
  const invalid = {foldEdge: null, defectZonesByFabric: {main: []}, callback: () => true}
  const rejected = inspectMarker(garment, {constrainedLayout: invalid})
  assert.equal(rejected.ok, false)
  assert.match(JSON.stringify(rejected.issues), /INVALID_CONSTRAINED_LAYOUT/)
  const throwing = {foldEdge: null, get defectZonesByFabric() {throw Error('bad getter')}}
  const refused = inspectMarker(garment, {constrainedLayout: throwing})
  assert.equal(refused.ok, false)
  assert.match(JSON.stringify(refused.issues), /INVALID_CONSTRAINED_LAYOUT/)
})

test('a point edit after nesting blocks all-size CUT inspection even if old marker still fits', () => {
  const changed = structuredClone(garment)
  changed.pieces[0].points[0].x += 0.125
  blocked(preflight(changed, marker, lay, shade, makePolicies()), null,
    'STALE_OR_UNBOUND_MARKER_SOURCE_GEOMETRY')
  assert.equal(run().ok, true)
})

test('grading, allowance and notch revisions invalidate all six old marker rows', () => {
  for (const revise of [
    source => { source.grading.widthPerSizeCm += 0.25 },
    source => { source.pieces[0].seamAllowance += 0.1 },
    source => { source.pieces[0].notches.push({edgeIndex: 0, t: 0.4, depthCm: 0.3}) },
    source => { source.pieces[0].fabricId = 'lining' },
    source => { source.pieces[0].grainAngleDeg += 5 },
    source => { source.markerSettings.gapCm = 2 },
  ]) {
    const changed = structuredClone(garment)
    revise(changed)
    blocked(preflight(changed, marker, lay, shade, makePolicies()), null,
      'STALE_OR_UNBOUND_MARKER_SOURCE_GEOMETRY')
  }
})

test('freshly regenerated six-size marker is accepted for an unchanged lay geometry', () => {
  const revised = structuredClone(garment)
  revised.name = 'disposable-fresh-revision'
  const regenerated = inspectMarker(revised, {fabricWidthCm: 150, maxCandidates: 50000})
  assert.equal(regenerated.ok, true, JSON.stringify(regenerated.issues))
  blocked(preflight(revised, marker, lay, shade, makePolicies()), null,
    'STALE_OR_UNBOUND_MARKER_SOURCE_GEOMETRY')
  const result = preflight(revised, regenerated, lay, shade, makePolicies())
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.markerSourceRevisionMatched, true)
  assert.equal(result.cuttingAuthorized, false)
})

test('unbound or fabricated marker revision cannot be silently accepted', () => {
  const missing = {...marker}
  delete missing.sourceProjectSha256
  blocked(preflight(garment, missing, lay, shade, makePolicies()), null,
    'STALE_OR_UNBOUND_MARKER_SOURCE_GEOMETRY')
  const forged = {...marker, sourceProjectSha256: '0'.repeat(64)}
  blocked(preflight(garment, forged, lay, shade, makePolicies()), null,
    'STALE_OR_UNBOUND_MARKER_SOURCE_GEOMETRY')
})

test('declared defect crossing a ply blocks preflight even when marker and roll lengths pass', () => {
  const p = makePolicies()
  p.rollPlanById['ROLL-A'].defects.push({startCm: 2, endCm: 4})
  blocked(run(p), 'rollDefects', 'ROLL_PLY_INTERSECTS_DECLARED_DEFECT')
})

test('missing ply segment blocks all-size preflight', () => {
  const p = makePolicies()
  p.rollPlanById['ROLL-A'].plySegments.pop()
  blocked(run(p), 'rollDefects', 'MISSING_ROLL_PLY_SEGMENT')
})

test('stack height exceeding head clearance blocks preflight', () => {
  const p = makePolicies()
  p.stackPolicy.equipmentStackById['TABLE-A'].spreaderHeadClearanceMm = 2.99
  blocked(run(p), 'plyStack', 'SPREADER_HEAD_CLEARANCE_EXCEEDED')
})

test('carriage overrun beyond machine travel blocks preflight', () => {
  const p = makePolicies()
  p.carriagePolicy.carriageByTableId['TABLE-A'].maxCarriageTravelCm = maxLength + 7.99
  blocked(run(p), 'carriage', 'CARRIAGE_TRAVEL_EXCEEDED')
})

test('unassigned table, wrong dye lot and incomplete policies never pass', () => {
  const table = makePolicies()
  table.spreadingPolicy.tableBySizeFabric[sizes[0]].main = 'UNKNOWN'
  blocked(run(table), 'plyStack', 'UNKNOWN_SPREADING_TABLE_ASSIGNMENT')
  const wrongLot = structuredClone(shade)
  wrongLot.rollProvenanceById['ROLL-A'].dyeLotId = 'OTHER'
  blocked(run(makePolicies(), lay, wrongLot), 'rollDefects', 'ORDER_DYE_LOT_MISMATCH')
  const missing = makePolicies()
  delete missing.carriagePolicy
  blocked(run(missing))
})

test('caller-supplied cutting authorization or fake calibrated evidence cannot pass', () => {
  const p = makePolicies()
  p.stackPolicy.equipmentStackById['TABLE-A'].factoryApproved = true
  blocked(run(p), 'plyStack', 'INVALID_STACK_EQUIPMENT_DECLARATION')
  const q = makePolicies()
  q.carriagePolicy.carriageByTableId['TABLE-A'].cuttingAuthorized = true
  blocked(run(q), 'carriage', 'INVALID_CARRIAGE_DECLARATION')
})

test('two fabrics and six sizes reconcile twelve rows; a second-table carriage failure blocks all', () => {
  const twoFabric = structuredClone(garment)
  twoFabric.pieces[2].fabricId = 'lining'
  twoFabric.pieces[3].fabricId = 'lining'
  const twoMarker = inspectMarker(twoFabric, {fabricWidthCm: 150, maxCandidates: 50000})
  assert.equal(twoMarker.ok, true, JSON.stringify(twoMarker.issues))
  const twoLay = structuredClone(lay)
  twoLay.rollsById['ROLL-L'] = {
    fabricId: 'lining', usableWidthCm: 150, availableLengthCm: 100000,
  }
  for (const size of sizes) twoLay.laysBySize[size].lining = {
    rollId: 'ROLL-L', plies: 2, markerRepeats: 2, endLossCmPerPly: 3,
  }
  const twoShade = structuredClone(shade)
  twoShade.orderMaterialsByFabric.lining = {
    shadeId: 'BLACK', dyeLotId: 'LOT-7', maxPlyCount: 8,
  }
  twoShade.rollProvenanceById['ROLL-L'] = {
    fabricId: 'lining', shadeId: 'BLACK', dyeLotId: 'LOT-7',
    batchId: 'SYNTHETIC-LINING', maxPlyCount: 8,
  }
  const twoDemand = inspectLay(twoFabric, twoMarker, twoLay)
  assert.equal(twoDemand.ok, true, JSON.stringify(twoDemand.issues))
  const length = Math.max(...twoDemand.rows.map(row =>
    row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly))
  const p = makePolicies()
  p.rollPlanById['ROLL-L'] = {defects: [], plySegments: []}
  p.rollPlanById['ROLL-A'].plySegments = []
  const offsets = {'ROLL-A': 0, 'ROLL-L': 0}
  for (const row of twoDemand.rows) {
    const segmentLength = row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly
    for (let plyIndex = 0; plyIndex < row.plies; plyIndex++) {
      const startCm = offsets[row.rollId]
      p.rollPlanById[row.rollId].plySegments.push({
        size: row.size, fabricId: row.fabricId, plyIndex,
        startCm, endCm: startCm + segmentLength,
      })
      offsets[row.rollId] += segmentLength
    }
  }
  const tableA = p.spreadingPolicy.spreadingTableById['TABLE-A']
  tableA.grossTableLengthCm = length + 10
  tableA.maxContinuousLayCm = length
  p.spreadingPolicy.spreadingTableById['TABLE-B'] = structuredClone(tableA)
  for (const size of sizes) p.spreadingPolicy.tableBySizeFabric[size].lining = 'TABLE-B'
  p.stackPolicy.rollStackById['ROLL-L'] = structuredClone(p.stackPolicy.rollStackById['ROLL-A'])
  p.stackPolicy.equipmentStackById['TABLE-B'] =
    structuredClone(p.stackPolicy.equipmentStackById['TABLE-A'])
  p.carriagePolicy.carriageByTableId['TABLE-A'].maxCarriageTravelCm = length + 8
  p.carriagePolicy.carriageByTableId['TABLE-B'] =
    structuredClone(p.carriagePolicy.carriageByTableId['TABLE-A'])
  const inspect = () => preflight(twoFabric, twoMarker, twoLay, twoShade, p)
  const passed = inspect()
  assert.equal(passed.ok, true, JSON.stringify(passed.issues))
  assert.equal(passed.rows.length, 12)
  assert.equal(passed.fabricCount, 2)
  assert.equal(passed.rollCount, 2)
  assert.equal(passed.cuttingAuthorized, false)
  const revisedLining = structuredClone(twoFabric)
  revisedLining.pieces[2].points[0].x += 0.02
  blocked(preflight(revisedLining, twoMarker, twoLay, twoShade, p), null,
    'STALE_OR_UNBOUND_MARKER_SOURCE_GEOMETRY')
  p.carriagePolicy.carriageByTableId['TABLE-B'].carriageUsableWidthCm = 153.99
  blocked(inspect(), 'carriage', 'CARRIAGE_USABLE_WIDTH_EXCEEDED')
  assert.equal(JSON.stringify(garment), original)
})

test('source-derived manual marker relocation requires updated full cutroom lay and passes only digital preflight', () => {
  const initialRow = marker.rows[0]
  const placed = initialRow.marker.placements[0]
  const edit = {size: initialRow.size, fabricId: initialRow.fabricId,
    pieceId: placed.pieceId, instance: placed.instance, x: 0,
    y: initialRow.marker.metrics.length + 3, rotationDeg: placed.rotationDeg}
  const manual = inspectManualMarker(garment, [edit], marker.markerBuildOptions)
  assert.equal(manual.ok, true, JSON.stringify(manual.issues))
  assert.equal(manual.sourceProjectSha256, marker.sourceProjectSha256)
  assert.equal(manual.referenceMarkerParity, false)
  assert.equal(manual.originalAutoMarkerParity, true)
  assert.equal(manual.manualSourceCutGeometryVerified, true)
  assert.equal(manual.originalAutoCheckedDxfPlacements, marker.checkedDxFPlacements)
  const forgedForLay = structuredClone(manual)
  forgedForLay.rows[0].marker.placements[0].x += 1
  const forgedLayDemand = inspectLay(garment, forgedForLay, lay)
  assert.equal(forgedLayDemand.ok, false)
  assert.match(JSON.stringify(forgedLayDemand.issues), /MANUAL_MARKER_LAY_SOURCE_WITNESS_MISMATCH/)
  assert(manual.rows[0].marker.metrics.length > marker.rows[0].marker.metrics.length)
  assert.equal(manual.cuttingAuthorized, false)
  const demand = inspectLay(garment, manual, lay)
  assert.equal(demand.ok, true, JSON.stringify(demand.issues))
  // The unchanged lay/roll plan is no longer valid after a real marker move.
  blocked(preflight(garment, manual, lay, shade, makePolicies()), 'rollDefects',
    'ROLL_PLY_LENGTH_DRIFT')
  const updated = makePolicies()
  let offset = 0
  let max = 0
  updated.rollPlanById['ROLL-A'].plySegments = []
  for (const row of demand.rows) {
    const length = row.markerLengthCm * row.markerRepeats + row.endLossCmPerPly
    max = Math.max(max, length)
    for (let i = 0; i < row.plies; i++) {
      updated.rollPlanById['ROLL-A'].plySegments.push({
        size: row.size, fabricId: row.fabricId, plyIndex: i,
        startCm: offset, endCm: offset + length,
      })
      offset += length
    }
  }
  updated.spreadingPolicy.spreadingTableById['TABLE-A'].grossTableLengthCm = max + 10
  updated.spreadingPolicy.spreadingTableById['TABLE-A'].maxContinuousLayCm = max
  updated.carriagePolicy.carriageByTableId['TABLE-A'].maxCarriageTravelCm = max + 8
  const automaticPlyPlan = planRollSegments(garment, manual, lay, shade, {
    defectsByRoll: {'ROLL-A': []},
  })
  assert.equal(automaticPlyPlan.ok, true, JSON.stringify(automaticPlyPlan.issues))
  assert.deepEqual(automaticPlyPlan.rollPlanById['ROLL-A'].plySegments,
    updated.rollPlanById['ROLL-A'].plySegments)
  updated.rollPlanById = automaticPlyPlan.rollPlanById
  const checked = preflight(garment, manual, lay, shade, updated)
  assert.equal(checked.ok, true, JSON.stringify(checked.issues))
  assert.equal(checked.markerStudySourceDerivedMatch, true)
  assert.equal(checked.manualMarkerJournalInspected, true)
  assert.equal(checked.cuttingAuthorized, false)
  assert.equal(checked.factoryApproved, false)
  for (const mutate of [
    study => { study.rows[0].marker.placements[0].x += 0.25 },
    study => { study.rows[0].marker.placements[0].outline[0].x += 0.25 },
    study => { study.rows[0].cutterStudy.ok = false },
    study => { study.markerBuildOptions.spacingCm += 0.5 },
    study => { study.manualMarkerEditsV1[0].x = 500 },
  ]) {
    const forged = structuredClone(manual)
    mutate(forged)
    blocked(preflight(garment, forged, lay, shade, updated), null,
      'MARKER_CONTENT_OR_OPTIONS_UNBOUND')
  }
  const changedSource = structuredClone(garment)
  changedSource.pieces[0].points[0].x += 0.01
  blocked(preflight(changedSource, manual, lay, shade, updated), null,
    'STALE_OR_UNBOUND_MARKER_SOURCE_GEOMETRY')
  assert.equal(JSON.stringify(garment), original)
})

test('manual journal rejects unsupported constrained fabric rules and malformed edit identity', () => {
  const placed = marker.rows[0].marker.placements[0]
  const edit = {size: sizes[0], fabricId: 'main', pieceId: placed.pieceId,
    instance: placed.instance, x: 0, y: 0, rotationDeg: placed.rotationDeg}
  for (const changed of [
    {...edit, size: 'not-a-size'},
    {...edit, fabricId: 'wrong-material'},
    {...edit, instance: -1},
    {...edit, y: NaN},
    {...edit, x: Infinity},
    {...edit, rotationDeg: 900},
    {...edit, unsignedApproval: true},
  ]) {
    const result = inspectManualMarker(garment, [changed], marker.markerBuildOptions)
    assert.equal(result.ok, false)
    assert.match(JSON.stringify(result.issues), /MANUAL_EDIT_JOURNAL_INVALID/)
  }
  const unverifiedFoldOrDefect = {...marker.markerBuildOptions,
    constrainedLayout: {foldEdge: 'left', defectZonesByFabric: {main: []}}}
  const refused = inspectManualMarker(garment, [edit], unverifiedFoldOrDefect)
  assert.equal(refused.ok, false)
  assert.match(JSON.stringify(refused.issues), /MANUAL_SPECIALTY_LAYOUT_UNVERIFIED/)
})

test('roll segment planner uses a verified marker, skips declared roll defects and refuses forged layouts', () => {
  const planned = planRollSegments(garment, marker, lay, shade, {
    defectsByRoll: {'ROLL-A': [{startCm: 0, endCm: 5}]},
  })
  assert.equal(planned.ok, true, JSON.stringify(planned.issues))
  assert.equal(planned.rollCount, 1)
  assert.equal(planned.inspectedPlyCount, sizes.length * 2)
  assert(planned.rollPlanById['ROLL-A'].plySegments.every(seg => seg.startCm > 5))
  assert.equal(planned.cuttingAuthorized, false)
  const updated = makePolicies()
  updated.rollPlanById = planned.rollPlanById
  const checked = preflight(garment, marker, lay, shade, updated)
  assert.equal(checked.ok, true, JSON.stringify(checked.issues))
  const invalid = planRollSegments(garment, marker, lay, shade, {
    defectsByRoll: {'ROLL-A': [{startCm: 5, endCm: 0}]},
  })
  assert.equal(invalid.ok, false)
  assert.match(JSON.stringify(invalid.issues), /ROLL_PLAN_INVALID_DEFECT_INTERVAL/)
  const overlapping = planRollSegments(garment, marker, lay, shade, {
    defectsByRoll: {'ROLL-A': [{startCm: 30, endCm: 34}, {startCm: 32, endCm: 40}]},
  })
  assert.equal(overlapping.ok, false)
  assert.match(JSON.stringify(overlapping.issues), /ROLL_PLAN_OVERLAPPING_DEFECTS/)
  const middleDefect = planRollSegments(garment, marker, lay, shade, {
    defectsByRoll: {'ROLL-A': [{startCm: 1000, endCm: 1005}]},
  })
  assert.equal(middleDefect.ok, true, JSON.stringify(middleDefect.issues))
  assert(middleDefect.rollPlanById['ROLL-A'].plySegments.every(seg =>
    seg.endCm < 1000 || seg.startCm > 1005))
  const noCapacity = structuredClone(lay)
  noCapacity.rollsById['ROLL-A'].availableLengthCm = 1
  const exhausted = planRollSegments(garment, marker, noCapacity, shade, {
    defectsByRoll: {'ROLL-A': []},
  })
  assert.equal(exhausted.ok, false)
  assert.match(JSON.stringify(exhausted.issues), /ROLL_PLAN_LAY_PREREQUISITE/)
  const tampered = structuredClone(marker)
  tampered.rows[0].marker.placements[0].x += 0.5
  const notAttested = planRollSegments(garment, tampered, lay, shade, {
    defectsByRoll: {'ROLL-A': []},
  })
  assert.equal(notAttested.ok, false)
  assert.match(JSON.stringify(notAttested.issues), /ROLL_PLAN_MARKER_SOURCE_WITNESS_MISMATCH/)
})

test('industrial roll planner retains exact pre-defect clearance and batches 6,000 plys under declared limits', () => {
  const firstRequired = demand.rows[0].markerLengthCm *
    demand.rows[0].markerRepeats + demand.rows[0].endLossCmPerPly
  const edge = firstRequired + 0.01
  const exactEdge = planRollSegments(garment, marker, lay, shade, {
    defectsByRoll: {'ROLL-A': [{startCm: edge, endCm: edge + 1}]},
  })
  assert.equal(exactEdge.ok, true, JSON.stringify(exactEdge.issues))
  const first = exactEdge.rollPlanById['ROLL-A'].plySegments[0]
  assert.equal(first.startCm, 0, 'An exact 0.01-cm pre-defect clearance must not discard the first usable interval')
  assert.equal(first.endCm, firstRequired)

  const bulkLay = structuredClone(lay)
  const bulkShade = structuredClone(shade)
  for (const size of sizes) {
    bulkLay.ordersBySize[size] = 1000
    bulkLay.laysBySize[size].main = {
      rollId: 'ROLL-A', plies: 1000, markerRepeats: 1, endLossCmPerPly: 3,
    }
  }
  bulkLay.rollsById['ROLL-A'].availableLengthCm = 20_000_000
  bulkShade.orderMaterialsByFabric.main.maxPlyCount = 1000
  bulkShade.rollProvenanceById['ROLL-A'].maxPlyCount = 1000
  const defects = Array.from({length: 200}, (_, i) => ({
    startCm: 100 + i * 1000, endCm: 100.25 + i * 1000,
  }))
  const large = planRollSegments(garment, marker, bulkLay, bulkShade, {
    defectsByRoll: {'ROLL-A': defects},
  })
  assert.equal(large.ok, true, JSON.stringify(large.issues))
  assert.equal(large.inspectedPlyCount, 6000)
  assert.equal(large.rollPlanById['ROLL-A'].plySegments.length, 6000)
  assert.equal(large.rollPlanById['ROLL-A'].defects.length, 200)
  assert.equal(large.cuttingAuthorized, false)
  assert.equal(large.factoryApproved, false)
  const limited = planRollSegments(garment, marker, bulkLay, bulkShade, {
    defectsByRoll: {'ROLL-A': []}, maxPlySegments: 5000,
  })
  assert.equal(limited.ok, false)
  assert.match(JSON.stringify(limited.issues), /ROLL_PLAN_SIZE_LIMIT/)
  const invalidLimit = planRollSegments(garment, marker, lay, shade, {
    defectsByRoll: {'ROLL-A': []}, maxPlySegments: 24001,
  })
  assert.equal(invalidLimit.ok, false)
  assert.match(JSON.stringify(invalidLimit.issues), /ROLL_PLAN_INVALID_SIZE_BUDGET/)
  assert.equal(JSON.stringify(garment), original)
})

test('manual marker replay regenerates authored notches against current CUT contours', () => {
  const notched = structuredClone(garment)
  notched.pieces[0].notches = [
    {id: 'MANUAL-EDGE', edgeIndex: 0, t: 0.5, depthCm: 0.2, type: 'single'},
  ]
  const originalNotched = JSON.stringify(notched)
  const baseline = inspectMarker(notched, {fabricWidthCm: 150, maxCandidates: 50000})
  assert.equal(baseline.ok, true, JSON.stringify(baseline.issues))
  const row = baseline.rows[0]
  const target = row.marker.placements.find(p => p.pieceId === notched.pieces[0].id)
  assert(target, 'Expected named notched piece in base marker')
  const edit = {size: row.size, fabricId: row.fabricId, pieceId: target.pieceId,
    instance: target.instance, x: 0,
    y: row.marker.metrics.length + 2, rotationDeg: target.rotationDeg}
  const verified = inspectManualMarker(notched, [edit], baseline.markerBuildOptions)
  assert.equal(verified.ok, true, JSON.stringify(verified.issues))
  assert.equal(verified.rows[0].markTransfer.ok, true)
  assert.equal(verified.rows[0].markTransfer.notchCount, 1)
  assert.equal(verified.rows[0].cutterStudy.ok, true)
  assert.equal(verified.rows[0].cutterStudy.cuttingAuthorized, false)
  assert.equal(JSON.stringify(notched), originalNotched)
})
