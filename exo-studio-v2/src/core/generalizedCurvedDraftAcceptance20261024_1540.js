import { quadraticAt, quadraticDerivative } from './draftingPrecision.js'
import { sampleEdge, edgeLength } from './project.js'
import { inspectDraftTopology } from './draftingTopology.js'

// Independent, read-only curved cutline acceptance. Measurements are in cm.
// Sampling-based clearance checks cannot certify factory-ready cutline offsets.
const fail = (code) => ({ ok:false, code, manufacturingApproved:false })
const finite = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x)<=100000
const isObject = x => x !== null && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k)
const only = (o,allowed) => isObject(o) && Object.keys(o).every(k=>allowed.includes(k))
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)

function safeCopy(value){
  const seen=new Set();let count=0
  const copy=(v,d=0)=>{
    if(d>12||++count>20000)throw Error('UNSAFE_INPUT')
    if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number')return v
    if(typeof v!=='object'||seen.has(v))throw Error('UNSAFE_INPUT')
    const array=Array.isArray(v)
    if(Object.getPrototypeOf(v)!==(array?Array.prototype:Object.prototype))throw Error('UNSAFE_INPUT')
    const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(descriptors)
    if(keys.some(k=>typeof k!=='string'||['__proto__','prototype','constructor','toJSON'].includes(k)))throw Error('UNSAFE_INPUT')
    if(array&&(v.length>3000||keys.length!==v.length+1||keys.some(k=>k!=='length'&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=v.length))))throw Error('UNSAFE_INPUT')
    seen.add(v)
    const result=array?[]:{}
    for(const k of keys){
      if(array&&k==='length')continue
      const item=descriptors[k]
      if(!own(item,'value')||!item.enumerable||array&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=v.length))throw Error('UNSAFE_INPUT')
      Object.defineProperty(result,k,{value:copy(item.value,d+1),enumerable:true,configurable:true,writable:true})
    }
    if(array&&result.length!==v.length)throw Error('UNSAFE_INPUT')
    seen.delete(v)
    return result
  }
  return copy(value)
}

function properIntersection(a,b,c,d){
  const eps=1e-8,abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b)
  if((abC>eps&&abD< -eps||abC< -eps&&abD>eps)&&(cdA>eps&&cdB< -eps||cdA< -eps&&cdB>eps))return true
  const on=(x,y,z)=>Math.abs(cross(x,y,z))<=eps&&z.x>=Math.min(x.x,y.x)-eps&&z.x<=Math.max(x.x,y.x)+eps&&z.y>=Math.min(x.y,y.y)-eps&&z.y<=Math.max(x.y,y.y)+eps
  return on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)
}
function windingContainment(poly,point){
  let inside=false
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[j],b=poly[i]
    if(Math.abs(cross(a,b,point))<=1e-8&&point.x>=Math.min(a.x,b.x)-1e-8&&point.x<=Math.max(a.x,b.x)+1e-8&&point.y>=Math.min(a.y,b.y)-1e-8&&point.y<=Math.max(a.y,b.y)+1e-8)return 'boundary'
    if((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside
  }
  return inside?'inside':'outside'
}
function pointsValid(points){return Array.isArray(points)&&points.length>=3&&points.length<=64&&Object.keys(points).length===points.length&&points.every(p=>only(p,['x','y'])&&finite(p.x)&&finite(p.y))}
function validatedLoop(input,outer=false){
  if(!only(input,outer?['points','curves','holes','seamAllowance']:['points','curves']))return null
  if(!pointsValid(input.points))return null
  if(!isObject(input.curves??{}))return null
  const curves=input.curves??{}
  if(Object.keys(curves).some(k=>!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=input.points.length||!only(curves[k],['cx','cy'])||!finite(curves[k].cx)||!finite(curves[k].cy)))return null
  if(outer&&(!Array.isArray(input.holes??[])||(input.holes??[]).length>8||!finite(input.seamAllowance??0)||(input.seamAllowance??0)<0||(input.seamAllowance??0)>10))return null
  return {points:input.points,curves}
}
const sampleLoop=(loop,n=128)=>loop.points.flatMap((_,i)=>sampleEdge(loop,i,n).slice(0,-1))
// Detect a point landing exactly on an authored quadratic even between sample
// chords, rather than relying on coarse polygon containment alone.
function onQuadratic(point,a,control,b){
  const tolerance=1e-7
  const bounds=(a,b,c)=>point.x>=Math.min(a.x,b.x,c.x)-tolerance&&point.x<=Math.max(a.x,b.x,c.x)+tolerance&&point.y>=Math.min(a.y,b.y,c.y)-tolerance&&point.y<=Math.max(a.y,b.y,c.y)+tolerance
  const examine=(a,c,b,depth)=>{
    if(!bounds(a,b,c))return false
    if(depth===16){
      const vx=b.x-a.x,vy=b.y-a.y,length2=vx*vx+vy*vy
      if(length2<1e-18)return dist(point,a)<=tolerance
      const t=Math.max(0,Math.min(1,((point.x-a.x)*vx+(point.y-a.y)*vy)/length2))
      return Math.hypot(point.x-(a.x+t*vx),point.y-(a.y+t*vy))<=tolerance
    }
    const left={x:(a.x+c.x)/2,y:(a.y+c.y)/2},right={x:(c.x+b.x)/2,y:(c.y+b.y)/2}
    const middle={x:(left.x+right.x)/2,y:(left.y+right.y)/2}
    return examine(a,left,middle,depth+1)||examine(middle,right,b,depth+1)
  }
  return examine(a,control,b,0)
}
function onLoopBoundary(loop,p){
  for(let i=0;i<loop.points.length;i++){
    const a=loop.points[i],b=loop.points[(i+1)%loop.points.length],c=loop.curves[i]
    if(c?onQuadratic(p,a,{x:c.cx,y:c.cy},b):properIntersection(a,b,p,p))return true
  }
  return false
}
function pathValid(poly){
  if(poly.length<3||poly.some(p=>!finite(p.x)||!finite(p.y)))return false
  for(let i=0;i<poly.length;i++){
    if(dist(poly[i],poly[(i+1)%poly.length])<1e-9)return false
    for(let j=i+2;j<poly.length;j++){
      if(i===0&&j===poly.length-1)continue
      if(properIntersection(poly[i],poly[(i+1)%poly.length],poly[j],poly[(j+1)%poly.length]))return false
    }
  }
  return true
}
function loopsTouch(a,b){
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)
    if(properIntersection(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]))return true
  return false
}

