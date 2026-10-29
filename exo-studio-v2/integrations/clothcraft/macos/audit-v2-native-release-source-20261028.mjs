// Read-only native provenance witness deliberately independent of the 2 GiB
// packaging prerequisite: auditors can inspect an overfull build machine.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const sha=content=>createHash('sha256').update(content).digest('hex')
const deny=reason=>({ok:false,reason,reproducibleNativeSource:false,buildExecuted:false,appUpdated:false,licensedCadVerified:false,factoryApproved:false})
export function auditV2NativeReleaseSource20261028(root){
 try{
  const canonical='integrations/clothcraft/exo-session-v2-authoritative-20261028.rs'
  const live='research/oss/clothcraft/src/bin/exo-session.rs'
  const old='integrations/clothcraft/exo-session.rs'
  const manifest=JSON.parse(readFileSync(path.join(root,'integrations/clothcraft/native-v2-source-manifest-20261028.json'),'utf8'))
  const sources=[canonical,live,old].map(filename=>({filename,bytes:readFileSync(path.join(root,filename))}))
  if(sources.some(s=>s.bytes.length===0))return deny('EMPTY_NATIVE_SOURCE')
  const digest=sources.map(s=>sha(s.bytes))
  const canonicalLineCount=sources[0].bytes.toString('utf8').split('\n').length-(sources[0].bytes.at(-1)===10?1:0)
  if(manifest.schema!=='exo-native-v2-source-provenance.v1'||manifest.sourcePath!==canonical||
    manifest.sha256!==digest[0]||manifest.byteLength!==sources[0].bytes.length||
    manifest.lineCount!==canonicalLineCount)return deny('CANONICAL_SOURCE_MANIFEST_DRIFT')
  if(digest[0]!==digest[1])return deny('LIVE_NATIVE_SOURCE_DIFFERS_FROM_PINNED_RELEASE')
  if(digest[0]===digest[2])return deny('LEGACY_ADAPTER_UNEXPECTEDLY_IDENTICAL_TO_CANONICAL')
  // Byte-identical files in one working directory do not establish an
  // independently reproducible checkout. Record whether the pinned sources
  // are actually owned by this repository's index, without staging them.
  const tracked=([canonical,'integrations/clothcraft/native-v2-source-manifest-20261028.json']).map(file=>{
   try{return execFileSync('git',['ls-files','--error-unmatch','--',file],
    {cwd:root,stdio:['ignore','pipe','ignore']}).toString('utf8').trim()===file}
   catch{return false}
  })
  const script=readFileSync(path.join(root,'integrations/clothcraft/macos/build-workspace-v2-app.sh'),'utf8')
  const gate='node integrations/clothcraft/macos/preflight-v2-native-source-20261028.mjs "$ROOT"'
  if(script.indexOf(gate)<0||script.indexOf(gate)>script.indexOf('kill -TERM')||
    script.indexOf(gate,script.indexOf(gate)+gate.length)<0||
    !script.includes('cmp -s integrations/clothcraft/exo-session-v2-authoritative-20261028.rs'))
    return deny('RELEASE_PACKAGING_SOURCE_GATE_MISSING')
  return {ok:true,status:'PINNED_SOURCE_INTEGRITY_CONFIRMED',canonicalSha256:digest[0],
   liveSha256:digest[1],legacyAdapterSha256:digest[2],canonicalLines:canonicalLineCount,
   canonicalBytes:sources[0].bytes.length,reproducibleNativeSource:tracked.every(Boolean),
   sourceBytesMatch:true,sourceAndManifestTracked:tracked.every(Boolean),
   sourceTracked:tracked[0],manifestTracked:tracked[1],
   buildExecuted:false,appUpdated:false,licensedCadVerified:false,factoryApproved:false,
   caveat:'Matched release source bytes and packaging preflight only; Git index inclusion is separately reported. An installed binary is not authenticated by this report.'}
 }catch(error){return deny('SOURCE_AUDIT_ERROR: '+String(error.message||error))}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=auditV2NativeReleaseSource20261028(process.argv[2]||process.cwd())
 console.log(JSON.stringify(report))
 if(!report.ok)process.exitCode=1
}
