import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from '../../integrations/clothcraft/workspace.mjs'
import {planOptitexNativeGradeNotch20261027,verifyOptitexNativeGradeNotch20261027} from './optitexNativeGradeNotch20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const template=()=>({panels:[{id:'front',polygon:{points:[[0,0],[1,0],[1,1],[0,1]],edges:['top','right','bottom','left'],notches:{top:[{t:.2,depth_m:.005}]}}}]})
const project=()=>{const base=template();return {template:base,grade_run:{schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(base),gradedTemplates:sizes.map(()=>template())}}}
const args=p=>({project:p,sourceRevision:8,sourceSnapshot:{revision:8,template:structuredClone(p.template)},panelId:'front',edgeId:'top',t:.45,depthMm:5})

test('plans real Rust Notch command with physical depth and intact six-size provenance',()=>{
 const p=project(),before=structuredClone(p),result=planOptitexNativeGradeNotch20261027(args(p))
 assert.equal(result.ok,true)
 assert.deepEqual(result.command,{kind:'Notch',panel:'front',edge:'top',t:.45,depth_m:.005})
 assert.deepEqual(result.preflight.map(x=>x.size),sizes)
 assert.equal(result.nativeCommitted,false)
 assert.deepEqual(p,before,'preflight must not mutate native saved project')
})
test('blocks stale revisions, mismatched source and existing notch collisions in any grade',()=>{
 const p=project()
 assert.equal(planOptitexNativeGradeNotch20261027({...args(p),sourceRevision:7}).ok,false)
 p.grade_run.gradedTemplates[4].panels[0].polygon.notches.top.push({t:.45,depth_m:.004})
 assert.match(planOptitexNativeGradeNotch20261027(args(p)).reason,/XL/)
 p.grade_run.gradedTemplates[4]=template()
 p.grade_run.baseTemplate={panels:[]}
 assert.equal(planOptitexNativeGradeNotch20261027(args(p)).ok,false)
})
test('cannot claim saved all-size change until native revision advances and each size contains a notch',()=>{
 const p=project(),plan=planOptitexNativeGradeNotch20261027(args(p))
 assert.equal(verifyOptitexNativeGradeNotch20261027({plan,project:p,afterRevision:8,afterSnapshot:{revision:8,template:p.template}}).ok,false)
 assert.equal(verifyOptitexNativeGradeNotch20261027({plan,project:p,afterRevision:9,afterSnapshot:{revision:9,template:p.template}}).ok,false)
 p.template.panels[0].polygon.notches.top.push({t:.45,depth_m:.005})
 p.grade_run.baseTemplate=structuredClone(p.template)
 for(const grade of p.grade_run.gradedTemplates)grade.panels[0].polygon.notches.top.push({t:.45,depth_m:.005})
 const verify=()=>verifyOptitexNativeGradeNotch20261027({plan,project:p,afterRevision:9,afterSnapshot:{revision:9,template:structuredClone(p.template)}})
 assert.equal(verify().nativeCommitted,true)
 p.grade_run.gradedTemplates[0].panels[0].polygon.notches.top[1].depth_m=.006
 assert.match(verify().reason,/XS/)
})

