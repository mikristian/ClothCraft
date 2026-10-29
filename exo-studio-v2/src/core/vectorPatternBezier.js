// Ported VectorCraft anchor editing, adapted to EXO's material-space metres.
// A pattern edge stores [outgoingControl, incomingControl] in panel-local space.
// Unlike a drawing-only vector handle, changes are persisted in native Rust Shape.
import {vectorcraftAnchorKind,setVectorcraftHandle} from './vectorcraftAnchorPort.js'
import {rustCubicComponent} from './rustCoreMathKernel.js'
const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]]
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]

/** 45° handle snapping with exact physical radius retention. */
export function snapControlAngle(anchor,point,step=Math.PI/4) {
  if(!validPoint(anchor)||!validPoint(point)||!(step>0))return point
  const dx=point[0]-anchor[0],dy=point[1]-anchor[1],radius=Math.hypot(dx,dy)
  if(radius<1e-12)return point
  const angle=Math.round(Math.atan2(dy,dx)/step)*step
  return [anchor[0]+Math.cos(angle)*radius,anchor[1]+Math.sin(angle)*radius]
}

/** Illustrator Anchor Point gesture: drag outward from a fixed corner to
 * create opposed, smooth incoming/outgoing handles in material space. */
export function dragPatternAnchorHandles(polygon,index,delta,{snapAngle=false}={}) {
  if(!polygon||!Array.isArray(polygon.points)||!Array.isArray(polygon.edges)||
     !Number.isInteger(index)||index<0||index>=polygon.points.length||
     polygon.edges.length!==polygon.points.length||!validPoint(delta)||
     distance(delta,[0,0])<1e-9)return null
  const next=structuredClone(polygon),n=next.points.length
  const anchor=next.points[index]
  if(!validPoint(anchor))return null
  const outgoing=next.edges[index],incoming=next.edges[(index+n-1)%n]
  if(typeof outgoing!=='string'||typeof incoming!=='string'||outgoing===incoming)return null
  const end=snapAngle?snapControlAngle(anchor,add(anchor,delta)):add(anchor,delta)
  const d=sub(end,anchor)
  next.curves??={}
  for(const edgeIndex of [index,(index+n-1)%n]){
    const edge=next.edges[edgeIndex]
    if(!next.curves[edge]){
      const a=next.points[edgeIndex],b=next.points[(edgeIndex+1)%n]
      if(!validPoint(a)||!validPoint(b))return null
      next.curves[edge]=[lerp(a,b,1/3),lerp(a,b,2/3)]
    }
  }
  next.curves[outgoing][0]=add(anchor,d)
  next.curves[incoming][1]=sub(anchor,d)
  return next
}

/** VectorCraft path.reshapeSegment, adapted from its MIT/Apache-2 Rust SubPath
 * bend_segment and bend_segment_perpendicular operations.
 * The two material anchors remain fixed. Dragging a point on the edge at t
 * moves that cubic point by the pointer delta. Existing smoothly joined
 * neighboring controls rotate with their anchor, but corner controls do not.
 * All coordinates and the delta are physical material metres, not CSS px.
 */
