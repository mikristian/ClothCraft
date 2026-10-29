// Verify a separately signed challenge issuance receipt before a local
// receiving-CAD challenge may be consumed. The issuer's public key must be
// provisioned OUTSIDE receiver evidence and must differ from the receiver key.
// This is local cryptographic validation, not a licensed-CAD or factory release.
import {webcrypto} from 'node:crypto'
import {sha256Bytes} from './sha256Bytes.js'

const encoder=new TextEncoder()
const prefix='EXO_RECEIVING_CHALLENGE_ISSUANCE_V1\n'
const fields=['format','issuerKeyId','issuerAudience','ledgerNamespace','challenge',
 'handoffManifestSha256','receiverApplication','receiverVersion','receiverSessionId',
 'receiverKeyId','receiverPublicKeySha256','issuedAfter','issuedBefore',
 'challengeIssuedAt','expiresAt']
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(x))
const exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|')
const stable=x=>Array.isArray(x)?`[${x.map(stable).join(',')}]`:
 plain(x)?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`:
 JSON.stringify(x)
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,96}$/.test(x)
const denied=code=>({ok:false,code,issuerSignatureVerified:false})
const decode=(value,length)=>{
 if(typeof value!=='string'||value.length>128||
  !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
  return null
 const raw=Uint8Array.from(Buffer.from(value,'base64'))
 return raw.length===length&&Buffer.from(raw).toString('base64')===value?raw:null
}

/** The receipt is verified against a caller-provisioned issuer trust anchor.
 * It does not issue challenges or establish an external issuance ledger.
 */
export async function verifyIndustrialReceivingChallengeIssuance20261029(
 receipt,policy,trustedIssuerKeys,
 {nowMs=Date.now(),issuerAudience=null,ledgerNamespace=null}={},
){
 try{
  if(!exact(receipt,['payload','signature'])||!exact(receipt.payload,fields)||
   !plain(policy)||!plain(trustedIssuerKeys)||!Number.isFinite(nowMs))
   return denied('RECEIVER_ISSUANCE_RECEIPT_REQUIRED')
  const p=receipt.payload
  if(p.format!=='exo.receiving-challenge-issuance.v1'||!token(p.issuerKeyId)||
   !token(issuerAudience)||!token(ledgerNamespace)||
   p.issuerAudience!==issuerAudience||p.ledgerNamespace!==ledgerNamespace||
   !hex(p.handoffManifestSha256)||!hex(p.receiverPublicKeySha256)||
   !iso(p.issuedAfter)||!iso(p.issuedBefore)||!iso(p.challengeIssuedAt)||
   !iso(p.expiresAt)||
   p.challenge!==policy.challenge||
   p.handoffManifestSha256!==policy.handoffManifestSha256||
   p.receiverApplication!==policy.receiverApplication||
   p.receiverVersion!==policy.receiverVersion||p.receiverKeyId!==policy.keyId||
   p.receiverSessionId!==policy.receiverSessionId||
   p.receiverPublicKeySha256!==policy.publicKeySha256||
   p.issuedAfter!==policy.issuedAfter||p.issuedBefore!==policy.issuedBefore||
   p.challengeIssuedAt!==policy.challengeIssuedAt)
   return denied('RECEIVER_ISSUANCE_CONTEXT_DRIFT')
  const after=Date.parse(p.issuedAfter),before=Date.parse(p.issuedBefore),
   issued=Date.parse(p.challengeIssuedAt),expires=Date.parse(p.expiresAt)
  if(after>=before||before-after>3_600_000||issued<after||issued>before||
   expires<issued||expires>before||issued>nowMs||nowMs>expires)
   return denied('RECEIVER_ISSUANCE_TIME_DRIFT')
  const anchor=Object.hasOwn(trustedIssuerKeys,p.issuerKeyId)?trustedIssuerKeys[p.issuerKeyId]:null
  // A trusted issuer is authorized for one receiving audience, namespace and
  // receiver key, not every arbitrary service that knows its public key.
  if(!exact(anchor,['role','publicKeyRawBase64','issuerAudience','ledgerNamespace',
    'receiverApplication','receiverPublicKeySha256'])||
   anchor.role!=='receiving-challenge-issuer'||
   anchor.issuerAudience!==issuerAudience||anchor.ledgerNamespace!==ledgerNamespace||
   anchor.receiverApplication!==policy.receiverApplication||
   anchor.receiverPublicKeySha256!==policy.publicKeySha256)
   return denied('RECEIVER_ISSUANCE_UNTRUSTED_ISSUER')
  const key=decode(anchor.publicKeyRawBase64,32),signature=decode(receipt.signature,64)
  if(!key||!signature||sha256Bytes(key)===policy.publicKeySha256)
   return denied('RECEIVER_ISSUANCE_UNTRUSTED_ISSUER')
  const publicKey=await webcrypto.subtle.importKey('raw',key,{name:'Ed25519'},false,['verify'])
  const signed=encoder.encode(prefix+stable(p))
  if(!await webcrypto.subtle.verify('Ed25519',publicKey,signature,signed))
   return denied('RECEIVER_ISSUANCE_INVALID_SIGNATURE')
  return {ok:true,issuerSignatureVerified:true,issuerKeyId:p.issuerKeyId,
   issuanceReceiptSha256:sha256Bytes(encoder.encode(stable(receipt))),
   independentReceiverAuthenticated:false,cuttingAuthorized:false,factoryApproved:false}
 }catch{return denied('RECEIVER_ISSUANCE_INSPECTION_REFUSED')}
}
