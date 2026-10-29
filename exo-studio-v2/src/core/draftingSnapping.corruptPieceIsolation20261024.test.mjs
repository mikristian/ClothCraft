import test from 'node:test'
import assert from 'node:assert/strict'
import {snapDraftPattern} from './draftingSnapping.js'

const good = () => ({
  id: 'valid', layout2d: {x: 20, y: 20},
  points: [{x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 10}, {x: 0, y: 10}],
})
const broken = () => ({...good(), id: 'broken', layout2d: {x: 0, y: 0}})

test('corrupt imported vertex does not crash snapping or mask a valid piece', () => {
  const damaged = broken()
  damaged.points[1] = null
  const before = structuredClone(damaged)
  const found = snapDraftPattern({x: 20.1, y: 19.9}, [damaged, good()], {toleranceCm: .5})
  assert.equal(found?.pieceId, 'valid')
  assert.equal(found?.kind, 'vertex')
  assert.deepEqual(damaged, before)
})

test('invalid curve control cannot create a fake snap or crash the editor', () => {
  const damaged = broken()
  damaged.curves = {1: {cx: NaN, cy: 5}}
  const before = structuredClone(damaged)
  assert.equal(snapDraftPattern({x: 10, y: -5}, [damaged], {toleranceCm: 2}), null)
  assert.deepEqual(damaged, before)
})

test('finite local coordinates whose global transform overflows are not snapped', () => {
  const damaged = broken()
  damaged.layout2d.x = 1e308
  damaged.points[1].x = 1e308
  const before = structuredClone(damaged)
  assert.equal(snapDraftPattern({x: 0, y: 0}, [damaged], {toleranceCm: 1}), null)
  assert.deepEqual(damaged, before)
})

test('valid curved and straight geometry still snaps normally', () => {
  const source = good()
  source.curves = {1: {cx: 13, cy: 5}}
  assert.equal(snapDraftPattern({x: 31.5, y: 15}, [source], {toleranceCm: 1})?.edgeIndex, 1)
  assert.equal(snapDraftPattern({x: 20.1, y: 19.9}, [source], {toleranceCm: .5})?.kind, 'vertex')
})
