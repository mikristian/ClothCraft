import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash, generateKeyPairSync, sign} from 'node:crypto'
import {verifySignedFactoryAcceptance20261024 as verify} from './accumark-signed-factory-acceptance-20261024.mjs'

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')

function syntheticReceipt(receiverArtifactBytes=Buffer.from('receiver fixture')){
  const ledger={
    schema:'exo.accumark.acceptance.v1',created:'2026-10-23',releaseId:'synthetic-only',
    industrialRoundTrip:{artifact:'receiver.fixture'},physicalSample:{artifact:'sample.fixture'},
  }
  const physicalSampleArtifactBytes=Buffer.from('physical fixture')
  const {publicKey,privateKey}=generateKeyPairSync('ed25519')
  const payloadUtf8=JSON.stringify({
    schema:'exo.accumark.signed-factory-acceptance.v1',releaseId:ledger.releaseId,
    ledgerSha256:sha256(Buffer.from(JSON.stringify(ledger))),
    receiverArtifact:'receiver.fixture',receiverArtifactSha256:sha256(receiverArtifactBytes),
    physicalSampleArtifact:'sample.fixture',physicalSampleArtifactSha256:sha256(physicalSampleArtifactBytes),
    witnessId:'synthetic-witness',witnessOrganization:'synthetic-only',
    receiverObserved:true,physicalSampleObserved:true,
    receiverObservedAt:'2026-10-24T10:00:00Z',physicalSampleObservedAt:'2026-10-24T11:00:00Z',
    signedAt:'2026-10-24T12:00:00Z',
  })
  const options={
    trustedPublicKeyPem:publicKey.export({type:'spki',format:'pem'}),
    signedRelease:{payloadUtf8,signatureBase64:sign(null,Buffer.from(payloadUtf8),privateKey).toString('base64'),
      receiverArtifactBytes,physicalSampleArtifactBytes},
  }
  return {ledger,options}
}

test('direct verifier still validates a synthetically signed, ordinary data-only receipt',()=>{
  const {ledger,options}=syntheticReceipt()
  assert.equal(verify(ledger,options),true)
})

test('direct verifier rejects inherited and accessor-backed options without invoking getters',()=>{
  const {ledger,options}=syntheticReceipt()
  let hits=0
  const accessor={...options}
  Object.defineProperty(accessor,'trustedPublicKeyPem',{enumerable:true,get(){hits++;return options.trustedPublicKeyPem}})
  assert.equal(verify(ledger,accessor),false)
  assert.equal(hits,0)
  const inherited=Object.create({trustedPublicKeyPem:options.trustedPublicKeyPem})
  inherited.signedRelease=options.signedRelease
  assert.equal(verify(ledger,inherited),false)
  const nested={...options,signedRelease:{...options.signedRelease}}
  Object.defineProperty(nested.signedRelease,'payloadUtf8',{enumerable:true,get(){hits++;return options.signedRelease.payloadUtf8}})
  assert.equal(verify(ledger,nested),false)
  assert.equal(hits,0)
})

test('direct verifier rejects accessor-backed ledger and toJSON hooks without execution',()=>{
  const {ledger,options}=syntheticReceipt()
  let hits=0
  const accessor={...ledger}
  Object.defineProperty(accessor,'releaseId',{enumerable:true,get(){hits++;return ledger.releaseId}})
  assert.equal(verify(accessor,options),false)
  assert.equal(hits,0)
  const hooked={...ledger}
  Object.defineProperty(hooked,'toJSON',{value(){hits++;return ledger},enumerable:false})
  assert.equal(verify(hooked,options),false)
  assert.equal(hits,0)
})

test('direct verifier rejects transparent Proxy before invoking any reflection trap',()=>{
  const {ledger,options}=syntheticReceipt()
  let traps=0
  const proxied=new Proxy(ledger,{
    get(target,key,receiver){traps++;return Reflect.get(target,key,receiver)},
    getPrototypeOf(target){traps++;return Reflect.getPrototypeOf(target)},
    ownKeys(target){traps++;return Reflect.ownKeys(target)},
    getOwnPropertyDescriptor(target,key){traps++;return Reflect.getOwnPropertyDescriptor(target,key)},
  })
  assert.equal(verify(proxied,options),false)
  assert.equal(traps,0)
})

test('direct verifier rejects SharedArrayBuffer-backed receiver bytes, including Buffer views',()=>{
  for(const asBuffer of [false,true]){
    const shared=new SharedArrayBuffer(16)
    const view=new Uint8Array(shared)
    view.set(Buffer.from('receiver fixture'))
    const receiver=asBuffer?Buffer.from(shared,0,16):view
    const {ledger,options}=syntheticReceipt(receiver)
    assert.equal(verify(ledger,options),false,asBuffer?'Buffer':'Uint8Array')
  }
})
