import {gradeProject} from './grading.js'

// All authored coordinates and distances are centimetres. Operations are
// intentionally limited to plain straight-edged boundaries: modifying topology
// with attached production information requires a dedicated remapping engine.
const EPS=1e-8
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e7
const position=p=>p&&finite(p.x)&&finite(p.y)
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
// Translate the shoelace products to the first vertex to avoid cancellation
// when a millimetre-scale contour is drafted far from the origin.
const signedArea=p=>{const o=p[0];return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x)},0)/2}
const between=(a,b,p)=>p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.y>=Math.min(a.y,b.y)-EPS&&p.y<=Math.max(a.y,b.y)+EPS
function crosses(a,b,c,d){
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b)
  return (x*y < -EPS && z*w < -EPS)||
    (Math.abs(x)<=EPS&&between(a,b,c))||(Math.abs(y)<=EPS&&between(a,b,d))||
    (Math.abs(z)<=EPS&&between(c,d,a))||(Math.abs(w)<=EPS&&between(c,d,b))
}
function validate(points){
  if(!Array.isArray(points)||points.length<3||points.length>4096||!points.every(position))throw Error('INVALID_CONTOUR')
  if(points.some((p,i)=>Math.hypot(p.x-points[(i+1)%points.length].x,p.y-points[(i+1)%points.length].y)<=EPS))throw Error('DEGENERATE_EDGE')
  const area=signedArea(points)
  if(Math.abs(area)<=EPS)throw Error('DEGENERATE_AREA')
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    if(j===i+1||(i===0&&j===points.length-1))continue
    if(crosses(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))throw Error('SELF_INTERSECTION')
  }
  return Math.sign(area)
}
function select(project,pieceId){
  if(!project||!Array.isArray(project.pieces)||typeof pieceId!=='string'||!pieceId)throw Error('INVALID_PROJECT_OR_PIECE')
  const matches=project.pieces.filter(p=>p?.id===pieceId)
  if(matches.length!==1)throw Error('UNKNOWN_OR_DUPLICATE_PIECE')
  return matches[0]
}
function index(v,n,name){if(!Number.isInteger(v)||v<0||v>=n)throw Error(`INVALID_${name}`);return v}
function unattached(project,piece){
  // Fail closed on unknown geometry-related piece fields and project links.
  const allowed=new Set(['id','name','points','color','fabricId','quantity','cutQty','cutQuantity','material','notes','label','type','category','description','rotation','locked','visible','position','grainAngle','metadata'])
  if(Object.keys(piece).some(k=>!allowed.has(k)))throw Error('UNSUPPORTED_ATTACHED_GEOMETRY')
  if(piece.points.some(p=>Object.keys(p).some(k=>!['x','y'].includes(k))))throw Error('UNSUPPORTED_POINT_METADATA')
  if(Object.keys(project).some(k=>/seam|stitch|notch|construction|allowance|measure|anchor|dart|curve|pair/i.test(k) && project[k]!=null && (Array.isArray(project[k])?project[k].length:typeof project[k]==='object'?Object.keys(project[k]).length:true)))throw Error('UNSUPPORTED_PROJECT_ATTACHMENTS')
}
function checkedGrades(project){
  const sizes=project.grading?.sizes?.length?project.grading.sizes:['XS','S','M','L','XL','XXL']
  if(!Array.isArray(sizes)||sizes.length>64)throw Error('INVALID_SIZE_SET')
  for(const size of sizes)for(const piece of gradeProject(project,size).pieces)validate(piece.points)
  return [...sizes]
}

/** Immutable drafting operation. Kinds:
 * point.set {pieceId,pointIndex,xCm,yCm};
 * point.move {pieceId,pointIndex,dxCm,dyCm} OR {angleDeg,distanceCm};
 * edge.split {pieceId,edgeIndex,fraction} (strictly interior fraction 0..1).
 * Returns {project,validation}. Topology changes can invalidate external
 * references, so every mutation requires attachment-free project geometry.
 */
