import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeRustVectorFitKernel, rustSegmentErrorSquared } from './rustVectorFitKernel.js'

test('Rust curve-fit adapter only exposes finite nonnegative squared distances', async () => {
  const bytes = readFileSync(new URL('../../public/wasm/exo_vector_fit_kernel.wasm', import.meta.url))
  assert.equal(await initializeRustVectorFitKernel({ bytes }), true)
  const a = { x: 0, y: 0 }, b = { x: 1, y: 0 }
  assert.ok(Math.abs(rustSegmentErrorSquared({ x: 0.5, y: 0.2 }, a, b) - 0.04) < 1e-12)
  assert.equal(rustSegmentErrorSquared({ x: NaN, y: 0 }, a, b), null)
  assert.equal(rustSegmentErrorSquared({ x: Infinity, y: 0 }, a, b), null)
  assert.equal(rustSegmentErrorSquared({ x: 1e308, y: 1e308 }, a, { x: 1e308, y: 0 }), null)
})
