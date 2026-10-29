/** Conservative source/QA backup to Jarvis's PHYSICAL Expansion drive.
 * Default is local-only read-only planning. --copy opts into remote writes.
 * Existing remote paths are never overwritten; no local deletion exists. */
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,realpath,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

export const BACKUP_REPO_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const REMOTE_HOST='jarvismikristian@100.82.90.101';
export const REMOTE_BASE='/Volumes/Expansion/EXO-Engineering/overnight-cad-verified';
const EXACT_ROOTS=['docs/specs','docs/engineering','scripts/overnight-cad'];
const NAMED_BACKUPS=/^integrations\/clothcraft\/output\/(?:pattern-ui-backup|visible-handles-backup|clo-audit-backup)-202610\d{2}$/;
const safeComponent=/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

export function validateBackupSource(relative){
  if(typeof relative!=='string'||!relative||relative.startsWith('/')||relative.includes('\\')||relative.includes(':')||relative.split('/').some(s=>!safeComponent.test(s)||s==='.'||s==='..'))throw new Error('Unsafe backup source');
  if(!EXACT_ROOTS.some(p=>relative===p||relative.startsWith(p+'/'))&&!NAMED_BACKUPS.test(relative))throw new Error('Backup source outside explicit allowlist');
  return relative;
}

async function filesIn(root,relative){
  const base=path.join(root,relative),rootReal=await realpath(root),baseReal=await realpath(base);
  if(!(baseReal===rootReal||baseReal.startsWith(rootReal+path.sep)))throw new Error('Source escapes repository');
  const collected=[];
  async function walk(current){
    const stat=await lstat(current);
    if(stat.isSymbolicLink())throw new Error('Symlink in backup source refused');
    if(stat.isDirectory()){
      for(const name of (await readdir(current)).sort())await walk(path.join(current,name));
    }else if(stat.isFile())collected.push(current);
    else throw new Error('Unsupported backup source entry');
  }
  await walk(base);
  if(!collected.length)throw new Error('No regular source files');
  return collected;
}

async function sha256(file){
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(file))hash.update(chunk);
  return hash.digest('hex');
}

export async function spawnProcess(file,args,{cwd,timeoutMs=30000}={}){
  return await new Promise(resolve=>{
    const child=spawn(file,args,{cwd,shell:false,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='',done=false;
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish({code:null,error:'Process timed out'});},timeoutMs);
    child.stdout.on('data',chunk=>{stdout+=chunk.toString().slice(0,65536);});
    child.stderr.on('data',chunk=>{stderr+=chunk.toString().slice(0,4096);});
    child.once('error',e=>finish({code:null,error:e.code||'spawn failed'}));
    child.once('close',code=>finish({code}));
    function finish(extra){if(done)return;done=true;clearTimeout(timer);resolve({stdout,stderr,...extra});}
  });
}

