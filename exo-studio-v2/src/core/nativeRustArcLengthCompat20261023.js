// Mirrors garment/curves.rs flatten and polygon.rs edge_cubic_spans / edge_points.
// Physical coordinates and all distances are metres.
const FLATNESS_M = 0.00025
const finite = n => typeof n === 'number' && Number.isFinite(n)
const point = p => Array.isArray(p) && p.length === 2 && p.every(finite)
const mix = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
const add = (a,b) => [a[0]+b[0],a[1]+b[1]]
const scale = (a,s) => [a[0]*s,a[1]*s]
const sub = (a,b) => [a[0]-b[0],a[1]-b[1]]
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1])
const derivative = (p,t) => {
  const u=1-t
  return scale(add(add(scale(sub(p[1],p[0]),u*u),scale(sub(p[2],p[1]),2*u*t)),scale(sub(p[3],p[2]),t*t)),3)
}
const halves = p => {
  const a=mix(p[0],p[1],.5),b=mix(p[1],p[2],.5),c=mix(p[2],p[3],.5)
  const d=mix(a,b,.5),e=mix(b,c,.5),f=mix(d,e,.5)
  return [[p[0],a,d,f],[f,e,c,p[3]]]
}
const segmentDistance=(p,a,b)=>{
  const d=sub(b,a),length=d[0]*d[0]+d[1]*d[1]
  const t=Math.max(0,Math.min(1,(sub(p,a)[0]*d[0]+sub(p,a)[1]*d[1])/Math.max(length,1e-30)))
  return dist(p,add(a,scale(d,t)))
}
function flatten(cubic){
  if(!cubic.every(point))throw Error('Invalid Bezier controls')
  const out=[[...cubic[0]]]
  function visit(p,depth){
    if(Math.max(segmentDistance(p[1],p[0],p[3]),segmentDistance(p[2],p[0],p[3]))<=FLATNESS_M){
      out.push(p[3])
      return
    }
    if(depth===16||out.length>4096)throw Error('Bezier subdivision budget exceeded')
    const [left,right]=halves(p)
    visit(left,depth+1);visit(right,depth+1)
  }
  visit(cubic,0)
  if(out.length>4096)throw Error('Curve subdivision budget exceeded')
  return out
}
const length = pts => pts.slice(1).reduce((sum,p,i)=>sum+dist(pts[i],p),0)
function spans(polygon,edge){
  const pts=polygon?.points,edges=polygon?.edges
  if(!Array.isArray(pts)||!Array.isArray(edges)||pts.length<3||pts.length!==edges.length||
    pts.length>4096||!pts.every(point)||edges.some(e=>typeof e!=='string')||
    new Set(edges).size!==edges.length)throw Error('Invalid native polygon')
  const index=edges.indexOf(edge)
  if(index<0)throw Error('Named edge unavailable')
  const a=pts[index],b=pts[(index+1)%pts.length]
  const controls=polygon.curves?.[edge]??[mix(a,b,1/3),mix(a,b,2/3)]
  if(!Array.isArray(controls)||controls.length!==2||!controls.every(point))throw Error('Invalid cubic controls')
  const base=[a,...controls,b],markers=polygon.free_curve_points?.[edge]??[]
  if(!Array.isArray(markers)||markers.length>4096)throw Error('Invalid free curve markers')
  let previousT=0,previousPosition=a,previousDerivative=derivative(base,0)
  const result=[]
  for(const mark of [...markers,{t:1,position:b}]){
    const t=mark.t,p=mark.position
    if(!finite(t)||t<=previousT+1e-6||t>1||!point(p))throw Error('Invalid or unordered free curve point')
    if(mark.mirror_group!=null)throw Error('Mirrored free curve knots require native resolution')
    const incoming=mark.derivative_in??mark.derivative??derivative(base,t)
    const outgoing=mark.derivative_out??mark.derivative??derivative(base,t)
    if(!point(incoming)||!point(outgoing))throw Error('Invalid free curve tangent')
    const span=t-previousT
    result.push({range:[previousT,t],cubic:[previousPosition,add(previousPosition,scale(previousDerivative,span/3)),sub(p,scale(incoming,span/3)),p]})
    previousT=t;previousPosition=p;previousDerivative=outgoing
  }
  return {result,markers}
}
function compute(polygon,edge){
  const {result,markers}=spans(polygon,edge)
  let stations=[],total=0
  for(const entry of result){
    const sampled=flatten(entry.cubic)
    if(!stations.length)stations=[...sampled]
    else stations.push(...sampled.slice(1))
    if(stations.length>4096)throw Error('Free curve subdivision budget exceeded')
    total+=length(sampled)
  }
  if(!finite(total)||total<=0)throw Error('Collapsed or nonfinite boundary')
  return {result,markers,total}
}
function leftCubic(cubic,t){
  const a=mix(cubic[0],cubic[1],t),b=mix(cubic[1],cubic[2],t),c=mix(cubic[2],cubic[3],t)
  const d=mix(a,b,t),e=mix(b,c,t),f=mix(d,e,t)
  return [cubic[0],a,d,f]
}
const at = (c,t) => leftCubic(c,t)[3]
function solve(cubic,atM){
  let lo=0,hi=1
  for(let i=0;i<48;i++){
    const mid=(lo+hi)*.5
    if(length(flatten(leftCubic(cubic,mid)))<atM)lo=mid
    else hi=mid
  }
  return (lo+hi)*.5
}
export function nativeRustEdgeLength20261023(polygon,edge){
  try{
    const data=compute(polygon,edge)
    return {ok:true,totalLengthM:data.total,accuracy:'MATCHES_NATIVE_CURVE_FLATTEN'}
  }catch(e){return {ok:false,reason:e.message||String(e)}}
}
export function nativeRustArcLengthStation20261023(polygon,edge,{distanceM}={}){
  try{
    if(!finite(distanceM)||distanceM<=0)throw Error('Split distance must be positive finite metres')
    const {result,markers,total}=compute(polygon,edge)
    if(distanceM>=total)throw Error('Split position beyond native boundary')
    // Native SplitBoundary supports ordinary free knots via split_free_curve_geometry;
    // mirrored knots are rejected. Match canonical_free_split_station's nearest
    // free-knot selection within 0.5 mm of the requested material arclength.
    let target=distanceM,snappedToFreeKnot=false
    if(markers.length){
      let consumed=0
      let nearestDifference=Infinity
      for(let i=0;i<result.length-1;i++){
        consumed+=length(flatten(result[i].cubic))
        const difference=Math.abs(consumed-distanceM)
        if(difference<=.0005&&difference<nearestDifference){
          target=consumed;nearestDifference=difference;snappedToFreeKnot=true
        }
      }
    }
    let remaining=target
    for(let i=0;i<result.length;i++){
      const {cubic,range}=result[i],partLength=length(flatten(cubic))
      if(remaining<=partLength||i===result.length-1){
        const local=solve(cubic,Math.max(0,Math.min(partLength,remaining)))
        const position=at(cubic,local),t=range[0]+(range[1]-range[0])*local
        if(!point(position)||!finite(t))throw Error('Nonfinite station')
        return {ok:true,totalLengthM:total,position,t,canonicalDistanceM:target,
          snappedToFreeKnot,hasFreeKnots:markers.length>0,
          accuracy:'MATCHES_NATIVE_CURVE_FLATTEN'}
      }
      remaining-=partLength
    }
    throw Error('Unable to locate curve station')
  }catch(e){return {ok:false,reason:e.message||String(e)}}
}
