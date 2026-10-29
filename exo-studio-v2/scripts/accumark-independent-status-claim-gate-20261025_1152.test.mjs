import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assessAccuMarkAcceptanceLedger as assess } from './accumark-acceptance-progress-20261023.mjs'

const fixture = () => JSON.parse(readFileSync(new URL('../docs/research/swarm-20261023/parity-ledger.json', import.meta.url), 'utf8'))

for (const status of ['INDEPENDENT_VERIFIED', 'VERIFIED_AGAINST_INDEPENDENT_ORACLE']) {
  test(`${status} without oracle evidence cannot report independently verified acceptance`, () => {
    const ledger = fixture()
    for (const row of ledger.requirements) {
      row.status = status
      row.evidence = []
    }
    const before = structuredClone(ledger)
    const result = assess(ledger)
    assert.equal(result.independentStatusClaimCount, 76)
    assert.equal(result.independentlyVerified, 0)
    assert.equal(result.completion100Percent, false)
    assert.ok(result.issues.some(issue => issue.id === 'A01' && issue.code === 'INDEPENDENT_STATUS_WITHOUT_INDEPENDENT_ORACLE'))
    assert.ok(result.issues.some(issue => issue.code === 'INDEPENDENT_STATUS_ATTESTATION_UNVERIFIED'))
    assert.deepEqual(ledger, before)
  })
}

test('self-declared oracle names and artifact paths remain unverified claims', () => {
  const ledger = fixture()
  ledger.requirements[0].status = 'INDEPENDENT_VERIFIED'
  ledger.requirements[0].evidence = [{ artifact: 'unverified.json', independentOracle: 'self-declared lab' }]
  ledger.requirements[1].status = 'VERIFIED_AGAINST_INDEPENDENT_ORACLE'
  ledger.requirements[1].evidence = [{ artifact: 'unverified.json', independentOracle: 'self-declared lab' }]
  const result = assess(ledger)
  assert.equal(result.independentStatusClaimCount, 2)
  assert.equal(result.independentlyVerified, 0)
  assert.equal(result.issues.some(issue => issue.code === 'INDEPENDENT_STATUS_WITHOUT_INDEPENDENT_ORACLE'), false)
  assert.ok(result.issues.some(issue => issue.code === 'INDEPENDENT_STATUS_ATTESTATION_UNVERIFIED'))
})

test('inherited artifact and oracle properties cannot satisfy independent evidence checks', () => {
  const ledger = fixture()
  ledger.requirements[0].status = 'INDEPENDENT_VERIFIED'
  ledger.requirements[0].evidence = [Object.create({ artifact: 'inherited.json', independentOracle: 'inherited witness' })]
  ledger.requirements[1].status = 'VERIFIED_AGAINST_INDEPENDENT_ORACLE'
  ledger.requirements[1].evidence = [{ artifact: 'owned.json', independentOracle: 'owned witness' }]
  const result = assess(ledger)
  assert.equal(result.independentlyVerified, 0)
  assert.ok(result.issues.some(issue => issue.id === 'A01' && issue.code === 'INDEPENDENT_STATUS_WITHOUT_INDEPENDENT_ORACLE'))
  assert.equal(result.issues.some(issue => issue.id === 'A02' && issue.code === 'INDEPENDENT_STATUS_WITHOUT_INDEPENDENT_ORACLE'), false)
})

test('unmodified acceptance ledger still reports no independently verified rows', () => {
  const result = assess(fixture())
  assert.equal(result.independentStatusClaimCount, 0)
  assert.equal(result.independentlyVerified, 0)
  assert.equal(result.factoryAcceptedPercent, 0)
  assert.equal(result.issues.some(issue => issue.code === 'INDEPENDENT_STATUS_ATTESTATION_UNVERIFIED'), false)
})
