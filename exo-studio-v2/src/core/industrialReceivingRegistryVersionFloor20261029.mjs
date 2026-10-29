// Fsynced LOCAL issuer-status version observation for the trusted receiving
// service. A signed revocation snapshot must advance the floor even when its
// issuer is refused. Not a power-loss qualification, live revocation feed or
// distributed consensus.
import {open,readdir,lstat,unlink} from 'node:fs/promises'
import {constants} from 'node:fs'
import {isAbsolute,join} from 'node:path'
import {sha256Bytes} from './sha256Bytes.js'
import {openTrustedReceivingLedger20261029,verifyTrustedReceivingLedger20261029}
 from './industrialReceivingLedgerPathGuard20261029.mjs'

const encoder=new TextEncoder()
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(x))
const exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|')
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,96}$/.test(x)
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const denied=code=>({ok:false,code,registryFloorVerified:false,
 cuttingAuthorized:false,factoryApproved:false})
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino
const uid=typeof process.getuid==='function'?process.getuid():null
const privateFile=s=>s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&
 (uid===null||s.uid===uid)&&(s.mode&0o077)===0
const fields=['format','issuerAudience','ledgerNamespace','registryRootSha256',
 'registryVersion','issuerStatusSnapshotSha256']

async function readObservation(path,expected){
 let handle
 try{
  const before=await lstat(path)
  if(!privateFile(before)||before.size<2||before.size>1024)return null
  handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
  const opened=await handle.stat()
  if(!privateFile(opened)||!same(before,opened))return null
  const raw=await handle.readFile('utf8')
  const row=JSON.parse(raw)
  if(!exact(row,fields)||row.format!=='exo.receiving-issuer-registry-floor.v1'||
   row.issuerAudience!==expected.issuerAudience||
   row.ledgerNamespace!==expected.ledgerNamespace||
   row.registryRootSha256!==expected.registryRootSha256||
   !Number.isSafeInteger(row.registryVersion)||row.registryVersion<1||
   !hex(row.issuerStatusSnapshotSha256))return null
  return row
 }catch{return null}finally{if(handle)await handle.close().catch(()=>{})}
}

// The claim callback may perform asynchronous filesystem operations. Do not
// report its success if the authenticated registry observation disappeared,
// changed, or was superseded while that callback was executing.
async function verifyObservationAfterCallback(ledger,prefix,observation){
 if(!await verifyTrustedReceivingLedger20261029(ledger))return false
 const names=await readdir(ledger.canonical)
 let found=false
 for(const name of names){
  if(!name.startsWith(prefix))continue
  const match=/^([1-9][0-9]*)\.json$/.exec(name.slice(prefix.length))
  if(!match)return false
  const row=await readObservation(join(ledger.canonical,name),observation)
  if(!row||String(row.registryVersion)!==match[1]||
   row.registryVersion>observation.registryVersion)return false
  if(row.registryVersion===observation.registryVersion){
   if(row.issuerStatusSnapshotSha256!==observation.issuerStatusSnapshotSha256)
    return false
   found=true
  }
 }
 return found&&await verifyTrustedReceivingLedger20261029(ledger)
}

async function inspectLocked(ledger,prefix,observation,callback){
 if(!await verifyTrustedReceivingLedger20261029(ledger))
  return denied('RECEIVER_ISSUER_REGISTRY_STATE_CHANGED')
 const names=await readdir(ledger.canonical)
 let highest=0,highestDigest=null
 for(const name of names){
  if(!name.startsWith(prefix))continue
  const match=/^([1-9][0-9]*)\.json$/.exec(name.slice(prefix.length))
  if(!match)return denied('RECEIVER_ISSUER_REGISTRY_STATE_CORRUPT')
  const row=await readObservation(join(ledger.canonical,name),observation)
  if(!row||String(row.registryVersion)!==match[1])
   return denied('RECEIVER_ISSUER_REGISTRY_STATE_CORRUPT')
  if(row.registryVersion>highest){
   highest=row.registryVersion
   highestDigest=row.issuerStatusSnapshotSha256
  }
 }
 if(observation.registryVersion<highest)
  return denied('RECEIVER_ISSUER_REGISTRY_VERSION_ROLLBACK')
 if(observation.registryVersion===highest&&
  observation.issuerStatusSnapshotSha256!==highestDigest)
  return denied('RECEIVER_ISSUER_REGISTRY_VERSION_EQUIVOCATION')
 if(observation.registryVersion>highest){
  const filename=join(ledger.canonical,prefix+observation.registryVersion+'.json')
  let file
  try{
   file=await open(filename,constants.O_CREAT|constants.O_EXCL|
    constants.O_WRONLY|constants.O_NOFOLLOW,0o600)
   await file.writeFile(JSON.stringify(observation)+'\n')
   await file.sync()
   await file.close()
   file=null
   await ledger.handle.sync()
   if(!await verifyTrustedReceivingLedger20261029(ledger)||
    !await readObservation(filename,observation))
    return denied('RECEIVER_ISSUER_REGISTRY_STATE_COMMIT_UNCERTAIN')
  }catch{
   // Never remove or rewrite an uncertain observation. A partial record
   // deliberately blocks later claims until an operator investigates.
   if(file)await file.close().catch(()=>{})
   return denied('RECEIVER_ISSUER_REGISTRY_STATE_COMMIT_UNCERTAIN')
  }
 }
 if(!await verifyTrustedReceivingLedger20261029(ledger))
  return denied('RECEIVER_ISSUER_REGISTRY_STATE_CHANGED')
 const result=await callback()
 if(!await verifyObservationAfterCallback(ledger,prefix,observation))
  return denied('RECEIVER_ISSUER_REGISTRY_STATE_CHANGED_DURING_CLAIM')
 return result
}

