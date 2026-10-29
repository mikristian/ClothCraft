import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {buildAccuMarkExplorerOrder20261024} from './accumarkExplorerProductionFoundation20261024.js'
import {buildAccuMarkCutRoomPlan} from './accumarkCutRoomPlan20261024.js'
import {buildIndustrialCadOrderHandoff20261028} from './industrialCadOrderHandoff20261028.mjs'
import {parseAccuMarkGradedDxfWire20261023} from './accumarkGradedDxfRoundtripAudit20261023.js'
import {sha256Bytes} from './sha256Bytes.js'
import {inspectIndustrialReceivingSignedEvidence20261028 as legacy} from './industrialReceivingSignedEvidence20261028.mjs'
import {inspectIndustrialReceivingPinnedSession20261028 as inspect} from './industrialReceivingPinnedSession20261028.mjs'

// Entirely synthetic garment and signer. Not a licensed receiving-CAD test.
const encoder=new TextEncoder(),digest=s=>sha256Bytes(encoder.encode(s))
const stable=x=>Array.isArray(x)?`[${x.map(stable).join(',')}]`:
 x!==null&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`:
 JSON.stringify(x)
const b64=bytes=>btoa(String.fromCharCode(...bytes))
const sizes=['S','M'],quantities={S:2,M:1},now=Date.parse('2026-10-28T14:00:00.000Z')
const challenge='be'.repeat(24)
const project={id:'disposable-session-policy-tee',grading:{sizes,baseSize:'M',
 widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
 {id:'front',name:'Front',fabricId:'shell',cutQuantity:2,grainAngleDeg:0,seamAllowance:1,
  notches:[{edgeIndex:0,t:.25,depthCm:.3}],
  points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]},
 {id:'collar',name:'Collar',fabricId:'rib',cutQuantity:1,grainAngleDeg:0,seamAllowance:1,
  points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
]}
const explorer=buildAccuMarkExplorerOrder20261024(project,
 {styleId:'TEE-PINNED',orderId:'ORDER-PINNED',quantitiesBySize:quantities})
assert.equal(explorer.ok,true)
const plans={}
for(const fabricId of ['shell','rib']){
 plans[fabricId]=buildAccuMarkCutRoomPlan(project,{fabricId,quantitiesBySize:quantities,
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
 assert.equal(parsed.ok,true)
 const result={cut:0,stitch:0,allowance:0,notch:0}
 for(const e of parsed.entities)for(const [prefix,key] of
  [['CUT_','cut'],['STITCH_','stitch'],['SA_','allowance'],['NOTCH_','notch']])
  if(e.layer?.startsWith(prefix))result[key]++
 return result
}
const evidence=()=>({format:'exo.receiving-CAD-reexport-evidence.v1',
 handoffManifestSha256:built.manifestSha256,receiverApplication:'MOCK_RECEIVER',
 receiverVersion:'1.0',receiverSessionId:'PINNED_SESSION_001',
 reexportWiresBySize:{...outbound},importRecords:sizes.map(size=>({size,imported:true,
  sourceSha256:digest(outbound[size]),reexportSha256:digest(outbound[size]),
  layerCounts:counts(outbound[size])}))})
const boundEvidence=()=>{
 const e=evidence()
 for(const row of e.importRecords)Object.assign(row,{
  receiverApplication:e.receiverApplication,receiverVersion:e.receiverVersion,
  receiverSessionId:e.receiverSessionId,importOperationId:`IMPORT-${row.size}`,
  sourceArtifactId:`SOURCE-${row.size}`,reexportArtifactId:`REEXPORT-${row.size}`,
  importedAt:'2026-10-28T13:53:00.000Z',exportedAt:'2026-10-28T13:54:00.000Z'})
 return e
}
const keys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
const keyBytes=new Uint8Array(await webcrypto.subtle.exportKey('raw',keys.publicKey))
const trustedKeys={receiver1:{application:'MOCK_RECEIVER',publicKeyRawBase64:b64(keyBytes)}}
const policy={receiverApplication:'MOCK_RECEIVER',receiverVersion:'1.0',
 receiverSessionId:'PINNED_SESSION_001',keyId:'receiver1',
 publicKeySha256:sha256Bytes(keyBytes),handoffManifestSha256:built.manifestSha256,
 challenge,issuedAfter:'2026-10-28T13:50:00.000Z',issuedBefore:'2026-10-28T14:00:00.000Z',
 challengeIssuedAt:'2026-10-28T13:52:00.000Z'}
const payloadFor=e=>({format:'exo.receiving-CAD-detached-attestation.v1',
 keyId:'receiver1',challenge,handoffManifestSha256:built.manifestSha256,
 receiverApplication:e.receiverApplication,receiverVersion:e.receiverVersion,
 receiverSessionId:e.receiverSessionId,
 issuedAt:'2026-10-28T13:55:00.000Z',expiresAt:'2026-10-28T14:25:00.000Z',
 sizeDigests:Object.fromEntries(sizes.map(size=>[size,{
  outboundSha256:digest(outbound[size]),reexportSha256:digest(e.reexportWiresBySize[size])}]))})
const boundPayloadFor=e=>({...payloadFor(e),
 format:'exo.receiving-CAD-detached-attestation.v2',
 importRecordsSha256:digest(stable(e.importRecords))})
const sign=async payload=>({payload,signature:b64(new Uint8Array(
 await webcrypto.subtle.sign('Ed25519',keys.privateKey,encoder.encode(stable(payload)))) )})
const run=(e,a,options={})=>inspect(project,explorer,plans,packet,outbound,e,a,
 {policy,trustedKeys,nowMs:now,...options})
const blocked=async(e,a,options,code)=>{
 const result=await run(e,a,options)
 assert.equal(result.ok,false,JSON.stringify(result))
 assert(result.issues.some(x=>x.code===code),JSON.stringify(result.issues))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
}

test('2-size/2-fabric 9-cut signed fixture binds an exact pinned receiver session',async()=>{
 const e=boundEvidence(),a=await sign(boundPayloadFor(e))
 const before=structuredClone({e,a,policy})
 const result=await run(e,a)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.sizeCount,2)
 assert.equal(result.receiverSignatureVerified,true)
 assert.equal(result.receiverSessionPinned,true)
 assert.equal(result.importRecordsSignatureBound,true)
 assert.equal(result.independentReceiverAuthenticated,false)
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.deepEqual({e,a,policy},before)
})

test('previous signed gate accepts a newly signed wrong receiver version/session; pinned gate refuses',async()=>{
 const e=boundEvidence()
 e.receiverVersion='UNAPPROVED_DOWNGRADE'
 e.receiverSessionId='OTHER_SESSION'
 for(const row of e.importRecords){row.receiverVersion=e.receiverVersion;row.receiverSessionId=e.receiverSessionId}
 const a=await sign(boundPayloadFor(e))
 const old=await legacy(project,explorer,plans,packet,outbound,e,a,
  {trustedKeys,expectedChallenge:challenge,nowMs:now})
 assert.equal(old.ok,true,JSON.stringify(old.issues))
 await blocked(e,a,{},'RECEIVER_SESSION_POLICY_DRIFT')
})

test('policy refuses wrong independently pinned key, challenge, manifest and issuance window',async()=>{
 const e=boundEvidence(),a=await sign(boundPayloadFor(e))
 await blocked(e,a,{policy:{...policy,publicKeySha256:'0'.repeat(64)}},'RECEIVER_SESSION_TRUST_ANCHOR_DRIFT')
 await blocked(e,a,{policy:{...policy,challenge:'aa'.repeat(24)}},'RECEIVER_SESSION_POLICY_DRIFT')
 await blocked(e,a,{policy:{...policy,handoffManifestSha256:'0'.repeat(64)}},'RECEIVER_SESSION_POLICY_DRIFT')
 await blocked(e,a,{policy:{...policy,issuedAfter:'2026-10-28T13:56:00.000Z'}},'INVALID_PINNED_RECEIVER_WINDOW')
 await blocked(e,a,{policy:{...policy,issuedAfter:'2026-10-28T12:00:00.000Z'}},'INVALID_PINNED_RECEIVER_WINDOW')
 const {challengeIssuedAt,...withoutIssuance}=policy
 await blocked(e,a,{policy:withoutIssuance},'INVALID_PINNED_RECEIVER_POLICY')
})

test('a pinned policy does not override forged signature or corrupted manufacturing notch',async()=>{
 const e=boundEvidence(),a=await sign(boundPayloadFor(e))
 const forged={...a,signature:a.signature.replace(/^./,a.signature[0]==='A'?'B':'A')}
 await blocked(e,forged,{},'RECEIVER_PINNED_SIGNATURE_OR_GEOMETRY_DRIFT')
 const changed=boundEvidence()
 changed.reexportWiresBySize.M=changed.reexportWiresBySize.M.replace('NOTCH_FRONT','NOTCH_BROKEN')
 changed.importRecords.find(r=>r.size==='M').reexportSha256=digest(changed.reexportWiresBySize.M)
 changed.importRecords.find(r=>r.size==='M').layerCounts=counts(changed.reexportWiresBySize.M)
 await blocked(changed,await sign(boundPayloadFor(changed)),{},'RECEIVER_PINNED_SIGNATURE_OR_GEOMETRY_DRIFT')
})

test('legacy v1 wire signature cannot satisfy pinned import-process evidence',async()=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const local=await legacy(project,explorer,plans,packet,outbound,e,a,
  {trustedKeys,expectedChallenge:challenge,nowMs:now})
 assert.equal(local.ok,true)
 assert.equal(local.importRecordsSignatureBound,false)
 await blocked(e,a,{},'RECEIVER_PINNED_IMPORT_RECORD_BINDING_REQUIRED')
})

test('pinned v2 refuses receipt substitution even with unchanged DXF geometry and signature',async()=>{
 const e=boundEvidence(),a=await sign(boundPayloadFor(e))
 const substituted=structuredClone(e)
 substituted.importRecords[0].sourceArtifactId='SUBSTITUTED-SOURCE'
 await blocked(substituted,a,{},'RECEIVER_PINNED_SIGNATURE_OR_GEOMETRY_DRIFT')
})

test('pinned v2 refuses a correctly re-signed duplicate import-operation receipt',async()=>{
 const e=boundEvidence()
 e.importRecords[1].importOperationId=e.importRecords[0].importOperationId
 await blocked(e,await sign(boundPayloadFor(e)),{},'RECEIVER_PINNED_SIGNATURE_OR_GEOMETRY_DRIFT')
})

test('signed pre-challenge import for one graded size cannot pass pinned receiving process',async()=>{
 const e=boundEvidence()
 e.importRecords[1].importedAt='2026-10-28T13:49:59.999Z'
 const a=await sign(boundPayloadFor(e))
 const wireOnly=await legacy(project,explorer,plans,packet,outbound,e,a,
  {trustedKeys,expectedChallenge:challenge,nowMs:now})
 assert.equal(wireOnly.ok,true,JSON.stringify(wireOnly.issues))
 await blocked(e,a,{},'RECEIVER_PINNED_IMPORT_OUTSIDE_CHALLENGE_WINDOW')
})

test('pre-challenge import and export for all sizes are refused even with fresh attestation',async()=>{
 const e=boundEvidence()
 for(const row of e.importRecords){
  row.importedAt='2026-10-28T13:48:00.000Z'
  row.exportedAt='2026-10-28T13:49:00.000Z'
 }
 await blocked(e,await sign(boundPayloadFor(e)),{},
  'RECEIVER_PINNED_IMPORT_OUTSIDE_CHALLENGE_WINDOW')
})

test('import exactly at authenticated-policy challenge instant remains valid',async()=>{
 const e=boundEvidence()
 e.importRecords[0].importedAt=policy.challengeIssuedAt
 const result=await run(e,await sign(boundPayloadFor(e)))
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
})

test('receipt after broad window start but before precise challenge issuance is refused',async()=>{
 const e=boundEvidence()
 e.importRecords[0].importedAt='2026-10-28T13:51:59.999Z'
 await blocked(e,await sign(boundPayloadFor(e)),{},
  'RECEIVER_PINNED_IMPORT_OUTSIDE_CHALLENGE_WINDOW')
})

test('future-dated challenge issuance is refused even inside the broad allowed window',async()=>{
 const e=boundEvidence(),a=await sign(boundPayloadFor(e))
 await blocked(e,a,{policy:{...policy,issuedBefore:'2026-10-28T14:05:00.000Z',
  challengeIssuedAt:'2026-10-28T14:01:00.000Z'}},
  'INVALID_PINNED_RECEIVER_WINDOW')
})

test('noncanonical policy timestamps cannot silently change challenge interpretation',async()=>{
 const e=boundEvidence(),a=await sign(boundPayloadFor(e))
 await blocked(e,a,{policy:{...policy,challengeIssuedAt:'2026-10-28 13:52:00'}},
  'INVALID_PINNED_RECEIVER_POLICY')
 await blocked(e,a,{policy:{...policy,issuedAfter:'2026-10-28T09:50:00.000-04:00'}},
  'INVALID_PINNED_RECEIVER_POLICY')
})

test('future signed import process cannot be accepted as already completed',async()=>{
 const e=boundEvidence()
 e.importRecords[0].importedAt='2026-10-28T14:01:00.000Z'
 e.importRecords[0].exportedAt='2026-10-28T14:02:00.000Z'
 const payload={...boundPayloadFor(e),issuedAt:'2026-10-28T14:03:00.000Z'}
 await blocked(e,await sign(payload),{policy:{...policy,
  issuedBefore:'2026-10-28T14:05:00.000Z'}},'RECEIVER_SESSION_ISSUANCE_DRIFT')
})
