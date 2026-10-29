// Content-addressed, all-size production order ↔ DXF ↔ cut-plan handoff.
// This is LOCAL evidence only. It cannot certify a receiving CAD or authorize CUT.
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {sha256Bytes} from './sha256Bytes.js'
import {inspectIndustrialCadInterchange20261028} from './industrialCadRoundtripGate20261028.mjs'
import {inspectIndustrialOrderCutReconciliation20261028} from './industrialOrderCutReconciliation20261028.mjs'

const encoder=new TextEncoder()
const record=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  [Object.prototype,null].includes(Object.getPrototypeOf(o))
const refusal=(code,detail)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
  receiverCadVerified:false,cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false})
const sha=value=>{
 const wire=JSON.stringify(value)
 if(typeof wire!=='string')throw Error('Unserializable handoff content')
 const bytes=encoder.encode(wire)
 if(bytes.length>16e6)throw Error('Handoff manifest exceeds 16MB limit')
 return sha256Bytes(bytes)
}
const digest=manifest=>sha(manifest)

/** Source-bound, unsigned digital preflight. `wiresBySize` is required on
 * verification and MUST be actual received file bytes, not file names or
 * operator assertions. Local wire equality does not prove third-party import.
 */
function compile(project,explorer,plansByFabric,wiresBySize){
 const order=inspectIndustrialOrderCutReconciliation20261028(project,explorer,plansByFabric)
 if(!order.ok)return refusal('ORDER_CUT_RECONCILIATION_FAILED',order.issues)
 const sizes=project.grading.sizes
 if(!record(wiresBySize)||Object.keys(wiresBySize).length!==sizes.length||
   sizes.some(s=>!Object.hasOwn(wiresBySize,s)||typeof wiresBySize[s]!=='string'))
   return refusal('INCOMPLETE_DXF_SIZE_SET','Exact authored size-to-wire correspondence required')
 const cad=inspectIndustrialCadInterchange20261028(project,{wireBySize:wiresBySize})
 if(!cad.ok||cad.sizeCount!==sizes.length||cad.files.length!==sizes.length||
   cad.verifiedSizeIdentity!==true||cad.receiverCadVerified!==false)
   return refusal('CAD_GEOMETRY_OR_IDENTITY_FAILED',cad.issues)
 const fabrics=[...new Set(project.pieces.map(p=>p.fabricId||'main'))].sort()
 const totalPerGarment=project.pieces.reduce((n,p)=>n+p.cutQuantity,0)
 const files=cad.files.map(file=>({
  size:file.size,sha256:file.sha256,bytes:file.bytes,units:file.units,
  profile:file.profile,physicalContours:file.physicalCuts,
  orderedGarments:explorer.order.quantitiesBySize[file.size],
  requiredPhysicalCuts:explorer.order.quantitiesBySize[file.size]*totalPerGarment,
 }))
 const fabricPlans=fabrics.map(fabricId=>{
  const plan=plansByFabric[fabricId]
  return {fabricId,planSha256:sha({lays:plan.lays,cutTickets:plan.cutTickets,
   rollAllocation:plan.rollAllocation,manifest:plan.manifest}),
   layCount:plan.lays.length,ticketCount:plan.cutTickets.length,
   rolls:plan.rollAllocation.map(roll=>({rollId:roll.rollId,batchId:roll.batchId,
    shade:roll.shade,consumedCm:roll.consumedCm}))}
 })
 const manifest={format:'exo.local-CAD-order-handoff.v1',schemaVersion:1,
  sourceProjectId:project.id||null,
  sourcePatternSha256:sha({grading:project.grading,pieces:project.pieces}),
  orderId:explorer.order.orderId,styleId:explorer.order.styleId,
  variantId:explorer.order.variantId,colorway:explorer.order.colorway,
  orderSha256:sha({model:explorer.model,order:explorer.order}),
  sizes:[...sizes],files,fabricPlans,
  orderedGarments:explorer.order.totalGarments,requiredPhysicalCuts:order.expectedPieces,
  receiverCadVerified:false,aamaCertified:false,astmCertified:false,
  cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false}
 return {ok:true,manifest,manifestSha256:digest(manifest)}
}

export function buildIndustrialCadOrderHandoff20261028(project,explorer,plansByFabric){
 try{
  const sizes=project?.grading?.sizes
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24)
   return refusal('INVALID_SIZE_RUN','2–24 named sizes required')
  const wiresBySize={}
  for(const size of sizes)wiresBySize[size]=projectToDxf(gradeProject(project,size),size,
   {cutlineMode:'manufacturing',requireGradedGeometry:true})
  const result=compile(project,explorer,plansByFabric,wiresBySize)
  if(!result.ok)return result
  return {...result,status:'LOCAL_CAD_ORDER_HANDOFF_BOUND',wiresBySize,
   receiverCadVerified:false,cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false}
 }catch(error){return refusal('HANDOFF_BUILD_REFUSED',String(error.message||error))}
}

export function inspectIndustrialCadOrderHandoff20261028(project,explorer,plansByFabric,packet,wiresBySize){
 try{
  if(!record(packet)||!record(packet.manifest)||typeof packet.manifestSha256!=='string'||
   packet.manifestSha256!==digest(packet.manifest))
   return refusal('MANIFEST_DIGEST_MISMATCH','Missing, malformed or altered unsigned handoff manifest')
  const actual=compile(project,explorer,plansByFabric,wiresBySize)
  if(!actual.ok)return actual
  if(JSON.stringify(packet.manifest)!==JSON.stringify(actual.manifest)||
   packet.manifestSha256!==actual.manifestSha256)
   return refusal('HANDOFF_SOURCE_OR_WIRE_DRIFT','Handoff no longer matches current source, order, rolls and exact DXF bytes')
  return {ok:true,status:'LOCAL_CAD_ORDER_HANDOFF_BOUND',issues:[],
   manifestSha256:actual.manifestSha256,sizeCount:actual.manifest.sizes.length,
   fabricCount:actual.manifest.fabricPlans.length,
   orderedGarments:actual.manifest.orderedGarments,
   requiredPhysicalCuts:actual.manifest.requiredPhysicalCuts,
   receiverCadVerified:false,aamaCertified:false,astmCertified:false,
   cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
   limitations:'Unsigned local SHA-256 content integrity and generic R12 DXF geometry only. '
    +'Not a licensed AAMA/ASTM receiver, operator acceptance, physical cutting approval or factory release.'}
 }catch(error){return refusal('HANDOFF_INSPECTION_REFUSED',String(error.message||error))}
}
