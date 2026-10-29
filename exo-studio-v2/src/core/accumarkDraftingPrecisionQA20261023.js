import {edgeLength} from './project.js'

const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e7
const EPS = 1e-9
const MAX_SAMPLES = 256
const MAX_PIECES = 256
const validId = id => typeof id === 'string' && id.trim().length > 0
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const onSegment = (a,b,p) => Math.abs(cross(a,b,p)) <= EPS &&
  p.x >= Math.min(a.x,b.x)-EPS && p.x <= Math.max(a.x,b.x)+EPS &&
  p.y >= Math.min(a.y,b.y)-EPS && p.y <= Math.max(a.y,b.y)+EPS
function intersects(a,b,c,d) {
  const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b)
  if ((abC > EPS && abD < -EPS || abC < -EPS && abD > EPS) &&
      (cdA > EPS && cdB < -EPS || cdA < -EPS && cdB > EPS)) return true
  return onSegment(a,b,c) || onSegment(a,b,d) || onSegment(c,d,a) || onSegment(c,d,b)
}
function sampleQuadratic(a,c,b,t) {
  const u=1-t
  return {x:u*u*a.x+2*u*t*c.cx+t*t*b.x,y:u*u*a.y+2*u*t*c.cy+t*t*b.y}
}
function inspectPiece(piece,segmentsPerCurve) {
  const errors=[]
  const issue=(code,details={})=>errors.push({code,...details})
  const row={pieceId:piece?.id??null,pointCount:Array.isArray(piece?.points)?piece.points.length:0,
    curveCount:0,sampleCount:0,perimeterCm:null,signedAreaCm2:null,areaCm2:null,
    orientation:null,ok:false,issues:errors}
  const points=piece?.points
  if (!Array.isArray(points) || points.length<3 || points.length>MAX_SAMPLES ||
      points.some(p=>!finite(p?.x)||!finite(p?.y))) {
    issue('INVALID_POINTS');return row
  }
  const curveMap=piece.curves??{}
  if (!curveMap || typeof curveMap!=='object' || Array.isArray(curveMap)) {
    issue('INVALID_CURVE_MAP');return row
  }
  const curves=Object.entries(curveMap)
  row.curveCount=curves.length
  for(const [key,control] of curves) {
    const edgeIndex=Number(key)
    if (!/^(0|[1-9]\d*)$/.test(key) || !Number.isSafeInteger(edgeIndex) || edgeIndex>=points.length ||
        !control || typeof control!=='object' || Array.isArray(control) ||
        !finite(control.cx) || !finite(control.cy) ||
        Object.keys(control).some(k=>k!=='cx'&&k!=='cy')) {
      issue('INVALID_QUADRATIC_CONTROL',{edgeIndex:key})
    }
  }
  if(errors.length)return row
  const samplesNeeded=points.length + curves.length*(segmentsPerCurve-1)
  if(samplesNeeded>MAX_SAMPLES) {issue('TOO_COMPLEX',{samplesNeeded,limit:MAX_SAMPLES});return row}
  const samples=[]
  let length=0
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],c=curveMap[i]
    if(Math.hypot(a.x-b.x,a.y-b.y)<=EPS){issue('ZERO_LENGTH_EDGE',{edgeIndex:i});continue}
    let measured
    try {measured=edgeLength(piece,i)}catch{measured=NaN}
    if(!finite(measured)||measured<=EPS){issue('INVALID_PHYSICAL_EDGE',{edgeIndex:i});continue}
    length+=measured
    if(c){
      for(let j=0;j<segmentsPerCurve;j++)samples.push(sampleQuadratic(a,c,b,j/segmentsPerCurve))
    }else samples.push({x:a.x,y:a.y})
  }
  row.sampleCount=samples.length
  if(errors.length)return row
  if(samples.some(p=>!finite(p.x)||!finite(p.y))){issue('NONFINITE_SAMPLES');return row}
  for(let i=0;i<samples.length;i++){
    const next=(i+1)%samples.length
    if(Math.hypot(samples[i].x-samples[next].x,samples[i].y-samples[next].y)<=EPS)
      issue('ZERO_LENGTH_SAMPLED_SEGMENT',{sampleIndex:i})
  }
  if(errors.length)return row
  let area2=0
  for(let i=0;i<samples.length;i++){
    const b=samples[(i+1)%samples.length],a=samples[i]
    area2+=a.x*b.y-b.x*a.y
  }
  const signedAreaCm2=area2/2
  row.perimeterCm=length
  row.signedAreaCm2=signedAreaCm2
  row.areaCm2=Math.abs(signedAreaCm2)
  row.orientation=signedAreaCm2>0?'CCW':signedAreaCm2<0?'CW':null
  if(!finite(length)||!finite(signedAreaCm2)||Math.abs(signedAreaCm2)<=EPS)issue('ZERO_OR_INVALID_AREA')
  for(let i=0;i<samples.length;i++){
    const a=samples[i],b=samples[(i+1)%samples.length]
    for(let j=i+2;j<samples.length;j++){
      if(i===0&&j===samples.length-1)continue
      if(intersects(a,b,samples[j],samples[(j+1)%samples.length])){
        issue('SELF_CROSSING',{segments:[i,j]});break
      }
    }
    if(errors.some(e=>e.code==='SELF_CROSSING'))break
  }
  row.ok=errors.length===0
  return row
}

/** Read-only geometric QA over authored stitch boundaries; all units in cm. */
export function inspectAccuMarkDraftingPrecision20261023(project,{segmentsPerCurve=24}={}) {
  const issues=[],blocks=[]
  const invalidProject=!Array.isArray(project?.pieces)||!project.pieces.length||project.pieces.length>MAX_PIECES
  if(invalidProject) issues.push({code:'INVALID_PROJECT'})
  if(!Number.isInteger(segmentsPerCurve)||segmentsPerCurve<2||segmentsPerCurve>MAX_SAMPLES)
    issues.push({code:'INVALID_SAMPLING'})
  if(issues.length)return {ok:false,blocks,issues,summary:{totalPieces:0,passingPieces:0,blockedPieces:0},
    units:'cm',manufacturingApproved:false}
  const ids=project.pieces.map(p=>p?.id)
  if(!ids.every(validId)||new Set(ids).size!==ids.length)
    issues.push({code:'DUPLICATE_OR_MISSING_PIECE_ID'})
  for(const piece of project.pieces) {
    const row=inspectPiece(piece,segmentsPerCurve)
    blocks.push(row)
    for(const error of row.issues)issues.push({...error,pieceId:row.pieceId})
  }
  const passingPieces=blocks.filter(b=>b.ok).length
  return {ok:issues.length===0,blocks,issues,
    summary:{totalPieces:blocks.length,passingPieces,blockedPieces:blocks.length-passingPieces,
      sampledPoints:blocks.reduce((sum,b)=>sum+b.sampleCount,0)},
    units:'cm',manufacturingApproved:false,
    note:'Sampled quadratic contour QA; crossing checks depend on bounded sampling. Independent manufacturing validation required.'}
}
