import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditGradedSizeRunGeometry } from './gradedSizeRunGeometryAudit.js'

const rectangle = (width, height) => ({
  id: 'small-trim',
  points: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }],
})
const project = (piece, widthPerSizeCm) => ({
  pieces: [piece],
  grading: { sizes: ['XS', 'S', 'M'], baseSize: 'M', widthPerSizeCm, lengthPerSizeCm: 0 },
})

test('reports an actual winding inversion in narrow graded trim without modifying the source', () => {
  const source = project(rectangle(2, 2), 3)
  const before = JSON.stringify(source)
  const result = auditGradedSizeRunGeometry(source)
  assert.equal(result.pass, false)
  assert.ok(result.issues.some(issue => issue.code === 'GRADED_WINDING_FLIP' && issue.size === 'XS'))
  assert.equal(JSON.stringify(source), before)
})

test('does not report stable size runs or pre-existing duplicate edges as new grading failures', () => {
  const source = project(rectangle(20, 20), 0.5)
  assert.equal(auditGradedSizeRunGeometry(source).pass, true)
  source.pieces[0].points.splice(1, 0, { ...source.pieces[0].points[0] })
  assert.equal(auditGradedSizeRunGeometry(source).pass, true)
})

test('rejects invalid audit thresholds', () => {
  assert.throws(() => auditGradedSizeRunGeometry(project(rectangle(20, 20), 1), { minEdgeCm: -1 }), /tolerances/)
})

test('detects curved stitchline inversion that straight vertex winding misses', () => {
  const curved = {
    id: 'curved-neck-trim',
    points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }],
    curves: { 0: { cx: -20, cy: 2 } },
  }
  const source = {
    pieces: [curved],
    grading: { sizes: ['XS', 'S', 'M'], baseSize: 'M', widthPerSizeCm: 2, lengthPerSizeCm: 1 },
  }
  const snapshot = JSON.stringify(source)
  const report = auditGradedSizeRunGeometry(source)
  assert.ok(report.issues.some(issue => issue.code === 'GRADED_WINDING_FLIP' && issue.size === 'XS'),
    'the sampled curved outline must detect a flip invisible in its straight vertex polygon')
  assert.equal(JSON.stringify(source), snapshot, 'diagnostics must never modify the garment')
})

test('does not flag a stable curved outline with unchanged grade geometry', () => {
  const piece = rectangle(20, 20)
  piece.curves = { 0: { cx: 10, cy: -3 } }
  const source = project(piece, 0)
  source.grading.lengthPerSizeCm = 0
  assert.equal(auditGradedSizeRunGeometry(source).pass, true)
})
