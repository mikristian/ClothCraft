import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addNativeFreeCurvePoint, moveNativeFreeCurvePoint } from './nativeFreeCurvePoints.js'

const square = () => ({
  points: [[0, 0], [.2, 0], [.2, .16], [0, .16]],
  edges: ['top', 'right', 'bottom', 'left'],
  curves: {},
  free_curve_points: {},
})

const mirrored = () => addNativeFreeCurvePoint(square(), 'right', .5, { mirror: true }).polygon

test('mirrored point movement rejects partner arithmetic overflow without mutating authored geometry', () => {
  const original = mirrored()
  const id = original.free_curve_points.right[0].id
  original.free_curve_points.left[0].position[1] = Number.MAX_VALUE
  const before = structuredClone(original)
  assert.equal(moveNativeFreeCurvePoint(original, 'right', id, [0, Number.MAX_VALUE]), null)
  assert.deepEqual(original, before)
})

test('mirrored point movement rejects invalid partner coordinates', () => {
  const original = mirrored()
  const id = original.free_curve_points.right[0].id
  original.free_curve_points.left[0].position[0] = NaN
  const before = structuredClone(original)
  assert.equal(moveNativeFreeCurvePoint(original, 'right', id, [.001, 0]), null)
  assert.deepEqual(original, before)
})

test('mirrored point movement rejects a second member incorrectly attached to the same edge', () => {
  const original = mirrored()
  const id = original.free_curve_points.right[0].id
  const partner = original.free_curve_points.left.pop()
  original.free_curve_points.right.push(partner)
  const before = structuredClone(original)
  assert.equal(moveNativeFreeCurvePoint(original, 'right', id, [.001, 0]), null)
  assert.deepEqual(original, before)
})

test('valid mirrored movement still reflects x and preserves y and source data', () => {
  const original = mirrored()
  const before = structuredClone(original)
  const id = original.free_curve_points.right[0].id
  const moved = moveNativeFreeCurvePoint(original, 'right', id, [.005, .006])
  assert.ok(moved)
  assert.deepEqual(moved.free_curve_points.right[0].position,
    before.free_curve_points.right[0].position.map((v, i) => v + [.005, .006][i]))
  assert.deepEqual(moved.free_curve_points.left[0].position,
    before.free_curve_points.left[0].position.map((v, i) => v + [-.005, .006][i]))
  assert.deepEqual(original, before)
})
