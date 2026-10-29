import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {assessAccuMarkAcceptanceLedger as inspect} from './accumark-acceptance-progress-20261023.mjs'

const fixture=()=>JSON.parse(readFileSync(new URL('../docs/research/swarm-20261023/parity-ledger.json',import.meta.url),'utf8'))

test('real AccuMark ledger reports 76 requirements and fails factory acceptance until external evidence exists',()=>{
  const source=fixture()
  const original=structuredClone(source)
  const result=inspect(source)
  assert.equal(result.requirements,76)
  assert.equal(result.assessed,38)
  assert.equal(result.factoryAccepted,0)
  assert.equal(result.factoryAcceptedPercent,0)
  assert.equal(result.receiverAccepted,false)
  assert.equal(result.physicalAccepted,false)
  assert.equal(result.completion100Percent,false)
  assert.deepEqual(source,original)
})

test('even 76 claimed factory statuses cannot pass without witnesses and CAD/physical evidence',()=>{
  const input=fixture()
  for(const row of input.requirements)row.status='FACTORY_ACCEPTED'
  const result=inspect(input)
  assert.equal(result.factoryStatusClaimCount,76)
  assert.equal(result.factoryAccepted,0)
  assert.equal(result.completion100Percent,false)
  assert.ok(result.issues.some(issue=>issue.code==='CAD_RECEIVER_ROUNDTRIP_UNVERIFIED'))
})

test('rejects duplicates, missing requirements, and invented statuses',()=>{
  const dup=fixture();dup.requirements[1].id=dup.requirements[0].id
  assert.throws(()=>inspect(dup),/exactly 76 unique/)
  const missing=fixture();missing.requirements.pop()
  assert.throws(()=>inspect(missing),/exactly 76 unique/)
  const invented=fixture();invented.requirements[1].status='DONE'
  assert.throws(()=>inspect(invented),/Unsupported acceptance status/)
})
