import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectCutlinePolygon } from './cutlineTopology.js'

const square = () => [
  { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 },
]

test('inherited finite cutline coordinates cannot masquerade as authored vertices', () => {
  const points = square()
  points[0] = Object.create({ x: 0, y: 0 })
  const result = inspectCutlinePolygon(points)
  assert.equal(result.ok, false)
  assert.equal(result.areaCm2, 0)
  assert.ok(result.faults.some(fault => fault.code === 'CUTLINE_NONFINITE'))
})

test('inherited coordinate getters are not invoked while rejecting an unauthored vertex', () => {
  let reads = 0
  const inherited = Object.create(null)
  Object.defineProperty(inherited, 'x', { get() { reads++; return 0 } })
  inherited.y = 0
  const points = square()
  points[0] = Object.create(inherited)
  const result = inspectCutlinePolygon(points)
  assert.equal(result.ok, false)
  assert.equal(reads, 0)
})

test('own coordinate getters are rejected without execution', () => {
  let reads = 0
  const point = { y: 0 }
  Object.defineProperty(point, 'x', { enumerable: true, get() { reads++; return 0 } })
  const points = square()
  points[0] = point
  const result = inspectCutlinePolygon(points)
  assert.equal(result.ok, false)
  assert.equal(reads, 0)
})

test('ordinary authored cutline coordinates remain accurate and immutable', () => {
  const points = square()
  const before = structuredClone(points)
  assert.deepEqual(inspectCutlinePolygon(points), { ok: true, areaCm2: 12, faults: [] })
  assert.deepEqual(points, before)
})
