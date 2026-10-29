import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {assessAccuMarkAcceptanceLedger} from './accumark-acceptance-progress-20261023.mjs'

const fixture=()=>JSON.parse(readFileSync(new URL('../docs/research/swarm-20261023/parity-ledger.json',import.meta.url),'utf8'))
const hasIssue=(report,id,code)=>report.issues.some(issue=>issue.id===id&&issue.code===code)

test('inherited factory evidence and approval cannot satisfy claim validation',()=>{
  const ledger=fixture()
  const row=ledger.requirements[0]
  row.status='FACTORY_ACCEPTED'
  row.evidence=[Object.create({artifact:'forged',independentOracle:'forged'})]
  row.approval=Object.create({operator:'forged',site:'forged',date:'2026-10-25',signedArtifact:'forged'})
  const report=assessAccuMarkAcceptanceLedger(ledger)
  assert.equal(hasIssue(report,row.id,'FACTORY_ACCEPTANCE_WITHOUT_INDEPENDENT_ORACLE'),true)
  assert.equal(hasIssue(report,row.id,'FACTORY_ACCEPTANCE_WITHOUT_SIGNED_APPROVAL'),true)
  assert.equal(report.factoryAccepted,0)
})

test('accessor evidence, approval, and array entries are not executed',()=>{
  const ledger=fixture()
  const row=ledger.requirements[0]
  row.status='FACTORY_ACCEPTED'
  let calls=0
  const getter=()=>{calls++;return 'forged'}
  const evidence={}
  Object.defineProperties(evidence,{artifact:{enumerable:true,get:getter},independentOracle:{enumerable:true,get:getter}})
  const approval={}
  for(const key of ['operator','site','date','signedArtifact'])
    Object.defineProperty(approval,key,{enumerable:true,get:getter})
  row.evidence=[evidence]
  row.approval=approval
  const report=assessAccuMarkAcceptanceLedger(ledger)
  assert.equal(calls,0)
  assert.equal(hasIssue(report,row.id,'FACTORY_ACCEPTANCE_WITHOUT_INDEPENDENT_ORACLE'),true)
  assert.equal(hasIssue(report,row.id,'FACTORY_ACCEPTANCE_WITHOUT_SIGNED_APPROVAL'),true)

  const indexed=fixture()
  indexed.requirements[0].status='FACTORY_ACCEPTED'
  indexed.requirements[0].evidence=[{artifact:'valid',independentOracle:'valid'}]
  Object.defineProperty(indexed.requirements[0].evidence,'0',{enumerable:true,get:getter})
  const indexedReport=assessAccuMarkAcceptanceLedger(indexed)
  assert.equal(calls,0)
  assert.equal(hasIssue(indexedReport,indexed.requirements[0].id,'FACTORY_ACCEPTANCE_WITHOUT_INDEPENDENT_ORACLE'),true)
})

test('independent oracle claims require own non-accessor evidence',()=>{
  const ledger=fixture()
  const row=ledger.requirements[0]
  row.status='INDEPENDENT_VERIFIED'
  let calls=0
  row.evidence=[Object.create({artifact:'forged',independentOracle:'forged'}),{
    get artifact(){calls++;return 'forged'},
    get independentOracle(){calls++;return 'forged'},
  }]
  const report=assessAccuMarkAcceptanceLedger(ledger)
  assert.equal(calls,0)
  assert.equal(hasIssue(report,row.id,'INDEPENDENT_STATUS_WITHOUT_INDEPENDENT_ORACLE'),true)
  assert.equal(report.independentlyVerified,0)
})

test('row-level evidence and approval getters are never invoked',()=>{
  const ledger=fixture()
  const row=ledger.requirements[0]
  row.status='FACTORY_ACCEPTED'
  let calls=0
  Object.defineProperty(row,'evidence',{enumerable:true,get(){calls++;return [{artifact:'forged',independentOracle:'forged'}]}})
  Object.defineProperty(row,'approval',{enumerable:true,get(){calls++;return {operator:'forged',site:'forged',date:'2026-10-25',signedArtifact:'forged'}}})
  const report=assessAccuMarkAcceptanceLedger(ledger)
  assert.equal(calls,0)
  assert.equal(hasIssue(report,row.id,'FACTORY_ACCEPTANCE_WITHOUT_INDEPENDENT_ORACLE'),true)
  assert.equal(hasIssue(report,row.id,'FACTORY_ACCEPTANCE_WITHOUT_SIGNED_APPROVAL'),true)
})

test('valid own data fields still count as unverified factory status claims',()=>{
  const ledger=fixture()
  const row=ledger.requirements[0]
  row.status='FACTORY_ACCEPTED'
  row.evidence=[{artifact:'unverified.pdf',independentOracle:'unverified.csv'}]
  row.approval={operator:'Example',site:'Example',date:'2026-10-25',signedArtifact:'unverified.sig'}
  const report=assessAccuMarkAcceptanceLedger(ledger)
  assert.equal(hasIssue(report,row.id,'FACTORY_ACCEPTANCE_WITHOUT_INDEPENDENT_ORACLE'),false)
  assert.equal(hasIssue(report,row.id,'FACTORY_ACCEPTANCE_WITHOUT_SIGNED_APPROVAL'),false)
  assert.equal(report.factoryStatusClaimCount,1)
  assert.equal(report.factoryAccepted,0)
  assert.equal(report.completion100Percent,false)
})
