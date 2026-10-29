// Disposable real Rust session: schema-v2 grading geometry + correspondence,
// atomic commit, native disk save/reopen, and linked Undo/Redo. Never user data.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025 as prepare,recoverNativeGradeRules20261025 as recover} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'exo-named-native-e2e-'))
const workspace=createWorkspace(directory)
let snapshot,stage='open'
const rpc=async data=>{
 const response=await workspace.request({revision:snapshot?.revision,...data})
 assert.equal(response.ok,true,`${stage}/${data.op}: ${response.error||'refused'}`)
 if(response.data?.template)snapshot=response.data
 return response.data
}
const rejected=async(data,why)=>{
 const before=(await rpc({op:'save'})).project,revision=snapshot.revision
 const response=await workspace.request({revision,...data})
 assert.equal(response.ok,false,`${stage}/${data.op}: invalid native transaction was accepted`)
 assert.match(response.error,why)
 assert.equal((await rpc({op:'snapshot'})).revision,revision)
 assert.deepEqual((await rpc({op:'save'})).project,before)
}
try{
 await rpc({op:'open',preset:'tshirt'})
 const old=new Set(snapshot.template.panels.map(p=>p.id))
 stage='author disposable physical panel'
 for(const seam of [...snapshot.template.seams])await rpc({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
 await rpc({op:'edit',command:{kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
  points:[[0,0],[.36,0],[.36,.28],[0,.28]]}})
 const panel=snapshot.template.panels.find(p=>!old.has(p.id))
 assert(panel,'physical disposable panel was not authored')
 const base=(await rpc({op:'save'})).project
 const sizes=['2','4','6','8']
 let rules=createAccuMarkNativeRuleSet(snapshot,{sizes,baseSize:'6'})
 assert.equal(rules.ok,true,rules.reason)
 const edited=editAccuMarkNativePointRule(snapshot,rules.ruleSet,{panelId:panel.id,
  pointIndex:1,size:'8',dxMm:8,dyMm:0})
 assert.equal(edited.ok,true,edited.reason)
 edited.ruleSet.sizeEvolution={correspondences:{US12:'8',US8:'4'}}
 const packet=prepare(snapshot,base,edited.ruleSet)
 assert.equal(packet.ok,true,packet.reason)
 assert.equal(packet.gradeRun.schemaVersion,2)
 stage='native Rust schema-v2 commit and physical persistence'
 await rejected({op:'grade-run-commit',gradeRun:{...packet.gradeRun,
  sizeCorrespondence:{US12:'99'}}},/correspondence|canonical|target/i)
 await rpc({op:'grade-run-commit',gradeRun:packet.gradeRun})
 const committed=snapshot.revision
 let status=await rpc({op:'grade-run-status'})
 assert.equal(status.persistedInProject,true)
 assert.equal(status.catalog.schemaVersion,2)
 assert.deepEqual(status.catalog.sizeCorrespondence,{US12:'8',US8:'4'})
 stage='Undo and Redo native named-size catalog'
 await rpc({op:'undo'})
 status=await rpc({op:'grade-run-status'})
 assert.equal(status.persistedInProject,false)
 await rpc({op:'redo'})
 status=await rpc({op:'grade-run-status'})
 assert.equal(status.catalog.schemaVersion,2)
 assert.equal(status.catalog.sizeCorrespondence.US12,'8')
 const after=(await rpc({op:'save'})).project
 assert.equal(after.grade_run.schemaVersion,2)
 const panelAfter=after.grade_run.gradedTemplates[3].panels.find(p=>p.id===panel.id)
 assert(Math.abs(panelAfter.polygon.points[1][0]-panel.polygon.points[1][0]-.008)<1e-8)
 const recovered=recover(snapshot,{revision:snapshot.revision,persistedInProject:true,catalog:status.catalog})
 assert.equal(recovered.ok,true,recovered.reason)
 stage='reopen persisted native named sizes'
 await rpc({op:'open',project:after})
 status=await rpc({op:'grade-run-status'})
 assert.equal(status.persistedInProject,true)
 assert.equal(status.catalog.sizeCorrespondence.US12,'8')
 stage='activate alias and return to original base garment'
 const source=structuredClone(snapshot.template)
 const fitted=await rpc({op:'grade-run-activate',size:'US12'})
 assert.equal(fitted.activeGradedSize,'US12')
 assert.equal(fitted.gradedFitEvidence.nativeMeshCompiled,true)
 await rpc({op:'grade-run-restore'})
 assert.deepEqual(snapshot.template,source)
 console.log(JSON.stringify({passed:true,stage:'all',sizes,aliases:status.catalog.sizeCorrespondence,
  observedCommitRevision:committed,undoRedo:true,saveReopen:true,physicalGradeShiftMm:8,
  manufacturingApproved:false,cuttingAuthorized:false,disposable:directory}))
}finally{
 try{await workspace.close?.()}catch{}
}
