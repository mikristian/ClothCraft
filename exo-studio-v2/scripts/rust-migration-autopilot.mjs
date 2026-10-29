#!/usr/bin/env node
// Durable, restartable coordination for hourly CoS migration tasks.
// This file is intentionally not an LLM runner: model work is initiated by
// the connected ChatGPT/Chat On Steroids session, never faked by a daemon.
import {readFileSync,writeFileSync,renameSync,mkdirSync,rmdirSync,existsSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const queueFile=resolve(process.env.EXO_MIGRATION_QUEUE_FILE||
  resolve(root,'docs/engineering/exo-v2-rust-autopilot-queue.json'))
const lockDir=`${queueFile}.lock`
const [operation='status',...args]=process.argv.slice(2)
const MAX_LOGS=250

const die=(message,code=1)=>{console.error(message);process.exit(code)}
const load=()=>{
  const data=JSON.parse(readFileSync(queueFile,'utf8'))
  if(data.schema!==1||!Array.isArray(data.tasks)||!Array.isArray(data.runs))
    throw Error('Unsupported migration queue schema')
  return data
}
const write=data=>{
  const temp=`${queueFile}.${process.pid}.${randomUUID()}.tmp`
  writeFileSync(temp,JSON.stringify(data,null,2)+'\n',{mode:0o600})
  renameSync(temp,queueFile)
}
function withLock(mutator){
  try{mkdirSync(lockDir)}catch(error){
    if(error.code==='EEXIST')die('Queue locked by another running migration task; retry later',3)
    throw error
  }
  try{
    const data=load()
    const result=mutator(data)
    if(result?.changed)write(data)
    console.log(JSON.stringify(result?.response??{}))
  }finally{rmdirSync(lockDir)}
}
function log(data,event,taskId,details=''){
  data.runs.push({at:new Date().toISOString(),event,taskId,details})
  if(data.runs.length>MAX_LOGS)data.runs.splice(0,data.runs.length-MAX_LOGS)
}
const summarize=data=>({
  enabled:data.enabled,objective:data.objective,
  totals:Object.fromEntries(['pending','active','done','blocked'].map(status=>[
    status,data.tasks.filter(task=>task.status===status).length])),
  active:data.tasks.filter(task=>task.status==='active').map(({id,title,runId,startedAt})=>({id,title,runId,startedAt})),
  next:data.tasks.find(task=>task.status==='pending')??null,
  completionGates:data.completionGates,
  queueExhausted:data.tasks.every(task=>task.status==='done'),
  recent:data.runs.slice(-6),
})
try{
  if(!existsSync(queueFile))die(`Migration queue missing: ${queueFile}`)
  if(operation==='status'||operation==='next'){
    const status=summarize(load())
    console.log(JSON.stringify(operation==='next'?{
      enabled:status.enabled,active:status.active,next:status.next,queueExhausted:status.queueExhausted,
    }:status,null,2))
  }else if(operation==='claim'){
    withLock(data=>{
      if(!data.enabled)throw Error('Autopilot paused')
      const active=data.tasks.find(task=>task.status==='active')
      if(active)throw Error(`Another task is active: ${active.id}; resolve it before starting work`)
      const task=args[0]?data.tasks.find(task=>task.id===args[0]):data.tasks.find(task=>task.status==='pending')
      if(!task)throw Error('No pending tasks; expand the migration queue from a fresh code audit')
      if(task.status!=='pending')throw Error(`Task ${task.id} is ${task.status}`)
      task.status='active'
      task.startedAt=new Date().toISOString()
      task.runId=randomUUID()
      log(data,'claim',task.id,task.runId)
      return {changed:true,response:{id:task.id,runId:task.runId,title:task.title,objective:task.objective,
        acceptance:task.acceptance}}
    })
  }else if(operation==='complete'||operation==='block'||operation==='progress'){
    const [id,runId,...words]=args
    const evidence=words.join(' ').trim()
    if(!id||!runId||!evidence)throw Error(`Usage: ${operation} TASK_ID RUN_ID "test evidence / failure reason"`)
    withLock(data=>{
      const task=data.tasks.find(task=>task.id===id)
      if(!task||task.status!=='active'||task.runId!==runId)throw Error('Task not active or run token mismatch')
      if(operation==='complete'){task.status='done';task.completedAt=new Date().toISOString();task.evidence=evidence}
      if(operation==='block'){task.status='blocked';task.blockedAt=new Date().toISOString();task.blocker=evidence}
      if(operation!=='progress'){delete task.runId;delete task.startedAt}
      log(data,operation,id,evidence)
      return {changed:true,response:{id,status:task.status,evidence}}
    })
  }else if(operation==='requeue'){
    const [id,runId,...words]=args
    const reason=words.join(' ').trim()
    if(!id||!runId||!reason)throw Error('Usage: requeue TASK_ID RUN_ID "reason after verifying old worker is stopped"')
    withLock(data=>{
      const task=data.tasks.find(task=>task.id===id)
      if(!task || !['active','blocked'].includes(task.status))
        throw Error('Only active or blocked tasks can be requeued')
      if(task.status==='active'&&task.runId!==runId)
        throw Error('Active run token mismatch; cannot reset another worker')
      task.status='pending'
      delete task.runId
      delete task.startedAt
      delete task.blocker
      delete task.blockedAt
      log(data,'requeue',id,reason)
      return {changed:true,response:{id,status:task.status}}
    })
  }else if(operation==='pause'||operation==='resume'){
    withLock(data=>{
      data.enabled=operation==='resume'
      log(data,operation,null,'Autopilot mode changed')
      return {changed:true,response:{enabled:data.enabled}}
    })
  }else if(operation==='add'){
    const [id,title,objective,acceptance]=args
    if(!/^RUST-\d{3,}$/.test(id??'')||!title||!objective||!acceptance)
      throw Error('Usage: add RUST-007 "Title" "Objective" "Acceptance"')
    withLock(data=>{
      if(data.tasks.some(task=>task.id===id))throw Error('Task ID already exists')
      data.tasks.push({id,title,objective,acceptance,area:'continuation',status:'pending'})
      log(data,'add',id,title)
      return {changed:true,response:{id,status:'pending'}}
    })
  }else{
    throw Error('Use status | next | claim [ID] | progress ID RUN_ID NOTE | complete ID RUN_ID EVIDENCE | block ID RUN_ID REASON | requeue ID RUN_ID REASON | add ID TITLE OBJECTIVE ACCEPTANCE | pause | resume')
  }
}catch(error){die(`Migration coordinator: ${error.message}`)}
