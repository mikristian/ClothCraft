// Node-side, opt-in one-use receiver challenge ledger. This is a local
// filesystem replay guard, NOT proof of a licensed receiver or CUT approval.
// It must run in the trusted receiving service, never in a browser or a
// shared writable factory document directory.
import {open} from 'node:fs/promises'
import {join,isAbsolute} from 'node:path'
import {constants} from 'node:fs'
import {inspectIndustrialReceivingPinnedSession20261028} from './industrialReceivingPinnedSession20261028.mjs'
import {openTrustedReceivingLedger20261029,verifyTrustedReceivingLedger20261029}
 from './industrialReceivingLedgerPathGuard20261029.mjs'
import {sha256Bytes} from './sha256Bytes.js'
import {verifyIndustrialReceivingChallengeIssuance20261029} from './industrialReceivingChallengeIssuance20261029.mjs'
import {verifyIndustrialReceivingIssuerStatus20261029} from './industrialReceivingIssuerStatus20261029.mjs'
import {withIndustrialReceivingRegistryVersionFloor20261029}
 from './industrialReceivingRegistryVersionFloor20261029.mjs'

const bytes=new TextEncoder()
const hash=value=>sha256Bytes(bytes.encode(value))
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(x))
const blocked=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
 receiverSignatureVerified:false,receiverSessionPinned:false,
 receiverChallengeConsumed:false,issuerSignatureVerified:false,issuerStatusVerified:false,
 registryFloorVerified:false,
 independentReceiverAuthenticated:false,
 receiverCadVerified:false,aamaCertified:false,astmCertified:false,
 cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false})

/**
 * Inspect the actual pinned all-size CAD handoff first, then atomically claim
 * its independently issued challenge on a private, existing local directory.
 * O_EXCL prevents concurrent/restarted processes from accepting the same
 * challenge twice. A crash after file creation is deliberately fail-closed:
 * an incomplete receipt still blocks replay and requires operator review.
 * This does not provide distributed consensus across different hosts/disks.
 */
