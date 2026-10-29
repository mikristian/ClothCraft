import { buildNativeIndustrialSizeRun } from './grading.js'
import { edgeLength, edgeRangeLength } from './project.js'
import { quadraticAtLengthFraction } from './draftingPrecision.js'
import { validateIndustrialGradeRule } from './industrialGradeRules.js'

const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 128 && id.trim() === id && !['__proto__','prototype','constructor'].includes(id)
const finite = n => typeof n === 'number' && Number.isFinite(n)
const requireValid = (condition, code) => { if (!condition) throw new Error(code) }
const exclusive = (o, keys) => o && Object.keys(o).every(k => keys.includes(k))
const allowed={project:['id','name','revision','updatedAt','pieces','seams','grading'],grading:['sizes','baseSize'],piece:['id','name','points','curves','notches'],point:['id','x','y','industrialGradeRule'],notch:['id','edgeIndex','t','matchGroupId','matchedSeamId','type','depthCm'],step:['dx','dy']}
function safeSource(value){
 const seen=new Set();let count=0
 const copy=(v,depth)=>{
  if(v===null||typeof v==='string'||typeof v==='boolean'||finite(v))return v
  requireValid(v!==undefined||depth===0,'UNSAFE_UNDEFINED')
  requireValid(typeof v==='object'&&depth<=24&&++count<=20000&&!seen.has(v),'UNSAFE_SOURCE')
  const array=Array.isArray(v), proto=Object.getPrototypeOf(v)
  requireValid(proto===(array?Array.prototype:Object.prototype),'UNSAFE_PROTOTYPE')
  const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(descriptors)
  requireValid(keys.length<=10000&&keys.every(k=>typeof k==='string'&&!['__proto__','prototype','constructor','toJSON'].includes(k)),'UNSAFE_KEYS')
  if(array)requireValid(v.length<=10000,'UNSAFE_ARRAY')
  seen.add(v);const result=array?[]:{}
  for(const key of keys){
   if(array&&key==='length')continue
   const d=descriptors[key]
   requireValid(d.enumerable&&Object.hasOwn(d,'value')&&(!array||/^(0|[1-9]\d*)$/.test(key)&&Number(key)<v.length),'UNSAFE_ACCESSOR_OR_DESCRIPTOR')
   Object.defineProperty(result,key,{value:copy(d.value,depth+1),writable:true,configurable:true,enumerable:true})
  }
  if(array)requireValid(Object.keys(result).length===v.length,'SPARSE_ARRAY')
  seen.delete(v);return result
 }
 return copy(value,0)
}

