import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultProject } from '../data/defaultProject.js'
import { buildSewingAssemblyWorkflow20261024 } from './sewingAssemblyWorkflow20261024.js'
import { proposeSewingMismatchCalibration20261024 as propose, applySewingMismatchRepair20261024 as apply, probeSourceSleeveCurveTrueing20261024 as probe } from './sewingMismatchRepair20261024.js'

test('default EXO reproduction: eight actual sleeve joins fail at base and 40 graded joins fail across six sizes', () => {
  const original = createDefaultProject(), before = structuredClone(original)
  const audit = buildSewingAssemblyWorkflow20261024(original)
  assert.equal(audit.issues.filter(i => i.code === 'SEAM_LENGTH_MISMATCH').length, 8)
  assert.equal(audit.issues.filter(i => i.code === 'GRADED_SEAM_MISMATCH').length, 40)
  const result = propose(original)
  assert.equal(result.ok, true, result.detail)
  assert.deepEqual(result.checkedSizes, ['XS','S','M','L','XL','XXL'])
  assert.equal(result.affectedSeams, 8)
  assert.equal(result.proposals.length, 8)
  assert.ok(result.proposals.every(s => s.measurements.length === 6))
  assert.ok(result.proposals.some(s => s.measurements.some(m => m.mismatchCm > 1)))
  assert.equal(result.calibrated, false)
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(original, before)
})

test('repair explicitly refuses to alter connected curve and notch attachments atomically', () => {
  const original = createDefaultProject(), before = structuredClone(original)
  const result = apply(original)
  assert.equal(result.ok, false)
  assert.equal(result.code, 'MANUAL_TRUEING_REQUIRED')
  assert.equal(result.repairApplied, false)
  assert.equal(result.proposal.affectedSeams, 8)
  assert.deepEqual(original, before)
})

test('already matched straight edges produce no invented calibration', () => {
  const p = createDefaultProject()
  p.seams = p.seams.slice(0, 4)
  p.pieces = p.pieces.slice(0, 2)
  const r = propose(p)
  assert.equal(r.ok, true, r.detail)
  assert.equal(r.affectedSeams, 0)
  assert.equal(r.baselineIssues, 0)
})

test('invalid graded size and missing endpoint refuse the entire proposal', () => {
  const p = createDefaultProject(), before = structuredClone(p)
  p.grading.sizes = ['M','M']
  assert.equal(propose(p).code, 'CALIBRATION_REFUSED')
  assert.deepEqual(p.grading.sizes, ['M','M'])
  const q = createDefaultProject()
  q.seams[0].b.edgeIndex = 90
  assert.equal(propose(q).code, 'CALIBRATION_REFUSED')
  assert.deepEqual(before.pieces, q.pieces)
})

test('malicious getters, inherited hooks, cycles and nonfinite curve controls cannot bypass fail-closed source guard', () => {
  const p = createDefaultProject()
  let calls = 0
  Object.defineProperty(p.pieces[0].points[0], 'x', {get() {calls++; throw Error('called')} })
  assert.equal(propose(p).ok, false)
  assert.equal(calls, 0)
  const q = createDefaultProject()
  q.self = q
  assert.equal(apply(q).ok, false)
  const badCurve = createDefaultProject()
  badCurve.pieces[2].curves[0].cx = NaN
  assert.equal(propose(badCurve).ok, false)
})

test('unsupported ease is never described as repaired or secretly applied', () => {
  const p = createDefaultProject()
  p.seams[4].type = 'ease'
  p.seams[4].ratio = .95
  const before = structuredClone(p)
  const result = propose(p)
  assert.equal(result.code, 'CALIBRATION_REFUSED')
  assert.deepEqual(p, before)
})

test('bounded source sleeve-control experiment measures all sizes without committing a curve', () => {
  const p=createDefaultProject(),before=structuredClone(p)
  const result=probe(p,{maxShiftCm:3,stepCm:1})
  assert.equal(result.ok,true,result.detail)
  assert.deepEqual(result.checkedSizes,p.grading.sizes)
  assert.equal(result.attempts,49)
  assert.equal(result.baselineAffectedSeams,8)
  assert.ok(Number.isFinite(result.best.worstMismatchCm))
  assert.equal(result.repairApplied,false)
  assert.deepEqual(p,before)
})

test('bounded probe rejects unsupported curve and work budget',()=>{
  const p=createDefaultProject(),before=structuredClone(p)
  assert.equal(probe(p,{edgeIndex:3}).code,'SOURCE_CURVE_PROBE_REFUSED')
  assert.equal(probe(p,{maxShiftCm:12,stepCm:.1}).code,'SOURCE_CURVE_PROBE_REFUSED')
  assert.deepEqual(p,before)
})
