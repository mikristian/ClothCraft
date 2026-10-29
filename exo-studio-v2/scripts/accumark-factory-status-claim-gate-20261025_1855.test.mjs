import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {assessAccuMarkAcceptanceLedger as assess} from './accumark-acceptance-progress-20261023.mjs'

const fixture=()=>JSON.parse(readFileSync(new URL('../docs/research/swarm-20261023/parity-ledger.json',import.meta.url),'utf8'))

test('fabricated 76-row factory claims cannot inflate authenticated factoryAccepted',()=>{
  const ledger=fixture()
  for(const row of ledger.requirements){
    row.status='FACTORY_ACCEPTED'
    row.evidence=[{artifact:`claim-${row.id}.dxf`,independentOracle:'self-declared witness'}]
    row.approval={operator:'claimed operator',site:'claimed factory',date:'2026-10-25',signedArtifact:'claimed.sig'}
  }
  ledger.industrialRoundTrip={approved:true,receiver:'claimed CAD',artifact:'claimed.dxf'}
  ledger.physicalSample={approved:true,site:'claimed factory',operator:'claimed operator',artifact:'claimed.pdf'}
  const before=structuredClone(ledger)
  const result=assess(ledger)
  assert.equal(result.counts.FACTORY_ACCEPTED,76)
  assert.equal(result.factoryStatusClaimCount,76)
  assert.equal(result.factoryStatusClaimPercent,100)
  assert.equal(result.factoryAccepted,0)
  assert.equal(result.factoryAcceptedPercent,0)
  assert.equal(result.receiverAccepted,false)
  assert.equal(result.physicalAccepted,false)
  assert.equal(result.completion100Percent,false)
  assert.deepEqual(ledger,before)
})

test('mixed fabricated factory statuses remain raw claims, not accepted requirements',()=>{
  const ledger=fixture()
  for(const row of ledger.requirements.slice(0,17))row.status='FACTORY_ACCEPTED'
  const result=assess(ledger)
  assert.equal(result.factoryStatusClaimCount,17)
  assert.equal(result.factoryAccepted,0)
  assert.equal(result.factoryAcceptedPercent,0)
  assert.equal(result.completion100Percent,false)
})

test('unchanged factory ledger has zero claims and zero authenticated approvals',()=>{
  const result=assess(fixture())
  assert.equal(result.factoryStatusClaimCount,0)
  assert.equal(result.factoryAccepted,0)
  assert.equal(result.completion100Percent,false)
})
