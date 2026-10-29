import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { stagedPanelPositions, setStagedGeometry } from './staging.js'

const panel = arrangement3d => ({
  piece: { id: 'unassigned-test-panel', arrangement3d },
  flatVertices: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 40 }],
})

test('3D arrangement keeps finite points for valid avatar placement and rejects corrupted measurements', () => {
  const valid = stagedPanelPositions(panel({ wrap: 'flat', stagingOffsetX: 0.2 }), { heightCm: 175 })
  assert.equal(valid.length, 3)
  assert.ok(valid.every(point => [point.x, point.y, point.z].every(Number.isFinite)))
  assert.throws(() => stagedPanelPositions(panel({ wrap: 'flat' }), { heightCm: Infinity }), /avatar height/)
  assert.throws(() => stagedPanelPositions(panel({ wrap: 'flat', stagingOffsetZ: Infinity }), { heightCm: 175 }), /staging arrangement/)
  assert.throws(() => stagedPanelPositions({ ...panel({ wrap: 'flat' }), flatVertices: [{ x: NaN, y: 0 }] }), /pattern coordinates/)
})

test('invalid fitted staging mesh never partially overwrites existing viewport geometry', () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  const staged = stagedPanelPositions(panel({ wrap: 'flat' }))
  const snapshot = Array.from(geometry.attributes.position.array)
  const fitted = staged.map(point => point.clone())
  fitted[2].z = Infinity
  assert.equal(setStagedGeometry(geometry, staged, fitted, 0.5), false)
  assert.deepEqual(Array.from(geometry.attributes.position.array), snapshot)
  assert.equal(setStagedGeometry(geometry, staged, fitted.slice(0, 2), 0.5), false)
  assert.deepEqual(Array.from(geometry.attributes.position.array), snapshot)
  const oversized = staged.map(point => point.clone())
  oversized[2].x = 1e100
  assert.equal(setStagedGeometry(geometry, oversized, null, 0), false)
  assert.deepEqual(Array.from(geometry.attributes.position.array), snapshot)
  assert.equal(setStagedGeometry(geometry, staged, null, 0), true)
  assert.ok(Array.from(geometry.attributes.position.array).every(Number.isFinite))
})
