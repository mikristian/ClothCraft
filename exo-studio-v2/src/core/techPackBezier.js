// Techpack vector annotations use the same anchor/in-out tangent convention as
// VectorCraft: each anchor owns its point and independently editable handles.
export const roundedPoint=point=>point.map(n=>Math.round(n*10)/10)
export const newBezierAnchor=point=>({point:roundedPoint(point),in:roundedPoint(point),out:roundedPoint(point)})
export function bezierPath(anchors=[]){
  if(!anchors.length)return ''
  const first=anchors[0]
  if(!Array.isArray(first?.point))return ''
  return `M ${first.point.join(' ')} `+anchors.slice(1).map((anchor,i)=>{
    const previous=anchors[i]
    return `C ${(previous.out||previous.point).join(' ')} ${(anchor.in||anchor.point).join(' ')} ${anchor.point.join(' ')}`
  }).join(' ')
}
export function moveTechPackAnnotation(item,dx,dy){
  const move=p=>roundedPoint([p[0]+dx,p[1]+dy])
  if(item.type==='bezier')return {...item,anchors:(item.anchors||[]).map(anchor=>({
    point:move(anchor.point),in:move(anchor.in||anchor.point),out:move(anchor.out||anchor.point)}))}
  return {...item,points:(item.points||[]).map(move)}
}
export function moveBezierAnchor(item,index,dx,dy,handle='point'){
  return {...item,anchors:item.anchors.map((anchor,i)=>{
    if(i!==index)return anchor
    const move=p=>roundedPoint([p[0]+dx,p[1]+dy])
    if(handle==='in')return {...anchor,in:move(anchor.in||anchor.point)}
    if(handle==='out')return {...anchor,out:move(anchor.out||anchor.point)}
    return {...anchor,point:move(anchor.point),in:move(anchor.in||anchor.point),out:move(anchor.out||anchor.point)}
  })}
}
