import assert from 'node:assert/strict'
import { test } from 'node:test'
import { unfoldDraftPiece } from './draftingUnfold.js'

const half = () => ({
  id: 'half-notch-decimal', name: 'Half bodice',
  points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 20 }],
  notches: [{ id: 'side-notch', edgeIndex: 1, t: .25, depthCm: .3 }],
})

test('unfold rejects alternate-base notch stations rather than silently relocating factory marks', () => {
  for (const t of ['0x1', '0X0', '0b1', '0B0', '0o1', '0O0']) {
    const piece = half()
    piece.notches[0].t = t
    assert.throws(() => unfoldDraftPiece(piece, 3), /Notch station/, t)
  }
})

test('unfold rejects alternate-base stations without mutating authored geometry or notches', () => {
  const piece = half()
  piece.notches[0].t = '0x1'
  const before = structuredClone(piece)
  assert.throws(() => unfoldDraftPiece(piece, 3), /Notch station/)
  assert.deepEqual(piece, before)
})

test('unfold keeps ordinary decimal and scientific station strings compatible', () => {
  for (const [t, expected] of [['0.25', .75], [' 2.5e-1 ', .75], ['.5', .5], ['1e0', 0]]) {
    const piece = half()
    piece.notches[0].t = t
    const result = unfoldDraftPiece(piece, 3)
    assert.equal(result.piece.notches[0].t, t)
    assert.equal(result.piece.notches[1].t, expected)
  }
})

test('unfold keeps numeric endpoints and missing-station default unchanged', () => {
  for (const [t, expected] of [[0, 1], [1, 0], [null, .5]]) {
    const piece = half()
    piece.notches[0].t = t
    assert.equal(unfoldDraftPiece(piece, 3).piece.notches[1].t, expected)
  }
})
