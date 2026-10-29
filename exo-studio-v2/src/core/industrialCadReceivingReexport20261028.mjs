// Strict, read-only inspection of a claimed receiving-CAD import/re-export.
// The caller supplies ACTUAL re-exported DXF bytes. Metadata is unsigned and
// cannot establish independent third-party provenance, release or cutter safety.
import {inspectIndustrialCadOrderHandoff20261028} from './industrialCadOrderHandoff20261028.mjs'
import {inspectIndustrialCadInterchange20261028} from './industrialCadRoundtripGate20261028.mjs'
import {parseAccuMarkGradedDxfWire20261023} from './accumarkGradedDxfRoundtripAudit20261023.js'
import {sha256Bytes} from './sha256Bytes.js'
import {inspectIndustrialReceivingEntityInventory20261028} from './industrialReceivingEntityInventory20261028.mjs'
import {inspectIndustrialReceivingDxfEnvelope20261028} from './industrialReceivingDxfEnvelope20261028.mjs'
import {inspectIndustrialReceivingDxfHandleIntegrity20261028} from './industrialReceivingDxfHandleIntegrity20261028.mjs'

const encoder=new TextEncoder()
const own=(object,key)=>Object.hasOwn(object,key)
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  [Object.prototype,null].includes(Object.getPrototypeOf(value))
const token=value=>typeof value==='string'&&/^[A-Za-z0-9_.-]{1,96}$/.test(value)
const sha=wire=>sha256Bytes(encoder.encode(wire))
const deny=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
  receivingGeometryCrosschecked:false,receivingEnvelopeVerified:false,
  independentReceiverAuthenticated:false,
  receiverCadVerified:false,aamaCertified:false,astmCertified:false,
  cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false})
const layerCounts=wire=>{
 const parsed=parseAccuMarkGradedDxfWire20261023(wire)
 if(!parsed.ok)throw Error(`Invalid receiver DXF: ${parsed.issues.map(i=>i.code).join(',')}`)
 const counts={cut:0,stitch:0,allowance:0,notch:0}
 for(const entity of parsed.entities){
  const layer=entity.layer||''
  if(layer.startsWith('CUT_'))counts.cut++
  if(layer.startsWith('STITCH_'))counts.stitch++
  if(layer.startsWith('SA_'))counts.allowance++
  if(layer.startsWith('NOTCH_'))counts.notch++
 }
 return counts
}

/** The unsigned evidence packet MUST include all raw re-exported DXF wires,
 * plus a per-size import record. Never accept a screenshot, file path, hash
 * alone, or an operator's claim in place of the actual re-export geometry.
 * Successful output means local artifact crosscheck ONLY, not independent
 * receiving CAD acceptance. The recipient application is NOT authenticated.
 */
