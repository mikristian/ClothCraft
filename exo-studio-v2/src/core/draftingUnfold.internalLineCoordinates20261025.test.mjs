import assert from 'node:assert/strict'
import { test } from 'node:test'
import { unfoldDraftPiece } from './draftingUnfold.js'

const half = () => ({
  id: 'half-internal-line-guard', name: 'Half panel',
  points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 20 }],
  internalLines: [{ id: 'dart-guide', a: { x: 2, y: 4 }, b: { x: 7, y: 4 } }],
})

test('unfold rejects nondecimal and coerced internal-line coordinates without changing the source', () => {
  for (const value of ['0x2', '0b10', '0o7', true, [], {}, '', '1e999', Infinity, NaN]) {
    const piece = half()
    piece.internalLines[0].a.x = value
    const before = structuredClone(piece)
    assert.throws(() => unfoldDraftPiece(piece, 3), /Internal line/i, String(value))
    assert.deepEqual(piece, before)
  }
})

test('unfold rejects invalid internal lines even when the line lies on the fold', () => {
  const piece = half()
  piece.internalLines[0].a = { x: '0x0', y: 2 }
  piece.internalLines[0].b = { x: 0, y: 18 }
  const before = structuredClone(piece)
  assert.throws(() => unfoldDraftPiece(piece, 3), /Internal line/i)
  assert.deepEqual(piece, before)
})

test('unfold rejects missing internal-line endpoints with a controlled error', () => {
  for (const endpoint of ['a', 'b']) {
    const piece = half()
    delete piece.internalLines[0][endpoint]
    assert.throws(() => unfoldDraftPiece(piece, 3), /Internal line/i)
  }
})

test('unfold rejects malformed or sparse internal-line collections', () => {
  const malformed = half()
  malformed.internalLines = { 0: malformed.internalLines[0], length: 1 }
  assert.throws(() => unfoldDraftPiece(malformed, 3), /Internal lines must be an array/)
  const sparse = half()
  sparse.internalLines = new Array(1)
  const before = structuredClone(sparse)
  assert.throws(() => unfoldDraftPiece(sparse, 3), /Internal line must contain two endpoints/)
  assert.deepEqual(sparse, before)
})

test('unfold mirrors valid numeric and decimal internal lines without mutating authored data', () => {
  for (const x of [2, '2', '2.0', '2e0']) {
    const piece = half()
    piece.internalLines[0].a.x = x
    const before = structuredClone(piece)
    const result = unfoldDraftPiece(piece, 3)
    assert.equal(result.piece.internalLines.length, 2)
    assert.equal(result.piece.internalLines[0].a.x, 2)
    assert.equal(result.piece.internalLines[1].a.x, -2)
    assert.equal(result.piece.internalLines[1].b.x, -7)
    assert.deepEqual(piece, before)
  }
})
