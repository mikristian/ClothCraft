// Native persisted source graph must reject unrelated authoring edits atomically.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'exo-run31-bound-edit-'))
const workspace=createWorkspace(directory)
let revision=0
const request=async(op,extra={})=>{
  const response=await workspace.request({op,revision,...extra})
  assert.equal(response.ok,true,`${op}: ${response.error}`)
  if(Number.isInteger(response.data?.revision))revision=response.data.revision
  return response.data
}
try {
  const opened=await request('open',{preset:'tshirt'})
  const front=opened.template.panels.find(panel=>panel.id==='front')
  assert(front?.polygon?.points?.length>2)
  // A source annotation changes metadata without changing sewn edge lengths.
  await request('edit',{command:{kind:'Annotation',panel:'front',text:'run31 source',position:[0,0]}})
  const edited=(await request('snapshot')).template.panels.find(panel=>panel.id==='front')
  const [a,b]=edited.polygon.points
  const distance=Math.hypot(b[0]-a[0],b[1]-a[1])*1000
  await request('bindings-store',{nativeBindings:{measurements:{frontLength:{valueMm:distance}},bindings:[{
    id:'run31_front',panelId:'front',pointIndex:1,mode:'along',a:0,b:1,
    distanceFormula:'frontLength',dependsOn:[],
  }]}})
  const baseline=(await request('save')).project
  const priorRevision=revision
  const attempt=await workspace.request({op:'edit',revision,command:{kind:'Annotation',panel:'front',text:'run31 bound edit',position:[0,0]}})
  assert.equal(attempt.ok,false,'Bound graph accepted unrelated authoring command')
  assert.match(String(attempt.error),/bindings|regeneration/i)
  assert.equal((await request('snapshot')).revision,priorRevision)
  assert.deepEqual((await request('save')).project,baseline)
  await request('open',{project:baseline})
  assert.deepEqual((await request('save')).project,baseline)
  console.log(JSON.stringify({passed:true,run31:true,atomic:true,reopen:true}))
} finally {
  workspace.close()
  fs.rmSync(directory,{recursive:true,force:true})
}
