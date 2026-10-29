import test from 'node:test'
import assert from 'node:assert/strict'
import { planDraftPointDeletion } from './draftingPointDeletion.js'

const sample = () => ({
  id: 'front',
  points: [
    { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 10 }, { x: 0, y: 10 },
  ],
  curves: {}, notches: [], topstitches: [], bindings: [], zippers: [],
})

test('deletion rejects invalid notch edge references without changing the source', () => {
  for (const edgeIndex of [-1, 5, 99, 3.5, '3', 'bogus', null, undefined, NaN, Infinity]) {
    const piece = sample()
    piece.notches = [{ id: 'notch', edgeIndex, t: 0.5 }]
    const original = structuredClone(piece)
    assert.throws(() => planDraftPointDeletion(piece, 1), /invalid notches edge index/i, `index ${String(edgeIndex)}`)
    assert.deepEqual(piece, original)
  }
})

test('deletion rejects invalid hardware edge references in all collections', () => {
  for (const collection of ['topstitches', 'bindings', 'zippers']) {
    for (const edgeIndex of [-1, 5, 2.5, '3', null]) {
      const piece = sample()
      piece[collection] = [{ id: 'hardware', edgeIndex }]
      const original = structuredClone(piece)
      assert.throws(() => planDraftPointDeletion(piece, 1), new RegExp(`invalid ${collection} edge index`, 'i'))
      assert.deepEqual(piece, original)
    }
  }
})

test('deletion rejects malformed attachment collections and missing edge references', () => {
  for (const collection of ['notches', 'topstitches', 'bindings', 'zippers']) {
    const malformed = sample()
    malformed[collection] = { edgeIndex: 3 }
    assert.throws(() => planDraftPointDeletion(malformed, 1), new RegExp(`invalid ${collection}`, 'i'))
    const missing = sample()
    missing[collection] = [{ id: 'missing-edge' }]
    assert.throws(() => planDraftPointDeletion(missing, 1), new RegExp(`invalid ${collection} edge index`, 'i'))
  }
})

test('valid nonadjacent numeric attachments remain accepted and unmodified', () => {
  const piece = sample()
  for (const collection of ['notches', 'topstitches', 'bindings', 'zippers']) {
    piece[collection] = [{ id: collection, edgeIndex: 3 }]
  }
  const original = structuredClone(piece)
  const result = planDraftPointDeletion(piece, 1)
  assert.equal(result.points.length, 4)
  assert.deepEqual(piece, original)
})
