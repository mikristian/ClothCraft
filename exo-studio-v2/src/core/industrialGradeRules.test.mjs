import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INDUSTRIAL_GRADE_MODES as M,
  validateIndustrialGradeRule as validate,
  evaluateIndustrialGradeRule as evaluate,
  evaluateIndustrialGradeTable as table,
  convertIndustrialGradeRule as convert,
  roundTripIndustrialGradeRule as roundTrip,
} from './industrialGradeRules.js'

const sizeNames = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const p = (dx, dy) => ({ dx, dy })
const close = (actual, expected) => {
  assert.deepEqual(Object.keys(actual), Object.keys(expected))
  for (const size of Object.keys(expected)) {
    assert.ok(Math.abs(actual[size].dx - expected[size].dx) < 1e-12, `${size} dx`)
    assert.ok(Math.abs(actual[size].dy - expected[size].dy) < 1e-12, `${size} dy`)
  }
}
const pairsClose = (actual, expected) => {
  assert.equal(actual.length, expected.length)
  actual.forEach((value, i) => close({ [i]: value }, { [i]: expected[i] }))
}
const seed = {
  mode: M.SMALL_LARGE_INCREMENTAL,
  sizes: sizeNames,
  baseSize: 'M',
  steps: [p(0.4, -0.3), p(0.6, 0.2), p(0.8, 0.1), p(1.3, 0.6), p(1.7, -0.4)],
}

test('small-large incremental integrates nonuniform breaks with signed coordinates', () => {
  close(table(seed), {
    XS: p(-1, 0.1), S: p(-0.6, -0.2), M: p(0, 0),
    L: p(0.8, 0.1), XL: p(2.1, 0.7), XXL: p(3.8, 0.3),
  })
})

test('base-up-down incremental walks outward, including negative down steps', () => {
  const rule = convert(seed, M.BASE_UP_DOWN_INCREMENTAL)
  pairsClose(rule.down, [p(-0.6, -0.2), p(-0.4, 0.3)])
  pairsClose(rule.up, [p(0.8, 0.1), p(1.3, 0.6), p(1.7, -0.4)])
  close(table(rule), table(seed))
})

test('cumulative up/down stores absolute offsets and evaluates every named size', () => {
  const rule = convert(seed, M.BASE_UP_DOWN_CUMULATIVE)
  pairsClose(rule.down, [p(-0.6, -0.2), p(-1, 0.1)])
  pairsClose(rule.up, [p(0.8, 0.1), p(2.1, 0.7), p(3.8, 0.3)])
  close(table(rule), table(seed))
  assert.deepEqual(evaluate(rule, 'M'), p(0, 0))
  assert.deepEqual(evaluate(rule, 'XL'), p(2.1, 0.7))
})

test('all modes preserve the same offsets after multi-step conversions and round-trips', () => {
  for (const initialMode of Object.values(M)) {
    const initial = convert(seed, initialMode)
    for (const targetMode of Object.values(M)) {
      const converted = convert(initial, targetMode)
      close(table(converted), table(initial))
      close(table(roundTrip(initial, targetMode)), table(initial))
    }
  }
})

test('edge base at smallest or largest has an empty direction and still converts', () => {
  for (const baseSize of ['XS', 'XXL']) {
    const rule = { ...seed, baseSize }
    for (const mode of Object.values(M)) {
      const converted = convert(rule, mode)
      close(table(converted), table(rule))
      if (mode !== M.SMALL_LARGE_INCREMENTAL) {
        assert.equal(converted[baseSize === 'XS' ? 'down' : 'up'].length, 0)
      }
    }
  }
})

test('validation rejects malformed labels, modes, arity, and nonnumeric or nonfinite rules', () => {
  const invalid = [
    null, [], {},
    { ...seed, mode: 'arbitrary' },
    { ...seed, sizes: ['M', 'M', 'L'] },
    { ...seed, sizes: ['M', '', 'L'] },
    { ...seed, sizes: ['M', ' L'] },
    { ...seed, baseSize: 'missing' },
    { ...seed, steps: seed.steps.slice(1) },
    { ...seed, steps: [...seed.steps.slice(0, 4), p(NaN, 0)] },
    { ...seed, steps: [...seed.steps.slice(0, 4), p(Infinity, 0)] },
    { ...seed, steps: [...seed.steps.slice(0, 4), p('1', 0)] },
    { ...seed, steps: [...seed.steps.slice(0, 4), { dx: 1 }] },
    { ...seed, up: [] },
    { ...convert(seed, M.BASE_UP_DOWN_INCREMENTAL), steps: [] },
    { ...convert(seed, M.BASE_UP_DOWN_CUMULATIVE), down: [] },
  ]
  for (const value of invalid) assert.throws(() => validate(value), /invalid industrial grade rule/i)
  assert.throws(() => evaluate(seed, '7XL'), /unknown target size/i)
  assert.throws(() => convert(seed, 'nonsense'), /unknown destination mode/i)
})

test('validate and conversion copy mutable arrays and pairs', () => {
  const input = structuredClone(seed)
  const checked = validate(input)
  checked.sizes[0] = 'changed'
  checked.steps[0].dx = 100
  assert.deepEqual(input, seed)
  const converted = convert(input, M.BASE_UP_DOWN_INCREMENTAL)
  converted.up[0].dx = 100
  assert.deepEqual(table(input), table(seed))
})

test('overflow from cumulative arithmetic is rejected', () => {
  const huge = { mode: M.BASE_UP_DOWN_INCREMENTAL, sizes: ['S', 'M', 'L', 'XL'], baseSize: 'S', down: [], up: [p(1e308, 0), p(1e308, 0), p(0, 0)] }
  assert.throws(() => table(huge), /finite numeric range/i)
})
