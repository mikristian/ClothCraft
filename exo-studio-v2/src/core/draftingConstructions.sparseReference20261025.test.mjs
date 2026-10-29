import test from 'node:test'
import assert from 'node:assert/strict'
import { constructionReferencePoint, preciseConstructionEdit } from './draftingConstructions.js'

const validPiece = () => ({
  id: 'reference-guard',
  points: [
    { x: 0, y: 0, id: 'origin' },
    { x: 10, y: 0, id: 'edge' },
    { x: 10, y: 10, id: 'corner' },
    { x: 3, y: 4, id: 'editable', gradeRule: { dx: 1 } },
  ],
})

test('sparse reference slots fail with a controlled drafting error, not TypeError', () => {
  for (const index of [1, 2, 4]) {
    const piece = validPiece()
    delete piece.points[index - 1]
    const before = structuredClone(piece)
    assert.throws(() => constructionReferencePoint(piece, index), /Reference (X|Y).*finite length|Invalid pattern reference/)
    assert.deepEqual(piece, before)
  }
})

test('null and primitive reference vertices fail closed', () => {
  for (const bad of [null, undefined, false, '10', 0]) {
    const piece = validPiece()
    piece.points[1] = bad
    assert.throws(() => constructionReferencePoint(piece, 2), /Reference (X|Y).*finite length|Invalid pattern reference/)
  }
})

test('array-like fabricated point collections cannot supply drafting references', () => {
  const piece = { points: { 0: { x: 1, y: 2 }, length: 1 } }
  assert.throws(() => constructionReferencePoint(piece, 1), /Reference index|Invalid pattern reference/)
})

test('invalid references never reach the edit operation or alter authored data', () => {
  const piece = validPiece()
  delete piece.points[1]
  const before = structuredClone(piece)
  assert.throws(() => preciseConstructionEdit(piece, 3, {
    construction: 'line', a: 2, b: 3, distanceCm: 2,
  }), /Reference (X|Y).*finite length|Invalid pattern reference/)
  assert.deepEqual(piece, before)
})

test('valid references preserve numeric and decimal UI indices and point metadata', () => {
  const piece = validPiece()
  const before = structuredClone(piece)
  assert.deepEqual(constructionReferencePoint(piece, ' 2 '), { x: 10, y: 0 })
  const edit = preciseConstructionEdit(piece, 3, {
    construction: 'line', a: '2', b: 3, distanceCm: 2,
  })
  assert.deepEqual({ x: edit.x, y: edit.y }, { x: 10, y: 2 })
  assert.equal(edit.id, 'editable')
  assert.deepEqual(edit.gradeRule, { dx: 1 })
  assert.deepEqual(piece, before)
})
