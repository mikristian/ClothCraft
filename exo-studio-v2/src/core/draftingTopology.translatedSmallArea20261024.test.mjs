import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectDraftTopology, isDraftEditValid } from './draftingTopology.js'

const square = (origin, side = 0.0032) => ({
  points: [
    { x: origin, y: origin },
    { x: origin + side, y: origin },
    { x: origin + side, y: origin + side },
    { x: origin, y: origin + side },
  ],
  curves: {},
})

test('small valid closed contour remains valid after large coordinate translation', () => {
  const base = inspectDraftTopology(square(0))
  const shifted = inspectDraftTopology(square(99999))
  assert.equal(base.valid, true)
  assert.equal(shifted.valid, true, `translated valid contour rejected: ${shifted.errors.join('; ')}`)
  assert.ok(Math.abs(shifted.areaCm2 - base.areaCm2) < 1e-10)
})

test('clockwise translated contour retains correct area and winding', () => {
  const piece = square(99999)
  piece.points.reverse()
  const result = inspectDraftTopology(piece)
  assert.equal(result.valid, true)
  assert.equal(result.winding, 'clockwise')
  assert.ok(Math.abs(result.areaCm2 - 0.0032 ** 2) < 1e-10)
})

test('truly near-zero area still fails closed regardless of translation', () => {
  for (const origin of [0, 99999]) {
    const result = inspectDraftTopology(square(origin, 0.002))
    assert.equal(result.valid, false)
    assert.match(result.errors.join(' '), /near-zero enclosed area/)
  }
})

test('translated edit preflight accepts valid contour without changing authored points', () => {
  const piece = square(99999)
  const original = structuredClone(piece)
  assert.equal(isDraftEditValid(piece, { pointIndex: 1, point: { ...piece.points[1] } }), true)
  assert.deepEqual(piece, original)
})