/** Serialize one local claim against an append-only monotonic issuer-status
 * floor. A lock left by a crash is NEVER stolen automatically: fail closed.
 * The callback must perform the one-time challenge claim while lock is held.
 * The caller must supply only authenticated signed-snapshot metadata.
 */
export async function withIndustrialReceivingRegistryVersionFloor20261029(
 {stateRoot,issuerAudience,ledgerNamespace,trustedStateNamespaces,
  registryRootSha256,registryVersion,issuerStatusSnapshotSha256},callback,
){
 if(typeof stateRoot!=='string'||!isAbsolute(stateRoot)||!token(issuerAudience)||
  !token(ledgerNamespace)||!plain(trustedStateNamespaces)||
  !hex(registryRootSha256)||!hex(issuerStatusSnapshotSha256)||
  !Number.isSafeInteger(registryVersion)||registryVersion<1||
  typeof callback!=='function')
  return denied('RECEIVER_ISSUER_REGISTRY_STATE_REQUIRED')
 const ledger=await openTrustedReceivingLedger20261029(stateRoot)
 if(!ledger.ok)return denied('RECEIVER_ISSUER_REGISTRY_STATE_UNTRUSTED')
 let lock=null,lockPath=null,result,lockDurable=false
 try{
  if(!Object.hasOwn(trustedStateNamespaces,ledgerNamespace)||
   trustedStateNamespaces[ledgerNamespace]!==ledger.canonical)
   return denied('RECEIVER_ISSUER_REGISTRY_STATE_NAMESPACE_DRIFT')
  const scope=sha256Bytes(encoder.encode(issuerAudience+'\n'+ledgerNamespace))
  const prefix=scope+'.issuer-registry-v'
  lockPath=join(ledger.canonical,scope+'.issuer-registry.lock')
  try{
   lock=await open(lockPath,constants.O_CREAT|constants.O_EXCL|
    constants.O_WRONLY|constants.O_NOFOLLOW,0o600)
   await lock.writeFile('EXO_REGISTRY_FLOOR_LOCK_V1\n')
   await lock.sync()
   lockDurable=true
  }catch(error){
   if(!lock)return denied(error?.code==='EEXIST'?
    'RECEIVER_ISSUER_REGISTRY_STATE_BUSY':
    'RECEIVER_ISSUER_REGISTRY_LOCK_UNAVAILABLE')
   result=denied('RECEIVER_ISSUER_REGISTRY_LOCK_UNCERTAIN')
  }
  if(!result){
   const observation={format:'exo.receiving-issuer-registry-floor.v1',
    issuerAudience,ledgerNamespace,registryRootSha256,registryVersion,
    issuerStatusSnapshotSha256}
   try{result=await inspectLocked(ledger,prefix,observation,callback)}
   catch{result=denied('RECEIVER_ISSUER_REGISTRY_STATE_INSPECTION_REFUSED')}
  }
  // If creating or syncing the lock failed after O_EXCL, its state is
  // uncertain. Preserve the inode for supervised recovery: never silently
  // clear a potentially crash-interrupted exclusive claim.
  if(!lockDurable)return result??denied('RECEIVER_ISSUER_REGISTRY_LOCK_UNCERTAIN')
  // Do not unlink any lock except the exact inode created by this call.
  // A failed cleanup blocks success, even if the claim was already written.
  try{
   const [atPath,atHandle]=await Promise.all([lstat(lockPath),lock.stat()])
   if(!privateFile(atPath)||!same(atPath,atHandle)||
    !await verifyTrustedReceivingLedger20261029(ledger))
    return denied('RECEIVER_ISSUER_REGISTRY_LOCK_RELEASE_UNCERTAIN')
   await unlink(lockPath)
   await ledger.handle.sync()
  }catch{return denied('RECEIVER_ISSUER_REGISTRY_LOCK_RELEASE_UNCERTAIN')}
  return result
 }finally{
  if(lock)await lock.close().catch(()=>{})
  await ledger.handle.close().catch(()=>{})
 }
}
