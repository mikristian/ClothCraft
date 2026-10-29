import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {backupVerified,validateBackupSource,REMOTE_BASE,REMOTE_HOST} from './backup-verified.mjs';

async function fixture(run){
 const root=await mkdtemp(path.join(os.tmpdir(),'exo-safe-backup-'));
 try{
  await mkdir(path.join(root,'docs/engineering'),{recursive:true});
  await writeFile(path.join(root,'docs/engineering/example.md'),'source never deleted\n');
  const key=path.join(root,'identity');await writeFile(key,'stub key');
  return await run({root,key});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('default produces per-file SHA256 manifest with zero subprocesses and no local writes',()=>fixture(async({root,key})=>{
 const calls=[];
 const result=await backupVerified({root,key,sources:['docs/engineering'],processRunner:async(...args)=>{calls.push(args);throw Error('should not run')}});
 assert.equal(result.status,'planned_no_remote_contact');
 assert.equal(result.files.length,1);
 assert.match(result.snapshotSHA,/^[a-f0-9]{64}$/);
 assert.match(result.files[0].sha256,/^[a-f0-9]{64}$/);
 assert.equal(result.files[0].path,'docs/engineering/example.md');
 assert.equal(calls.length,0);
}));

test('explicit copy uses pinned SSH, ignore-existing copy, full checksum dry-run, no deletion',()=>fixture(async({root,key})=>{
 const calls=[];
 const result=await backupVerified({root,key,copy:true,sources:['docs/engineering'],processRunner:async(file,args)=>{calls.push({file,args});return {code:0,stdout:'',stderr:''}}});
 assert.equal(result.status,'verified_by_rsync_checksum_dry_run');
 assert.equal(calls.length,5);
 assert.equal(calls[0].file,'ssh');
 assert.ok(calls[0].args.includes(REMOTE_HOST));
 assert.ok(calls[1].args.at(-1).includes(`mkdir '${REMOTE_BASE}/${result.snapshotSHA}'`));
 assert.equal(calls[3].file,'rsync');
 assert.ok(calls[3].args.includes('--ignore-existing'));
 assert.ok(calls[3].args.includes('-e'));
 assert.ok(calls[3].args.some(v=>v.includes(key)));
 assert.equal(calls[4].file,'rsync');
 assert.ok(calls[4].args.includes('-c')&&calls[4].args.includes('-n'));
 assert.ok(!calls[4].args.includes('--ignore-existing'));
 assert.ok(calls.every(c=>!c.args.some(a=>/--delete|\brm\b|ExpansionCloud|WebDAV/.test(a))));
 assert.ok(calls[3].args.some(a=>a.includes(`${REMOTE_BASE}/${result.snapshotSHA}`)));
}));

test('rejects traversal, arbitrary storage, duplicate roots, failed network and checksum mismatch',()=>fixture(async({root,key})=>{
 for(const bad of ['../docs/engineering','docs/engineering/../../private','/Volumes/Expansion','~/docs/engineering','docs/engineering;rm','integrations/clothcraft/output/arbitrary','docs/engineering\\bad'])assert.throws(()=>validateBackupSource(bad));
 await assert.rejects(()=>backupVerified({root,key,sources:['docs/engineering','docs/engineering']}),/Duplicate/);
 await assert.rejects(()=>backupVerified({root,key,copy:true,sources:['docs/engineering'],processRunner:async()=>({code:255})}),/ssh failed/);
 let count=0;
 await assert.rejects(()=>backupVerified({root,key,copy:true,sources:['docs/engineering'],processRunner:async()=>({code:0,stdout:++count===5?'changed file':''})}),/unverified/);
}));

test('changed source bytes during transfer fail closed despite successful mocked rsync',()=>fixture(async({root,key})=>{
 const source=path.join(root,'docs/engineering/example.md');
 let count=0;
 await assert.rejects(()=>backupVerified({root,key,copy:true,sources:['docs/engineering'],processRunner:async()=>{
  count++;
  if(count===4)await writeFile(source,'source WAS modified\n');
  return {code:0,stdout:'',stderr:''};
 }}),/Source changed during copy/);
 assert.equal(count,5);
}));

test('second snapshot of revised content gets separate immutable SHA destination',()=>fixture(async({root,key})=>{
 const destinations=[];
 const stub=async(file,args)=>{
  if(file==='ssh'&&args.at(-1).includes('mkdir -p')===false)destinations.push(args.at(-1));
  return {code:0,stdout:'',stderr:''};
 };
 const first=await backupVerified({root,key,copy:true,sources:['docs/engineering'],processRunner:stub});
 await writeFile(path.join(root,'docs/engineering/example.md'),'revised source content\n');
 const second=await backupVerified({root,key,copy:true,sources:['docs/engineering'],processRunner:stub});
 assert.notEqual(first.snapshotSHA,second.snapshotSHA);
 assert.notEqual(first.destination,second.destination);
 assert.ok(destinations.some(x=>x.includes(first.snapshotSHA)));
 assert.ok(destinations.some(x=>x.includes(second.snapshotSHA)));
}));
