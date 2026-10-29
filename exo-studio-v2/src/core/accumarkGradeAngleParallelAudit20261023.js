import {gradeProject, DEFAULT_SIZES} from './grading.js'

const validId = id => typeof id === 'string' && id.trim().length > 0
const finite = n => typeof n === 'number' && Number.isFinite(n)
const EPS = 1e-10
const degree = radians => radians * 180 / Math.PI
const normalizedAngle = (u,v) => degree(Math.atan2(u.x*v.y-u.y*v.x,u.x*v.x+u.y*v.y))
const wrappedAbs = angle => Math.abs(((angle+180)%360+360)%360-180)

function metrics(piece,angle,parallel) {
  const points=piece?.points
  if(!Array.isArray(points)||points.length<3||points.length>4096 ||
    points.some(point=>!finite(point?.x)||!finite(point?.y)))throw Error('INVALID_GRADED_POINTS')
  const selected={...angle,...parallel}
  for(const index of Object.values(selected))if(!Number.isInteger(index)||index<0||index>=points.length)
    throw Error('INVALID_GRADED_POINT_INDEX')
  const vector=(a,b)=>({x:points[b].x-points[a].x,y:points[b].y-points[a].y})
  const u=vector(angle.b,angle.a),v=vector(angle.b,angle.c)
  const p=vector(parallel.a,parallel.b),q=vector(parallel.c,parallel.d)
  if([u,v,p,q].some(w=>!finite(w.x)||!finite(w.y)||Math.hypot(w.x,w.y)<=EPS))
    throw Error('COLLAPSED_VECTOR')
  const vertexAngleDegrees=degree(Math.atan2(Math.abs(u.x*v.y-u.y*v.x),u.x*v.x+u.y*v.y))
  const parallelDirectedDegrees=normalizedAngle(p,q)
  // A pair of unoriented parallel lines is equivalent under a 180° line reversal.
  // Keep signed directed orientation separately to avoid hiding a flipped line.
  const parallelUndirectedResidualDegrees=Math.min(wrappedAbs(parallelDirectedDegrees),
    Math.abs(180-wrappedAbs(parallelDirectedDegrees)))
  return {vertexAngleDegrees,parallelDirectedDegrees,parallelUndirectedResidualDegrees}
}

/** Read-only graded vector QA. Angle uses the vertex at b; parallel lines are a->b and c->d. */
export function inspectAccuMarkGradeAngleParallel20261023(project,{
  pieceId,angle,parallel,angleToleranceDegrees=0.25,parallelToleranceDegrees=0.25,
}={}) {
  const issues=[],rows=[]
  const add=(code,details={})=>issues.push({code,severity:'blocker',...details})
  const sizes=project?.grading?.sizes ?? DEFAULT_SIZES
  const baseSize=project?.grading?.baseSize ?? 'M'
  const result=()=>({ok:issues.length===0,baseSize,rows,issues,manufacturingApproved:false})
  if(!Array.isArray(project?.pieces)||project.pieces.length===0||project.pieces.length>256||
    !project.pieces.every(piece=>validId(piece?.id))||new Set(project.pieces.map(piece=>piece.id)).size!==project.pieces.length)
    add('INVALID_PIECE_IDS')
  if(!Array.isArray(sizes)||sizes.length!==6||!sizes.every(validId)||new Set(sizes).size!==6||!sizes.includes(baseSize))
    add('INVALID_SIZE_RUN')
  if(!finite(angleToleranceDegrees)||angleToleranceDegrees<0||angleToleranceDegrees>180||
     !finite(parallelToleranceDegrees)||parallelToleranceDegrees<0||parallelToleranceDegrees>180)
    add('INVALID_TOLERANCE')
  if(!validId(pieceId)||!project?.pieces?.some(piece=>piece.id===pieceId))add('UNKNOWN_PIECE')
  if(!angle||typeof angle!=='object'||!parallel||typeof parallel!=='object')add('INVALID_SELECTION')
  else {
    const a=[angle.a,angle.b,angle.c],p=[parallel.a,parallel.b,parallel.c,parallel.d]
    if(a.some(value=>!Number.isInteger(value))||new Set(a).size!==3||
      p.some(value=>!Number.isInteger(value))||new Set(p).size!==4) add('DUPLICATE_OR_INVALID_POINTS')
    if(a.some(value=>value<0)||p.some(value=>value<0))add('INVALID_POINT_INDEX')
  }
  if(issues.length)return result()
  const source=project.pieces.find(piece=>piece.id===pieceId)
  if([...Object.values(angle),...Object.values(parallel)].some(index=>index>=source?.points?.length)){
    add('INVALID_POINT_INDEX');return result()
  }
  const measureBySize=new Map()
  for(const size of sizes){
    try {
      const graded=gradeProject(project,size)
      const ids=graded?.pieces?.map(piece=>piece?.id)
      if(!Array.isArray(ids)||ids.length!==project.pieces.length||new Set(ids).size!==ids.length||
        ids.some((id,index)=>id!==project.pieces[index].id))throw Error('GRADED_IDENTITY_CHANGED')
      const piece=graded.pieces.find(piece=>piece.id===pieceId)
      if(piece.points.length!==source.points.length)throw Error('GRADED_TOPOLOGY_CHANGED')
      measureBySize.set(size,metrics(piece,angle,parallel))
    }catch(error){add('GRADE_GEOMETRY_ERROR',{size,message:error.message})}
  }
  if(issues.length)return result()
  const base=measureBySize.get(baseSize)
  for(const size of sizes){
    const m=measureBySize.get(size)
    const angleDeltaDegrees=wrappedAbs(m.vertexAngleDegrees-base.vertexAngleDegrees)
    // Signed line orientation preserves winding; 180° reversal is meaningful
    // against the base even though the pair of unoriented lines stays parallel.
    const parallelDeltaDegrees=wrappedAbs(m.parallelDirectedDegrees-base.parallelDirectedDegrees)
    const pass=angleDeltaDegrees<=angleToleranceDegrees+1e-9 &&
      parallelDeltaDegrees<=parallelToleranceDegrees+1e-9 &&
      m.parallelUndirectedResidualDegrees<=parallelToleranceDegrees+1e-9
    rows.push({size,angleDegrees:m.vertexAngleDegrees,angleDeltaDegrees,
      parallelDeltaDegrees,parallelResidualDegrees:m.parallelUndirectedResidualDegrees,
      parallelDirectedDegrees:m.parallelDirectedDegrees,pass})
    if(!pass)add('GRADE_ANGLE_OR_PARALLEL_DRIFT',{size,angleDeltaDegrees,parallelDeltaDegrees,
      parallelResidualDegrees:m.parallelUndirectedResidualDegrees})
  }
  return result()
}
