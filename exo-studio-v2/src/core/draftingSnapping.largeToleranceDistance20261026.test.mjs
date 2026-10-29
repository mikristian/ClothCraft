import test from 'node:test'
import assert from 'node:assert/strict'
import {snapDraftPattern} from './draftingSnapping.js'

const triangle = (id, x = 0) => ({
  id,
  layout2d: {x: 0, y: 0},
  points: [{x, y: 0}, {x: x + 1, y: 0}, {x: x + 1, y: 1}],
  curves: {},
})

test('large finite tolerance never returns an infinite vertex snap distance', () => {
  const result = snapDraftPattern({x: 1e200, y: 0}, [triangle('large')], {
    toleranceCm: 1e200, allowEdges: false,
  })
  assert.equal(result?.pieceId, 'large')
  assert.equal(result?.distanceCm, 1e200)
})

test('diagonal candidate beyond large finite tolerance is not captured', () => {
  const result = snapDraftPattern({x: 1e200, y: 1e200}, [triangle('far')], {
    toleranceCm: 1e200, allowEdges: false,
  })
  assert.equal(result, null)
})

test('overflowing coordinate differences cannot masquerade as in-range snaps', () => {
  const result = snapDraftPattern({x: -1e308, y: 0}, [triangle('overflow', 1e308)], {
    toleranceCm: 1e308, allowEdges: false,
  })
  assert.equal(result, null)
})

test('large finite tolerance also preserves finite edge snap measurements', () => {
  const piece = {
    id: 'edge', layout2d: {x: 0, y: 0}, curves: {},
    points: [{x: 0, y: 0}, {x: 2, y: 0}, {x: 2, y: 2}, {x: 0, y: 2}],
  }
  const result = snapDraftPattern({x: 1, y: 1e200}, [piece], {toleranceCm: 1e200})
  assert.equal(result?.kind, 'edge')
  assert.equal(result?.distanceCm, 1e200)
})

test('ordinary corner snapping remains accurate and source data unchanged', () => {
  const piece = triangle('normal')
  const original = structuredClone(piece)
  const result = snapDraftPattern({x: 0.1, y: -0.1}, [piece], {
    toleranceCm: 0.5, allowEdges: false,
  })
  assert.equal(result?.kind, 'vertex')
  assert.equal(result?.pointIndex, 0)
  assert.ok(Math.abs(result.distanceCm - Math.hypot(0.1, -0.1)) < 1e-12)
  assert.deepEqual(piece, original)
})
