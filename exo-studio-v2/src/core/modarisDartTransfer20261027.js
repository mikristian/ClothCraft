/**
 * Detached geometric feasibility preview for a single dart closure.
 * Legacy internalLines type='dart' has no guaranteed pair of dart legs or
 * sewn-edge equivalence. Consequently this API never writes a pattern piece.
 * Explicit point-index legs, apex and a contiguous boundary interval are
 * supplied by the caller and verified against current project geometry.
 */
const fail = message => {throw new Error(`Modaris dart transfer preview refused: ${message}`)}
const finite = n => typeof n === 'number' && Number.isFinite(n)
const clone = value => structuredClone(value)
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const signedArea = points => points.reduce((sum,p,i)=>sum+p.x*points[(i+1)%points.length].y-p.y*points[(i+1)%points.length].x,0)/2
const equal = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)<1e-8
function intersects(a,b,c,d) {
  const eps=1e-9
  const s1=cross(a,b,c),s2=cross(a,b,d),s3=cross(c,d,a),s4=cross(c,d,b)
  if ((s1>eps&&s2 < -eps || s1 < -eps&&s2>eps) && (s3>eps&&s4 < -eps || s3 < -eps&&s4>eps))return true
  const on=(p,q,r)=>Math.abs(cross(p,q,r))<=eps&&r.x>=Math.min(p.x,q.x)-eps&&r.x<=Math.max(p.x,q.x)+eps&&r.y>=Math.min(p.y,q.y)-eps&&r.y<=Math.max(p.y,q.y)+eps
  return on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)
}
function simple(points){
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    if(j===i+1||(i===0&&j===points.length-1))continue
    if(intersects(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))return false
  }
  return true
}
const angle=(a,apex)=>Math.atan2(a.y-apex.y,a.x-apex.x)
const rotate=(p,apex,theta)=>({x:apex.x+(p.x-apex.x)*Math.cos(theta)-(p.y-apex.y)*Math.sin(theta),y:apex.y+(p.x-apex.x)*Math.sin(theta)+(p.y-apex.y)*Math.cos(theta)})

/** Read-only closure preview; no project mutation, sewing or grading changes. */
export function previewModarisDartTransfer20261027(project,{expectedRevision,pieceId,apex,firstLegIndex,secondLegIndex,rotateFromIndex,rotateToIndex,targetEdgeIndex}={}){
  if(!Number.isSafeInteger(expectedRevision)||project?.revision!==expectedRevision)fail('stale project revision')
  if(!Array.isArray(project?.pieces)||project.pieces.filter(p=>p?.id===pieceId).length!==1)fail('unknown or ambiguous piece')
  const piece=project.pieces.find(p=>p.id===pieceId),points=piece.points
  if(!Array.isArray(points)||points.length<4||points.length>256||points.some(p=>!finite(p.x)||!finite(p.y)))fail('invalid boundary')
  if(!apex||!finite(apex.x)||!finite(apex.y))fail('apex required')
  const indices=[firstLegIndex,secondLegIndex,rotateFromIndex,rotateToIndex,targetEdgeIndex]
  if(indices.some(i=>!Number.isSafeInteger(i)||i<0||i>=points.length))fail('invalid vertex or edge index')
  if(firstLegIndex===secondLegIndex || rotateFromIndex>rotateToIndex || rotateFromIndex===rotateToIndex || !([rotateFromIndex,rotateToIndex].includes(firstLegIndex)))fail('unsupported leg interval')
  if(targetEdgeIndex>=rotateFromIndex && targetEdgeIndex<=rotateToIndex)fail('target cut edge cannot belong to rotated interval')
  if(!simple(points)||Math.abs(signedArea(points))<1e-8)fail('invalid original polygon winding or intersection')
  if(piece.curves&&Object.keys(piece.curves).length||piece.notches?.length||piece.internalLines?.length||piece.seams?.length||project.seams?.length||project.customMeasurements?.length||project.productionSpec||project.industrialAllowanceGraph||project.modarisSizeLinkedGrade||piece.gradeSize||points.some(p=>p.industrialGradeRule||p.gradeRule||p.namedGradeRuleRef))fail('graded, sewn, marked or production-attached geometry unsupported')
  if((project.grading?.sizes?.length??0)>1)fail('multi-size grading unsupported')
  const first=points[firstLegIndex],second=points[secondLegIndex]
  const ra=Math.hypot(first.x-apex.x,first.y-apex.y),rb=Math.hypot(second.x-apex.x,second.y-apex.y)
  if(!(ra>1e-7&&rb>1e-7)||Math.abs(ra-rb)>1e-7)fail('dart legs must share apex radius')
  let theta=angle(first,apex)-angle(second,apex)
  theta=Math.atan2(Math.sin(theta),Math.cos(theta))
  if(Math.abs(theta)<1e-6||Math.abs(theta)>Math.PI/2)fail('unsupported dart intake angle')
  if(firstLegIndex!==rotateFromIndex)theta=-theta
  const rotated=points.map((p,i)=>i>=rotateFromIndex&&i<=rotateToIndex?{...p,...rotate(p,apex,theta)}:{...p})
  const candidate=rotated.map(p=>({x:p.x,y:p.y}))
  const baseline=signedArea(points),after=signedArea(candidate)
  if(!simple(candidate)||baseline*after<=0)fail('closure creates crossing edges or reverses winding')
  const originalIntake=Math.abs(Math.atan2(Math.sin(angle(second,apex)-angle(first,apex)),Math.cos(angle(second,apex)-angle(first,apex))))
  return {kind:'detached-dart-closure-preview',productionApproved:false,projectUnchanged:true,pieceId,sourceRevision:expectedRevision,
    apex:clone(apex),firstLegIndex,secondLegIndex,targetEdgeIndex,rotationRadians:theta,intakeRadians:originalIntake,
    originalSignedAreaCm2:baseline,previewSignedAreaCm2:after,areaChangeCm2:after-baseline,
    originalPoints:clone(points),previewPoints:rotated,
    limitations:['Detached closure geometry only; legacy schema lacks authenticated dart-leg pair and target opening construction','Area can change when a wedge is closed; no transfer/opening at selected edge is generated','No seam/cut graph regeneration, grading, marks, sewing, production approval or commit API']}
}
