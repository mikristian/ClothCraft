import {cloneProject,edgeLength,edgePointAt} from './project.js'
import {gradeProject} from './grading.js'

const validId = value => typeof value === 'string' && value.trim().length > 0
const sizesOf = project => project?.grading?.sizes?.length ? project.grading.sizes : [project?.grading?.baseSize ?? 'M']
function locate(project,pieceId,notchId) {
  if(!validId(pieceId)||!validId(notchId)) throw new Error('Valid pieceId and notchId required')
  const piece=project?.pieces?.find(p=>p.id===pieceId)
  if(!piece) throw new Error('Missing piece '+pieceId)
  const notch=piece.notches?.find(n=>n.id===notchId)
  if(!notch) throw new Error('Missing notch '+notchId)
  if(!Number.isInteger(notch.edgeIndex)||notch.edgeIndex<0||notch.edgeIndex>=piece.points.length) throw new Error('Invalid notch edge')
  return {piece,notch}
}
function station(piece,notch,rule) {
  const length=edgeLength(piece,notch.edgeIndex)
  if(!Number.isFinite(length)||!(rule.distanceCm>0)||!(rule.distanceCm<length-1e-9)) throw new Error('Notch station outside edge length')
  const t=rule.from==='end'?1-rule.distanceCm/length:rule.distanceCm/length
  const point=edgePointAt(piece,notch.edgeIndex,t,64)?.point
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)) throw new Error('Invalid notch station point')
  return {t,length,point}
}
export function applyAccuMarkNotchArcStationsToGraded(gradedProject,sourceProject,size) {
  if(!(sourceProject?.pieces??[]).some(piece=>(piece.notches??[]).some(notch=>notch.gradeArcStation))) return gradedProject
  const next=cloneProject(gradedProject)
  for(const sourcePiece of sourceProject?.pieces??[]) {
    const rules=(sourcePiece.notches??[]).filter(n=>n.gradeArcStation)
    if(!rules.length)continue
    const target=next.pieces?.find(p=>p.id===sourcePiece.id)
    if(!target)throw new Error('Missing graded piece '+sourcePiece.id+' at '+size)
    for(const sourceNotch of rules) {
      const rule=sourceNotch.gradeArcStation
      if(rule.version!==1||!Number.isFinite(rule.distanceCm)||!['start','end'].includes(rule.from))throw new Error('Invalid grade arc station')
      const notch=target.notches?.find(n=>n.id===sourceNotch.id)
      if(!notch||notch.edgeIndex!==sourceNotch.edgeIndex)throw new Error('Stale notch topology at '+size)
      const {t,point}=station(target,notch,rule)
      notch.t=t
      if('x' in notch && 'y' in notch){notch.x=point.x;notch.y=point.y}
    }
  }
  return next
}
export function applyAccuMarkGradedNotchDistance(project,{pieceId,notchId,distanceCm,from='start'}={}) {
  if(!Number.isFinite(distanceCm)||distanceCm<=0||!['start','end'].includes(from))throw new Error('Invalid positive distanceCm or direction')
  const {piece,notch}=locate(project,pieceId,notchId)
  const rule={distanceCm,from,version:1}
  const base=station(piece,notch,rule)
  const sizes=sizesOf(project)
  if(new Set(sizes).size!==sizes.length)throw new Error('Duplicate grading sizes')
  const validation=[]
  for(const size of sizes) {
    const graded=gradeProject(project,size)
    const located=locate(graded,pieceId,notchId)
    if(located.notch.edgeIndex!==notch.edgeIndex)throw new Error('Stale notch topology at '+size)
    const result=station(located.piece,located.notch,rule)
    validation.push({size,edgeLengthCm:result.length,t:result.t,distanceCm})
  }
  const next=cloneProject(project)
  const edited=locate(next,pieceId,notchId).notch
  edited.gradeArcStation=rule
  edited.t=base.t
  if('x' in edited && 'y' in edited){edited.x=base.point.x;edited.y=base.point.y}
  return {project:next,validation:{sizes:[...sizes],stations:validation,factoryCertified:false}}
}
export function inspectAccuMarkGradedNotchDistance(project,{pieceId,notchId}={}) {
  const {notch}=locate(project,pieceId,notchId)
  if(!notch.gradeArcStation)throw new Error('Notch has no grade arc station')
  const rows=sizesOf(project).map(size=>{
    const graded=gradeProject(project,size)
    const located=locate(graded,pieceId,notchId)
    if(located.notch.edgeIndex!==notch.edgeIndex)throw new Error('Stale notch topology at '+size)
    const result=station(located.piece,located.notch,notch.gradeArcStation)
    return {size,edgeLengthCm:result.length,t:result.t,distanceCm:notch.gradeArcStation.distanceCm,x:result.point.x,y:result.point.y}
  })
  return {pieceId,notchId,gradeArcStation:cloneProject(notch.gradeArcStation),rows}
}
