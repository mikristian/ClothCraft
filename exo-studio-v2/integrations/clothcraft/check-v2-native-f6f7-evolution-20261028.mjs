// Real compiled Rust persistence of a bounded F6/F7 six-size evolution table.
// This is internal EXO grading acceptance, not licensed CAD or factory proof.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {setNativeGradeEvolutionTable20261028} from '../../src/core/nativeGradeAdjacentBreak20261025.js'
import {prepareNativeGradeCatalog20261025,verifyNativeGradeCatalog20261025}
  from '../../src/core/nativeGradeCatalogBridge20261025.js'

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'exo-f6f7-native-evolution-'))
const workspace=createWorkspace(temporary)
const sizes=['XS','S','M','L','XL','XXL']
let current
const send=async data=>{
  const response=await workspace.request({...data,...(current?.revision!=null?{revision:current.revision}:{})})
  assert.equal(response.ok,true,`${data.op}: ${response.error||'Native operation rejected'}`)
  if(response.data?.template)current=response.data
  return response.data
}
const breakRow=(pointIndex,dx)=>({pointIndex,breaks:dx.map((value,i)=>({
  fromSize:sizes[i],toSize:sizes[i+1],dxMm:value,dyMm:0,
}))})
try{
  await send({op:'open',preset:'tshirt'})
  const existing=new Set(current.template.panels.map(panel=>panel.id))
  const fabric=current.template.fabrics[0].id
  await send({op:'edit',command:{kind:'Polygon',fabric,
    points:[[.55,.1],[.83,.1],[.88,.34],[.52,.34]]}})
  const extra=current.template.panels.find(panel=>!existing.has(panel.id))
  assert(extra,'Native Rust did not author the additional unsewn panel')
  const before=await send({op:'save'})
  const initial=createAccuMarkNativeRuleSet(current)
  assert(initial.ok,initial.reason)
  const evolved=setNativeGradeEvolutionTable20261028(current,initial.ruleSet,{
    panelId:extra.id,rows:[breakRow(1,[1,2,3,4,5]),breakRow(2,[0,1,2,1,0])],
  })
  assert(evolved.ok,evolved.reason)
  const forged=structuredClone(evolved.ruleSet)
  forged.panels[extra.id].pointOffsetsMm.XXL[1]=[Number.NaN,0]
  const unsafe=prepareNativeGradeCatalog20261025(current,before.project,forged)
  assert.equal(unsafe.ok,false,'Invalid draft bypassed Rust preflight')
  const planned=prepareNativeGradeCatalog20261025(current,before.project,evolved.ruleSet)
  assert(planned.ok,planned.reason)
  const revision=current.revision
  const tampered=structuredClone(planned.gradeRun)
  tampered.gradedTemplates[0].panels.find(panel=>panel.id===extra.id)
    .polygon.points[1][0]=null
  const rejected=await workspace.request({op:'grade-run-commit',revision,gradeRun:tampered})
  assert.equal(rejected.ok,false,'Rust accepted a malformed graded point')
  assert.equal(current.revision,revision,'Rejected native grade advanced the revision')
  assert.deepEqual((await send({op:'save'})).project,before.project,
    'Rejected native grade changed the persisted garment')
  const commit=await send({op:'grade-run-commit',gradeRun:planned.gradeRun})
  assert.equal(current.revision,revision+1)
  assert.equal(commit.gradeCatalogResult.persisted,true)
  const saved=(await send({op:'save'})).project
  assert.deepEqual(saved.grade_run.sizes,sizes)
  assert.equal(saved.grade_run.gradedTemplates.length,6)
  const sourcePanel=saved.template.panels.find(panel=>panel.id===extra.id)
  for(let i=0;i<sizes.length;i++){
    const graded=saved.grade_run.gradedTemplates[i].panels.find(panel=>panel.id===extra.id)
    for(const pointIndex of [1,2]){
      const offsets=evolved.ruleSet.panels[extra.id].pointOffsetsMm[sizes[i]][pointIndex]
      for(let axis=0;axis<2;axis++)
        assert(Math.abs(graded.polygon.points[pointIndex][axis]-
          sourcePanel.polygon.points[pointIndex][axis]-offsets[axis]/1000)<1e-9,
          `Rust ${sizes[i]} point ${pointIndex} axis ${axis} did not persist`)
    }
  }
  const status=await send({op:'grade-run-status'})
  const verified=verifyNativeGradeCatalog20261025(current,evolved.ruleSet,status,{durablySaved:true})
  assert(verified.ok,verified.reason)
  await send({op:'undo'})
  assert(!((await send({op:'save'})).project.grade_run),'Undo did not clear native catalog')
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project.grade_run,saved.grade_run)
  await send({op:'open',project:saved})
  assert.deepEqual((await send({op:'save'})).project.grade_run,saved.grade_run)
  assert.deepEqual((await send({op:'save'})).project.template.seams,before.project.template.seams)
  console.log(JSON.stringify({passed:true,nativeRust:true,
    sizes:6,editedPoints:2,physicalPointChecks:24,revisionIncrement:1,
    invalidPreflightRejected:true,nativeTamperRejected:true,undoRedoSaveReopen:true,
    unboundSewnRelationshipsPreserved:true,factoryApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(temporary,{recursive:true,force:true})
}
