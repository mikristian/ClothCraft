import {evaluateFreeCurve} from './nativeFreeCurvePoints.js'

// Native ClothCraft polygon coordinates are METRES. Numeric drafting inputs
// are MILLIMETRES. This is a construction proposal, NOT a persistent Seamly
// measurement dependency graph or a grading/manufacturing approval.
export const NATIVE_POINT_CONSTRUCTIONS = Object.freeze({
  along: 'Distance from point A along A→B',
  normal: 'Perpendicular distance from point A to A→B',
  project: 'Project target onto infinite line A→B',
  mirror: 'Reflect target across infinite line A→B',
  intersect: 'Intersection of infinite lines A→B and C→D',
  polar: 'Measured distance + angle from point A',
})

const validPoint = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)
const sub = (a,b) => [a[0]-b[0],a[1]-b[1]]
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]
const cross = (a,b) => a[0]*b[1]-a[1]*b[0]
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1])
const vector=(a,b)=>sub(b,a)
const plus=(a,v,t)=>[a[0]+v[0]*t,a[1]+v[1]*t]
// Never let Number() reinterpret authored millimetres, angles or point indices
// as hexadecimal/binary/octal literals, booleans, arrays or coercible objects.
const decimal=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const numeric=value=>{
  if(typeof value==='number')return value
  if(typeof value==='string'&&decimal.test(value.trim()))return Number(value.trim())
  return NaN
}
const finite=(value,name)=>{const n=numeric(value);if(!Number.isFinite(n))throw Error(`${name} must be a finite decimal number`);return n}
const integer=(value,count,name)=>{const n=numeric(value);if(!Number.isInteger(n)||n<0||n>=count)throw Error(`${name} must be a valid point index`);return n}
const signArea=pts=>pts.reduce((sum,p,i)=>sum+cross(p,pts[(i+1)%pts.length]),0)*.5

function intersectSegments(a,b,c,d,tol=1e-8){
  const u=vector(a,b),v=vector(c,d),w=vector(a,c),den=cross(u,v)
  if(Math.abs(den)<=tol*dist(a,b)*dist(c,d)){
    // Reject collinear touching only when actually within segment extents.
    const on=(p,x,y)=>Math.abs(cross(vector(x,y),vector(x,p)))<tol &&
      dot(vector(x,p),vector(y,p))<=tol
    return [a,b].some(p=>on(p,c,d))||[c,d].some(p=>on(p,a,b))
  }
  const t=cross(w,v)/den,s=cross(w,u)/den
  return t>=-tol&&t<=1+tol&&s>=-tol&&s<=1+tol
}

/** Sample exactly the authored native polygon's cubic/free-knot evaluator.
 * This is a bounded topology guard, not a sub-millimetre factory QA claim. */
export function sampleNativeConstructionContour(polygon){
  const vertices=polygon?.points,edges=polygon?.edges
  if(!Array.isArray(vertices)||!Array.isArray(edges)||vertices.length<3||
    vertices.length>128||edges.length!==vertices.length||
    !vertices.every(validPoint)||edges.some(e=>typeof e!=='string')||
    new Set(edges).size!==edges.length)throw Error('Invalid or overly complex native panel')
  const steps=Math.min(12,Math.floor(256/edges.length))
  if(steps<2)throw Error('Panel exceeds bounded construction QA capacity')
  const sampled=[]
  for(const edge of edges){
    for(let i=0;i<steps;i++){
      const pt=evaluateFreeCurve(polygon,edge,i/steps)
      if(!validPoint(pt))throw Error('Unreliable native curve or free-point data')
      if(sampled.length&&dist(sampled.at(-1),pt)<=1e-9)continue
      sampled.push(pt)
    }
  }
  if(sampled.length<3||sampled.length>256)throw Error('Construction contour exceeds sampling limit')
  return sampled
}

function contourPreflight(polygon){
  const points=sampleNativeConstructionContour(polygon),n=points.length
  const area=signArea(points)
  if(!Number.isFinite(area)||Math.abs(area)<1e-9)throw Error('Pattern contour has negligible area')
  for(let i=0;i<n;i++){
    if(dist(points[i],points[(i+1)%n])<1e-6)throw Error('Pattern has a collapsed sampled edge')
    for(let j=i+1;j<n;j++){
      if(j===i+1||(i===0&&j===n-1))continue
      if(intersectSegments(points[i],points[(i+1)%n],points[j],points[(j+1)%n]))throw Error('Pattern contour self-intersects')
    }
  }
  return {area,points}
}

/** The Rust authoring.rs remap_anchors contract translates the two adjacent
 * cubic handles along with an Anchor. Sampling a polygon with only its
 * vertex moved can falsely approve curved edits the native engine rejects.
 * This immutable preflight mirrors Rust's *material-coordinate* change;
 * Rust additionally normalizes local origin/layout and follows coincident
 * pins when it commits the command. */
