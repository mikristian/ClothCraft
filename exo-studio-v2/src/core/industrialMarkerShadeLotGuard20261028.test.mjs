import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from './industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerShadeLotGuard20261028 as inspectShade} from './industrialMarkerShadeLotGuard20261028.mjs'

// Disposable EXO garment, real six-size polygon nesting and DXF parity.
// No physical rolls, independent CAD receiver, or factory labels are implied.
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
assert.equal(study.ok, true, JSON.stringify(study.issues).slice(0, 500))
const clone = value => structuredClone(value)
const sizes = project.grading.sizes

function layPolicy() {
  return {
    ordersBySize: Object.fromEntries(sizes.map(size => [size, 4])),
    laysBySize: Object.fromEntries(sizes.map((size, index) => [size, {
      main: {rollId: index < 3 ? 'ROLL-A' : 'ROLL-B', plies: 2,
        markerRepeats: 2, endLossCmPerPly: 3},
    }])),
    rollsById: {
      'ROLL-A': {fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000},
      'ROLL-B': {fabricId: 'main', usableWidthCm: 150, availableLengthCm: 100000},
    },
  }
}
function shadePolicy() {
  return {
    orderMaterialsByFabric: {main: {
      shadeId: 'BLACK-01', dyeLotId: 'DYE-42', maxPlyCount: 8,
    }},
    rollProvenanceById: {
      'ROLL-A': {fabricId: 'main', shadeId: 'BLACK-01',
        dyeLotId: 'DYE-42', batchId: 'BATCH-1', maxPlyCount: 4},
      'ROLL-B': {fabricId: 'main', shadeId: 'BLACK-01',
        dyeLotId: 'DYE-42', batchId: 'BATCH-2', maxPlyCount: 6},
    },
  }
}
function blocked(result, code) {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(issue => issue.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
}

test('six-size real DXF marker and two declared batches of one dye lot inspect without cutting authority', () => {
  assert.equal(inspectLay(project, study, layPolicy()).ok, true)
  const result = inspectShade(project, study, layPolicy(), shadePolicy())
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.length, 6)
  assert.equal(result.sizeCount, 6)
  assert.equal(result.usedRollCount, 2)
  assert.equal(new Set(result.rows.map(row => row.batchId)).size, 2)
  assert(result.rows.every(row => row.dyeLotId === 'DYE-42'))
  assert.equal(result.physicalRollVerified, false)
  assert.equal(result.independentReceivingCadVerified, false)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(JSON.stringify(project), original)
})

test('legacy lay-demand accepts incompatible shade across sizes; new gate blocks it', () => {
  const policy = shadePolicy()
  policy.rollProvenanceById['ROLL-B'].shadeId = 'BLACK-02'
  assert.equal(inspectLay(project, study, layPolicy()).ok, true)
  blocked(inspectShade(project, study, layPolicy(), policy), 'ORDER_SHADE_MISMATCH')
})

test('same shade label cannot conceal a second dye lot in a multi-size order', () => {
  const policy = shadePolicy()
  policy.rollProvenanceById['ROLL-B'].dyeLotId = 'DYE-99'
  blocked(inspectShade(project, study, layPolicy(), policy), 'ORDER_DYE_LOT_MISMATCH')
})

test('both per-roll and order-level maximum ply limits are enforced', () => {
  const roll = shadePolicy()
  roll.rollProvenanceById['ROLL-A'].maxPlyCount = 1
  blocked(inspectShade(project, study, layPolicy(), roll), 'DECLARED_PLY_LIMIT_EXCEEDED')
  const order = shadePolicy()
  order.orderMaterialsByFabric.main.maxPlyCount = 1
  blocked(inspectShade(project, study, layPolicy(), order), 'DECLARED_PLY_LIMIT_EXCEEDED')
  const exact = shadePolicy()
  exact.rollProvenanceById['ROLL-A'].maxPlyCount = 2
  exact.orderMaterialsByFabric.main.maxPlyCount = 2
  assert.equal(inspectShade(project, study, layPolicy(), exact).ok, true)
})