function sourceCheck(project) {
  requireValid(exclusive(project,allowed.project)&&exclusive(project.grading,allowed.grading),'UNSUPPORTED_PROJECT_METADATA')
  const sizes = project?.grading?.sizes
  requireValid(Array.isArray(sizes) && sizes.length >= 2 && sizes.length <= 24 && sizes.every(validId) && new Set(sizes).size === sizes.length && sizes.includes(project.grading.baseSize), 'INVALID_SIZE_TABLE')
  requireValid(Array.isArray(project.pieces) && project.pieces.length >= 2 && project.pieces.length <= 128 && Array.isArray(project.seams) && project.seams.length > 0, 'INVALID_SEWING_PROJECT')
  requireValid(project.pieces.every(p => validId(p?.id)) && new Set(project.pieces.map(p => p.id)).size === project.pieces.length, 'DUPLICATE_PIECE')
  requireValid(project.seams.every(s => validId(s?.id)) && new Set(project.seams.map(s => s.id)).size === project.seams.length, 'DUPLICATE_SEAM')
  for (const p of project.pieces) {
    requireValid(exclusive(p,allowed.piece),'UNSUPPORTED_PIECE_METADATA')
    requireValid(Array.isArray(p.points) && p.points.length >= 3 && p.points.length <= 512, 'INVALID_PIECE')
    requireValid(p.points.every(pt => finite(pt?.x) && finite(pt?.y) && pt.industrialGradeRule && !pt.gradeRule), 'INCOMPLETE_INDUSTRIAL_GRADING')
    for (const pt of p.points) {
      requireValid(exclusive(pt,allowed.point),'UNSUPPORTED_POINT_METADATA')
      const rule = pt.industrialGradeRule
      requireValid(exclusive(rule,['mode','sizes','baseSize','steps','up','down']), 'UNKNOWN_GRADE_RULE_METADATA')
      validateIndustrialGradeRule(rule)
      for(const step of [...(rule.steps||[]),...(rule.up||[]),...(rule.down||[])])requireValid(exclusive(step,allowed.step),'UNKNOWN_GRADE_STEP_METADATA')
      requireValid(JSON.stringify(rule.sizes) === JSON.stringify(sizes) && rule.baseSize === project.grading.baseSize, 'STALE_INDUSTRIAL_GRADE_RULE')
    }
    if (p.curves !== undefined) {
      requireValid(p.curves && Object.getPrototypeOf(p.curves) === Object.prototype && !Array.isArray(p.curves), 'INVALID_CURVES')
      for (const [key,c] of Object.entries(p.curves)) requireValid(/^(0|[1-9]\d*)$/.test(key) && Number(key) < p.points.length && exclusive(c,['cx','cy']) && finite(c.cx) && finite(c.cy), 'INVALID_CURVE')
    }
    if (p.notches !== undefined) {
      requireValid(p.notches.every(n=>exclusive(n,allowed.notch)),'UNSUPPORTED_NOTCH_METADATA')
      requireValid(p.notches.every(n=>n.x===undefined&&n.y===undefined&&n.gradeArcStation===undefined),'UNVERIFIED_NOTCH_CACHE')
      requireValid(Array.isArray(p.notches) && p.notches.every(n => validId(n?.id) && Number.isInteger(n.edgeIndex) && n.edgeIndex >= 0 && n.edgeIndex < p.points.length && finite(n.t) && n.t >= 0 && n.t <= 1), 'INVALID_NOTCH')
      requireValid(new Set(p.notches.map(n => n.id)).size === p.notches.length, 'DUPLICATE_NOTCH')
      requireValid(p.notches.every(n=>n.matchGroupId!==undefined&&n.matchedSeamId!==undefined),'UNMATCHED_NOTCH_UNVERIFIED')
    }
  }
  for (const s of project.seams) {
    requireValid(exclusive(s,['id','name','type','a','b','reverseB']) && (s.reverseB === undefined || typeof s.reverseB === 'boolean'), 'UNSUPPORTED_SEAM_METADATA')
    for (const side of [s.a,s.b]) {
      requireValid(exclusive(side,['pieceId','edgeIndex','startT','endT']) && validId(side.pieceId) && Number.isInteger(side.edgeIndex), 'UNSUPPORTED_SEAM_SIDE')
      const piece = project.pieces.find(p => p.id === side.pieceId)
      requireValid(piece && side.edgeIndex >= 0 && side.edgeIndex < piece.points.length, 'MISSING_SEAM_EDGE')
      const lo=side.startT??0, hi=side.endT??1
      requireValid(finite(lo) && finite(hi) && lo >= 0 && hi <= 1 && hi-lo >= 1e-6, 'INVALID_SEAM_RANGE')
    }
    requireValid(s.a.pieceId !== s.b.pieceId || s.a.edgeIndex !== s.b.edgeIndex, 'SELF_SEWN_EDGE')
  }
  return sizes
}

function seamLength(piece,side) {
  const cm=edgeRangeLength(piece,side.edgeIndex,side.startT??0,side.endT??1)
  requireValid(finite(cm) && cm > .01 && cm < 1e5, 'INVALID_SEWN_LENGTH')
  return cm
}

function station(piece,side,notch,reverse) {
  const length=edgeLength(piece,side.edgeIndex)
  requireValid(finite(length) && length > 0, 'INVALID_EDGE_LENGTH')
  const c=piece.curves?.[side.edgeIndex]
  const index=side.edgeIndex
  const param=c ? quadraticAtLengthFraction(piece.points[index],{x:c.cx,y:c.cy},piece.points[(index+1)%piece.points.length],notch.t).parameter : notch.t
  const lo=side.startT??0,hi=side.endT??1
  // Seam endpoints are Bézier parameters; notch.t is a physical arclength fraction.
  // Convert the notch fraction once, then measure only the sewn subinterval.
  requireValid(finite(param) && param >= lo-1e-8 && param <= hi+1e-8, 'NOTCH_OUTSIDE_SEAM')
  const cm=reverse ? edgeRangeLength(piece,index,param,hi) : edgeRangeLength(piece,index,lo,param)
  requireValid(finite(cm), 'INVALID_NOTCH_STATION')
  return cm
}

/** Detached, validated six-size sewing proof using the existing industrial grader.
 * Rejects incomplete grade rules and any sewing mismatch before returning a run.
 * Does not alter grade geometry or infer factory/fit certification.
 */
