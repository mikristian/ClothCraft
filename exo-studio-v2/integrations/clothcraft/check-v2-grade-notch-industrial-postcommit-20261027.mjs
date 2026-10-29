// Independent compiled-Rust six-size Grade Notch postcommit acceptance.
// Uses only disposable native fitting-project files and actual CUT/STITCH RPCs.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const sizes=['XS','S','M','L','XL','XXL']
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'exo-grade-notch-postcommit-'))
const workspace=createWorkspace(directory)
let state,stage='open native T-shirt',checks=[]
const clone=structuredClone
const send=async request=>{
 const response=await workspace.request({revision:state?.revision,...request})
 assert.equal(response.ok,true,`${stage}: ${request.op}: ${response.error||'Rust rejected'}`)
 if(response.data?.template)state=response.data
 return response.data
}
const panel=(template,id)=>{
 const p=template.panels.find(x=>x.id===id)
 assert(p,`Missing native panel ${id}`)
 return p
}
const close=(a,b,label,tolerance=1e-8)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,
 `${label}: ${a} != ${b}`)
const reject=async (request,pattern)=>{
 const before=clone((await send({op:'save'})).project),revision=state.revision
 const response=await workspace.request({revision,...request})
 assert.equal(response.ok,false,`${stage}: invalid ${request.op} accepted`)
 if(pattern)assert.match(String(response.error),pattern)
 await send({op:'snapshot'})
 assert.equal(state.revision,revision,`${stage}: rejection advanced revision`)
 assert.deepEqual((await send({op:'save'})).project,before,`${stage}: rejection mutated persisted document`)
 return response.error
}
const mark=(template,id,edge,t,depth)=>{
 const marks=panel(template,id).polygon.notches?.[edge]||[]
 const matches=marks.filter(n=>Math.abs(n.t-t)<1e-10)
 assert.equal(matches.length,1,`Exactly one authored physical notch required at ${edge}:${t}`)
 close(matches[0].depth_m,depth,'native authored notch depth')
}
const prove=async (id,edge,t,depth,expected)=>{
 const saved=(await send({op:'save'})).project
 const cut=await send({op:'grade-run-cutlines'})
 const sew=await send({op:'grade-run-sewing-balance-audit'})
 assert.equal(cut.format,'exo-native-graded-cutlines.v1')
 assert.equal(sew.format,'exo-native-six-size-sewn-balance-audit.v1')
 assert.equal(cut.manufacturerReady,false)
 assert.equal(cut.cuttingAuthorized,false)
 assert.equal(sew.factoryApproved,false)
 assert.deepEqual(cut.sizes.map(x=>x.size),sizes)
 assert.deepEqual(sew.sizes.map(x=>x.size),sizes)
 assert.equal(saved.grade_run.gradedTemplates.length,6)
 mark(saved.template,id,edge,t,depth)
 assert.deepEqual(saved.grade_run.baseTemplate,saved.template)
 let physicalCount=0,seamsAudited=0
 for(let i=0;i<6;i++){
  const name=sizes[i],template=saved.grade_run.gradedTemplates[i]
  mark(template,id,edge,t,depth)
  const packet=cut.sizes[i].panels.find(x=>x.panel_id===id)
  assert(packet?.cut,`${name}: native Rust physical CUT missing`)
  const physical=packet.cut.notches.filter(n=>n.edge_id===edge&&Math.abs(n.t-t)<1e-9)
  assert.equal(physical.length,1,`${name}: expected one physical CUT mark on ${edge}`)
  close(physical[0].depth_m,depth,`${name}: physical CUT depth`)
  close(Math.hypot(physical[0].cut_start[0]-physical[0].inner_end[0],
   physical[0].cut_start[1]-physical[0].inner_end[1]),depth,`${name}: CUT notch distance`)
  const cutEdge=packet.cut.edges.find(e=>e.name===edge)
  assert(cutEdge,`${name}: named CUT edge absent`)
  close(cutEdge.allowance_m,.01,`${name}: physical allowance`)
  assert(packet.cut.area_m2>0&&packet.cut.perimeter_m>0)
  const audit=sew.sizes[i]
  assert.equal(audit.seams.length,expected,`${name}: sewn relationship count`)
  for(const seam of audit.seams){
   assert.equal(seam.requiresEaseReview,false,`${name}: seam requires ease review`)
   close(seam.mismatchM,0,`${name}: seam balance`,1e-6)
   for(const [j,interval] of seam.notchIntervalLengthsM.entries())
    close(interval[0],interval[1],`${name}: physical sewn interval ${j}`,1e-6)
   seamsAudited++
  }
  physicalCount++
 }
 assert.equal(physicalCount,6)
 return {saved,cut,sew,physicalCount,seamsAudited}
}

