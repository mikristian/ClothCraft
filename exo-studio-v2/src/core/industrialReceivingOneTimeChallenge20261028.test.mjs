import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {chmod,mkdtemp,mkdir,readFile,readdir,realpath,rename,rm,symlink,stat,writeFile} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {dirname,join} from 'node:path'
import {buildAccuMarkExplorerOrder20261024} from './accumarkExplorerProductionFoundation20261024.js'
import {buildAccuMarkCutRoomPlan} from './accumarkCutRoomPlan20261024.js'
import {buildIndustrialCadOrderHandoff20261028} from './industrialCadOrderHandoff20261028.mjs'
import {parseAccuMarkGradedDxfWire20261023} from './accumarkGradedDxfRoundtripAudit20261023.js'
import {sha256Bytes} from './sha256Bytes.js'
import {inspectIndustrialReceivingOneTimeChallenge20261028 as inspect} from './industrialReceivingOneTimeChallenge20261028.mjs'
import {openTrustedReceivingLedger20261029,verifyTrustedReceivingLedger20261029}
 from './industrialReceivingLedgerPathGuard20261029.mjs'

// All geometry, rolls, signer and receiver are disposable local test fixtures.
const encoder=new TextEncoder(),digest=s=>sha256Bytes(encoder.encode(s))
const stable=x=>Array.isArray(x)?`[${x.map(stable).join(',')}]`:
 x!==null&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`:
 JSON.stringify(x)
const b64=bytes=>btoa(String.fromCharCode(...bytes))
const sizes=['S','M'],quantities={S:2,M:1},now=Date.parse('2026-10-28T14:00:00.000Z')
const challenge='c3'.repeat(24)
const project={id:'disposable-one-time-tee',grading:{sizes,baseSize:'M',
 widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
 {id:'front',name:'Front',fabricId:'shell',cutQuantity:2,grainAngleDeg:0,seamAllowance:1,
  notches:[{edgeIndex:0,t:.25,depthCm:.3}],
  points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]},
 {id:'collar',name:'Collar',fabricId:'rib',cutQuantity:1,grainAngleDeg:0,seamAllowance:1,
  points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
]}
const explorer=buildAccuMarkExplorerOrder20261024(project,
 {styleId:'TEE-ONETIME',orderId:'ORDER-ONETIME',quantitiesBySize:quantities})
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
const packet={manifest:built.manifest,manifestSha256:built.manifestSha256},outbound=built.wiresBySize
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
 receiverVersion:'1.0',receiverSessionId:'ONE_TIME_SESSION_001',
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
 receiverSessionId:'ONE_TIME_SESSION_001',keyId:'receiver1',
 publicKeySha256:sha256Bytes(keyBytes),handoffManifestSha256:built.manifestSha256,
 challenge,issuedAfter:'2026-10-28T13:50:00.000Z',issuedBefore:'2026-10-28T14:00:00.000Z',
 challengeIssuedAt:'2026-10-28T13:52:00.000Z'}
const issuerKeys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
const issuerPublic=new Uint8Array(await webcrypto.subtle.exportKey('raw',issuerKeys.publicKey))
const issuerAudience='EXO_RECEIVING_GATE',ledgerNamespace='DISPOSABLE_TEE_LEDGER'
const trustedIssuerKeys={issuer1:{role:'receiving-challenge-issuer',
 publicKeyRawBase64:b64(issuerPublic),issuerAudience,ledgerNamespace,
 receiverApplication:policy.receiverApplication,
 receiverPublicKeySha256:policy.publicKeySha256}}
const issuancePayload={format:'exo.receiving-challenge-issuance.v1',issuerKeyId:'issuer1',
 issuerAudience,ledgerNamespace,
 challenge:policy.challenge,handoffManifestSha256:policy.handoffManifestSha256,
 receiverApplication:policy.receiverApplication,receiverVersion:policy.receiverVersion,
 receiverKeyId:policy.keyId,
 receiverSessionId:policy.receiverSessionId,receiverPublicKeySha256:policy.publicKeySha256,
 issuedAfter:policy.issuedAfter,issuedBefore:policy.issuedBefore,
 challengeIssuedAt:policy.challengeIssuedAt,expiresAt:policy.issuedBefore}
const signIssuance=async(payload,privateKey=issuerKeys.privateKey)=>({payload,
 signature:b64(new Uint8Array(await webcrypto.subtle.sign('Ed25519',privateKey,
  encoder.encode('EXO_RECEIVING_CHALLENGE_ISSUANCE_V1\n'+stable(payload)))))})
const issuanceReceipt=await signIssuance(issuancePayload)
const registryKeys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
const registryPublic=new Uint8Array(await webcrypto.subtle.exportKey('raw',registryKeys.publicKey))
const trustedRegistryRoot={publicKeyRawBase64:b64(registryPublic),minimumRegistryVersion:7}
const statusPayload={format:'exo.receiving-issuer-status.v1',issuerAudience,ledgerNamespace,
 registryVersion:7,issuedAt:'2026-10-28T13:58:00.000Z',
 expiresAt:'2026-10-28T14:05:00.000Z',issuerKeys:[{issuerKeyId:'issuer1',
  publicKeySha256:sha256Bytes(issuerPublic),status:'active',revokedAt:null}]}
const signStatus=async(payload,privateKey=registryKeys.privateKey)=>({payload,
 signature:b64(new Uint8Array(await webcrypto.subtle.sign('Ed25519',privateKey,
  encoder.encode('EXO_RECEIVING_ISSUER_STATUS_V1\n'+stable(payload)))))})
const issuerStatusSnapshot=await signStatus(statusPayload)
const legacyPayloadFor=e=>({format:'exo.receiving-CAD-detached-attestation.v1',
 keyId:'receiver1',challenge,handoffManifestSha256:built.manifestSha256,
 receiverApplication:e.receiverApplication,receiverVersion:e.receiverVersion,
 receiverSessionId:e.receiverSessionId,
 issuedAt:'2026-10-28T13:55:00.000Z',expiresAt:'2026-10-28T14:25:00.000Z',
 sizeDigests:Object.fromEntries(sizes.map(size=>[size,{
  outboundSha256:digest(outbound[size]),reexportSha256:digest(e.reexportWiresBySize[size])}]))})
const payloadFor=e=>({...legacyPayloadFor(e),
 format:'exo.receiving-CAD-detached-attestation.v2',
 importRecordsSha256:digest(stable(e.importRecords))})
const sign=async payload=>({payload,signature:b64(new Uint8Array(
 await webcrypto.subtle.sign('Ed25519',keys.privateKey,encoder.encode(stable(payload)))) )})
const run=async(root,e,a,options={})=>inspect(project,explorer,plans,packet,outbound,e,a,
 {policy,trustedKeys,nowMs:now,ledgerRoot:root,issuanceReceipt,trustedIssuerKeys,
  issuerStatusSnapshot,trustedRegistryRoot,
  issuerAudience,ledgerNamespace,
  trustedLedgerNamespaces:{[ledgerNamespace]:typeof root==='string'?await realpath(root).catch(()=>root):root},
  registryStateRoot:typeof root==='string'?join(dirname(root),'private-registry-state'):null,
  trustedRegistryStateNamespaces:{[ledgerNamespace]:typeof root==='string'?
   await realpath(join(dirname(root),'private-registry-state')).catch(()=>null):null},
  ...options})
const withLedger=async fn=>{
 const parent=await mkdtemp(join(tmpdir(),'exo-receiver-onetime-'))
 const root=join(parent,'private-ledger')
 await mkdir(root,{mode:0o700})
 await mkdir(join(parent,'private-registry-state'),{mode:0o700})
 try{await fn(root,parent)}finally{await rm(parent,{recursive:true,force:true})}
}
const refuse=(r,code)=>{
 assert.equal(r.ok,false,JSON.stringify(r))
 assert(r.issues.some(x=>x.code===code),JSON.stringify(r.issues))
 assert.equal(r.receiverChallengeConsumed,false)
 assert.equal(r.receiverCadVerified,false)
 assert.equal(r.cuttingAuthorized,false)
 assert.equal(r.factoryApproved,false)
}

test('valid 2-size, 2-fabric, 9-cut handoff claims a private fsynced receipt once',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const first=await run(root,e,a)
 assert.equal(first.ok,true,JSON.stringify(first.issues))
 assert.equal(first.sizeCount,2)
 assert.equal(first.receiverChallengeConsumed,true)
 assert.equal(first.importRecordsSignatureBound,true)
 assert.equal(first.issuerSignatureVerified,true)
 assert.equal(first.registryFloorVerified,true)
 assert.equal(first.independentReceiverAuthenticated,false)
 assert.equal(first.cuttingAuthorized,false)
 const names=await readdir(root)
 assert.deepEqual(names,[`${digest(challenge)}.claim.json`])
 const claim=JSON.parse(await readFile(join(root,names[0]),'utf8'))
 assert.equal(claim.handoffManifestSha256,built.manifestSha256)
 assert.equal(claim.challengeSha256,digest(challenge))
 assert.equal(claim.challengeIssuedAt,policy.challengeIssuedAt)
 assert.equal(claim.issuerKeyId,'issuer1')
 assert.equal(claim.issuerRegistryVersion,7)
 assert.match(claim.issuerRegistryRootSha256,/^[a-f0-9]{64}$/)
 assert.match(claim.issuerStatusSnapshotSha256,/^[a-f0-9]{64}$/)
 assert.equal(claim.ledgerNamespace,ledgerNamespace)
 assert.match(claim.issuanceReceiptSha256,/^[a-f0-9]{64}$/)
 assert.equal((await stat(join(root,names[0]))).mode&0o077,0)
 const stateRoot=join(dirname(root),'private-registry-state')
 const stateFiles=await readdir(stateRoot)
 assert.equal(stateFiles.length,1)
 assert.match(stateFiles[0],/issuer-registry-v7\.json$/)
 assert.equal((await stat(join(stateRoot,stateFiles[0]))).mode&0o077,0)
 refuse(await run(root,e,a),'RECEIVER_CHALLENGE_ALREADY_CONSUMED')
}))

test('concurrent attempts on one ledger accept exactly one; subsequent attempts refuse',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const results=await Promise.all(Array.from({length:5},()=>run(root,e,a)))
 assert.equal(results.filter(x=>x.ok).length,1,JSON.stringify(results))
 assert.equal(results.filter(x=>!x.ok).length,4)
 for(const result of results.filter(x=>!x.ok)){
  assert(['RECEIVER_CHALLENGE_ALREADY_CONSUMED','RECEIVER_ISSUER_REGISTRY_STATE_BUSY']
   .some(code=>result.issues.some(x=>x.code===code)),JSON.stringify(result))
  assert.equal(result.receiverChallengeConsumed,false)
  assert.equal(result.cuttingAuthorized,false)
 }
 assert.equal((await readdir(root)).length,1)
}))

test('a new Node process cannot reuse the already-consumed challenge',async()=>withLedger(async(root,parent)=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 assert.equal((await run(root,e,a)).ok,true)
 const fixturePath=join(parent,'disposable-child-input.json')
 await writeFile(fixturePath,JSON.stringify({args:[project,explorer,plans,packet,outbound,e,a],
  options:{policy,trustedKeys,nowMs:now,ledgerRoot:root,
	   issuanceReceipt,trustedIssuerKeys,issuerStatusSnapshot,trustedRegistryRoot,
	   issuerAudience,ledgerNamespace,
 	   trustedLedgerNamespaces:{[ledgerNamespace]:await realpath(root)},
 	   registryStateRoot:join(parent,'private-registry-state'),
 	   trustedRegistryStateNamespaces:{[ledgerNamespace]:
 	    await realpath(join(parent,'private-registry-state'))}}}),{mode:0o600})
 const child=`import {readFile} from 'node:fs/promises';\n`+
  `const {inspectIndustrialReceivingOneTimeChallenge20261028:check}=await import(process.argv[1]);\n`+
  `const {args,options}=JSON.parse(await readFile(process.argv[2],'utf8'));\n`+
  `const result=await check(...args,options);console.log(JSON.stringify(result));`
 const output=execFileSync(process.execPath,['--input-type=module','-e',child,
  new URL('./industrialReceivingOneTimeChallenge20261028.mjs',import.meta.url).href,
  fixturePath],{encoding:'utf8'})
 refuse(JSON.parse(output),'RECEIVER_CHALLENGE_ALREADY_CONSUMED')
}))

test('incomplete crash residue blocks replay rather than clearing a claim',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 await writeFile(join(root,`${digest(challenge)}.claim.json`),'',{mode:0o600})
 refuse(await run(root,e,a),'RECEIVER_CHALLENGE_ALREADY_CONSUMED')
 assert.equal((await readFile(join(root,`${digest(challenge)}.claim.json`),'utf8')),'')
}))

test('invalid signature or mutated notch never consumes challenge, then valid evidence may claim',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const forged={...a,signature:a.signature.replace(/^./,a.signature[0]==='A'?'B':'A')}
 refuse(await run(root,e,forged),'RECEIVER_PINNED_SIGNATURE_OR_GEOMETRY_DRIFT')
 const altered=boundEvidence()
 altered.reexportWiresBySize.M=altered.reexportWiresBySize.M.replace('NOTCH_FRONT','NOTCH_BROKEN')
 altered.importRecords.find(x=>x.size==='M').reexportSha256=digest(altered.reexportWiresBySize.M)
 altered.importRecords.find(x=>x.size==='M').layerCounts=counts(altered.reexportWiresBySize.M)
 refuse(await run(root,altered,await sign(payloadFor(altered))),'RECEIVER_PINNED_SIGNATURE_OR_GEOMETRY_DRIFT')
 assert.deepEqual(await readdir(root),[])
 const accepted=await run(root,e,a)
 assert.equal(accepted.ok,true,JSON.stringify(accepted.issues))
}))

test('missing, untrusted, or symlink ledger blocks without writing claims',async()=>withLedger(async(root,parent)=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 refuse(await run(null,e,a),'RECEIVER_CHALLENGE_LEDGER_REQUIRED')
 refuse(await run(join(parent,'absent'),e,a),'RECEIVER_CHALLENGE_LEDGER_UNAVAILABLE')
 const unsafe=join(parent,'world-writable')
 await mkdir(unsafe,{mode:0o777})
 // Explicit chmod because process umask can otherwise make mkdir safe.
 const {chmod}=await import('node:fs/promises')
 await chmod(unsafe,0o777)
 refuse(await run(unsafe,e,a),'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED')
 const alias=join(parent,'ledger-symlink')
 await symlink(root,alias)
 refuse(await run(alias,e,a),'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED')
 assert.deepEqual(await readdir(root),[])
}))

test('legacy v1 signed receipts cannot consume a one-time challenge; v2 still claims once',async()=>withLedger(async root=>{
 const e=boundEvidence()
 const legacy=await run(root,e,await sign(legacyPayloadFor(e)))
 refuse(legacy,'RECEIVER_PINNED_IMPORT_RECORD_BINDING_REQUIRED')
 assert.deepEqual(await readdir(root),[])
 const accepted=await run(root,e,await sign(payloadFor(e)))
 assert.equal(accepted.ok,true,JSON.stringify(accepted.issues))
 assert.equal(accepted.importRecordsSignatureBound,true)
 assert.equal(accepted.receiverChallengeConsumed,true)
 refuse(await run(root,e,await sign(payloadFor(e))),'RECEIVER_CHALLENGE_ALREADY_CONSUMED')
}))

test('substituted v2 import receipt fails without writing a one-time claim',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 e.importRecords[1].reexportArtifactId='REPLACED-ARTIFACT'
 refuse(await run(root,e,a),'RECEIVER_PINNED_SIGNATURE_OR_GEOMETRY_DRIFT')
 assert.deepEqual(await readdir(root),[])
}))

test('private leaf beneath a world-writable nonsticky ancestor cannot claim',async()=>withLedger(async(root,parent)=>{
 const unsafe=join(parent,'unsafe-ancestor')
 await mkdir(unsafe,{mode:0o700})
 await chmod(unsafe,0o777)
 const leaf=join(unsafe,'private-ledger')
 await mkdir(leaf,{mode:0o700})
 const e=boundEvidence(),a=await sign(payloadFor(e))
 refuse(await run(leaf,e,a),'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED')
 assert.deepEqual(await readdir(leaf),[])
 assert.deepEqual(await readdir(root),[])
}))

test('user-owned symlink ancestor is not a trusted ledger alias',async()=>withLedger(async(root,parent)=>{
 const alias=join(parent,'alias-parent')
 await symlink(parent,alias)
 const e=boundEvidence(),a=await sign(payloadFor(e))
 refuse(await run(join(alias,'private-ledger'),e,a),'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED')
 assert.deepEqual(await readdir(root),[])
}))

test('pinned ledger descriptor detects directory replacement without following new leaf',async()=>withLedger(async(root,parent)=>{
 const ledger=await openTrustedReceivingLedger20261029(root)
 assert.equal(ledger.ok,true,JSON.stringify(ledger))
 try{
  assert.equal(await verifyTrustedReceivingLedger20261029(ledger),true)
  const original=join(parent,'original-private-ledger')
  await rename(root,original)
  await mkdir(root,{mode:0o700})
  assert.equal(await verifyTrustedReceivingLedger20261029(ledger),false)
  assert.deepEqual(await readdir(root),[])
  assert.deepEqual(await readdir(original),[])
 }finally{await ledger.handle.close()}
}))

test('re-signed pre-challenge import cannot consume claim; fresh all-size process can',async()=>withLedger(async root=>{
 const stale=boundEvidence()
 stale.importRecords[1].importedAt='2026-10-28T13:49:59.999Z'
 refuse(await run(root,stale,await sign(payloadFor(stale))),
  'RECEIVER_PINNED_IMPORT_OUTSIDE_CHALLENGE_WINDOW')
 assert.deepEqual(await readdir(root),[])
 const fresh=boundEvidence(),accepted=await run(root,fresh,await sign(payloadFor(fresh)))
 assert.equal(accepted.ok,true,JSON.stringify(accepted.issues))
 assert.equal(accepted.receiverChallengeConsumed,true)
 assert.equal(accepted.cuttingAuthorized,false)
 assert.equal((await readdir(root)).length,1)
}))

test('pre-challenge all-size export receipts cannot consume a one-time claim',async()=>withLedger(async root=>{
 const stale=boundEvidence()
 for(const row of stale.importRecords){
  row.importedAt='2026-10-28T13:48:00.000Z'
  row.exportedAt='2026-10-28T13:49:00.000Z'
 }
 refuse(await run(root,stale,await sign(payloadFor(stale))),
  'RECEIVER_PINNED_IMPORT_OUTSIDE_CHALLENGE_WINDOW')
 assert.deepEqual(await readdir(root),[])
}))

test('pre-challenge receipt inside broad policy window still cannot consume claim',async()=>withLedger(async root=>{
 const stale=boundEvidence()
 stale.importRecords[0].importedAt='2026-10-28T13:51:59.999Z'
 refuse(await run(root,stale,await sign(payloadFor(stale))),
  'RECEIVER_PINNED_IMPORT_OUTSIDE_CHALLENGE_WINDOW')
 assert.deepEqual(await readdir(root),[])
}))

test('missing precise issuance timestamp fails before writing a claim',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const {challengeIssuedAt,...missing}=policy
 refuse(await run(root,e,a,{policy:missing}),'INVALID_PINNED_RECEIVER_POLICY')
 assert.deepEqual(await readdir(root),[])
}))

test('missing issuer signature and missing trust anchor cannot consume all-size challenge',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 refuse(await run(root,e,a,{issuanceReceipt:null}),'RECEIVER_ISSUANCE_RECEIPT_REQUIRED')
 refuse(await run(root,e,a,{trustedIssuerKeys:null}),'RECEIVER_ISSUANCE_RECEIPT_REQUIRED')
 assert.deepEqual(await readdir(root),[])
 assert.equal((await run(root,e,a)).issuerSignatureVerified,true)
}))

test('signed issuance receipt for a different manifest or receiver session cannot claim',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 for(const field of ['handoffManifestSha256','receiverSessionId','receiverPublicKeySha256',
  'challenge','receiverApplication','receiverVersion','receiverKeyId']){
  const changed={...issuancePayload,[field]:field==='receiverSessionId'?'OTHER_SESSION':'a4'.repeat(32)}
  refuse(await run(root,e,a,{issuanceReceipt:await signIssuance(changed)}),
   'RECEIVER_ISSUANCE_CONTEXT_DRIFT')
 }
 assert.deepEqual(await readdir(root),[])
}))

test('re-signed issuance chronology substitution cannot claim',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 for(const field of ['challengeIssuedAt','issuedAfter','issuedBefore']){
  const changed={...issuancePayload,[field]:'2026-10-28T13:51:00.000Z'}
  refuse(await run(root,e,a,{issuanceReceipt:await signIssuance(changed)}),
   'RECEIVER_ISSUANCE_CONTEXT_DRIFT')
 }
 assert.deepEqual(await readdir(root),[])
}))

test('issuer receipt signature substitution cannot consume challenge',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const forged={...issuanceReceipt,signature:issuanceReceipt.signature.replace(/^./,
  issuanceReceipt.signature[0]==='A'?'B':'A')}
 refuse(await run(root,e,a,{issuanceReceipt:forged}),'RECEIVER_ISSUANCE_INVALID_SIGNATURE')
 assert.deepEqual(await readdir(root),[])
}))

test('receiver signing key cannot double as issuer signing key',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const fakeAnchor={issuer1:{role:'receiving-challenge-issuer',
  publicKeyRawBase64:trustedKeys.receiver1.publicKeyRawBase64,issuerAudience,
  ledgerNamespace,receiverApplication:policy.receiverApplication,
  receiverPublicKeySha256:policy.publicKeySha256}}
 const selfIssued=await signIssuance(issuancePayload,keys.privateKey)
 refuse(await run(root,e,a,{trustedIssuerKeys:fakeAnchor,issuanceReceipt:selfIssued}),
  'RECEIVER_ISSUANCE_UNTRUSTED_ISSUER')
 assert.deepEqual(await readdir(root),[])
}))

test('issuer role downgrade and unknown issuer cannot consume challenge',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 refuse(await run(root,e,a,{trustedIssuerKeys:{issuer1:{
  ...trustedIssuerKeys.issuer1,role:'receiving-cad-signer'}}}),
  'RECEIVER_ISSUANCE_UNTRUSTED_ISSUER')
 const other=await signIssuance({...issuancePayload,issuerKeyId:'unknown'})
 refuse(await run(root,e,a,{issuanceReceipt:other}),'RECEIVER_ISSUANCE_UNTRUSTED_ISSUER')
 assert.deepEqual(await readdir(root),[])
}))

test('cross-service issuer audience and ledger namespace substitution cannot claim',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 refuse(await run(root,e,a,{issuerAudience:'OTHER_RECEIVING_SERVICE'}),
  'RECEIVER_ISSUANCE_CONTEXT_DRIFT')
 refuse(await run(root,e,a,{ledgerNamespace:'OTHER_LEDGER',
  trustedLedgerNamespaces:{OTHER_LEDGER:await realpath(root)}}),
  'RECEIVER_ISSUANCE_CONTEXT_DRIFT')
 assert.deepEqual(await readdir(root),[])
}))

test('expired or extended issuer-signed receipt cannot claim, then valid receipt claims',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const expired=await signIssuance({...issuancePayload,expiresAt:'2026-10-28T13:59:59.999Z'})
 refuse(await run(root,e,a,{issuanceReceipt:expired}),'RECEIVER_ISSUANCE_TIME_DRIFT')
 const extended=await signIssuance({...issuancePayload,expiresAt:'2026-10-28T14:00:00.001Z'})
 refuse(await run(root,e,a,{issuanceReceipt:extended}),'RECEIVER_ISSUANCE_TIME_DRIFT')
 assert.deepEqual(await readdir(root),[])
 assert.equal((await run(root,e,a)).ok,true)
}))

test('issuer anchor cannot authorize a different receiving audience or ledger namespace',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 for(const field of ['issuerAudience','ledgerNamespace','receiverApplication','receiverPublicKeySha256']){
  const anchor={...trustedIssuerKeys.issuer1,[field]:'OTHER_SCOPE'}
  refuse(await run(root,e,a,{trustedIssuerKeys:{issuer1:anchor}}),
   'RECEIVER_ISSUANCE_UNTRUSTED_ISSUER')
 }
 assert.deepEqual(await readdir(root),[])
}))

test('second private ledger cannot replay same signed namespace with trusted mapping',async()=>withLedger(async(root,parent)=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const alternate=join(parent,'alternate-ledger')
 await mkdir(alternate,{mode:0o700})
 refuse(await run(alternate,e,a,{trustedLedgerNamespaces:{[ledgerNamespace]:await realpath(root)}}),
  'RECEIVER_CHALLENGE_LEDGER_NAMESPACE_DRIFT')
 refuse(await run(root,e,a,{trustedLedgerNamespaces:{}}),
  'RECEIVER_CHALLENGE_LEDGER_NAMESPACE_DRIFT')
 assert.deepEqual(await readdir(alternate),[])
 assert.deepEqual(await readdir(root),[])
 const accepted=await run(root,e,a)
 assert.equal(accepted.ok,true,JSON.stringify(accepted.issues))
}))

test('missing independently signed issuer status refuses claim before ledger mutation',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 refuse(await run(root,e,a,{issuerStatusSnapshot:null}),'RECEIVER_ISSUER_REGISTRY_REQUIRED')
 refuse(await run(root,e,a,{trustedRegistryRoot:null}),'RECEIVER_ISSUER_REGISTRY_REQUIRED')
 assert.deepEqual(await readdir(root),[])
 assert.equal((await run(root,e,a)).issuerStatusVerified,true)
}))

test('a still-provisioned but registry-revoked issuer cannot consume a challenge',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const revoked=await signStatus({...statusPayload,issuerKeys:[{
  ...statusPayload.issuerKeys[0],status:'revoked',revokedAt:'2026-10-28T13:57:00.000Z'}]})
 refuse(await run(root,e,a,{issuerStatusSnapshot:revoked}),'RECEIVER_ISSUER_KEY_REVOKED')
 assert.deepEqual(await readdir(root),[])
 // Replacing a signed revoked V7 with a different signed active V7 is
 // registry equivocation, not permission to restore the issuer.
 refuse(await run(root,e,a),'RECEIVER_ISSUER_REGISTRY_VERSION_EQUIVOCATION')
}))

test('status tampering and a registry signer not trusted as root cannot claim',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const forged={...issuerStatusSnapshot,payload:{...statusPayload,issuerKeys:[{
  ...statusPayload.issuerKeys[0],status:'revoked',revokedAt:'2026-10-28T13:57:00.000Z'}]}}
 refuse(await run(root,e,a,{issuerStatusSnapshot:forged}),
  'RECEIVER_ISSUER_REGISTRY_INVALID_SIGNATURE')
 const issuerAsRoot={publicKeyRawBase64:b64(issuerPublic),minimumRegistryVersion:7}
 refuse(await run(root,e,a,{trustedRegistryRoot:issuerAsRoot}),
  'RECEIVER_ISSUER_REGISTRY_UNTRUSTED_ROOT')
 const receiverAsRoot={publicKeyRawBase64:b64(keyBytes),minimumRegistryVersion:7}
 refuse(await run(root,e,a,{trustedRegistryRoot:receiverAsRoot}),
  'RECEIVER_ISSUER_REGISTRY_UNTRUSTED_ROOT')
 assert.deepEqual(await readdir(root),[])
}))

test('stale, pre-challenge and version-rollback registry snapshots fail closed',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const cases=[
  [{...statusPayload,registryVersion:6},'RECEIVER_ISSUER_REGISTRY_SCOPE_OR_VERSION_DRIFT'],
  [{...statusPayload,issuedAt:'2026-10-28T13:51:59.999Z'},'RECEIVER_ISSUER_REGISTRY_STALE'],
  [{...statusPayload,expiresAt:'2026-10-28T13:59:59.999Z'},'RECEIVER_ISSUER_REGISTRY_STALE'],
  [{...statusPayload,expiresAt:'2026-10-28T14:14:00.001Z'},'RECEIVER_ISSUER_REGISTRY_STALE'],
 ]
 for(const [payload,code] of cases)
  refuse(await run(root,e,a,{issuerStatusSnapshot:await signStatus(payload)}),code)
 assert.deepEqual(await readdir(root),[])
}))

test('issuer key substitution, missing registry entry and duplicate identities fail closed',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 for(const [index,issuerKeys] of [
  [{...statusPayload.issuerKeys[0],publicKeySha256:'ab'.repeat(32)}],
  [{...statusPayload.issuerKeys[0],issuerKeyId:'different'}],
 ].entries()){
  refuse(await run(root,e,a,{issuerStatusSnapshot:await signStatus({...statusPayload,issuerKeys})}),
   index===0?'RECEIVER_ISSUER_KEY_NOT_LISTED':
    'RECEIVER_ISSUER_REGISTRY_VERSION_EQUIVOCATION')
 }
 const dup=[statusPayload.issuerKeys[0],{...statusPayload.issuerKeys[0]}]
 refuse(await run(root,e,a,{issuerStatusSnapshot:await signStatus({...statusPayload,issuerKeys:dup})}),
  'RECEIVER_ISSUER_REGISTRY_MALFORMED')
 assert.deepEqual(await readdir(root),[])
}))

test('externally advanced trusted registry floor blocks an earlier still-live active snapshot',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const revocation=await signStatus({...statusPayload,registryVersion:8,
  issuedAt:'2026-10-28T13:59:00.000Z',issuerKeys:[{
   ...statusPayload.issuerKeys[0],status:'revoked',revokedAt:'2026-10-28T13:58:30.000Z'}]})
 const advancedRoot={...trustedRegistryRoot,minimumRegistryVersion:8}
 refuse(await run(root,e,a,{trustedRegistryRoot:advancedRoot}),
  'RECEIVER_ISSUER_REGISTRY_SCOPE_OR_VERSION_DRIFT')
 refuse(await run(root,e,a,{trustedRegistryRoot:advancedRoot,issuerStatusSnapshot:revocation}),
  'RECEIVER_ISSUER_KEY_REVOKED')
 assert.deepEqual(await readdir(root),[])
 // This case checks an externally advanced minimum. Separate tests below
 // exercise the new local persistent floor. Neither mechanism distributes
 // revocations or synchronizes different receiving hosts automatically.
}))

test('signed V8 revocation durably blocks later still-live signed V7 without consuming CUT claim',async()=>withLedger(async(root,parent)=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const revoked=await signStatus({...statusPayload,registryVersion:8,
  issuedAt:'2026-10-28T13:59:00.000Z',issuerKeys:[{
   ...statusPayload.issuerKeys[0],status:'revoked',revokedAt:'2026-10-28T13:58:30.000Z'}]})
 refuse(await run(root,e,a,{issuerStatusSnapshot:revoked}),'RECEIVER_ISSUER_KEY_REVOKED')
 assert.deepEqual(await readdir(root),[])
 const observations=(await readdir(join(parent,'private-registry-state')))
  .filter(name=>name.endsWith('.json'))
 assert.equal(observations.length,1)
 assert.match(observations[0],/issuer-registry-v8\.json$/)
 refuse(await run(root,e,a),'RECEIVER_ISSUER_REGISTRY_VERSION_ROLLBACK')
 assert.deepEqual(await readdir(root),[])
}))

test('fresh receiving process cannot roll a persisted V8 revocation back to signed V7',async()=>withLedger(async(root,parent)=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const revoked=await signStatus({...statusPayload,registryVersion:8,
  issuedAt:'2026-10-28T13:59:00.000Z',issuerKeys:[{
   ...statusPayload.issuerKeys[0],status:'revoked',revokedAt:'2026-10-28T13:58:30.000Z'}]})
 refuse(await run(root,e,a,{issuerStatusSnapshot:revoked}),'RECEIVER_ISSUER_KEY_REVOKED')
 const fixturePath=join(parent,'disposable-registry-restart.json')
 await writeFile(fixturePath,JSON.stringify({args:[project,explorer,plans,packet,outbound,e,a],
  options:{policy,trustedKeys,nowMs:now,ledgerRoot:root,issuanceReceipt,trustedIssuerKeys,
   issuerStatusSnapshot,trustedRegistryRoot,issuerAudience,ledgerNamespace,
   trustedLedgerNamespaces:{[ledgerNamespace]:await realpath(root)},
   registryStateRoot:join(parent,'private-registry-state'),
   trustedRegistryStateNamespaces:{[ledgerNamespace]:
    await realpath(join(parent,'private-registry-state'))}}}),{mode:0o600})
 const child=`import {readFile} from 'node:fs/promises';\n`+
  `const {inspectIndustrialReceivingOneTimeChallenge20261028:check}=await import(process.argv[1]);\n`+
  `const {args,options}=JSON.parse(await readFile(process.argv[2],'utf8'));\n`+
  `console.log(JSON.stringify(await check(...args,options)));`
 const output=execFileSync(process.execPath,['--input-type=module','-e',child,
  new URL('./industrialReceivingOneTimeChallenge20261028.mjs',import.meta.url).href,
  fixturePath],{encoding:'utf8'})
 refuse(JSON.parse(output),'RECEIVER_ISSUER_REGISTRY_VERSION_ROLLBACK')
 assert.deepEqual(await readdir(root),[])
}))

test('an accepted V7 cannot be replayed after a signed V8 revocation, even for an already claimed challenge',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 assert.equal((await run(root,e,a)).ok,true)
 const revoked=await signStatus({...statusPayload,registryVersion:8,
  issuedAt:'2026-10-28T13:59:00.000Z',issuerKeys:[{
   ...statusPayload.issuerKeys[0],status:'revoked',revokedAt:'2026-10-28T13:58:30.000Z'}]})
 refuse(await run(root,e,a,{issuerStatusSnapshot:revoked}),'RECEIVER_ISSUER_KEY_REVOKED')
 refuse(await run(root,e,a),'RECEIVER_ISSUER_REGISTRY_VERSION_ROLLBACK')
 assert.equal((await readdir(root)).length,1)
}))

test('different signed snapshots at one registry version cannot replace prior evidence',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 assert.equal((await run(root,e,a)).ok,true)
 const equivocation=await signStatus({...statusPayload,
  issuedAt:'2026-10-28T13:59:00.000Z'})
 refuse(await run(root,e,a,{issuerStatusSnapshot:equivocation}),
  'RECEIVER_ISSUER_REGISTRY_VERSION_EQUIVOCATION')
 assert.equal((await readdir(root)).length,1)
}))

test('registry signing-root rotation cannot silently reset the existing local version floor',async()=>withLedger(async root=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 assert.equal((await run(root,e,a)).ok,true)
 const rotated=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
 const rotatedPublic=new Uint8Array(await webcrypto.subtle.exportKey('raw',rotated.publicKey))
 const rotatedRoot={publicKeyRawBase64:b64(rotatedPublic),minimumRegistryVersion:8}
 const v8=await signStatus({...statusPayload,registryVersion:8,
  issuedAt:'2026-10-28T13:59:00.000Z'},rotated.privateKey)
 refuse(await run(root,e,a,{trustedRegistryRoot:rotatedRoot,issuerStatusSnapshot:v8}),
  'RECEIVER_ISSUER_REGISTRY_STATE_CORRUPT')
 assert.equal((await readdir(root)).length,1)
}))

test('corrupted append-only registry observation blocks further local acceptance',async()=>withLedger(async(root,parent)=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 assert.equal((await run(root,e,a)).ok,true)
 const stateRoot=join(parent,'private-registry-state')
 const observation=(await readdir(stateRoot)).find(name=>name.endsWith('.json'))
 assert(observation)
 // Tamper only with a disposable local test file. Production never repairs
 // or truncates an uncertain registry observation automatically.
 await writeFile(join(stateRoot,observation),'{',{mode:0o600})
 const v8=await signStatus({...statusPayload,registryVersion:8,
  issuedAt:'2026-10-28T13:59:00.000Z'})
 refuse(await run(root,e,a,{issuerStatusSnapshot:v8}),
  'RECEIVER_ISSUER_REGISTRY_STATE_CORRUPT')
 assert.equal((await readdir(root)).length,1)
}))

test('missing, unmapped and symlinked registry state directories refuse claims',async()=>withLedger(async(root,parent)=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 refuse(await run(root,e,a,{registryStateRoot:null}),
  'RECEIVER_ISSUER_REGISTRY_STATE_REQUIRED')
 refuse(await run(root,e,a,{trustedRegistryStateNamespaces:{}}),
  'RECEIVER_ISSUER_REGISTRY_STATE_NAMESPACE_DRIFT')
 const alias=join(parent,'registry-state-symlink')
 await symlink(join(parent,'private-registry-state'),alias)
 refuse(await run(root,e,a,{registryStateRoot:alias}),
  'RECEIVER_ISSUER_REGISTRY_STATE_UNTRUSTED')
 assert.deepEqual(await readdir(root),[])
 assert.deepEqual(await readdir(join(parent,'private-registry-state')),[])
}))

test('orphaned exclusive registry lock is never stolen or auto-cleared',async()=>withLedger(async(root,parent)=>{
 const e=boundEvidence(),a=await sign(payloadFor(e))
 const stateRoot=join(parent,'private-registry-state')
 const lock=join(stateRoot,digest(issuerAudience+'\n'+ledgerNamespace)+'.issuer-registry.lock')
 await writeFile(lock,'SIMULATED_CRASH\n',{mode:0o600})
 refuse(await run(root,e,a),'RECEIVER_ISSUER_REGISTRY_STATE_BUSY')
 assert.equal(await readFile(lock,'utf8'),'SIMULATED_CRASH\n')
 assert.deepEqual(await readdir(root),[])
}))