export function buildSewnIndustrialSizeRun20261024(project,{seamToleranceCm=.05,notchToleranceCm=.02}={}) {
  requireValid(finite(seamToleranceCm) && seamToleranceCm >= 0 && seamToleranceCm <= .05 && finite(notchToleranceCm) && notchToleranceCm >= 0 && notchToleranceCm <= .02, 'INVALID_TOLERANCE')
  const source=safeSource(project)
  const sizes=sourceCheck(source)
  const run=buildNativeIndustrialSizeRun(source)
  const pairs=new Map()
  for (const piece of source.pieces) for (const notch of piece.notches||[]) {
    if (!notch.matchGroupId && !notch.matchedSeamId) continue
    requireValid(validId(notch.matchGroupId) && validId(notch.matchedSeamId), 'INCOMPLETE_NOTCH_REFERENCE')
    const group=pairs.get(notch.matchGroupId)||[]
    group.push({pieceId:piece.id,notchId:notch.id,edgeIndex:notch.edgeIndex,seamId:notch.matchedSeamId})
    pairs.set(notch.matchGroupId,group)
  }
  for (const [id,group] of pairs) requireValid(group.length===2 && group[0].seamId===group[1].seamId && source.seams.some(s=>s.id===group[0].seamId && [s.a,s.b].every(side=>group.some(n=>n.pieceId===side.pieceId&&n.edgeIndex===side.edgeIndex))), `INVALID_NOTCH_PAIR:${id}`)
  const checks=[]
  for (const size of sizes) {
    const graded=run[size]
    requireValid(graded && graded.pieces.length===source.pieces.length, 'INCOMPLETE_NATIVE_SIZE_RUN')
    const lookup=new Map(graded.pieces.map(p=>[p.id,p]))
    requireValid(lookup.size===source.pieces.length, 'DUPLICATE_GRADED_PIECE')
    for(const piece of graded.pieces){
      const authored=source.pieces.find(p=>p.id===piece.id)
      requireValid(authored&&piece.points.length===authored.points.length,'CHANGED_GRADED_TOPOLOGY')
      requireValid(Object.keys(piece.curves||{}).sort().join('|')===Object.keys(authored.curves||{}).sort().join('|'),'LOST_GRADED_CURVE')
      requireValid(Object.values(piece.curves||{}).every(c=>finite(c?.cx)&&finite(c?.cy)),'INVALID_GRADED_CURVE')
      requireValid(piece.points.every(pt=>finite(pt?.x)&&finite(pt?.y)),'INVALID_GRADED_POINT')
      requireValid((piece.notches||[]).length===(authored.notches||[]).length,'LOST_GRADED_NOTCH')
      for(const notch of piece.notches||[]){
        requireValid(finite(notch.t)&&notch.t>=0&&notch.t<=1,'INVALID_GRADED_NOTCH')
        if(notch.x!==undefined||notch.y!==undefined)throw Error('UNVERIFIED_NOTCH_XY_CACHE')
      }
    }
    for (const seam of source.seams) {
      const a=lookup.get(seam.a.pieceId),b=lookup.get(seam.b.pieceId)
      requireValid(a && b, 'MISSING_GRADED_SEAM_PIECE')
      const lengthAcm=seamLength(a,seam.a),lengthBcm=seamLength(b,seam.b)
      requireValid(Math.abs(lengthAcm-lengthBcm)<=seamToleranceCm, `SEAM_LENGTH_MISMATCH:${seam.id}:${size}`)
      checks.push({size,seamId:seam.id,lengthAcm,lengthBcm,deltaCm:Math.abs(lengthAcm-lengthBcm)})
    }
    for (const [group,entries] of pairs) {
      const seam=source.seams.find(s=>s.id===entries[0].seamId)
      const sideNotch=side=>entries.find(n=>n.pieceId===side.pieceId&&n.edgeIndex===side.edgeIndex)
      const a=sideNotch(seam.a),b=sideNotch(seam.b)
      const notchA=lookup.get(a.pieceId)?.notches?.filter(n=>n.id===a.notchId&&n.edgeIndex===a.edgeIndex)
      const notchB=lookup.get(b.pieceId)?.notches?.filter(n=>n.id===b.notchId&&n.edgeIndex===b.edgeIndex)
      requireValid(notchA?.length===1 && notchB?.length===1, `LOST_GRADED_NOTCH:${group}:${size}`)
      const stationAcm=station(lookup.get(a.pieceId),seam.a,notchA[0],false)
      const stationBcm=station(lookup.get(b.pieceId),seam.b,notchB[0],Boolean(seam.reverseB))
      requireValid(Math.abs(stationAcm-stationBcm)<=notchToleranceCm, `NOTCH_STATION_MISMATCH:${group}:${size}`)
      checks.push({size,seamId:seam.id,group,stationAcm,stationBcm,deltaCm:Math.abs(stationAcm-stationBcm)})
    }
  }
  return {run,validation:{status:'pass',checkedSizes:[...sizes],seams:source.seams.length,matchedNotchGroups:pairs.size,checks,seamToleranceCm,notchToleranceCm,factoryCertified:false,physicalFitApproved:false,committedToRustProject:false}}
}
