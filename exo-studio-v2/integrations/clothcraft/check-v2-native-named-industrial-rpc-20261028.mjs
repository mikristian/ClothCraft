// Disposable Rust RPC acceptance: real four-size industrial metadata and
// persisted numerical POM. CUT inspection only; never factory authorization.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-named-stations-rpc-'))
const session=createWorkspace(root)
let state,phase='open'
const rpc=async(command)=>{
 const result=await session.request({revision:state?.revision,...command})
 assert.equal(result.ok,true,`${phase}/${command.op}: ${result.error||'native rejection'}`)
 if(result.data?.template)state=result.data
 return result.data
}
const refuse=async(command)=>{
 const before=(await rpc({op:'save'})).project,revision=state.revision
 const response=await session.request({revision,...command})
 assert.equal(response.ok,false,`${phase}: unsafe native request accepted`)
 assert.equal((await rpc({op:'snapshot'})).revision,revision)
 assert.deepEqual((await rpc({op:'save'})).project,before)
}
try{
 await rpc({op:'open',preset:'tshirt'})
 for(const seam of [...state.template.seams])await rpc({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
 const old=new Set(state.template.panels.map(p=>p.id))
 await rpc({op:'edit',command:{kind:'Polygon',fabric:state.template.fabrics[0].id,
  points:[[0,0],[.4,0],[.4,.3],[0,.3]]}})
 const id=state.template.panels.find(p=>!old.has(p.id))?.id
 assert(id)
 const edge=state.template.panels.find(p=>p.id===id).polygon.edges[0]
 await rpc({op:'edit',command:{kind:'SeamAllowance',panel:id,edge,width_m:.012}})
 await rpc({op:'edit',command:{kind:'Notch',panel:id,edge,t:.25,depth_m:.004}})
 const base=structuredClone(state.template)
 const sizes=['2','4','6','8']
 const offsets=[-.009,-.005,0,.008]
 const gradeRun={schemaVersion:2,sizes,baseSize:'6',baseTemplate:base,
  gradedTemplates:sizes.map((size,index)=>{
   const copy=structuredClone(base)
   const poly=copy.panels.find(p=>p.id===id).polygon
   poly.points[1][0]+=offsets[index]
   poly.points[2][0]+=offsets[index]
   return copy
  }),sizeCorrespondence:{US12:'8'},pomSpecs:[{
   id:'front-width',label:'Measured front width',panelId:id,kind:'anchor-distance',
   toleranceMm:1,fromPoint:0,toPoint:1,
   targetsMm:Object.fromEntries(sizes.map((s,index)=>[s,400+offsets[index]*1000])),
  }]}
 phase='reject incomplete named-sized manufacturing metadata'
 const forged=structuredClone(gradeRun)
 forged.gradedTemplates[3].panels.find(p=>p.id===id).polygon.notches={}
 await refuse({op:'grade-run-commit',gradeRun:forged})
 phase='commit and inspect all four native sizes'
 await rpc({op:'grade-run-commit',gradeRun})
 const revision=state.revision
 const proof=await rpc({op:'grade-run-industrial-audit',panel:id})
 assert.equal(proof.format,'exo-native-linked-industrial-named-sizes-proof.v2')
 assert.deepEqual(proof.sizes.map(s=>s.size),sizes)
 for(const size of proof.sizes){
  const measured=size.edges.find(e=>e.edgeId===edge)
  assert(measured)
  assert.equal(measured.notches.length,1)
  assert(Math.abs(measured.notches[0].fraction-.25)<1e-9)
  assert(Math.abs(measured.notches[0].depthM-.004)<1e-9)
  assert(Math.abs(measured.allowanceM-.012)<1e-9)
 }
 assert.equal(proof.factoryApproved,false)
 const pom=await rpc({op:'grade-run-pom-audit'})
 assert.equal(pom.format,'exo-native-named-grade-pom-audit.v2')
 assert.equal(pom.sizeCount,4)
 assert.equal(pom.total,4)
 assert.equal(pom.passed,4)
 assert.equal(pom.factoryApproved,false)
 phase='stale revision industrial audit must fail without edits'
 await refuse({op:'grade-run-industrial-audit',revision:revision+1,panel:id})
 phase='durable reopen of physical inspection catalog'
 const saved=(await rpc({op:'save'})).project
 await rpc({op:'open',project:saved})
 const again=await rpc({op:'grade-run-industrial-audit',panel:id})
 assert.deepEqual(again.sizes,proof.sizes)
 const pomAgain=await rpc({op:'grade-run-pom-audit'})
 assert.deepEqual(pomAgain.rows,pom.rows)
 console.log(JSON.stringify({passed:true,sizes,industrialEdge:id,actualNotches:4,
  actualAllowances:4,pomRows:4,staleRejected:true,saveReopen:true,
  cuttingAuthorized:false,factoryApproved:false}))
}finally{session.close()}
