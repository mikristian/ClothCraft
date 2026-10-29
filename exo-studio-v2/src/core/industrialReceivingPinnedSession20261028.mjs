// Caller-pinned receiving-CAD session policy. Signed DXF evidence by itself
// binds a self-asserted application/version/session; it does NOT prove the
// intended receiving session was used. This optional, read-only guard pins
// those values to an independently provisioned expected handoff context.
// It does not authenticate a licensed CAD product or authorize physical CUT.
import {inspectIndustrialReceivingSignedEvidence20261028} from './industrialReceivingSignedEvidence20261028.mjs'
import {sha256Bytes} from './sha256Bytes.js'

const deny=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
 receiverSignatureVerified:false,receiverSessionPinned:false,importRecordsSignatureBound:false,
 independentReceiverAuthenticated:false,receiverCadVerified:false,
 aamaCertified:false,astmCertified:false,cuttingAuthorized:false,
 factoryApproved:false,manufacturingApproved:false})
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(x))
const exact=(x,fields)=>plain(x)&&Object.keys(x).sort().join('|')===fields.slice().sort().join('|')
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,96}$/.test(x)
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const fields=['receiverApplication','receiverVersion','receiverSessionId','keyId',
 'publicKeySha256','handoffManifestSha256','challenge','issuedAfter','issuedBefore',
 'challengeIssuedAt']
const canonicalIso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x

/**
 * Policy must be supplied separately from evidence, using an out-of-band
 * operator-approved receiver session, key fingerprint and challenge. Passing
 * this test only proves that the signed bytes match that local policy.
 * It cannot prove the key belongs to a real CAD vendor or prevent replay
 * across invocations without a separate durable, single-use challenge ledger.
 */
export async function inspectIndustrialReceivingPinnedSession20261028(
 project,explorer,plansByFabric,handoffPacket,outboundWires,evidence,attestation,
 {policy=null,trustedKeys=null,nowMs=Date.now()}={},
){
 try{
  if(!exact(policy,fields)||!plain(attestation)||!plain(attestation.payload)||
   !plain(trustedKeys)||!Number.isFinite(nowMs)||
   !token(policy.receiverApplication)||!token(policy.receiverVersion)||
   !token(policy.receiverSessionId)||!token(policy.keyId)||
   !hex(policy.publicKeySha256)||!hex(policy.handoffManifestSha256)||
   typeof policy.challenge!=='string'||!/^[a-f0-9]{32,128}$/.test(policy.challenge)||
   !canonicalIso(policy.issuedAfter)||!canonicalIso(policy.issuedBefore)||
   !canonicalIso(policy.challengeIssuedAt))
   return deny('INVALID_PINNED_RECEIVER_POLICY')
  const after=Date.parse(policy.issuedAfter),before=Date.parse(policy.issuedBefore)
  const challengeIssued=Date.parse(policy.challengeIssuedAt)
  if(!Number.isFinite(after)||!Number.isFinite(before)||after>=before||
   before-after>3_600_000||before<nowMs-3_600_000||after>nowMs+300_000||
   challengeIssued<after||challengeIssued>before||challengeIssued>nowMs)
   return deny('INVALID_PINNED_RECEIVER_WINDOW')
  const p=attestation.payload
  if(p.receiverApplication!==policy.receiverApplication||
   p.receiverVersion!==policy.receiverVersion||
   p.receiverSessionId!==policy.receiverSessionId||p.keyId!==policy.keyId||
   p.handoffManifestSha256!==policy.handoffManifestSha256||
   evidence?.receiverApplication!==policy.receiverApplication||
   evidence?.receiverVersion!==policy.receiverVersion||
   evidence?.receiverSessionId!==policy.receiverSessionId||
   evidence?.handoffManifestSha256!==policy.handoffManifestSha256||
   handoffPacket?.manifestSha256!==policy.handoffManifestSha256||
   p.challenge!==policy.challenge)
   return deny('RECEIVER_SESSION_POLICY_DRIFT')
  const issued=Date.parse(p.issuedAt)
  if(!Number.isFinite(issued)||issued<challengeIssued||issued>before||issued>nowMs)
   return deny('RECEIVER_SESSION_ISSUANCE_DRIFT')
  const anchor=Object.hasOwn(trustedKeys,policy.keyId)?trustedKeys[policy.keyId]:null
  if(!plain(anchor)||anchor.application!==policy.receiverApplication||
   typeof anchor.publicKeyRawBase64!=='string')
   return deny('RECEIVER_SESSION_TRUST_ANCHOR_DRIFT')
  const raw=anchor.publicKeyRawBase64
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw)||raw.length>128)
   return deny('RECEIVER_SESSION_TRUST_ANCHOR_DRIFT')
  const key=Uint8Array.from(atob(raw),c=>c.charCodeAt(0))
  if(key.length!==32||sha256Bytes(key)!==policy.publicKeySha256)
   return deny('RECEIVER_SESSION_TRUST_ANCHOR_DRIFT')
  const signed=await inspectIndustrialReceivingSignedEvidence20261028(
   project,explorer,plansByFabric,handoffPacket,outboundWires,evidence,attestation,
   {trustedKeys,expectedChallenge:policy.challenge,nowMs})
  if(!signed.ok)return deny('RECEIVER_PINNED_SIGNATURE_OR_GEOMETRY_DRIFT',signed.issues)
  // A pinned session is a process-evidence gate, not merely a wire-signature
  // check. Legacy v1 signs DXF digests but leaves import receipts substitutable.
  // Reject that downgrade before a one-time challenge can be consumed.
  if(signed.importRecordsSignatureBound!==true)
   return deny('RECEIVER_PINNED_IMPORT_RECORD_BINDING_REQUIRED')
  // The broad policy issuance window is not the actual challenge-creation
  // instant. Require a separately provisioned, exact challenge issuance time;
  // all signed size receipts must postdate that instant, not just the window.
  if(!Array.isArray(evidence.importRecords)||evidence.importRecords.some(row=>
   Date.parse(row.importedAt)<challengeIssued||Date.parse(row.exportedAt)<challengeIssued||
   Date.parse(row.importedAt)>issued||Date.parse(row.exportedAt)>issued||
   Date.parse(row.importedAt)>nowMs||Date.parse(row.exportedAt)>nowMs))
   return deny('RECEIVER_PINNED_IMPORT_OUTSIDE_CHALLENGE_WINDOW')
  return {...signed,status:'LOCAL_PINNED_RECEIVER_SESSION_CROSSCHECKED',
   receiverSessionPinned:true,independentReceiverAuthenticated:false,
   receiverCadVerified:false,aamaCertified:false,astmCertified:false,
   cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
   limitations:'A locally pinned application/version/session/key fingerprint is not '
    +'independent proof that licensed CAD executed. Challenge replay needs an '
    +'external durable one-time ledger. AAMA/ASTM, cutter and factory release remain unverified.'}
 }catch(error){return deny('RECEIVER_PINNED_SESSION_INSPECTION_REFUSED',String(error.message||error))}
}
