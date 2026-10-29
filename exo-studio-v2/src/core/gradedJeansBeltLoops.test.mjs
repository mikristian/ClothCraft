import { test } from 'node:test'
import assert from 'node:assert/strict'
import { create501JeansTemplate } from '../data/jeans501.js'
import { buildSizeRun } from './grading.js'
import { auditGradedSizeRunGeometry } from './gradedSizeRunGeometryAudit.js'
import { inspectIndustrialPatterns } from './industrialPatternQA.js'
import { findBoundaryCrossingPairs } from './gradedBoundaryCrossingsAudit.js'

const nearlyEqual = (actual, expected, label) => {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${label}: ${actual} differs from ${expected}`)
}

const signedArea = points => points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length]
  return sum + point.x * next.y - next.x * point.y
}, 0) / 2

test('all five 501 belt loops retain 1.4 x 9.4 cm geometry and construction metadata at W28-W38', () => {
  const source = create501JeansTemplate()
  const original = JSON.stringify(source)
  const baseLoops = source.pieces.filter(piece => /^belt-loop-[1-5]$/.test(piece.id))
  assert.equal(baseLoops.length, 5)
  const sizes = ['W28', 'W30', 'W32', 'W34', 'W36', 'W38']
  assert.deepEqual(source.grading.sizes, sizes)
  const graded = buildSizeRun(source)
  let checked = 0

  for (const size of sizes) {
    for (const base of baseLoops) {
      const piece = graded[size].pieces.find(candidate => candidate.id === base.id)
      assert.ok(piece, `${size}: missing ${base.id}`)
      assert.equal(piece.points.length, 4)
      assert.deepEqual(piece.points.map(({ x, y }) => ({ x, y })), base.points.map(({ x, y }) => ({ x, y })),
        `${size}: ${base.id} cut strip must not resize`)
      for (const edgeIndex of [0, 2]) {
        const a = piece.points[edgeIndex], b = piece.points[(edgeIndex + 1) % 4]
        nearlyEqual(Math.hypot(b.x - a.x, b.y - a.y), 1.4, `${size}/${base.id}/width-${edgeIndex}`)
      }
      for (const edgeIndex of [1, 3]) {
        const a = piece.points[edgeIndex], b = piece.points[(edgeIndex + 1) % 4]
        nearlyEqual(Math.hypot(b.x - a.x, b.y - a.y), 9.4, `${size}/${base.id}/length-${edgeIndex}`)
      }
      assert.ok(signedArea(piece.points) < -0.1, `${size}/${base.id}: winding must stay negative`)
      nearlyEqual(signedArea(piece.points), signedArea(base.points), `${size}/${base.id}: signed area`)
      assert.equal(piece.seamAllowance, 0.7)
      assert.deepEqual(piece.edgeSeamAllowances, base.edgeSeamAllowances)
      assert.deepEqual(piece.notches, base.notches)
      assert.deepEqual(piece.internalLines, base.internalLines)
      assert.deepEqual(piece.points.map(point => point.gradeRule), base.points.map(point => point.gradeRule))
      checked++
    }
  }
  assert.equal(checked, 30)
  assert.equal(JSON.stringify(source), original, 'grading must preserve the source garment')

  const report = auditGradedSizeRunGeometry(source)
  assert.equal(report.issues.filter(issue => /^belt-loop-[1-5]$/.test(issue.pieceId)).length, 0,
    `belt-loop geometry audit found ${JSON.stringify(report.issues.filter(issue => /^belt-loop-[1-5]$/.test(issue.pieceId)))}`)
  assert.equal(JSON.stringify(source), original, 'audit must preserve the source garment')
})

test('501 fly facing preserves its complete cut, hardware stations and nonintersecting outlines across grades', () => {
  const source = create501JeansTemplate()
  const snapshot = JSON.stringify(source)
  const base = source.pieces.find(piece => piece.id === 'button-fly-facing')
  assert.ok(base.points.every(point =>
    JSON.stringify(point.gradeRule) === JSON.stringify({ enabled: true, dxPerSize: 0, dyPerSize: 0 })))
  const graded = buildSizeRun(source)
  for (const size of source.grading.sizes) {
    const piece = graded[size].pieces.find(candidate => candidate.id === base.id)
    assert.deepEqual(piece.points, base.points, `${size}: cut shape and fold remain fixed`)
    assert.deepEqual(findBoundaryCrossingPairs(piece), [], `${size}: fly facing must not self-intersect`)
    assert.ok(signedArea(piece.points) < 0, `${size}: fly-facing winding must stay negative`)
    assert.deepEqual(piece.buttonholes, base.buttonholes, `${size}: buttonhole stations must be preserved`)
    assert.equal(piece.buttonholes.length, 4, `${size}: all four fly buttonholes must be present`)
  }
  const report = inspectIndustrialPatterns(source)
  assert.equal(report.issues.some(issue => issue.scope.includes('button-fly-facing')), false,
    'industrial-pattern QA must have no fly-facing blockers')
  assert.equal(report.blockers, 30, 'existing unapproved seam mismatches must remain visible')
  assert.equal(JSON.stringify(source), snapshot)
})
