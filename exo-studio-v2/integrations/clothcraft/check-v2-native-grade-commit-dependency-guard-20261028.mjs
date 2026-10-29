// Real compiled Rust regression for persisted point-binding grade dependencies.
// Uses an isolated disposable native project; no factory approval is implied.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-grade-binding-guard-'))
const workspace=createWorkspace(temporary)
let current,stage='open'
const rpc=async payload=>{
  const reply=await workspace.request({revision:current?.revision,...payload})
  assert.equal(reply.ok,true,`${stage}/${payload.op}: ${reply.error||'native request refused'}`)
  if(reply.data?.template)current=reply.data
  return reply.data
}
const project=async()=>(await rpc({op:'save'})).project
const snapshot=async()=>rpc({op:'snapshot'})
const rejectAtomic=async(payload,reason)=>{
  const beforeRevision=current.revision
  const before=structuredClone(await project())
  const response=await workspace.request({revision:beforeRevision,...payload})
  assert.equal(response.ok,false,`${reason}: Rust accepted unsafe grade commit`)
  assert.match(String(response.error||''),/binding|depend|regenerat|source|stale/i,
    `${reason}: missing actionable native dependency diagnostic`)
  await snapshot()
  assert.equal(current.revision,beforeRevision,`${reason}: native revision changed`)
  assert.deepEqual(await project(),before,`${reason}: native saved project changed`)
  return String(response.error)
}
try{
  await rpc({op:'open',preset:'tshirt'})
  const front=current.template.panels.find(p=>p.id==='front')
  assert(front?.polygon?.points?.length>2,'T-shirt front source points unavailable')
  const a=front.polygon.points[0],b=front.polygon.points[1]
  const distanceMm=Math.hypot(b[0]-a[0],b[1]-a[1])*1000
  assert(distanceMm>0,'Bound source must have a nonzero measured edge')
  const bindings={measurements:{frontLength:{valueMm:distanceMm}},bindings:[{
    id:'grade_guard_front_length',panelId:front.id,pointIndex:1,
    mode:'along',a:0,b:1,distanceFormula:'frontLength',dependsOn:[],
  }]}
  stage='persist point dependency'
  await rpc({op:'bindings-store',nativeBindings:bindings})
  assert.equal(current.nativePointBindings?.active,true)
  const withBindings=await project()
  assert.equal(withBindings.native_point_bindings.bindings[0].id,'grade_guard_front_length')
  const rules=createAccuMarkNativeRuleSet(current)
  assert.equal(rules.ok,true,rules.reason)
  const prepared=prepareNativeGradeCatalog20261025(current,withBindings,rules.ruleSet)
  assert.equal(prepared.ok,true,prepared.reason)

  stage='allow initial binding-aware grade bootstrap'
  const bootstrapRevision=current.revision
  await rpc({op:'grade-run-commit',gradeRun:prepared.gradeRun})
  await snapshot()
  assert.equal(current.revision,bootstrapRevision+1,'First valid grade install must commit once')
  assert.equal(current.nativePointBindings?.active,true,'Bootstrap removed persisted point dependencies')
  const bootstrap=await project()
  assert(bootstrap.grade_run?.gradedTemplates?.length>1,'First grade catalog was not installed')
  assert.deepEqual(bootstrap.native_point_bindings,withBindings.native_point_bindings)

  stage='fail-closed second catalog-only replacement'
  const lastSize=rules.ruleSet.sizes.at(-1)
  assert(lastSize&&lastSize!==rules.ruleSet.baseSize,'Distinct nonbase grade required')
  const changed=editAccuMarkNativePointRule(current,rules.ruleSet,{
    panelId:front.id,pointIndex:1,size:lastSize,dxMm:2,dyMm:0,
  })
  assert.equal(changed.ok,true,changed.reason)
  const replacement=prepareNativeGradeCatalog20261025(current,bootstrap,changed.ruleSet)
  assert.equal(replacement.ok,true,replacement.reason)
  assert.notDeepEqual(replacement.gradeRun,bootstrap.grade_run,
    'Second catalog candidate must contain an actual grade change')
  const error=await rejectAtomic({op:'grade-run-commit',gradeRun:replacement.gradeRun},
    'second catalog-only replacement with persisted binding dependency')
  const boundBaseline=await project()
  await rpc({op:'open',project:boundBaseline})
  assert.equal(current.nativePointBindings?.active,true,'Failed replacement invalidated persisted bindings on reopen')
  assert.deepEqual((await project()).grade_run,bootstrap.grade_run,
    'Failed replacement erased the original bootstrapped catalog')
  assert.deepEqual(await project(),boundBaseline,'Rejected grade changed saved reopened document')

  stage='explicit dependency removal and clean control commit'
  await rpc({op:'grade-run-clear'})
  await rpc({op:'bindings-clear'})
  assert.equal(current.nativePointBindings,null)
  const cleared=await project()
  assert.equal(cleared.native_point_bindings??null,null)
  const cleanRules=createAccuMarkNativeRuleSet(current)
  assert.equal(cleanRules.ok,true,cleanRules.reason)
  const clean=prepareNativeGradeCatalog20261025(current,cleared,cleanRules.ruleSet)
  assert.equal(clean.ok,true,clean.reason)
  const beforeCommitRevision=current.revision
  await rpc({op:'grade-run-commit',gradeRun:clean.gradeRun})
  await snapshot()
  assert.equal(current.revision,beforeCommitRevision+1,'Clean commit must be one native transaction')
  const committed=await project()
  assert(committed.grade_run?.gradedTemplates?.length>1,'No native graded sizes persisted')
  assert.deepEqual(committed.template,cleared.template,'Clean commit modified base pattern geometry')

  stage='linked undo redo and durable reopen'
  await rpc({op:'undo'})
  assert.equal((await project()).grade_run??null,cleared.grade_run??null,
    'Undo did not restore pre-commit grade state')
  await rpc({op:'redo'})
  assert.deepEqual((await project()).grade_run,committed.grade_run,
    'Redo did not restore committed graded geometry')
  await rpc({op:'open',project:committed})
  assert.deepEqual((await project()).grade_run,committed.grade_run,
    'Save/reopen lost the native clean grade commit')
  console.log(JSON.stringify({passed:true,realCompiledRust:true,
    initialBindingGradeBootstrap:true,secondCatalogReplacementRejected:true,
    persistedBindingDependencyRejected:true,revisionAndProjectAtomic:true,
    rejectionSurvivesSaveReopen:true,cleanControlCommitted:true,
    undoRedo:true,saveReopen:true,qualifiedRegenerationTested:false,
    reason:error,manufacturingApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(temporary,{recursive:true,force:true})
}
