// Optional detached Ed25519 receiver-evidence gate. A key must be provisioned
// by the caller OUTSIDE the unsigned CAD evidence packet. Cryptographic
// validity does not establish that a licensed CAD application ran or authorize
// cutting. This module does not transmit, persist or release factory records.
import {inspectIndustrialCadReceivingReexport20261028} from './industrialCadReceivingReexport20261028.mjs'
import {sha256Bytes} from './sha256Bytes.js'

const encoder=new TextEncoder()
const keys=['challenge','expiresAt','format','handoffManifestSha256','issuedAt','keyId',
 'receiverApplication','receiverSessionId','receiverVersion','sizeDigests']
const keysV2=[...keys,'importRecordsSha256']
const receiptFields=['size','imported','sourceSha256','reexportSha256','layerCounts',
 'receiverApplication','receiverVersion','receiverSessionId','importOperationId',
 'sourceArtifactId','reexportArtifactId','importedAt','exportedAt']
const denied=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
 receiverSignatureVerified:false,importRecordsSignatureBound:false,
 independentReceiverAuthenticated:false,
 receiverCadVerified:false,aamaCertified:false,astmCertified:false,
 cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false})
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(x))
const exact=(x,expected)=>plain(x)&&Object.keys(x).sort().join('|')===expected.slice().sort().join('|')
const stable=x=>Array.isArray(x)?`[${x.map(stable).join(',')}]`:
 plain(x)?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`:
 JSON.stringify(x)
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,96}$/.test(x)
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x
const digest=x=>sha256Bytes(encoder.encode(x))
// Canonical JSON only: reject undefined, sparse arrays, non-finite numbers,
// exotic prototypes and cycles rather than signing an ambiguous process log.
function canonicalJson(value,seen=new Set(),depth=0){
 if(depth>32)throw Error('Receiver import record nesting limit')
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value)
 if(typeof value==='number'){
  if(!Number.isFinite(value))throw Error('Nonfinite receiver import record')
  return JSON.stringify(value)
 }
 if(!Array.isArray(value)&&!plain(value))throw Error('Non-JSON receiver import record')
 if(seen.has(value))throw Error('Cyclic receiver import record')
 seen.add(value)
 let result
 if(Array.isArray(value)){
  if(Object.keys(value).length!==value.length||
    !Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean))
   throw Error('Sparse receiver import record')
  result=`[${value.map(v=>canonicalJson(v,seen,depth+1)).join(',')}]`
 }else result=`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k],seen,depth+1)}`).join(',')}}`
 seen.delete(value)
 return result
}
function decode64(raw){
 if(typeof raw!=='string'||!raw.length||raw.length>256||
   !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw))
  throw Error('Invalid base64 signature or key')
 const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0))
 if(btoa(String.fromCharCode(...bytes))!==raw)throw Error('Noncanonical base64')
 return bytes
}

/**
 * Verify a separately provisioned public key, exact all-size source and
 * receiver wire digests, and a caller-issued challenge with a short validity
 * window. Positive results prove ONLY local signature integrity and the
 * already-audited DXF geometry. The caller must authenticate the key owner,
 * the actual CAD import process and receiving organization out-of-band.
 * v2 additionally signs the entire canonical import-process receipt array;
 * v1 remains legacy and explicitly reports that receipt binding is absent.
 */
