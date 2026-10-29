import test from 'node:test'
import assert from 'node:assert/strict'
import { planDraftPointDeletion } from './draftingPointDeletion.js'

const pieceWithCurves = (curves) => ({
  id: 'front',
  points: [
    { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 10 }, { x: 0, y: 10 },
  ],
  curves,
  notches: [],
  topstitches: [],
  bindings: [],
  zippers: [],
})

test('point deletion fails closed on invalid curve edge keys rather than silently dropping or normalizing them', () => {
  for (const key of ['bad', '-1', '5', '3.5', '03']) {
    const source = pieceWithCurves({ [key]: { cx: 5, cy: 12 } })
    const before = JSON.stringify(source)
    assert.throws(() => planDraftPointDeletion(source, 1), /invalid curve edge index/i, `key ${key}`)
    assert.equal(JSON.stringify(source), before, `source mutated for key ${key}`)
  }
})

test('point deletion rejects alias keys that would overwrite a surviving curve', () => {
  const source = pieceWithCurves({ '3': { cx: 5, cy: 12 }, '03': { cx: 6, cy: 13 } })
  assert.throws(() => planDraftPointDeletion(source, 1), /invalid curve edge index/i)
})

test('canonical curve indices still remap and adjacent curves still disappear', () => {
  const source = pieceWithCurves({ '0': { cx: 2.5, cy: -1 }, '3': { cx: 5, cy: 12 } })
  const before = JSON.stringify(source)
  assert.deepEqual(planDraftPointDeletion(source, 1).curves, { '2': { cx: 5, cy: 12 } })
  assert.equal(JSON.stringify(source), before)
})
