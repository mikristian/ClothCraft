// RUN37: bounded real native CPU physics of six compiled graded T-shirt scenes.
// This is finite numerical evidence only, never calibrated garment-fit approval.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-run37-fit-'))
const ws=createWorkspace(dir)
const sizes=['XS','S','M','L','XL','XXL']
const offsets=[-.012,-.006,0,.006,.012,.018]
const rows=[]
let revision,phase='initial',source
const request=async packet=>{
  const reply=await ws.request({revision,...packet})
  assert.equal(reply.ok,true,`${phase}: ${packet.op}: ${reply.error??'native error'}`)
  if(Number.isInteger(reply.data?.revision))revision=reply.data.revision
  return reply.data
}
const finite=n=>typeof n==='number'&&Number.isFinite(n)
try{
  phase='open Rust T-shirt'
  const opened=await request({op:'open',preset:'tshirt'})
  const base=structuredClone(opened.template)
  assert(base.seams.length>=8,'T-shirt sewn relations absent')
  const panel=base.panels.find(p=>p.polygon?.points?.length>=4)
  assert(panel,'No adjustable polygon')
  const grade={schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(base),
    gradedTemplates:sizes.map((size,i)=>{
      const t=structuredClone(base)
      const p=t.panels.find(p=>p.id===panel.id)
      // Keep this acceptance focused on the genuine six graded native scenes;
      // preserve all original T-shirt sewn relationships and vary fit envelope.
      for(const q of p.polygon.points)q[0]+=offsets[i]
      return t
    }),pomSpecs:[]}
  phase='grade commit'
  await request({op:'grade-run-commit',gradeRun:grade})
  source=(await request({op:'save'})).project
  phase='six native size solver steps'
  for(const size of sizes){
    const active=await request({op:'grade-run-activate',size})
    assert.equal(active.activeGradedSize,size)
    assert.equal(active.gradedFitEvidence?.nativeStepEvidence,false)
    assert.equal(active.gradedFitEvidence?.nativeMeshCompiled,true)
    const before=active.revision
    const result=await request({op:'step',steps:1})
    const evidence=result.gradedFitEvidence
    assert.equal(result.revision,before+1)
    assert.equal(evidence?.nativeStepEvidence,true,`${size}: native solver did not verify step`)
    assert.equal(evidence?.measurementsFinite,true)
    assert.equal(evidence?.fitCertified,false)
    assert.equal(evidence?.manufacturingApproved,false)
    assert(evidence.seamCount>=8,`${size}: original sewn assembly lost`)
    assert(finite(evidence.maxSeamGapMm)&&evidence.maxSeamGapMm>=0)
    assert(finite(evidence.maxRmsSeamGapMm)&&evidence.maxRmsSeamGapMm>=0)
    assert(finite(evidence.simulationTimeSeconds)&&evidence.simulationTimeSeconds>0)
    assert(result.metrics&&finite(result.metrics.contacts)&&result.metrics.contacts>=0)
    assert(result.positions.length>0&&result.positions.every(p=>Array.isArray(p)&&p.every(finite)))
    rows.push({size,meshVertices:result.positions.length,seams:evidence.seamCount,
      contacts:result.metrics.contacts,maxSeamGapMm:evidence.maxSeamGapMm,
      maxRmsSeamGapMm:evidence.maxRmsSeamGapMm,timeSeconds:evidence.simulationTimeSeconds,
      stepMs:result.metrics.step_ms})
    await request({op:'grade-run-restore'})
    assert.deepEqual((await request({op:'save'})).project,source,
      `${size}: fitted viewport changed saved production garment`)
  }
  phase='stale revision negative'
  const stale=await ws.request({op:'grade-run-activate',size:'XS',revision:revision-1})
  assert.equal(stale.ok,false,'Stale activation accepted')
  console.log(JSON.stringify({passed:true,compiledRust:true,solverStepsPerSize:1,
    originalSewnRelations:base.seams.length,sizes:rows,
    finiteNumericalEvidence:true,physicalFitCalibrated:false,externalCadAccepted:false,
    factoryApproved:false,cuttingAuthorized:false,staleRejected:true},null,2))
}catch(error){
  console.error(JSON.stringify({passed:false,phase,error:String(error.message??error),rows},null,2))
  process.exitCode=1
}finally{
  await Promise.resolve(ws.close()).catch(()=>{})
  fs.rmSync(dir,{recursive:true,force:true})
}
