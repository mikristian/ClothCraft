import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {buildAccuMarkExplorerOrder20261024} from './accumarkExplorerProductionFoundation20261024.js'
import {buildAccuMarkCutRoomPlan} from './accumarkCutRoomPlan20261024.js'
import {buildIndustrialCadOrderHandoff20261028} from './industrialCadOrderHandoff20261028.mjs'
import {parseAccuMarkGradedDxfWire20261023} from './accumarkGradedDxfRoundtripAudit20261023.js'
import {sha256Bytes} from './sha256Bytes.js'
import {inspectIndustrialReceivingSignedEvidence20261028 as inspect} from './industrialReceivingSignedEvidence20261028.mjs'

const encoder=new TextEncoder()
const digest=s=>sha256Bytes(encoder.encode(s))
const stable=x=>Array.isArray(x)?`[${x.map(stable).join(',')}]`:
 x!==null&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`:
 JSON.stringify(x)
const b64=bytes=>btoa(String.fromCharCode(...bytes))
const challenge='ab'.repeat(24)
const now=Date.parse('2026-10-28T14:00:00.000Z')
const sizes=['S','M']
const project={id:'disposable-signed-receiver-tee',grading:{sizes,baseSize:'M',
 widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
 {id:'front',name:'Front',fabricId:'shell',cutQuantity:2,grainAngleDeg:0,seamAllowance:1,
  notches:[{edgeIndex:0,t:.25,depthCm:.3}],
  points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]},
 {id:'collar',name:'Collar',fabricId:'rib',cutQuantity:1,grainAngleDeg:0,seamAllowance:1,
  points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
]}
const qty={S:2,M:1}
const explorer=buildAccuMarkExplorerOrder20261024(project,
 {styleId:'TEE-SIGNED',orderId:'ORDER-SIGNED',quantitiesBySize:qty})
assert.equal(explorer.ok,true)
const plans={}
for(const fabricId of ['shell','rib']){
 plans[fabricId]=buildAccuMarkCutRoomPlan(project,{fabricId,quantitiesBySize:qty,
  fabricWidthCm:30,spacingCm:1,nap:true,maxPlyCount:2,
  rolls:[{rollId:`${fabricId}-ROLL`,batchId:`${fabricId}-BATCH`,fabricId,
   shade:'SHADE-1',nap:true,usableLengthCm:150,costPerMeter:20,widthCm:30}]})
 assert.equal(plans[fabricId].ok,true)
}
const built=buildIndustrialCadOrderHandoff20261028(project,explorer,plans)
assert.equal(built.ok,true,JSON.stringify(built.issues))
const packet={manifest:built.manifest,manifestSha256:built.manifestSha256}
const outbound=built.wiresBySize
const counts=wire=>{
 const parsed=parseAccuMarkGradedDxfWire20261023(wire)
 assert.equal(parsed.ok,true,JSON.stringify(parsed.issues))
 const result={cut:0,stitch:0,allowance:0,notch:0}
 for(const e of parsed.entities)for(const [prefix,key] of
  [['CUT_','cut'],['STITCH_','stitch'],['SA_','allowance'],['NOTCH_','notch']])
  if(e.layer?.startsWith(prefix))result[key]++
 return result
}
const makeEvidence=()=>({format:'exo.receiving-CAD-reexport-evidence.v1',
 handoffManifestSha256:built.manifestSha256,receiverApplication:'MOCK_RECEIVER',
 receiverVersion:'test-1',receiverSessionId:'disposable-session',
 reexportWiresBySize:{...outbound},importRecords:sizes.map(size=>({size,imported:true,
  sourceSha256:digest(outbound[size]),reexportSha256:digest(outbound[size]),
  layerCounts:counts(outbound[size])}))})
const keypair=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
const publicKeyRawBase64=b64(new Uint8Array(await webcrypto.subtle.exportKey('raw',keypair.publicKey)))
const trustedKeys={receiver1:{application:'MOCK_RECEIVER',publicKeyRawBase64}}
const payloadFor=evidence=>({format:'exo.receiving-CAD-detached-attestation.v1',
 keyId:'receiver1',challenge,handoffManifestSha256:built.manifestSha256,
 receiverApplication:evidence.receiverApplication,receiverVersion:evidence.receiverVersion,
 receiverSessionId:evidence.receiverSessionId,
 issuedAt:'2026-10-28T13:55:00.000Z',expiresAt:'2026-10-28T14:25:00.000Z',
 sizeDigests:Object.fromEntries(sizes.map(size=>[size,{
  outboundSha256:digest(outbound[size]),
  reexportSha256:digest(evidence.reexportWiresBySize[size])}]))})
const boundPayloadFor=evidence=>({...payloadFor(evidence),
 format:'exo.receiving-CAD-detached-attestation.v2',
 importRecordsSha256:digest(stable(evidence.importRecords))})
const makeBoundEvidence=()=>{
 const evidence=makeEvidence()
 for(const record of evidence.importRecords)Object.assign(record,{
  receiverApplication:evidence.receiverApplication,
  receiverVersion:evidence.receiverVersion,
  receiverSessionId:evidence.receiverSessionId,
  importOperationId:`MOCK-${record.size}`,
  sourceArtifactId:`SOURCE-${record.size}`,
  reexportArtifactId:`REEXPORT-${record.size}`,
  importedAt:'2026-10-28T13:53:00.000Z',
  exportedAt:'2026-10-28T13:54:00.000Z',
 })
 return evidence
}
const sign=async payload=>{
 const bytes=await webcrypto.subtle.sign('Ed25519',keypair.privateKey,encoder.encode(stable(payload)))
 return {payload,signature:b64(new Uint8Array(bytes))}
}
const verify=(evidence,attestation,options={})=>inspect(project,explorer,plans,packet,outbound,
 evidence,attestation,{trustedKeys,expectedChallenge:challenge,nowMs:now,...options})
const blocked=async(evidence,attestation,options,code)=>{
 const result=await verify(evidence,attestation,options)
 assert.equal(result.ok,false,JSON.stringify(result))
 assert(result.issues.some(issue=>issue.code===code),JSON.stringify(result.issues))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
}

test('disposable 2-size/2-fabric 9-cut signed wire is locally verified without CAD/factory approval',async()=>{
 const evidence=makeEvidence(),attestation=await sign(payloadFor(evidence))
 const before=structuredClone({evidence,attestation})
 const result=await verify(evidence,attestation)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.sizeCount,2)
 assert.equal(result.receiverSignatureVerified,true)
 assert.equal(result.independentReceiverAuthenticated,false)
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
 assert.deepEqual({evidence,attestation},before)
})

test('forged signatures, wrong trusted anchors and unsigned receiver claims fail closed',async()=>{
 const evidence=makeEvidence(),attestation=await sign(payloadFor(evidence))
 const forged=structuredClone(attestation)
 forged.signature=forged.signature.replace(/^./,forged.signature[0]==='A'?'B':'A')
 await blocked(evidence,forged,{},'RECEIVER_SIGNATURE_INVALID')
 await blocked(evidence,attestation,{trustedKeys:{}},'UNTRUSTED_RECEIVER_SIGNING_KEY')
 await blocked(evidence,attestation,{trustedKeys:{receiver1:{...trustedKeys.receiver1,
  application:'FORGED_RECEIVER'}}},'UNTRUSTED_RECEIVER_SIGNING_KEY')
 await blocked(evidence,{payload:attestation.payload}, {},'INVALID_SIGNED_RECEIVER_INPUT')
})

test('stale, replayed and unissued receiver challenges fail even with valid signature',async()=>{
 const evidence=makeEvidence(),attestation=await sign(payloadFor(evidence))
 await blocked(evidence,attestation,{expectedChallenge:'cd'.repeat(24)},'RECEIVER_SIGNED_CLAIM_DRIFT')
 await blocked(evidence,attestation,{nowMs:now+3_600_000},'RECEIVER_SIGNATURE_EXPIRED_OR_INVALID')
 const long=payloadFor(evidence)
 long.expiresAt='2026-10-30T14:00:00.000Z'
 await blocked(evidence,await sign(long),{},'RECEIVER_SIGNATURE_EXPIRED_OR_INVALID')
})

test('signed source or receiver-size digest tampering is blocked even if metadata is rehashed',async()=>{
 const evidence=makeEvidence(),payload=payloadFor(evidence)
 payload.sizeDigests.S.reexportSha256='0'.repeat(64)
 await blocked(evidence,await sign(payload),{},'RECEIVER_SIGNED_SIZE_DIGEST_DRIFT')
 const missing=payloadFor(evidence)
 delete missing.sizeDigests.M
 await blocked(evidence,await sign(missing),{},'RECEIVER_SIGNED_CLAIM_DRIFT')
})

test('valid signature cannot override changed order or a rehashed displaced physical notch',async()=>{
 const evidence=makeEvidence()
 evidence.reexportWiresBySize.M=evidence.reexportWiresBySize.M.replace('NOTCH_FRONT','NOTCH_BROKEN')
 evidence.importRecords.find(r=>r.size==='M').reexportSha256=digest(evidence.reexportWiresBySize.M)
 evidence.importRecords.find(r=>r.size==='M').layerCounts=counts(evidence.reexportWiresBySize.M)
 await blocked(evidence,await sign(payloadFor(evidence)),{},'RECEIVER_SIGNED_GEOMETRY_OR_ORDER_DRIFT')
 const clean=makeEvidence(),signed=await sign(payloadFor(clean))
 const changed=structuredClone(explorer)
 changed.order.quantitiesBySize.S=9
 const result=await inspect(project,changed,plans,packet,outbound,clean,signed,
  {trustedKeys,expectedChallenge:challenge,nowMs:now})
 assert.equal(result.ok,false)
 assert(result.issues.some(i=>i.code==='RECEIVER_SIGNED_GEOMETRY_OR_ORDER_DRIFT'))
 assert.equal(result.factoryApproved,false)
})

test('v2 signed two-size two-fabric import receipts bind the complete records without authorizing CUT',async()=>{
 const evidence=makeBoundEvidence()
 const result=await verify(evidence,await sign(boundPayloadFor(evidence)))
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.importRecordsSignatureBound,true)
 assert.equal(result.receiverSignatureVerified,true)
 assert.equal(result.independentReceiverAuthenticated,false)
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
})

test('v2 rejects post-signature substitution of import operator, session and locally reconstructed records',async()=>{
 const evidence=makeBoundEvidence()
 const attestation=await sign(boundPayloadFor(evidence))
 const changed=structuredClone(evidence)
 changed.importRecords[0].operator='forged-receiver-operator'
 await blocked(changed,attestation,{},'RECEIVER_SIGNED_IMPORT_RECORD_DRIFT')
 const swapped=structuredClone(evidence)
 swapped.importRecords[1].receiverSessionId='different-session'
 await blocked(swapped,attestation,{},'RECEIVER_SIGNED_IMPORT_RECORD_DRIFT')
 const rebuilt=structuredClone(evidence)
 rebuilt.importRecords=rebuilt.importRecords.map(r=>({...r,imported:true,
  sourceSha256:digest(outbound[r.size]),reexportSha256:digest(rebuilt.reexportWiresBySize[r.size]),
  layerCounts:counts(rebuilt.reexportWiresBySize[r.size]),operatorNote:'rebuilt-after-signature'}))
 await blocked(rebuilt,attestation,{},'RECEIVER_SIGNED_IMPORT_RECORD_DRIFT')
})

test('v2 refuses forged signed record digest, malformed process data and legacy proof overclaim',async()=>{
 const evidence=makeBoundEvidence()
 const signed=await sign(boundPayloadFor(evidence))
 const forged=structuredClone(signed)
 forged.payload.importRecordsSha256='0'.repeat(64)
 await blocked(evidence,forged,{},'RECEIVER_SIGNED_IMPORT_RECORD_DRIFT')
 const malformed=makeBoundEvidence()
 malformed.importRecords[0].receiverLog=undefined
 await blocked(malformed,signed,{},'RECEIVER_SIGNED_IMPORT_RECORD_DRIFT')
 const legacy=await verify(evidence,await sign(payloadFor(evidence)))
 assert.equal(legacy.ok,true)
 assert.equal(legacy.importRecordsSignatureBound,false)
 assert.equal(legacy.receiverCadVerified,false)
})

test('v2 refuses correctly re-signed missing process receipts, cross-session rows and reused operation IDs',async()=>{
 const missing=makeEvidence()
 await blocked(missing,await sign(boundPayloadFor(missing)),{},'RECEIVER_SIGNED_IMPORT_PROCESS_DRIFT')
 const wrong=makeBoundEvidence()
 wrong.importRecords[0].receiverSessionId='another-session'
 await blocked(wrong,await sign(boundPayloadFor(wrong)),{},'RECEIVER_SIGNED_IMPORT_PROCESS_DRIFT')
 const duplicated=makeBoundEvidence()
 duplicated.importRecords[1].importOperationId=duplicated.importRecords[0].importOperationId
 await blocked(duplicated,await sign(boundPayloadFor(duplicated)),{},'RECEIVER_SIGNED_IMPORT_PROCESS_DRIFT')
 const afterSignature=makeBoundEvidence()
 afterSignature.importRecords[0].exportedAt='2026-10-28T13:56:00.000Z'
 await blocked(afterSignature,await sign(boundPayloadFor(afterSignature)),{},'RECEIVER_SIGNED_IMPORT_PROCESS_DRIFT')
 const stale=makeBoundEvidence()
 stale.importRecords[0].importedAt='2026-10-01T13:53:00.000Z'
 await blocked(stale,await sign(boundPayloadFor(stale)),{},'RECEIVER_SIGNED_IMPORT_PROCESS_DRIFT')
})
