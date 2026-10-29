/**
 * Read-only diagnostic for optional cached notch x/y versus its canonical
 * edge/arclength station. Notch edgeIndex+t remains authoritative for CUT and
 * sewing exports; this report is not an approval or a replacement for them.
 * Units: EXO pattern coordinates are centimeters.
 */
import {edgePointAt} from './project.js'
import {gradeProject} from './grading.js'

const finite = n => typeof n === 'number' && Number.isFinite(n)

export function inspectNotchCoordinatesOnPiece(piece, {size='source',toleranceCm=0.01}={}) {
  if (!finite(toleranceCm) || toleranceCm < 0) throw new TypeError('Notch coordinate tolerance must be a nonnegative finite number of centimeters')
  const issues=[], checks=[]
  let missingCoordinates=0
  const add=(code,notchId,message)=>issues.push({code,size,pieceId:piece?.id??null,notchId,message,severity:'blocker'})
  if (!piece || !Array.isArray(piece.points) || piece.points.length < 3) {
    add('INVALID_NOTCH_PIECE',null,'Piece requires at least three contour vertices')
    return {size,pieceId:piece?.id??null,issues,checks,blockers:issues.length,missingCoordinates,factoryCertified:false}
  }
  if (piece.notches != null && !Array.isArray(piece.notches)) {
    add('INVALID_NOTCH_COLLECTION',null,'Notch collection must be an array')
    return {size,pieceId:piece.id,issues,checks,blockers:issues.length,missingCoordinates,factoryCertified:false}
  }
  const seen=new Set()
  for (const [index,notch] of (piece.notches||[]).entries()) {
    const id=notch?.id
    const identity=typeof id==='string'&&id.length?id:`index:${index}`
    if (typeof id!=='string'||!id.length||seen.has(id)) {
      add('INVALID_NOTCH_ID',identity,'Notch IDs must be nonempty and unique within a piece')
      continue
    }
    seen.add(id)
    const t=notch.t??0.5
    if (!Number.isInteger(notch.edgeIndex) || notch.edgeIndex<0 || notch.edgeIndex>=piece.points.length || !finite(t) || t<0 || t>1) {
      add('INVALID_NOTCH_STATION',id,'Notch requires a valid edge index and arclength fraction in [0,1]')
      continue
    }
    let expected
    try {expected=edgePointAt(piece,notch.edgeIndex,t,64)?.point}
    catch(error) {
      add('INVALID_NOTCH_EDGE_GEOMETRY',id,`Cannot evaluate physical notch station: ${String(error.message||error)}`)
      continue
    }
    if (!expected || !finite(expected.x) || !finite(expected.y)) {
      add('INVALID_NOTCH_EDGE_GEOMETRY',id,'Notch edge station is not finite')
      continue
    }
    const hasX=Object.hasOwn(notch,'x'),hasY=Object.hasOwn(notch,'y')
    if (!hasX&&!hasY) {missingCoordinates++;continue}
    if (!hasX||!hasY||!finite(notch.x)||!finite(notch.y)) {
      add('INVALID_NOTCH_CACHED_COORDINATE',id,'Cached notch coordinates require both finite x and y')
      continue
    }
    const deviationCm=Math.hypot(notch.x-expected.x,notch.y-expected.y)
    checks.push({size,pieceId:piece.id,notchId:id,edgeIndex:notch.edgeIndex,t,
      expectedCm:expected,cachedCm:{x:notch.x,y:notch.y},deviationCm,pass:deviationCm<=toleranceCm})
    if (deviationCm>toleranceCm) add('STALE_NOTCH_CACHED_COORDINATE',id,
      `Cached x/y differ from physical edge station by ${deviationCm.toFixed(5)} cm`)
  }
  return {size,pieceId:piece.id,issues,checks,blockers:issues.length,missingCoordinates,factoryCertified:false}
}

export function inspectGradedNotchCoordinateConsistency(project,{sizes=project?.grading?.sizes,toleranceCm=0.01}={}) {
  if (!project || !Array.isArray(project.pieces) || !Array.isArray(sizes) || !sizes.length ||
      sizes.some(s=>typeof s!=='string'||!s.trim()) || new Set(sizes).size!==sizes.length ||
      !finite(toleranceCm)||toleranceCm<0) throw new TypeError('Project, unique size list and nonnegative tolerance required')
  const issues=[],checks=[]
  let missingCoordinates=0
  for (const size of sizes) {
    let graded
    try {graded=gradeProject(project,size)}
    catch(error) {
      issues.push({code:'NOTCH_GRADE_FAILED',size,pieceId:null,notchId:null,message:String(error.message||error),severity:'blocker'})
      continue
    }
    const seen=new Set()
    for (const piece of graded.pieces||[]) {
      if (seen.has(piece.id)) {
        issues.push({code:'AMBIGUOUS_PIECE_ID',size,pieceId:piece.id,notchId:null,message:'Duplicate piece identity',severity:'blocker'})
        continue
      }
      seen.add(piece.id)
      const report=inspectNotchCoordinatesOnPiece(piece,{size,toleranceCm})
      issues.push(...report.issues)
      checks.push(...report.checks)
      missingCoordinates+=report.missingCoordinates
    }
  }
  // A project with no cached coordinates has no positional consistency
  // observations. Reporting PASS in that case would be a false safety signal.
  const status=issues.length?'blocked':checks.length?'pass':'not_configured'
  return {schema:'exo-notch-coordinate-diagnostic.v1',status,
    blockers:issues.length,issues,checks,missingCoordinates,checkedSizes:[...sizes],
    toleranceCm,factoryCertified:false,disclaimer:'Supplementary read-only diagnostic; absence of cached coordinates does not certify notch placement or factory readiness.'}
}
