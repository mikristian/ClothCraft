#!/usr/bin/env node
// Non-destructive 20-lane coordination and admission checks. The Chat On
// Steroids connector, not this script, starts coding workers. The pre-existing
// rust-migration-autopilot owns the authoritative source migration claim.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
const file=new URL('../docs/engineering/exo-rust-swarm-20.json',import.meta.url)
const cfg=JSON.parse(readFileSync(file,'utf8'))
const roles=cfg.workstreams,ids=new Set()
assert.equal(roles.length,20,'Must configure exactly 20 independent responsibilities')
assert.equal(cfg.configuredWorkstreams,20)
for(const w of roles){
  assert.match(w.id,/^W\d{2}$/)
  assert.ok(!ids.has(w.id),'Duplicate role ID')
  ids.add(w.id)
  assert.ok(w.scope.length>0&&w.repos.length>0)
}
const command=process.argv[2]??'status'
const bytes=spawnSync('df',['-Pk','.'],{encoding:'utf8'})
const availableKiB=Number(bytes.stdout.trim().split('\n').at(-1)?.split(/\s+/)[3])
const freeGiB=Number.isFinite(availableKiB)?availableKiB/1024/1024:null
const active=spawnSync(process.execPath,['scripts/rust-migration-autopilot.mjs','status'],
  {encoding:'utf8',maxBuffer:1024*1024})
let coordinator=null
try{coordinator=JSON.parse(active.stdout)}catch{}
const blockReasons=[]
if(freeGiB===null||freeGiB<cfg.orchestration.minFreeGiBToWriteSource)
  blockReasons.push('Insufficient free disk for safe source-write workers')
if(coordinator?.active?.length)
  blockReasons.push('Existing rust-migration-autopilot task is active; separate coding ownership is required')
if(!coordinator)blockReasons.push('Could not verify existing migration coordinator')
const candidateRoles=roles.filter(w=>w.mode==='read-only')
const output={configuredWorkstreams:roles.length,concurrentWorkerLimit:cfg.orchestration.maxConcurrentChatOnSteroidsWorkers,
 actualRunningWorkers:'consult Chat On Steroids agents status; not discoverable from this script',
 freeGiB:freeGiB===null?null:Math.round(freeGiB*100)/100,
 activeRustAutopilotTasks:coordinator?.active?.map(x=>x.id)??null,
 sourceWorkAdmissible:blockReasons.length===0,
 blockedReasons:blockReasons,
 safeReadOnlyRoleIds:candidateRoles.map(w=>w.id),
 queuedSourceRoleCount:roles.filter(w=>w.mode==='source').length}
if(command==='validate'||command==='status'||command==='next'){
  if(command==='next'){
    output.next=blockReasons.length?candidateRoles[0]:roles.find(w=>w.status==='ready')??roles[0]
    output.note='Proposal only; scripts cannot summon agents, reserve source ownership, or run 20 processes.'
  }
  console.log(JSON.stringify(output,null,2))
}else{
  console.error('Usage: node scripts/rust-migration-swarm-20.mjs [validate|status|next]')
  process.exitCode=2
}
