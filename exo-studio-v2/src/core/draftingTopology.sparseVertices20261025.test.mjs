import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectDraftTopology, isDraftEditValid } from './draftingTopology.js'

const square = () => ({
  points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
  curves: {},
})

test('sparse vertices at every index fail topology inspection without throwing', () => {
  for (let index = 0; index < 4; index++) {
    const piece = square()
    delete piece.points[index]
    const result = inspectDraftTopology(piece)
    assert.equal(result.valid, false)
    assert.match(result.errors.join(' '), /invalid or out-of-range coordinate/)
    assert.deepEqual(result.intersections, [])
  }
})

test('sparse vertices fail point and curve edit preflight without throwing', () => {
  const piece = square()
  delete piece.points[2]
  assert.equal(isDraftEditValid(piece, { pointIndex: 0, point: { x: 1, y: 0 } }), false)
  assert.equal(isDraftEditValid(piece, { edgeIndex: 0, curve: { cx: 5, cy: 0 } }), false)
})

test('valid closed square and valid edit continue to pass', () => {
  const piece = square()
  const inspected = inspectDraftTopology(piece)
  assert.equal(inspected.valid, true)
  assert.equal(inspected.areaCm2, 100)
  assert.equal(isDraftEditValid(piece, { pointIndex: 1, point: { x: 9, y: 0 } }), true)
})

test('inspection and rejected edits preserve sparse authored geometry', () => {
  const piece = square()
  delete piece.points[1]
  const before = structuredClone(piece)
  assert.equal(inspectDraftTopology(piece).valid, false)
  assert.equal(isDraftEditValid(piece, { pointIndex: 0, point: { x: 1, y: 0 } }), false)
  assert.deepEqual(piece, before)
  assert.equal(Object.hasOwn(piece.points, 1), false)
})
