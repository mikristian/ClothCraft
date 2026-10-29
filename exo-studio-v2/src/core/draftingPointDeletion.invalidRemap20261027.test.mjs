import test from 'node:test'
import assert from 'node:assert/strict'
import {deletedPointEdgeIndex} from './draftingPointDeletion.js'

test('invalid deleted vertex never reassigns edge attachments', () => {
  for (const bad of [-1, 5, 1.5, NaN, Infinity, undefined]) {
    for (const edge of [0, 1, 2, 3, 4]) {
      assert.equal(deletedPointEdgeIndex(edge, bad, 5), null)
    }
  }
  for (const count of [0, 2, 4.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(deletedPointEdgeIndex(0, 0, count), null)
  }
})

test('all surviving edge IDs remap exactly once around cyclic deletion', () => {
  for (let count = 4; count <= 16; count++) {
    for (let point = 0; point < count; point++) {
      const mapped = Array.from({length: count}, (_, edge) => deletedPointEdgeIndex(edge, point, count))
      const adjacent = (point + count - 1) % count
      assert.equal(mapped[point], null)
      assert.equal(mapped[adjacent], null)
      assert.deepEqual(mapped.filter(v => v !== null).sort((a, b) => a - b),
        Array.from({length: count - 1}, (_, i) => i).filter(i => i !== (point === 0 ? count - 2 : point - 1)))
    }
  }
})
