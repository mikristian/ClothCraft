import {roundedPoint} from './techPackBezier.js'

const valid=p=>Array.isArray(p)&&p.length===2&&p.every(n=>typeof n==='number'&&Number.isFinite(n))
export function annotationBounds(item){
  const points=item?.type==='bezier'?(item.anchors||[]).flatMap(a=>[a.point,a.in,a.out]).filter(valid):(item?.points||[]).filter(valid)
  if(!points.length)return null
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const x=Math.min(...xs),y=Math.min(...ys)
  return {x,y,width:Math.max(1,Math.max(...xs)-x),height:Math.max(1,Math.max(...ys)-y)}
}

// Opposite corner stays fixed; all anchors and Bezier handles scale together.
export function resizeTechPackAnnotation(item,handle,origin,delta){
  const b=annotationBounds(item)
  // A malformed drag must not commit NaN/Infinity to authored annotations.
  // Test both indexes explicitly: Array#every skips holes in sparse arrays.
  if(!b||!['nw','ne','sw','se'].includes(handle)
    ||!Array.isArray(delta)||delta.length!==2
    ||!Number.isFinite(delta[0])||!Number.isFinite(delta[1]))return item
  const minWidth=4,minHeight=4
  const right=b.x+b.width,bottom=b.y+b.height
  const anchorX=handle.endsWith('w')?right:b.x,anchorY=handle.startsWith('n')?bottom:b.y
  const movingX=handle.endsWith('w')?b.x:right,movingY=handle.startsWith('n')?b.y:bottom
  const newX=movingX+delta[0],newY=movingY+delta[1]
  const newW=Math.max(minWidth,Math.abs(newX-anchorX)),newH=Math.max(minHeight,Math.abs(newY-anchorY))
  if(![right,bottom,anchorX,anchorY,movingX,movingY,newX,newY,newW,newH].every(Number.isFinite))return item
  const signX=movingX>=anchorX?1:-1,signY=movingY>=anchorY?1:-1
  const scaleX=newW/b.width*signX/(movingX>=anchorX?1:-1)
  const scaleY=newH/b.height*signY/(movingY>=anchorY?1:-1)
  if(!Number.isFinite(scaleX)||!Number.isFinite(scaleY))return item
  const transform=p=>roundedPoint([anchorX+(p[0]-anchorX)*scaleX,anchorY+(p[1]-anchorY)*scaleY])
  if(item.type==='bezier'){
    const anchors=(item.anchors||[]).map(a=>({
      ...a,point:transform(a.point),in:transform(a.in||a.point),out:transform(a.out||a.point)}))
    if(anchors.some(a=>![a.point,a.in,a.out].every(valid)))return item
    return {...item,anchors}
  }
  const points=(item.points||[]).map(transform)
  if(points.some(p=>!valid(p)))return item
  return {...item,points}
}
