import {gradeProject} from './grading.js'
import {samplePieceBoundary} from './project.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const fail=message=>{throw new Error('AccuMark grade nest: '+message)}

/** Build a non-mutating physical outline overlay. Restacking moves the
 * VISUALIZATION only, never grading rules, source points, cutlines or DXF.
 * This implements the one-point view mode from exercise 19.11; it does not
 * claim the book's two-point registration mode.
 */
export function buildAccuMarkRestackedNest(project,{
 pieceId,pointIndex=0,mode='absolute',samplesPerEdge=12,
}={}){
 if(!project||!Array.isArray(project.pieces)||typeof pieceId!=='string'||!pieceId)fail('valid project and piece ID required')
 const sizeLine=project.grading?.sizes
 const base=project.grading?.baseSize
 if(!Array.isArray(sizeLine)||sizeLine.length<2||sizeLine.length>64||
  sizeLine.some(s=>typeof s!=='string'||!s.trim())||new Set(sizeLine).size!==sizeLine.length||
  !sizeLine.includes(base))fail('valid ordered size run and base required')
 if(mode!=='absolute'&&mode!=='stack')fail('mode must be absolute or stack')
 if(!Number.isInteger(samplesPerEdge)||samplesPerEdge<4||samplesPerEdge>64)fail('unsupported curved-edge sample count')
 const originals=project.pieces.filter(piece=>piece?.id===pieceId)
 if(originals.length!==1)fail('piece identity missing or ambiguous')
 const original=originals[0]
 if(!Array.isArray(original.points)||original.points.length<3||!Number.isInteger(pointIndex)||
    pointIndex<0||pointIndex>=original.points.length)fail('invalid restack point')
 const basePoint=original.points[pointIndex]
 if(!finite(basePoint?.x)||!finite(basePoint?.y))fail('invalid base anchor')
 const outlines=sizeLine.map(size=>{
  const graded=gradeProject(project,size)
  const matches=graded.pieces.filter(piece=>piece?.id===pieceId)
  if(matches.length!==1||matches[0].points?.length!==original.points.length)
   fail('graded piece identity or topology changed for '+size)
  const piece=matches[0]
  const point=piece.points[pointIndex]
  if(!finite(point?.x)||!finite(point?.y))fail('nonfinite graded anchor')
  const translate=mode==='stack'?{x:basePoint.x-point.x,y:basePoint.y-point.y}:{x:0,y:0}
  const boundary=samplePieceBoundary(piece,samplesPerEdge).points
  if(!Array.isArray(boundary)||boundary.length<3||boundary.length>100000)
   fail('invalid graded boundary')
  const points=boundary.map(p=>{
   if(!finite(p?.x)||!finite(p?.y))fail('nonfinite graded boundary')
   const x=p.x+translate.x,y=p.y+translate.y
   if(!finite(x)||!finite(y))fail('restacked point overflow')
   return {x,y}
  })
  return {size,points,anchorCm:{x:point.x+translate.x,y:point.y+translate.y},translationCm:translate,units:'cm'}
 })
 const all=outlines.flatMap(outline=>outline.points)
 const xs=all.map(p=>p.x),ys=all.map(p=>p.y)
 const bounds={minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys)}
 if(!Object.values(bounds).every(finite)||bounds.maxX-bounds.minX<.001||bounds.maxY-bounds.minY<.001)
  fail('degenerate graded nest bounding box')
 return {schema:'exo.accumark.restacked-nest.v1',pieceId,baseSize:base,sizeLine:[...sizeLine],
  mode,pointIndex,outlines,bounds,units:'cm',displayOnly:true,manufacturingApproved:false}
}
