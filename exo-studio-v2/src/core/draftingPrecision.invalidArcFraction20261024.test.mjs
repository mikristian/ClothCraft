import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { quadraticAtLengthFraction } from './draftingPrecision.js'
import { edgePointAt } from './project.js'
import { initializeRustGeometryKernel, rustGeometryKernelReady } from './rustGeometryKernel.js'

const a = Object.freeze({ x: 0, y: 0, id: 'start' })
const control = Object.freeze({ x: 8, y: 12 })
const b = Object.freeze({ x: 20, y: 0, id: 'end' })
const piece = Object.freeze({
  points: Object.freeze([a, b, Object.freeze({ x: 20, y: 20 })]),
  curves: Object.freeze({ 0: Object.freeze({ cx: control.x, cy: control.y }) }),
})

test('nonfinite arclength fractions fail closed rather than becoming endpoints', () => {
  for (const fraction of [Infinity, -Infinity, NaN]) {
    assert.throws(() => quadraticAtLengthFraction(a, control, b, fraction), /Invalid curve length fraction/)
    assert.throws(() => edgePointAt(piece, 0, fraction), /Invalid curve length fraction/)
  }
})

test('missing, blank, and nonnumeric arclength fractions are not silently interpreted as endpoints', () => {
  for (const fraction of [null, undefined, '', '  \t ', false, true, [], [0.5]]) {
    assert.throws(() => quadraticAtLengthFraction(a, control, b, fraction), /Invalid curve length fraction/)
  }
})

test('valid fractions and legacy finite clamping retain geometry without mutation', () => {
  const middle = quadraticAtLengthFraction(a, control, b, 0.5)
  assert.ok(middle.point.x > 0 && middle.point.x < 20)
  assert.ok(middle.parameter > 0 && middle.parameter < 1)
  assert.deepEqual(quadraticAtLengthFraction(a, control, b, '0.5').point, middle.point)
  assert.deepEqual(quadraticAtLengthFraction(a, control, b, -1).point, { x: 0, y: 0 })
  assert.deepEqual(quadraticAtLengthFraction(a, control, b, 2).point, { x: 20, y: 0 })
  assert.deepEqual(edgePointAt(piece, 0, 0.5).point, middle.point)
  assert.deepEqual(a, { x: 0, y: 0, id: 'start' })
  assert.deepEqual(control, { x: 8, y: 12 })
  assert.deepEqual(b, { x: 20, y: 0, id: 'end' })
})

test('compiled Rust WASM arclength path retains invalid-station rejection', async () => {
  const bytes = readFileSync(new URL('../../public/wasm/exo_geometry_kernel.wasm', import.meta.url))
  assert.equal(await initializeRustGeometryKernel({ bytes }), true)
  assert.equal(rustGeometryKernelReady(), true)
  for (const fraction of [Infinity, -Infinity, NaN, null, '   ', false]) {
    assert.throws(() => quadraticAtLengthFraction(a, control, b, fraction), /Invalid curve length fraction/)
  }
  const result = quadraticAtLengthFraction(a, control, b, 0.5)
  assert.ok(Number.isFinite(result.point.x) && Number.isFinite(result.point.y))
  assert.ok(result.parameter > 0 && result.parameter < 1)
})