export async function inspectIndustrialReceivingOneTimeChallenge20261028(
 project,explorer,plansByFabric,handoffPacket,outboundWires,evidence,attestation,
 {policy=null,trustedKeys=null,nowMs=Date.now(),ledgerRoot=null,
  issuanceReceipt=null,trustedIssuerKeys=null,
  issuerStatusSnapshot=null,trustedRegistryRoot=null,
  issuerAudience=null,ledgerNamespace=null,trustedLedgerNamespaces=null,
  registryStateRoot=null,trustedRegistryStateNamespaces=null}={},
){
 if(typeof ledgerRoot!=='string'||!isAbsolute(ledgerRoot)||!ledgerRoot.length)
  return blocked('RECEIVER_CHALLENGE_LEDGER_REQUIRED')
 const ledger=await openTrustedReceivingLedger20261029(ledgerRoot)
 if(!ledger.ok)return blocked(ledger.code)
 try{
 // The signed namespace must resolve to a single trusted private ledger.
 // A second empty directory cannot silently consume the same challenge under
 // the same namespace when the service's mapping is provisioned out-of-band.
 if(!plain(trustedLedgerNamespaces)||typeof ledgerNamespace!=='string'||
  !Object.hasOwn(trustedLedgerNamespaces,ledgerNamespace)||
  trustedLedgerNamespaces[ledgerNamespace]!==ledger.canonical)
  return blocked('RECEIVER_CHALLENGE_LEDGER_NAMESPACE_DRIFT')
 const verified=await inspectIndustrialReceivingPinnedSession20261028(
  project,explorer,plansByFabric,handoffPacket,outboundWires,evidence,attestation,
  {policy,trustedKeys,nowMs})
 if(!verified.ok)return {...verified,receiverChallengeConsumed:false}
 // A caller-supplied challengeIssuedAt is not sufficient proof of issuance.
 // Require a different, separately trusted issuer to sign the exact policy
 // context before any one-time ledger claim is created.
 const issuance=await verifyIndustrialReceivingChallengeIssuance20261029(
  issuanceReceipt,policy,trustedIssuerKeys,{nowMs,issuerAudience,ledgerNamespace})
 if(!issuance.ok)return blocked(issuance.code)
 // A previously trusted issuer key may have been revoked. Require an
 // independently signed, current key-status snapshot before any claim.
 const issuerStatus=await verifyIndustrialReceivingIssuerStatus20261029(
  issuerStatusSnapshot,trustedRegistryRoot,issuance.issuerKeyId,
  trustedIssuerKeys[issuance.issuerKeyId].publicKeyRawBase64,
  {issuerAudience,ledgerNamespace,challengeIssuedAt:policy.challengeIssuedAt,
   receiverPublicKeySha256:policy.publicKeySha256,nowMs})
 if(!issuerStatus.registrySignatureVerified)return blocked(issuerStatus.code)
 // A signed V8 revocation must become durable even when it refuses the
 // current issuer. Hold one local registry-state lock through the receiving
 // challenge claim so a concurrent V7 cannot overtake an observed V8.
 const floorResult=await withIndustrialReceivingRegistryVersionFloor20261029({
  stateRoot:registryStateRoot,issuerAudience,ledgerNamespace,
  trustedStateNamespaces:trustedRegistryStateNamespaces,
  registryRootSha256:issuerStatus.registryRootSha256,
  registryVersion:issuerStatus.registryVersion,
  issuerStatusSnapshotSha256:issuerStatus.issuerStatusSnapshotSha256,
 },async()=>{
 if(!issuerStatus.ok)return blocked(issuerStatus.code)
 if(!await verifyTrustedReceivingLedger20261029(ledger))
  return blocked('RECEIVER_CHALLENGE_LEDGER_CHANGED')

 // The challenge is globally one-use for this ledger, not merely per manifest
 // or per session. No attacker-controlled filename is ever used.
 const challengeSha256=hash(policy.challenge)
 const filename=join(ledger.canonical,`${challengeSha256}.claim.json`)
 const receipt={format:'exo.receiving-one-time-challenge.v1',challengeSha256,
  handoffManifestSha256:policy.handoffManifestSha256,
  receiverSessionSha256:hash(policy.receiverSessionId),
  publicKeySha256:policy.publicKeySha256,
  challengeIssuedAt:policy.challengeIssuedAt,
  issuerKeyId:issuance.issuerKeyId,
  issuerRegistryVersion:issuerStatus.registryVersion,
  issuerRegistryRootSha256:issuerStatus.registryRootSha256,
  issuerStatusSnapshotSha256:issuerStatus.issuerStatusSnapshotSha256,
  issuerAudience,ledgerNamespace,
  issuanceReceiptSha256:issuance.issuanceReceiptSha256,
  signedPayloadSha256:hash(JSON.stringify(attestation.payload)),
  claimedAt:new Date(nowMs).toISOString()}
 let file
 try{
  file=await open(filename,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600)
 }catch(error){
  if(error?.code==='EEXIST')return blocked('RECEIVER_CHALLENGE_ALREADY_CONSUMED')
  return blocked('RECEIVER_CHALLENGE_LEDGER_WRITE_REFUSED',String(error?.code||error))
 }
 try{
  await file.writeFile(`${JSON.stringify(receipt)}\n`)
  await file.sync()
  await file.close()
  file=null
  // Sync the pinned directory descriptor, not a fresh pathname that might
  // resolve to a different directory after the claim was created.
  await ledger.handle.sync()
  if(!await verifyTrustedReceivingLedger20261029(ledger))
   return blocked('RECEIVER_CHALLENGE_LEDGER_CHANGED')
 }catch(error){
  // NEVER unlink the claim after an uncertain write. A replay must fail shut.
  if(file)await file.close().catch(()=>{})
  return blocked('RECEIVER_CHALLENGE_LEDGER_COMMIT_UNCERTAIN',String(error?.code||error))
 }
 return {...verified,status:'LOCAL_ONE_TIME_RECEIVER_SESSION_CROSSCHECKED',
  receiverChallengeConsumed:true,issuerSignatureVerified:true,issuerStatusVerified:true,
  registryFloorVerified:true,
  issuerKeyId:issuance.issuerKeyId,challengeReceipt:receipt,
  independentReceiverAuthenticated:false,receiverCadVerified:false,
  aamaCertified:false,astmCertified:false,cuttingAuthorized:false,
  factoryApproved:false,manufacturingApproved:false,
  limitations:'Atomic one-use claim is local to one private filesystem ledger; '
   +'other hosts require a shared transactional authority. This does not prove '
   +'licensed CAD import, independent issuer identity, AAMA/ASTM interchange, '
   +'physical CUT authorization or factory sign-off. Issuer-side durable issuance '
   +'and key provenance remain external requirements. A durable local issuer '
   +'registry floor prevents observed-version rollback on this trusted host; '
   +'it does not deliver revocation updates or cross-host consensus.'}
 })
 return floorResult?.ok===false&&floorResult.code?
  blocked(floorResult.code):floorResult
 }finally{
  await ledger.handle.close().catch(()=>{})
 }
}
