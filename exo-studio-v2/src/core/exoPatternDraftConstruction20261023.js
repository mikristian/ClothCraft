// Read-only drafting measurements for native pattern polygons. All coordinates
// and lengths are physical metres. Results are numerical approximations.
import {evaluateFreeCurve} from './nativeFreeCurvePoints.js'

const finite = x => typeof x === 'number' && Number.isFinite(x)
const point = p => Array.isArray(p) && p.length === 2 && p.every(finite)
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1])
const fail = reason => ({ok:false,reason})

function validatedEdge(polygon,edge) {
  if (!polygon || !Array.isArray(polygon.edges) || !Array.isArray(polygon.points) ||
      polygon.edges.length < 2 || polygon.edges.length !== polygon.points.length ||
      polygon.edges.length > 4096 || new Set(polygon.edges).size !== polygon.edges.length ||
      !polygon.points.every(point) || typeof edge !== 'string' || !polygon.edges.includes(edge)) return false
  const controls = polygon.curves?.[edge]
  if (controls !== undefined && (!Array.isArray(controls) || controls.length !== 2 || !controls.every(point))) return false
  const marks = polygon.free_curve_points?.[edge]
  if (marks !== undefined && (!Array.isArray(marks) || marks.length > 256 || marks.some((m,i) =>
    !m || !finite(m.t) || m.t <= 0 || m.t >= 1 || (i && m.t <= marks[i-1].t) ||
    !point(m.position) || ['derivative','derivative_in','derivative_out'].some(k => m[k] !== undefined && !point(m[k]))))) return false
  return true
}

/** Adaptive chord approximation with a conservative convergence indicator.
 * Sixteen initial spans prevent midpoint-only sampling from missing S bends.
 * maxDepth bounds work to 8193 curve evaluations, including hostile curves.
 */
export function measureDraftEdge20261023(polygon,edge,{toleranceM=0.00005,maxDepth=9}={}) {
  if (!validatedEdge(polygon,edge) || !finite(toleranceM) || toleranceM <= 0 || toleranceM > .01 ||
      !Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 9) return fail('INVALID_EDGE_OR_OPTIONS')
  const start=evaluateFreeCurve(polygon,edge,0),end=evaluateFreeCurve(polygon,edge,1)
  if (!point(start) || !point(end)) return fail('INVALID_CURVE')
  const stations=[{t:0,position:[...start]}]
  let exceeded=false
  function walk(a,pa,b,pb,depth) {
    const mid=(a+b)/2,pm=evaluateFreeCurve(polygon,edge,mid)
    if (!point(pm)) return false
    const chord=dist(pa,pb),two=dist(pa,pm)+dist(pm,pb)
    if (!finite(two)) return false
    if (two-chord > toleranceM) {
      if (depth >= maxDepth) exceeded=true
      else return walk(a,pa,mid,pm,depth+1) && walk(mid,pm,b,pb,depth+1)
    }
    stations.push({t:b,position:[...pb]})
    return true
  }
  for (let span=0;span<16;span++) {
    const a=span/16,b=(span+1)/16
    const pa=span===0?start:evaluateFreeCurve(polygon,edge,a)
    const pb=span===15?end:evaluateFreeCurve(polygon,edge,b)
    if (!point(pa)||!point(pb)||!walk(a,pa,b,pb,0)) return fail('INVALID_CURVE')
  }
  let lengthM=0
  const cumulativeM=[0]
  for (let i=1;i<stations.length;i++) {
    const segment=dist(stations[i-1].position,stations[i].position)
    lengthM+=segment
    if (!finite(lengthM)) return fail('NONFINITE_LENGTH')
    cumulativeM.push(lengthM)
  }
  if (lengthM <= 1e-9) return fail('COLLAPSED_EDGE')
  return {ok:true,edge,lengthM,stations,cumulativeM,converged:!exceeded,
    accuracy:'APPROXIMATE_CHORD_LENGTH',toleranceM}
}