/** D16/D18 read-only geometric acceptance for explicit curved outer and hole loops.
 * Unknown construction metadata is rejected instead of claiming attachment safety.
 */
export function inspectGeneralizedCurvedDraft20261024_1540(source,{offsetCm=0,stations=32}={}){
  try{
    if('toJSON' in Object.prototype||'toJSON' in Array.prototype)return fail('UNSAFE_SERIALIZATION_ENVIRONMENT')
    const input=safeCopy(source)
    if(!Number.isSafeInteger(stations)||stations<8||stations>128||!finite(offsetCm)||offsetCm<0||offsetCm>10)return fail('INVALID_OPTIONS')
    const outer=validatedLoop(input,true)
    if(!outer)return fail('INVALID_SOURCE_SCHEMA')
    const holeInputs=input.holes??[],holes=holeInputs.map(h=>validatedLoop(h))
    if(holes.some(h=>!h))return fail('INVALID_HOLE_SCHEMA')
    const loops=[outer,...holes]
    const sampled=loops.map(loop=>sampleLoop(loop))
    if(loops.some(loop=>!inspectDraftTopology(loop,{curveSamples:64}).valid)||sampled.some(path=>!pathValid(path)))return fail('INVALID_CONTOUR')
    for(let i=1;i<sampled.length;i++){
      if(loopsTouch(sampled[0],sampled[i])||sampled[i].some(p=>onLoopBoundary(outer,p))||windingContainment(sampled[0],sampled[i][0])!=='inside')return fail('HOLE_NOT_CONTAINED')
      for(let j=1;j<i;j++){
        if(loopsTouch(sampled[i],sampled[j])||sampled[i].some(p=>onLoopBoundary(loops[j],p))||sampled[j].some(p=>onLoopBoundary(loops[i],p))||windingContainment(sampled[i],sampled[j][0])!=='outside'||windingContainment(sampled[j],sampled[i][0])!=='outside')return fail('HOLES_OVERLAP_OR_NEST')
      }
    }
    const precision=[]
    for(let li=0;li<loops.length;li++){
      const loop=loops[li]
      for(let edge=0;edge<loop.points.length;edge++){
        const a=loop.points[edge],b=loop.points[(edge+1)%loop.points.length],curve=loop.curves[edge]
        const control=curve?{x:curve.cx,y:curve.cy}:null
        const length=edgeLength(loop,edge)
        if(!finite(length)||length<.001)return fail('DEGENERATE_EDGE')
        const stationsReport=[]
        for(let s=0;s<=stations;s++){
          const t=s/stations
          const point=control?quadraticAt(a,control,b,t):{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}
          const tangent=control?quadraticDerivative(a,control,b,t):{x:b.x-a.x,y:b.y-a.y}
          const speed=Math.hypot(tangent.x,tangent.y)
          if(!finite(speed)||speed<1e-7)return fail('CUSP_OR_ZERO_TANGENT')
          const normal={x:-tangent.y/speed,y:tangent.x/speed}
          const offset={x:point.x+normal.x*offsetCm,y:point.y+normal.y*offsetCm}
          if(!finite(offset.x)||!finite(offset.y))return fail('INVALID_OFFSET')
          stationsReport.push({t,point,tangent:{x:tangent.x/speed,y:tangent.y/speed},normal,offset})
        }
        precision.push({loopIndex:li,edgeIndex:edge,kind:control?'quadratic':'straight',lengthCm:length,stations:stationsReport})
      }
    }
    return {ok:true,units:'cm',loops:loops.length,holeCount:holes.length,edges:precision,
      manufacturingApproved:false,offsetCertified:false,sourceValidated:true,
      note:'Validated sampled contour and hole separation. Offset stations are measurements, not a joined production cutline or industrial offset certification.'}
  }catch{return fail('UNSAFE_OR_INVALID_SOURCE')}
}
