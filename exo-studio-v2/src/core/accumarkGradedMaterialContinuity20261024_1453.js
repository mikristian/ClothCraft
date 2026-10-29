import {gradeProject} from './grading.js'
import {edgeRangeLength, edgeLength, edgePointAt} from './project.js'

// Independent, read-only physical grade-run gate. Geometry is in centimetres.
// There is deliberately no manufacturer approval output, even for a clean run.
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e7
const id=value=>typeof value==='string'&&value.length>0&&value.trim()===value&&value.length<=128&&
  !['__proto__','constructor','prototype'].includes(value)
const knownKey=value=>typeof value==='string'&&value!=='__proto__'&&value!=='constructor'&&value!=='prototype'&&value!=='toJSON'

function sourceCopy(input){
  const active=new Set(),budget={nodes:0,fields:0}
  function copy(value,depth){
    if(value===null||value===undefined||typeof value==='string'||typeof value==='boolean')return value
    if(finite(value))return value
    if(typeof value!=='object'||depth>36||active.has(value)||++budget.nodes>12000)throw Error('UNSAFE_SOURCE_VALUE')
    const array=Array.isArray(value),proto=Object.getPrototypeOf(value)
    if(array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)throw Error('UNSAFE_SOURCE_PROTOTYPE')
    const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors)
    if((budget.fields+=keys.length)>100000||keys.some(key=>typeof key!=='string'||!knownKey(key)))throw Error('UNSAFE_SOURCE_FIELDS')
    active.add(value)
    const result=array?[]:Object.create(null)
    if(array&&value.length>10000)throw Error('UNSAFE_ARRAY_LENGTH')
    for(const key of keys){
      const descriptor=descriptors[key]
      if(array&&key==='length'){result.length=descriptor.value;continue}
      if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw Error('SOURCE_ACCESSOR_OR_HIDDEN_ATTACHMENT')
      if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))throw Error('UNSAFE_ARRAY_ATTACHMENT')
      Object.defineProperty(result,key,{value:copy(descriptor.value,depth+1),enumerable:true,writable:true,configurable:true})
    }
    if(array&&Object.keys(result).length!==result.length)throw Error('SPARSE_SOURCE_ARRAY')
    active.delete(value)
    return result
  }
  return copy(input,0)
}

const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
  a.every((value,i)=>Array.isArray(value)&&Array.isArray(b[i])?
    same(value,b[i]):Object.is(value,b[i]))
const pair=value=>value&&finite(value.x)&&finite(value.y)
const notchIdentity=piece=>(piece.notches||[]).map(n=>[n?.id,n?.edgeIndex,n?.t,n?.matchGroupId,n?.matchedSeamId])
const checkIds=(rows,property)=>Array.isArray(rows)&&rows.every(item=>id(item?.[property]))&&
  new Set(rows.map(item=>item[property])).size===rows.length
const knownSeamKeys=new Set(['id','a','b','reverseB','allowEase'])
const knownSideKeys=new Set(['pieceId','edgeIndex','startT','endT'])
const MAX_SEAM_TOLERANCE_CM=.2
const MAX_NOTCH_TOLERANCE_CM=.02
const MAX_MIN_EDGE_CM=.01

/**
 * Check every authored size for preserved contour identity, curve controls,
 * physical sew length, and notches. No write, easing, fit, or certification.
 * A pass means only that these measurable constraints passed these thresholds.
 */