export function reshapePatternBezierSegment(polygon,edge,t,delta,{perpendicular=false}={}) {
  const n=polygon?.points?.length||0,k=polygon?.edges?.indexOf(edge)??-1
  if(n<3||k<0||polygon.edges.length!==n||!validPoint(delta)||
    !Number.isFinite(t)||t<0||t>1||distance(delta,[0,0])<1e-12)return null
  // Native free stations have their own independent tangent/arc-length
  // topology. Never overwrite them with a base-only curve reshape.
  if(polygon.free_curve_points?.[edge]?.length)return null
  const next=structuredClone(polygon),a=next.points[k],b=next.points[(k+1)%n]
  if(!validPoint(a)||!validPoint(b)||distance(a,b)<1e-12)return null
  const fraction=Math.max(.05,Math.min(.95,t))
  const previous=next.edges[(k+n-1)%n],following=next.edges[(k+1)%n]
  const baseline=next.curves?.[edge]||[lerp(a,b,1/3),lerp(a,b,2/3)]
  if(!Array.isArray(baseline)||baseline.length!==2||!baseline.every(validPoint))return null
  let c1,c2
  const gain=3*fraction*(1-fraction)
  if(perpendicular){
    const chord=sub(b,a),length=distance(a,b)
    const normal=[-chord[1]/length,chord[0]/length]
    const curvePoint=cubicAt(a,baseline[0],baseline[1],b,fraction)
    const desired=add(curvePoint,delta)
    const distanceNormal=((desired[0]-a[0])*normal[0]+(desired[1]-a[1])*normal[1])/gain
    const vector=normal.map(value=>value*distanceNormal)
    c1=add(a,vector);c2=add(b,vector)
  }else{
    const vector=delta.map(value=>value/gain)
    c1=add(baseline[0],vector);c2=add(baseline[1],vector)
  }
  if(!validPoint(c1)||!validPoint(c2))return null
  const previousControl=next.curves?.[previous]?.[1]
  const followingControl=next.curves?.[following]?.[0]
  const smoothAtStart=validPoint(previousControl)&&
    vectorcraftAnchorKind(a,previousControl,baseline[0])==='smooth'
  const smoothAtEnd=validPoint(followingControl)&&
    vectorcraftAnchorKind(b,baseline[1],followingControl)==='smooth'
  next.curves??={}
  next.curves[edge]=[c1,c2]
  if(smoothAtStart){
    const updated=setVectorcraftHandle({p:a,hIn:previousControl,hOut:baseline[0],kind:'smooth'},true,c1)
    if(updated)next.curves[previous][1]=updated.hIn
  }
  if(smoothAtEnd){
    const updated=setVectorcraftHandle({p:b,hIn:baseline[1],hOut:followingControl,kind:'smooth'},false,c2)
    if(updated)next.curves[following][0]=updated.hOut
  }
  return next
}

/** Move one native control with optional Illustrator-style smooth continuity.
 *  Alt breaks the opposite tangent. Shift constrains the edited tangent to 45°.
 *  Adjacent handle length is preserved, so the neighboring edge remains stable.
 */
export function editPatternBezierHandle(polygon,edge,index,delta,{breakTangents=false,snapAngle=false,mirrorTangents=false,mirrorAcrossPattern=false}={}) {
  if(!polygon||!Array.isArray(polygon.edges)||!Array.isArray(polygon.points))return null
  const n=polygon.points.length,k=polygon.edges.indexOf(edge)
  if(n<3||k<0||!validPoint(delta)||![0,1].includes(index)||!polygon.curves?.[edge]?.[index])return null
  const next=structuredClone(polygon)
  const vertex=index===0?k:(k+1)%n
  const anchor=next.points[vertex]
  const initial=next.curves[edge][index],requested=add(initial,delta)
  const moved=snapAngle?snapControlAngle(anchor,requested):requested
  if(!validPoint(moved))return null
  const peerIndex=index===0?1:0
  const peerEdge=next.edges[index===0?(k+n-1)%n:(k+1)%n]
  // The adjacent edge may still be straight (common at the side seam/hem).
  // Opt-in mirroring creates its control so symmetry works at every vertex.
  if(mirrorTangents&&!breakTangents&&!next.curves?.[peerEdge]){
    const a=next.points[index===0?(k+n-1)%n:(k+1)%n]
    const b=next.points[index===0?k:(k+2)%n]
    if(!validPoint(a)||!validPoint(b))return null
    next.curves??={}
    next.curves[peerEdge]=[lerp(a,b,1/3),lerp(a,b,2/3)]
  }
  const peer=next.curves[peerEdge]?.[peerIndex]
  const hIn=index===0?peer:initial,hOut=index===0?initial:peer
  const state={
    p:anchor,hIn:validPoint(hIn)?hIn:anchor,
    hOut:validPoint(hOut)?hOut:anchor,
    kind:mirrorTangents&&!breakTangents?'smooth':vectorcraftAnchorKind(anchor,validPoint(hIn)?hIn:anchor,validPoint(hOut)?hOut:anchor),
  }
  const updated=setVectorcraftHandle(state,index===0,moved,{independent:breakTangents})
  if(!updated)return null
  next.curves[edge][index]=index===0?updated.hOut:updated.hIn
  if(validPoint(peer))next.curves[peerEdge][peerIndex]=index===0?updated.hIn:updated.hOut
  if(mirrorAcrossPattern){
    // Match boundary endpoints, independent of their control geometry. Existing
    // opposite-side curves may already be asymmetric while the user edits them.
    const axis=(Math.min(...polygon.points.map(p=>p[0]))+Math.max(...polygon.points.map(p=>p[0])))/2
    const reflect=p=>[2*axis-p[0],p[1]]
    const a=reflect(polygon.points[k]),b=reflect(polygon.points[(k+1)%n])
    const tolerance=.002
    const matches=[]
    for(let j=0;j<n;j++){
      const start=polygon.points[j],end=polygon.points[(j+1)%n]
      if(distance(start,b)<=tolerance&&distance(end,a)<=tolerance)
        matches.push({j,error:Math.max(distance(start,b),distance(end,a))})
    }
    matches.sort((a,b)=>a.error-b.error)
    if(matches.length===1||matches.length>1&&matches[0].error+1e-9<matches[1].error){
      const partner=next.edges[matches[0].j]
      next.curves??={}
      if(matches[0].j===k){
        // A symmetric hem is its own partner. Only reflect the handle being
        // dragged into the opposite slot; never overwrite that source slot.
        next.curves[edge][1-index]=reflect(next.curves[edge][index])
      }else{
        next.curves[partner]=[reflect(next.curves[edge][1]),reflect(next.curves[edge][0])]
      }
    }
  }
  return next
}

