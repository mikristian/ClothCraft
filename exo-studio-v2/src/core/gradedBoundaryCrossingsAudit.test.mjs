import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditGradedBoundaryCrossings, findBoundaryCrossingPairs } from './gradedBoundaryCrossingsAudit.js'

const square = () => ({ id: 'front', points: [
  { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
] })
const sizeRun = piece => ({ pieces: [piece], grading: {
  sizes: ['M', 'L'], baseSize: 'M', widthPerSizeCm: 0, lengthPerSizeCm: 0,
} })

test('finds a new bow-tie crossing despite the graded outline retaining positive signed area', () => {
  const piece = square()
  piece.points[2].gradeRule = { enabled: true, dxPerSize: -12, dyPerSize: -4 }
  const source = sizeRun(piece), snapshot = structuredClone(source)
  const result = auditGradedBoundaryCrossings(source)
  assert.deepEqual(result.issues, [{
    code: 'GRADED_BOUNDARY_CROSSING', size: 'L', pieceId: 'front', firstEdge: 1, secondEdge: 3,
  }])
  assert.equal(result.inspectedPieces, 2)
  assert.deepEqual(source, snapshot, 'diagnostic must never alter designer geometry or rules')
})

test('does not attribute a pre-existing crossed cutline to grading', () => {
  const piece = square()
  piece.points[2].x = -2
  assert.deepEqual(findBoundaryCrossingPairs(piece), ['1:3'])
  assert.equal(auditGradedBoundaryCrossings(sizeRun(piece)).pass, true)
})

test('detects a crossing introduced by a quadratic control without moved vertices', () => {
  const piece = square()
  piece.curves = { 0: { cx: 5, cy: 30 } }
  assert.deepEqual(findBoundaryCrossingPairs(piece), ['0:2'])
  const straight = square()
  assert.deepEqual(findBoundaryCrossingPairs(straight), [])
})

test('ignores ordinary shared corners and near-collinear noncrossing boundaries', () => {
  const piece = square()
  piece.curves = { 0: { cx: 5, cy: -0.00000001 } }
  assert.deepEqual(findBoundaryCrossingPairs(piece), [])
  assert.equal(auditGradedBoundaryCrossings(sizeRun(piece)).pass, true)
})

test('rejects invalid sampling and nonfinite boundary coordinates', () => {
  assert.throws(() => findBoundaryCrossingPairs(square(), 1), /2 to 64/)
  assert.throws(() => findBoundaryCrossingPairs({ ...square(), points: [{ x: NaN, y: 0 }] }), /finite/)
  const piece = square()
  piece.curves = { 0: { cx: Infinity, cy: 1 } }
  assert.throws(() => findBoundaryCrossingPairs(piece), /finite/)
})
