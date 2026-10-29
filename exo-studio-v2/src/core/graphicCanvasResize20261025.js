// A 2D SVG transform proposal in physical millimetres. Pointer movement
// is measured in the already-rotated artwork coordinate system.
const MIN_MM=1
const MAX_MM=10000
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v))
export function proposeGraphicCanvasResize20261025(graphic, handle, delta, preserveRatio=graphic?.lockAspectRatio!==false) {
  if(!graphic||!['nw','ne','sw','se','n','s','e','w'].includes(handle))return null
  const w=Number(graphic.widthMm),h=Number(graphic.heightMm)
  if(!(w>0&&h>0&&Number.isFinite(w)&&Number.isFinite(h)))return null
  const position=graphic.positionMm
  if(!Array.isArray(position)||position.length!==2||!position.every(Number.isFinite))return null
  const dx=Number(delta?.x),dy=Number(delta?.y)
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return null
  // The material's X origin is the printed left edge, but Y origin is the
  // lower edge (see ClothCraftBoardV2 graphic layer visual transform).
  let left=0,right=w,top=0,bottom=h
  if(handle.includes('w'))left=clamp(dx,-MAX_MM,w-MIN_MM)
  if(handle.includes('e'))right=clamp(w+dx,MIN_MM,MAX_MM)
  if(handle.includes('n'))top=clamp(dy,-MAX_MM,h-MIN_MM)
  if(handle.includes('s'))bottom=clamp(h+dy,MIN_MM,MAX_MM)
  if(preserveRatio) {
    const oldRatio=w/h
    if(handle.length===1) {
      const nextW=handle==='n'||handle==='s'?(bottom-top)*oldRatio:right-left
      const nextH=handle==='w'||handle==='e'?(right-left)/oldRatio:bottom-top
      if(handle==='w'||handle==='e'){const adjust=nextH-h;top=-adjust/2;bottom=h+adjust/2}
      else {const adjust=nextW-w;left=-adjust/2;right=w+adjust/2}
    } else {
      const dw=right-left-w,dh=bottom-top-h
      const factor=Math.abs(dw/w)>=Math.abs(dh/h)?(right-left)/w:(bottom-top)/h
      const nextW=clamp(w*factor,MIN_MM,MAX_MM),nextH=clamp(nextW/oldRatio,MIN_MM,MAX_MM)
      if(handle.includes('w'))left=w-nextW
      else right=nextW
      if(handle.includes('n'))top=h-nextH
      else bottom=nextH
    }
  }
  const widthMm=clamp(right-left,MIN_MM,MAX_MM),heightMm=clamp(bottom-top,MIN_MM,MAX_MM)
  if(!(widthMm>0&&heightMm>0))return null
  // The 2D renderer stores artwork placement in unrotated panel coordinates
  // and applies artwork rotation about its centre. Rotate the centre's motion
  // around the artwork itself to hold the opposite resize handle in place.
  const rawX=position[0]+left,rawY=position[1]-(bottom-h)
  const centreDx=rawX-position[0]+(widthMm-w)/2
  const centreDy=-(rawY-position[1])-(heightMm-h)/2
  const angle=Number(graphic.rotation||0)*Math.PI/180
  if(!Number.isFinite(angle))return null
  const centreRotX=centreDx*Math.cos(angle)-centreDy*Math.sin(angle)
  const centreRotY=centreDx*Math.sin(angle)+centreDy*Math.cos(angle)
  return {
    widthMm:Number(widthMm.toFixed(2)),heightMm:Number(heightMm.toFixed(2)),
    positionMm:[Number((position[0]+centreRotX-(widthMm-w)/2).toFixed(2)),
      Number((position[1]-centreRotY-(heightMm-h)/2).toFixed(2))],
  }
}
