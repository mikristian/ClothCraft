import test from 'node:test'
import assert from 'node:assert/strict'
import { planDraftPointDeletion } from './draftingPointDeletion.js'

const sample = () => ({
  id: 'sparse-attachment-qa',
  points: [{x:0,y:0}, {x:5,y:0}, {x:10,y:0}, {x:10,y:10}, {x:0,y:10}],
  curves: {}, notches: [], zippers: [], bindings: [], topstitches: [],
})

for (const collection of ['notches', 'zippers', 'bindings', 'topstitches']) {
  test(`point deletion rejects sparse ${collection} before remapping`, () => {
    const piece = sample()
    piece[collection] = new Array(2)
    piece[collection][1] = { id: 'valid', edgeIndex: 3 }
    const before = structuredClone(piece)
    assert.throws(() => planDraftPointDeletion(piece, 1), new RegExp(`Invalid ${collection} edge index`))
    assert.deepEqual(piece, before, 'validation must not mutate the authored pattern')
  })
}

test('valid complete nonadjacent edge attachments retain existing deletion behavior', () => {
  const piece = sample()
  for (const collection of ['notches', 'zippers', 'bindings', 'topstitches']) {
    piece[collection] = [{ id: collection, edgeIndex: 3 }]
  }
  const before = structuredClone(piece)
  const result = planDraftPointDeletion(piece, 1)
  assert.equal(result.points.length, 4)
  assert.deepEqual(piece, before)
})