export function cubicAt(a,c1,c2,b,t) {
  return [0,1].map(i=>rustCubicComponent(a[i],c1[i],c2[i],b[i],t))
}

/** Split existing cubic at pointer fraction without changing the contour.
 *  This can later drive a topology-aware SplitBoundary native operation.
 */
export function splitCubic(a,c1,c2,b,t) {
  if(![a,c1,c2,b].every(validPoint)||!(t>0&&t<1))return null
  const ab=lerp(a,c1,t),bc=lerp(c1,c2,t),cd=lerp(c2,b,t)
  const abc=lerp(ab,bc,t),bcd=lerp(bc,cd,t),middle=lerp(abc,bcd,t)
  return {middle,left:[a,ab,abc,middle],right:[middle,bcd,cd,b]}
}

/** Arc length in metres. Used for real pattern dimensions, not pixels. */
export function cubicLength(a,c1,c2,b,steps=96) {
  if(![a,c1,c2,b].every(validPoint))return NaN
  let length=0,last=a
  for(let i=1;i<=steps;i++){
    const point=cubicAt(a,c1,c2,b,i/steps)
    length+=distance(last,point);last=point
  }
  return length
}

// Preview only; Rust's remap_anchors is authoritative when the gesture ends.
// Preserve the corner or smooth shape as an anchor moves: carry its incoming
// and outgoing controls by the exact same local-metre delta.
export function previewPatternAnchorMove(polygon,index,delta) {
  if(!polygon||!Array.isArray(polygon.points)||!Array.isArray(polygon.edges)
    ||!Number.isInteger(index)||index<0||index>=polygon.points.length
    ||!validPoint(delta))return null
  const next=structuredClone(polygon)
  next.points[index]=add(next.points[index],delta)
  const n=next.points.length
  const outgoing=next.curves?.[next.edges[index]]
  const incoming=next.curves?.[next.edges[(index+n-1)%n]]
  if(outgoing?.[0])outgoing[0]=add(outgoing[0],delta)
  if(incoming?.[1])incoming[1]=add(incoming[1],delta)
  return next
}

/** Materialize collinear controls only in an editing preview. Selection alone
 * never writes the document. The normal native Shape transaction commits drag.
 */
export function patternEditingControls(polygon,edges) {
  const next=structuredClone(polygon)
  if(!next?.points?.length||!next.edges)return next
  next.curves={...next.curves}
  for(const edge of edges){
    const i=next.edges.indexOf(edge)
    if(i<0||next.curves[edge]||next.free_curve_points?.[edge]?.length)continue
    const a=next.points[i],b=next.points[(i+1)%next.points.length]
    next.curves[edge]=[1/3,2/3].map(t=>a.map((v,j)=>v+(b[j]-v)*t))
  }
  return next
}

/** View-only handle arm extension; never changes material coordinates. */
export function visibleTangent(anchor,control,screenUnit,fixedScale) {
  const length=Math.hypot(control[0]-anchor[0],control[1]-anchor[1])
  const scale=fixedScale||Math.max(1,32*screenUnit/Math.max(length,1e-9))
  return {point:control.map((v,i)=>anchor[i]+(v-anchor[i])*scale),scale}
}
