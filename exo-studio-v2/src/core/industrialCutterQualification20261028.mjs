// Read-only cutter qualification worksheet. This module never emits cutter commands.
const finite=Number.isFinite
const refuse=(code,detail=code)=>({ok:false,code,detail,cuttingAuthorized:false,machineReady:false,manufacturingApproved:false})
const id=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,72}$/.test(s)
const point=p=>p&&finite(p.xMm)&&finite(p.yMm)&&Math.abs(p.xMm)<1e8&&Math.abs(p.yMm)<1e8
/** Explicit machine envelope and device capability contract. A claimed device
 * name, operator or successful local preview can never authorize cutting. */
export function qualifyIndustrialCutterStudy20261028(study,markTransfer,profile,{calibration=null,receiverAcceptance=null}={}){
 if(study?.ok!==true||study.format!=='exo.machine-neutral-CUT-inspection.v1'||!Array.isArray(study.records)||!study.records.length||
   !finite(study.fabricWidthMm)||study.fabricWidthMm<=0||!markTransfer||markTransfer.ok!==true||!Array.isArray(markTransfer.placements))return refuse('UNVERIFIED_CUT_SOURCE')
 if(!profile||!id(profile.profileId)||!id(profile.manufacturer)||!id(profile.model)||!finite(profile.bedWidthMm)||profile.bedWidthMm<=0||
   !finite(profile.bedLengthMm)||profile.bedLengthMm<=0||typeof profile.supportsNotches!=='boolean'||typeof profile.supportsDrills!=='boolean')return refuse('INVALID_MACHINE_PROFILE')
 const issues=[],seen=new Set(),index=new Map(markTransfer.placements.map(p=>[`${p.pieceId}\0${p.instance}`,p]))
 if(study.fabricWidthMm>profile.bedWidthMm)issues.push({code:'BED_WIDTH_EXCEEDED'})
 for(const row of study.records){
  const key=`${row.pieceId}\0${row.instance}`
  if(seen.has(key)){issues.push({code:'DUPLICATE_CUT_INSTANCE',key});continue}seen.add(key)
  const marks=index.get(key)
  if(!marks){issues.push({code:'MISSING_MARK_INSTANCE',key});continue}
  if(!Array.isArray(row.physicalCutPathMm)||row.physicalCutPathMm.length<4||row.physicalCutPathMm.some(p=>!point(p))){issues.push({code:'INVALID_CUT_POINTS',key});continue}
  const maxY=Math.max(...row.physicalCutPathMm.map(p=>p.yMm))
  if(maxY>profile.bedLengthMm+1e-4)issues.push({code:'BED_LENGTH_EXCEEDED',key})
  if(row.physicalCutPathMm.some(p=>p.xMm<-.0001||p.yMm<-.0001||p.xMm>profile.bedWidthMm+.0001))issues.push({code:'BED_BOUNDS_EXCEEDED',key})
  if(!Array.isArray(marks.notches)||!Array.isArray(marks.drills)){issues.push({code:'INVALID_MARKS',key});continue}
  if(marks.notches.length&&!profile.supportsNotches)issues.push({code:'NOTCH_TOOL_UNSUPPORTED',key})
  if(marks.drills.length&&!profile.supportsDrills)issues.push({code:'DRILL_TOOL_UNSUPPORTED',key})
  if(marks.notches.some(n=>!point({xMm:n.startCm?.x*10,yMm:n.startCm?.y*10})||!point({xMm:n.endCm?.x*10,yMm:n.endCm?.y*10})))issues.push({code:'INVALID_NOTCH_GEOMETRY',key})
  if(marks.drills.some(p=>!point({xMm:p.xCm*10,yMm:p.yCm*10})))issues.push({code:'INVALID_DRILL_GEOMETRY',key})
 }
 if(seen.size!==index.size)issues.push({code:'UNMATCHED_PLACEMENTS'})
 if(!calibration||calibration.referenceLengthMm!==100||!finite(calibration.measuredLengthMm)||Math.abs(calibration.measuredLengthMm-100)>.2||
   !id(calibration.operatorId)||typeof calibration.measuredAt!=='string'||!/^\d{4}-\d\d-\d\d/.test(calibration.measuredAt))issues.push({code:'CALIBRATION_NOT_VERIFIED'})
 if(!receiverAcceptance||receiverAcceptance.accepted!==true||!id(receiverAcceptance.application)||!id(receiverAcceptance.version)||!id(receiverAcceptance.operatorId)||
   !Array.isArray(receiverAcceptance.evidenceFiles)||!receiverAcceptance.evidenceFiles.length||
   receiverAcceptance.evidenceFiles.some(file=>typeof file!=='string'||!file.trim()||file.length>256)||
   new Set(receiverAcceptance.evidenceFiles).size!==receiverAcceptance.evidenceFiles.length)
   issues.push({code:'RECEIVER_ACCEPTANCE_NOT_DOCUMENTED'})
 // Inspection passing does not imply certified electrical interlocks, material,
 // cutter firmware semantics, knife offsets, feed dynamics, or signed approval.
 return {ok:issues.length===0,status:issues.length?'BLOCKED':'DOCUMENTED_ENGINEERING_REVIEW',issues,
   machine:{profileId:profile.profileId,manufacturer:profile.manufacturer,model:profile.model},
   cuts:seen.size,notches:markTransfer.placements.reduce((n,p)=>n+p.notches.length,0),
   cutterProtocolVerified:false,physicalInterlocksVerified:false,materialQualified:false,
   machineReady:false,cuttingAuthorized:false,manufacturingApproved:false,
   warning:'Machine profile and calibration evidence are informational. Never send this report to a cutter or interpret it as machine qualification.'}
}
