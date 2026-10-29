import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {constrainDraftAxis} from './draftingSnapping.js'
import {initializeRustGeometryKernel, rustGeometryKernelReady} from './rustGeometryKernel.js'

const overflowStart = {x: -1e308, y: 0}
const overflowDestination = {x: 1e308, y: 0}

test('axis snap rejects finite endpoints with an overflowing movement vector', () => {
  const before = structuredClone({overflowStart, overflowDestination})
  assert.throws(() => constrainDraftAxis(overflowStart, overflowDestination), /drafting guideline/i)
  assert.deepEqual({overflowStart, overflowDestination}, before)
})

test('ordinary horizontal and diagonal axis snapping remains finite', () => {
  assert.deepEqual(constrainDraftAxis({x: 0, y: 0}, {x: 10, y: 1}), {x: 10, y: 0})
  const diagonal = constrainDraftAxis({x: 0, y: 0}, {x: 10, y: 10})
  assert.ok(Number.isFinite(diagonal.x) && Number.isFinite(diagonal.y))
  assert.ok(Math.abs(diagonal.x - 10) < 1e-10)
  assert.ok(Math.abs(diagonal.y - 10) < 1e-10)
})

test('compiled Rust geometry backend also rejects overflowing axis movement', async () => {
  const bytes = readFileSync(new URL('../../public/wasm/exo_geometry_kernel.wasm', import.meta.url))
  assert.equal(await initializeRustGeometryKernel({bytes}), true)
  assert.equal(rustGeometryKernelReady(), true)
  assert.throws(() => constrainDraftAxis(overflowStart, overflowDestination), /drafting guideline/i)
  const result = constrainDraftAxis({x: 0, y: 0}, {x: 4, y: 0})
  assert.deepEqual(result, {x: 4, y: 0})
})