test('missing, extra or undeclared roll identities cannot be inferred', () => {
  const missing = shadePolicy()
  delete missing.rollProvenanceById['ROLL-B']
  blocked(inspectShade(project, study, layPolicy(), missing), 'INCOMPLETE_SHADE_LOT_POLICY')
  const extra = shadePolicy()
  extra.rollProvenanceById['ROLL-C'] = clone(extra.rollProvenanceById['ROLL-A'])
  blocked(inspectShade(project, study, layPolicy(), extra), 'INCOMPLETE_SHADE_LOT_POLICY')
  const missingFabric = shadePolicy()
  delete missingFabric.orderMaterialsByFabric.main
  blocked(inspectShade(project, study, layPolicy(), missingFabric), 'INCOMPLETE_SHADE_LOT_POLICY')
})

test('roll fabric identity and malformed provenance fail closed', () => {
  const wrongFabric = shadePolicy()
  wrongFabric.rollProvenanceById['ROLL-B'].fabricId = 'lining'
  blocked(inspectShade(project, study, layPolicy(), wrongFabric), 'ROLL_PROVENANCE_FABRIC_DRIFT')
  const missingBatch = shadePolicy()
  delete missingBatch.rollProvenanceById['ROLL-A'].batchId
  blocked(inspectShade(project, study, layPolicy(), missingBatch), 'INVALID_ROLL_PROVENANCE_DECLARATION')
  const unsafePly = shadePolicy()
  unsafePly.rollProvenanceById['ROLL-A'].maxPlyCount = 1001
  blocked(inspectShade(project, study, layPolicy(), unsafePly), 'INVALID_ROLL_PROVENANCE_DECLARATION')
  const forgedFlag = shadePolicy()
  forgedFlag.orderMaterialsByFabric.main.factoryApproved = true
  blocked(inspectShade(project, study, layPolicy(), forgedFlag), 'INVALID_ORDER_MATERIAL_SPEC')
})

test('quantity shortage and missing CUT evidence remain blockers before shade inspection', () => {
  const shortage = layPolicy()
  shortage.ordersBySize.M = 5
  blocked(inspectShade(project, study, shortage, shadePolicy()), 'LAY_DEMAND_PREREQUISITE_BLOCKED')
  const noCut = clone(study)
  noCut.rows[0].cutterStudy.ok = false
  blocked(inspectShade(project, noCut, layPolicy(), shadePolicy()), 'LAY_DEMAND_PREREQUISITE_BLOCKED')
})

test('two-fabric disposable graded garment requires separate matching material policies', () => {
  const mixed = clone(project)
  mixed.pieces[2].fabricId = 'lining'
  mixed.pieces[3].fabricId = 'lining'
  const mixedStudy = inspectMarker(mixed, {fabricWidthCm: 150, maxCandidates: 50000})
  assert.equal(mixedStudy.ok, true, JSON.stringify(mixedStudy.issues).slice(0, 500))
  const lay = layPolicy()
  for (const size of sizes) lay.laysBySize[size].lining = {
    rollId: 'LINING-ROLL', plies: 2, markerRepeats: 2, endLossCmPerPly: 3,
  }
  lay.rollsById['LINING-ROLL'] = {
    fabricId: 'lining', usableWidthCm: 150, availableLengthCm: 100000,
  }
  const policy = shadePolicy()
  policy.orderMaterialsByFabric.lining = {
    shadeId: 'IVORY-01', dyeLotId: 'DYE-LINING', maxPlyCount: 3,
  }
  policy.rollProvenanceById['LINING-ROLL'] = {
    fabricId: 'lining', shadeId: 'IVORY-01', dyeLotId: 'DYE-LINING',
    batchId: 'LINING-BATCH', maxPlyCount: 3,
  }
  const result = inspectShade(mixed, mixedStudy, lay, policy)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.rows.length, 12)
  assert.equal(result.fabricCount, 2)
  const wrong = clone(policy)
  wrong.rollProvenanceById['LINING-ROLL'].shadeId = 'IVORY-02'
  blocked(inspectShade(mixed, mixedStudy, lay, wrong), 'ORDER_SHADE_MISMATCH')
})
