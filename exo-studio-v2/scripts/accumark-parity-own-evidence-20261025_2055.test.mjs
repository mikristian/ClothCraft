import test from 'node:test'
import assert from 'node:assert/strict'
import {createInitialLedger, validateLedger} from './accumark-parity-ledger-20261023.mjs'

function claim(evidence, approval) {
  const ledger = createInitialLedger()
  const row = ledger.requirements[0]
  row.status = 'FACTORY_ACCEPTED'
  row.evidence = [evidence]
  row.approval = approval
  return ledger
}

const evidence = () => ({artifact:'fixture.dxf', independentOracle:'named external oracle'})
const approval = () => ({operator:'operator', site:'factory', date:'2026-10-25'})

test('legacy factory claims cannot borrow evidence from prototype', () => {
  const inherited = Object.create({artifact:'fixture.dxf', independentOracle:'named oracle'})
  assert.throws(() => validateLedger(claim(inherited, approval())), /independent oracle/i)
  assert.throws(() => validateLedger(claim({artifact:'fixture.dxf', independentOracle:'\t '}, approval())), /independent oracle/i)
  assert.throws(() => validateLedger(claim({artifact:' ', independentOracle:'named oracle'}, approval())), /independent oracle/i)
})

test('legacy factory claims require own, nonblank operator/site/date', () => {
  const inherited = Object.create({operator:'operator', site:'factory', date:'2026-10-25'})
  assert.throws(() => validateLedger(claim(evidence(), inherited)), /operator, site and date/i)
  for (const key of ['operator', 'site', 'date']) {
    const bad = approval()
    bad[key] = ' \t '
    assert.throws(() => validateLedger(claim(evidence(), bad)), /operator, site and date/i)
  }
})

test('legacy claim evidence and approvals reject accessors without executing getters', () => {
  let invoked = 0
  const badEvidence = evidence()
  Object.defineProperty(badEvidence, 'independentOracle', {enumerable:true, get() {invoked++; return 'fake' }})
  assert.throws(() => validateLedger(claim(badEvidence, approval())), /independent oracle/i)
  const badApproval = approval()
  Object.defineProperty(badApproval, 'operator', {enumerable:true, get() {invoked++; return 'fake' }})
  assert.throws(() => validateLedger(claim(evidence(), badApproval)), /operator, site and date/i)
  assert.equal(invoked, 0)
})

test('row-level inherited or accessor evidence/approval cannot manufacture claims', () => {
  let invoked = 0
  const inherited = claim(evidence(), approval())
  const row = inherited.requirements[0]
  delete row.evidence
  Object.setPrototypeOf(row, {evidence:[evidence()]})
  assert.throws(() => validateLedger(inherited), /evidence must be an own data array/i)

  const getterEvidence = claim(evidence(), approval())
  Object.defineProperty(getterEvidence.requirements[0], 'evidence', {
    enumerable:true, get() {invoked++; return [evidence()]},
  })
  assert.throws(() => validateLedger(getterEvidence), /evidence must be an own data array/i)

  const getterApproval = claim(evidence(), approval())
  Object.defineProperty(getterApproval.requirements[0], 'approval', {
    enumerable:true, get() {invoked++; return approval()},
  })
  assert.throws(() => validateLedger(getterApproval), /operator, site and date/i)

  const accessorIndex = claim(evidence(), approval())
  Object.defineProperty(accessorIndex.requirements[0].evidence, '0', {
    enumerable:true, get() {invoked++; return evidence()},
  })
  assert.throws(() => validateLedger(accessorIndex), /own data entries/i)
  assert.equal(invoked, 0)
})

test('valid explicit legacy claims remain claims and never become factory accepted', () => {
  const result = validateLedger(claim(evidence(), approval()))
  assert.equal(result.count.FACTORY_ACCEPTED, 1)
  assert.equal(result.complete, false)
  assert.equal(validateLedger(createInitialLedger()).complete, false)
})
