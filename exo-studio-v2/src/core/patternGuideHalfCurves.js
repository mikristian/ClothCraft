// CLO-style segmented 2D construction guides. Each interval is isolated:
// curving the left chest span never moves its shared midpoint or right span.
import {rustQuadraticComponent} from './rustCoreMathKernel.js'
const midpoint=(a,b)=>{
  const delta=b-a
  return Number.isFinite(delta)?a+delta/2:a/2+b/2
}
const readCoordinates=point=>{
  if(!Array.isArray(point)||point.length!==2)return null
  // Read own data descriptors, not point[index]: a coordinate accessor can
  // execute arbitrary code (or throw) during construction-guide preflight.
  const x=Object.getOwnPropertyDescriptor(point,'0')
  const y=Object.getOwnPropertyDescriptor(point,'1')
  if(!x||!y||!Object.hasOwn(x,'value')||!Object.hasOwn(y,'value')||
    !Number.isFinite(x.value)||!Number.isFinite(y.value))return null
  return [x.value,y.value]
}
export function sampleGuideHalfCurve(start,end,offset=[0,0],angle=0,steps=28){
  if(!Number.isFinite(angle)||!Number.isInteger(steps)||steps<1||steps>4096)return null
  const startPoint=readCoordinates(start)
  const endPoint=readCoordinates(end)
  const offsetPoint=readCoordinates(offset)
  if(!startPoint||!endPoint||!offsetPoint)return null
  const c=Math.cos(angle),s=Math.sin(angle)
  const middle=[midpoint(startPoint[0],endPoint[0]),midpoint(startPoint[1],endPoint[1])]
  const control=[middle[0]+c*offsetPoint[0]-s*offsetPoint[1],
    middle[1]+s*offsetPoint[0]+c*offsetPoint[1]]
  if(!control.every(Number.isFinite)||!middle.every(Number.isFinite))return null
  const points=Array.from({length:steps+1},(_,i)=>{
    const t=i/steps
    return [0,1].map(axis=>rustQuadraticComponent(startPoint[axis],control[axis],endPoint[axis],t))
  })
  return points.every(p=>p.every(Number.isFinite))?{control,middle,points}:null
}
