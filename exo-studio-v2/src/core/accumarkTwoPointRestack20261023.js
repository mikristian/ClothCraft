import {gradeProject} from './grading.js'
import {samplePieceBoundary} from './project.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const EPS=1e-9
const fail=(reason,details={})=>({ok:false,reason,...details,manufacturingApproved:false,displayOnly:true})
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y)

/**
 * Rigid two-point registration of each graded piece to the base-size guide.
 * First corresponding vertex coincides exactly; the second lies on the same
 * directed ray. A guide-length mismatch cannot be corrected without scaling
 * and is reported explicitly as residualCm, never hidden in the outline.
 */
export function buildAccuMarkTwoPointRestack20261023(project,{
  pieceId,firstPointIndex,secondPointIndex,samplesPerEdge=12,
}={}){
  const sizes=project?.grading?.sizes,baseSize=project?.grading?.baseSize
  if(!Array.isArray(sizes)||sizes.length!==6||new Set(sizes).size!==6||
    sizes.some(s=>typeof s!=='string'||!s.trim())||!sizes.includes(baseSize))
    return fail('INVALID_SIZE_RUN')
  if(!Array.isArray(project?.pieces)||project.pieces.length===0||project.pieces.length>256||
    project.pieces.some(p=>typeof p?.id!=='string'||!p.id)||
    new Set(project.pieces.map(p=>p.id)).size!==project.pieces.length)
    return fail('INVALID_SOURCE_PIECES')
  if(typeof pieceId!=='string'||project.pieces.filter(p=>p.id===pieceId).length!==1)
    return fail('INVALID_PIECE_ID')
  if(!Number.isSafeInteger(samplesPerEdge)||samplesPerEdge<4||samplesPerEdge>64)
    return fail('INVALID_SAMPLE_COUNT')
  const source=project.pieces.find(p=>p.id===pieceId),n=source?.points?.length
  if(!Number.isSafeInteger(n)||n<3||n>4096||
    !Number.isSafeInteger(firstPointIndex)||!Number.isSafeInteger(secondPointIndex)||
    firstPointIndex<0||secondPointIndex<0||firstPointIndex>=n||secondPointIndex>=n||
    firstPointIndex===secondPointIndex)return fail('INVALID_GUIDE_INDICES')
  if(source.points.some(p=>!finite(p?.x)||!finite(p?.y)))return fail('INVALID_SOURCE_POINTS')
  let gradedBySize
  try{
    gradedBySize=sizes.map(size=>{
      const graded=gradeProject(project,size)
      if(!Array.isArray(graded?.pieces)||graded.pieces.length!==project.pieces.length||
        graded.pieces.some((p,i)=>p.id!==project.pieces[i].id||p.points?.length!==project.pieces[i].points.length))
        throw Error('GRADED_TOPOLOGY_CHANGED')
      const piece=graded.pieces.find(p=>p.id===pieceId)
      if(piece.points.some(p=>!finite(p?.x)||!finite(p?.y)))throw Error('INVALID_GRADED_POINTS')
      return {size,piece}
    })
  }catch(error){return fail('GRADE_EVALUATION_FAILED',{message:error.message})}
  const base=gradedBySize.find(row=>row.size===baseSize).piece
  const baseFirst=base.points[firstPointIndex],baseSecond=base.points[secondPointIndex]
  const baseLengthCm=distance(baseFirst,baseSecond)
  if(!finite(baseLengthCm)||baseLengthCm<=EPS)return fail('DEGENERATE_BASE_GUIDE')
  const baseAngle=Math.atan2(baseSecond.y-baseFirst.y,baseSecond.x-baseFirst.x)
  const outlines=[]
  for(const {size,piece} of gradedBySize){
    const sourceFirst=piece.points[firstPointIndex],sourceSecond=piece.points[secondPointIndex]
    const sourceLengthCm=distance(sourceFirst,sourceSecond)
    if(!finite(sourceLengthCm)||sourceLengthCm<=EPS)
      return fail('DEGENERATE_GRADED_GUIDE',{size})
    const sourceAngle=Math.atan2(sourceSecond.y-sourceFirst.y,sourceSecond.x-sourceFirst.x)
    const rotationRadians=size===baseSize?0:Math.atan2(Math.sin(baseAngle-sourceAngle),Math.cos(baseAngle-sourceAngle))
    const c=Math.cos(rotationRadians),s=Math.sin(rotationRadians)
    const translationCm=size===baseSize?{x:0,y:0}:{
      x:baseFirst.x-(c*sourceFirst.x-s*sourceFirst.y),
      y:baseFirst.y-(s*sourceFirst.x+c*sourceFirst.y),
    }
    const transformPoint=p=>({x:c*p.x-s*p.y+translationCm.x,y:s*p.x+c*p.y+translationCm.y})
    let boundary
    try{boundary=samplePieceBoundary(piece,samplesPerEdge).points}
    catch(error){return fail('BOUNDARY_SAMPLING_FAILED',{size,message:error.message})}
    if(!Array.isArray(boundary)||boundary.length<3||boundary.length>100000||
      boundary.some(p=>!finite(p?.x)||!finite(p?.y)))return fail('INVALID_GRADED_BOUNDARY',{size})
    const points=boundary.map(transformPoint)
    const vertices=piece.points.map(transformPoint)
    if([...points,...vertices].some(p=>!finite(p.x)||!finite(p.y)))return fail('TRANSFORM_OVERFLOW',{size})
    const targetFirst=vertices[firstPointIndex],targetSecond=vertices[secondPointIndex]
    const firstResidualCm=distance(targetFirst,baseFirst)
    const secondResidualCm=distance(targetSecond,baseSecond)
    const lengthMismatchCm=sourceLengthCm-baseLengthCm
    const residualCm=Math.max(firstResidualCm,secondResidualCm)
    if(Math.abs(residualCm-Math.abs(lengthMismatchCm))>1e-6)return fail('REGISTRATION_INCONSISTENT',{size})
    outlines.push({size,points,vertices,
      transform:{rotationRadians,rotationDegrees:rotationRadians*180/Math.PI,
        translationCm,cos:c,sin:s,scale:1},
      sourceGuide:{first:{x:sourceFirst.x,y:sourceFirst.y},second:{x:sourceSecond.x,y:sourceSecond.y},lengthCm:sourceLengthCm},
      targetGuide:{first:{...targetFirst},second:{...targetSecond},lengthCm:distance(targetFirst,targetSecond)},
      referenceGuide:{first:{x:baseFirst.x,y:baseFirst.y},second:{x:baseSecond.x,y:baseSecond.y},lengthCm:baseLengthCm},
      firstResidualCm,secondResidualCm,lengthMismatchCm,residualCm,units:'cm'})
  }
  const all=outlines.flatMap(o=>o.points)
  const bounds={minX:Math.min(...all.map(p=>p.x)),minY:Math.min(...all.map(p=>p.y)),
    maxX:Math.max(...all.map(p=>p.x)),maxY:Math.max(...all.map(p=>p.y))}
  if(Object.values(bounds).some(v=>!finite(v)))return fail('INVALID_BOUNDS')
  return {ok:true,schema:'exo.accumark.two-point-restack.v1',pieceId,baseSize,
    sizeLine:[...sizes],firstPointIndex,secondPointIndex,samplesPerEdge,outlines,bounds,
    maxResidualCm:Math.max(...outlines.map(o=>o.residualCm)),units:'cm',displayOnly:true,manufacturingApproved:false}
}