export function inspectAccuMarkGradedMaterialContinuity20261024(project,{
  seamToleranceCm=.2,notchToleranceCm=.02,minEdgeCm=.001,
}={}){
  const issues=[],seamRows=[],notchRows=[],curveRows=[]
  const add=(code,size,entity)=>issues.push({code,size,entity,severity:'blocker'})
  const report=()=>({status:issues.length?'blocked':'measurement_only',issues,blockers:issues.length,
    seamRows,notchRows,curveRows,manufacturingApproved:false,factoryCertified:false})
  if(![seamToleranceCm,notchToleranceCm,minEdgeCm].every(finite)||
    [seamToleranceCm,notchToleranceCm,minEdgeCm].some(n=>n<0)||
    seamToleranceCm>MAX_SEAM_TOLERANCE_CM||notchToleranceCm>MAX_NOTCH_TOLERANCE_CM||
    minEdgeCm>MAX_MIN_EDGE_CM){
    add('INVALID_PHYSICAL_TOLERANCE',null,null);return report()
  }
  let source
  try{source=sourceCopy(project)}catch(error){add(error.message,null,null);return report()}
  const sizes=source?.grading?.sizes
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||!sizes.every(id)||
    new Set(sizes).size!==sizes.length||!sizes.includes(source.grading.baseSize)||
    !checkIds(source.pieces,'id')||!source.pieces.length||source.pieces.length>100||
    !Array.isArray(source.seams)||!checkIds(source.seams,'id')||source.seams.length>500){
    add('INVALID_SIZE_RUN_OR_SOURCE_IDENTITIES',null,null);return report()
  }
  if(!source.seams.length){add('NO_AUTHORED_SEAMS',null,null);return report()}
  if(!source.grading||typeof source.grading!=='object'){
    add('INVALID_GRADING_SOURCE',null,null);return report()
  }
  const base=new Map()
  for(const piece of source.pieces){
    if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>1000||
      piece.points.some(p=>!pair(p))||
      piece.notches!=null&&!checkIds(piece.notches,'id')||
      piece.curves!=null&&(typeof piece.curves!=='object'||Array.isArray(piece.curves))){
      add('INVALID_SOURCE_PATTERN',null,piece.id);continue
    }
    if(piece.curves){
      const keys=Object.keys(piece.curves)
      if(keys.some(key=>!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=piece.points.length||
        !finite(piece.curves[key]?.cx)||!finite(piece.curves[key]?.cy)))add('INVALID_BASE_CURVE',null,piece.id)
    }
    const pointIds=piece.points.map(point=>point.id)
    if(pointIds.some(pointId=>pointId!==undefined)&&
      (pointIds.some(pointId=>!id(pointId))||new Set(pointIds).size!==pointIds.length))
      add('AMBIGUOUS_POINT_ID',null,piece.id)
    if(piece.notches?.some(n=>!Number.isInteger(n.edgeIndex)||n.edgeIndex<0||n.edgeIndex>=piece.points.length||
      !finite(n.t??.5)||(n.t??.5)<0||(n.t??.5)>1))add('INVALID_BASE_NOTCH',null,piece.id)
    base.set(piece.id,piece)
  }
  if(issues.length)return report()
  const referenced=new Set()
  for(const seam of source.seams){
    if(Object.keys(seam).some(key=>!knownSeamKeys.has(key))||
      Object.hasOwn(seam,'allowEase')&&seam.allowEase!==false||
      Object.hasOwn(seam,'reverseB')&&typeof seam.reverseB!=='boolean')
      add('UNSUPPORTED_SEAM_SEMANTICS',null,seam.id)
    if(seam.a?.pieceId===seam.b?.pieceId){
      add('UNSUPPORTED_SELF_SEAM',null,seam.id)
    }
    for(const side of [seam.a,seam.b]){
      if(side&&Object.keys(side).some(key=>!knownSideKeys.has(key)))add('UNSUPPORTED_SEAM_SIDE_METADATA',null,seam.id)
      if(!base.has(side?.pieceId)||!Number.isInteger(side?.edgeIndex)||side.edgeIndex<0||
        side.edgeIndex>=base.get(side.pieceId).points.length||
        !finite(side.startT??0)||!finite(side.endT??1)||(side.startT??0)<0||
        (side.endT??1)>1||(side.startT??0)>=(side.endT??1))add('INVALID_SEAM_REFERENCE',null,seam.id)
      else referenced.add(`${side.pieceId}\0${side.edgeIndex}`)
    }
    if(seam.a&&seam.b&&
      ((seam.a.startT??0)!==0||(seam.a.endT??1)!==1||
      (seam.b.startT??0)!==0||(seam.b.endT??1)!==1))
      add('UNSUPPORTED_PARTIAL_SEAM_CORRESPONDENCE',null,seam.id)
  }
  if(source.seams.some(seam=>seam.reverseB!==true))add('UNVERIFIED_SEAM_DIRECTION',null,null)
  if(source.pieces.some(piece=>(piece.notches||[]).some(notch=>notch.matchGroupId||notch.matchedSeamId)))
    add('UNVERIFIED_PAIRED_NOTCH_STATIONS',null,null)
  // Preserve diagnostic physical-length rows for syntactically valid seams,
  // while keeping all unsupported semantics as permanent blockers.
  if(issues.some(issue=>issue.code==='INVALID_SEAM_REFERENCE'))return report()
  for(const size of sizes){
    let graded
    try{graded=gradeProject(source,size)}catch(error){add('GRADE_RUNTIME_FAILURE',size,error.message);continue}
    if(!same(graded.pieces.map(p=>p.id),source.pieces.map(p=>p.id))){
      add('GRADED_PIECE_ID_DRIFT',size,null);continue
    }
    const lookup=new Map(graded.pieces.map(p=>[p.id,p]))
    for(const original of source.pieces){
      const current=lookup.get(original.id)
      if(!Array.isArray(current?.points)||current.points.length!==original.points.length||
        current.points.some(p=>!pair(p))||
        !same(current.points.map(p=>p.id),original.points.map(p=>p.id))){
        add('GRADED_POINT_ID_OR_GEOMETRY_DRIFT',size,original.id);continue
      }
      const controls=original.curves||{}
      if(!same(Object.keys(current.curves||{}).sort(),Object.keys(controls).sort())){
        add('GRADED_CURVE_EDGE_DRIFT',size,original.id);continue
      }
      for(const key of Object.keys(controls)){
        const c=current.curves[key]
        if(!finite(c?.cx)||!finite(c?.cy))add('INVALID_GRADED_CURVE',size,`${original.id}:${key}`)
        else {
          const lengthCm=edgeLength(current,Number(key))
          curveRows.push({size,pieceId:original.id,edgeIndex:Number(key),lengthCm})
          if(!finite(lengthCm)||lengthCm<=minEdgeCm)add('GRADED_CURVE_COLLAPSE',size,`${original.id}:${key}`)
        }
      }
      if(!same(notchIdentity(current),notchIdentity(original)))add('GRADED_NOTCH_ATTACHMENT_DRIFT',size,original.id)
      for(const notch of current.notches||[]){
        const expected=edgePointAt(current,notch.edgeIndex,notch.t??.5)?.point
        if(!pair(expected)){add('INVALID_GRADED_NOTCH_STATION',size,notch.id);continue}
        const hasX=Object.hasOwn(notch,'x'),hasY=Object.hasOwn(notch,'y')
        if(hasX!==hasY||hasX&&(!pair(notch)||Math.hypot(notch.x-expected.x,notch.y-expected.y)>notchToleranceCm))
          add('GRADED_NOTCH_POSITION_DRIFT',size,notch.id)
        notchRows.push({size,pieceId:original.id,notchId:notch.id,edgeIndex:notch.edgeIndex,
          stationCm:(notch.t??.5)*edgeLength(current,notch.edgeIndex)})
      }
      for(let edgeIndex=0;edgeIndex<current.points.length;edgeIndex++){
        const lengthCm=edgeLength(current,edgeIndex)
        if(!finite(lengthCm)||lengthCm<=minEdgeCm)add('GRADED_EDGE_COLLAPSE',size,`${original.id}:${edgeIndex}`)
      }
      // No sampled winding/intersection or cutline verification is included.
      // Require independent topology QA before even a measurement-only result.
      // Reject any unsupported curved outline semantics at this gate.
      if(Object.keys(controls).length) add('CURVE_TOPOLOGY_NOT_VERIFIED',size,original.id)
    }
    for(const seam of source.seams){
      const a=lookup.get(seam.a.pieceId),b=lookup.get(seam.b.pieceId)
      if(!a||!b)continue
      const lengthAcm=edgeRangeLength(a,seam.a.edgeIndex,seam.a.startT??0,seam.a.endT??1)
      const lengthBcm=edgeRangeLength(b,seam.b.edgeIndex,seam.b.startT??0,seam.b.endT??1)
      const differenceCm=Math.abs(lengthAcm-lengthBcm)
      const pass=finite(lengthAcm)&&finite(lengthBcm)&&lengthAcm>minEdgeCm&&lengthBcm>minEdgeCm&&
        differenceCm<=seamToleranceCm
      seamRows.push({size,seamId:seam.id,lengthAcm,lengthBcm,differenceCm,pass})
      if(!pass)add('PHYSICAL_SEAM_LENGTH_MISMATCH',size,seam.id)
    }
  }
  return report()
}
