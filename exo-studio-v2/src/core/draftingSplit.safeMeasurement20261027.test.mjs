import test from 'node:test'
import assert from 'node:assert/strict'
import { draftingSplitFractions } from './draftingSplit.js'
import { edgeLength } from './project.js'

const piece = () => ({ points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }], curves: {} })

test('split preview rejects inherited or getter-backed vertices without evaluating accessors', () => {
  const inherited = piece()
  inherited.points[0] = Object.assign(Object.create({ x: 0 }), { y: 0 })
  assert.throws(() => draftingSplitFractions(inherited, 0, { method: 'uniform' }), /coordinates/)

  const accessor = piece()
  let accesses = 0
  Object.defineProperty(accessor.points[1], 'x', { get() { accesses++; return 20 } })
  assert.throws(() => draftingSplitFractions(accessor, 0, { method: 'length', lengthCm: 5 }), /coordinates/)
  assert.equal(accesses, 0)

  const arrayAccessor = piece()
  Object.defineProperty(arrayAccessor.points, '0', { get() { accesses++; return { x: 0, y: 0 } } })
  assert.throws(() => draftingSplitFractions(arrayAccessor, 0, { method: 'uniform' }), /coordinates/)
  assert.equal(accesses, 0)
})

test('split preview rejects inherited and accessor curve handles without evaluating them', () => {
  const inherited = piece()
  inherited.curves = Object.create({ 0: { cx: 10, cy: 8 } })
  assert.throws(() => draftingSplitFractions(inherited, 0, { method: 'ratio', ratioPercent: 30 }), /curve handle/)

  const accessor = piece()
  let accesses = 0
  Object.defineProperty(accessor.curves, '0', { get() { accesses++; return { cx: 10, cy: 8 } } })
  assert.throws(() => draftingSplitFractions(accessor, 0, { method: 'uniform' }), /curve handle/)
  assert.equal(accesses, 0)
})

test('split measurement preserves finite curved arc length and frozen inputs', () => {
  const curved = piece()
  curved.curves[0] = Object.freeze({ cx: 11, cy: 15 })
  Object.freeze(curved.points[0]); Object.freeze(curved.points[1])
  const length = edgeLength(curved, 0)
  assert.deepEqual(draftingSplitFractions(curved, 0, { method: 'length', lengthCm: length * .4 }), [.4])
  assert.deepEqual(draftingSplitFractions(curved, 0, { method: 'uniform', count: 4 }), [.25, .5, .75])
})