/** processRunner injection supports deterministic offline tests. */
export async function backupVerified({root=BACKUP_REPO_ROOT,sources=['docs/specs/exo-2d-industrial-cad-20261023','scripts/overnight-cad'],copy=false,processRunner=spawnProcess,key=path.join(os.homedir(),'.ssh/openclaw_mac_ed25519')}={}){
  if(typeof copy!=='boolean')throw new TypeError('copy must be boolean');
  if(!Array.isArray(sources)||!sources.length||sources.length>12)throw new Error('Invalid source count');
  const selected=sources.map(validateBackupSource);
  if(new Set(selected).size!==selected.length)throw new Error('Duplicate source');
  if(selected.some((a,i)=>selected.some((b,j)=>i!==j&&b.startsWith(a+'/'))))throw new Error('Overlapping backup sources');
  const files=(await Promise.all(selected.map(s=>filesIn(root,s)))).flat().sort();
  const manifest={schemaVersion:1,mode:copy?'copy':'dry-run',destination:`${REMOTE_HOST}:${REMOTE_BASE}`,files:[]};
  for(const file of files){
    const relative=path.relative(root,file).split(path.sep).join('/');
    const statBefore=await lstat(file);
    const checksum=await sha256(file);
    const statAfter=await lstat(file);
    if(statAfter.size!==statBefore.size||statAfter.mtimeMs!==statBefore.mtimeMs)throw new Error('Source changed while hashing');
    manifest.files.push({path:relative,bytes:statAfter.size,sha256:checksum});
  }
  const snapshotSHA=createHash('sha256').update(JSON.stringify(manifest.files)).digest('hex');
  const snapshotBase=`${REMOTE_BASE}/${snapshotSHA}`;
  manifest.snapshotSHA=snapshotSHA;
  manifest.destination=`${REMOTE_HOST}:${snapshotBase}`;
  if(!copy)return {...manifest,status:'planned_no_remote_contact'};
  const keyStat=await lstat(key);
  if(!keyStat.isFile()||keyStat.isSymbolicLink())throw new Error('SSH identity must be a regular file');
  const sshArgs=['-i',key,'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','ConnectTimeout=8'];
  const run=async(file,args)=>{
    const outcome=await processRunner(file,args,{cwd:root,timeoutMs:120000});
    if(outcome.code!==0)throw new Error(`${file} failed (exit ${outcome.code ?? 'unknown'})`);
    return outcome;
  };
  // Snapshot directory creation must be exclusive: a second invocation cannot
  // append to or silently reuse an existing (possibly partial) snapshot.
  await run('ssh',[...sshArgs,REMOTE_HOST,`mkdir -p '${REMOTE_BASE}'`]);
  await run('ssh',[...sshArgs,REMOTE_HOST,`test -d '/Volumes/Expansion' && test ! -L '${REMOTE_BASE}' && mkdir '${snapshotBase}'`]);
  const transport=`ssh -i ${quoteSshOption(key)} -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=8`;
  for(const source of selected){
    const target=`${REMOTE_HOST}:${snapshotBase}/${source}/`;
    await run('ssh',[...sshArgs,REMOTE_HOST,`mkdir -p '${snapshotBase}/${source}'`]);
    const sourcePath=path.join(root,source)+'/';
    await run('rsync',['-r','--ignore-existing','-e',transport,'--',sourcePath,target]);
  }
  // Full *content* comparison, deliberately WITHOUT --ignore-existing.
  // macOS openrsync --itemize-changes emits .f..T for timestamp-only drift
  // even when --checksum detects identical bytes; do not mark that a loss.
  // Changed/missing payloads still appear in ordinary --out-format=%n output.
  // Full comparison, deliberately WITHOUT --ignore-existing: changed preexisting
  // files must be reported instead of being mistaken for verified backups.
  // Explicit SSH transport is supplied through rsync -e (no shell execution locally).
  for(const source of selected){
    const target=`${REMOTE_HOST}:${snapshotBase}/${source}/`;
    const output=await run('rsync',['-r','-c','-n','--out-format=%n','-e',transport,'--',path.join(root,source)+'/',target]);
    if(output.stdout.trim())throw new Error('Remote checksum dry-run reports differences; copy is unverified');
  }
  // Re-enumerate and re-hash the entire allowlisted selection: stat-only checks
  // miss same-length rewrites, and new/deleted files can change the snapshot.
  const afterFiles=(await Promise.all(selected.map(s=>filesIn(root,s)))).flat().sort();
  if(afterFiles.length!==files.length||afterFiles.some((file,i)=>file!==files[i]))throw new Error('Source changed during copy; snapshot unverified');
  for(let i=0;i<files.length;i++){
    const current=await lstat(files[i]);
    if(!current.isFile()||current.size!==manifest.files[i].bytes||await sha256(files[i])!==manifest.files[i].sha256)throw new Error('Source changed during copy; snapshot unverified');
  }
  return {...manifest,status:'verified_by_rsync_checksum_dry_run'};
}

function quoteSshOption(value){
  if(!/^\/[a-zA-Z0-9_./ -]+$/.test(value)||value.includes("'")||value.includes('..'))throw new Error('Invalid SSH identity path');
  return `'${value}'`;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.some(a=>!['--copy'].includes(a))){console.error('Usage: node scripts/overnight-cad/backup-verified.mjs [--copy]');process.exitCode=2;}
  else backupVerified({copy:args.includes('--copy')}).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(`Backup failed: ${error.message}`);process.exitCode=1;});
}
