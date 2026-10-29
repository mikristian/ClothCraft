import test from 'node:test'
import assert from 'node:assert/strict'
import {createInitialLedger, validateLedger, report} from './accumark-parity-ledger-20261023.mjs'

test('legacy ledger rejects accessor schema and requirements without invoking getters', () => {
  let invoked = 0
  for (const key of ['schema', 'requirements']) {
    const ledger = createInitialLedger()
    Object.defineProperty(ledger, key, {enumerable: true, get() { invoked++; return key === 'schema' ? 'exo.accumark.acceptance.v1' : createInitialLedger().requirements }})
    assert.throws(() => validateLedger(ledger), /invalid ledger schema/i)
  }
  assert.equal(invoked, 0)
})

test('legacy validator rejects accessor-backed row identity and status fields', () => {
  let invoked = 0
  for (const key of ['id', 'criterion', 'lane', 'status']) {
    const ledger = createInitialLedger()
    const original = ledger.requirements[0][key]
    Object.defineProperty(ledger.requirements[0], key, {enumerable: true, get() { invoked++; return original }})
    assert.throws(() => validateLedger(ledger), /acceptance|drift|status|lane|id/i)
  }
  assert.equal(invoked, 0)
})

test('legacy validator rejects accessor array entries without executing getters', () => {
  let invoked = 0
  const ledger = createInitialLedger()
  Object.defineProperty(ledger.requirements, '0', {enumerable: true, get() { invoked++; return createInitialLedger().requirements[0] }})
  assert.throws(() => validateLedger(ledger), /76|own data|requirements/i)
  assert.equal(invoked, 0)
})

test('legacy validator rejects Proxy root, row, requirements, and evidence without traps', () => {
  let traps = 0
  const wrap = value => new Proxy(value, {get(target, key) {traps++; return Reflect.get(target, key)}, getPrototypeOf(target) {traps++; return Reflect.getPrototypeOf(target)}, getOwnPropertyDescriptor(target, key) {traps++; return Reflect.getOwnPropertyDescriptor(target, key)}})
  for (const location of ['root', 'row', 'requirements', 'evidence']) {
    const ledger = createInitialLedger()
    if (location === 'root') assert.throws(() => validateLedger(wrap(ledger)), /schema|requirements/i)
    else {
      if (location === 'row') ledger.requirements[0] = wrap(ledger.requirements[0])
      if (location === 'requirements') ledger.requirements = wrap(ledger.requirements)
      if (location === 'evidence') ledger.requirements[0].evidence = wrap([])
      assert.throws(() => validateLedger(ledger), /schema|requirements|id|evidence/i)
    }
  }
  assert.equal(traps, 0)
})

test('normal legacy baseline still reports claims without granting factory acceptance', () => {
  const result = report(createInitialLedger())
  assert.equal(result.total, 76)
  assert.equal(result.complete, false)
  assert.equal(result.count.FACTORY_ACCEPTED, 0)
  assert.equal(result.categorized.reduce((sum, row) => sum + row.factoryAccepted, 0), 0)
})
