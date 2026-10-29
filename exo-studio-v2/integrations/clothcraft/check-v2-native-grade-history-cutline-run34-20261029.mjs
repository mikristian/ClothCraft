/** Isolated compiled-Rust grading table payload acceptance; browser routing must be separately exercised. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'exo-grade-table-rust-'))
const workspace=createWorkspace(directory)
let current
const request=async packet=>{
 const reply=await workspace.request({revision:current?.revision,...packet})
 assert.equal(reply.ok,true,`${packet.op}: ${reply.error||'native Rust rejection'}`)
 if(reply.data?.template)current=reply.data
 return reply.data
}
const save=async()=>(await request({op:'save'})).project
const cut=async()=>await request({op:'grade-run-cutlines'})
const physicalCut=packet=>packet.sizes
const reject=async packet=>{
 const before=await save(),revision=current.revision
 const reply=await workspace.request({revision,...packet})
 assert.equal(reply.ok,false,`${packet.op} accepted invalid data`)
 await request({op:'snapshot'})
 assert.equal(current.revision,revision,'Rejected command advanced Rust revision')
 assert.deepEqual(await save(),before,'Rejected command changed native persisted project')
 return reply.error
}
try{
 await request({op:'open',preset:'tshirt'})
 for(const piece of [...current.template.panels])for(const edge of piece.polygon.edges)
  await request({op:'edit',command:{kind:'SeamAllowance',panel:piece.id,edge,width_m:.012}})
 const panel=current.template.panels[0]
 let rules=createAccuMarkNativeRuleSet(current,{sizes:['XS','S','M','L','XL','XXL'],baseSize:'M'})
 assert(rules.ok,rules.reason)
 for(const [size,dx] of [['XS',-5],['S',-3],['L',2],['XL',4],['XXL',6]]){
  const changed=editAccuMarkNativePointRule(current,rules.ruleSet,{panelId:panel.id,
   pointIndex:1,size,dxMm:dx,dyMm:0})
  assert(changed.ok,changed.reason);rules=changed
 }
 const source=await save()
 const prepared=prepareNativeGradeCatalog20261025(current,source,rules.ruleSet)
 assert(prepared.ok,prepared.reason)
 await request({op:'grade-run-commit',gradeRun:prepared.gradeRun})
 const committed=await save(),committedCut=await cut()
 assert.deepEqual(committed.grade_run.sizes,['XS','S','M','L','XL','XXL'])
 assert.deepEqual(committedCut.sizes.map(x=>x.size),committed.grade_run.sizes)
 const baseX=committed.template.panels[0].polygon.points[1][0]
 for(const [i,size] of committed.grade_run.sizes.entries()){
  const graded=committed.grade_run.gradedTemplates[i].panels.find(p=>p.id===panel.id)
  assert(graded,`Missing graded panel for ${size}`)
  const expected={XS:-5,S:-3,M:0,L:2,XL:4,XXL:6}[size]
  assert(Math.abs((graded.polygon.points[1][0]-baseX)*1000-expected)<1e-7,`Wrong persisted ${size} grading cell`)
  assert(committedCut.sizes[i].panels.some(p=>p.panel_id===panel.id&&p.cut?.area_m2>0),`No real physical ${size} CUT`)
 }
 const bad=structuredClone(committed.grade_run)
 bad.gradedTemplates[5].panels.find(p=>p.id===panel.id).polygon.points[1][0]=null
 const malformedReason=await reject({op:'grade-run-commit',gradeRun:bad})
 const staleReason=await reject({op:'grade-run-commit',revision:current.revision+1,gradeRun:committed.grade_run})
 await request({op:'undo'})
 const undoneStatus=await request({op:'grade-run-status'})
 assert.equal(undoneStatus.persistedInProject,false,'Undo retained active native grading catalog')
 assert.equal(Boolean((await save()).grade_run),false,'Undo retained persisted grading data')
 await request({op:'redo'})
 assert.deepEqual((await save()).grade_run,committed.grade_run,'Redo failed to restore point offsets')
 assert.deepEqual(physicalCut(await cut()),physicalCut(committedCut),'Redo changed physical graded CUT')
 await request({op:'open',project:committed})
 assert.deepEqual((await save()).grade_run,committed.grade_run,'Reopen lost grade point offsets')
 assert.deepEqual(physicalCut(await cut()),physicalCut(committedCut),'Reopen lost physical graded CUT')
 console.log(JSON.stringify({passed:true,realCompiledRust:true,gradedSizes:6,
  persistedPointOffsetsMm:[-5,-3,0,2,4,6],malformedRejected:true,staleRejected:true,
  malformedReason,staleReason,undoRedo:true,saveReopen:true,realCutlines:true,
  browserUiRouteVerified:false,externalCadCertified:false,factoryApproved:false}))
}finally{
 workspace.close()
 fs.rmSync(directory,{recursive:true,force:true})
}
