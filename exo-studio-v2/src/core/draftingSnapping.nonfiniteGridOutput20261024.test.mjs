import test from 'node:test'
import assert from 'node:assert/strict'
import {snapDraftGrid} from './draftingSnapping.js'

test('finite drafting coordinates with subnormal grid spacing cannot produce infinite snaps', () => {
  assert.throws(() => snapDraftGrid({x: 1e308, y: 1}, Number.MIN_VALUE), /grid/i)
})

test('finite grid origin subtraction overflow must fail closed', () => {
  assert.throws(() => snapDraftGrid({x: 1e308, y: 1}, 1, {x: -1e308, y: 0}), /grid/i)
})

test('ordinary fractional grid and translated-origin snapping remain unchanged', () => {
  assert.deepEqual(snapDraftGrid({x: 13.23, y: -6.62}, 0.25), {x: 13.25, y: -6.5})
  assert.deepEqual(snapDraftGrid({x: 13.1, y: -5.8}, 2, {x: 0.5, y: 0.5}), {x: 12.5, y: -5.5})
})

test('invalid grid computations do not mutate authored point or origin', () => {
  const point = {x: 1e308, y: 1}
  const origin = {x: -1e308, y: 0}
  const beforePoint = structuredClone(point)
  const beforeOrigin = structuredClone(origin)
  assert.throws(() => snapDraftGrid(point, 1, origin), /grid/i)
  assert.deepEqual(point, beforePoint)
  assert.deepEqual(origin, beforeOrigin)
})
