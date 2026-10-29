import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateIndustrialGradeRule,
  evaluateIndustrialGradeTable,
  convertIndustrialGradeRule,
  INDUSTRIAL_GRADE_MODES as M,
} from './industrialGradeRules.js'

const seed = () => ({
  mode: M.SMALL_LARGE_INCREMENTAL,
  sizes: ['S', 'M', 'L'],
  baseSize: 'M',
  steps: [{dx: 1, dy: 2}, {dx: 3, dy: 4}],
})

test('G08 rejects unexpected source rule metadata rather than silently dropping stale fields', () => {
  for (const extra of [
    {revision: 'stale'},
    {ruleTableId: 'missing'},
    {up: undefined},
    {down: undefined},
  ]) {
    assert.throws(() => validateIndustrialGradeRule({...seed(), ...extra}), /invalid industrial grade rule/i)
    assert.throws(() => evaluateIndustrialGradeTable({...seed(), ...extra}), /invalid industrial grade rule/i)
  }
})

test('G08 rejects unknown per-break fields rather than discarding authored grade data', () => {
  for (const extra of [{ruleId: 'old'}, {deltaZ: 10}, {dyPerSize: 100}]) {
    const input = seed()
    input.steps[0] = {...input.steps[0], ...extra}
    assert.throws(() => validateIndustrialGradeRule(input), /invalid industrial grade rule/i)
    assert.throws(() => convertIndustrialGradeRule(input, M.BASE_UP_DOWN_CUMULATIVE), /invalid industrial grade rule/i)
  }
})

test('G08 rejects inherited rule configuration and inherited grade vector values', () => {
  const inherited = Object.assign(Object.create({mode: M.SMALL_LARGE_INCREMENTAL, sizes: ['S','M','L'], baseSize: 'M'}), {
    steps: seed().steps,
  })
  assert.throws(() => validateIndustrialGradeRule(inherited), /invalid industrial grade rule/i)
  const inheritedVector = Object.assign(Object.create({dx: 1}), {dy: 2})
  assert.throws(() => validateIndustrialGradeRule({...seed(), steps: [inheritedVector, {dx: 3, dy: 4}]}), /invalid industrial grade rule/i)
})

test('G08 rejects sparse size lines and sparse grade-break arrays before synthetic sizes can appear', () => {
  const sparseSizes = seed()
  sparseSizes.sizes = ['S', , 'L']
  sparseSizes.baseSize = 'S'
  assert.throws(() => validateIndustrialGradeRule(sparseSizes), /invalid industrial grade rule/i)
  assert.throws(() => evaluateIndustrialGradeTable(sparseSizes), /invalid industrial grade rule/i)
  const sparseSteps = seed()
  sparseSteps.steps = [{dx: 1, dy: 2}, ,]
  assert.throws(() => validateIndustrialGradeRule(sparseSteps), /invalid industrial grade rule/i)
  const cumulative = convertIndustrialGradeRule(seed(), M.BASE_UP_DOWN_CUMULATIVE)
  cumulative.up = [,]
  assert.throws(() => validateIndustrialGradeRule(cumulative), /invalid industrial grade rule/i)
})

test('G08 rejects inherited array slots and accessor data without executing the getter', () => {
  const inherited = seed()
  inherited.steps = [, {dx: 3, dy: 4}]
  Object.setPrototypeOf(inherited.steps, Object.assign(Object.create(Array.prototype), {'0': {dx: 1, dy: 2}}))
  assert.throws(() => validateIndustrialGradeRule(inherited), /invalid industrial grade rule/i)
  let executed = false
  const getterRule = seed()
  Object.defineProperty(getterRule, 'mode', {enumerable: true, get() {executed = true; return M.SMALL_LARGE_INCREMENTAL}})
  assert.throws(() => validateIndustrialGradeRule(getterRule), /invalid industrial grade rule/i)
  assert.equal(executed, false)
})

test('G08 preserves complete canonical rules including null-prototype records', () => {
  const input = seed()
  const expected = {S: {dx: -1, dy: -2}, M: {dx: 0, dy: 0}, L: {dx: 3, dy: 4}}
  assert.deepEqual(evaluateIndustrialGradeTable(input), expected)
  const nullProto = Object.assign(Object.create(null), input)
  nullProto.steps = input.steps.map(step => Object.assign(Object.create(null), step))
  assert.deepEqual(evaluateIndustrialGradeTable(nullProto), expected)
  assert.deepEqual(evaluateIndustrialGradeTable(convertIndustrialGradeRule(nullProto, M.BASE_UP_DOWN_INCREMENTAL)), expected)
  assert.deepEqual(input, seed())
})
