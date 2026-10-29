// Native dependency graph guard: sewn seam modifications cannot silently stale grading.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-run32-seam-dependency-'))
const workspace=createWorkspace(folder)
let snapshot
const rpc=async payload=>{
 const response=await workspace.request({revision:snapshot?.revision,...payload})
 assert.equal(response.ok,true,`${payload.op}: ${response.error}`)
 if(response.data?.template)snapshot=response.data
 return response.data
}
const project=async()=>(await rpc({op:'save'})).project
const rejectAtomic=async payload=>{
 const before=await project(), revision=snapshot.revision
 const reply=await workspace.request({revision,...payload})
 assert.equal(reply.ok,false,'Dependent native sewing mutation unexpectedly succeeded')
 assert.match(String(reply.error),/grade|binding|depend|regenerat/i)
 await rpc({op:'snapshot'})
 assert.equal(snapshot.revision,revision)
 assert.deepEqual(await project(),before)
}
try {
 await rpc({op:'open',preset:'tshirt'})
 const rules=createAccuMarkNativeRuleSet(snapshot)
 assert.equal(rules.ok,true,rules.reason)
 const prepared=prepareNativeGradeCatalog20261025(snapshot,await project(),rules.ruleSet)
 assert.equal(prepared.ok,true,prepared.reason)
 await rpc({op:'grade-run-commit',gradeRun:prepared.gradeRun})
 await rpc({op:'snapshot'})
 const baseline=await project()
 const seam=snapshot.template.seams[0]
 assert(seam,'Fixture requires a real native seam')
 await rejectAtomic({op:'edit-seam',seam:seam.id,reverse:!seam.reverse_b,
   ease:seam.allow_ease,stiffness:seam.stiffness})
 await rejectAtomic({op:'edit-seam-ends',seam:seam.id,a:seam.a,b:seam.b,
   reverse:!seam.reverse_b})
 await rejectAtomic({op:'edit',command:{kind:'Annotation',panel:'front',
   text:'RUN32 source mutation',position:[.3,.3]}})
 const anchored=['front','back'].map(id=>{
   const panel=snapshot.template.panels.find(p=>p.id===id)
   assert(panel?.polygon?.points?.length>2)
   return {kind:'AnchorGroup',panel:id,edits:panel.polygon.points.map((p,index)=>[
     index,[p[0]+.005,p[1]]])}
 })
 await rejectAtomic({op:'edit-batch',commands:anchored})
 await rpc({op:'undo'})
 assert.equal((await project()).grade_run??null,null,'Undo must remove original grade install')
 await rpc({op:'redo'})
 assert.deepEqual(await project(),baseline,'Redo must preserve original graded sewing graph')
 await rpc({op:'open',project:baseline})
 assert.deepEqual(await project(),baseline,'Reopen must preserve original catalog and seams')
 // Exercise the Rust guard using an actual bound point and installed derived facing.
 await rpc({op:'open',preset:'tshirt'})
 for(const seam of [...snapshot.template.seams])
   await rpc({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
 const oldIds=new Set(snapshot.template.panels.map(p=>p.id))
 for(let i=0;i<2;i++)
   await rpc({op:'edit',command:{kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
     points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
 const ids=snapshot.template.panels.filter(p=>!oldIds.has(p.id)).map(p=>p.id)
 assert.equal(ids.length,2)
 const source=await project()
 for(const panel of source.template.panels)
   panel.polygon.seam_allowances=Object.fromEntries(panel.polygon.edges.map(edge=>[edge,.01]))
 source.state=null
 source.mesh_signature=null
 await rpc({op:'open',project:source})
 const bindings=ids.flatMap((panelId,i)=>[
   {id:`run32_top_${i}`,panelId,pointIndex:1,mode:'polar',
     a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]},
   {id:`run32_bottom_${i}`,panelId,pointIndex:2,mode:'polar',
     a:3,b:3,angleDeg:0,distanceFormula:'width',dependsOn:[]},
 ])
 await rpc({op:'bindings-store',nativeBindings:{
   measurements:{width:{valueMm:400}},bindings}})
 const base=structuredClone(snapshot.template)
 const offsets=[-.015,-.007,0,.005,.01,.014]
 const sizes=['XS','S','M','L','XL','XXL']
 await rpc({op:'grade-run-commit',gradeRun:{
   schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(base),
   gradedTemplates:sizes.map((size,i)=>{
     const template=structuredClone(base)
     for(const id of ids)for(const index of [1,2])
       template.panels.find(p=>p.id===id).polygon.points[index][0]+=offsets[i]
     return template
   }),pomSpecs:[],
 }})
 await rpc({op:'snapshot'})
 const parent=ids[0]
 const edge=snapshot.template.panels.find(p=>p.id===parent).polygon.edges[0]
 await rpc({op:'facing-dependency-install',parentPanelId:parent,parentEdgeId:edge,
   facingId:'run32_derived_facing',depthMm:40,allowanceMm:10})
 const facingBaseline=await project()
 assert(facingBaseline.native_facing_dependency)
 assert(facingBaseline.native_point_bindings)
 const revision=snapshot.revision
 const denied=await workspace.request({op:'edit',revision,command:{
   kind:'Anchor',panel:parent,anchor:1,position:[.39,0]}})
 assert.equal(denied.ok,false,'Native accepted bound Anchor despite derived facing')
 assert.match(String(denied.error),/Native facing dependency requires qualified regeneration/)
 await rpc({op:'snapshot'})
 assert.equal(snapshot.revision,revision)
 assert.deepEqual(await project(),facingBaseline,'Rejected bound Anchor changed saved project')
 await rpc({op:'undo'})
 assert.equal((await project()).native_facing_dependency??null,null,
   'Rejected edit must not add an undo step ahead of facing installation')
 await rpc({op:'redo'})
 assert.deepEqual(await project(),facingBaseline,'Redo must recover derived facing and bindings')
 await rpc({op:'open',project:facingBaseline})
 assert.deepEqual(await project(),facingBaseline,'Reopen must preserve rejected Anchor baseline')
 console.log(JSON.stringify({passed:true,compiledNative:true,atomicSeamGuards:true,
   derivedFacingBoundAnchorRejectedByExistingPreflight:true,revisionStable:true,saveReopen:true,
   undoRedo:true,pieceVariantBoundAnchorUntested:true,manufacturingApproved:false}))
} finally {
 workspace.close()
 fs.rmSync(folder,{recursive:true,force:true})
}
