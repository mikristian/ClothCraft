import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,unlink,symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {backupVerified,REMOTE_BASE,REMOTE_HOST} from './backup-verified.mjs';

async function withFixture(run){
  const root=await mkdtemp(path.join(os.tmpdir(),'exo-concurrency-audit-'));
  try{
    await mkdir(path.join(root,'docs/engineering'),{recursive:true});
    const source=path.join(root,'docs/engineering/pattern.txt');
    const original='pattern-A-123456\n';
    await writeFile(source,original);
    const key=path.join(root,'ssh-key');
    await writeFile(key,'isolated test identity');
    return await run({root,source,key,original});
  }finally{await rm(root,{force:true,recursive:true});}
}

const settings=({root,key},runner)=>({root,key,sources:['docs/engineering'],copy:true,processRunner:runner});
const ok=()=>({code:0,stdout:'',stderr:''});

test('same-length modification during transfer is rejected even when mocked remote verification reports clean',()=>withFixture(async f=>{
  let calls=0;
  await assert.rejects(backupVerified(settings(f,async(file,args)=>{
    calls++;
    if(file==='rsync'&&args.includes('--ignore-existing'))await writeFile(f.source,'pattern-B-123456\n');
    return ok();
  })),/Source changed during copy/);
  assert.equal(calls,5);
  assert.equal(await readFile(f.source,'utf8'),'pattern-B-123456\n');
}));

test('addition or deletion during transfer changes the selected file set and fails closed',async()=>{
  for(const change of ['add','remove'])await withFixture(async f=>{
    let calls=0;
    await assert.rejects(backupVerified(settings(f,async(file,args)=>{
      calls++;
      if(file==='rsync'&&args.includes('--ignore-existing')){
        if(change==='add')await writeFile(path.join(f.root,'docs/engineering/new.txt'),'new');
        else await unlink(f.source);
      }
      return ok();
    })),/Source changed during copy|No regular source files/);
    assert.equal(calls,5);
  });
});

test('snapshot mkdir collision fails before any rsync and protects a preexisting destination',()=>withFixture(async f=>{
  const calls=[];
  await assert.rejects(backupVerified(settings(f,async(file,args)=>{
    calls.push({file,args});
    return file==='ssh'&&args.at(-1).includes(`mkdir '${REMOTE_BASE}/`)?{code:1,stdout:'',stderr:'File exists'}:ok();
  })),/ssh failed/);
  assert.equal(calls.length,2);
  assert.ok(calls.every(c=>c.file==='ssh'));
  assert.equal(await readFile(f.source,'utf8'),f.original);
}));

test('network or checksum failure never reports verification',()=>withFixture(async f=>{
  for(const failure of ['copy','compare']){
    let hit=false;
    await assert.rejects(backupVerified(settings(f,async(file,args)=>{
      const relevant=file==='rsync'&&(failure==='copy'?args.includes('--ignore-existing'):args.includes('-n'));
      if(relevant){hit=true;return failure==='copy'?{code:12,stdout:'',stderr:'connection lost'}:{code:0,stdout:'changed.txt\n',stderr:''};}
      return ok();
    })),failure==='copy'?/rsync failed/:/unverified/);
    assert.equal(hit,true);
  }
}));

test('different payloads select different SHA destinations; remote operations target each computed snapshot',()=>withFixture(async f=>{
  const runs=[];
  for(const contents of [f.original,'pattern-C-123456\n']){
    await writeFile(f.source,contents);
    const calls=[];
    const result=await backupVerified(settings(f,async(file,args)=>{calls.push({file,args});return ok();}));
    assert.match(result.snapshotSHA,/^[a-f0-9]{64}$/);
    assert.equal(result.destination,`${REMOTE_HOST}:${REMOTE_BASE}/${result.snapshotSHA}`);
    assert.ok(calls[1].args.at(-1).includes(`mkdir '${REMOTE_BASE}/${result.snapshotSHA}'`));
    assert.ok(calls.filter(c=>c.file==='rsync').every(c=>c.args.some(a=>a.includes(result.snapshotSHA))));
    runs.push(result);
  }
  assert.notEqual(runs[0].snapshotSHA,runs[1].snapshotSHA);
}));

test('symlink input is rejected before remote operations',()=>withFixture(async f=>{
  await symlink(f.source,path.join(f.root,'docs/engineering/alias.txt'));
  let contacted=false;
  await assert.rejects(backupVerified(settings(f,async()=>{contacted=true;return ok();})),/Symlink/);
  assert.equal(contacted,false);
}));
