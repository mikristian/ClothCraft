import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  initializeRustSelectionMetricsKernel,
  rustMeasuredSewingInterval,
  rustSelectionMetricsReady,
} from './rustSelectionMetricsKernel.js'

const wasm = readFileSync(new URL('../../public/wasm/exo_selection_metrics_kernel.wasm', import.meta.url))
const uv = [[0, 0], [1, 0]]
const live = [[0, 0, 0], [2, 0, 0]]
const range = [0.25, 0.75]

test('compiled sewing measurement kernel initializes', async () => {
  assert.equal(await initializeRustSelectionMetricsKernel({ bytes: wasm }), true)
  assert.equal(rustSelectionMetricsReady(), true)
})

test('sparse UV and live boundary nodes fail closed without throwing', () => {
  assert.equal(rustMeasuredSewingInterval([, [1, 0]], live, range), null)
  assert.equal(rustMeasuredSewingInterval(uv, [, [2, 0, 0]], range), null)
})

test('missing boundary arrays fail closed without throwing', () => {
  assert.equal(rustMeasuredSewingInterval(null, live, range), null)
  assert.equal(rustMeasuredSewingInterval(uv, undefined, range), null)
})

test('incomplete coordinates and nonfinite range fail closed', () => {
  assert.equal(rustMeasuredSewingInterval([[0, 0], [, 0]], live, range), null)
  assert.equal(rustMeasuredSewingInterval(uv, [[0, 0, 0], [2, 0]], range), null)
  assert.equal(rustMeasuredSewingInterval(uv, live, [NaN, 0.75]), null)
})

test('valid partial interval keeps exact 2D and 3D centimetre lengths without mutation', () => {
  const original = JSON.stringify({ uv, live, range })
  assert.deepEqual(rustMeasuredSewingInterval(uv, live, range), { length2DCm: 50, length3DCm: 100 })
  assert.equal(JSON.stringify({ uv, live, range }), original)
})
