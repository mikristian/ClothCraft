import test from 'node:test'
import assert from 'node:assert/strict'
import { draftingSplitFractions } from './draftingSplit.js'

const piece = {
  points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 12 }, { x: 0, y: 12 }],
  curves: {},
}

test('uniform split rejects hexadecimal and binary count representations', () => {
  for (const count of ['0x4', '0b100', '0o4']) {
    assert.throws(() => draftingSplitFractions(piece, 0, { method: 'uniform', count }), /2 to 12/)
  }
})

test('length and ratio splits reject nondecimal representations and coercible objects', () => {
  for (const lengthCm of ['0x5', '0b101', '0o5', null, [5]]) {
    assert.throws(() => draftingSplitFractions(piece, 0, { method: 'length', lengthCm }), /finite edge distance/)
  }
  for (const ratioPercent of ['0x1e', '0b11110', '0o36', null, [30]]) {
    assert.throws(() => draftingSplitFractions(piece, 0, { method: 'ratio', ratioPercent }), /finite edge percentage/)
  }
})

test('ordinary decimal strings, numbers, and scientific notation preserve split positions', () => {
  assert.deepEqual(draftingSplitFractions(piece, 0, { method: 'uniform', count: ' 4 ' }), [.25, .5, .75])
  assert.deepEqual(draftingSplitFractions(piece, 0, { method: 'length', lengthCm: '5e0' }), [.25])
  assert.deepEqual(draftingSplitFractions(piece, 0, { method: 'ratio', ratioPercent: ' 30.0 ' }), [.3])
  assert.deepEqual(draftingSplitFractions(piece, 0, { method: 'length', lengthCm: 5 }), [.25])
  assert.deepEqual(draftingSplitFractions(piece, 0, { method: 'ratio', ratioPercent: 30 }), [.3])
})

test('drafting split input validation never mutates source geometry', () => {
  const before = structuredClone(piece)
  assert.throws(() => draftingSplitFractions(piece, 0, { method: 'ratio', ratioPercent: '0x1e' }), /finite edge percentage/)
  assert.deepEqual(piece, before)
})
