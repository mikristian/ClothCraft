// Detached straight-edge seam trueing candidate for legacy centimeter projects.
import {cloneProject} from './project.js'
const fail=m=>{throw Error('MODARIS_SEAM_TRUEING: '+m)}
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y)
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const hit=(a,b,c,d)=>{
 const ab=cross(a,b,c),ac=cross(a,b,d),cd=cross(c,d,a),ce=cross(c,d,b),eps=1e-10
 if(Math.abs(ab)<eps||Math.abs(ac)<eps||Math.abs(cd)<eps||Math.abs(ce)<eps)return true
 return (ab>0)!==(ac>0)&&(cd>0)!==(ce>0)
}
function polygon(piece){
 const pts=piece.points
 if(!Array.isArray(pts)||pts.length<3||pts.length>128)fail('unsupported polygon size')
 for(const p of pts)if(!p||!finite(p.x)||!finite(p.y)||Object.keys(p).some(k=>!['x','y','id'].includes(k)))fail('unsupported points or marks')
 let area=0
 for(let i=0;i<pts.length;i++){
  const a=pts[i],b=pts[(i+1)%pts.length]
  if(length(a,b)<1e-6)fail('zero length edge')
  area+=a.x*b.y-b.x*a.y
  for(let j=i+2;j<pts.length;j++)if(!(i===0&&j===pts.length-1)&&hit(a,b,pts[j],pts[(j+1)%pts.length]))fail('self intersection')
 }
 if(Math.abs(area)<1e-6)fail('degenerate area')
 return Math.sign(area)
}
function guard(project){
 if(!project||!Array.isArray(project.pieces)||project.pieces.length<2||project.pieces.length>128||!Number.isSafeInteger(project.revision)||project.revision<0)fail('invalid revision or pieces')
 if(project.units!==undefined&&project.units!=='cm')fail('centimeter units required')
 if(['seams','grading','modarisSizeLinkedGrade','industrialAllowanceGraph','customMeasurements'].some(k=>project[k]!==undefined))fail('attached seams or grading unsupported')
 const ids=new Set()
 for(const piece of project.pieces){
  if(!piece||typeof piece.id!=='string'||!piece.id||ids.has(piece.id))fail('invalid piece IDs')
  ids.add(piece.id)
  if(Object.keys(piece).some(k=>!['id','name','points','fabricId','locked','edgeNames','seamAllowance','color'].includes(k)))fail('unsupported piece attachments')
  if(piece.locked===true||piece.seamAllowance!==undefined&&piece.seamAllowance!==0)fail('seam allowance or locked piece unsupported')
  if(piece.edgeNames!==undefined&&(!Array.isArray(piece.edgeNames)||piece.edgeNames.length!==piece.points?.length||piece.edgeNames.some(s=>typeof s!=='string')))fail('invalid edge names')
  polygon(piece)
 }
}
function edge(project,ref){
 if(!ref||Object.keys(ref).sort().join(',')!=='edgeIndex,pieceId'||typeof ref.pieceId!=='string'||!Number.isSafeInteger(ref.edgeIndex))fail('invalid edge reference')
 const piece=project.pieces.find(p=>p.id===ref.pieceId)
 if(!piece||ref.edgeIndex<0||ref.edgeIndex>=piece.points.length)fail('missing edge')
 const index=ref.edgeIndex
 return {piece,index,start:piece.points[index],end:piece.points[(index+1)%piece.points.length]}
}
/**
 * Preview one target endpoint extended/retracted along its original straight
 * seam vector. The neighboring edge follows as a polygon edge after relocation.
 * A separate undo transaction may commit the returned revisioned candidate.
 */
export function previewModarisSeamTrueing20261027(input,{source,target,easeCm=0,expectedRevision}={}){
 const project=cloneProject(input)
 guard(project)
 if(expectedRevision!==undefined&&expectedRevision!==project.revision)fail('stale project revision')
 if(!finite(easeCm)||Math.abs(easeCm)>10)fail('invalid ease')
 const a=edge(project,source),b=edge(project,target)
 if(a.piece.id===b.piece.id)fail('source and target must be separate pieces')
 const sourceCm=length(a.start,a.end),targetCm=length(b.start,b.end),desiredCm=sourceCm+easeCm
 if(desiredCm<.01||desiredCm>1000)fail('unsupported target length')
 const changed=Math.abs(desiredCm-targetCm)>1e-8
 if(changed){
  const fraction=desiredCm/targetCm
  const endpoint=b.end
  endpoint.x=b.start.x+(endpoint.x-b.start.x)*fraction
  endpoint.y=b.start.y+(endpoint.y-b.start.y)*fraction
  // Reject displacement that reverses the adjacent edge or breaks topology.
  if(polygon(b.piece)!==polygon(input.pieces.find(p=>p.id===b.piece.id)))fail('winding changed')
 }
 const measured=length(b.start,b.end)
 if(Math.abs(measured-desiredCm)>1e-7)fail('trueing error exceeds tolerance')
 if(changed)project.revision++
 return {candidate:project,project,changed,source,target,sourceLengthCm:sourceCm,previousTargetLengthCm:targetCm,
  targetLengthCm:measured,requestedEaseCm:easeCm,measuredEaseCm:measured-sourceCm,
  originalRevision:input.revision,candidateRevision:project.revision,manufacturingApproved:false,
  caveat:'Straight, unsewn polygon edges only. Target seam endpoint is adjusted along its old tangent; fit, grain, notches, seam allowance and sewing assembly require separate validation.'}
}
