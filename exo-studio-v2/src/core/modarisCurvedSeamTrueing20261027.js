// Qualified single-quadratic, unsewn legacy stitchline correction.
import { edgeLength, samplePieceBoundary } from './project.js'

const fail = code => { throw Error('MODARIS_CURVED_TRUEING_' + code) }
const finite = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 100000
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const allowedPiece = ['id','name','points','curves','fabricId','locked','edgeNames','seamAllowance','color']
const forbiddenProject = ['seams','grading','modarisSizeLinkedGrade','industrialAllowanceGraph','customMeasurements','productionSpec','cutlines','markers','notches']

function safeCopy(value, depth=0, stack=new Set()) {
  if(value===null||typeof value==='string'||typeof value==='boolean') return value
  if(typeof value==='number'&&Number.isFinite(value)) return value
  if(typeof value!=='object'||depth>20||stack.has(value))fail('UNSAFE_SOURCE')
  const array=Array.isArray(value)
  if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))fail('UNSAFE_PROTOTYPE')
  const descriptors=Object.getOwnPropertyDescriptors(value)
  const keys=Reflect.ownKeys(descriptors)
  if(keys.length>10000||keys.some(k=>typeof k!=='string'||['toJSON','__proto__','constructor','prototype'].includes(k)))fail('UNSAFE_PROPERTY')
  stack.add(value)
  const result=array?[]:{}
  for(const key of keys){
    if(array&&key==='length')continue
    const d=descriptors[key]
    if(!('value'in d)||!d.enumerable||array&&(!/^(0|[1-9]\d*)$/.test(key)||+key>=value.length))fail('UNSAFE_ACCESSOR')
    result[key]=safeCopy(d.value,depth+1,stack)
  }
  stack.delete(value)
  if(array&&result.length!==value.length)fail('SPARSE_ARRAY')
  return result
}
function intersects(a,b,c,d){
  const epsilon=1e-9
  const box=(p,q,r)=>r.x>=Math.min(p.x,q.x)-epsilon&&r.x<=Math.max(p.x,q.x)+epsilon&&r.y>=Math.min(p.y,q.y)-epsilon&&r.y<=Math.max(p.y,q.y)+epsilon
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b)
  if(Math.abs(x)<=epsilon&&box(a,b,c)||Math.abs(y)<=epsilon&&box(a,b,d)||Math.abs(z)<=epsilon&&box(c,d,a)||Math.abs(w)<=epsilon&&box(c,d,b))return true
  return (x>0)!==(y>0)&&(z>0)!==(w>0)
}
function contour(piece){
  if(!piece||Object.keys(piece).some(k=>!allowedPiece.includes(k))||piece.locked===true||
     piece.seamAllowance!==undefined&&piece.seamAllowance!==0)fail('UNSUPPORTED_PIECE_ATTACHMENT')
  const n=piece.points?.length
  if(!Number.isInteger(n)||n<3||n>24||piece.points.some(p=>!p||Object.keys(p).some(k=>!['x','y','id'].includes(k))||!finite(p.x)||!finite(p.y)))fail('POINTS')
  if(piece.edgeNames!==undefined&&(!Array.isArray(piece.edgeNames)||piece.edgeNames.length!==n||piece.edgeNames.some(x=>typeof x!=='string')))fail('EDGE_NAMES')
  if(piece.curves!==undefined&&(!piece.curves||Array.isArray(piece.curves)||Object.keys(piece.curves).some(k=>!/^(0|[1-9]\d*)$/.test(k)||+k>=n)))fail('CURVE_TOPOLOGY')
  for(const curve of Object.values(piece.curves??{}))if(!curve||Object.keys(curve).sort().join(',')!=='cx,cy'||!finite(curve.cx)||!finite(curve.cy))fail('CURVE_CONTROL')
  const pts=samplePieceBoundary(piece,48).points
  if(pts.length>1200||pts.some((p,i)=>distance(p,pts[(i+1)%pts.length])<1e-8))fail('DEGENERATE_EDGE')
  let area=0
  for(let i=0;i<pts.length;i++){
    const next=(i+1)%pts.length
    area+=pts[i].x*pts[next].y-pts[next].x*pts[i].y
    for(let j=i+2;j<pts.length;j++){
      if(i===0&&j===pts.length-1)continue
      if(intersects(pts[i],pts[next],pts[j],pts[(j+1)%pts.length]))fail('SELF_INTERSECTION')
    }
  }
  if(Math.abs(area)<1e-5)fail('AREA')
  return Math.sign(area)
}
function selected(project,ref){
  if(!ref||Object.keys(ref).sort().join(',')!=='edgeIndex,pieceId'||typeof ref.pieceId!=='string'||!Number.isInteger(ref.edgeIndex))fail('REFERENCE')
  const piece=project.pieces.find(p=>p.id===ref.pieceId)
  if(!piece||ref.edgeIndex<0||ref.edgeIndex>=piece.points.length)fail('EDGE')
  return {piece,index:ref.edgeIndex}
}
function angle(a,b){return Math.acos(Math.max(-1,Math.min(1,(a.x*b.x+a.y*b.y)/(Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y)))))*180/Math.PI}
/** Curve control is symmetric about the chord midpoint. Vary its signed
 * normal offset, conserving both endpoints and the control's chord station.
 * Endpoint tangent angular drift is strictly bounded by maxTangentDriftDeg.
 */
