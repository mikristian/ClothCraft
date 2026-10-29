/**
 * Independent read-only numerical oracle for the physical position of a notch.
 * The production evaluator uses adaptive quadratic integration; this oracle
 * deliberately uses dense, piecewise-linear arclength sampling instead.
 * Coordinates and tolerance are centimeters. Not a factory approval gate.
 */
import {edgePointAt} from './project.js'

const finite = value => typeof value === 'number' && Number.isFinite(value)

function referenceAt(piece, edgeIndex, fraction, subdivisions) {
  const vertices=piece?.points
  if (!Array.isArray(vertices) || vertices.length<3 ||
      !Number.isInteger(edgeIndex) || edgeIndex<0 || edgeIndex>=vertices.length ||
      !finite(fraction) || fraction<0 || fraction>1) throw new Error('Invalid physical notch edge or fraction')
  const a=vertices[edgeIndex], b=vertices[(edgeIndex+1)%vertices.length]
  if (![a?.x,a?.y,b?.x,b?.y].every(finite) || Math.hypot(b.x-a.x,b.y-a.y)<1e-8) {
    throw new Error('Zero-length or nonfinite physical notch edge')
  }
  const curve=piece.curves?.[edgeIndex]
  if (curve && ![curve.cx,curve.cy].every(finite)) throw new Error('Nonfinite physical notch curve')
  const point=t=>{
    if (!curve) return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}
    const u=1-t
    return {x:u*u*a.x+2*u*t*curve.cx+t*t*b.x,
      y:u*u*a.y+2*u*t*curve.cy+t*t*b.y}
  }
  if (!curve) return point(fraction)
  let previous=point(0),total=0
  const lengths=new Float64Array(subdivisions+1)
  for(let i=1;i<=subdivisions;i++){
    const current=point(i/subdivisions)
    total+=Math.hypot(current.x-previous.x,current.y-previous.y)
    lengths[i]=total
    previous=current
  }
  if (!finite(total) || total<1e-8) throw new Error('Degenerate physical notch curve')
  const target=total*fraction
  let low=0,high=subdivisions
  while(low+1<high){const mid=(low+high)>>1;if(lengths[mid]<target)low=mid;else high=mid}
  const interval=lengths[high]-lengths[low]
  const partial=interval>0?(target-lengths[low])/interval:0
  return point((low+partial)/subdivisions)
}

export function inspectNotchArcPrecision(piece,{toleranceCm=0.001,subdivisions=32768}={}){
  if (!finite(toleranceCm)||toleranceCm<0 || !Number.isInteger(subdivisions)||subdivisions<512||subdivisions>131072){
    throw new TypeError('Notch oracle requires nonnegative cm tolerance and 512..131072 subdivisions')
  }
  const issues=[],checks=[]
  const add=(code,notchId,message)=>issues.push({code,notchId,pieceId:piece?.id??null,message,severity:'blocker'})
  if (!Array.isArray(piece?.notches)){
    if(piece?.notches==null)return {status:'not_configured',issues,checks,blockers:0,factoryCertified:false}
    add('INVALID_NOTCH_COLLECTION',null,'Notches must be an array')
    return {status:'blocked',issues,checks,blockers:issues.length,factoryCertified:false}
  }
  const seen=new Set()
  for(const [index,notch] of piece.notches.entries()){
    const id=notch?.id
    if(typeof id!=='string'||!id||seen.has(id)){
      add('AMBIGUOUS_NOTCH_ID',id??`index:${index}`,'Notch IDs must be unique nonempty strings')
      continue
    }
    seen.add(id)
    try {
      const t=notch.t??0.5
      const expected=referenceAt(piece,notch.edgeIndex,t,subdivisions)
      const actual=edgePointAt(piece,notch.edgeIndex,t,64)?.point
      if(!actual||![actual.x,actual.y].every(finite))throw new Error('Production station returned nonfinite geometry')
      const deviationCm=Math.hypot(actual.x-expected.x,actual.y-expected.y)
      checks.push({notchId:id,edgeIndex:notch.edgeIndex,t,deviationCm,pass:deviationCm<=toleranceCm})
      if(deviationCm>toleranceCm)add('NOTCH_ARCLENGTH_PRECISION',id,
        `Production and independent physical stations differ by ${deviationCm.toFixed(6)} cm`)
    }catch(error){add('INVALID_NOTCH_ARCLENGTH_INPUT',id,String(error.message||error))}
  }
  return {status:issues.length?'blocked':checks.length?'pass':'not_configured',
    issues,checks,blockers:issues.length,maxDeviationCm:Math.max(0,...checks.map(c=>c.deviationCm)),
    toleranceCm,subdivisions,factoryCertified:false,
    note:'Independent sampled-arclength numerical check only; no receiving CAD or physical sample approval.'}
}
