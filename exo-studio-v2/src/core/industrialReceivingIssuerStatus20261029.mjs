// Independently signed, short-lived issuer-key status snapshot. This is a
// receiving-service policy gate, not a live issuer registry or factory proof.
import {webcrypto} from 'node:crypto'
import {sha256Bytes} from './sha256Bytes.js'

const encoder=new TextEncoder()
const prefix='EXO_RECEIVING_ISSUER_STATUS_V1\n'
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(x))
const exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|')
const stable=x=>Array.isArray(x)?`[${x.map(stable).join(',')}]`:
 plain(x)?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`:
 JSON.stringify(x)
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,96}$/.test(x)
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const denied=code=>({ok:false,code,issuerStatusVerified:false})
const decode=(value,length)=>{
 if(typeof value!=='string'||value.length>128||
  !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))return null
 const raw=Uint8Array.from(Buffer.from(value,'base64'))
 return raw.length===length&&Buffer.from(raw).toString('base64')===value?raw:null
}

/** The registry root and minimum version must be provisioned by a trusted
 * service, never read from the receiving packet or issuer's own receipt.
 * A short-lived signed snapshot is not an online revocation check.
 */
export async function verifyIndustrialReceivingIssuerStatus20261029(
 snapshot,trustedRegistryRoot,issuerKeyId,issuerPublicKeyRawBase64,
 {issuerAudience=null,ledgerNamespace=null,challengeIssuedAt=null,
  receiverPublicKeySha256=null,nowMs=Date.now()}={},
){
 try{
  if(!exact(snapshot,['payload','signature'])||
   !exact(trustedRegistryRoot,['publicKeyRawBase64','minimumRegistryVersion'])||
   !exact(snapshot.payload,['format','issuerAudience','ledgerNamespace','registryVersion',
    'issuedAt','expiresAt','issuerKeys'])||!Number.isFinite(nowMs)||
   !token(issuerKeyId)||!token(issuerAudience)||!token(ledgerNamespace)||
   !iso(challengeIssuedAt)||!hex(receiverPublicKeySha256))
   return denied('RECEIVER_ISSUER_REGISTRY_REQUIRED')
  const p=snapshot.payload
  if(p.format!=='exo.receiving-issuer-status.v1'||p.issuerAudience!==issuerAudience||
   p.ledgerNamespace!==ledgerNamespace||!Number.isSafeInteger(p.registryVersion)||
   p.registryVersion<1||!Number.isSafeInteger(trustedRegistryRoot.minimumRegistryVersion)||
   trustedRegistryRoot.minimumRegistryVersion<1||
   p.registryVersion<trustedRegistryRoot.minimumRegistryVersion)
   return denied('RECEIVER_ISSUER_REGISTRY_SCOPE_OR_VERSION_DRIFT')
  if(!iso(p.issuedAt)||!iso(p.expiresAt)||
   Date.parse(p.issuedAt)<Date.parse(challengeIssuedAt)||
   Date.parse(p.issuedAt)>nowMs||nowMs>Date.parse(p.expiresAt)||
   Date.parse(p.expiresAt)-Date.parse(p.issuedAt)>900_000||
   Date.parse(p.expiresAt)<=Date.parse(p.issuedAt))
   return denied('RECEIVER_ISSUER_REGISTRY_STALE')
  if(!Array.isArray(p.issuerKeys)||p.issuerKeys.length<1||p.issuerKeys.length>64)
   return denied('RECEIVER_ISSUER_REGISTRY_MALFORMED')
  const seen=new Set()
  for(const row of p.issuerKeys){
   if(!exact(row,['issuerKeyId','publicKeySha256','status','revokedAt'])||
    !token(row.issuerKeyId)||!hex(row.publicKeySha256)||seen.has(row.issuerKeyId)||
    !['active','revoked'].includes(row.status)||
    (row.status==='active'&&row.revokedAt!==null)||
    (row.status==='revoked'&&(!iso(row.revokedAt)||Date.parse(row.revokedAt)>Date.parse(p.issuedAt))))
    return denied('RECEIVER_ISSUER_REGISTRY_MALFORMED')
   seen.add(row.issuerKeyId)
  }
  const root=decode(trustedRegistryRoot.publicKeyRawBase64,32)
  const issuer=decode(issuerPublicKeyRawBase64,32)
  const signature=decode(snapshot.signature,64)
  if(!root||!issuer||!signature||sha256Bytes(root)===sha256Bytes(issuer)||
   sha256Bytes(root)===receiverPublicKeySha256)
   return denied('RECEIVER_ISSUER_REGISTRY_UNTRUSTED_ROOT')
  const key=await webcrypto.subtle.importKey('raw',root,{name:'Ed25519'},false,['verify'])
  if(!await webcrypto.subtle.verify('Ed25519',key,signature,encoder.encode(prefix+stable(p))))
   return denied('RECEIVER_ISSUER_REGISTRY_INVALID_SIGNATURE')
  // Even a signed revocation or signed removal of the issuer must advance
  // the receiving service's durable version floor. Do not treat that as
  // authorization to consume a challenge.
  const authenticated={registrySignatureVerified:true,
   registryVersion:p.registryVersion,registryRootSha256:sha256Bytes(root),
   issuerStatusSnapshotSha256:sha256Bytes(encoder.encode(stable(snapshot)))}
  const row=p.issuerKeys.find(x=>x.issuerKeyId===issuerKeyId)
  if(!row||row.publicKeySha256!==sha256Bytes(issuer))
   return {...denied('RECEIVER_ISSUER_KEY_NOT_LISTED'),...authenticated}
  if(row.status!=='active')
   return {...denied('RECEIVER_ISSUER_KEY_REVOKED'),...authenticated}
  return {ok:true,issuerStatusVerified:true,...authenticated,
   cuttingAuthorized:false,factoryApproved:false}
 }catch{return denied('RECEIVER_ISSUER_REGISTRY_INSPECTION_REFUSED')}
}