export function previewModarisCurvedSeamTrueing20261027(source,{source:sourceRef,target:targetRef,easeCm=0,expectedRevision,maxTangentDriftDeg=12}={}){
  if('toJSON'in Object.prototype||'toJSON'in Array.prototype)fail('UNSAFE_ENVIRONMENT')
  const project=safeCopy(source)
  if(!project||!Number.isSafeInteger(project.revision)||project.revision<0||!Array.isArray(project.pieces)||project.pieces.length<2||project.pieces.length>24)fail('PROJECT')
  if(project.units!==undefined&&project.units!=='cm')fail('UNITS')
  if(forbiddenProject.some(k=>Object.prototype.hasOwnProperty.call(project,k)))fail('PROJECT_ATTACHMENTS')
  if(expectedRevision!==undefined&&expectedRevision!==project.revision)fail('STALE_REVISION')
  if(!finite(easeCm)||Math.abs(easeCm)>10||!finite(maxTangentDriftDeg)||maxTangentDriftDeg<0||maxTangentDriftDeg>15)fail('OPTIONS')
  const ids=project.pieces.map(p=>p?.id)
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)fail('PIECE_IDS')
  const winding=new Map(project.pieces.map(p=>[p.id,contour(p)]))
  const a=selected(project,sourceRef),b=selected(project,targetRef)
  if(a.piece===b.piece)fail('SAME_PIECE')
  const ctrl=b.piece.curves?.[b.index]
  if(!ctrl||!a.piece.curves?.[a.index])fail('TWO_CURVED_EDGES_REQUIRED')
  const p=b.piece.points[b.index],q=b.piece.points[(b.index+1)%b.piece.points.length]
  const chord=distance(p,q)
  if(chord<0.1||chord>1000)fail('CHORD')
  const nx=-(q.y-p.y)/chord,ny=(q.x-p.x)/chord
  const mid={x:(p.x+q.x)/2,y:(p.y+q.y)/2}
  const axial=((ctrl.cx-mid.x)*(q.x-p.x)+(ctrl.cy-mid.y)*(q.y-p.y))/chord
  if(Math.abs(axial)>1e-7)fail('ASYMMETRIC_CONTROL')
  const originalH=(ctrl.cx-mid.x)*nx+(ctrl.cy-mid.y)*ny
  if(Math.abs(originalH)<0.02||Math.abs(originalH)>chord)fail('BULGE_RANGE')
  const sourceLengthCm=edgeLength(a.piece,a.index)
  const previousTargetLengthCm=edgeLength(b.piece,b.index)
  const desiredCm=sourceLengthCm+easeCm
  if(desiredCm<chord-1e-7||desiredCm>chord*1.5||!finite(desiredCm))fail('UNREACHABLE_LENGTH')
  const sign=Math.sign(originalH)
  const curveAt=h=>({cx:mid.x+sign*h*nx,cy:mid.y+sign*h*ny})
  const probe=h=>{
    const temp={...b.piece,curves:{...b.piece.curves,[b.index]:curveAt(h)}}
    return edgeLength(temp,b.index)
  }
  let lo=0,hi=chord
  if(desiredCm>probe(hi)+1e-7)fail('UNREACHABLE_BULGE')
  for(let i=0;i<64;i++){const m=(lo+hi)/2;if(probe(m)<desiredCm)lo=m;else hi=m}
  const h=(lo+hi)/2
  if(h<0.02)fail('FLAT_TANGENT_UNSUPPORTED')
  const revised=curveAt(h)
  const startOld={x:ctrl.cx-p.x,y:ctrl.cy-p.y},endOld={x:q.x-ctrl.cx,y:q.y-ctrl.cy}
  const startNew={x:revised.cx-p.x,y:revised.cy-p.y},endNew={x:q.x-revised.cx,y:q.y-revised.cy}
  const startDriftDeg=angle(startOld,startNew),endDriftDeg=angle(endOld,endNew)
  if(Math.max(startDriftDeg,endDriftDeg)>maxTangentDriftDeg+1e-9)fail('TANGENT_DRIFT')
  const changed=distance({x:ctrl.cx,y:ctrl.cy},{x:revised.cx,y:revised.cy})>1e-9
  if(changed){
    b.piece.curves[b.index]=revised
    if(contour(b.piece)!==winding.get(b.piece.id))fail('WINDING')
    project.revision++
  }
  const actual=edgeLength(b.piece,b.index)
  if(Math.abs(actual-desiredCm)>1e-6)fail('RESIDUAL')
  return {candidate:project,project,changed,source:sourceRef,target:targetRef,sourceLengthCm,
    previousTargetLengthCm,targetLengthCm:actual,desiredTargetLengthCm:desiredCm,
    requestedEaseCm:easeCm,measuredEaseCm:actual-sourceLengthCm,residualCm:actual-desiredCm,
    startTangentDriftDeg:startDriftDeg,endTangentDriftDeg:endDriftDeg,
    originalRevision:source.revision,candidateRevision:project.revision,manufacturingApproved:false,
    caveat:'Symmetric single-quadratic seam subset, fixed endpoints, bounded tangent angle drift. Unsewn and ungraded legacy centimeter geometry only.'}
}
