import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustFreeSewingKernel, rustFreeSewingOperation} from './rustFreeSewingKernel.js'
import {projectFreeSewingPoint, freeSewingPointAtFraction, freeSewingRangePoints} from './freeSewingGeometry.js'

const wasm=readFileSync(new URL('../../rust/exo_free_sewing_kernel/target/wasm32-unknown-unknown/release/exo_free_sewing_kernel.wasm',import.meta.url))

test('compiled Free Sewing WASM fails closed when projection distance overflows',async()=>{
  assert.equal(await initializeRustFreeSewingKernel({bytes:wasm}),true)
  const points=[[0,0],[1,0]]
  const before=structuredClone(points)
  const farMouse=[1.5e308,1.5e308]
  assert(farMouse.every(Number.isFinite))
  assert.equal(rustFreeSewingOperation(points,1,...farMouse),undefined)
  assert.equal(projectFreeSewingPoint([0,1],points,farMouse),null)
  assert.deepEqual(points,before)
})

test('compiled Free Sewing WASM still returns finite normal projections, points, and ranges',async()=>{
  assert.equal(await initializeRustFreeSewingKernel({bytes:wasm}),true)
  const points=[[0,0],[1,0],[1,1]]
  assert.deepEqual(rustFreeSewingOperation(points,1,.5,.25),{
    fraction:.25,position:[.5,0],distance:.25,lengthMetres:2,
  })
  assert.deepEqual(freeSewingPointAtFraction([0,1,2],points,.75),[1,.5])
  assert.deepEqual(freeSewingRangePoints([0,1,2],points,.25,.75),[[.5,0],[1,0],[1,.5]])
})
