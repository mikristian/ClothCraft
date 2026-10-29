// Read-only release preflight. Must run BEFORE the desktop build script stops
// an installed app: a source mismatch or low disk must not interrupt a user.
import {createHash} from 'node:crypto'
import {readFileSync,statfsSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const MIN_FREE=2n*1024n*1024n*1024n
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const reject=(reason,detail={})=>({ok:false,reason,...detail})

export function assessV2NativeSourcePreflight20261028({
 root,useExisting=false,approvedSourceSha256='',availableBytes,
}={}){
 try{
  if(typeof root!=='string'||!root)return reject('Project root is required')
  // This byte-pinned repository snapshot is the V2 build source of truth
  // (new worktree file pending version-control inclusion). The
  // historical 859-line adapter is intentionally retained for comparison;
  // it must never replace the newer 3,030-line native grading implementation.
  const canonical=readFileSync(path.join(root,'integrations/clothcraft/exo-session-v2-authoritative-20261028.rs'))
  const adapter=readFileSync(path.join(root,'integrations/clothcraft/exo-session.rs'))
  const live=readFileSync(path.join(root,'research/oss/clothcraft/src/bin/exo-session.rs'))
  if(!canonical.length||!adapter.length||!live.length)return reject('Native source must be nonempty')
  const canonicalSha256=hash(canonical),adapterSha256=hash(adapter),liveSha256=hash(live)
  const manifest=JSON.parse(readFileSync(path.join(root,'integrations/clothcraft/native-v2-source-manifest-20261028.json'),'utf8'))
  const canonicalPath='integrations/clothcraft/exo-session-v2-authoritative-20261028.rs'
  const canonicalLines=canonical.toString('utf8').split('\n').length-(canonical.at(-1)===10?1:0)
  if(manifest.schema!=='exo-native-v2-source-provenance.v1'||
     manifest.sourcePath!==canonicalPath||manifest.sha256!==canonicalSha256||
     manifest.byteLength!==canonical.length||manifest.lineCount!==canonicalLines)
   return reject('Pinned V2 source provenance manifest mismatch; review source and manifest before packaging',
    {canonicalSha256,manifestSha256:manifest.sha256,canonicalLines,canonicalBytes:canonical.length})
  const free=availableBytes===undefined?(()=>{
   const stats=statfsSync(root,{bigint:true})
   return stats.bavail*stats.bsize
  })():BigInt(availableBytes)
  const detail={canonicalSha256,adapterSha256,liveSha256,
   canonicalSource:canonicalPath,
   availableBytes:String(free),
   minimumBytes:String(MIN_FREE),usingExistingSource:useExisting}
  if(free<MIN_FREE)return reject('Less than 2 GiB free; refuse build before stopping the installed app',detail)
  if(useExisting){
   if(!/^[a-f0-9]{64}$/i.test(approvedSourceSha256)||
      approvedSourceSha256.toLowerCase()!==liveSha256)
    return reject('Existing ignored Rust source requires its exact explicitly approved SHA-256 before packaging',detail)
  }else if(canonicalSha256!==liveSha256){
   return reject('Pinned authoritative V2 Rust source differs from live Rust source; packaging must not overwrite unreviewed grading work',detail)
  }
  return {ok:true,...detail,sourceSha256:useExisting?liveSha256:canonicalSha256,
   reproducibleTrackedSource:canonicalSha256===liveSha256,
   note:'Pinned V2 source identity and free disk checked; no build, vendor parity or factory acceptance asserted'}
 }catch(error){return reject('Native source preflight could not inspect inputs: '+String(error?.message||error))}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=assessV2NativeSourcePreflight20261028({root:process.argv[2],
  useExisting:process.env.EXO_USE_EXISTING_EXO_SESSION_SOURCE==='1',
  approvedSourceSha256:process.env.EXO_APPROVED_NATIVE_SOURCE_SHA256||''})
 console.log(JSON.stringify(result))
 if(!result.ok)process.exitCode=1
}
