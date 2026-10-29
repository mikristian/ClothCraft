import {boardObjectTransform} from '../core/techPackBoardObjects.js'

// Scale the entire selected extent around the edge opposite the active handle.
// The anchor's resize delta is expressed in its own board coordinates.
export function resizeTechPackGroup(items,anchorId,initial,updated,handle){
  if(!items?.length||items.length<2)return null
  const anchor=items.find(item=>item.id===anchorId)
  if(!anchor)return null
  const left=Math.min(...items.map(item=>item.x)),top=Math.min(...items.map(item=>item.y))
  const right=Math.max(...items.map(item=>item.x+item.width)),bottom=Math.max(...items.map(item=>item.y+item.height))
  const previous=boardObjectTransform(initial),next=boardObjectTransform(updated)
  const dx=anchor.baseWidth*(next.scaleX-previous.scaleX)
  const dy=anchor.baseHeight*(next.scaleY-previous.scaleY)
  const width=right-left,height=bottom-top
  // A north or west handle grows outward when the pointer moves toward the
  // corresponding side; its positive scale delta therefore grows the group.
  const sx=handle.includes('w')||handle.includes('e')?Math.max(.01,(width+dx)/Math.max(1,width)):1
  const sy=handle.includes('n')||handle.includes('s')?Math.max(.01,(height+dy)/Math.max(1,height)):1
  const originX=handle.includes('w')?right:left
  const originY=handle.includes('n')?bottom:top
  return Object.fromEntries(items.map(item=>{
    const value=boardObjectTransform(item.value)
    const x=originX+(item.x-originX)*sx,y=originY+(item.y-originY)*sy
    return [item.id,{...item.value,x:Math.max(-400,Math.min(400,value.x+x-item.x)),
      y:Math.max(-400,Math.min(400,value.y+y-item.y)),
      scaleX:Math.max(.25,Math.min(3,value.scaleX*sx)),scaleY:Math.max(.25,Math.min(3,value.scaleY*sy))}]
  }))
}
