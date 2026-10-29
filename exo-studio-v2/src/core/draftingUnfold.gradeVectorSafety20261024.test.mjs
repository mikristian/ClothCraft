import assert from 'node:assert/strict'
import { test } from 'node:test'
import { unfoldDraftPiece } from './draftingUnfold.js'

const half = (dxPerSize, dyPerSize = 0) => ({
  id: 'half-grade-guard', name: 'Half panel',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0, gradeRule: { enabled: true, dxPerSize, dyPerSize } },
    { x: 10, y: 20 },
    { x: 0, y: 20 },
  ],
})

test('unfold rejects malformed authored grade deltas before mirroring', () => {
  for (const delta of ['invalid', NaN, Infinity, -Infinity, {}, [], true]) {
    const piece = half(delta)
    const before = structuredClone(piece)
    assert.throws(() => unfoldDraftPiece(piece, 3), /grade|grading/i, String(delta))
    assert.deepEqual(piece, before)
  }
})

test('unfold rejects alternate-base grade measurements instead of silently coercing them', () => {
  for (const delta of ['0x10', '0b10', '0o10']) {
    const piece = half(delta)
    const before = structuredClone(piece)
    assert.throws(() => unfoldDraftPiece(piece, 3), /grade|grading/i, delta)
    assert.deepEqual(piece, before)
  }
})

test('unfold also validates grading on retained fold endpoints', () => {
  const piece = half(2, 3)
  piece.points[0].gradeRule = { enabled: true, dxPerSize: 'not-a-distance', dyPerSize: 0 }
  const before = structuredClone(piece)
  assert.throws(() => unfoldDraftPiece(piece, 3), /grade|grading/i)
  assert.deepEqual(piece, before)
})

test('unfold rejects finite source grade vectors whose reflected arithmetic overflows', () => {
  const piece = half(1e308, 1e308)
  const before = structuredClone(piece)
  assert.throws(() => unfoldDraftPiece(piece, 3), /grade|grading/i)
  assert.deepEqual(piece, before)
})

test('unfold retains ordinary numeric and decimal grade rules with finite mirrored vectors', () => {
  for (const [dx, dy] of [[2, 3], ['1.5', '2e0'], [undefined, null]]) {
    const piece = half(dx, dy)
    const before = structuredClone(piece)
    const unfolded = unfoldDraftPiece(piece, 3)
    const grade = unfolded.piece.points[5].gradeRule
    assert.ok(Math.abs(grade.dxPerSize + Number(dx ?? 0)) < 1e-12)
    assert.ok(Math.abs(grade.dyPerSize - Number(dy ?? 0)) < 1e-12)
    assert.ok(Number.isFinite(grade.dxPerSize) && Number.isFinite(grade.dyPerSize))
    assert.deepEqual(piece, before)
  }
})