try{
 await send({op:'open',preset:'tshirt'})
 const original=new Set(state.template.panels.map(x=>x.id))
 const fabric=state.template.fabrics[0].id
 // Keep the actual native T-shirt seams and material pieces; add two real
 // equally sized Rust-authored pieces for an independent zero-ease seam audit.
 for(let i=0;i<2;i++)await send({op:'edit',command:{kind:'Polygon',fabric,
  points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
 const extras=state.template.panels.filter(x=>!original.has(x.id))
 assert.equal(extras.length,2)
 const [a,b]=extras
 const ref=p=>({panel:p.id,side:'top',edge:p.polygon.edges[0],range:[0,1]})
 stage='native sewn fixture'
 const stitched=await workspace.request({revision:state.revision,op:'edit',command:{kind:'Sew',
  a:ref(a),b:ref(b),reverse:true,ease:false}})
 assert.equal(stitched.ok,true,`Rust failed actual native Sew fixture: ${stitched.error}`)
 state=stitched.data
 const paired=state.template.seams.find(s=>s.a.panel===a.id&&s.b.panel===b.id)
 assert(paired,'Native Rust seam missing after sew')
 const prepared=(await send({op:'save'})).project
 for(const p of prepared.template.panels){
  assert(p.polygon,`T-shirt panel ${p.id} is not a native polygon`)
  p.polygon.seam_allowances=Object.fromEntries(p.polygon.edges.map(e=>[e,.01]))
 }
 prepared.state=null;prepared.mesh_signature=null
 await send({op:'open',project:prepared})
 const base=clone(state.template),offs=[-.015,-.007,0,.005,.010,.014]
 // The native compiler enforces declared source bounds during postcommit.
 // Allocate safe room for the entire six-size material grading envelope.
 for(const selected of [a.id,b.id]){
  const selectedPanel=panel(base,selected)
  selectedPanel.pattern.width=.45
  selectedPanel.pattern.height=.38
 }
 await send({op:'open',project:{...(await send({op:'save'})).project,
  template:base,state:null,mesh_signature:null}})
 const id=a.id,edge=panel(base,id).polygon.edges[1]
 const originalSeams=base.seams.length
 stage='commit six graded material sizes'
 const graded=sizes.map((size,i)=>{
  const next=clone(base)
  // Propagate the same material shift to sewn parts, leaving their paired
  // seam edge geometry unchanged and preserving the actual T-shirt patterns.
  for(const selected of [a.id,b.id]){
   const poly=panel(next,selected).polygon
   poly.points[1][0]+=offs[i]
   poly.points[2][0]+=offs[i]
  }
  return next
 })
 await send({op:'grade-run-commit',gradeRun:{schemaVersion:1,sizes,baseSize:'M',
  baseTemplate:clone(base),gradedTemplates:graded,pomSpecs:[]}})
 const before=(await send({op:'save'})).project
 const revision=state.revision
 const notch={panelId:id,edgeId:edge,t:.4,depthMm:4}
 stage='commit one actual physical notch across Rust material sizes'
 const committed=await send({op:'grade-notch-commit',...notch})
 assert.equal(committed.gradeNotchCommitted,true)
 assert.equal(committed.revision,revision+1)
 assert.equal(committed.gradeNotchReceipt.panelId,id)
 assert.deepEqual(committed.gradeNotchReceipt.sizes,sizes)
 assert.equal(committed.gradeNotchReceipt.manufacturingApproved,false)
 const receipt=await prove(id,edge,.4,.004,originalSeams)
 assert.equal((await send({op:'save'})).project.grade_run.baseTemplate.panels.length,base.panels.length)
 checks.push('Physical Grade Notch committed atomically in source plus six material-size templates; six actual Rust CUT marks have 4mm geometry and 10mm allowance')
 checks.push(`${receipt.seamsAudited} real Rust native sewing-balance observations across six graded T-shirt assemblies`)

 stage='reject duplicate station and invalid bounds without mutation'
 const rejected={}
 rejected.duplicate=await reject({op:'grade-notch-commit',...notch},/duplicate/i)
 rejected.tZero=await reject({op:'grade-notch-commit',...notch,t:0},/interior|valid/i)
 rejected.tOne=await reject({op:'grade-notch-commit',...notch,t:1},/interior|valid/i)
 rejected.tNan=await reject({op:'grade-notch-commit',...notch,t:null},/invalid|number|field|type/i)
 rejected.depthZero=await reject({op:'grade-notch-commit',...notch,depthMm:0},/depth|valid/i)
 rejected.depthTooDeep=await reject({op:'grade-notch-commit',...notch,depthMm:26},/depth|valid/i)
 rejected.stale=await reject({op:'grade-notch-commit',...notch,revision},/stale|revision/i)
 checks.push('Seven invalid native requests rejected with exact project and revision unchanged')

 stage='linked undo and redo physical Grade Notch'
 const after=clone((await send({op:'save'})).project)
 await send({op:'undo'})
 assert.deepEqual((await send({op:'save'})).project.template,before.template)
 assert.deepEqual((await send({op:'save'})).project.grade_run,before.grade_run)
 await send({op:'redo'})
 assert.deepEqual((await send({op:'save'})).project.template,after.template)
 assert.deepEqual((await send({op:'save'})).project.grade_run,after.grade_run)
 await prove(id,edge,.4,.004,originalSeams)
 checks.push('Linked Undo/Redo restores complete source and all six native graded physical notch records')

 stage='save and reopen native project'
 const persisted=(await send({op:'save'})).project
 await send({op:'open',project:persisted})
 assert.deepEqual((await send({op:'save'})).project.template,persisted.template)
 assert.deepEqual((await send({op:'save'})).project.grade_run,persisted.grade_run)
 const reopened=await prove(id,edge,.4,.004,originalSeams)
 assert.deepEqual(reopened.cut.sizes,receipt.cut.sizes)
 assert.deepEqual(reopened.sew.sizes,receipt.sew.sizes)
 checks.push('Save/reopen recompiled same physical native CUT notches and zero-ease seam audits')
 console.log(JSON.stringify({passed:true,nativeRust:true,disposable:true,
  fixture:'real native sewn T-shirt plus two native sewn geometry panels',sizes,
  sourceRevision:revision,committedRevision:revision+1,physicalMarks:reopened.physicalCount,
  nativeSewnObservations:reopened.seamsAudited,invalidRequests:Object.keys(rejected),
  checks,manufacturerReady:false,cuttingAuthorized:false,licensedVendorCADAccepted:false},null,2))
}catch(error){
 console.error(JSON.stringify({passed:false,nativeRust:true,disposable:true,stage,
  reason:error?.stack||String(error),checks,manufacturerReady:false},null,2))
 process.exitCode=1
}finally{workspace.close();fs.rmSync(directory,{recursive:true,force:true})}
