import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash,generateKeyPairSync,sign} from 'node:crypto'
import {assessAccuMarkAcceptanceLedger as assess} from './accumark-acceptance-progress-20261023.mjs'

const fixture=()=>JSON.parse(readFileSync(new URL('../docs/research/swarm-20261023/parity-ledger.json',import.meta.url),'utf8'))

test('inherited ledger schema and requirements cannot satisfy structural validation',()=>{
  for(const key of ['schema','requirements']){
    const ledger=fixture()
    Object.setPrototypeOf(ledger,{[key]:ledger[key]})
    delete ledger[key]
    assert.throws(()=>assess(ledger),/Missing or invalid acceptance ledger schema\/requirements/)
  }
})

test('ledger schema and requirements accessors are never executed',()=>{
  for(const key of ['schema','requirements']){
    const ledger=fixture()
    let calls=0
    Object.defineProperty(ledger,key,{enumerable:true,get(){calls++;return key==='schema'?'exo.accumark.acceptance.v1':[]}})
    assert.throws(()=>assess(ledger),/Missing or invalid acceptance ledger schema\/requirements/)
    assert.equal(calls,0,key)
  }
})

test('row identity and status must be own data fields, without getter execution',()=>{
  for(const key of ['id','status']){
    const ledger=fixture()
    const row=ledger.requirements[0]
    const original=row[key]
    let calls=0
    Object.defineProperty(row,key,{enumerable:true,get(){calls++;return original}})
    assert.throws(()=>assess(ledger),key==='id'?/exactly 76 unique expected/:/Unsupported acceptance status/)
    assert.equal(calls,0,key)
  }
  const ledger=fixture()
  const row=ledger.requirements[0]
  Object.setPrototypeOf(row,{status:'FACTORY_ACCEPTED'})
  delete row.status
  assert.throws(()=>assess(ledger),/Unsupported acceptance status/)
})

test('requirements array accessors and inherited entries cannot supply rows',()=>{
  for(const inherited of [false,true]){
    const ledger=fixture()
    const rows=ledger.requirements
    const first=rows[0]
    let calls=0
    delete rows[0]
    if(inherited){
      const prototype=Object.create(Array.prototype)
      Object.defineProperty(prototype,'0',{enumerable:true,get(){calls++;return first}})
      Object.setPrototypeOf(rows,prototype)
    }else Object.defineProperty(rows,'0',{enumerable:true,get(){calls++;return first}})
    assert.throws(()=>assess(ledger),/exactly 76 unique expected/)
    assert.equal(calls,0,inherited?'inherited entry':'accessor entry')
  }
})

test('criterion and lane getters cannot execute or hide canonical matrix drift',()=>{
  for(const key of ['criterion','lane']){
    const ledger=fixture()
    const row=ledger.requirements[0]
    let calls=0
    Object.defineProperty(row,key,{enumerable:true,get(){calls++;return 'forged'}})
    const report=assess(ledger)
    assert.equal(calls,0,key)
    assert.equal(report.issues.some(issue=>issue.id==='A01'&&issue.code==='CANONICAL_MATRIX_DRIFT'),true)
  }
})

test('CAD receiver and physical sample claims ignore inherited or accessor-backed values',()=>{
  for(const [section,fields,claimKey] of [
    ['industrialRoundTrip',{approved:true,receiver:'claimed',artifact:'claimed'},'receiverStatusClaimed'],
    ['physicalSample',{approved:true,site:'claimed',operator:'claimed',artifact:'claimed'},'physicalStatusClaimed'],
  ]){
    const ledger=fixture()
    let calls=0
    Object.defineProperty(ledger,section,{enumerable:true,get(){calls++;return fields}})
    assert.equal(assess(ledger)[claimKey],false)
    assert.equal(calls,0,section+' root getter')
    const inherited=fixture()
    Object.setPrototypeOf(inherited,{[section]:fields})
    delete inherited[section]
    assert.equal(assess(inherited)[claimKey],false)
    const nested=fixture()
    nested[section]=Object.create(fields)
    assert.equal(assess(nested)[claimKey],false)
    const accessor=fixture()
    accessor[section]={...fields}
    Object.defineProperty(accessor[section],'approved',{enumerable:true,get(){calls++;return true}})
    assert.equal(assess(accessor)[claimKey],false)
    assert.equal(calls,0,section+' nested getter')
  }
})