export function inspectIndustrialCadReceivingReexport20261028(
 project,explorer,plansByFabric,handoffPacket,outboundWires,evidence,
){
 try{
  const bound=inspectIndustrialCadOrderHandoff20261028(
   project,explorer,plansByFabric,handoffPacket,outboundWires)
  if(!bound.ok)return deny('SOURCE_HANDOFF_UNVERIFIED',bound.issues)
  const sizes=project.grading.sizes
  if(!record(evidence)||evidence.format!=='exo.receiving-CAD-reexport-evidence.v1'||
    evidence.handoffManifestSha256!==bound.manifestSha256||
    !token(evidence.receiverApplication)||!token(evidence.receiverVersion)||
    !token(evidence.receiverSessionId)||
    evidence.receiverCadVerified===true||evidence.cuttingAuthorized===true||
    evidence.factoryApproved===true||evidence.manufacturingApproved===true||
    evidence.aamaCertified===true||evidence.astmCertified===true)
   return deny('INVALID_OR_UNTRUSTED_RECEIVER_CLAIM')
  const reexports=evidence.reexportWiresBySize
  const records=evidence.importRecords
  if(!record(reexports)||Object.keys(reexports).length!==sizes.length||
    !Array.isArray(records)||records.length!==sizes.length||
    sizes.some(s=>!own(reexports,s)||typeof reexports[s]!=='string'||
      !records.some(r=>r?.size===s))||
    new Set(records.map(r=>r?.size)).size!==sizes.length)
   return deny('INCOMPLETE_RECEIVER_SIZE_SET')
  const reported=new Map(records.map(r=>[r.size,r]))
  let bytes=0
  for(const size of sizes){
   const source=outboundWires[size],reexport=reexports[size],row=reported.get(size)
   if(reexport.length>16e6)return deny('RECEIVER_IMPORT_RECORD_DRIFT',`${size}: DXF size limit`)
   bytes+=encoder.encode(reexport).length
   if(bytes>64e6||reexport.length===0||!record(row)||row.imported!==true||
     row.size!==size||row.sourceSha256!==sha(source)||
     row.reexportSha256!==sha(reexport)||
     !record(row.layerCounts)||Object.keys(row.layerCounts).sort().join(',')!==
       'allowance,cut,notch,stitch'||
     Object.values(row.layerCounts).some(n=>!Number.isSafeInteger(n)||n<0))
    return deny('RECEIVER_IMPORT_RECORD_DRIFT',size)
   let actual
   try{actual=layerCounts(reexport)}
   catch(error){return deny('INVALID_RECEIVER_DXF',`${size}: ${error.message}`)}
   if(Object.keys(actual).some(k=>row.layerCounts[k]!==actual[k]))
    return deny('RECEIVER_LAYER_INVENTORY_DRIFT',size)
  }
  // Parse the supplied re-exported DXF wire and compare
  // all physical cut/stitch/notch stations and allowance geometry with the
  // authored source. No local fallback is permitted for absent sizes.
  const cad=inspectIndustrialCadInterchange20261028(project,{wireBySize:reexports})
  if(!cad.ok||cad.sizeCount!==sizes.length||cad.verifiedSizeIdentity!==true)
   return deny('RECEIVER_REEXPORT_GEOMETRY_DRIFT',cad.issues)
  // CUT/STITCH/notch parity alone misses altered grainlines, changed labels,
  // extra cutter-visible entities and hidden geometry on unrelated layers.
  const auxiliary=inspectIndustrialReceivingEntityInventory20261028(project,reexports)
  if(!auxiliary.ok)return deny('RECEIVER_AUXILIARY_ENTITY_DRIFT',auxiliary.issues)
  // An otherwise geometrically identical receiver DXF may carry a hidden or
  // frozen CUT layer TABLE, a changed insertion origin or trailing sections.
  // These are not visible in entity-only comparisons and must fail closed.
  const envelope=inspectIndustrialReceivingDxfEnvelope20261028(project,reexports)
  if(!envelope.ok)return deny('RECEIVER_DXF_ENVELOPE_DRIFT',envelope.issues)
  // Entity handle collisions can silently drop a physical notch or contour
  // when imported into a handle-indexed CAD database, even with intact XY.
  const handles=inspectIndustrialReceivingDxfHandleIntegrity20261028(project,reexports)
  if(!handles.ok)return deny('RECEIVER_ENTITY_HANDLE_DRIFT',handles.issues)
  return {ok:true,status:'LOCAL_RECEIVER_REEXPORT_ARTIFACT_CROSSCHECKED',issues:[],
   sizeCount:sizes.length,receiverApplicationClaim:evidence.receiverApplication,
   receiverSessionClaim:evidence.receiverSessionId,
   manifestSha256:bound.manifestSha256,
   artifacts:sizes.map(size=>({size,sourceSha256:sha(outboundWires[size]),
    reexportSha256:sha(reexports[size]),layerCounts:layerCounts(reexports[size])})),
   receivingGeometryCrosschecked:true,receivingAuxiliaryEntitiesVerified:true,
   receivingEnvelopeVerified:true,envelopeRows:envelope.rows,
   entityHandlesVerified:true,entityHandleRows:handles.rows,
   auxiliaryEntityInventory:auxiliary.rows,independentReceiverAuthenticated:false,
   receiverCadVerified:false,aamaCertified:false,astmCertified:false,
   cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
   limitations:'Unsigned, caller-supplied receiver metadata and re-exported R12 DXF bytes. '
    +'A passing local geometry comparison cannot prove the file was imported by '
    +'licensed third-party CAD, satisfy AAMA/ASTM exchange, authorize cutting or release factory production.'}
 }catch(error){return deny('RECEIVER_REEXPORT_INSPECTION_REFUSED',String(error.message||error))}
}