test('real Rust save has no revision and ordinary Notch edit leaves catalog needing regeneration',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-optitex-notch-native-'))
 const workspace=createWorkspace(dir)
 let state
 const send=async data=>{
  const response=await workspace.request({...data,revision:state?.revision})
  assert.equal(response.ok,true,`${data.op}: ${response.error}`)
  if(response.data?.template)state=response.data
  return response.data
 }
 try{
  await send({op:'open',preset:'tshirt'})
  const pattern=state.template.panels.find(p=>p.polygon?.edges?.length)
  assert(pattern,'native pattern with a named boundary required')
  const original=structuredClone(state.template)
  await send({op:'grade-run-commit',gradeRun:{schemaVersion:1,sizes,baseSize:'M',
   baseTemplate:original,gradedTemplates:sizes.map(()=>structuredClone(original)),pomSpecs:[]}})
  const saved=(await send({op:'save'})).project
  assert.equal(saved.revision,undefined,'native FittingProject does not store revision')
  const initial=state.revision
  const chosen=pattern.polygon.edges[0]
  const p=planOptitexNativeGradeNotch20261027({project:saved,sourceRevision:initial,
   sourceSnapshot:state,panelId:pattern.id,edgeId:chosen,t:.43,depthMm:3})
  assert.equal(p.ok,true,p.reason)
  await send({op:'edit',command:p.command})
  assert.equal(state.revision,initial+1)
  const edited=(await send({op:'save'})).project
  assert.equal(edited.revision,undefined)
  assert.equal(verifyOptitexNativeGradeNotch20261027({plan:p,project:edited,
   afterRevision:state.revision,afterSnapshot:state}).ok,false,
   'ordinary native edit cannot be called a verified all-size transaction')
  const candidate=structuredClone(state.template)
  const recommit=await workspace.request({op:'grade-run-commit',revision:state.revision,
   gradeRun:{schemaVersion:1,sizes,baseSize:'M',baseTemplate:candidate,
    gradedTemplates:sizes.map(()=>structuredClone(candidate)),pomSpecs:[]}})
  assert.equal(recommit.ok,true,`Recommit after native notch edit: ${recommit.error}`)
  if(recommit.data?.template)state=recommit.data
  const final=(await send({op:'save'})).project
  assert.equal(verifyOptitexNativeGradeNotch20261027({plan:p,project:final,
   afterRevision:state.revision,afterSnapshot:state}).ok,true,
   'real native saved six-size recommit must verify exact notch in every size')
 }finally{workspace.close();fs.rmSync(dir,{recursive:true,force:true})}
})

test('real Rust grade-notch-commit is a single linked saved six-size transaction with Undo/Redo',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-notch-atomic-rust-'))
 const w=createWorkspace(dir)
 let state
 const send=async payload=>{
  const result=await w.request({...payload,revision:state?.revision})
  assert.equal(result.ok,true,`${payload.op}: ${result.error}`)
  if(result.data?.template)state=result.data
  return result.data
 }
 try{
  await send({op:'open',preset:'tshirt'})
  const pattern=state.template.panels.find(p=>p.polygon?.edges?.length)
  const edgeId=pattern.polygon.edges[0]
  const source=structuredClone(state.template)
  await send({op:'grade-run-commit',gradeRun:{schemaVersion:1,sizes,baseSize:'M',
   baseTemplate:source,gradedTemplates:sizes.map(()=>structuredClone(source)),pomSpecs:[]}})
  const before=state.revision
  const invalid=await w.request({op:'grade-notch-commit',revision:before,
   panelId:pattern.id,edgeId,t:0,depthMm:2})
  assert.equal(invalid.ok,false)
  assert.equal((await send({op:'snapshot'})).revision,before)
  const result=await send({op:'grade-notch-commit',panelId:pattern.id,edgeId,t:.43,depthMm:2})
  assert.equal(result.gradeNotchCommitted,true)
  assert.equal(result.revision,before+1)
  state={...state,revision:result.revision}
  await send({op:'snapshot'})
  const saved=(await send({op:'save'})).project
  assert.equal(saved.revision,undefined)
  assert.equal(saved.grade_run.gradedTemplates.length,6)
  for(const tpl of [saved.template,...saved.grade_run.gradedTemplates]){
   const poly=tpl.panels.find(p=>p.id===pattern.id).polygon
   assert(poly.notches[edgeId].some(n=>n.t===.43&&n.depth_m===.002))
  }
  await send({op:'undo'})
  const undone=(await send({op:'save'})).project
  assert(!undone.template.panels.find(p=>p.id===pattern.id).polygon.notches?.[edgeId]?.some(n=>n.t===.43))
  assert(undone.grade_run)
  await send({op:'redo'})
  const redone=(await send({op:'save'})).project
  assert(redone.grade_run.gradedTemplates.every(tpl=>
   tpl.panels.find(p=>p.id===pattern.id).polygon.notches[edgeId]?.some(n=>n.t===.43)))
 }finally{w.close();fs.rmSync(dir,{recursive:true,force:true})}
})
