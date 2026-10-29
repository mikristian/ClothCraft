import {cloneProject} from './project.js'
import {gradeProject} from './grading.js'
import {evaluateIndustrialGradeTable,INDUSTRIAL_GRADE_MODES,validateIndustrialGradeRule} from './industrialGradeRules.js'

// AccuMark exercise 19.19 / 19.20-inspired single-axis operations.
// These are base-relative XY movements in EXO centimetres, NOT screen-pixel
// transforms, grainline-relative rules, or auto-correction of joined ends.
const fail = message => {throw new Error('AccuMark axis grading: '+message)}
const finite = value => typeof value==='number' && Number.isFinite(value)

function sizeLine(project) {
  const sizes=project?.grading?.sizes,base=project?.grading?.baseSize
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>64||
    sizes.some(s=>typeof s!=='string'||!s.trim()||s!==s.trim())||
    new Set(sizes).size!==sizes.length||!sizes.includes(base))
    fail('valid ordered size line and base size required')
  return {sizes,base}
}

function pointRule(project,reference,run,{editable=false}={}) {
  if(!reference||typeof reference.pieceId!=='string'||!reference.pieceId||
    !Number.isSafeInteger(reference.pointIndex))fail('piece ID and point index required')
  const matches=project.pieces?.filter(piece=>piece?.id===reference.pieceId)||[]
  if(matches.length!==1)fail('unknown or duplicate piece')
  const point=matches[0].points?.[reference.pointIndex]
  if(!point||!finite(point.x)||!finite(point.y))fail('unknown or invalid point')
  if(editable&&point.namedGradeRuleRef)fail('detach named rule reference before changing its axis movement')
  if(!point.industrialGradeRule)fail('complete authored industrial grade rule required for this point')
  const rule=validateIndustrialGradeRule(point.industrialGradeRule)
  if(rule.baseSize!==run.base||JSON.stringify(rule.sizes)!==JSON.stringify(run.sizes))
    fail('point grade rule has a different ordered size line or base size')
  const table=evaluateIndustrialGradeTable(rule)
  if(run.sizes.some(size=>!finite(table[size]?.dx)||!finite(table[size]?.dy)))
    fail('nonfinite graded point movement')
  return {piece:matches[0],point,table}
}

function makeRule(run,offsets) {
  const steps=offsets.slice(1).map((current,i)=>({
    dx:current.dx-offsets[i].dx,dy:current.dy-offsets[i].dy,
  }))
  if(steps.some(step=>!finite(step.dx)||!finite(step.dy)||
    Math.abs(step.dx)>100||Math.abs(step.dy)>100))
    fail('resulting grade step exceeds supported 100 cm bound')
  return validateIndustrialGradeRule({
    mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,
    sizes:[...run.sizes],baseSize:run.base,steps,
  })
}

/** Copy one axis of the grade rule from a source point into a target point, or
 * negate one axis of the target's authored growth. Neither changes base size
 * geometry or the other axis. Returns {project,validation} immutably.
 *
 * spec: {kind:'copy-axis',axis:'x'|'y',source:{pieceId,pointIndex},
 *             target:{pieceId,pointIndex}}
 *   or: {kind:'flip-axis',axis:'x'|'y',target:{pieceId,pointIndex}}
 */
export function applyAccuMarkGradeAxisOperation(project,spec) {
  if(!project||!Array.isArray(project.pieces)||!spec||typeof spec!=='object')
    fail('valid project and operation required')
  if(spec.kind!=='copy-axis'&&spec.kind!=='flip-axis')fail('unsupported axis operation')
  if(spec.axis!=='x'&&spec.axis!=='y')fail('axis must be x or y')
  const run=sizeLine(project)
  const target=pointRule(project,spec.target,run,{editable:true})
  const source=spec.kind==='copy-axis'?pointRule(project,spec.source,run):null
  const key=spec.axis==='x'?'dx':'dy'
  const offsets=run.sizes.map(size=>{
    const pair={...target.table[size]}
    pair[key]=source?source.table[size][key]:-pair[key]
    return pair
  })
  const baseOffset=offsets[run.sizes.indexOf(run.base)]
  if(Math.abs(baseOffset.dx)>1e-9||Math.abs(baseOffset.dy)>1e-9)
    fail('base size must remain fixed')
  const next=cloneProject(project)
  const piece=next.pieces.find(p=>p.id===spec.target.pieceId)
  const point=piece.points[spec.target.pointIndex]
  point.industrialGradeRule=makeRule(run,offsets)
  const checkedSizes=[]
  for(const size of run.sizes) {
    const graded=gradeProject(next,size)
    if(graded.pieces.some(p=>!p.points?.length||p.points.some(pt=>!finite(pt.x)||!finite(pt.y))))
      fail('all-size grade geometry contains invalid coordinates')
    checkedSizes.push(size)
  }
  return {project:next,validation:{
    sizes:checkedSizes,axis:spec.axis,kind:spec.kind,units:'cm',
    baseSize:run.base,unchangedOppositeAxis:true,manufacturingApproved:false,
    cornerJoinPolicy:'explicit-point-only',
  }}
}
