// Live corner control adapted to EXO's material-space Bézier representation.
// The control is inset from the vertex in its interior-angle bisector, just
// like the circular live-corner affordance in vector drawing applications.
import {dragPatternAnchorHandles} from './vectorPatternBezier.js'

const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const unit=v=>{const m=Math.hypot(...v);return m>1e-10?v.map(n=>n/m):null}
const plus=(a,b)=>a.map((n,i)=>n+b[i])
const minus=(a,b)=>a.map((n,i)=>n-b[i])
const scale=(v,n)=>v.map(x=>x*n)
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v))

export function cornerWidgetGeometry(points,index,{closed=false,offset=.018}={}){
  if(!Array.isArray(points)||!Number.isInteger(index)||index<0||index>=points.length||
    points.length<2)return null
  const n=points.length,p=points[index],prev=points[(index+n-1)%n],next=points[(index+1)%n]
  if(!closed&&(index===0||index===n-1)){
    const neighbor=points[index===0?1:n-2]
    if(!finitePoint(p)||!finitePoint(neighbor))return null
    const segment=index===0?minus(neighbor,p):minus(p,neighbor)
    const tangent=unit(segment),minEdge=Math.hypot(...segment)
    if(!tangent||minEdge<1e-7)return null
    const inward=[-tangent[1],tangent[0]]
    const inset=clamp(offset,Math.min(.0003,minEdge*.05),minEdge*.4)
    return {anchor:[...p],inward,tangent,minEdge,center:plus(p,scale(inward,inset))}
  }
  if(![p,prev,next].every(finitePoint))return null
  const intoPrev=minus(prev,p),intoNext=minus(next,p)
  const a=Math.hypot(...intoPrev),b=Math.hypot(...intoNext)
  if(a<1e-7||b<1e-7)return null
  const inward=unit(plus(scale(intoPrev,1/a),scale(intoNext,1/b)))
  // The tangent runs from the previous vertex through this corner toward next.
  const tangent=unit(plus(scale(intoPrev,-1/a),scale(intoNext,1/b)))
  if(!inward||!tangent)return null
  const minEdge=Math.min(a,b)
  const inset=clamp(offset,Math.min(.0003,minEdge*.05),minEdge*.4)
  return {anchor:[...p],inward,tangent,minEdge,center:plus(p,scale(inward,inset))}
}

export function cornerDragTangent(geometry,cursor,{shift=false,screenUnit=.001}={}){
  if(!geometry||!finitePoint(cursor))return null
  const relative=minus(cursor,geometry.anchor)
  const distance=relative[0]*geometry.inward[0]+relative[1]*geometry.inward[1]
  const strength=clamp(distance,0,geometry.minEdge*.4)
  if(strength<Math.max(1e-8,screenUnit*.2))return [0,0]
  // Shift is a precise-control gesture for the curve radius. Normal dragging
  // remains continuous, without snapping or moving the physical vertex.
  const quantized=shift?Math.round(strength/(Math.max(1e-6,screenUnit*2)))*Math.max(1e-6,screenUnit*2):strength
  return scale(geometry.tangent,clamp(quantized*.8,0,geometry.minEdge*.32))
}

// A circular control is pressed away from the material anchor. Measure the
// *movement of the grabbed widget*, rather than the cursor's absolute inward
// distance, so the first motion cannot jump and every drag direction can
// rotate the opposed VectorCraft/Illustrator direction handles.
export function cornerWidgetDragHandle(geometry,cursor,{start,initial=[0,0],shift=false,screenUnit=.001}={}){
  if(!geometry||!finitePoint(cursor)||!finitePoint(start)||!finitePoint(initial))return null
  const movement=minus(cursor,start)
  const raw=plus(initial,movement)
  const length=Math.hypot(...raw)
  if(!Number.isFinite(length))return null
  if(length<Math.max(1e-9,screenUnit*.05))return [0,0]
  // Keep already-authored long handles continuous when editing them again.
  const constrained=clamp(length,0,Math.max(geometry.minEdge*.4,Math.hypot(...initial)))
  const angle=shift?Math.round(Math.atan2(raw[1],raw[0])/(Math.PI/4))*(Math.PI/4):Math.atan2(raw[1],raw[0])
  return [Math.cos(angle)*constrained,Math.sin(angle)*constrained]
}

export function previewNativeCornerDrag(polygon,index,cursor,options={}){
  const geometry=cornerWidgetGeometry(polygon?.points,index,{closed:true,offset:options.offset})
  const tangent=options.start?cornerWidgetDragHandle(geometry,cursor,options):cornerDragTangent(geometry,cursor,options)
  if(!tangent)return null
  if(Math.hypot(...tangent)<1e-8){
    if(!geometry)return null
    const next=structuredClone(polygon),n=next.points.length
    const incoming=next.edges[(index+n-1)%n],outgoing=next.edges[index]
    if(!next.curves?.[incoming]&&!next.curves?.[outgoing])return null
    if(next.curves?.[incoming])next.curves[incoming][1]=[...geometry.anchor]
    if(next.curves?.[outgoing])next.curves[outgoing][0]=[...geometry.anchor]
    return next
  }
  return dragPatternAnchorHandles(polygon,index,tangent)
}
