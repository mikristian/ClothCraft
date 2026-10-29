// Native CLO-style free curve points: independent edge-owned controls.
// Coordinates use physical material metres and t is the base cubic parameter.
// This mirrors garment/polygon.rs: no cutline split or sewing ID replacement.
import {rustCubicAt,rustCubicDerivativeAt,rustCubicPolylineLength} from './rustGeometryKernel.js'
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t)
const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)

export function freeCurveBase(polygon,edge) {
  const i=polygon?.edges?.indexOf(edge)??-1
  const points=polygon?.points||[]
  if(i<0||!validPoint(points[i])||!validPoint(points[(i+1)%points.length]))return null
  const a=points[i],b=points[(i+1)%points.length]
  const controls=polygon.curves?.[edge]||[lerp(a,b,1/3),lerp(a,b,2/3)]
  if(!Array.isArray(controls)||controls.length!==2||!controls.every(validPoint))return null
  return [a,...controls,b]
}

export function cubicAt([a,b,c,d],t) {
  const native=rustCubicAt([a,b,c,d],t)
  if(native!==null)return native
  const left=lerp(lerp(a,b,t),lerp(b,c,t),t)
  const right=lerp(lerp(b,c,t),lerp(c,d,t),t)
  return lerp(left,right,t)
}

export function cubicDerivativeAt([a,b,c,d],t) {
  const native=rustCubicDerivativeAt([a,b,c,d],t)
  if(native!==null)return native
  const u=1-t
  return a.map((_,i)=>3*(u*u*(b[i]-a[i])+2*u*t*(c[i]-b[i])+t*t*(d[i]-c[i])))
}

export function evaluateFreeCurve(polygon,edge,t) {
  const base=freeCurveBase(polygon,edge)
  if(!base||!Number.isFinite(t))return null
  const markers=polygon.free_curve_points?.[edge]||[]
  // Imported or partially edited knots must not introduce NaN coordinates
  // into 2D snapping, labels or split-point selection. Reject the whole edge
  // rather than silently drawing a different contour from the saved data.
  if(!Array.isArray(markers)||markers.some((mark,index)=>
    !mark||!Number.isFinite(mark.t)||mark.t<=0||mark.t>=1||
    (index>0&&mark.t<=markers[index-1].t)||
    !validPoint(mark.position)||
    (mark.derivative!==undefined&&!validPoint(mark.derivative))||
    (mark.derivative_in!==undefined&&!validPoint(mark.derivative_in))||
    (mark.derivative_out!==undefined&&!validPoint(mark.derivative_out))))return null
  const knots=[
    {t:0,position:base[0],derivative:cubicDerivativeAt(base,0)},
    ...markers.map(mark=>({
      t:mark.t,position:mark.position,
      derivative:validPoint(mark.derivative)?mark.derivative:cubicDerivativeAt(base,mark.t),
      derivative_in:validPoint(mark.derivative_in)?mark.derivative_in:undefined,
      derivative_out:validPoint(mark.derivative_out)?mark.derivative_out:undefined,
    })),
    {t:1,position:base[3],derivative:cubicDerivativeAt(base,1)},
  ]
  const target=Math.max(0,Math.min(1,t))
  for(let i=1;i<knots.length;i++){
    if(target>knots[i].t&&i<knots.length-1)continue
    const start=knots[i-1],end=knots[i],span=end.t-start.t
    if(span<=0)return null
    const controlA=start.position.map((v,index)=>v+(start.derivative_out||start.derivative)[index]*span/3)
    const controlB=end.position.map((v,index)=>v-(end.derivative_in||end.derivative)[index]*span/3)
    return cubicAt([start.position,controlA,controlB,end.position],(target-start.t)/span)
  }
  return base[3]
}

