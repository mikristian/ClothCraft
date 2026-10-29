// Independent negative fixture for the existing compiled Rust schema-v2 grading
// engine. This is internal fail-closed QA, not third-party CAD/factory signoff.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-24size-negative-'))
const workspace=createWorkspace(temp)
let current
const request=async packet=>{
  const reply=await workspace.request({revision:current?.revision,...packet})
  assert.equal(reply.ok,true,`${packet.op}: ${reply.error||'native rejection'}`)
  if(reply.data?.template)current=reply.data
  return reply.data
}
const project=async()=>(await request({op:'save'})).project
const sizes=Array.from({length:24},(_,index)=>String(index+1))
const rejectWithoutMutation=async (candidate,label,baseline)=>{
  const beforeRevision=current.revision
  const reply=await workspace.request({op:'grade-run-commit',revision:beforeRevision,gradeRun:candidate})
  assert.equal(reply.ok,false,`${label}: Rust accepted invalid graded catalog`)
  assert.equal(current.revision,beforeRevision,`${label}: rejected transaction advanced revision`)
  assert.deepEqual(await project(),baseline,`${label}: rejected transaction modified persisted garment`)
  return String(reply.error||'')
}
try{
  await request({op:'open',preset:'tshirt'})
  const previousIds=new Set(current.template.panels.map(panel=>panel.id))
  await request({op:'edit',command:{kind:'Polygon',fabric:current.template.fabrics[0].id,
    points:[[.55,.1],[.83,.1],[.83,.34],[.55,.34]]}})
  const third=current.template.panels.find(panel=>!previousIds.has(panel.id))
  assert(third,'Native third garment panel missing')
  const source=await project()
  let rules=createAccuMarkNativeRuleSet(current,{sizes,baseSize:'12'})
  assert(rules.ok,rules.reason)
  for(const size of sizes)if(size!=='12')for(const pointIndex of [1,2]){
    const edited=editAccuMarkNativePointRule(current,rules.ruleSet,{
      panelId:third.id,pointIndex,size,dxMm:Number(size)-12,dyMm:0,
    })
    assert(edited.ok,edited.reason)
    rules=edited
  }
  const targetsMm=Object.fromEntries(sizes.map(size=>[size,280+Number(size)-12]))
  const pomDefinitions=[{id:'width24',label:'24-size physical width',panelId:third.id,
    kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:.5,targetsMm}]
  const prepared=prepareNativeGradeCatalog20261025(current,source,rules.ruleSet,{pomDefinitions})
  assert(prepared.ok,prepared.reason)
  await request({op:'grade-run-commit',gradeRun:prepared.gradeRun})
  const baseline=await project()
  assert.equal(baseline.grade_run.sizes.length,24)
  const audit=await request({op:'grade-run-pom-audit'})
  assert.equal(audit.total,24)
  assert.equal(audit.passed,24)
  assert.equal(audit.factoryApproved,false)

  const malformedGeometry=structuredClone(baseline.grade_run)
  malformedGeometry.gradedTemplates[23].panels.find(panel=>panel.id===third.id).polygon.points[1][0]=null
  const geometryError=await rejectWithoutMutation(malformedGeometry,'invalid largest-size point',baseline)

  const missingPom=structuredClone(baseline.grade_run)
  delete missingPom.pomSpecs[0].targetsMm['24']
  const pomError=await rejectWithoutMutation(missingPom,'missing canonical POM target',baseline)

  const stale=await workspace.request({op:'grade-run-commit',
    revision:current.revision+1,gradeRun:baseline.grade_run})
  assert.equal(stale.ok,false,'Stale revision accepted by Rust')
  assert.deepEqual(await project(),baseline,'Stale commit modified saved project')
  await request({op:'open',project:baseline})
  assert.deepEqual(await project(),baseline,'Failed transaction changed reopened project')
  console.log(JSON.stringify({passed:true,realCompiledRust:true,canonicalSizes:24,
    physicalPomRows:24,invalidGeometryRejected:true,missingPomTargetRejected:true,
    staleRevisionRejected:true,rejectedCommitsAtomic:true,durableSaveReopen:true,
    geometryError,pomError,licensedReceivingCad:false,signedPhysicalSamples:false,
    factoryApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(temp,{recursive:true,force:true})
}
