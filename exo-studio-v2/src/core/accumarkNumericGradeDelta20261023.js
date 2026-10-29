/** Numeric point grading inspired by AccuMark exercises 19.5 and 19.6. */
import {cloneProject} from './project.js'
import {gradePointForPiece,gradeProject} from './grading.js'
import {validateIndustrialGradeRule,INDUSTRIAL_GRADE_MODES} from './industrialGradeRules.js'

const finite = n => typeof n === 'number' && Number.isFinite(n)
const fail = message => {throw new Error('AccuMark numeric grade delta: '+message)}

function context(project,spec,editing=false){
  const sizes=project?.grading?.sizes,baseSize=project?.grading?.baseSize
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>64||sizes.some(s=>typeof s!=='string'||!s.trim()||s.trim()!==s)||new Set(sizes).size!==sizes.length||!sizes.includes(baseSize))fail('invalid ordered size line or base size')
  if(!spec||typeof spec.pieceId!=='string'||!Number.isSafeInteger(spec.pointIndex)||spec.pointIndex<0)fail('pieceId and pointIndex required')
  const matches=project.pieces?.filter(p=>p.id===spec.pieceId)||[]
  if(matches.length!==1)fail('unknown or duplicate piece')
  const piece=matches[0],point=piece.points?.[spec.pointIndex]
  if(!point||!finite(point.x)||!finite(point.y))fail('invalid selected point')
  if(editing&&point.namedGradeRuleRef)fail('detach named grade rule reference before editing')
  if(point.industrialGradeRule){
    const rule=validateIndustrialGradeRule(point.industrialGradeRule)
    if(JSON.stringify(rule.sizes)!==JSON.stringify(sizes)||rule.baseSize!==baseSize)fail('incompatible industrial size line')
  }
  const base=gradePointForPiece(piece,project.grading,baseSize,point)
  const rows=sizes.map(size=>{
    const position=gradePointForPiece(piece,project.grading,size,point)
    const dx=position.x-base.x,dy=position.y-base.y
    if(!finite(dx)||!finite(dy))fail('nonfinite graded coordinate')
    return {size,dxCm:dx,dyCm:dy}
  })
  return {sizes,baseSize,baseIndex:sizes.indexOf(baseSize),piece,point,rows}
}

export function readAccuMarkGradeDeltaMatrix(project,{pieceId,pointIndex}){
  const {sizes,baseSize,rows}=context(project,{pieceId,pointIndex})
  return {sizes:[...sizes],rows,baseSize,units:'cm'}
}

/** In cumulative mode dxCm/dyCm are base-relative values for the named size.
 * In incremental mode they are signed changes from its adjacent size toward
 * the base, i.e. outward growth for smaller and larger sizes alike.
 * maintainGrowths propagates the change to sizes farther from the base.
 */
export function editAccuMarkGradeDelta(project,spec){
  const {sizes,baseSize,baseIndex,rows}=context(project,spec,true)
  const mode=spec.mode??'cumulative'
  if(mode!=='cumulative'&&mode!=='incremental')fail('mode must be cumulative or incremental')
  if(!sizes.includes(spec.size))fail('unknown target size')
  const index=sizes.indexOf(spec.size)
  if(index===baseIndex)fail('base size is fixed; select a non-base size')
  if(spec.dxCm===undefined&&spec.dyCm===undefined)fail('provide dxCm or dyCm')
  if(spec.dxCm!==undefined&&!finite(spec.dxCm)||spec.dyCm!==undefined&&!finite(spec.dyCm))fail('delta must be finite numeric centimeters')
  if(spec.maintainGrowths!==undefined&&typeof spec.maintainGrowths!=='boolean')fail('maintainGrowths must be boolean')
  const previous=rows.map(row=>({dx:row.dxCm,dy:row.dyCm}))
  const updated=previous.map(p=>({...p}))
  const adjacent=index>baseIndex?index-1:index+1
  for(const [field,key] of [['dxCm','dx'],['dyCm','dy']]){
    if(spec[field]===undefined)continue
    const wanted=mode==='incremental'?previous[adjacent][key]+spec[field]:spec[field]
    const difference=wanted-previous[index][key]
    if(!finite(wanted)||!finite(difference))fail('delta arithmetic overflow')
    updated[index][key]=wanted
    if(spec.maintainGrowths){
      const direction=index>baseIndex?1:-1
      for(let i=index+direction;i>=0&&i<sizes.length;i+=direction){
        updated[i][key]=previous[i][key]+difference
      }
    }
  }
  if(Math.abs(updated[baseIndex].dx)>1e-8||Math.abs(updated[baseIndex].dy)>1e-8)fail('base must remain fixed')
  const steps=updated.slice(1).map((p,i)=>({dx:p.dx-updated[i].dx,dy:p.dy-updated[i].dy}))
  if(steps.some(p=>!finite(p.dx)||!finite(p.dy)||Math.abs(p.dx)>100||Math.abs(p.dy)>100))fail('resulting grade break exceeds 100 cm')
  const next=cloneProject(project)
  const target=next.pieces.find(p=>p.id===spec.pieceId).points[spec.pointIndex]
  target.industrialGradeRule=validateIndustrialGradeRule({mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,sizes:[...sizes],baseSize,steps})
  for(const size of sizes){
    const graded=gradeProject(next,size)
    if(!graded.pieces?.every(piece=>piece.points?.every(p=>finite(p.x)&&finite(p.y))))fail('invalid all-size graded geometry')
    const point=graded.pieces.find(p=>p.id===spec.pieceId)?.points?.[spec.pointIndex]
    const original=next.pieces.find(p=>p.id===spec.pieceId).points[spec.pointIndex]
    const desired=updated[sizes.indexOf(size)]
    if(!point||Math.abs((point.x-original.x)-desired.dx)>1e-7||Math.abs((point.y-original.y)-desired.dy)>1e-7)fail('graded point does not match requested movement')
  }
  return {project:next,validation:{sizes:[...sizes],baseSize,units:'cm',mode,maintainGrowths:spec.maintainGrowths??false,manufacturingApproved:false}}
}
