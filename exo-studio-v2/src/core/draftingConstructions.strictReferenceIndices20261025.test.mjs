import test from 'node:test'
import assert from 'node:assert/strict'
import { constructionReferencePoint, preciseConstructionEdit } from './draftingConstructions.js'

const piece = {
  id: 'strict-reference-indices',
  points: [
    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 },
    { x: 0, y: 10 }, { x: 3, y: 4, id: 'editable' },
  ],
}

test('construction references reject alternate-base indices instead of selecting an edge point', () => {
  for (const index of ['0x2', '0b10', '0o2', '0X2']) {
    assert.throws(() => constructionReferencePoint(piece, index), /Reference index/)
  }
})

test('construction references reject booleans, arrays, null and other coercible values', () => {
  for (const index of [true, false, [2], ['2'], null, undefined, { valueOf: () => 2 }]) {
    assert.throws(() => constructionReferencePoint(piece, index), /Reference index/)
  }
})

test('construction references never invoke an authored object numeric conversion hook', () => {
  let calls = 0
  const index = { [Symbol.toPrimitive]() { calls++; return 2 } }
  assert.throws(() => constructionReferencePoint(piece, index), /Reference index/)
  assert.equal(calls, 0)
})

test('decimal and numeric indices preserve normal edits without changing authored source', () => {
  const before = structuredClone(piece)
  for (const index of [2, '2', ' 2 ', '02', '2.0', '2e0']) {
    assert.deepEqual(constructionReferencePoint(piece, index), { x: 10, y: 0 })
  }
  assert.throws(() => preciseConstructionEdit(piece, 4, {
    construction: 'line', a: '0x2', b: 3, distanceCm: 2,
  }), /Reference index/)
  const edited = preciseConstructionEdit(piece, 4, {
    construction: 'line', a: '2', b: '3', distanceCm: 2,
  })
  assert.deepEqual({ x: edited.x, y: edited.y, id: edited.id }, { x: 10, y: 2, id: 'editable' })
  assert.deepEqual(piece, before)
})