test('ordinary JSON ledger and explicit claim fields retain reporting semantics',()=>{
  const ledger=fixture()
  ledger.requirements[0].status='FACTORY_ACCEPTED'
  ledger.industrialRoundTrip={approved:true,receiver:'self-claimed receiver',artifact:'unverified.dxf'}
  ledger.physicalSample={approved:true,site:'self-claimed factory',operator:'self-claimed operator',artifact:'unverified.pdf'}
  const result=assess(ledger)
  assert.equal(result.requirements,76)
  assert.equal(result.factoryStatusClaimCount,1)
  assert.equal(result.factoryAccepted,0)
  assert.equal(result.receiverStatusClaimed,true)
  assert.equal(result.physicalStatusClaimed,true)
  assert.equal(result.receiverAccepted,false)
  assert.equal(result.physicalAccepted,false)
  assert.equal(result.completion100Percent,false)
})

test('synthetic signed evidence cannot execute unrelated ledger getters or toJSON hooks',()=>{
  const ledger=fixture()
  ledger.releaseId='synthetic-only'
  for(const row of ledger.requirements){
    row.status='FACTORY_ACCEPTED'
    row.evidence=[{artifact:'synthetic',independentOracle:'synthetic'}]
    row.approval={operator:'synthetic',site:'synthetic',date:'2026-10-25',signedArtifact:'synthetic'}
  }
  ledger.industrialRoundTrip={approved:true,receiver:'synthetic',artifact:'receiver'}
  ledger.physicalSample={approved:true,site:'synthetic',operator:'synthetic',artifact:'sample'}
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
  const receiver=Buffer.from('synthetic receiver bytes')
  const sample=Buffer.from('synthetic sample bytes')
  const payloadUtf8=JSON.stringify({
    schema:'exo.accumark.signed-factory-acceptance.v1',releaseId:ledger.releaseId,
    ledgerSha256:sha(Buffer.from(JSON.stringify(ledger))),
    receiverArtifact:'receiver',receiverArtifactSha256:sha(receiver),
    physicalSampleArtifact:'sample',physicalSampleArtifactSha256:sha(sample),
    witnessId:'synthetic',witnessOrganization:'synthetic',receiverObserved:true,physicalSampleObserved:true,
    receiverObservedAt:'2026-10-25T10:00:00Z',physicalSampleObservedAt:'2026-10-25T11:00:00Z',
    signedAt:'2026-10-25T12:00:00Z',
  })
  const keys=generateKeyPairSync('ed25519')
  const evidence={
    trustedPublicKeyPem:keys.publicKey.export({type:'spki',format:'pem'}),
    signedRelease:{payloadUtf8,signatureBase64:sign(null,Buffer.from(payloadUtf8),keys.privateKey).toString('base64'),receiverArtifactBytes:receiver,physicalSampleArtifactBytes:sample},
  }
  assert.equal(assess(ledger,evidence).signedExternalAcceptance,true)
  let calls=0
  Object.defineProperty(ledger,'unknownMandatory',{enumerable:true,configurable:true,get(){calls++;return 'executed'}})
  assert.equal(assess(ledger,evidence).signedExternalAcceptance,false)
  assert.equal(calls,0,'unrelated getter')
  delete ledger.unknownMandatory
  ledger.requirements[0].toJSON=()=>{calls++;return {}}
  assert.equal(assess(ledger,evidence).signedExternalAcceptance,false)
  assert.equal(calls,0,'nested toJSON')
  delete ledger.requirements[0].toJSON
  Object.defineProperty(ledger.requirements[0],'hidden',{value:'unknown',enumerable:false})
  assert.equal(assess(ledger,evidence).signedExternalAcceptance,false)
  assert.equal(calls,0,'non-enumerable metadata')
  assert.equal(assess(ledger,evidence).factoryAccepted,0)
})

test('signed evidence options cannot execute inherited or accessor-backed fields',()=>{
  const ledger=fixture()
  let calls=0
  const accessorOptions={}
  Object.defineProperty(accessorOptions,'trustedPublicKeyPem',{enumerable:true,get(){calls++;throw Error('SIGNED_OPTIONS_GETTER')}})
  assert.equal(assess(ledger,accessorOptions).signedExternalAcceptance,false)
  assert.equal(calls,0,'top-level signed options getter')

  const nested={trustedPublicKeyPem:'synthetic-key',signedRelease:{}}
  Object.defineProperty(nested.signedRelease,'payloadUtf8',{enumerable:true,get(){calls++;throw Error('SIGNED_PAYLOAD_GETTER')}})
  assert.equal(assess(ledger,nested).signedExternalAcceptance,false)
  assert.equal(calls,0,'nested signed release getter')

  const inherited=Object.create({trustedPublicKeyPem:'synthetic-key',signedRelease:{payloadUtf8:'forged'}})
  assert.equal(assess(ledger,inherited).signedExternalAcceptance,false)
  assert.equal(calls,0,'inherited signed options')
})
