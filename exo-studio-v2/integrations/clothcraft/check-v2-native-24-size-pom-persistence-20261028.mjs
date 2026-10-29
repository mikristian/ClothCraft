// Existing compiled Rust only: a real 24-size schema-v2 graded POM acceptance.
// This is an internal engineering fixture, never receiving-CAD/factory approval.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025,recoverNativeGradeRules20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {verifyNativeGradePomAuditWitness20261028} from '../../src/core/nativeGradePomAuditWitness20261028.js'

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-24size-pom-'))
const workspace=createWorkspace(temp)
let snapshot
const rpc=async packet=>{
  const response=await workspace.request({revision:snapshot?.revision,...packet})
  assert.equal(response.ok,true,`${packet.op}: ${response.error||'native operation rejected'}`)
  if(response.data?.template)snapshot=response.data
  return response.data
}
const sizes=Array.from({length:24},(_,i)=>String(i+1))
const targetFor=size=>280+Number(size)-12
const pathTargetFor=size=>520+Number(size)-12
const auditSaved=async()=>{
  const status=await rpc({op:'grade-run-status'})
  assert.equal(status.persistedInProject,true)
  assert.deepEqual(status.catalog.sizes,sizes)
  const recovered=recoverNativeGradeRules20261025(snapshot,status)
  assert.equal(recovered.ok,true,recovered.reason)
  const audit=await rpc({op:'grade-run-pom-audit'})
  assert.equal(audit.sizeCount,24)
  assert.equal(audit.pomCount,2)
  assert.equal(audit.total,48)
  assert.equal(audit.passed,48)
  assert.equal(audit.factoryApproved,false)
  const saved=(await rpc({op:'save'})).project
  assert.deepEqual(saved.grade_run.sizes,sizes)
  const witness=verifyNativeGradePomAuditWitness20261028({
    snapshot,ruleSet:recovered.ruleSet,status,audit,
    definitions:saved.grade_run.pomSpecs,
  })
  assert.equal(witness.ok,true,witness.reason)
  assert.equal(witness.nativeNumericalAccepted,true)
  assert.equal(witness.nativeRowsVerified,48)
  assert.equal(witness.factoryApproved,false)
  return saved
}
try{
  await rpc({op:'open',preset:'tshirt'})
  const original=new Set(snapshot.template.panels.map(panel=>panel.id))
  await rpc({op:'edit',command:{kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
    points:[[.55,.1],[.83,.1],[.83,.34],[.55,.34]]}})
  const third=snapshot.template.panels.find(panel=>!original.has(panel.id))
  assert(third,'Independent 24-size measurement panel missing')
  const saved=(await rpc({op:'save'})).project
  let authored=createAccuMarkNativeRuleSet(snapshot,{sizes,baseSize:'12'})
  assert.equal(authored.ok,true,authored.reason)
  for(const size of sizes)if(size!=='12')for(const pointIndex of [1,2]){
    const next=editAccuMarkNativePointRule(snapshot,authored.ruleSet,{
      panelId:third.id,pointIndex,size,dxMm:Number(size)-12,dyMm:0,
    })
    assert.equal(next.ok,true,`${size}/${pointIndex}: ${next.reason}`)
    authored=next
  }
  const targetsMm=Object.fromEntries(sizes.map(size=>[size,targetFor(size)]))
  const pathTargetsMm=Object.fromEntries(sizes.map(size=>[size,pathTargetFor(size)]))
  const definitions=[
    {id:'width24',label:'24-size physical width',panelId:third.id,
      kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:.5,targetsMm},
    {id:'path24',label:'24-size sewn clockwise boundary',panelId:third.id,
      kind:'sewline-path',fromPoint:3,toPoint:1,toleranceMm:.5,targetsMm:pathTargetsMm},
  ]
  const prepared=prepareNativeGradeCatalog20261025(snapshot,saved,authored.ruleSet,
    {pomDefinitions:definitions})
  assert.equal(prepared.ok,true,prepared.reason)
  const before=snapshot.revision
  await rpc({op:'grade-run-commit',gradeRun:prepared.gradeRun})
  assert.equal(snapshot.revision,before+1)
  const durable=await auditSaved()
  const originalTemplate=structuredClone(snapshot.template)
  const largest=durable.grade_run.gradedTemplates[23]
  const gradedPanel=largest.panels.find(panel=>panel.id===third.id)
  const basePanel=originalTemplate.panels.find(panel=>panel.id===third.id)
  assert(gradedPanel&&basePanel,'The largest canonical size must retain its source panel')
  assert(Math.abs((gradedPanel.polygon.points[1][0]-basePanel.polygon.points[1][0])*1000-12)<1e-6,
    'Largest size must have 12 mm actual point growth')
  await rpc({op:'undo'})
  assert.equal(snapshot.revision,before+2)
  const undoStatus=await rpc({op:'grade-run-status'})
  assert.notDeepEqual(undoStatus.catalog?.sizes,sizes)
  await rpc({op:'redo'})
  await auditSaved()
  await rpc({op:'open',project:durable})
  await auditSaved()
  const activated=await rpc({op:'grade-run-activate',size:'24'})
  assert.equal(activated.activeGradedSize,'24')
  assert.deepEqual(activated.template,largest)
  await rpc({op:'grade-run-restore'})
  assert.deepEqual(snapshot.template,originalTemplate)
  console.log(JSON.stringify({passed:true,realCompiledRust:true,
    canonicalSizes:24,physicalPomRows:48,wrappedSewnPath:true,
    largestSizePointGrowthMm:12,gradedActivationAndRestore:true,
    nativeUndoRedo:true,durableSaveReopen:true,
    licensedReceivingCad:false,signedPhysicalSamples:false,factoryApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(temp,{recursive:true,force:true})
}
