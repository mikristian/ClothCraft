/** Auditable, source-preserving AccuMark-inspired grade rule operations.
 * Work in centimetres on signed, base-relative X/Y offsets for all named sizes.
 * They never certify seams, physical cut outlines or receiving CAD compatibility.
 */
import {cloneProject} from './project.js'
import {gradePointForPiece,gradeProject} from './grading.js'
import {evaluateIndustrialGradeTable,INDUSTRIAL_GRADE_MODES,validateIndustrialGradeRule} from './industrialGradeRules.js'

const MODE=INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL
const finite=(n)=>typeof n==='number'&&Number.isFinite(n)
const fail=(message)=>{throw new Error('AccuMark grading: '+message)}
const positive=(n)=>finite(n)&&n>=0&&n<=1

function readRun(project){
  const sizes=project?.grading?.sizes,base=project?.grading?.baseSize
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>64||sizes.some(s=>typeof s!=='string'||!s.trim()||s.trim()!==s)||new Set(sizes).size!==sizes.length||!sizes.includes(base))fail('invalid size line or base size')
  return {sizes,base,baseIndex:sizes.indexOf(base)}
}
function getPiece(project,pieceId){
  const piece=project?.pieces?.find(p=>p.id===pieceId)
  if(!piece||!Array.isArray(piece.points)||piece.points.length<3)fail('unknown or invalid piece '+String(pieceId))
  return piece
}
function readPoint(project,{pieceId,pointIndex}){
  const piece=getPiece(project,pieceId)
  if(!Number.isSafeInteger(pointIndex)||pointIndex<0||pointIndex>=piece.points.length)fail('select a valid point index')
  const point=piece.points[pointIndex]
  if(!finite(point.x)||!finite(point.y))fail('nonfinite source point')
  return {piece,point}
}
function sourceOffsets(project,piece,point){
  const {sizes,base}=readRun(project)
  // Preserve existing independent grade rules and the actual coordinates generated
  // by the legacy automatic grader as an editable canonical starting point.
  const basePoint=gradePointForPiece(piece,project.grading,base,point)
  const out=sizes.map(size=>{
    const p=gradePointForPiece(piece,project.grading,size,point)
    return {dx:p.x-basePoint.x,dy:p.y-basePoint.y}
  })
  if(out.some(p=>!finite(p.dx)||!finite(p.dy)))fail('grade has nonfinite coordinates')
  return out
}
function industrialRule(sizes,base,offsets){
  const steps=offsets.slice(1).map((p,i)=>({dx:p.dx-offsets[i].dx,dy:p.dy-offsets[i].dy}))
  if(steps.some(p=>!finite(p.dx)||!finite(p.dy)||Math.abs(p.dx)>100||Math.abs(p.dy)>100))fail('grade step exceeds supported bounds')
  return validateIndustrialGradeRule({mode:MODE,sizes:[...sizes],baseSize:base,steps})
}
function commitPoint(project,spec,offsets){
  const {sizes,base,baseIndex}=readRun(project)
  if(offsets.length!==sizes.length||offsets.some(o=>!finite(o.dx)||!finite(o.dy))||Math.abs(offsets[baseIndex].dx)>1e-8||Math.abs(offsets[baseIndex].dy)>1e-8)fail('invalid grade offsets or shifted base')
  const {point}=readPoint(project,spec)
  const next=cloneProject(project)
  const edited=next.pieces.find(p=>p.id===spec.pieceId).points[spec.pointIndex]
  edited.industrialGradeRule=industrialRule(sizes,base,offsets)
  // Validate with the same evaluator used during garment export.
  for(const size of sizes){
    const p=gradePointForPiece(next.pieces.find(p=>p.id===spec.pieceId),next.grading,size,edited)
    if(!finite(p.x)||!finite(p.y))fail('grade evaluation invalid for '+size)
  }
  if(JSON.stringify(project)===JSON.stringify(next)&&!point.industrialGradeRule)fail('no grade update')
  return next
}
/** Grade point by physical signed perpendicular offset from its base contour edge.
 * Per-size displacement is expressed in cm from original base point.
 * direction +1 means left-hand normal of start->end edge.
 */
export function offsetGradePoint(project,spec){
  const {sizes,baseIndex}=readRun(project)
  const {piece}=readPoint(project,spec)
  const edge=spec.edgeIndex
  if(!Number.isSafeInteger(edge)||edge<0||edge>=piece.points.length)fail('invalid reference edge')
  const a=piece.points[edge],b=piece.points[(edge+1)%piece.points.length]
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)
  if(!finite(len)||len<1e-8)fail('degenerate reference edge')
  const amounts=spec.offsetsCm
  if(!Array.isArray(amounts)||amounts.length!==sizes.length||amounts.some(n=>!finite(n)||Math.abs(n)>100)||Math.abs(amounts[baseIndex])>1e-8)fail('offsetsCm must be signed cm by size with zero at base')
  const sign=spec.direction??1
  if(sign!==1&&sign!==-1)fail('invalid normal direction')
  return commitPoint(project,spec,amounts.map(d=>({dx:-dy/len*d*sign,dy:dx/len*d*sign})))
}
/** Distribute point grading evenly on either side of the base from existing
 * first/last-size displacements. Does not move the base or outer sizes.
 */
