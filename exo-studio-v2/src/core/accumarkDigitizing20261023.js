import {cloneProject} from './project.js'

const EPS=1e-8
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const area=p=>p.reduce((s,a,i)=>s+a.x*p[(i+1)%p.length].y-a.y*p[(i+1)%p.length].x,0)/2
const within=(a,b,p)=>p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.y>=Math.min(a.y,b.y)-EPS&&p.y<=Math.max(a.y,b.y)+EPS
function crossing(a,b,c,d){
  const ab=[cross(a,b,c),cross(a,b,d)],cd=[cross(c,d,a),cross(c,d,b)]
  return (ab[0]*ab[1]< -EPS&&cd[0]*cd[1]< -EPS)||
    Math.abs(ab[0])<=EPS&&within(a,b,c)||Math.abs(ab[1])<=EPS&&within(a,b,d)||
    Math.abs(cd[0])<=EPS&&within(c,d,a)||Math.abs(cd[1])<=EPS&&within(c,d,b)
}
/** Two anchors identify an observed physical reference line. For pixels,
 * physicalDistanceCm is required. For mm/cm it may be supplied to check scale.
 * Calibration aligns anchor A with originCm and rotates the measured A->B
 * vector to the requested rotationDeg in EXO XY space.
 */
export function calibrateAccuMarkDigitizing({anchors,sourceUnits='pixels',physicalDistanceCm,originCm={x:0,y:0},rotationDeg=0,flipY=false}={}){
  if(!Array.isArray(anchors)||anchors.length!==2||!anchors.every(point)||!point(originCm)||!Number.isFinite(rotationDeg)||typeof flipY!=='boolean')throw Error('INVALID_CALIBRATION')
  if(!['pixels','mm','cm'].includes(sourceUnits))throw Error('INVALID_SOURCE_UNITS')
  const [a,b]=anchors
  const observed=dist(a,b)
  if(!(observed>EPS))throw Error('COINCIDENT_CALIBRATION_ANCHORS')
  const nativeCm=sourceUnits==='mm'?.1:sourceUnits==='cm'?1:null
  if(nativeCm!==null&&physicalDistanceCm!==undefined&&(!Number.isFinite(physicalDistanceCm)||physicalDistanceCm<=EPS||Math.abs(physicalDistanceCm-observed*nativeCm)>Math.max(.01,observed*nativeCm*.001)))throw Error('INCONSISTENT_PHYSICAL_REFERENCE')
  const physical=physicalDistanceCm??(nativeCm===null?NaN:observed*nativeCm)
  if(!Number.isFinite(physical)||physical<=EPS||physical>100000)throw Error('INVALID_PHYSICAL_DISTANCE')
  const scale=physical/observed,dy=flipY?-1:1
  const direction=Math.atan2((b.y-a.y)*dy,b.x-a.x),target=rotationDeg*Math.PI/180
  const theta=target-direction,c=Math.cos(theta),s=Math.sin(theta)
  const transform=p=>{
    if(!point(p))throw Error('INVALID_OBSERVED_POINT')
    const x=(p.x-a.x)*scale,y=(p.y-a.y)*scale*dy
    const result={x:originCm.x+x*c-y*s,y:originCm.y+x*s+y*c}
    if(!point(result))throw Error('NONFINITE_TRANSFORM')
    return result
  }
  return {transform,scaleCmPerSourceUnit:scale,sourceUnits,physicalDistanceCm:physical,rotationDeg,flipY,originCm:{...originCm}}
}
function validate(points,winding){
  if(!Array.isArray(points)||points.length<3||points.length>4096||!points.every(point))throw Error('INVALID_CONTOUR')
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)
    if(dist(points[i],points[j])<=EPS)throw Error('DUPLICATE_VERTEX')
  const signed=area(points)
  if(Math.abs(signed)<=EPS)throw Error('DEGENERATE_CONTOUR')
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    if(j===i+1||i===0&&j===points.length-1)continue
    if(crossing(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))throw Error('SELF_INTERSECTION')
  }
  if(winding!=='either'&&winding!==(signed>0?'ccw':'cw'))throw Error('INCORRECT_WINDING')
  return signed>0?'ccw':'cw'
}
/** Import explicitly traced observed vertices into a NEW EXO project.
 * Input is a closed topological contour: either an implicit final edge, or
 * an exact repeated first point with closed=true. No pixel extraction/OCR.
 * Reference seams/notches are ignored unless separately and explicitly mapped.
 */
export function importAccuMarkDigitizedPiece(project,{
  id,name,observedPoints,calibration,closed=true,winding='ccw',
  seamAllowanceCm=0,fabricId='main',cutQuantity=1,
  sourceSeams,sourceNotches,
}={}){
  if(!project||!Array.isArray(project.pieces)||typeof id!=='string'||!id.trim()||typeof name!=='string'||!name.trim()||project.pieces.some(p=>p.id===id))throw Error('INVALID_OR_DUPLICATE_PIECE_ID')
  if(closed!==true||!['cw','ccw','either'].includes(winding)||!Array.isArray(observedPoints)||observedPoints.length<3)throw Error('OPEN_OR_INVALID_CONTOUR')
  if(!Number.isFinite(seamAllowanceCm)||seamAllowanceCm<0||seamAllowanceCm>20||typeof fabricId!=='string'||!fabricId||!Number.isSafeInteger(cutQuantity)||cutQuantity<1||cutQuantity>100)throw Error('INVALID_PIECE_METADATA')
  const calibrated=calibrateAccuMarkDigitizing(calibration)
  if(!observedPoints.every(point))throw Error('INVALID_OBSERVED_POINT')
  const observed=observedPoints.map(p=>({...p}))
  if(dist(observed[0],observed.at(-1))<=EPS)observed.pop()
  const points=observed.map(calibrated.transform)
  const actualWinding=validate(points,winding)
  const next=cloneProject(project)
  next.pieces.push({id,name,points,seamAllowance:seamAllowanceCm,fabricId,cutQuantity,curves:{},notches:[],internalLines:[]})
  const warnings=[]
  if(sourceSeams!==undefined)warnings.push({code:'UNMAPPED_SEAMS',detail:'Sewing relations require an explicit edge mapping'})
  if(sourceNotches!==undefined)warnings.push({code:'UNMAPPED_NOTCHES',detail:'Notches require explicit edgeIndex and fraction mapping'})
  return {project:next,piece:next.pieces.at(-1),validation:{ok:true,winding:actualWinding,units:'cm',closed:true,manufacturingApproved:false},warnings}
}
