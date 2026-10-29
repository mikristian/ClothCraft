import {evaluateFreeCurve} from './nativeFreeCurvePoints.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

// Read-only source-linked on-board measurement geometry. The displayed
// sampled line is a visual trace; millimetres come from the physical curve
// length contract, not the screen polyline.
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const failed=reason=>({ok:false,reason})
// Keep the drawn SVG trace within a quarter millimetre of the authored
// cubic/Hermite contour, even when a short free-knot span bends sharply.
// The physical LENGTH remains the independent Rust-equivalent result.
function tracePhysicalEdge(polygon,edge){
  const begin=evaluateFreeCurve(polygon,edge,0),end=evaluateFreeCurve(polygon,edge,1)
  if(!valid(begin)||!valid(end))throw Error('Invalid physical curve endpoints')
  const trace=[begin]
  const sample=(t0,a,t1,b,depth)=>{
    const mid=(t0+t1)/2,p=evaluateFreeCurve(polygon,edge,mid)
    const quarter=evaluateFreeCurve(polygon,edge,(t0+mid)/2)
    const threeQuarter=evaluateFreeCurve(polygon,edge,(mid+t1)/2)
    if(!valid(p)||!valid(quarter)||!valid(threeQuarter))
      throw Error('Invalid physical curve sample')
    const vx=b[0]-a[0],vy=b[1]-a[1],lengthSquared=vx*vx+vy*vy
    const distanceToChord=q=>{
      const projected=lengthSquared<1e-20?0:
        Math.max(0,Math.min(1,((q[0]-a[0])*vx+(q[1]-a[1])*vy)/lengthSquared))
      return Math.hypot(q[0]-a[0]-vx*projected,q[1]-a[1]-vy*projected)
    }
    const error=Math.max(...[quarter,p,threeQuarter].map(distanceToChord))
    if(error<=.00025){trace.push(b);return}
    if(depth>=14)throw Error('Graded curve requires more subdivisions than the safe display limit')
    if(trace.length>2048)throw Error('Graded POM curve trace exceeds display budget')
    sample(t0,a,mid,p,depth+1)
    sample(mid,p,t1,b,depth+1)
  }
  // Split at source free-knot parameter positions, otherwise a narrow
  // bend around a knot could disappear on a long nearly straight interval.
  const knots=polygon.free_curve_points?.[edge]||[]
  if(!Array.isArray(knots)||knots.length>1024||
    knots.some((k,i)=>!Number.isFinite(k?.t)||k.t<=0||k.t>=1||
      i>0&&k.t<=knots[i-1].t))throw Error('Invalid graded POM free-knot stations')
  const breaks=[0,...knots.map(k=>k.t),1]
  for(let i=1;i<breaks.length;i++){
    const a=evaluateFreeCurve(polygon,edge,breaks[i-1])
    const b=evaluateFreeCurve(polygon,edge,breaks[i])
    if(!valid(a)||!valid(b))throw Error('Invalid graded POM free-knot geometry')
    sample(breaks[i-1],a,breaks[i],b,0)
  }
  return trace
}

export function projectNativeGradedPOMOverlay20261025(definition,polygon,panel,range,size='M'){
  try {
    if(!['XS','S','M','L','XL','XXL'].includes(size))
      return failed('Selected grading size is unavailable')
    if(!definition||!Array.isArray(polygon?.points)||!Array.isArray(polygon?.edges)||
      polygon.points.length<3||polygon.edges.length!==polygon.points.length||
      !valid(range?.layout))return failed('Graded panel geometry is unavailable')
    const rotation=Number(panel?.layout_rotation_degrees||0)*Math.PI/180
    if(!Number.isFinite(rotation))return failed('Invalid panel orientation')
    const cos=Math.cos(rotation),sin=Math.sin(rotation)
    const world=p=>[range.layout[0]+p[0]*cos-p[1]*sin,range.layout[1]+p[0]*sin+p[1]*cos]
    let lengthMm=0,localPoints=[]
    if(definition.kind==='anchor-distance'){
      const a=polygon.points[definition.fromPoint],b=polygon.points[definition.toPoint]
      if(!valid(a)||!valid(b)||definition.fromPoint===definition.toPoint)
        return failed('Invalid measured anchor pair')
      lengthMm=Math.hypot(b[0]-a[0],b[1]-a[1])*1000
      localPoints=[a,b]
    }else{
      let edges
      if(definition.kind==='sewline-edge'){
        edges=[definition.edge]
      }else if(definition.kind==='sewline-path'){
        const from=definition.fromPoint,to=definition.toPoint,count=polygon.points.length
        if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||
          from>=count||to>=count||from===to)return failed('Invalid sewn path anchors')
        edges=[]
        for(let index=from;index!==to;index=(index+1)%count){
          if(edges.length>=count)return failed('Invalid sewn path station order')
          edges.push(polygon.edges[index])
        }
      }else return failed('Unsupported measurement type')
      for(const edge of edges){
        if(typeof edge!=='string'||!polygon.edges.includes(edge))
          return failed('Missing physical sewn edge')
        const measured=nativeRustEdgeLength20261023(polygon,edge)
        if(!measured.ok||!Number.isFinite(measured.totalLengthM)||measured.totalLengthM<=0)
          return failed(measured.reason||'Unmeasurable sewn edge')
        lengthMm+=measured.totalLengthM*1000
        const samples=tracePhysicalEdge(polygon,edge)
        localPoints.push(...(localPoints.length?samples.slice(1):samples))
      }
    }
    if(!Number.isFinite(lengthMm)||lengthMm<=0||lengthMm>10000||
      localPoints.some(p=>!valid(p)))return failed('Nonphysical graded POM length')
    const candidateTarget=definition.targetsMm?.[size]
    if(candidateTarget!==undefined&&candidateTarget!==null&&
      (!Number.isFinite(candidateTarget)||candidateTarget<=0||candidateTarget>10000))
      return failed('Invalid graded POM target')
    if(!Number.isFinite(definition.toleranceMm)&&definition.toleranceMm!==undefined)
      return failed('Invalid graded POM tolerance')
    const targetMm=Number.isFinite(candidateTarget)&&candidateTarget>0&&candidateTarget<=10000
      ?candidateTarget:null
    const deltaMm=targetMm===null?null:lengthMm-targetMm
    const toleranceMm=Number.isFinite(definition.toleranceMm)&&
      definition.toleranceMm>=0&&definition.toleranceMm<=50?definition.toleranceMm:null
    if(definition.toleranceMm!==undefined&&toleranceMm===null)
      return failed('Graded POM tolerance is outside the supported range')
    const status=targetMm===null?'unset':
      toleranceMm===null?'review':Math.abs(deltaMm)<=toleranceMm+1e-7?'pass':'review'
    return {ok:true,points:localPoints.map(world),actualMm:lengthMm,
      targetMm,deltaMm,toleranceMm,status,
      measurementKind:definition.kind,source:'GRADE_RULE_DRAFT_ONLY',
      manufacturingApproved:false}
  } catch(error){return failed(error.message||String(error))}
}