// Physical material-space arclength at an authored cubic parameter. Parameter
// t is *not* the length fraction. Sample each exact Hermite segment up to the
// given station so SplitBoundary can snap to the same saved knot in Rust.
// Deterministic, bounded evaluation; the 0.50 mm native snap tolerance is
// intentionally much larger than the numerical quadrature error.
export function arclengthToFreeCurvePoint(polygon,edge,t) {
  if(!Number.isFinite(t)||t<=0||t>=1||!freeCurveBase(polygon,edge))return null
  const knots=[0,...(polygon.free_curve_points?.[edge]||[]).map(mark=>mark.t),1]
  if(knots.some((k,i)=>!Number.isFinite(k)||(i>0&&k<=knots[i-1])))return null
  // When Rust is ready, evaluate exactly the same 128-chord material
  // stations in Rust for every Hermite span. Existing persisted lengths are
  // preserved; before WASM finishes loading, use the reference JS path.
  const base=freeCurveBase(polygon,edge)
  const marks=polygon.free_curve_points?.[edge]||[]
  const stations=[
    {t:0,position:base[0],derivative:cubicDerivativeAt(base,0)},
    ...marks.map(mark=>({t:mark.t,position:mark.position,
      derivative:validPoint(mark.derivative)?mark.derivative:cubicDerivativeAt(base,mark.t),
      derivative_in:validPoint(mark.derivative_in)?mark.derivative_in:undefined,
      derivative_out:validPoint(mark.derivative_out)?mark.derivative_out:undefined})),
    {t:1,position:base[3],derivative:cubicDerivativeAt(base,1)},
  ]
  const lengthInRust=limit=>{
    let total=0
    for(let index=1;index<stations.length;index++){
      const start=stations[index-1],end=stations[index]
      if(limit<=start.t)break
      const span=end.t-start.t
      const until=Math.min(end.t,limit)
      const first=start.derivative_out||start.derivative
      const second=end.derivative_in||end.derivative
      const segment=[start.position,
        start.position.map((v,i)=>v+first[i]*span/3),
        end.position.map((v,i)=>v-second[i]*span/3),end.position]
      const result=rustCubicPolylineLength(segment,0,(until-start.t)/span,128)
      if(result===null||!Number.isFinite(result))return null
      total+=result
      if(limit<=end.t)break
    }
    return total
  }
  const rustAt=lengthInRust(t)
  const rustTotal=rustAt===null?null:lengthInRust(1)
  if(rustAt!==null&&rustTotal!==null) {
    return rustAt>0&&rustAt<rustTotal?{at_m:rustAt,total_m:rustTotal}:null
  }
  const integrate=limit=>{
    let length=0
    let from=0
    let previous=evaluateFreeCurve(polygon,edge,0)
    for(const next of knots.slice(1)){
      const until=Math.min(limit,next)
      if(until<=from)break
      const slices=128
      for(let i=1;i<=slices;i++){
        const sampleT=from+(until-from)*i/slices
        const current=evaluateFreeCurve(polygon,edge,sampleT)
        if(!validPoint(current)||!validPoint(previous))return null
        length+=Math.hypot(current[0]-previous[0],current[1]-previous[1])
        previous=current
      }
      if(limit<=next)break
      from=next
    }
    return length
  }
  const at_m=integrate(t),total_m=integrate(1)
  return Number.isFinite(at_m)&&Number.isFinite(total_m)&&at_m>0&&at_m<total_m
    ?{at_m,total_m}:null
}

export function closestFreeCurveParameter(polygon,edge,localPoint) {
  if(!validPoint(localPoint)||!freeCurveBase(polygon,edge))return null
  let best={t:.5,distance:Infinity}
  // Dense bounded search determines source-edge parameter, not an SVG chord
  // fraction; refines an approximation for curved existing boundaries.
  for(let i=0;i<=160;i++){
    const t=i/160,p=evaluateFreeCurve(polygon,edge,t)
    if(!validPoint(p))return null
    const distance=Math.hypot(p[0]-localPoint[0],p[1]-localPoint[1])
    if(distance<best.distance)best={t,distance}
  }
  let step=1/160
  for(let iteration=0;iteration<12;iteration++){
    for(const t of [best.t-step,best.t+step]){
      if(t<=0||t>=1)continue
      const p=evaluateFreeCurve(polygon,edge,t)
      if(!validPoint(p))return null
      const distance=Math.hypot(p[0]-localPoint[0],p[1]-localPoint[1])
      if(distance<best.distance)best={t,distance}
    }
    step*=.5
  }
  return best
}

