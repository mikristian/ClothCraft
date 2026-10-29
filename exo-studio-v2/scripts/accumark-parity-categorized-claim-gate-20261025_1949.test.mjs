import test from 'node:test'
import assert from 'node:assert/strict'
import {createInitialLedger, report} from './accumark-parity-ledger-20261023.mjs'

const claimRows = (ledger, n) => {
  for (const row of ledger.requirements.slice(0, n)) {
    row.status = 'FACTORY_ACCEPTED'
    row.evidence = [{artifact: `unverified-${row.id}.dxf`, independentOracle: 'unverified assertion'}]
    row.approval = {operator: 'unverified operator', site: 'unverified site', date: '2026-10-25'}
  }
  return ledger
}

test('legacy per-family factoryAccepted cannot count 76 editable factory status claims', () => {
  const ledger = claimRows(createInitialLedger(), 76)
  const original = structuredClone(ledger)
  const result = report(ledger)
  assert.equal(result.complete, false)
  assert.equal(result.count.FACTORY_ACCEPTED, 76, 'raw status counts are retained for migration')
  assert.equal(result.categorized.reduce((sum, row) => sum + row.factoryStatusClaimCount, 0), 76)
  assert.equal(result.categorized.reduce((sum, row) => sum + row.factoryAccepted, 0), 0)
  for (const row of result.categorized) {
    assert.equal(row.factoryStatusClaimCount, row.required)
    assert.equal(row.factoryAccepted, 0)
  }
  assert.deepEqual(ledger, original, 'report must not mutate evidence ledger')
})

test('partial factory claims are reported as claims, never per-family approvals', () => {
  const ledger = claimRows(createInitialLedger(), 17)
  const result = report(ledger)
  assert.equal(result.categorized.reduce((sum, row) => sum + row.factoryStatusClaimCount, 0), 17)
  assert.equal(result.categorized.reduce((sum, row) => sum + row.factoryAccepted, 0), 0)
  assert.equal(result.categorized.reduce((sum, row) => sum + row.assessed, 0), 17)
})

test('baseline legacy family report remains 76 required and zero accepted', () => {
  const result = report(createInitialLedger())
  assert.equal(result.categorized.reduce((sum, row) => sum + row.required, 0), 76)
  assert.equal(result.categorized.reduce((sum, row) => sum + row.factoryStatusClaimCount, 0), 0)
  assert.equal(result.categorized.reduce((sum, row) => sum + row.factoryAccepted, 0), 0)
})
