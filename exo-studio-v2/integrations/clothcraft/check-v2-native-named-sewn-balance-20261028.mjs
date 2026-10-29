// Independent disposable native read-only sewn balance, all 4 named sizes.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-named-sewn-'))
const workspace=createWorkspace(root)
let state,stage='setup'
const send=async command=>{
 const reply=await workspace.request({revision:state?.revision,...command})
 assert.equal(reply.ok,true,`${stage}/${command.op}: ${reply.error}`)
 if(reply.data?.template)state=reply.data
 return reply.data
}
const fail=async gradeRun=>{
 const previous=(await send({op:'save'})).project,revision=state.revision
 const reply=await workspace.request({op:'grade-run-commit',revision,gradeRun})
 assert.equal(reply.ok,false,'Invalid native sewn catalog was committed')
 assert.equal((await send({op:'snapshot'})).revision,revision)
 assert.deepEqual((await send({op:'save'})).project,previous)
}
try{
 await send({op:'open',preset:'tshirt'})
 for(const seam of [...state.template.seams])await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
 const prior=new Set(state.template.panels.map(p=>p.id))
 for(let i=0;i<2;i++)await send({op:'edit',command:{kind:'Polygon',fabric:state.template.fabrics[0].id,
  points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
 const ids=state.template.panels.filter(p=>!prior.has(p.id)).map(p=>p.id)
 assert.equal(ids.length,2)
 const row=id=>state.template.panels.find(p=>p.id===id)
 const ref=id=>({panel:id,side:'top',edge:row(id).polygon.edges[0],range:[0,1]})
 await send({op:'edit',command:{kind:'Sew',a:ref(ids[0]),b:ref(ids[1]),reverse:true,ease:false}})
 const original=(await send({op:'save'})).project
 const seam=original.template.seams.find(s=>s.a.panel===ids[0]&&s.b.panel===ids[1])
 assert(seam)
 for(const panel of original.template.panels){
  const poly=panel.polygon
  poly.seam_allowances=Object.fromEntries(poly.edges.map(edge=>[edge,.01]))
 }
 for(const id of ids){
  const poly=original.template.panels.find(p=>p.id===id).polygon
  poly.notches={[poly.edges[0]]:[{t:.25,depth_m:.004},{t:.75,depth_m:.004}]}
 }
 original.template.seams.find(s=>s.id===seam.id).notches=[[.25,.25],[.75,.75]]
 original.state=null;original.mesh_signature=null
 await send({op:'open',project:original})
 const base=structuredClone(state.template)
 const sizes=['2','4','6','8'],offsets=[-.008,-.003,0,.009]
 const gradeRun={schemaVersion:2,sizes,baseSize:'6',baseTemplate:base,
  gradedTemplates:sizes.map((size,index)=>{
   const t=structuredClone(base)
   for(const id of ids){
    const poly=t.panels.find(p=>p.id===id).polygon
    poly.points[1][0]+=offsets[index]
   }
   return t
  }),sizeCorrespondence:{US12:'8'},pomSpecs:[]}
 stage='native negative corrupt notch/allowance per size'
 const bad=structuredClone(gradeRun)
 bad.gradedTemplates[3].panels.find(p=>p.id===ids[0]).polygon.notches={}
 await fail(bad)
 const wrong=structuredClone(gradeRun)
 wrong.gradedTemplates[2].panels.find(p=>p.id===ids[0]).polygon.seam_allowances={}
 await fail(wrong)
 stage='commit and measure four named sizes'
 await send({op:'grade-run-commit',gradeRun})
 const audit=await send({op:'grade-run-sewing-balance-audit'})
 assert.equal(audit.format,'exo-native-named-size-sewn-balance-audit.v2')
 assert.deepEqual(audit.sizes.map(x=>x.size),sizes)
 assert.equal(audit.easeReviewRequired,false)
 assert.equal(audit.factoryApproved,false)
 for(const size of audit.sizes){
  const pair=size.seams.find(s=>s.seamId===seam.id)
  assert(pair)
  assert(Math.abs(pair.mismatchM)<1e-7)
  assert.equal(pair.requiresEaseReview,false)
  assert.equal(pair.notchIntervalLengthsM.length,3)
  assert(pair.notchIntervalLengthsM.every(([a,b])=>Math.abs(a-b)<1e-7))
 }
 const source=await send({op:'save'})
 await send({op:'open',project:source.project})
 const reopened=await send({op:'grade-run-sewing-balance-audit'})
 assert.deepEqual(reopened.sizes,audit.sizes)
 console.log(JSON.stringify({passed:true,sizes,balancedSeams:4,
  pairedIntervals:12,reopen:true,malformedNotchesRejected:true,allowanceLossRejected:true,
  cuttingAuthorized:false,factoryApproved:false}))
}finally{workspace.close()}
