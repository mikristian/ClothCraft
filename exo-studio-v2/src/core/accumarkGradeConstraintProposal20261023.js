import {gradeProject} from './grading.js'
import {editAccuMarkGradeDelta} from './accumarkNumericGradeDelta20261023.js'

const finite=x=>typeof x==='number'&&Number.isFinite(x)
const EPS=1e-9
const degrees=r=>r*180/Math.PI
const angle=(u,v)=>Math.atan2(u.x*v.y-u.y*v.x,u.x*v.x+u.y*v.y)
const wrap=r=>Math.atan2(Math.sin(r),Math.cos(r))
const vector=(a,b)=>({x:b.x-a.x,y:b.y-a.y})
const magnitude=v=>Math.hypot(v.x,v.y)
const point=(piece,index)=>piece?.points?.[index]
const issue=(code,message)=>({code,message,severity:'blocker'})
const fail=(code,message)=>({ok:false,issues:[issue(code,message)],manufacturingApproved:false,proposalOnly:true})

/**
 * Propose one size's point move, in authored centimeters. No source writes,
 * broader-size propagation, cut/export actions or manufacturing sign-off.
 * keep-angle: a-b-c, with b as pivot and c moving; signed base orientation.
 * parallel: a->b and c->d, with d moving; preserves current c->d length
 * and aligns its directed heading with the BASE a->b heading.
 */
