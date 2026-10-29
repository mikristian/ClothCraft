import test from 'node:test'
import assert from 'node:assert/strict'
import {auditModarisWorkspaceActions20261027,invokeAuditedModarisAction20261027,modarisAuditedCommandProps20261027} from './modarisWorkspaceActionAudit20261027.js'

const snapshot = {revision:8,template:{panels:[{id:'front',polygon:{points:[[0,0],[1,0],[1,1]],edges:[0,1,2]}}]},canUndo:true,gradeRunPersisted:true}
const actions = {select:()=> 'selected',move:()=> 'moved',split:()=> 'split',line:()=> 'line','view-2d':()=> 'full',undo:()=> 'undo'}
const context = (overrides={}) => ({snapshot,actions,full2D:true,selection:{panel:'front',edge:0,anchor:0,revision:8},...overrides})

test('audits connected operations against the selected native polygon including edge zero',()=>{
  const audit=auditModarisWorkspaceActions20261027(context())
  assert.equal(audit.commands.split.available,true)
  assert.equal(audit.commands.move.available,true)
  assert.equal(audit.commands.line.available,true)
  assert.match(audit.commands.facing.reason,/not connected/)
  assert.equal(modarisAuditedCommandProps20261027(audit,'facing').disabled,true)
})

test('split workspace exposes only the return-to-2D action',()=>{
  const audit=auditModarisWorkspaceActions20261027(context({full2D:false}))
  assert.equal(audit.commands['view-2d'].available,true)
  for (const id of ['select','line','move','split','undo']) assert.equal(audit.commands[id].disabled,true,id)
})

test('rejects stale panel, edge, point, source revision and unsupported commands',()=>{
  assert.match(auditModarisWorkspaceActions20261027(context({selection:{panel:'removed',edge:0}})).commands.move.reason,/unavailable|no longer exists/)
  assert.match(auditModarisWorkspaceActions20261027(context({selection:{panel:'front',edge:99}})).commands.split.reason,/no longer exists/)
  assert.match(auditModarisWorkspaceActions20261027(context({selection:{panel:'front',anchor:7}})).commands.move.reason,/no longer exists/)
  assert.match(auditModarisWorkspaceActions20261027(context({selection:{panel:'front',edge:0,revision:7}})).commands.split.reason,/older pattern revision/)
  assert.match(auditModarisWorkspaceActions20261027(context()).commands.export.reason,/not connected/)
})

test('dispatch checks latest state, including revision races and live busy state',()=>{
  let called=0
  const live=context({actions:{...actions,split:()=>++called}})
  const getContext=()=>live
  assert.equal(invokeAuditedModarisAction20261027('split',getContext).ok,true)
  assert.equal(called,1)
  live.snapshot={...snapshot,revision:9}
  assert.match(invokeAuditedModarisAction20261027('split',getContext).reason,/older pattern revision/)
  live.selection={...live.selection,revision:9}
  live.busy=true
  assert.match(invokeAuditedModarisAction20261027('split',getContext).reason,/busy/)
  live.busy=false
  live.full2D=false
  assert.match(invokeAuditedModarisAction20261027('split',getContext).reason,/full 2D/)
  assert.equal(called,1)
  assert.equal(invokeAuditedModarisAction20261027('fictional-command',getContext).ok,false)
})

test('Modaris boundary selection resolves positional edges and stable native edge IDs',()=>{
  const native={...snapshot,template:{panels:[{id:'front',polygon:{points:[[0,0],[1,0],[1,1]],edges:[41,87,99]}}]}}
  for(const edge of [0,1,2,41,87,99]) {
    const audited=auditModarisWorkspaceActions20261027(context({snapshot:native,selection:{panel:'front',edge,revision:8}}))
    assert.equal(audited.commands.split.available,true,`Valid native edge ${edge}`)
  }
  for(const edge of [-1,3,12,100,1.5]) {
    const audited=auditModarisWorkspaceActions20261027(context({snapshot:native,selection:{panel:'front',edge,revision:8}}))
    assert.match(audited.commands.split.reason,/boundary no longer exists/,`Invalid native edge ${edge}`)
  }
})