export function distributeGradePoint(project,spec){
  const {sizes,baseIndex}=readRun(project)
  const {piece,point}=readPoint(project,spec)
  const offsets=sourceOffsets(project,piece,point)
  const low={...offsets[0]},high={...offsets.at(-1)}
  for(let i=1;i<baseIndex;i++){
    const t=(baseIndex-i)/baseIndex
    offsets[i]={dx:low.dx*t,dy:low.dy*t}
  }
  for(let i=baseIndex+1;i<sizes.length-1;i++){
    const t=(i-baseIndex)/(sizes.length-1-baseIndex)
    offsets[i]={dx:high.dx*t,dy:high.dy*t}
  }
  return commitPoint(project,spec,offsets)
}
/** Relax the interior size deltas of a point while preserving first/last
 * size and base, with a bounded 0..1 smoothing strength. One operation changes
 * the authored rule, rather than applying a display-only curve filter.
 */
export function smoothGradePoint(project,spec){
  const {sizes,baseIndex}=readRun(project)
  const strength=spec.strength??.5
  if(!positive(strength))fail('strength must be in [0,1]')
  const {piece,point}=readPoint(project,spec)
  const before=sourceOffsets(project,piece,point)
  const after=before.map(o=>({...o}))
  for(let i=1;i<sizes.length-1;i++){
    if(i===baseIndex)continue
    const avg={dx:(before[i-1].dx+before[i+1].dx)/2,dy:(before[i-1].dy+before[i+1].dy)/2}
    after[i]={dx:before[i].dx*(1-strength)+avg.dx*strength,dy:before[i].dy*(1-strength)+avg.dy*strength}
  }
  return commitPoint(project,spec,after)
}
/** Add/remove/respace named sizes using explicit, strictly increasing real
 * size positions. Requires complete industrial grading on all points because
 * automatic/legacy rules cannot preserve a nonuniform size-space transform.
 * Existing named sizes and the base keep exactly the same coordinates.
 */
export function redistributeSizeLine(project,spec){
  const {sizes,base}=readRun(project)
  const oldPositions=spec?.oldPositions,newPositions=spec?.newPositions
  if(!Array.isArray(oldPositions)||oldPositions.length!==sizes.length||!Array.isArray(newPositions)||newPositions.length<2||newPositions.length>64)fail('size positions required for old and new size lines')
  if(oldPositions.some(x=>!x||typeof x!=='object'||typeof x.size!=='string')||newPositions.some(x=>!x||typeof x!=='object'||typeof x.size!=='string'))fail('size positions require named size records')
  const oldValues=oldPositions.map(x=>x.position)
  const newValues=newPositions.map(x=>x.position)
  const sorted=(arr)=>arr.every((x,i)=>finite(x)&&(i===0||arr[i-1]<x))
  if(!sorted(oldValues)||!sorted(newValues)||oldPositions.some(x=>!x.size.trim()||x.size.trim()!==x.size)||newPositions.some(x=>!x.size.trim()||x.size.trim()!==x.size)||new Set(newPositions.map(x=>x.size)).size!==newPositions.length)fail('size positions must be finite, strictly increasing, uniquely named')
  if(oldPositions.some((entry,i)=>entry.size!==sizes[i]))fail('old sizes differ from project')
  if(newPositions.filter(x=>x.size===base).length!==1)fail('base size must remain present')
  const oldByName=new Map(oldPositions.map(x=>[x.size,x.position]))
  for(const entry of newPositions){
    const exact=oldByName.get(entry.size)
    if(exact!==undefined&&exact!==entry.position)fail('existing size position must remain unchanged: '+entry.size)
    if(entry.position<oldValues[0]||entry.position>oldValues.at(-1))fail('new sizes outside graded size range are not supported')
  }
  const next=cloneProject(project)
  for(const piece of next.pieces){
    for(let i=0;i<piece.points.length;i++){
      const point=piece.points[i]
      if(!point.industrialGradeRule)fail('all points must have complete industrial rules to redistribute the size line')
      const rule=validateIndustrialGradeRule(point.industrialGradeRule)
      if(rule.baseSize!==base||rule.sizes.length!==sizes.length||rule.sizes.some((size,index)=>size!==sizes[index]))fail('point grade rule has mismatched ordered size line or base size')
      const old=evaluateIndustrialGradeTable(rule)
      const oldOffsets=sizes.map(s=>old[s])
      const transformed=newPositions.map(({position})=>{
        const index=oldValues.findIndex(x=>x>=position)
        if(index<0)fail('size interpolation outside bounds')
        if(index===0||oldValues[index]===position)return {...oldOffsets[index]}
        const t=(position-oldValues[index-1])/(oldValues[index]-oldValues[index-1])
        return {dx:oldOffsets[index-1].dx*(1-t)+oldOffsets[index].dx*t,
                dy:oldOffsets[index-1].dy*(1-t)+oldOffsets[index].dy*t}
      })
      const baseIndex=newPositions.findIndex(x=>x.size===base)
      if(transformed.some(o=>!finite(o.dx)||!finite(o.dy))||transformed[baseIndex].dx!==0||transformed[baseIndex].dy!==0)fail('redistributed grade must preserve finite offsets and an unchanged base')
      point.industrialGradeRule=industrialRule(newPositions.map(x=>x.size),base,transformed)
    }
  }
  next.grading.sizes=newPositions.map(x=>x.size)
  next.grading.baseSize=base
  for(const size of next.grading.sizes)gradeProject(next,size)
  return next
}
