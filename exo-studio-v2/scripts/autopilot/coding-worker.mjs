#!/usr/bin/env node
// Detached candidate builder: NEVER modifies the source worktree.
import {spawnSync} from 'node:child_process'
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync,existsSync,statSync,lstatSync} from 'node:fs'
import {tmpdir,homedir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const home=homedir()
const coordinator=join(root,'scripts/rust-migration-autopilot.mjs')
const queue=process.env.EXO_MIGRATION_QUEUE_FILE || join(root,'docs/engineering/exo-v2-rust-autopilot-queue.json')
const codex=process.env.EXO_AUTOPILOT_CODEX || join(home,'.local/share/exo-rust-codex/node_modules/.bin/codex')
const out=process.env.EXO_AUTOPILOT_OUTPUT || join(home,'Library/Application Support/exo-rust-candidates')
const dry=process.argv.includes('--dry-run')
const timeLimit=Number(process.env.EXO_AUTOPILOT_TIMEOUT_MS || 600000)
// Explicit vetted committed source surfaces; never export nested research/oss.
export const snapshotScope=['src','rust','scripts','integrations/clothcraft','native_app',
  'native_cpp','native_backend','ppf_backend','techpack-studio/src','docs/engineering',
  'package.json','package-lock.json','index.html','vite.config.mjs']
const snapshotExcluded=['research/oss/clothcraft','untracked source and local modifications']
const safeEnv={HOME:home, USER:process.env.USER || '', LOGNAME:process.env.LOGNAME || '',
  TMPDIR:process.env.TMPDIR || tmpdir(), LANG:process.env.LANG || 'en_US.UTF-8',
  PATH:join(home,'.cargo/bin')+':/usr/local/bin:/usr/bin:/bin',EXO_MIGRATION_QUEUE_FILE:queue}
const emit=(event,detail={})=>console.log(JSON.stringify({at:new Date().toISOString(),event,...detail}))
const stop=()=>{throw Object.assign(new Error('normal skip'),{skip:true})}
const call=(file,args,opts={})=>spawnSync(file,args,{cwd:root,env:safeEnv,encoding:'utf8',maxBuffer:1024*1024,timeout:15000,...opts})
const digest=(s)=>s?.trim().slice(0,250) || ''
if(!Number.isFinite(timeLimit)||timeLimit<10000||timeLimit>3600000)throw Error('Invalid bounded timeout')
mkdirSync(out,{recursive:true,mode:0o700})
const lock=join(out,'worker.lock')
try{mkdirSync(lock,{mode:0o700})}catch(e){
  if(e.code!=='EEXIST')throw e
  // A stale lock is only recovered when older than the maximum run bound,
  // with a dead recorded PID. Never steal an unknown or recent lock.
  let stale=false
  try{
    const age=Date.now()-statSync(lock).mtimeMs
    if(age>2*3600000){
      const pidFile=join(lock,'pid')
      const pid=existsSync(pidFile)?Number(readFileSync(pidFile,'utf8')):0
      if(Number.isSafeInteger(pid)&&pid>1){try{process.kill(pid,0)}catch(err){stale=err.code==='ESRCH'}}
      else stale=true
    }
  }catch{}
  if(!stale){emit('skip',{reason:'another worker holds lock'});process.exit(0)}
  rmSync(lock,{recursive:true,force:true})
  try{mkdirSync(lock,{mode:0o700})}catch{emit('skip',{reason:'concurrent lock acquisition'});process.exit(0)}
}
writeFileSync(join(lock,'pid'),String(process.pid),{mode:0o600})
let task=null, temp=null, finalReport=null
try{
  const status=call(process.execPath,[coordinator,'next'])
  if(status.status!==0)throw Error('Queue unavailable')
  const next=JSON.parse(status.stdout)
  if(!next.enabled||next.active.length||!next.next){emit('skip',{reason:next.active.length?'active task exists':'disabled or empty queue'});stop()}
  if(!existsSync(codex)){emit('skip',{reason:'Codex binary missing'});stop()}
  const login=call(codex,['login','status'],{timeout:8000})
  if(login.status!==0 || !/logged in/i.test(login.stdout+login.stderr)){emit('skip',{reason:'Codex login unavailable'});stop()}
  const git=call('git',['rev-parse','HEAD'])
  if(git.status!==0)throw Error('Cannot determine source Git commit')
  const baseline=git.stdout.trim()
  const dirty=call('git',['status','--porcelain','--untracked-files=no'])
  if(dirty.status!==0)throw Error('Cannot verify source working tree')
  if(dry){emit('dry-run',{next:next.next.id,baseline,sourceDirty:!!dirty.stdout,snapshotScope,snapshotExcluded,codeInvocation:false});stop()}
  const claim=call(process.execPath,[coordinator,'claim',next.next.id])
  if(claim.status!==0){emit('skip',{reason:'claim conflict or active task'});stop()}
  task=JSON.parse(claim.stdout)
  temp=mkdtempSync(join(tmpdir(),'exo-rust-candidate-'))
  const archive=call('git',['archive','--format=tar','HEAD',...snapshotScope],{encoding:null,maxBuffer:96*1024*1024,timeout:30000})
  if(archive.status!==0)throw Error('Git snapshot failed')
  const extract=spawnSync('tar',['-xf','-','-C',temp],{input:archive.stdout,timeout:30000,env:safeEnv})
  if(extract.status!==0)throw Error('Snapshot extract failed')
  // A scratch Git repository lets git diff reliably capture Codex's candidate edits.
  for(const args of [['init','-q'],['add','-A'],['-c','user.name=EXO Candidate','-c','user.email=local@example.invalid','commit','-q','-m','baseline']]){
    const r=call('git',args,{cwd:temp,timeout:30000});if(r.status!==0)throw Error('Snapshot Git initialization failed')
  }
  const prompt=`Work only in this disposable project snapshot. Task ${task.id}: ${task.title}. Objective: ${task.objective}. Acceptance: ${task.acceptance}. This snapshot contains only committed allowlisted project source; untracked native solver at research/oss/clothcraft and uncommitted source edits are ABSENT. For native solver tasks such as RUST-006, report missing coverage and stage review-only; never claim native solver validation. Keep changes minimal and test them locally. Do not publish, push, install, delete files, edit credentials, or operate on any path outside this snapshot. You may inspect this snapshot and edit source within it. Produce a concise evidence report.`
  finalReport=join(temp,'../'+randomUUID()+'-agent-report.txt')
  const run=call(codex,['exec','--ignore-user-config','--ephemeral','--sandbox','workspace-write','--skip-git-repo-check','-C',temp,'-o',finalReport,prompt],{cwd:temp,timeout:timeLimit,maxBuffer:4*1024*1024})
  const untracked=call('git',['ls-files','--others','--exclude-standard'],{cwd:temp})
  if(untracked.status!==0)throw Error('Candidate untracked file check failed')
  const untrackedNames=untracked.stdout.trim().split('\n').filter(Boolean)
  // `git add -N` marks new source as intent-to-add, so diff carries its contents.
  // Reject unsafe paths before staging and never stage symlinks or oversized artifacts.
  const safeUntracked=untrackedNames.every(f=>!f.startsWith('/')&&!f.split('/').includes('..')&&
    !f.startsWith('.git/')&&!/(^|\/)(\.env|credentials|secrets)(\/|\.|$)/i.test(f)&&
    !f.startsWith('scripts/autopilot/')&&
    (()=>{try{const s=lstatSync(join(temp,f));return s.isFile()&&s.size<=1024*1024}catch{return false}})())
  if(safeUntracked&&untrackedNames.length){
    const add=call('git',['add','-N','--',...untrackedNames],{cwd:temp,timeout:20000})
    if(add.status!==0)throw Error('Candidate intent-to-add failed')
  }
  const diff=call('git',['diff','--binary','HEAD'],{cwd:temp,maxBuffer:20*1024*1024,timeout:20000})
  if(diff.status!==0)throw Error('Candidate diff capture failed')
  const changed=call('git',['diff','--name-only','HEAD'],{cwd:temp})
  const files=[...new Set([...changed.stdout.trim().split('\n').filter(Boolean),...untracked.stdout.trim().split('\n').filter(Boolean)])]
  const forbidden=!safeUntracked||files.some(f=>f.startsWith('scripts/autopilot/')||f.startsWith('.git/')||f.startsWith('docs/engineering/exo-v2-rust-autopilot-queue')||/(^|\/)(\.env|credentials|secrets)(\/|\.|$)/i.test(f))
  const artifact=join(out,`${task.id}-${randomUUID()}`)
  mkdirSync(artifact,{mode:0o700})
  writeFileSync(join(artifact,'candidate.patch'),diff.stdout,{mode:0o600})
  writeFileSync(join(artifact,'report.json'),JSON.stringify({taskId:task.id,baseline,snapshotScope,snapshotExcluded,snapshotArchiveBytes:archive.stdout.length,sourceDirty:!!dirty.stdout,exitCode:run.status,timeout:run.error?.code==='ETIMEDOUT',files,untracked:untrackedNames,forbidden,patchBytes:Buffer.byteLength(diff.stdout),validatedByPrime:false,nativeSolverCoverageVerified:false,reviewOnly:true},null,2),{mode:0o600})
  if(existsSync(finalReport)){
    // Agent reports may contain user material; keep private, never print to launchd logs.
    writeFileSync(join(artifact,'agent-report.txt'),readFileSync(finalReport),{mode:0o600})
    rmSync(finalReport,{force:true})
  }
  // Review gate: queue stays blocked; completion is prime's decision after integrating and testing.
  const reason=run.status===0 && files.length && !forbidden ? `Candidate staged for prime review in ${artifact}; source HEAD ${baseline}; NOT integrated` : `Candidate requires inspection in ${artifact}; exit ${run.status}; forbidden=${forbidden}; untracked=${untrackedNames.length}`
  const blocked=call(process.execPath,[coordinator,'block',task.id,task.runId,reason])
  if(blocked.status!==0)throw Error('Could not record candidate review status')
  task=null
  emit('candidate',{id:next.next.id,artifact,files:files.length,reviewRequired:true,exitCode:run.status})
}catch(e){
  if(!e.skip){
    emit('error',{message:digest(e.message)})
    if(task)call(process.execPath,[coordinator,'block',task.id,task.runId,'Unattended candidate worker failed; operator review required'])
    process.exitCode=1
  }
}finally{
  if(finalReport)rmSync(finalReport,{force:true})
  if(temp)rmSync(temp,{recursive:true,force:true})
  rmSync(lock,{recursive:true,force:true})
}
