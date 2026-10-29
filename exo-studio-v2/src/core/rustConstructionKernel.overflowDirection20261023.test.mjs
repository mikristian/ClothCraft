import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  initializeRustConstructionKernel,
  rustConstructionAlong,
  rustConstructionKernelReady,
} from './rustConstructionKernel.js'

function near(actual, expected, label) {
  assert.ok(Number.isFinite(actual), `${label} must remain finite; got ${actual}`)
  assert.ok(Math.abs(actual - expected) < 1e-11, `${label}: expected ${expected}, got ${actual}`)
}

function assertLargeDirection() {
  const a = Object.freeze({ x: 0, y: 0 })
  const b = Object.freeze({ x: 1.5e308, y: 1.5e308 })
  const diagonal = 10 / Math.SQRT2
  const along = rustConstructionAlong(a, b, 10)
  near(along.x, diagonal, 'overflowed-hypot along X')
  near(along.y, diagonal, 'overflowed-hypot along Y')
  const normal = rustConstructionAlong(a, b, 10, true)
  near(normal.x, -diagonal, 'overflowed-hypot normal X')
  near(normal.y, diagonal, 'overflowed-hypot normal Y')
  // Subtraction itself can overflow even though each endpoint is finite.
  const opposite = rustConstructionAlong(
    { x: 1e308, y: 0 }, { x: -1e308, y: 0 }, 1e308,
  )
  near(opposite.x, 0, 'overflowed-subtraction along X')
  near(opposite.y, 0, 'overflowed-subtraction along Y')
  assert.deepEqual(a, { x: 0, y: 0 })
  assert.deepEqual(b, { x: 1.5e308, y: 1.5e308 })
}

test('JS drafting construction preserves finite directions when hypot overflows', () => {
  assert.equal(rustConstructionKernelReady(), false)
  assertLargeDirection()
})

test('compiled Rust construction bridge preserves finite directions when hypot overflows', async () => {
  const wasm = readFileSync(new URL('../../rust/exo_construction_kernel/target/wasm32-unknown-unknown/release/exo_construction_kernel.wasm', import.meta.url))
  assert.equal(await initializeRustConstructionKernel({ bytes: wasm }), true)
  assertLargeDirection()
  assert.deepEqual(rustConstructionAlong({ x: 0, y: 0 }, { x: 10, y: 0 }, 2), { x: 2, y: 0 })
  assert.deepEqual(rustConstructionAlong({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, true), { x: 0, y: 2 })
})
