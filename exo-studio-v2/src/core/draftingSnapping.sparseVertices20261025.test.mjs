import test from 'node:test'
import assert from 'node:assert/strict'
import {snapDraftPattern} from './draftingSnapping.js'

const square = (id, x = 0) => ({
  id, layout2d: {x, y: 0},
  points: [{x: 0, y: 0}, {x: 2, y: 0}, {x: 2, y: 2}, {x: 0, y: 2}],
  curves: {},
})

test('sparse imported vertices at every position cannot crash the snap preview', () => {
  for (let missing = 0; missing < 4; missing++) {
    const damaged = square(`sparse-${missing}`)
    delete damaged.points[missing]
    assert.equal(snapDraftPattern({x: .1, y: .1}, [damaged], {toleranceCm: .5}), null)
  }
})

test('sparse piece cannot mask a valid subsequent snap candidate', () => {
  const damaged = square('sparse')
  delete damaged.points[1]
  const valid = square('valid', 20)
  const result = snapDraftPattern({x: 20.1, y: -.1}, [damaged, valid], {toleranceCm: .5})
  assert.equal(result?.pieceId, 'valid')
  assert.equal(result?.kind, 'vertex')
})

test('sparse snap rejection preserves source geometry and missing slots', () => {
  const damaged = square('sparse')
  delete damaged.points[2]
  const original = structuredClone(damaged)
  assert.equal(snapDraftPattern({x: 0, y: 0}, [damaged], {toleranceCm: 1}), null)
  assert.deepEqual(damaged, original)
  assert.equal(Object.hasOwn(damaged.points, 2), false)
})

test('complete vertex arrays still support ordinary corner snapping', () => {
  const result = snapDraftPattern({x: .1, y: -.1}, [square('valid')], {toleranceCm: .5})
  assert.equal(result?.pieceId, 'valid')
  assert.equal(result?.kind, 'vertex')
  assert.equal(result?.pointIndex, 0)
})