export function simulateNativeAnchorRemap20261023(polygon,pointIndex,position){
  const points=polygon?.points,edges=polygon?.edges
  if(!Array.isArray(points)||!Array.isArray(edges)||points.length<3||
    points.length!==edges.length||!Number.isInteger(pointIndex)||
    pointIndex<0||pointIndex>=points.length||!validPoint(position)||
    !validPoint(points[pointIndex]))throw Error('Invalid native anchor remap')
  const next=structuredClone(polygon)
  const previous=points[pointIndex]
  const delta=sub(position,previous)
  next.points[pointIndex]=[...position]
  for(const [edgeName,handle] of [
    [edges[pointIndex],0],
    [edges[(pointIndex+points.length-1)%points.length],1],
  ]){
    const controls=next.curves?.[edgeName]
    if(controls===undefined)continue
    if(!Array.isArray(controls)||controls.length!==2||!controls.every(validPoint))
      throw Error('Invalid adjacent native cubic controls')
    controls[handle]=plus(controls[handle],delta,1)
  }
  return next
}

/**
 * Returns native undoable `Anchor` edit if both old and proposed contours
 * clear bounded validity checks. Any seam/ease/grade acceptance remains with
 * the Rust edit engine and separate engineering QA.
 */
export function buildNativeParametricPointProposal(snapshot,{panelId,pointIndex,mode='along',a=0,b=1,c=2,d=3,distanceMm=20,angleDeg=0,allowUnchanged=false}={}){
  try{
    if(!snapshot?.template?.panels||typeof panelId!=='string'||!Object.hasOwn(NATIVE_POINT_CONSTRUCTIONS,mode))throw Error('Unknown panel or construction mode')
    const panels=snapshot.template.panels.filter(p=>p?.id===panelId)
    if(panels.length!==1)throw Error('Select one existing native garment panel')
    const panel=panels[0],original=panel.polygon
    const pts=original?.points,n=pts?.length
    if(!Array.isArray(pts)||n<3||n>128||pts.some(p=>!validPoint(p)))throw Error('Panel points are invalid')
    const target=integer(pointIndex,n,'Target'),A=pts[integer(a,n,'Reference A')]
    const old=pts[target],metric=finite(distanceMm,'Distance (mm)')
    if(Math.abs(metric)>5000)throw Error('Distance must be within ±5000 mm')
    const length=metric/1000
    let result
    if(mode==='polar'){
      const angle=finite(angleDeg,'Angle (degrees)')
      if(Math.abs(angle)>36000)throw Error('Angle magnitude is too large')
      result=plus(A,[Math.cos(angle*Math.PI/180),Math.sin(angle*Math.PI/180)],length)
    }else{
      const B=pts[integer(b,n,'Reference B')],u=vector(A,B),square=dot(u,u)
      if(square<1e-12)throw Error('Reference points A and B coincide')
      if(mode==='along'||mode==='normal'){
        const mag=Math.sqrt(square)
        result=plus(A,mode==='along'?[u[0]/mag,u[1]/mag]:[-u[1]/mag,u[0]/mag],length)
      }else if(mode==='project'||mode==='mirror'){
        const foot=plus(A,u,dot(vector(A,old),u)/square)
        result=mode==='project'?foot:[2*foot[0]-old[0],2*foot[1]-old[1]]
      }else{
        const C=pts[integer(c,n,'Reference C')],D=pts[integer(d,n,'Reference D')]
        const v=vector(C,D),den=cross(u,v)
        if(dot(v,v)<1e-12)throw Error('Reference line C–D has zero length')
        if(Math.abs(den)<=1e-10*Math.sqrt(square*dot(v,v)))throw Error('Construction lines are parallel or coincident')
        result=plus(A,u,cross(vector(A,C),v)/den)
      }
    }
    if(!validPoint(result)||result.some(value=>Math.abs(value)>10))throw Error('Constructed coordinates outside supported material range')
    const displacement=dist(old,result)
    const unchanged=displacement<1e-8
    // A direct manual point command must change geometry. Linked measurement
    // plans also need to describe an already-satisfied point after a verified
    // native commit, so their read-only evaluator opts into this no-op case.
    if(unchanged&&!allowUnchanged)throw Error('Construction does not change the selected point')
    // Native Anchor also shifts its adjacent cubic control handles, while
    // preserving named edges, other points and authored free knots. Match
    // THAT preview geometry before claiming a safe command proposal.
    const before=contourPreflight(original)
    const proposed=simulateNativeAnchorRemap20261023(original,target,result)
    const after=contourPreflight(proposed)
    if(Math.sign(after.area)!==Math.sign(before.area))throw Error('Construction reverses contour winding')
    if(Math.abs(after.area)<Math.abs(before.area)*.001)throw Error('Construction collapses panel area')
    const revision=snapshot.revision
    if(!Number.isSafeInteger(revision)||revision<0)throw Error('Native snapshot revision is unavailable')
    return {ok:true,units:'mm',panelId,pointIndex:target,mode,revision,unchanged,
      originalMm:old.map(x=>x*1000),proposedMm:result.map(x=>x*1000),
      displacementMm:displacement*1000,
      sampledAreaBeforeMm2:Math.abs(before.area)*1e6,
      sampledAreaAfterMm2:Math.abs(after.area)*1e6,
      command:{kind:'Anchor',panel:panelId,anchor:target,position:[...result]},
      source:'NUMERIC_POINT_PROPOSAL_NOT_COMMITTED',manufacturingApproved:false,
      caveat:'Curved contour sampled for topology screening; only Rust can accept the native edit. Existing seams, grade rules and production QA require revalidation.'}
  }catch(error){return {ok:false,reason:error.message||String(error),manufacturingApproved:false}}
}
