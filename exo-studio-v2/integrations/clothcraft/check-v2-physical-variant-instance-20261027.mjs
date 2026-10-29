// Real Rust acceptance for temporary quantity-two unsewn physical 3D instances.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-physical-variant-instance-'))
const workspace=createWorkspace(root)
const checks=[]
let snapshot
const call=async (request,{snapshotResult=true}={})=>{
 const reply=await workspace.request({revision:snapshot?.revision,...request})
 assert.equal(reply.ok,true,`${request.op}: ${reply.error??'native refusal'}`)
 if(snapshotResult&&reply.data?.template)snapshot=reply.data
 return reply.data
}
const save=async()=>{
 const reply=await workspace.request({op:'save'})
 assert.equal(reply.ok,true,`save: ${reply.error??'native refusal'}`)
 return reply.data.project
}
const reject=async(request,label)=>{
 const original=await save(),rev=snapshot.revision
 const reply=await workspace.request({revision:rev,...request})
 assert.equal(reply.ok,false,`${label}: expected native refusal`)
 assert(reply.error,`${label}: expected explanatory error`)
 await call({op:'snapshot'})
 assert.equal(snapshot.revision,rev,`${label}: revision changed`)
 assert.deepEqual(await save(),original,`${label}: persisted source changed`)
 checks.push(`${label}: ${reply.error}`)
}
const meshCounts=data=>({panels:data.panels?.length,vertices:data.positions?.length,triangles:data.triangles?.length})
const selection=()=>({version:1,sourceTemplate:structuredClone(snapshot.template),pieces:snapshot.template.panels.map(p=>({panelId:p.id,fabricId:p.fabric,quantity:1,production:true,sendTo3D:true}))})
try{
 await call({op:'open',preset:'tshirt'})
 assert(snapshot.template.seams.length>0,'Expected sewn T-shirt source')
 const sewnIds=new Set(snapshot.template.seams.flatMap(s=>JSON.stringify(s).match(/panel_\d+/g)||[]))
 const originalIds=new Set(snapshot.template.panels.map(p=>p.id))
 const fabric=snapshot.template.fabrics[0].id
 await call({op:'edit',command:{kind:'Polygon',fabric,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
 const extra=snapshot.template.panels.find(p=>!originalIds.has(p.id))
 assert(extra,'Native edit must create a real independent unsewn polygon')
 assert(!sewnIds.has(extra.id),'Independent polygon unexpectedly sewn')
 const variant=selection()
 variant.pieces.find(p=>p.panelId===extra.id).quantity=2
 await call({op:'piece-variant-store',variant})
 const authoritative=await save()
 assert.deepEqual(authoritative.template,variant.sourceTemplate)
 assert.deepEqual(authoritative.piece_variant,variant)
 const before=await call({op:'snapshot'})
 const baseline=meshCounts(before)
 assert(baseline.panels>0&&baseline.vertices>0&&baseline.triangles>0,'Native baseline mesh missing')
 await reject({op:'piece-variant-instance-preview',revision:snapshot.revision-1},'stale preview revision')
 const preview=await call({op:'piece-variant-instance-preview'},{snapshotResult:false})
 assert(preview&&typeof preview==='object','Preview requires real native receipt')
 assert.deepEqual(await save(),authoritative,'Read-only preview persisted derived geometry')
 assert.equal(snapshot.revision,before.revision,'Preview changed revision')
 checks.push('Read-only preview returns native receipt and preserves authoritative source')
 const active=await call({op:'piece-variant-instance-activate'})
 const expanded=meshCounts(active)
 assert(expanded.panels>baseline.panels,`Expected extra physical panel: ${JSON.stringify({baseline,expanded})}`)
 assert(expanded.vertices>baseline.vertices,`Expected extra physical vertices: ${JSON.stringify({baseline,expanded})}`)
 assert(expanded.triangles>baseline.triangles,`Expected extra physical triangles: ${JSON.stringify({baseline,expanded})}`)
 assert(active.panels.some(p=>!authoritative.template.panels.some(source=>source.id===p.id)),'Compiled viewport must expose derived panel identity')
 assert.deepEqual((await save()).template,authoritative.template,'Activation persisted derived source panel')
 checks.push(`Compiled native mesh expanded ${JSON.stringify(baseline)} -> ${JSON.stringify(expanded)}`)
 const restored=await call({op:'piece-variant-instance-restore'})
 assert.deepEqual(meshCounts(restored),baseline,'Restore did not recover original physical mesh')
 assert.deepEqual(await save(),authoritative,'Restore altered authoritative project')
 await call({op:'open',project:authoritative})
 assert.deepEqual(await save(),authoritative,'Save/reopen changed authored project or variant')
 assert.deepEqual(meshCounts(snapshot),baseline,'Reopen retained temporary instance')
 checks.push('Restore and save/reopen preserve exact base mesh and source')
 await call({op:'piece-variant-clear'})
 await reject({op:'piece-variant-instance-preview'},'missing variant preview')
 const unsafe=selection()
 const sewn=unsafe.pieces.find(p=>sewnIds.has(p.panelId))??unsafe.pieces.find(p=>p.panelId!==extra.id)
 assert(sewn,'Expected sewn source panel')
 sewn.quantity=2
 const stored=await workspace.request({op:'piece-variant-store',revision:snapshot.revision,variant:unsafe})
 if(stored.ok){
  snapshot=stored.data
  await reject({op:'piece-variant-instance-preview'},'sewn quantity-two preview')
  await reject({op:'piece-variant-instance-activate'},'sewn quantity-two activation')
 }else{
  assert(stored.error,'Unsafe store refusal must explain reason')
  checks.push(`Sewn quantity-two rejected at store: ${stored.error}`)
 }
 console.log(JSON.stringify({passed:true,checks,physicalInstanceVerified:true,mirroredPieceProven:false,manufacturingApproved:false},null,2))
}catch(error){
 console.error(JSON.stringify({passed:false,checks,error:error.stack??String(error)},null,2))
 process.exitCode=1
}finally{
 workspace.close()
 fs.rmSync(root,{recursive:true,force:true})
}
