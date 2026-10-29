import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectIndustrialPatterns } from './industrialPatternQA.js'
import { gradeProject } from './grading.js'
import { measureProject } from './measurements.js'

function rectangle(id, width = 20, height = 30) {
  return { id, points: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }] }
}
function fixture() {
  return {
    pieces: [rectangle('front'), rectangle('back')],
    seams: [{ id: 'shoulder', a: { pieceId: 'front', edgeIndex: 0 }, b: { pieceId: 'back', edgeIndex: 0 } }],
    grading: { sizes: ['S', 'M', 'L'], baseSize: 'M', widthPerSizeCm: 1, lengthPerSizeCm: 0.5 },
    customMeasurements: [{ id: 'tape', pieceId: 'front', a: { x: 0, y: 0 }, b: { x: 0, y: 20 }, toleranceCm: 0.5 }],
  }
}

test('per-size piece, seam and POM checks are deterministic and do not modify source', () => {
  const project = fixture(), before = structuredClone(project)
  const report = inspectIndustrialPatterns(project)
  assert.equal(report.status, 'pass', JSON.stringify(report.issues))
  assert.equal(report.sizeReports.length, 3)
  assert.equal(report.seamReports.length, 3)
  assert.equal(report.factoryCertified, false)
  assert.deepEqual(project, before)
  assert.deepEqual(inspectIndustrialPatterns(project), report)
})

test('seam checks inspect every grade and fail on size-specific mismatches', () => {
  const project = fixture()
  project.pieces[1].points[0].gradeRule = { enabled: true, dxPerSize: 3, dyPerSize: 0 }
  project.pieces[1].points[1].gradeRule = { enabled: true, dxPerSize: -3, dyPerSize: 0 }
  const report = inspectIndustrialPatterns(project)
  assert.equal(report.status, 'blocked')
  assert(report.issues.some((issue) => issue.code === 'SEAM_LENGTH_MISMATCH' && issue.scope.includes('L')))
  assert(report.seamReports.some((row) => row.size === 'M' && row.pass))
})

test('rejects collapsed and self crossing outlines created by grading', () => {
  const crossed = fixture()
  crossed.pieces[0].points = [
    { x: 0, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }, { x: 20, y: 0 }, { x: 10, y: -10 },
  ]
  assert(inspectIndustrialPatterns(crossed).issues.some((issue) => issue.code === 'SELF_INTERSECTION'))
  const collapsed = fixture()
  collapsed.pieces[0].points[1] = { x: 0, y: 0 }
  assert(inspectIndustrialPatterns(collapsed).issues.some((issue) => issue.code === 'COLLAPSED_EDGE'))
})

test('bad seam ranges and broken piece references fail closed', () => {
  const broken = fixture()
  broken.seams[0].a.startT = -0.2
  assert(inspectIndustrialPatterns(broken).issues.some((issue) => issue.code === 'BROKEN_SEAM'))
  broken.seams[0].a = { pieceId: 'missing', edgeIndex: 0 }
  assert(inspectIndustrialPatterns(broken).issues.some((issue) => issue.code === 'BROKEN_SEAM'))
})

test('POM targets check every size and reject omissions or out-of-tolerance measurements', () => {
  const project = fixture()
  const targets = Object.fromEntries(project.grading.sizes.map((size) => [size,
    measureProject(gradeProject(project, size)).map(({ id, cm }) => ({ id, cm, toleranceCm: 0.01 }))]))
  assert.equal(inspectIndustrialPatterns(project, { pomTargets: targets }).status, 'pass')
  targets.L[0].cm += 3
  assert(inspectIndustrialPatterns(project, { pomTargets: targets }).issues.some((issue) => issue.code === 'POM_OUT_OF_TOLERANCE'))
  delete targets.S
  assert(inspectIndustrialPatterns(project, { pomTargets: targets }).issues.some((issue) => issue.code === 'MISSING_POM_TARGETS'))
})

test('malformed input, duplicate sizes and invalid custom measurement tolerance block output', () => {
  assert.equal(inspectIndustrialPatterns(null).status, 'blocked')
  assert(inspectIndustrialPatterns(fixture(), { sizes: ['M', 'M'] }).issues.some((issue) => issue.code === 'INVALID_SIZE_RUN'))
  const project = fixture()
  project.customMeasurements[0].toleranceCm = -1
  assert(inspectIndustrialPatterns(project).issues.some((issue) => issue.code === 'INVALID_POM'))
})
