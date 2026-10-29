// Real compiled-Rust F7 external correspondence over 24 physically distinct sizes.
// Internal evidence only: independent licensed CAD and factory release are absent.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {planNativeGradeSizeCorrespondence20261028 as plan,
  verifyNativeGradeSizeCorrespondence20261028 as verify}
  from '../../src/core/nativeGradeSizeCorrespondence20261028.js'

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-24-alias-'))
const workspace=createWorkspace(dir)
const sizes=Array.from({length:24},(_,i)=>String(i+1))
const aliases={EU40:'14',UK10:'16',US12:'12',US24:'24'}
let snapshot
const rpc=async packet=>{
  const response=await workspace.request({revision:snapshot?.revision,...packet})
  assert.equal(response.ok,true,`${packet.op}: ${response.error||'native rejection'}`)
  if(response.data?.template)snapshot=response.data
  return response.data
}
const save=async()=>(await rpc({op:'save'})).project
const rejectWithoutMutation=async packet=>{
  const before=await save(),revision=snapshot.revision
  const response=await workspace.request({revision,...packet})
  assert.equal(response.ok,false,`${packet.op} accepted invalid native request`)
  await rpc({op:'snapshot'})
  assert.equal(snapshot.revision,revision)
  assert.deepEqual(await save(),before)
  return response.error
}
const polygon=(template,id)=>{
  const panel=template.panels.find(p=>p.id===id)
  assert(panel?.polygon,`Missing panel ${id}`)
  return panel.polygon
}

try{
  await rpc({op:'open',preset:'tshirt'})
  const originalIds=new Set(snapshot.template.panels.map(p=>p.id))
  await rpc({op:'edit',command:{kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
    points:[[.55,.1],[.95,.1],[.95,.4],[.55,.4]]}})
  const panel=snapshot.template.panels.find(p=>!originalIds.has(p.id))
  assert(panel,'Rust did not author the correspondence test panel')
  const base=structuredClone(snapshot.template)
  const gradeRun={schemaVersion:2,sizes,baseSize:'12',baseTemplate:structuredClone(base),
    sizeCorrespondence:{},pomSpecs:[],gradedTemplates:sizes.map(size=>{
      const template=structuredClone(base)
      const poly=polygon(template,panel.id)
      poly.points[1][0]+=(Number(size)-12)*.001
      return template
    })}
  await rpc({op:'grade-run-commit',gradeRun})
  const before=structuredClone(snapshot)
  const beforeProject=await save()
  const status=await rpc({op:'grade-run-status'})
  assert.equal(status.persistedInProject,true)
  assert.equal(status.sizeActivated,false)
  assert.equal(status.catalog.sizes.length,24)
  const planned=plan(before,status,aliases)
  assert.equal(planned.ok,true,planned.reason)
  assert.equal(planned.expectedCatalog.schemaVersion,2)
  assert.deepEqual(planned.expectedCatalog.gradedTemplates,beforeProject.grade_run.gradedTemplates)
  const invalid=structuredClone(planned.expectedCatalog)
  invalid.sizeCorrespondence.US24='99'
  const invalidReason=await rejectWithoutMutation({op:'grade-run-commit',gradeRun:invalid})
  const staleReason=await rejectWithoutMutation({op:'grade-run-commit',
    revision:before.revision+1,gradeRun:planned.expectedCatalog})
  await rpc(planned.request)
  assert.equal(snapshot.revision,before.revision+1)
  const persisted=await save()
  const persistedStatus=await rpc({op:'grade-run-status'})
  const witnessed=verify(before,planned,persistedStatus,persisted)
  assert.equal(witnessed.ok,true,witnessed.reason)
  assert.deepEqual(persisted.template,beforeProject.template)
  assert.deepEqual(persisted.grade_run.gradedTemplates,beforeProject.grade_run.gradedTemplates)
  assert.equal(plan(snapshot,persistedStatus,{US12:'12'}).ok,false,
    'F7 alias update silently dropped durable external identities')
  assert.equal(plan(snapshot,persistedStatus,{...aliases,US24:'23'}).ok,false,
    'F7 alias update silently redirected a durable external identity')
  for(const [alias,canonical] of Object.entries(aliases)){
    const activated=await rpc({op:'grade-run-activate',size:alias})
    assert.equal(activated.activeGradedSize,alias)
    assert.deepEqual(activated.template,
      persisted.grade_run.gradedTemplates[sizes.indexOf(canonical)],
      `Alias ${alias} did not activate canonical size ${canonical}`)
    await rpc({op:'grade-run-restore'})
    assert.deepEqual(snapshot.template,persisted.template)
  }
  await rpc({op:'undo'})
  assert.deepEqual((await save()).grade_run.sizeCorrespondence??{}, {},
    'Undo did not remove the alias transaction')
  await rpc({op:'redo'})
  assert.deepEqual((await save()).grade_run,persisted.grade_run)
  await rpc({op:'open',project:persisted})
  assert.deepEqual((await save()).grade_run,persisted.grade_run)
  assert.deepEqual((await rpc({op:'grade-run-status'})).catalog.sizeCorrespondence,aliases)
  console.log(JSON.stringify({passed:true,realCompiledRust:true,canonicalSizes:24,
    independentlyDistinctGradedTemplates:24,externalAliases:4,
    aliasesActivatedAgainstNativeGeometry:4,invalidAliasRejected:true,
    staleRevisionRejected:true,persistedGeometryUnchanged:true,
    existingAliasRemovalAndRedirectionRejected:true,undoRedo:true,saveReopen:true,
    invalidReason,staleReason,independentReceivingCad:false,factoryApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(dir,{recursive:true,force:true})
}
