import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=mkdtempSync(join(tmpdir(),'exo-run44-source-'));
const gate=resolve('scripts/release/check-run44-rust-source-manifest.sh');
const rel='research/oss/clothcraft/src/bin/exo-session.rs';
const source=join(root,rel);
const manifest=join(root,'source.manifest');
function check(expected){
 const p=spawnSync('/bin/bash',[gate,root,manifest],{encoding:'utf8'});
 assert.equal(p.status,expected,`${p.stdout}\n${p.stderr}`);
}
try {
 mkdirSync(join(root,'research/oss/clothcraft/src/bin'),{recursive:true});
 writeFileSync(source,'source revision A\n');
 const digest=createHash('sha256').update(readFileSync(source)).digest('hex');
 writeFileSync(manifest,`${digest} ${rel}\n`);
 check(0);
 writeFileSync(source,'source revision B\n');
 check(23);
 writeFileSync(manifest,`${digest} research/oss/clothcraft/src/bin/other.rs\n`);
 check(22);
 writeFileSync(manifest,'invalid\n');
 check(22);
 console.log('PASS RUN44 source manifest: valid, changed source, wrong path, malformed manifest');
} finally {rmSync(root,{recursive:true,force:true});}
