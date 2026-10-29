import {cloneProject} from './project.js'
import {gradePointForPiece} from './grading.js'
import {validateIndustrialGradeRule,evaluateIndustrialGradeTable} from './industrialGradeRules.js'
import {auditGradedSizeRunGeometry} from './gradedSizeRunGeometryAudit.js'

const fail=message=>{throw new Error('Joined-end grading: '+message)}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const TOL=1e-7

function context(project,pieceId,pointIndex){
  const sizes=project?.grading?.sizes,base=project?.grading?.baseSize
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>64||sizes.some(s=>typeof s!=='string'||!s.trim())||new Set(sizes).size!==sizes.length||!sizes.includes(base))fail('invalid garment size run')
  const piece=project?.pieces?.find(p=>p.id===pieceId)
  if(!piece||!Array.isArray(piece.points)||piece.points.length<3)fail('unknown or invalid piece')
  if(!Number.isSafeInteger(pointIndex)||pointIndex<0||pointIndex>=piece.points.length)fail('invalid pointIndex')
  if(piece.points.some(p=>!finite(p.x)||!finite(p.y)))fail('source contains nonfinite geometry')
  return {sizes,base,piece,point:piece.points[pointIndex]}
}
function offsets(project,piece,point,sizes,base){
  const origin=gradePointForPiece(piece,project.grading,base,point)
  return sizes.map(size=>{
    const p=gradePointForPiece(piece,project.grading,size,point)
    return {dx:p.x-origin.x,dy:p.y-origin.y}
  })
}
function matchingOffsets(a,b){return a.length===b.length&&a.every((v,i)=>Math.abs(v.dx-b[i].dx)<=TOL&&Math.abs(v.dy-b[i].dy)<=TOL)}
function checkedPoint(point){
  if(point.gradeRule?.enabled)fail('conflicting legacy point grade rule; resolve it first')
  if(point.namedGradeRuleRef)fail('named grade rule reference must be detached before editing')
}
function checkedExisting(point,sizes,base){
  if(!point.industrialGradeRule)return
  const existing=validateIndustrialGradeRule(point.industrialGradeRule)
  if(!same(existing.sizes,sizes)||existing.baseSize!==base)fail('stale existing industrial grade rule size set/base')
}

/** In EXO, a boundary is a cyclic points array. A normal edge junction is one
 * node referenced by both neighboring edges; it has no second editable ID.
 * Only distinct nodes at the same authored coordinates can be paired.
 */
export function inspectAccuMarkJoinedEnds(project,{pieceId,pointIndex}){
  const {piece,point,sizes,base}=context(project,pieceId,pointIndex)
  const candidates=piece.points.flatMap((other,index)=>index!==pointIndex&&Math.hypot(other.x-point.x,other.y-point.y)<=TOL?[{pointIndex:index,coincident:true}]:[])
  const validCandidates=candidates.map(candidate=>{
    const other=piece.points[candidate.pointIndex]
    let sameCurrentRule=false,reason=null
    try{
      checkedPoint(point);checkedPoint(other)
      checkedExisting(point,sizes,base);checkedExisting(other,sizes,base)
      sameCurrentRule=matchingOffsets(offsets(project,piece,point,sizes,base),offsets(project,piece,other,sizes,base))
    }catch(error){reason=error.message}
    return {...candidate,sameCurrentRule,canAlwaysBoth:reason===null,canBothIfSame:reason===null&&sameCurrentRule,reason}
  })
  return {pieceId,pointIndex,candidates:validCandidates,policies:{individual:true,'both-if-same':validCandidates.some(c=>c.canBothIfSame),'always-both':validCandidates.some(c=>c.canAlwaysBoth)},singleBoundaryNode:candidates.length===0}
}

/** Author a signed centimeter industrial break table on one or two actual nodes.
 * Returned validation is a geometry diagnostic; no manufacturing approval implied.
 */
export function applyAccuMarkJoinedEndGradeRule(project,{pieceId,pointIndex,pairedPointIndex,policy='individual',rule}={}){
  const {piece,point,sizes,base}=context(project,pieceId,pointIndex)
  if(!['individual','both-if-same','always-both'].includes(policy))fail('unsupported policy')
  const normalized=validateIndustrialGradeRule(rule)
  if(!same(normalized.sizes,sizes)||normalized.baseSize!==base)fail('rule size run/base does not match garment')
  const table=evaluateIndustrialGradeTable(normalized)
  const deltas=sizes.map(size=>table[size])
  if(deltas.some(v=>!finite(v.dx)||!finite(v.dy)||Math.abs(v.dx)>1000||Math.abs(v.dy)>1000))fail('graded offset exceeds supported bounds (1000 cm)')
  for(let i=1;i<deltas.length;i++)if(Math.abs(deltas[i].dx-deltas[i-1].dx)>100||Math.abs(deltas[i].dy-deltas[i-1].dy)>100)fail('grade break exceeds supported bounds (100 cm)')
  checkedPoint(point);checkedExisting(point,sizes,base)
  let selected=[pointIndex]
  if(policy!=='individual'){
    if(!Number.isSafeInteger(pairedPointIndex)||pairedPointIndex===pointIndex||pairedPointIndex<0||pairedPointIndex>=piece.points.length)fail('two-end policy requires a distinct pairedPointIndex')
    const partner=piece.points[pairedPointIndex]
    if(Math.hypot(partner.x-point.x,partner.y-point.y)>TOL)fail('paired node is not a coincident independently addressable endpoint')
    checkedPoint(partner);checkedExisting(partner,sizes,base)
    if(policy==='both-if-same'&&!matchingOffsets(offsets(project,piece,point,sizes,base),offsets(project,piece,partner,sizes,base)))fail('existing graded rules differ at joined endpoints')
    selected=[pointIndex,pairedPointIndex]
  }else if(pairedPointIndex!==undefined)fail('pairedPointIndex requires a two-end policy')
  const baseline=auditGradedSizeRunGeometry(project)
  const copy=cloneProject(project)
  const target=copy.pieces.find(p=>p.id===pieceId)
  for(const index of selected)target.points[index].industrialGradeRule=structuredClone(normalized)
  for(const size of sizes)for(const index of selected){
    const graded=gradePointForPiece(target,copy.grading,size,target.points[index])
    if(!finite(graded.x)||!finite(graded.y)||Math.abs(graded.x)>1e7||Math.abs(graded.y)>1e7)fail('graded point exceeds coordinate safety bounds')
  }
  const validation=auditGradedSizeRunGeometry(copy)
  const baselineIssues=new Set(baseline.issues.map(issue=>JSON.stringify(issue)))
  const introduced=validation.issues.filter(issue=>!baselineIssues.has(JSON.stringify(issue)))
  if(introduced.length)fail('grade introduces unsafe geometry: '+introduced.map(i=>`${i.code} (${i.size}/${i.pieceId})`).join(', '))
  return {project:copy,validation:{...validation,sizes:[...sizes],pass:introduced.length===0,appliedPointIndices:selected,preexistingIssues:baseline.issues.length,introducedIssues:introduced,manufacturingApproved:false}}
}