const mirrorAxis=polygon=>{
  const xs=polygon.points?.map(p=>p[0])||[]
  return xs.length?(Math.min(...xs)+Math.max(...xs))/2:null
}
export function symmetricCurveEdge(polygon,edge,tolerance=.002) {
  const base=freeCurveBase(polygon,edge),axis=mirrorAxis(polygon)
  if(!base||axis===null)return null
  const reflect=p=>[2*axis-p[0],p[1]]
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
  const a=reflect(base[0]),b=reflect(base[3])
  let best=null
  for(const candidate of polygon.edges){
    const other=freeCurveBase(polygon,candidate)
    if(!other)continue
    const error=Math.max(distance(other[0],b),distance(other[3],a),
      ...[.25,.5,.75].map(t=>distance(reflect(cubicAt(base,t)),cubicAt(other,1-t))))
    if(error<=tolerance&&(!best||error<best.error))best={edge:candidate,axis,error}
  }
  return best
}

const nextMarkerId=(polygon,edge)=>{
  // IDs are stable across a panel, including knots promoted to real vertices
  // by SplitBoundary. Never recycle a consumed free ID from an empty child
  // boundary or the next authoring edit could fail validation on recompile.
  const controls=Object.values(polygon.free_curve_points||{}).flat()
  const promoted=Object.values(polygon.vertex_ids||{}).map(id=>({id}))
  return `free_${[...controls,...promoted].reduce((max,item)=>
    Math.max(max,Number(/^free_(\d+)$/.exec(item.id)?.[1]||0)),0)+1}`
}
const addMarker=(polygon,edge,mark)=>{
  const list=polygon.free_curve_points?.[edge]||[]
  if(list.length>=32||list.some(item=>Math.abs(item.t-mark.t)<.015))return false
  polygon.free_curve_points[edge]=[...list,mark].sort((a,b)=>a.t-b.t)
  return true
}

export function addNativeFreeCurvePoint(polygon,edge,t,{mirror=false}={}) {
  const base=freeCurveBase(polygon,edge)
  if(!base||!Number.isFinite(t)||t<=.01||t>=.99)return null
  const copy=structuredClone(polygon)
  copy.free_curve_points??={}
  let partner=null,group=null
  if(mirror){
    partner=symmetricCurveEdge(polygon,edge)
    if(!partner)return null
    const used=Object.values(copy.free_curve_points).flat()
    group=`mirror_${used.reduce((max,item)=>Math.max(max,Number(/^mirror_(\d+)$/.exec(item.mirror_group)?.[1]||0)),0)+1}`
  }
  const mark={id:nextMarkerId(copy,edge),t,position:evaluateFreeCurve(polygon,edge,t)}
  if(group)mark.mirror_group=group
  if(!addMarker(copy,edge,mark))return null
  if(partner){
    const reflected=[2*partner.axis-mark.position[0],mark.position[1]]
    const other={id:nextMarkerId(copy,partner.edge),t:1-t,position:reflected,mirror_group:group}
    if(!addMarker(copy,partner.edge,other))return null
  }
  return {polygon:copy,mark}
}

export function moveNativeFreeCurvePoint(polygon,edge,id,delta) {
  if(!validPoint(delta)||!freeCurveBase(polygon,edge))return null
  const copy=structuredClone(polygon)
  const mark=copy.free_curve_points?.[edge]?.find(item=>item.id===id)
  if(!mark||!validPoint(mark.position))return null
  if(mark.mirror_group){
    const paired=Object.entries(copy.free_curve_points)
      .flatMap(([otherEdge,points])=>points.filter(item=>item.mirror_group===mark.mirror_group&&
        (otherEdge!==edge||item.id!==id)).map(item=>({edge:otherEdge,item})))
    if(paired.length!==1||paired[0].edge===edge)return null
    const other=paired[0].item
    if(!validPoint(other.position))return null
    other.position=other.position.map((v,i)=>v+(i===0?-delta[i]:delta[i]))
    if(!validPoint(other.position))return null
  }
  mark.position=mark.position.map((v,i)=>v+delta[i])
  if(mark.position.some(v=>!Number.isFinite(v)))return null
  return copy
}

