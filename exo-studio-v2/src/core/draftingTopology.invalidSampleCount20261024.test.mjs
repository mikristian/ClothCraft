import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectDraftTopology, isDraftEditValid } from './draftingTopology.js'

const rectangle = () => ({
  points: [
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 10 }, { x: 0, y: 10 },
  ],
  curves: {},
})

test('invalid curve sample budgets cannot approve self-overlapping cutlines', () => {
  const piece = rectangle()
  piece.curves[0] = { cx: 20, cy: 0 }
  const original = structuredClone(piece)
  for (const curveSamples of [NaN, Infinity, -Infinity, 'invalid', null]) {
    const result = inspectDraftTopology(piece, { curveSamples })
    assert.equal(result.valid, false, `invalid sample budget ${String(curveSamples)} must fail closed`)
    assert.match(result.errors.join(' '), /sample/i)
  }
  assert.deepEqual(piece, original, 'topology validation must not mutate source geometry')
})

test('edit preflight rejects invalid sample budget instead of approving folded curve', () => {
  const piece = rectangle()
  const edit = { edgeIndex: 0, curve: { cx: 20, cy: 0 } }
  assert.equal(isDraftEditValid(piece, edit, { curveSamples: NaN }), false)
  assert.equal(isDraftEditValid(piece, edit, { curveSamples: 'invalid' }), false)
  assert.deepEqual(piece, rectangle(), 'rejected edit must not alter original pattern')
})

test('normal finite sample budgets still accept valid and reject folded contours', () => {
  const piece = rectangle()
  assert.equal(inspectDraftTopology(piece, { curveSamples: 16 }).valid, true)
  assert.equal(inspectDraftTopology(piece, { curveSamples: 8.6 }).valid, true)
  assert.equal(isDraftEditValid(piece, { edgeIndex: 0, curve: { cx: 5, cy: -2 } }, { curveSamples: 16 }), true)
  assert.equal(isDraftEditValid(piece, { edgeIndex: 0, curve: { cx: 20, cy: 0 } }, { curveSamples: 16 }), false)
})
