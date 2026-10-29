import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {assessV2NativeSourcePreflight20261028 as assess} from './preflight-v2-native-source-20261028.mjs'

const GiB=1024n*1024n*1024n
const fixture=()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'exo-v2-preflight-'))
 const tracked=path.join(root,'integrations/clothcraft/exo-session-v2-authoritative-20261028.rs')
 const legacy=path.join(root,'integrations/clothcraft/exo-session.rs')
 const manifest=path.join(root,'integrations/clothcraft/native-v2-source-manifest-20261028.json')
 const live=path.join(root,'research/oss/clothcraft/src/bin/exo-session.rs')
 mkdirSync(path.dirname(tracked),{recursive:true})
 mkdirSync(path.dirname(live),{recursive:true})
 writeFileSync(tracked,'// tracked Rust source\n')
 writeFileSync(legacy,'// old packaging adapter\n')
 writeFileSync(live,'// tracked Rust source\n')
 writeFileSync(manifest,JSON.stringify({schema:'exo-native-v2-source-provenance.v1',
  sourcePath:'integrations/clothcraft/exo-session-v2-authoritative-20261028.rs',
  sha256:createHash('sha256').update(readFileSync(tracked)).digest('hex'),
  byteLength:readFileSync(tracked).length,lineCount:1}))
 return {root,tracked,legacy,manifest,live,close:()=>rmSync(root,{recursive:true,force:true})}
}

test('identical native source and >=2GiB pass without modifying either file',()=>{
 const f=fixture()
 try{
  const before=readFileSync(f.live)
  const result=assess({root:f.root,availableBytes:3n*GiB})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.sourceSha256,result.canonicalSha256)
  assert.notEqual(result.canonicalSha256,result.adapterSha256,
   'Legacy adapter must not be the build authority')
  assert.equal(result.reproducibleTrackedSource,true)
  assert.deepEqual(readFileSync(f.live),before)
 }finally{f.close()}
})

test('divergent live Rust source refuses default packaging without overwriting it',()=>{
 const f=fixture()
 try{
  writeFileSync(f.live,'// newer Rust grading implementation\n')
  const before=readFileSync(f.live)
  const result=assess({root:f.root,availableBytes:3n*GiB})
  assert.equal(result.ok,false)
  assert.match(result.reason,/differs/)
  assert.deepEqual(readFileSync(f.live),before)
 }finally{f.close()}
})

test('tampering with tracked V2 source rejects default build even when old adapter is unchanged',()=>{
 const f=fixture()
 try{
  const original=readFileSync(f.live)
  writeFileSync(f.tracked,'// unreviewed tracked Rust edit\n')
  const result=assess({root:f.root,availableBytes:3n*GiB})
  assert.equal(result.ok,false)
  assert.match(result.reason,/provenance manifest mismatch/)
  assert.deepEqual(readFileSync(f.live),original)
 }finally{f.close()}
})

test('simultaneously changed live and canonical source cannot bypass pinned manifest',()=>{
 const f=fixture()
 try{
  writeFileSync(f.tracked,'// new unreviewed source\n')
  writeFileSync(f.live,'// new unreviewed source\n')
  const result=assess({root:f.root,availableBytes:3n*GiB})
  assert.equal(result.ok,false)
  assert.match(result.reason,/provenance manifest mismatch/)
 }finally{f.close()}
})

test('existing-source exception requires exact approved hash, not just an environment flag',()=>{
 const f=fixture()
 try{
  writeFileSync(f.live,'// newer native implementation\n')
  const approved=createHash('sha256').update(readFileSync(f.live)).digest('hex')
  assert.equal(assess({root:f.root,useExisting:true,availableBytes:3n*GiB}).ok,false)
  assert.equal(assess({root:f.root,useExisting:true,approvedSourceSha256:'0'.repeat(64),availableBytes:3n*GiB}).ok,false)
  const result=assess({root:f.root,useExisting:true,approvedSourceSha256:approved,availableBytes:3n*GiB})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.sourceSha256,approved)
 }finally{f.close()}
})

test('insufficient disk blocks both source modes and missing files fail closed',()=>{
 const f=fixture()
 try{
  assert.match(assess({root:f.root,availableBytes:GiB}).reason,/Less than 2 GiB/)
  assert.equal(assess({root:f.root,availableBytes:2n*GiB}).ok,true)
  assert.equal(assess({root:path.join(f.root,'missing'),availableBytes:3n*GiB}).ok,false)
 }finally{f.close()}
})

test('desktop packaging invokes preflight before any installed-app shutdown and again before Cargo',()=>{
 const shell=readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),
  'build-workspace-v2-app.sh'),'utf8')
 const gate='node integrations/clothcraft/macos/preflight-v2-native-source-20261028.mjs "$ROOT"'
 const first=shell.indexOf(gate),second=shell.indexOf(gate,first+gate.length)
 assert(first>=0&&second>first,'Both preflight invocations must be present')
 assert(first<shell.indexOf('kill -TERM'),'Installed app must not be stopped before source/disk preflight')
 assert(second<shell.indexOf('(cd research/oss/clothcraft && cargo build'),
  'Native source must be rechecked immediately before compilation')
 assert(shell.includes('cmp -s integrations/clothcraft/exo-session-v2-authoritative-20261028.rs'),
  'Default packaging must verify the tracked V2 source, not the old adapter')
 assert(!/\bcp integrations\/clothcraft\/exo-session\.rs\b/.test(shell),
  'Packaging must not restore the obsolete adapter over native grading')
})
