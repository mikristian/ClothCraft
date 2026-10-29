import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {auditAccuMarkGradedDxfRoundtrip20261023} from './accumarkGradedDxfRoundtripAudit20261023.js'
import {readPhysicalCutContours20261024} from './accumarkMarkerDxfGeometryParity20261024.mjs'
import {sha256Bytes} from './sha256Bytes.js'
const encode=new TextEncoder()
const reject=(code,reason=code)=>({ok:false,status:'BLOCKED',issues:[{code,reason}],sizeCount:0,files:[],receiverCadVerified:false,aamaCertified:false,astmCertified:false,cuttingAuthorized:false})
/** Graded, six-size physical DXF evidence. Machine-neutral, generic AutoCAD R12,
 * not a certified ASTM D6673/AAMA model+RUL exchange. Never fabricate recipient results.
 */
export function inspectIndustrialCadInterchange20261028(project,{wireBySize=null,maxWireBytes=16e6}={}){
 const sizes=project?.grading?.sizes
 if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||!sizes.includes(project.grading.baseSize)||new Set(sizes).size!==sizes.length||sizes.some(s=>typeof s!=='string'||!/^[A-Za-z0-9-]{1,24}$/.test(s)))return reject('INVALID_SIZE_RUN')
 if(!Array.isArray(project?.pieces)||!project.pieces.length||project.pieces.length>80)return reject('INVALID_PIECES')
 if(wireBySize!==null&&(
   wireBySize===null||typeof wireBySize!=='object'||Array.isArray(wireBySize)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(wireBySize))||
   Object.keys(wireBySize).length!==sizes.length||
   Object.keys(wireBySize).some(size=>!sizes.includes(size))))return reject('INVALID_RECEIVER_FIXTURE')
 if(!Number.isSafeInteger(maxWireBytes)||maxWireBytes<1||maxWireBytes>16e6)return reject('INVALID_RECEIVER_WIRE_LIMIT')
 const files=[],issues=[]
 const reference={}
 try{
  for(const size of sizes){
   const graded=gradeProject(project,size)
   const own=projectToDxf(graded,size,{cutlineMode:'manufacturing',requireGradedGeometry:true})
   reference[size]=own
   const wire=wireBySize?wireBySize[size]:own
   if(typeof wire!=='string'||encode.encode(wire).length>maxWireBytes||wire.length===0){issues.push({code:'MISSING_OR_OVERSIZED_DXF',size});continue}
   const contours=readPhysicalCutContours20261024(wire)
   if(contours.size!==graded.pieces.length)issues.push({code:'CUT_PIECE_COUNT',size,expected:graded.pieces.length,actual:contours.size})
   files.push({size,bytes:encode.encode(wire).length,sha256:sha256Bytes(encode.encode(wire)),physicalCuts:contours.size,profile:'generic-AutoCAD-R12',units:'mm',aamaCertified:false,astmCertified:false})
  }
  if(issues.length)return {...reject('MISSING_OR_INVALID_SIZE_WIRE'),issues,files,sizeCount:sizes.length}
  const audit=auditAccuMarkGradedDxfRoundtrip20261023(project,{wireForSize:size=>wireBySize?wireBySize[size]:reference[size]})
  issues.push(...audit.issues)
  if(audit.rows.length!==sizes.length||audit.rows.some(row=>!row.ok))issues.push({code:'INCOMPLETE_GRADED_ROUNDTRIP'})
  return {ok:issues.length===0,status:issues.length?'BLOCKED':'LOCAL_DXF_GEOMETRY_VERIFIED',issues,
   sizeCount:sizes.length,files,verifiedSizeIdentity:audit.rows.every(row=>row.ok),
   exactWireFromReceiver:wireBySize!==null,receiverCadVerified:false,aamaCertified:false,astmCertified:false,
   cuttingAuthorized:false,manufacturingApproved:false,
   limitations:'Generic R12 DXF only. No ASTM D6673 R13+RUL conformity, independent Modaris/AccuMark receiving CAD, cutter profile or physical pattern approval.'}
 }catch(error){return {...reject('CAD_INTERCHANGE_REFUSED',String(error.message||error)),files,sizeCount:sizes.length}}
}
