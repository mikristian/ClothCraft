import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateNativeDraftFormulas20261023 as evaluate } from './nativeParametricFormula20261023.js'

test('evaluates named references and recurrence in dependency order without mutating source', () => {
  const input = Object.freeze({ measurements: Object.freeze({
    hem: Object.freeze({formula:'(chest + ease) / 2'}),
    chest: Object.freeze({formula:'base + adjustment'}),
    adjustment: Object.freeze({formula:'step * 2'}),
    step: 10,
    base: Object.freeze({valueMm:900}),
    ease: 40,
  }) })
  const result = evaluate(input)
  assert.equal(result.ok,true,JSON.stringify(result))
  assert.equal(result.valuesMm.hem,480)
  assert.deepEqual(result.dependencyOrder,['base','step','adjustment','chest','ease','hem'])
  assert.equal(result.manufacturingApproved,false)
  assert.equal(Object.isFrozen(result.valuesMm),true)
  assert.equal(Object.isFrozen(result.dependencyOrder),true)
  assert.equal(input.measurements.chest.formula,'base + adjustment')
})

test('supports overrides with consistent graph recalculation', () => {
  const measurements = {a:100,b:{formula:'a * 2'},c:{formula:'b + a'}}
  const first=evaluate({measurements})
  const second=evaluate({measurements,overrides:{a:150}})
  assert.deepEqual([first.valuesMm.b,first.valuesMm.c],[200,300])
  assert.deepEqual([second.valuesMm.b,second.valuesMm.c],[300,450])
  assert.equal(measurements.a,100)
})

test('rejects self recurrence, multi-node cycles and missing references', () => {
  for (const measurements of [
    {a:{formula:'a + 1'}},
    {a:{formula:'b+1'},b:{formula:'c+1'},c:{formula:'a+1'}},
  ]) {
    const result=evaluate({measurements})
    assert.equal(result.ok,false)
    assert.match(result.reason,/Circular/)
    assert.equal(Object.keys(result.valuesMm).length,0)
  }
  assert.match(evaluate({measurements:{a:{formula:'b+1'}}}).reason,/Missing measurement reference/)
})

test('rejects division by zero, arithmetic overflow and nonfinite inputs', () => {
  for (const measurements of [
    {a:{formula:'4/(2-2)'}},
    {a:{formula:'1000000000 * 1000000000'}},
    {a:Infinity},
    {a:{valueMm:NaN}},
  ]) assert.equal(evaluate({measurements}).ok,false)
})

test('prevents executable syntax, malformed identifiers and mismatched parentheses', () => {
  for (const formula of ['process.exit(0)','Math.abs(1)','a[0]','1 ** 2','1;2','1 + (2','1 2','1e309','']) {
    assert.equal(evaluate({measurements:{x:{formula}}}).ok,false,formula)
  }
  for (const name of ['bad-name','9bad','__proto__','a'.repeat(65)]) {
    const measurements=Object.create(null);measurements[name]=12
    assert.equal(evaluate({measurements}).ok,false,name)
  }
})

test('enforces formula parsing and graph complexity limits', () => {
  assert.equal(evaluate({measurements:{a:{formula:'('.repeat(70)+'1'+')'.repeat(70)}}}).ok,false)
  assert.equal(evaluate({measurements:{a:{formula:Array(520).fill('1').join('+')}}}).ok,false)
  const measurements=Object.create(null)
  for (let i=0;i<513;i++) measurements[`v${i}`]=1
  assert.equal(evaluate({measurements}).ok,false)
})
