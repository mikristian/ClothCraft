import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkExplorerOrder20261024} from './accumarkExplorerProductionFoundation20261024.js'
import {buildAccuMarkCutRoomPlan} from './accumarkCutRoomPlan20261024.js'
import {sha256Bytes} from './sha256Bytes.js'
import {buildIndustrialCadOrderHandoff20261028 as build,
 inspectIndustrialCadOrderHandoff20261028 as inspect} from './industrialCadOrderHandoff20261028.mjs'

const fixture=()=>{
 const project={id:'disposable-handoff-tee',grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
  {id:'front',name:'Front',fabricId:'shell',cutQuantity:2,grainAngleDeg:0,seamAllowance:1,
   notches:[{edgeIndex:0,t:.25,depthCm:.3}],
   points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]},
  {id:'collar',name:'Collar',fabricId:'rib',cutQuantity:1,grainAngleDeg:0,seamAllowance:1,
   points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
 ]}
 const qty={S:2,M:1}
 const explorer=buildAccuMarkExplorerOrder20261024(project,{styleId:'TEE-1',orderId:'ORDER-1',quantitiesBySize:qty})
 assert.equal(explorer.ok,true)
 const plans={}
 for(const fabricId of ['shell','rib']){
  plans[fabricId]=buildAccuMarkCutRoomPlan(project,{fabricId,quantitiesBySize:qty,
   fabricWidthCm:30,spacingCm:1,nap:true,maxPlyCount:2,
   rolls:[{rollId:`${fabricId}-ROLL`,batchId:`${fabricId}-BATCH`,fabricId,
    shade:'SHADE-1',nap:true,usableLengthCm:150,costPerMeter:20,widthCm:30}]})
  assert.equal(plans[fabricId].ok,true,JSON.stringify(plans[fabricId].issues))
 }
 const built=build(project,explorer,plans)
 assert.equal(built.ok,true,JSON.stringify(built.issues))
 const packet={manifest:built.manifest,manifestSha256:built.manifestSha256}
 return {project,explorer,plans,built,packet,wiresBySize:built.wiresBySize}
}
const reject=(change,code)=>{
 const values=fixture()
 change(values)
 const result=inspect(values.project,values.explorer,values.plans,values.packet,values.wiresBySize)
 assert.equal(result.ok,false,`Unexpected approval for ${code}`)
 assert(result.issues.some(i=>i.code===code),JSON.stringify(result.issues))
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
 assert.equal(result.receiverCadVerified,false)
}
test('real disposable 2-size/2-fabric physical CUT DXFs are SHA-bound to all 9 ordered cuts and rolls without release',()=>{
 const values=fixture(),before=structuredClone({project:values.project,explorer:values.explorer,
  plans:values.plans,packet:values.packet,wiresBySize:values.wiresBySize})
 const result=inspect(values.project,values.explorer,values.plans,values.packet,values.wiresBySize)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.sizeCount,2)
 assert.equal(result.fabricCount,2)
 assert.equal(result.orderedGarments,3)
 assert.equal(result.requiredPhysicalCuts,9)
 assert.equal(values.packet.manifest.files.length,2)
 assert(values.packet.manifest.files.every(f=>f.physicalContours===2&&f.units==='mm'&&f.sha256.length===64))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
 assert.deepEqual({project:values.project,explorer:values.explorer,plans:values.plans,
  packet:values.packet,wiresBySize:values.wiresBySize},before)
})
test('missing, extra, swapped, re-labelled and changed physical DXF bytes fail closed',()=>{
 reject(v=>{delete v.wiresBySize.M},'INCOMPLETE_DXF_SIZE_SET')
 reject(v=>{v.wiresBySize.XL=v.wiresBySize.M},'INCOMPLETE_DXF_SIZE_SET')
 reject(v=>{[v.wiresBySize.S,v.wiresBySize.M]=[v.wiresBySize.M,v.wiresBySize.S]},'CAD_GEOMETRY_OR_IDENTITY_FAILED')
 reject(v=>{v.wiresBySize.M=v.wiresBySize.M.replace('GARMENT_STUDIO_SIZE M','GARMENT_STUDIO_SIZE XL')},'CAD_GEOMETRY_OR_IDENTITY_FAILED')
 reject(v=>{v.wiresBySize.S=v.wiresBySize.S.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n1')},'CAD_GEOMETRY_OR_IDENTITY_FAILED')
 reject(v=>{v.wiresBySize.M+='\n999\nPOST-AUTHORING EDIT\n'},'CAD_GEOMETRY_OR_IDENTITY_FAILED')
})
test('manifest digest, source garment and source-order quantity changes cannot be silently reused',()=>{
 reject(v=>{v.packet.manifest.files[0].sha256='0'.repeat(64)},'MANIFEST_DIGEST_MISMATCH')
 reject(v=>{v.packet.manifestSha256='0'.repeat(64)},'MANIFEST_DIGEST_MISMATCH')
 reject(v=>{v.project.pieces[0].seamAllowance=1.5},'CAD_GEOMETRY_OR_IDENTITY_FAILED')
 reject(v=>{v.project.pieces[0].notches[0].t=.75},'CAD_GEOMETRY_OR_IDENTITY_FAILED')
 reject(v=>{v.explorer.order.quantitiesBySize.S=3},'ORDER_CUT_RECONCILIATION_FAILED')
 reject(v=>{v.explorer.order.orderId='OTHER-ORDER'},'ORDER_CUT_RECONCILIATION_FAILED')
})
test('roll, batch, cut-ticket and size-plan tampering invalidate the linked factory handoff',()=>{
 reject(v=>{v.plans.shell.rollAllocation[0].batchId='FORGED'},'ORDER_CUT_RECONCILIATION_FAILED')
 reject(v=>{v.plans.rib.cutTickets[0].pieces[0].total=99},'ORDER_CUT_RECONCILIATION_FAILED')
 // Some generated plan and manifest arrays alias the same ticket objects;
 // the independent packet digest must still catch a changed ticket ID.
 reject(v=>{v.plans.shell.cutTickets[0].ticketId='FORGED'},'HANDOFF_SOURCE_OR_WIRE_DRIFT')
 reject(v=>{v.plans.rib.manifest.quantitiesBySize.M=9},'ORDER_CUT_RECONCILIATION_FAILED')
})
test('even a recomputed manifest digest cannot forge receiver CAD approval or cutting authorization',()=>{
 reject(v=>{
  v.packet.manifest.receiverCadVerified=true
  v.packet.manifest.cuttingAuthorized=true
  v.packet.manifest.factoryApproved=true
  v.packet.manifestSha256=sha256Bytes(new TextEncoder().encode(JSON.stringify(v.packet.manifest)))
 },'HANDOFF_SOURCE_OR_WIRE_DRIFT')
 reject(v=>{
  v.packet.manifest.files[0].requiredPhysicalCuts=999
  v.packet.manifestSha256=sha256Bytes(new TextEncoder().encode(JSON.stringify(v.packet.manifest)))
 },'HANDOFF_SOURCE_OR_WIRE_DRIFT')
})
