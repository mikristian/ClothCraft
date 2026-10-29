// Disposable native Rust QA: run actual source-contour measurements, then
// verify transactional notch, allowance, undo/redo and reopen without touching
// installed production apps or user-authored garments.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {existsSync,mkdtempSync} from 'node:fs'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(bin)&&existsSync(avatar),'Build the Rust session and retain the local test avatar first')
const dir=mkdtempSync(path.join(tmpdir(),'exo-rust-pattern-qa-'))
const child=spawn(bin,[avatar,path.join(dir,'garment.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
let waiting
let diagnostics=''
child.stderr.on('data',chunk=>{diagnostics+=chunk})
createInterface({input:child.stdout}).on('line',text=>{
 const done=waiting;waiting=null
 if(done)done(JSON.parse(text))
})
async function rpc(payload){
 assert(!waiting,'Only one Rust RPC is allowed at a time')
 return await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{waiting=null;reject(Error('Timed out '+payload.op+' '+diagnostics.slice(-500)))},30000)
  waiting=response=>{
   clearTimeout(timeout)
   if(!response.ok)reject(Error(response.error))
   else resolve(response.data)
  }
  child.stdin.write(JSON.stringify(payload)+'\n')
 })
}
const approx=(actual,target,tolerance=0.001)=>assert(Math.abs(actual-target)<tolerance,`${actual} != ${target}`)
try{
 let state=await rpc({op:'open',preset:'tshirt'})
 const first=await rpc({op:'pattern-audit',revision:state.revision})
 assert.equal(first.format,'exo-native-pattern-audit.v1')
 assert.equal(first.revision,state.revision)
 assert.equal(first.manufacturerReady,false)
 assert(first.releaseBlockers.length>=3)
 assert.equal(first.panelCount,state.template.panels.length)
 const original=state.revision
 const fabric=state.template.fabrics[0].id
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.1],origin:[0,0],fabric}})
 const panel=state.template.panels.at(-1)
 const edge=panel.polygon.edges[0]
 let qa=await rpc({op:'pattern-audit',revision:state.revision})
 let report=qa.panels.find(p=>p.panelId===panel.id)
 assert(report?.editable)
 approx(report.widthMm,200)
 approx(report.heightMm,100)
 approx(report.areaMm2,20000)
 approx(report.edges.find(e=>e.edgeId===edge).lengthMm,200)
 assert(report.missingAllowanceEdges>0)
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Notch',panel:panel.id,edge,t:0.25,depth_m:.004}})
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.01}})
 qa=await rpc({op:'pattern-audit',revision:state.revision})
 report=qa.panels.find(p=>p.panelId===panel.id)
 assert.equal(report.notchCount,1)
 approx(report.edges.find(e=>e.edgeId===edge).allowanceMm,10)
 state=await rpc({op:'undo',revision:state.revision})
 qa=await rpc({op:'pattern-audit',revision:state.revision})
 assert.equal(qa.panels.find(p=>p.panelId===panel.id).allowanceEdgeCount,0)
 state=await rpc({op:'redo',revision:state.revision})
 const saved=await rpc({op:'save'})
 state=await rpc({op:'open',project:saved.project})
 qa=await rpc({op:'pattern-audit',revision:state.revision})
 report=qa.panels.find(p=>p.panelId===panel.id)
 assert.equal(report.notchCount,1)
 approx(report.edges.find(e=>e.edgeId===edge).allowanceMm,10)
 assert.equal(qa.manufacturerReady,false)
 // Complete Rust native authoring path: a sewn-edge-compatible Bézier is
 // affinely graded with its actual control handles, not just endpoint pixels.
 const source=state.template.panels.find(p=>p.id===panel.id).polygon
 const points=source.points
 const a=points[0],b=points[1]
 const tangent=[b[0]-a[0],b[1]-a[1]]
 const normal=[-tangent[1],tangent[0]]
 const control=(t)=>[a[0]+tangent[0]*t+normal[0]*.08,a[1]+tangent[1]*t+normal[1]*.08]
 const curved={...source,curves:{...source.curves,[edge]:[control(1/3),control(2/3)]}}
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Shape',panel:panel.id,polygon:curved}})
 const beforeControls=state.template.panels.find(p=>p.id===panel.id).polygon.curves[edge]
 state=await rpc({op:'grade-pattern',revision:state.revision,panel:panel.id,width_delta_mm:20,height_delta_mm:10})
 const graded=state.template.panels.find(p=>p.id===panel.id).polygon
 assert(graded.curves[edge].some((point,i)=>point.some((n,k)=>Math.abs(n-beforeControls[i][k])>1e-6)))
 assert.deepEqual(graded.edges,source.edges)
 assert.equal(graded.notches[edge][0].depth_m,.004)
 assert.equal(graded.seam_allowances[edge],.01)
 qa=await rpc({op:'pattern-audit',revision:state.revision})
 report=qa.panels.find(p=>p.panelId===panel.id)
 assert(report.edges.find(e=>e.edgeId===edge).curve)
 approx(report.widthMm,220)
 approx(report.heightMm,110)
 await assert.rejects(()=>rpc({op:'pattern-audit',revision:state.revision+1}),/Stale document revision/)
 console.log(JSON.stringify({pass:true,originalRevision:original,measuredPanel:panel.id,originalDimensionsMm:[200,100],gradedCurvedDimensionsMm:[report.widthMm,report.heightMm],notches:report.notchCount,allowanceMm:10,nativeBézierGrade:true,undo:true,redo:true,saveReload:true,manufacturerReady:qa.manufacturerReady,releaseBlockers:qa.releaseBlockers.length},null,2))
} finally {
 child.stdin.end()
 if(child.exitCode===null)child.kill('SIGTERM')
}
