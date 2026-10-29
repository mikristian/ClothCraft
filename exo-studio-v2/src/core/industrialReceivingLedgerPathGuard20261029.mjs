// Local filesystem trust boundary for one-use receiving-CAD challenge claims.
// This is not a distributed lock or proof of an independent CAD receiver.
import {lstat,open,realpath} from 'node:fs/promises'
import {constants} from 'node:fs'
import {dirname,resolve} from 'node:path'

const uid=typeof process.getuid==='function'?process.getuid():null
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino
const trustedOwner=s=>uid===null||s.uid===uid||s.uid===0
const safeAncestor=s=>s.isDirectory()&&!s.isSymbolicLink()&&trustedOwner(s)&&
 // A root-owned sticky temporary directory prevents other users renaming
 // entries they do not own. A user-owned sticky directory is NOT sufficient.
 (((s.mode&0o022)===0)||(s.uid===0&&(s.mode&0o1000)!==0))
const safeLeaf=s=>s.isDirectory()&&!s.isSymbolicLink()&&
 (uid===null||s.uid===uid)&&(s.mode&0o077)===0

async function inspectAncestors(path){
 let current=resolve(path)
 for(;;){
  const entry=await lstat(current)
  if(!safeAncestor(entry))return false
  const parent=dirname(current)
  if(parent===current)break
  current=parent
 }
 return true
}

async function inspectInputAncestors(path){
 let current=resolve(path)
 for(;;){
  const entry=await lstat(current)
  // macOS /var and /tmp can be root-owned system aliases. Symlink mode
  // bits (often 0777) do not control traversal; the parent directory does.
  // Refuse user-owned aliases even if their current destination looks safe.
  if(entry.isSymbolicLink()){
   if(entry.uid!==0)return false
  }else if(!safeAncestor(entry))return false
  const parent=dirname(current)
  if(parent===current)break
  current=parent
 }
 return true
}

/**
 * Pin the canonical private ledger directory to a live descriptor, while
 * refusing writable/untrusted ancestors. The canonical path is used for
 * claims so an alias/symlink in the caller's path cannot be switched after
 * validation to redirect writes. Other processes running as this same UID
 * are inside the trusted-service boundary and must not be adversarial.
 */
export async function openTrustedReceivingLedger20261029(path){
 let handle=null
 let success=false
 try{
  const initial=await lstat(path)
  if(!safeLeaf(initial))return {ok:false,code:'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED'}
  const canonical=await realpath(path)
  // Verify the input path's parents too; a writable alias is not a safe
  // configuration even when it happens to resolve to a private directory.
  if(!await inspectInputAncestors(dirname(path))||
     !await inspectAncestors(dirname(canonical)))
   return {ok:false,code:'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED'}
  const canonicalEntry=await lstat(canonical)
  if(!safeLeaf(canonicalEntry)||!same(initial,canonicalEntry))
   return {ok:false,code:'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED'}
  handle=await open(canonical,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW)
  const opened=await handle.stat()
  if(!safeLeaf(opened)||!same(opened,canonicalEntry))
   return {ok:false,code:'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED'}
  success=true
  return {ok:true,canonical,handle,identity:opened}
 }catch(error){
  return {ok:false,code:error?.code==='ENOENT'?'RECEIVER_CHALLENGE_LEDGER_UNAVAILABLE':
   'RECEIVER_CHALLENGE_LEDGER_UNTRUSTED'}
 }finally{
  if(!success&&handle)await handle.close().catch(()=>{})
 }
}

export async function verifyTrustedReceivingLedger20261029(ledger){
 try{
  if(!ledger?.ok||!ledger.handle)return false
  if(!await inspectAncestors(dirname(ledger.canonical)))return false
  const [atPath,atHandle]=await Promise.all([
   lstat(ledger.canonical),ledger.handle.stat(),
  ])
  return safeLeaf(atPath)&&same(atPath,ledger.identity)&&
   same(atHandle,ledger.identity)
 }catch{return false}
}