export function applyAccuMarkPointLineOperation(project,spec){
  if(!spec||typeof spec!=='object')throw Error('INVALID_OPERATION')
  if(spec.kind==='edge.measure')return {measurement:measureAccuMarkBoundaryEdge(project,spec)}
  const piece=select(project,spec.pieceId)
  const orientation=validate(piece.points)
  unattached(project,piece)
  const next=structuredClone(project)
  const edited=next.pieces.find(p=>p.id===spec.pieceId)
  let detail
  if(spec.kind==='point.set'){
    const i=index(spec.pointIndex,piece.points.length,'POINT_INDEX')
    if(!finite(spec.xCm)||!finite(spec.yCm))throw Error('INVALID_COORDINATES')
    edited.points[i]={x:spec.xCm,y:spec.yCm}
    detail={pointIndex:i,oldPosition:{...piece.points[i]},newPosition:{...edited.points[i]}}
  }else if(spec.kind==='point.move'){
    const i=index(spec.pointIndex,piece.points.length,'POINT_INDEX')
    const polar=spec.angleDeg!==undefined||spec.distanceCm!==undefined
    if(polar && (spec.dxCm!==undefined||spec.dyCm!==undefined))throw Error('AMBIGUOUS_MOVE')
    if(!polar && (!finite(spec.dxCm)||!finite(spec.dyCm)))throw Error('INVALID_DELTA')
    if(polar && (!finite(spec.angleDeg)||!finite(spec.distanceCm)||spec.distanceCm<0))throw Error('INVALID_POLAR_MOVE')
    const radians=polar?spec.angleDeg*Math.PI/180:0
    const dx=polar?spec.distanceCm*Math.cos(radians):spec.dxCm
    const dy=polar?spec.distanceCm*Math.sin(radians):spec.dyCm
    if(!finite(dx)||!finite(dy))throw Error('INVALID_DELTA')
    edited.points[i]={x:piece.points[i].x+dx,y:piece.points[i].y+dy}
    detail={pointIndex:i,dxCm:dx,dyCm:dy,newPosition:{...edited.points[i]}}
  }else if(spec.kind==='edge.split'){
    const i=index(spec.edgeIndex,piece.points.length,'EDGE_INDEX')
    const t=spec.t ?? spec.fraction
    if(!finite(t)||t<=EPS||t>=1-EPS)throw Error('INVALID_SPLIT_FRACTION')
    if(piece.points.length>=4096)throw Error('POINT_LIMIT')
    const a=piece.points[i],b=piece.points[(i+1)%piece.points.length]
    const inserted={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}
    edited.points.splice(i+1,0,inserted)
    detail={edgeIndex:i,insertedIndex:i+1,insertedPoint:inserted}
  }else throw Error('UNSUPPORTED_OPERATION')
  if(validate(edited.points)!==orientation)throw Error('REVERSED_CONTOUR')
  const gradedSizes=checkedGrades(next)
  return {project:next,detail,validation:{units:'cm',contours:'valid',gradedSizes,manufacturingApproved:false}}
}

/** Read-only chord length of one straight perimeter segment, in centimetres. */
export function measureAccuMarkBoundaryEdge(project,{pieceId,edgeIndex}={}){
  const piece=select(project,pieceId)
  validate(piece.points)
  const i=index(edgeIndex,piece.points.length,'EDGE_INDEX')
  if(piece.curves && Object.hasOwn(piece.curves,String(i)) && piece.curves[i]!=null)throw Error('CURVED_EDGE_REQUIRES_ARC_MEASUREMENT')
  const a=piece.points[i],b=piece.points[(i+1)%piece.points.length]
  return {pieceId,edgeIndex:i,start:{x:a.x,y:a.y},end:{x:b.x,y:b.y},lengthCm:Math.hypot(b.x-a.x,b.y-a.y),units:'cm',measurement:'straight-boundary-segment'}
}
