import test from 'node:test'
import assert from 'node:assert/strict'
import {createInitialLedger, validateLedger, report} from './accumark-parity-ledger-20261023.mjs'

test('legacy parity CLI cannot self-certify all 76 factory gates from editable ledger assertions', () => {
  const ledger = createInitialLedger()
  for (const row of ledger.requirements) {
    row.status = 'FACTORY_ACCEPTED'
    row.evidence = [{artifact: `claimed-${row.id}.dxf`, independentOracle: 'unverified text claim'}]
    row.approval = {operator: 'claimed operator', site: 'claimed site', date: '2026-10-25'}
  }
  ledger.industrialRoundTrip = {approved: true, receiver: 'claimed receiver', artifact: 'claimed-roundtrip.dxf'}
  ledger.physicalSample = {approved: true, site: 'claimed site', operator: 'claimed operator', artifact: 'claimed-sample.pdf'}
  const before = structuredClone(ledger)
  const checked = validateLedger(ledger)
  const printed = report(ledger)
  assert.equal(checked.count.FACTORY_ACCEPTED, 76, 'untrusted row status claims are still counted')
  assert.equal(checked.complete, false, 'editable assertions cannot establish external factory acceptance')
  assert.equal(printed.complete, false)
  assert.doesNotMatch(printed.gateLabel, /^100% FACTORY ACCEPTED$/)
  assert.deepEqual(ledger, before, 'inspection must not rewrite the acceptance ledger')
})