/** Locate a physical distance along a measured curved edge. Endpoints allowed. */
export function draftNotchByLength20261023(polygon,edge,{distanceM,fraction,...options}={}) {
  const metric=measureDraftEdge20261023(polygon,edge,options)
  if (!metric.ok) return metric
  if ((distanceM === undefined) === (fraction === undefined) ||
      (distanceM !== undefined && (!finite(distanceM)||distanceM<0||distanceM>metric.lengthM)) ||
      (fraction !== undefined && (!finite(fraction)||fraction<0||fraction>1))) return fail('INVALID_NOTCH_STATION')
  if (!metric.converged) return fail('EDGE_MEASUREMENT_NOT_CONVERGED')
  const target=distanceM ?? fraction*metric.lengthM
  let lo=0,hi=metric.cumulativeM.length-1
  while(lo<hi){const m=(lo+hi)>>1;if(metric.cumulativeM[m]<target)lo=m+1;else hi=m}
  const i=Math.max(1,lo),before=metric.cumulativeM[i-1],after=metric.cumulativeM[i]
  const weight=after>before?(target-before)/(after-before):0
  const t=metric.stations[i-1].t+(metric.stations[i].t-metric.stations[i-1].t)*weight
  const position=evaluateFreeCurve(polygon,edge,t)
  if (!point(position)) return fail('INVALID_CURVE')
  return {ok:true,edge,t,position:[...position],distanceM:target,fraction:target/metric.lengthM,
    totalLengthM:metric.lengthM,accuracy:'APPROXIMATE_CHORD_LENGTH',committed:false}
}

/** Check whether two sewing edges can be joined by their physical lengths.
 * Length equality does not certify seam geometry, orientation or manufacturability.
 */
export function compareDraftSeams20261023(leftPolygon,leftEdge,rightPolygon,rightEdge,
  {easeAllowanceM=0,maximumMismatchM=.002,...measureOptions}={}) {
  if (!finite(easeAllowanceM)||!finite(maximumMismatchM)||maximumMismatchM<0||maximumMismatchM>.1)
    return fail('INVALID_SEAM_OPTIONS')
  const left=measureDraftEdge20261023(leftPolygon,leftEdge,measureOptions)
  const right=measureDraftEdge20261023(rightPolygon,rightEdge,measureOptions)
  if (!left.ok||!right.ok) return fail(`INVALID_SEAM_EDGE:${!left.ok?left.reason:right.reason}`)
  if (!left.converged||!right.converged) return fail('SEAM_MEASUREMENT_NOT_CONVERGED')
  const differenceM=left.lengthM-right.lengthM-easeAllowanceM
  return {ok:true,withinTolerance:Math.abs(differenceM)<=maximumMismatchM,
    leftLengthM:left.lengthM,rightLengthM:right.lengthM,easeAllowanceM,differenceM,
    absoluteMismatchM:Math.abs(differenceM),maximumMismatchM,
    accuracy:'APPROXIMATE_LENGTH_ONLY',manufacturingApproved:false}
}

/** Measure an open or closed drafted polyline, rejecting malformed geometry. */
export function measureDraftPolyline20261023(points,{closed=false}={}) {
  if (!Array.isArray(points)||points.length<2||points.length>16384||!points.every(point)||typeof closed!=='boolean')
    return fail('INVALID_POLYLINE')
  if (closed&&points.length<3) return fail('INVALID_CLOSED_POLYLINE')
  let lengthM=0
  const n=closed?points.length:points.length-1
  for(let i=0;i<n;i++) {
    const segment=dist(points[i],points[(i+1)%points.length])
    if(segment<=1e-9)return fail('COLLAPSED_SEGMENT')
    lengthM+=segment
  }
  if(!finite(lengthM))return fail('NONFINITE_LENGTH')
  return {ok:true,lengthM,closed,segmentCount:n,accuracy:'EXACT_STRAIGHT_SEGMENTS'}
}
