import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {auditV2NativeReleaseSource20261028 as audit} from './audit-v2-native-release-source-20261028.mjs'
const fixture=()=>{
 const root=mkdtempSync(path.join(tmpdir(),'exo-native-source-audit-'))
 const write=(p,v)=>{const full=path.join(root,p);mkdirSync(path.dirname(full),{recursive:true});writeFileSync(full,v)}
 const canonical='integrations/clothcraft/exo-session-v2-authoritative-20261028.rs'
 const source='fn main() {}\n'
 write(canonical,source)
 write('research/oss/clothcraft/src/bin/exo-session.rs',source)
 write('integrations/clothcraft/exo-session.rs','old adapter\n')
 write('integrations/clothcraft/native-v2-source-manifest-20261028.json',JSON.stringify({schema:'exo-native-v2-source-provenance.v1',sourcePath:canonical,
  sha256:createHash('sha256').update(source).digest('hex'),byteLength:Buffer.byteLength(source),lineCount:1}))
 write('integrations/clothcraft/macos/build-workspace-v2-app.sh',`node integrations/clothcraft/macos/preflight-v2-native-source-20261028.mjs "$ROOT"\nkill -TERM test\nnode integrations/clothcraft/macos/preflight-v2-native-source-20261028.mjs "$ROOT"\ncmp -s integrations/clothcraft/exo-session-v2-authoritative-20261028.rs`)
 return {root,write,close:()=>rmSync(root,{recursive:true,force:true})}
}
test('byte-bound source audit works without a build and discloses untracked release sources',()=>{
 const f=fixture();try{const result=audit(f.root);assert.equal(result.ok,true,result.reason);assert.equal(result.sourceBytesMatch,true);assert.equal(result.reproducibleNativeSource,false);assert.equal(result.sourceAndManifestTracked,false);assert.equal(result.appUpdated,false)}finally{f.close()}
})
test('pinned manifest tampering fails even when live checkout also changes',()=>{
 const f=fixture();try{f.write('integrations/clothcraft/exo-session-v2-authoritative-20261028.rs','modified\n');f.write('research/oss/clothcraft/src/bin/exo-session.rs','modified\n');assert.equal(audit(f.root).reason,'CANONICAL_SOURCE_MANIFEST_DRIFT')}finally{f.close()}
})
test('different live source or removed preflight fails without modifying either source',()=>{
 const f=fixture();try{f.write('research/oss/clothcraft/src/bin/exo-session.rs','modified\n');assert.equal(audit(f.root).reason,'LIVE_NATIVE_SOURCE_DIFFERS_FROM_PINNED_RELEASE');f.write('research/oss/clothcraft/src/bin/exo-session.rs','fn main() {}\n');f.write('integrations/clothcraft/macos/build-workspace-v2-app.sh','kill -TERM 4\n');assert.equal(audit(f.root).reason,'RELEASE_PACKAGING_SOURCE_GATE_MISSING')}finally{f.close()}
})