export function proposeAccuMarkGradeConstraint20261023(project,options={}) {
  const {pieceId,size,operation,angle:angleIndices,parallel:parallelIndices,
    movingPointIndex,fixedPoints,angleToleranceDegrees=.25,parallelToleranceDegrees=.25}=options
  const sizes=project?.grading?.sizes,baseSize=project?.grading?.baseSize
  if(!Array.isArray(sizes)||sizes.length!==6||new Set(sizes).size!==6||
    !sizes.every(s=>typeof s==='string'&&s.trim())||!sizes.includes(baseSize))
    return fail('INVALID_SIZE_RUN','Expected an ordered, distinct six-size grade run and valid base size')
  if(!sizes.includes(size)||size===baseSize)return fail('INVALID_TARGET_SIZE','Select an existing non-base size')
  if(operation!=='keep-angle'&&operation!=='parallel')return fail('INVALID_OPERATION','Choose keep-angle or parallel')
  if(!finite(angleToleranceDegrees)||angleToleranceDegrees<0||angleToleranceDegrees>180||
    !finite(parallelToleranceDegrees)||parallelToleranceDegrees<0||parallelToleranceDegrees>180)
    return fail('INVALID_TOLERANCE','Angular tolerances must be finite degrees from 0 to 180')
  const matches=project?.pieces?.filter(p=>p.id===pieceId)
  if(!matches||matches.length!==1)return fail('UNKNOWN_PIECE','Exactly one matching pattern piece is required')
  const source=matches[0]
  const indices=operation==='keep-angle'?angleIndices:parallelIndices
  const keys=operation==='keep-angle'?['a','b','c']:['a','b','c','d']
  if(!indices||keys.some(k=>!Number.isSafeInteger(indices[k])||indices[k]<0||indices[k]>=source.points?.length)||
    new Set(keys.map(k=>indices[k])).size!==keys.length)
    return fail('INVALID_GEOMETRY_INDICES','All reference indices must be distinct and valid')
  const targetIndex=indices[operation==='keep-angle'?'c':'d']
  if(movingPointIndex!==targetIndex)return fail('INVALID_MOVING_POINT','Only the declared c or d endpoint can move')
  const anchors=keys.filter(k=>indices[k]!==targetIndex).map(k=>indices[k])
  if(!Array.isArray(fixedPoints)||fixedPoints.length!==anchors.length||
    !anchors.every(i=>fixedPoints.includes(i))||new Set(fixedPoints).size!==anchors.length)
    return fail('INVALID_FIXED_POINTS','Explicit fixedPoints must match every anchor/reference index')
  const authored=source.points[targetIndex]
  if(authored?.namedGradeRuleRef||authored?.gradeRule?.enabled||authored?.pinned||authored?.locked||authored?.isPinned||authored?.isLocked)
    return fail('PROTECTED_POINT','Selected point has a named, legacy, pinned or locked grading rule')
  if(!source.points.every(p=>finite(p?.x)&&finite(p?.y)))
    return fail('INVALID_SOURCE_POINTS','Source points must be finite centimeters')
  let base,current
  try{
    base=gradeProject(project,baseSize).pieces.find(p=>p.id===pieceId)
    current=gradeProject(project,size).pieces.find(p=>p.id===pieceId)
  }catch(error){return fail('GRADE_EVALUATION_FAILED',error.message)}
  if(!base||!current||base.points.length!==source.points.length||current.points.length!==source.points.length)
    return fail('GRADED_TOPOLOGY_CHANGED','Graded point topology differs from source')
  const P=(p,k)=>point(p,indices[k])
  let desired,referenceAngle,originalAngle,correctedAngle
  if(operation==='keep-angle'){
    const baseU=vector(P(base,'b'),P(base,'a'))
    const baseV=vector(P(base,'b'),P(base,'c'))
    const u=vector(P(current,'b'),P(current,'a'))
    const v=vector(P(current,'b'),P(current,'c'))
    if([baseU,baseV,u,v].some(w=>!finite(magnitude(w))||magnitude(w)<=EPS))
      return fail('COLLAPSED_VECTOR','Angle reference or graded arm has zero length')
    referenceAngle=angle(baseU,baseV)
    originalAngle=angle(u,v)
    const heading=Math.atan2(u.y,u.x)+referenceAngle
    const length=magnitude(v)
    desired={x:P(current,'b').x+length*Math.cos(heading),y:P(current,'b').y+length*Math.sin(heading)}
    correctedAngle=angle(u,vector(P(current,'b'),desired))
  }else{
    const baseHeading=vector(P(base,'a'),P(base,'b'))
    const targetHeading=vector(P(current,'c'),P(current,'d'))
    const actualReference=vector(P(current,'a'),P(current,'b'))
    if([baseHeading,targetHeading,actualReference].some(w=>!finite(magnitude(w))||magnitude(w)<=EPS))
      return fail('COLLAPSED_VECTOR','Parallel reference or selected line has zero length')
    referenceAngle=Math.atan2(baseHeading.y,baseHeading.x)
    originalAngle=angle(actualReference,targetHeading)
    const heading=referenceAngle
    const length=magnitude(targetHeading)
    desired={x:P(current,'c').x+length*Math.cos(heading),y:P(current,'c').y+length*Math.sin(heading)}
    correctedAngle=angle(actualReference,vector(P(current,'c'),desired))
  }
  if(!finite(desired.x)||!finite(desired.y))return fail('INVALID_CORRECTION','Correction generated invalid coordinates')
  const moveCm={dx:desired.x-P(current,operation==='keep-angle'?'c':'d').x,
    dy:desired.y-P(current,operation==='keep-angle'?'c':'d').y}
  if(!finite(moveCm.dx)||!finite(moveCm.dy))return fail('INVALID_CORRECTION','Correction movement overflow')
  const basePoint=base.points[targetIndex]
  const dxCm=desired.x-basePoint.x,dyCm=desired.y-basePoint.y
  let edited
  try{
    edited=editAccuMarkGradeDelta(project,{pieceId,pointIndex:targetIndex,size,mode:'cumulative',
      dxCm,dyCm,maintainGrowths:false})
  }catch(error){return fail('GRADE_DELTA_REJECTED',error.message)}
  const proposed=edited.project
  const diagnostics=[]
  try{
    for(const currentSize of sizes){
      const before=gradeProject(project,currentSize).pieces.find(p=>p.id===pieceId)
      const after=gradeProject(proposed,currentSize).pieces.find(p=>p.id===pieceId)
      if(!after||after.points.length!==before.points.length)throw Error('Graded topology changed')
      for(let i=0;i<before.points.length;i++){
        const delta=magnitude(vector(before.points[i],after.points[i]))
        if(!finite(delta))throw Error('Invalid graded geometry')
        if((currentSize!==size||i!==targetIndex)&&delta>1e-7)
          throw Error(`Unexpected coordinate change at ${currentSize} point ${i}`)
      }
      const applied=after.points[targetIndex]
      if(currentSize===size&&magnitude(vector(applied,desired))>1e-7)
        throw Error('Selected point correction did not persist')
      if(operation==='keep-angle'){
        const u=vector(P(after,'b'),P(after,'a')),v=vector(P(after,'b'),P(after,'c'))
        if(magnitude(u)<=EPS||magnitude(v)<=EPS)throw Error('Collapsed angle after correction')
        diagnostics.push({size:currentSize,angleResidualDegrees:Math.abs(degrees(wrap(angle(u,v)-referenceAngle))),
          corrected:currentSize===size})
      }else{
        const u=vector(P(after,'a'),P(after,'b')),v=vector(P(after,'c'),P(after,'d'))
        if(magnitude(u)<=EPS||magnitude(v)<=EPS)throw Error('Collapsed parallel line after correction')
        diagnostics.push({size:currentSize,parallelResidualDegrees:Math.abs(degrees(angle(u,v))),
          baseDirectionResidualDegrees:Math.abs(degrees(wrap(Math.atan2(v.y,v.x)-referenceAngle))),
          corrected:currentSize===size})
      }
    }
  }catch(error){return fail('POST_CORRECTION_VALIDATION_FAILED',error.message)}
  const target=diagnostics.find(row=>row.size===size)
  const residual=operation==='keep-angle'?target.angleResidualDegrees:target.baseDirectionResidualDegrees
  const tolerance=operation==='keep-angle'?angleToleranceDegrees:parallelToleranceDegrees
  if(residual>tolerance+1e-8)return fail('RESIDUAL_EXCEEDS_TOLERANCE',
    `Correction leaves ${residual.toFixed(6)} degrees of selected-size residual`)
  const preview={pieceId,size,operation,movingPointIndex:targetIndex,
    fixedPoints:[...fixedPoints],before:{...point(current,targetIndex)},after:{...desired},
    movementCm:moveCm,cumulativeDeltaCm:{dxCm,dyCm},
    baselineDegrees:degrees(referenceAngle),beforeResidualDegrees:Math.abs(degrees(wrap(originalAngle-(operation==='keep-angle'?referenceAngle:0)))),
    afterResidualDegrees:residual}
  return {ok:true,project:proposed,preview,diagnostics,issues:[],
    manufacturingApproved:false,proposalOnly:true,units:'cm',changedSizes:[size]}
}
