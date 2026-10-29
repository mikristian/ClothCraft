import test from 'node:test'
import assert from 'node:assert/strict'
import {createInitialLedger,validateLedger,report} from './accumark-parity-ledger-20261023.mjs'

test('all 76 physical AccuMark parity checks are present without invented factory approval',()=>{
 const ledger=createInitialLedger()
 const check=validateLedger(ledger)
 assert.equal(check.total,76)
 assert.equal(check.complete,false)
 assert.equal(check.count.FACTORY_ACCEPTED,0)
 assert.equal(check.count.UNASSESSED,76)
 assert.equal(report(ledger).categorized.reduce((a,b)=>a+b.required,0),76)
})
test('missing, stale, duplicated or renamed acceptance claims reject',()=>{
 const ledger=createInitialLedger()
 const one=structuredClone(ledger);one.requirements.pop()
 assert.throws(()=>validateLedger(one),/all 76/)
 const two=structuredClone(ledger);two.requirements[0]=structuredClone(two.requirements[1])
 assert.throws(()=>validateLedger(two),/duplicate/)
 const three=structuredClone(ledger);three.requirements[0].criterion='already finished'
 assert.throws(()=>validateLedger(three),/drift/)
})
test('no status can self-certify a whole app without oracle, operator, release and physical sample',()=>{
 const ledger=createInitialLedger()
 ledger.requirements[0].status='FACTORY_ACCEPTED'
 assert.throws(()=>validateLedger(ledger),/independent oracle/)
 ledger.requirements[0].evidence=[{artifact:'receiver-report.json',independentOracle:'Licensed Gerber AccuMark'}]
 assert.throws(()=>validateLedger(ledger),/operator/)
 ledger.requirements[0].approval={operator:'Pattern engineer',site:'Independent garment factory',date:'2026-10-23'}
 assert.equal(validateLedger(ledger).complete,false)
})
