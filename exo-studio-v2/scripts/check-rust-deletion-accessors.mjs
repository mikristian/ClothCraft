import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeRustGeometryKernel, rustDeletionTopologyValid } from '../src/core/rustGeometryKernel.js'

assert.equal(await initializeRustGeometryKernel({
  bytes: readFileSync(new URL('../public/wasm/exo_geometry_kernel.wasm', import.meta.url)),
}), true)

const square = () => [{ x: 0, y: 0 }, { x: 1, y: 0 },
  { x: 1, y: 1 }, { x: 0, y: 1 }]
assert.equal(rustDeletionTopologyValid({ points: square() }), true)
let getterCalls = 0
const x = { y: 0 }
Object.defineProperty(x, 'x', { get() { getterCalls++; return 0 } })
assert.equal(rustDeletionTopologyValid({ points: [x, ...square().slice(1)] }), false)
const curve = { cy: 0 }
Object.defineProperty(curve, 'cx', { get() { getterCalls++; return 0.5 } })
assert.equal(rustDeletionTopologyValid({ points: square(), curves: { 0: curve } }), false)
const accessorPiece = { points: square() }
Object.defineProperty(accessorPiece, 'curves', { get() { getterCalls++; return {} } })
assert.equal(rustDeletionTopologyValid(accessorPiece), false)
const sparse = square()
delete sparse[2]
assert.equal(rustDeletionTopologyValid({ points: sparse }), false)
assert.equal(getterCalls, 0, 'geometry accessors must never execute during preflight')
console.log('PASS: Rust bridge rejects accessor-backed and sparse geometry')
