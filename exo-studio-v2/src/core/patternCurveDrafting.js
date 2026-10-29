// View-only CLO-style curve stations and dimensional labels. All material
// geometry is evaluated from the same native cubic/free-knot representation
// used by Rust Shape; no point is fabricated off the physical cutline.
import {evaluateFreeCurve} from './nativeFreeCurvePoints.js'
import {rustCurveDraftBrackets,rustCurveDraftMeasure} from './rustCurveDraftKernel.js'

const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const midpoint=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2]

export function sideCurveStation(polygon,edge,targetY){
  if(!Number.isFinite(targetY)||!polygon?.edges?.includes(edge))return null
  const sampleCount=128, samples=Array.from({length:sampleCount+1},(_,i)=>{
    const t=i/sampleCount
    return {t,position:evaluateFreeCurve(polygon,edge,t)}
  })
  const crossings=[]
  for(const i of rustCurveDraftBrackets(samples.map(s=>s.position),targetY)){
    const a=samples[i],b=samples[i+1]
    const dy=b.position[1]-a.position[1]
    let lo=a.t,hi=b.t
    // The native spline may curve backward in X or Y. The selected bracket
    // is guaranteed monotone only locally; bisect its measured crossing.
    const positive=dy>0
    for(let j=0;j<25;j++){
      const mid=(lo+hi)/2,p=evaluateFreeCurve(polygon,edge,mid)
      if(!valid(p))return null
      if((p[1]<targetY)===positive)lo=mid
      else hi=mid
    }
    const t=(lo+hi)/2,position=evaluateFreeCurve(polygon,edge,t)
    if(valid(position)&&t>.008&&t<.992)
      crossings.push({edge,t,position,error:Math.abs(position[1]-targetY)})
  }
  return crossings.sort((a,b)=>a.error-b.error||Math.abs(a.t-.5)-Math.abs(b.t-.5))[0]||null
}

export function torsoSideCurveStations(polygon,chestY,bellyY){
  if(!Number.isFinite(chestY)||!Number.isFinite(bellyY)||Math.abs(bellyY-chestY)<.015)
    return []
  return ['side-left','side-right'].flatMap(edge=>[
    {level:'between',y:midpoint([0,chestY],[0,bellyY])[1]},
    {level:'belly',y:bellyY},
  ].map(item=>{
    const station=sideCurveStation(polygon,edge,item.y)
    if(!station)return null
    const saved=polygon?.free_curve_points?.[edge]||[]
    if(saved.some(mark=>Number.isFinite(mark.t)&&Math.abs(mark.t-station.t)<.012||
      valid(mark.position)&&distance(mark.position,station.position)<.003))return null
    return {...station,level:item.level}
  }).filter(Boolean))
}

export function curveDraftDimensions(polygon,{samples=64}={}){
  const names=polygon?.edges||[],items=[]
  if(!names.length||polygon.points?.length!==names.length)return []
  // A fractional count truncates Array.from's length while i/samples still
  // samples only part of the authored edge, yielding false physical lengths.
  // Bound allocation as this view-only annotation is evaluated on live edits.
  if(!Number.isSafeInteger(samples)||samples<1||samples>4096)return []
  for(const edge of names){
    const points=Array.from({length:samples+1},(_,i)=>evaluateFreeCurve(polygon,edge,i/samples))
    if(points.some(p=>!valid(p)))continue
    const metrics=rustCurveDraftMeasure(points)
    // Finite sample points can still overflow midpoint/length arithmetic in
    // the native or fallback measurement backend. Never emit an invalid label.
    if(metrics?.length>.001&&Number.isFinite(metrics.length)&&valid(metrics.midpoint)&&
      metrics.bounds&&['minX','maxX','minY','maxY'].every(key=>Number.isFinite(metrics.bounds[key])))
      items.push({edge,...metrics,
      from:points[0],to:points.at(-1)})
  }
  return items
}
