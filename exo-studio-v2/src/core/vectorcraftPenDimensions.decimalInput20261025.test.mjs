import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePenDimension, parsePenAngle, dimensionedPenPoint } from './vectorcraftPenDimensions20261025.js'

test('Pen lengths reject alternate-base numeric strings instead of silently converting them', () => {
  for (const value of ['0x64', '0X10', '0b1010', '0B10', '0o20', '0O7']) {
    assert.throws(() => parsePenDimension(value, 'mm'), /positive edge length|decimal/i, value)
  }
})

test('Pen angles reject alternate-base numeric strings instead of silently rotating patterns', () => {
  for (const value of ['0x5A', '0X2D', '0b10', '0B1', '0o12', '0O7']) {
    assert.throws(() => parsePenAngle(value), /finite angle|decimal/i, value)
  }
})

test('Pen measurements reject coercible objects without executing their conversion hooks', () => {
  let calls = 0
  const coerced = { toString() { calls++; return '90' }, valueOf() { calls++; return 90 } }
  assert.throws(() => parsePenDimension([100], 'mm'), /positive edge length/)
  assert.throws(() => parsePenAngle(coerced), /finite angle/)
  assert.equal(calls, 0)
})

test('decimal and exponent notation retain exact Pen length and angle behavior', () => {
  assert.equal(parsePenDimension(' 1e2 ', 'mm'), .1)
  assert.equal(parsePenDimension('.5', 'cm'), .005)
  assert.equal(parsePenAngle('9e1'), 90)
  assert.equal(parsePenAngle(' -45.5 '), -45.5)
  assert.equal(parsePenDimension('', 'mm'), null)
  assert.equal(parsePenAngle(''), null)
})

test('rejected Pen measurements preserve authored anchor and cursor geometry', () => {
  const anchor = Object.freeze([0.2, 0.3])
  const cursor = Object.freeze([0.4, 0.5])
  assert.throws(() => dimensionedPenPoint(anchor, cursor, { length: '0x64', angle: '90', unit: 'mm' }))
  assert.throws(() => dimensionedPenPoint(anchor, cursor, { length: '100', angle: '0x5A', unit: 'mm' }))
  assert.deepEqual(anchor, [0.2, 0.3])
  assert.deepEqual(cursor, [0.4, 0.5])
})
