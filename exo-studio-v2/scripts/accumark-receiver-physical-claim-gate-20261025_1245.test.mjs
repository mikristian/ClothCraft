import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assessAccuMarkAcceptanceLedger as assess } from './accumark-acceptance-progress-20261023.mjs'

const fixture = () => JSON.parse(readFileSync(new URL('../docs/research/swarm-20261023/parity-ledger.json', import.meta.url), 'utf8'))

test('fabricated CAD and physical approval metadata is only an unverified status claim', () => {
  const ledger = fixture()
  ledger.industrialRoundTrip = { approved: true, receiver: 'unverified CAD', artifact: 'unverified.dxf' }
  ledger.physicalSample = { approved: true, site: 'unverified factory', operator: 'unverified operator', artifact: 'unverified-sample.pdf' }
  const before = structuredClone(ledger)
  const result = assess(ledger)
  assert.equal(result.receiverStatusClaimed, true)
  assert.equal(result.physicalStatusClaimed, true)
  assert.equal(result.receiverAccepted, false)
  assert.equal(result.physicalAccepted, false)
  assert.equal(result.externalSemanticAuditVerified, false)
  assert.equal(result.completion100Percent, false)
  assert.ok(result.issues.some(issue => issue.code === 'CAD_RECEIVER_ROUNDTRIP_UNVERIFIED'))
  assert.ok(result.issues.some(issue => issue.code === 'PHYSICAL_SAMPLE_UNVERIFIED'))
  assert.deepEqual(ledger, before)
})

test('empty or malformed approval fields cannot even count as status claims', () => {
  const ledger = fixture()
  ledger.industrialRoundTrip = { approved: true, receiver: '  ', artifact: 'unverified.dxf' }
  ledger.physicalSample = { approved: true, site: 'factory', operator: '', artifact: 'sample.pdf' }
  const result = assess(ledger)
  assert.equal(result.receiverStatusClaimed, false)
  assert.equal(result.physicalStatusClaimed, false)
  assert.equal(result.receiverAccepted, false)
  assert.equal(result.physicalAccepted, false)
})

test('real unchanged ledger still reports zero accepted CAD and physical gates', () => {
  const result = assess(fixture())
  assert.equal(result.receiverStatusClaimed, false)
  assert.equal(result.physicalStatusClaimed, false)
  assert.equal(result.receiverAccepted, false)
  assert.equal(result.physicalAccepted, false)
  assert.equal(result.factoryAcceptedPercent, 0)
})
