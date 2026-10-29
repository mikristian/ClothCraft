import test from 'node:test'
import assert from 'node:assert/strict'
import { splitParameterAtArcFraction } from './draftingSplit.js'

const piece = () => ({ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], curves: {} })

test('split arc rejects inherited endpoint coordinates', () => {
  const input = piece()
  input.points[0] = Object.assign(Object.create({ x: 0 }), { y: 0 })
  assert.throws(() => splitParameterAtArcFraction(input, 0, 0.5), /coordinates/)
})

test('split arc rejects coordinate getters without invoking them', () => {
  const input = piece()
  let calls = 0
  Object.defineProperty(input.points[1], 'x', { get() { calls++; return 10 } })
  assert.throws(() => splitParameterAtArcFraction(input, 0, 0.5), /coordinates/)
  assert.equal(calls, 0)
})

test('split arc rejects curve handle getters without invoking them', () => {
  const input = piece()
  let calls = 0
  input.curves[0] = { cy: 4 }
  Object.defineProperty(input.curves[0], 'cx', { get() { calls++; return 5 } })
  assert.throws(() => splitParameterAtArcFraction(input, 0, 0.5), /coordinates/)
  assert.equal(calls, 0)
})

test('split arc rejects inherited curve handles rather than treating them as straight edges', () => {
  const input = piece()
  input.curves = Object.create({ 0: { cx: 5, cy: 4 } })
  assert.throws(() => splitParameterAtArcFraction(input, 0, 0.5), /coordinates/)
})

test('split arc rejects accessor-backed vertex array entries without invoking them', () => {
  const input = piece()
  let calls = 0
  Object.defineProperty(input.points, '0', { get() { calls++; return { x: 0, y: 0 } } })
  assert.throws(() => splitParameterAtArcFraction(input, 0, 0.5), /coordinates/)
  assert.equal(calls, 0)
})

test('split arc rejects inherited sparse vertex array entries', () => {
  const input = piece()
  delete input.points[0]
  const originalPrototype = Object.getPrototypeOf(input.points)
  const prototype = Object.create(originalPrototype)
  prototype[0] = { x: 0, y: 0 }
  Object.setPrototypeOf(input.points, prototype)
  assert.throws(() => splitParameterAtArcFraction(input, 0, 0.5), /coordinates/)
})

test('split arc preserves valid frozen straight and curved input geometry', () => {
  const straight = piece()
  Object.freeze(straight.points[0]); Object.freeze(straight.points[1])
  assert.equal(splitParameterAtArcFraction(straight, 0, 0.5), 0.5)
  const curved = piece()
  curved.curves[0] = Object.freeze({ cx: 5, cy: 4 })
  const original = structuredClone(curved)
  const result = splitParameterAtArcFraction(curved, 0, 0.5)
  assert.ok(Number.isFinite(result) && result > 0 && result < 1)
  assert.deepEqual(curved, original)
})
