import test from 'node:test'
import assert from 'node:assert/strict'
import { quadraticAtLengthFraction } from './draftingPrecision.js'

const a = { x: 0, y: 0 }
const control = { x: 10, y: 10 }
const b = { x: 20, y: 0 }

test('curve arc-length stations reject hexadecimal, binary and octal text', () => {
  for (const station of ['0x1', '0X0', '0b1', '0B0', '0o1', '0O0', '+0x1', '0x0.8']) {
    assert.throws(() => quadraticAtLengthFraction(a, control, b, station),
      /Invalid curve length fraction/, `station ${station} must not become a physical notch location`)
  }
})

test('curve arc-length stations retain decimal and exponent notation', () => {
  const middle = quadraticAtLengthFraction(a, control, b, 0.5)
  for (const station of ['0.5', '5e-1', ' 0.50 ', '.5', '5E-1']) {
    assert.deepEqual(quadraticAtLengthFraction(a, control, b, station), middle)
  }
  assert.deepEqual(quadraticAtLengthFraction(a, control, b, '-1').point, a)
  assert.deepEqual(quadraticAtLengthFraction(a, control, b, '2').point, b)
})

test('invalid curve arc-length stations do not mutate authored geometry', () => {
  const original = structuredClone([a, control, b])
  assert.throws(() => quadraticAtLengthFraction(a, control, b, '0b1'), /Invalid curve length fraction/)
  assert.deepEqual([a, control, b], original)
})
