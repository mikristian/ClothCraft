import {gradeProject} from './grading.js'

// Authored EXO piece coordinates are centimetres. Drafting operations here
// intentionally accept straight, unattached polygons only. A caller must
// explicitly resolve sewing relationships and curved-edge topology elsewhere.
const EPS=1e-8
const validCoordinate=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e7
const finite=p=>p&&validCoordinate(p.x)&&validCoordinate(p.y)
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const area=points=>{const origin=points[0];return points.reduce((sum,p,i)=>{const next=points[(i+1)%points.length];return sum+(p.x-origin.x)*(next.y-origin.y)-(p.y-origin.y)*(next.x-origin.x)},0)/2}
const onSegment=(a,b,p)=>Math.min(a.x,b.x)-EPS<=p.x&&p.x<=Math.max(a.x,b.x)+EPS&&Math.min(a.y,b.y)-EPS<=p.y&&p.y<=Math.max(a.y,b.y)+EPS
function segmentsIntersect(a,b,c,d){
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b)
  if(((x>EPS&&y< -EPS)||(x< -EPS&&y>EPS))&&((z>EPS&&w< -EPS)||(z< -EPS&&w>EPS)))return true
  return Math.abs(x)<=EPS&&onSegment(a,b,c)||Math.abs(y)<=EPS&&onSegment(a,b,d)||Math.abs(z)<=EPS&&onSegment(c,d,a)||Math.abs(w)<=EPS&&onSegment(c,d,b)
}
function validateContour(points){
  if(!Array.isArray(points)||points.length<3||points.length>4096||!points.every(finite))throw Error('INVALID_CONTOUR')
  if(points.some((p,i)=>Math.hypot(p.x-points[(i+1)%points.length].x,p.y-points[(i+1)%points.length].y)<=EPS))throw Error('DEGENERATE_EDGE')
  if(Math.abs(area(points))<=EPS)throw Error('DEGENERATE_AREA')
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    if(j===i+1||(i===0&&j===points.length-1))continue
    if(segmentsIntersect(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))throw Error('SELF_INTERSECTION')
  }
}
function plainPiece(piece){
  const allowed=new Set(['id','name','points','color','fabricId','quantity','cutQty','cutQuantity','material','notes','label','type','category','description','rotation','locked','visible','position','grainAngle','metadata'])
  if(Object.keys(piece).some(k=>!allowed.has(k)))throw Error('UNSUPPORTED_ATTACHED_GEOMETRY')
  if(piece.points.some(p=>Object.keys(p).some(k=>!['x','y'].includes(k))))throw Error('UNSUPPORTED_POINT_METADATA')
}
function unattachedProject(project){
  if(Object.keys(project).some(k=>/seam|stitch|notch|construction|allowance|measure|anchor|dart|curve|pair/i.test(k)&&project[k]!=null&&(Array.isArray(project[k])?project[k].length:typeof project[k]==='object'?Object.keys(project[k]).length:true)))throw Error('UNSUPPORTED_PROJECT_ATTACHMENTS')
}
function indexes(value,n){
  if(!Array.isArray(value)||!value.length||new Set(value).size!==value.length||value.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('INVALID_VERTEX_SELECTION')
  return value
}
const rotate=(p,center,angle)=>({x:center.x+Math.cos(angle)*(p.x-center.x)-Math.sin(angle)*(p.y-center.y),y:center.y+Math.sin(angle)*(p.x-center.x)+Math.cos(angle)*(p.y-center.y)})
const numeric=(v,name)=>{if(!Number.isFinite(v))throw Error(`INVALID_${name}`);return v}

/** Return a new project, a reversible operation specification, and graded validation.
 * Kinds:
 *   alter.local: {indices:[...],dxCm,dyCm,protectedIndices?:[...]}.
 *   fullness.spread: {pivotIndex,indices:[...],angleDeg,protectedIndices?:[...]}.
 *   dart.pivot: {apex:{x,y},legIndices:[i,j],indices:[...],angleDeg,
 *                protectedIndices?:[...]}; both leg vertices must be selected.
 * Rotations are rigid about the given pivot; dart angular intake and leg radii
 * are preserved. The caller provides the correct topology/side selection.
 */
export function applyAccuMarkPatternOperation(project,spec){
  if(!project||!Array.isArray(project.pieces)||!spec||typeof spec!=='object'||typeof spec.pieceId!=='string')throw Error('INVALID_OPERATION')
  const piece=project.pieces.find(p=>p.id===spec.pieceId)
  if(!piece||project.pieces.filter(p=>p.id===spec.pieceId).length!==1)throw Error('UNKNOWN_OR_DUPLICATE_PIECE')
  validateContour(piece.points)
  plainPiece(piece)
  unattachedProject(project)
  const n=piece.points.length,selected=indexes(spec.indices,n)
  const protectedIndices=spec.protectedIndices===undefined?[]:indexes(spec.protectedIndices,n)
  if(selected.some(i=>protectedIndices.includes(i)))throw Error('PROTECTED_BOUNDARY')
  const next=structuredClone(project)
  const edited=next.pieces.find(p=>p.id===spec.pieceId)
  let inverse
  if(spec.kind==='alter.local'){
    const dx=numeric(spec.dxCm,'DX'),dy=numeric(spec.dyCm,'DY')
    if(Math.hypot(dx,dy)<=EPS)throw Error('ZERO_ALTERATION')
    for(const i of selected){edited.points[i].x+=dx;edited.points[i].y+=dy}
    inverse={...structuredClone(spec),dxCm:-dx,dyCm:-dy}
  }else if(spec.kind==='fullness.spread'||spec.kind==='dart.pivot'){
    const angle=numeric(spec.angleDeg,'ANGLE')
    if(Math.abs(angle)<=1e-8||Math.abs(angle)>=179)throw Error('INVALID_SPREAD_ANGLE')
    let pivot
    if(spec.kind==='fullness.spread'){
      if(!Number.isInteger(spec.pivotIndex)||spec.pivotIndex<0||spec.pivotIndex>=n||selected.includes(spec.pivotIndex))throw Error('INVALID_CUT_ANCHOR')
      pivot=piece.points[spec.pivotIndex]
    }else{
      pivot=spec.apex
      if(!finite(pivot)||!Array.isArray(spec.legIndices)||spec.legIndices.length!==2||new Set(spec.legIndices).size!==2||spec.legIndices.some(i=>!selected.includes(i)))throw Error('INVALID_DART_GEOMETRY')
      const [a,b]=spec.legIndices.map(i=>piece.points[i])
      if(Math.hypot(a.x-pivot.x,a.y-pivot.y)<=EPS||Math.hypot(b.x-pivot.x,b.y-pivot.y)<=EPS||Math.abs(cross(pivot,a,b))<=EPS)throw Error('DEGENERATE_DART')
    }
    for(const i of selected)edited.points[i]=rotate(edited.points[i],pivot,angle*Math.PI/180)
    inverse={...structuredClone(spec),angleDeg:-angle}
  }else throw Error('UNSUPPORTED_OPERATION')
  validateContour(edited.points)
  if(Math.sign(area(edited.points))!==Math.sign(area(piece.points)))throw Error('REVERSED_CONTOUR')
  const sizes=project.grading?.sizes?.length?project.grading.sizes:['XS','S','M','L','XL','XXL']
  const checked=[]
  for(const size of sizes){
    const graded=gradeProject(next,size)
    for(const p of graded.pieces)validateContour(p.points)
    checked.push(size)
  }
  return {project:next,inverse,validation:{units:'cm',contours:'valid',gradedSizes:checked,manufacturingApproved:false}}
}