export async function inspectIndustrialReceivingSignedEvidence20261028(
 project,explorer,plansByFabric,handoffPacket,outboundWires,evidence,attestation,
 {trustedKeys=null,expectedChallenge=null,nowMs=Date.now()}={},
){
 try{
  if(!plain(attestation)||!exact(attestation,['payload','signature'])||
    !plain(attestation.payload)||!plain(trustedKeys)||
    typeof expectedChallenge!=='string'||!/^[a-f0-9]{32,128}$/.test(expectedChallenge)||
    !Number.isFinite(nowMs))return denied('INVALID_SIGNED_RECEIVER_INPUT')
  const p=attestation.payload
  const recordBound=p.format==='exo.receiving-CAD-detached-attestation.v2'
  if(!(recordBound?exact(p,keysV2):exact(p,keys))||
    (!recordBound&&p.format!=='exo.receiving-CAD-detached-attestation.v1')||
    !/^[A-Za-z0-9_-]{1,72}$/.test(p.keyId||'')||
    p.challenge!==expectedChallenge||!hex(p.handoffManifestSha256)||
    !plain(p.sizeDigests)||!exact(p.sizeDigests,project?.grading?.sizes||[])||
    !plain(evidence)||!plain(evidence.reexportWiresBySize)||
    p.handoffManifestSha256!==evidence.handoffManifestSha256||
    p.receiverApplication!==evidence.receiverApplication||
    p.receiverVersion!==evidence.receiverVersion||
    p.receiverSessionId!==evidence.receiverSessionId)
   return denied('RECEIVER_SIGNED_CLAIM_DRIFT')
  if(recordBound){
   if(!hex(p.importRecordsSha256)||!Array.isArray(evidence.importRecords)||
     evidence.importRecords.length!==project.grading.sizes.length)
    return denied('RECEIVER_SIGNED_IMPORT_RECORD_DRIFT')
   try{
    const serialized=canonicalJson(evidence.importRecords)
    if(encoder.encode(serialized).length>2_000_000||digest(serialized)!==p.importRecordsSha256)
     return denied('RECEIVER_SIGNED_IMPORT_RECORD_DRIFT')
   }catch{return denied('RECEIVER_SIGNED_IMPORT_RECORD_DRIFT')}
   const seenOperations=new Set()
   for(const row of evidence.importRecords){
    if(!exact(row,receiptFields)||!project.grading.sizes.includes(row.size)||
      row.imported!==true||row.receiverApplication!==p.receiverApplication||
      row.receiverVersion!==p.receiverVersion||row.receiverSessionId!==p.receiverSessionId||
      !token(row.importOperationId)||!token(row.sourceArtifactId)||
      !token(row.reexportArtifactId)||seenOperations.has(row.importOperationId)||
      !iso(row.importedAt)||!iso(row.exportedAt)||
      Date.parse(row.exportedAt)<Date.parse(row.importedAt)||
      Date.parse(row.importedAt)<Date.parse(p.issuedAt)-3_600_000||
      Date.parse(row.exportedAt)>Date.parse(p.issuedAt))
     return denied('RECEIVER_SIGNED_IMPORT_PROCESS_DRIFT')
    seenOperations.add(row.importOperationId)
   }
  }
  const start=Date.parse(p.issuedAt),end=Date.parse(p.expiresAt)
  if(typeof p.issuedAt!=='string'||typeof p.expiresAt!=='string'||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(p.issuedAt)||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(p.expiresAt)||
    !Number.isFinite(start)||!Number.isFinite(end)||end<=start||
    end-start>3_600_000||start>nowMs+300_000||end<nowMs)
   return denied('RECEIVER_SIGNATURE_EXPIRED_OR_INVALID')
  const sizes=project.grading.sizes
  for(const size of sizes){
   const row=p.sizeDigests[size]
   if(!exact(row,['outboundSha256','reexportSha256'])||
     !hex(row.outboundSha256)||!hex(row.reexportSha256)||
     row.outboundSha256!==digest(outboundWires?.[size]||'')||
     row.reexportSha256!==digest(evidence.reexportWiresBySize[size]||''))
    return denied('RECEIVER_SIGNED_SIZE_DIGEST_DRIFT',size)
  }
  const anchor=Object.hasOwn(trustedKeys,p.keyId)?trustedKeys[p.keyId]:null
  if(!exact(anchor,['application','publicKeyRawBase64'])||
    anchor.application!==p.receiverApplication)
   return denied('UNTRUSTED_RECEIVER_SIGNING_KEY')
  const rawKey=decode64(anchor.publicKeyRawBase64),signature=decode64(attestation.signature)
  if(rawKey.length!==32||signature.length!==64||!globalThis.crypto?.subtle)
   return denied('UNSUPPORTED_RECEIVER_SIGNATURE')
  const publicKey=await globalThis.crypto.subtle.importKey('raw',rawKey,
   {name:'Ed25519'},false,['verify'])
  const valid=await globalThis.crypto.subtle.verify('Ed25519',publicKey,signature,
   encoder.encode(stable(p)))
  if(!valid)return denied('RECEIVER_SIGNATURE_INVALID')
  const local=inspectIndustrialCadReceivingReexport20261028(
   project,explorer,plansByFabric,handoffPacket,outboundWires,evidence)
  if(!local.ok)return denied('RECEIVER_SIGNED_GEOMETRY_OR_ORDER_DRIFT',local.issues)
  return {ok:true,status:'LOCAL_RECEIVER_SIGNED_ARTIFACTS_CROSSCHECKED',issues:[],
   keyId:p.keyId,sizeCount:sizes.length,manifestSha256:p.handoffManifestSha256,
   receiverSignatureVerified:true,receivingGeometryCrosschecked:true,
   importRecordsSignatureBound:recordBound,
   independentReceiverAuthenticated:false,receiverCadVerified:false,
   aamaCertified:false,astmCertified:false,cuttingAuthorized:false,
   factoryApproved:false,manufacturingApproved:false,
   limitations:'The trusted public key must be independently provisioned and authenticated. '
    +'A valid detached signature and local geometry check do not prove a licensed '
    +'CAD import, AAMA/ASTM compliance, physical cutting qualification or factory sign-off.'}
 }catch(error){return denied('RECEIVER_SIGNATURE_INSPECTION_REFUSED',String(error.message||error))}
}
