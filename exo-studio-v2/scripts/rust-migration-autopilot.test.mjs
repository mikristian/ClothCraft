import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const script=fileURLToPath(new URL('./rust-migration-autopilot.mjs',import.meta.url))
const fixture=JSON.parse(readFileSync(new URL('../docs/engineering/exo-v2-rust-autopilot-queue.json',import.meta.url)))

function withQueue(callback){
  const dir=mkdtempSync(join(tmpdir(),'exo-rust-autopilot-'))
  const file=join(dir,'queue.json')
  // The checked-in queue is live state, not an immutable fixture. Every
  // test must start from a fresh pending snapshot even after days of
  // autonomous task completions; never reset the real persisted queue.
  const reset=structuredClone(fixture)
  reset.enabled=true
  reset.runs=[]
  for(const task of reset.tasks){
    task.status='pending'
    delete task.runId
    delete task.startedAt
    delete task.completedAt
    delete task.blockedAt
    delete task.evidence
    delete task.blocker
  }
  writeFileSync(file,JSON.stringify(reset))
  const run=(...args)=>{
    const result=spawnSync(process.execPath,[script,...args],{
      env:{...process.env,EXO_MIGRATION_QUEUE_FILE:file},encoding:'utf8'})
    return {...result,data:result.status===0?JSON.parse(result.stdout):null}
  }
  try{callback(run,file)}finally{rmSync(dir,{recursive:true,force:true})}
}

test('a single claim is issued; run token controls completion and next task',()=>{
  withQueue(run=>{
    assert.equal(run('status').data.totals.pending,fixture.tasks.length)
    const claimed=run('claim')
    assert.equal(claimed.status,0)
    assert.equal(claimed.data.id,'RUST-001')
    assert.ok(claimed.data.runId)
    const second=run('claim')
    assert.notEqual(second.status,0,'concurrent claim must fail')
    assert.equal(run('complete','RUST-001','bad-token','fabricated').status,1)
    assert.equal(run('progress','RUST-001',claimed.data.runId,'Rust test added').status,0)
    assert.equal(run('complete','RUST-001',claimed.data.runId,'Rust/JS parity PASS, source Vite PASS').status,0)
    assert.equal(run('claim').data.id,'RUST-002')
  })
})

test('pause blocks new claims; blocked work is requeued deliberately',()=>{
  withQueue(run=>{
    assert.equal(run('pause').data.enabled,false)
    assert.notEqual(run('claim').status,0)
    assert.equal(run('resume').data.enabled,true)
    const task=run('claim').data
    assert.equal(run('block',task.id,task.runId,'Test fixture needs solver API').data.status,'blocked')
    assert.equal(run('claim').data.id,'RUST-002')
    assert.equal(run('requeue',task.id,'-', 'Test fixture fixed').data.status,'pending')
  })
})

test('queue expansion is append only; unverified completion gates remain listed',()=>{
  withQueue(run=>{
    // Queue IDs advance as genuine migration runs add further milestones.
    // Test adding a new ID rather than assuming the live queue ends at 006.
    const highest=Math.max(...fixture.tasks.map(task=>Number(task.id.slice(5))))
    const freshId='RUST-'+String(highest+1).padStart(3,'0')
    assert.equal(run('add',freshId,'Rust transport','Port handler','HTTP QA').status,0)
    assert.notEqual(run('add',freshId,'Duplicate','Bad','Bad').status,0)
    assert.equal(run('status').data.totals.pending,fixture.tasks.length+1)
    assert.equal(run('status').data.completionGates.length,5)
  })
})
