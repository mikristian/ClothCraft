// Executable compiled Rust F7 canonical-size addition, not merely aliasing.
// This fixture is internal EXO evidence, not G27 independent/vendor acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {applyModarisF7SizeEvolution20261028} from '../../src/core/modarisF7SizeEvolution20261028.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {commitNativeGradeCanonicalSizeTransaction20261028} from '../../src/core/nativeGradeCanonicalSizeTransaction20261028.js'

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'exo-f7-canonical-native-'))
const workspace=createWorkspace(temporary)
let current
const request=async payload=>{
 const response=await workspace.request({revision:current?.revision,...payload})
 assert.equal(response.ok,true,`${payload.op}: ${response.error||'Rust refused request'}`)
 if(response.data?.template)current=response.data
 return response.data
}
const saved=async()=>(await request({op:'save'})).project
try{
 await request({op:'open',preset:'tshirt'})
 const old=new Set(current.template.panels.map(p=>p.id))
 await request({op:'edit',command:{kind:'Polygon',fabric:current.template.fabrics[0].id,
  points:[[.55,.1],[.83,.1],[.88,.34],[.52,.34]]}})
 const extra=current.template.panels.find(p=>!old.has(p.id))
 assert(extra,'Native Rust failed to author third pattern piece')
 const source=await saved()
 let rules=createAccuMarkNativeRuleSet(current,{sizes:['2','4','6','8'],baseSize:'6'})
 assert(rules.ok,rules.reason)
 for(const [size,dx] of [['2',-3],['4',-1],['8',4]]){
  const next=editAccuMarkNativePointRule(current,rules.ruleSet,{panelId:extra.id,
   pointIndex:1,size,dxMm:dx,dyMm:0})
  assert(next.ok,next.reason);rules=next
 }
 const prepared=prepareNativeGradeCatalog20261025(current,source,rules.ruleSet)
 assert(prepared.ok,prepared.reason)
 await request({op:'grade-run-commit',gradeRun:prepared.gradeRun})
 current=await request({op:'snapshot'})
 const before=current,previous=await saved()
 assert.deepEqual(previous.grade_run.sizes,['2','4','6','8'])
 const evolved=applyModarisF7SizeEvolution20261028(before,rules.ruleSet,
  {action:'add-size-to-product',name:'10'})
 assert(evolved.ok,evolved.reason)
 assert.deepEqual(evolved.ruleSet.sizes,['2','4','6','8','10'])
 assert.deepEqual(evolved.ruleSet.panels[extra.id].pointOffsetsMm['10'][1],[8,0])
 const committed=await commitNativeGradeCanonicalSizeTransaction20261028({
  snapshot:before,expectedRevision:before.revision,ruleSet:evolved.ruleSet,request})
 assert(committed.ok,committed.reason)
 assert.equal(committed.revision,before.revision+1)
 assert.deepEqual(committed.sizes,['2','4','6','8','10'])
 const after=await saved()
 assert.deepEqual(after.template,previous.template)
 assert.deepEqual(after.template.seams,previous.template.seams)
 assert.equal(after.grade_run.gradedTemplates.length,5)
 const base=after.template.panels.find(p=>p.id===extra.id).polygon.points[1][0]
 const fifth=after.grade_run.gradedTemplates[4].panels.find(p=>p.id===extra.id).polygon.points[1][0]
 assert(Math.abs((fifth-base)*1000-8)<1e-7,'Physical F7 point growth was not saved')
 const bad=structuredClone(after.grade_run)
 bad.gradedTemplates[4].panels.find(p=>p.id===extra.id).polygon.points[1][0]=null
 const rejected=await workspace.request({op:'grade-run-commit',revision:current.revision,gradeRun:bad})
 assert.equal(rejected.ok,false,'Rust accepted a forged canonical-size point')
 assert.deepEqual(await saved(),after,'Rejected grade changed the durable project')
 const activated=await request({op:'grade-run-activate',size:'10'})
 assert.equal(activated.activeGradedSize,'10')
 assert.deepEqual(activated.template,after.grade_run.gradedTemplates[4])
 await request({op:'grade-run-restore'})
 assert.equal(current.activeGradedSize,null)
 await request({op:'undo'})
 assert.deepEqual((await saved()).grade_run,previous.grade_run)
 await request({op:'redo'})
 assert.deepEqual((await saved()).grade_run,after.grade_run)
 await request({op:'open',project:after})
 assert.deepEqual((await saved()).grade_run,after.grade_run)
 console.log(JSON.stringify({passed:true,realRust:true,canonicalSizes:5,
  sourcePanels:3,nonuniformF7PointGrowthMm:8,
  nativeRevisionIncrement:1,invalidRejected:true,
  activatedAndRestored:true,undoRedoSaveReopen:true,
  independentReceivingCadAccepted:false,factoryApproved:false}))
}finally{
 workspace.close()
 fs.rmSync(temporary,{recursive:true,force:true})
}
