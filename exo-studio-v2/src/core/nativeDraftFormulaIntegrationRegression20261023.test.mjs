import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateNativeDraftFormulas20261023 as formulas } from './nativeParametricFormula20261023.js'
import { evaluateNativeDraftWorksheet20261023 as worksheet } from './nativeDraftWorksheet20261023.js'

test('forward worksheet references follow deterministic dependency ordering and preserve source', () => {
  const input = Object.freeze({ worksheet: 'quarter = (chest + ease) / 4\nease = 40\nchest = 920', expression: 'quarter - 5' })
  const first = worksheet(input)
  const second = worksheet(input)
  assert.equal(first.ok, true)
  assert.equal(first.valueMm, 235)
  assert.deepEqual(first.dependencyOrder, second.dependencyOrder)
  assert.ok(first.dependencyOrder.indexOf('chest') < first.dependencyOrder.indexOf('quarter'))
  assert.ok(first.dependencyOrder.indexOf('quarter') < first.dependencyOrder.indexOf('_distance'))
  assert.equal(first.manufacturingApproved, false)
  assert.equal(input.expression, 'quarter - 5')
})

test('measurement overrides recalculate transitive references without input mutation', () => {
  const measurements = Object.freeze({ finished: Object.freeze({formula:'half + allowance'}), half: Object.freeze({formula:'base / 2'}), base: 200, allowance: 12 })
  const overrides = Object.freeze({ base: 240 })
  const original = formulas({ measurements })
  const revised = formulas({ measurements, overrides })
  assert.equal(original.valuesMm.finished, 112)
  assert.equal(revised.valuesMm.finished, 132)
  assert.equal(measurements.base, 200)
  assert.equal(overrides.base, 240)
})

test('invalid override values and forbidden identifiers fail closed', () => {
  for (const overrides of [{ missing: 1 }, { a: NaN }, { a: Infinity }, { a: '4' }, { constructor: 3 }]) {
    const result = formulas({ measurements: { a: 4 }, overrides })
    assert.equal(result.ok, false)
    assert.equal(result.manufacturingApproved, false)
    assert.equal(Object.keys(result.valuesMm).length, 0)
    assert.ok(result.issues.length)
  }
})

test('worksheet rejects propagation of invalid arithmetic and accepts exact boundary', () => {
  assert.equal(worksheet({ worksheet: 'part = 10 / (3 - 3)', expression: 'part' }).ok, false)
  assert.equal(worksheet({ worksheet: 'part = 2500', expression: 'part * 2' }).valueMm, 5000)
  assert.equal(worksheet({ worksheet: 'part = 2500', expression: 'part * 2 + 0.001' }).ok, false)
})
