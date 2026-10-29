export function penTangent(start, cursor, {shift = false, alt = false, threshold = .002} = {}) {
  if (alt) return [0, 0]
  const dx = cursor[0] - start[0], dy = cursor[1] - start[1]
  const length = Math.hypot(dx, dy)
  if (length <= threshold) return [0, 0]
  if (!shift) return [dx, dy]
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4
  return [length * Math.cos(angle), length * Math.sin(angle)]
}

export function penCubicPath(points, tangents, cursor = null) {
  if (!points.length) return ''
  let path = `M ${points[0][0]} ${points[0][1]}`
  const all = cursor ? [...points, cursor] : points
  for (let i = 1; i < all.length; i++) {
    const a = all[i - 1], b = all[i], ta = tangents[i - 1] || [0, 0], tb = tangents[i] || [0, 0]
    path += ` C ${a[0] + ta[0]} ${a[1] + ta[1]} ${b[0] - tb[0]} ${b[1] - tb[1]} ${b[0]} ${b[1]}`
  }
  return path
}

/** VectorCraft-style draft point editing; never modifies committed Rust data. */
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
export function penCubicAt(a,b,ta=[0,0],tb=[0,0],t=.5){
  const p1=[a[0]+ta[0],a[1]+ta[1]],p2=[b[0]-tb[0],b[1]-tb[1]]
  const x=mix(a,p1,t),y=mix(p1,p2,t),z=mix(p2,b,t)
  return {p:mix(mix(x,y,t),mix(y,z,t),t),left:mix(x,y,t),right:mix(y,z,t)}
}

/** VectorCraft Anchor Point's reshapeSegment on an unfinished Pen path.
 * Preserve the current vertices; the shared tangent representation keeps
 * adjacent draft segments smooth when the selected segment bends.
 */
export function reshapePenDraftSegment(points,tangents,index,t,delta,{perpendicular=false}={}){
  if(!Array.isArray(points)||!Number.isInteger(index)||index<0||index+1>=points.length||
    !Array.isArray(tangents)||!Array.isArray(delta)||delta.length!==2||
    !delta.every(Number.isFinite)||!Number.isFinite(t)||t<0||t>1||
    Math.hypot(...delta)<1e-12)return null
  const a=points[index],b=points[index+1],ta=tangents[index]||[0,0],tb=tangents[index+1]||[0,0]
  if(![a,b,ta,tb].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return null
  const t0=Math.max(.05,Math.min(.95,t)),factor=3*t0*(1-t0),chord=[b[0]-a[0],b[1]-a[1]]
  const length=Math.hypot(...chord)
  if(length<1e-12)return null
  const c1=[a[0]+ta[0],a[1]+ta[1]],c2=[b[0]-tb[0],b[1]-tb[1]]
  let v
  if(perpendicular){
    const normal=[-chord[1]/length,chord[0]/length]
    const {p}=penCubicAt(a,b,ta,tb,t0)
    const amount=((p[0]+delta[0]-a[0])*normal[0]+(p[1]+delta[1]-a[1])*normal[1])/factor
    v=normal.map(value=>value*amount)
  }else v=delta.map(value=>value/factor)
  const result=tangents.map(value=>[...value])
  result[index]=perpendicular?v:[c1[0]+v[0]-a[0],c1[1]+v[1]-a[1]]
  result[index+1]=perpendicular?v.map(value=>-value):[b[0]-c2[0]-v[0],b[1]-c2[1]-v[1]]
  return {points:points.map(value=>[...value]),tangents:result}
}

/** VectorCraft add-anchor hit semantics: the click selects the nearest
 * actual cubic segment, not the last selected point or the chord midpoint.
 * Tolerance and position are EXO material-space metres from the SVG.
 */
export function penSegmentAt(points,tangents,pos,tolerance){
  if(!Array.isArray(points)||!Array.isArray(pos)||!pos.every(Number.isFinite)||
    !Number.isFinite(tolerance)||tolerance<=0)return null
  let found=null
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],ta=tangents[i]||[0,0],tb=tangents[i+1]||[0,0]
    if(![a,b,ta,tb].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))continue
    let bestT=.5,best=Infinity
    for(let k=1;k<64;k++){
      const t=k/64,p=penCubicAt(a,b,ta,tb,t).p,d=Math.hypot(p[0]-pos[0],p[1]-pos[1])
      if(d<best){best=d;bestT=t}
    }
    let low=Math.max(.001,bestT-1/64),high=Math.min(.999,bestT+1/64)
    for(let n=0;n<15;n++){
      const u=(2*low+high)/3,v=(low+2*high)/3
      const q=penCubicAt(a,b,ta,tb,u).p,r=penCubicAt(a,b,ta,tb,v).p
      if(Math.hypot(q[0]-pos[0],q[1]-pos[1])<Math.hypot(r[0]-pos[0],r[1]-pos[1]))high=v
      else low=u
    }
    const t=(low+high)/2,p=penCubicAt(a,b,ta,tb,t).p,distance=Math.hypot(p[0]-pos[0],p[1]-pos[1])
    if(distance<=tolerance&&(!found||distance<found.distance))found={index:i,t,point:p,distance}
  }
  return found
}

export function insertPenAnchor(points,tangents,afterIndex,t=.5){
  if(!Array.isArray(points)||points.length<2)return null
  const index=Math.min(points.length-2,Math.max(0,Number(afterIndex)||0))
  if(!Number.isFinite(t)||t<=0||t>=1)return null
  const a=points[index],b=points[index+1],ta=tangents[index]||[0,0],tb=tangents[index+1]||[0,0]
  const {p,left:l,right:r}=penCubicAt(a,b,ta,tb,t)
  const tangent=[(r[0]-l[0])/2,(r[1]-l[1])/2]
  return {points:[...points.slice(0,index+1),p,...points.slice(index+1)],
    tangents:[...tangents.slice(0,index+1),tangent,...tangents.slice(index+1)],index:index+1}
}
export function curvePenAnchor(points,tangents,index){
  if(!Array.isArray(points)||!Number.isInteger(index)||index<0||index>=points.length)return null
  const p=points[index],a=points[Math.max(0,index-1)],b=points[Math.min(points.length-1,index+1)]
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
  if(length<1e-8)return null
  const previous=Math.hypot(p[0]-a[0],p[1]-a[1])
  const next=Math.hypot(b[0]-p[0],b[1]-p[1])
  const size=Math.max(.002,Math.min(previous,next)/3)
  return tangents.map((t,i)=>i===index?[dx/length*size,dy/length*size]:t)
}
