// One-hand pinch gesture for a screen-space cloth grab. The native solver
// receives the same barycentric spring as a physical mouse Fabric Hand drag.
// MediaPipe and a future native Apple Vision adapter can both use these points.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)

export function recognizeFabricPinch(landmarks,previousPinched=false){
  if(!Array.isArray(landmarks)||landmarks.length<21)return null
  const wrist=landmarks[0],thumb=landmarks[4],index=landmarks[8],middle=landmarks[9],pinky=landmarks[17]
  if(![wrist,thumb,index,middle,pinky,landmarks[5]].every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)))return null
  const palmScale=Math.max(.015,distance(wrist,middle),distance(landmarks[5],pinky))
  const gap=distance(thumb,index)/palmScale
  const pinched=previousPinched?gap<.54:gap<.37
  return {x:Math.max(0,Math.min(1,1-index.x)),y:Math.max(0,Math.min(1,index.y)),
    pinched,gap,confidence:1}
}

export function nextFabricHandState(current,observation){
  const previous=current||{pinched:false,tracking:false}
  if(!observation)return {pinched:false,tracking:false,x:previous.x??.5,y:previous.y??.5}
  return {pinched:Boolean(observation.pinched),tracking:true,x:observation.x,y:observation.y}
}