/** Drag an independent knot's tangent handle in material metres. The
 * derivative is measured per unit of its parent edge parameter, not pixels.
 * Preserve a symmetric partner's derivative under horizontal reflection.
 * Alt/Option breaks the opposite visual tangent by editing only this knot;
 * neighboring knots stay untouched. Shift snaps this physical tangent to 45°.
 */
export function editNativeFreeCurveTangent(polygon,edge,id,delta,{snapAngle=false,side='out',breakTangents=false}={}) {
  if(!validPoint(delta))return null
  const base=freeCurveBase(polygon,edge)
  const source=polygon?.free_curve_points?.[edge]?.find(mark=>mark.id===id)
  if(!base||!source||!validPoint(source.position))return null
  const copy=structuredClone(polygon)
  const mark=copy.free_curve_points[edge].find(item=>item.id===id)
  if(!['in','out'].includes(side))return null
  const shared=validPoint(mark.derivative)?mark.derivative:cubicDerivativeAt(base,mark.t)
  const incoming=validPoint(mark[`derivative_${side}`])?mark[`derivative_${side}`]:shared
  let derivative=incoming.map((v,i)=>v+delta[i])
  if(snapAngle){
    const radius=Math.hypot(...derivative),angle=Math.round(Math.atan2(derivative[1],derivative[0])/(Math.PI/4))*(Math.PI/4)
    derivative=[Math.cos(angle)*radius,Math.sin(angle)*radius]
  }
  if(!validPoint(derivative)||Math.hypot(...derivative)>100)return null
  if(breakTangents||mark.derivative_in||mark.derivative_out){
    if(!validPoint(mark.derivative_in))mark.derivative_in=[...shared]
    if(!validPoint(mark.derivative_out))mark.derivative_out=[...shared]
    mark[`derivative_${side}`]=derivative
    delete mark.derivative
  }else mark.derivative=derivative
  if(mark.mirror_group){
    const partners=Object.entries(copy.free_curve_points).flatMap(([name,marks])=>
      marks.filter(item=>item.mirror_group===mark.mirror_group&&item.id!==id)
        .map(item=>({edge:name,item})))
    if(partners.length!==1||partners[0].edge===edge)return null
    // Partner boundary runs the opposite direction: d(p_reflected(1-t))/dt.
    const other=partners[0].item
    if(breakTangents||mark.derivative_in||mark.derivative_out){
      const otherBase=freeCurveBase(copy,partners[0].edge)
      const otherDefault=validPoint(other.derivative)?other.derivative:cubicDerivativeAt(otherBase,other.t)
      if(!validPoint(other.derivative_in))other.derivative_in=[...otherDefault]
      if(!validPoint(other.derivative_out))other.derivative_out=[...otherDefault]
      other[`derivative_${side==='in'?'out':'in'}`]=[derivative[0],-derivative[1]]
      delete other.derivative
    }else other.derivative=[derivative[0],-derivative[1]]
  }
  return copy
}

export function removeNativeFreeCurvePoint(polygon,edge,id) {
  const target=polygon.free_curve_points?.[edge]?.find(mark=>mark.id===id)
  if(!target)return null
  const copy=structuredClone(polygon)
  let removed=0
  for(const [key,marks] of Object.entries(copy.free_curve_points||{})){
    const filtered=marks.filter(mark=>{
      const drop=(key===edge&&mark.id===id)||
        (target.mirror_group&&mark.mirror_group===target.mirror_group)
      if(drop)removed++
      return !drop
    })
    if(filtered.length)copy.free_curve_points[key]=filtered
    else delete copy.free_curve_points[key]
  }
  if(target.mirror_group&&removed!==2)return null
  return copy
}
