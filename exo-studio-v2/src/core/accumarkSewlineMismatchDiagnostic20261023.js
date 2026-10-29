import {gradeProject, DEFAULT_SIZES} from './grading.js'
import {edgeRangeLength} from './project.js'

const finite = x => typeof x === 'number' && Number.isFinite(x)
const identity = x => typeof x === 'string' && x.trim().length > 0
const unique = ids => ids.every(identity) && new Set(ids).size === ids.length
const MAX_PIECES = 256, MAX_SEAMS = 1024, MAX_POINTS = 4096

function lengthOfSide(lookup, side) {
  const piece = lookup.get(side?.pieceId)
  if (!piece) throw Error('Missing seam piece')
  const points = piece.points
  if (!Array.isArray(points) || points.length < 3 || points.length > MAX_POINTS ||
    points.some(p => !finite(p?.x) || !finite(p?.y))) throw Error('Invalid graded stitchline points')
  if (piece.curves != null && (typeof piece.curves !== 'object' || Array.isArray(piece.curves) ||
    Object.entries(piece.curves).some(([key, curve]) => !/^(0|[1-9]\d*)$/.test(key) ||
      Number(key) >= points.length || !finite(curve?.cx) || !finite(curve?.cy))))
    throw Error('Invalid graded quadratic control')
  const index = side?.edgeIndex
  if (!Number.isInteger(index) || index < 0 || index >= points.length)
    throw Error('Missing graded sewn edge')
  const start = side.startT ?? 0, end = side.endT ?? 1
  if (!finite(start) || !finite(end) || start < 0 || end > 1 || start >= end)
    throw Error('Invalid sewn Bézier parameter interval')
  const lengthCm = edgeRangeLength(piece, index, start, end)
  if (!finite(lengthCm) || lengthCm <= 1e-9) throw Error('Collapsed or nonfinite sewn interval')
  return lengthCm
}

/**
 * Read-only six-size sewn-interval length comparison. Units: cm. A positive
 * signedDeltaCm means sewn side A exceeds sewn side B. Authored ease only
 * explains a discrepancy; it never modifies the graded geometry.
 */
export function inspectAccuMarkSewlineMismatch20261023(project, {
  sizes = project?.grading?.sizes ?? DEFAULT_SIZES,
  toleranceCm = 0.05,
  easeBySeamId = {},
} = {}) {
  const issues = [], seamRows = [], sizeSummary = []
  const add = (code, detail = {}) => issues.push({code, severity:'blocker', ...detail})
  const result = () => ({ok:issues.length === 0, sizes:Array.isArray(sizes)?[...sizes]:[],
    baseSize:project?.grading?.baseSize ?? 'M', toleranceCm, seamRows, sizeSummary,
    issues, blockers:issues.length, manufacturingApproved:false,
    note:'Physical sewn quadratic arclength diagnostic only. No seam trueing, ease approval or factory certification.'})
  if (!Array.isArray(project?.pieces) || !project.pieces.length || project.pieces.length > MAX_PIECES ||
    !unique(project.pieces.map(p => p?.id))) add('INVALID_PIECE_IDS')
  if (!Array.isArray(project?.seams) || project.seams.length > MAX_SEAMS ||
    !unique((project.seams || []).map(s => s?.id))) add('INVALID_SEAM_IDS')
  const configured = project?.grading?.sizes ?? DEFAULT_SIZES
  if (!Array.isArray(configured) || !configured.length || !unique(configured) ||
    !configured.includes(project?.grading?.baseSize ?? 'M') ||
    !Array.isArray(sizes) || sizes.length !== 6 || !unique(sizes) ||
    sizes.some(size => !configured.includes(size)) || !sizes.includes(project?.grading?.baseSize ?? 'M'))
    add('INVALID_SIX_SIZE_RUN')
  if (!finite(toleranceCm) || toleranceCm < 0) add('INVALID_TOLERANCE')
  if (!easeBySeamId || typeof easeBySeamId !== 'object' || Array.isArray(easeBySeamId))
    add('INVALID_EASE_MAP')
  if (issues.length) return result()

  const seamIds = new Set(project.seams.map(seam => seam.id))
  for (const seamId of Object.keys(easeBySeamId))
    if (!seamIds.has(seamId)) add('UNKNOWN_EASE_SEAM', {seamId})
  const policies = new Map()
  for (const seam of project.seams) {
    if (typeof seam.reverseB !== 'undefined' && typeof seam.reverseB !== 'boolean')
      add('INVALID_SEAM_DIRECTION', {seamId:seam.id})
    if (seam.a?.pieceId === seam.b?.pieceId && seam.a?.edgeIndex === seam.b?.edgeIndex)
      add('SAME_SEWN_EDGE', {seamId:seam.id})
    const policy = easeBySeamId[seam.id]
    if (policy === undefined) {policies.set(seam.id, {easeCm:0, toleranceCm});continue}
    if (!policy || typeof policy !== 'object' || Array.isArray(policy) ||
      !finite(policy.easeCm) || !['A','B'].includes(policy.easeSide) ||
      (policy.toleranceCm !== undefined && (!finite(policy.toleranceCm) || policy.toleranceCm < 0)) ||
      policy.easeCm < 0) {
      add('INVALID_EASE_POLICY', {seamId:seam.id});continue
    }
    policies.set(seam.id,{easeCm:policy.easeCm*(policy.easeSide==='A'?1:-1),
      toleranceCm:policy.toleranceCm ?? toleranceCm})
  }
  if (issues.length) return result()

  const rowsBySeam = new Map(project.seams.map(seam => [seam.id, []]))
  for (const size of sizes) {
    let graded
    try { graded = gradeProject(project,size) }
    catch (error) {add('GRADING_FAILED',{size, message:error.message});continue}
    const gradedIds = graded?.pieces?.map(piece=>piece?.id)
    if (!Array.isArray(gradedIds) || !unique(gradedIds) || gradedIds.length!==project.pieces.length ||
      gradedIds.some((id,i)=>id!==project.pieces[i].id)) {
      add('GRADED_IDENTITY_CHANGED',{size});continue
    }
    const lookup = new Map(graded.pieces.map(piece=>[piece.id,piece]))
    for (const seam of project.seams) {
      try {
        const lengthAcm = lengthOfSide(lookup,seam.a)
        const lengthBcm = lengthOfSide(lookup,seam.b)
        const signedDeltaCm = lengthAcm-lengthBcm
        const {easeCm, toleranceCm:seamToleranceCm} = policies.get(seam.id)
        const residualCm = signedDeltaCm-easeCm
        const mismatchCm = Math.abs(signedDeltaCm)
        const pass = Math.abs(residualCm) <= seamToleranceCm+1e-9
        const row = {size, lengthAcm,lengthBcm, signedDeltaCm,mismatchCm,
          mismatchPercent:100*mismatchCm/Math.max(lengthAcm,lengthBcm),
          expectedSignedEaseCm:easeCm, residualCm, toleranceCm:seamToleranceCm,
          reverseB:Boolean(seam.reverseB),
          orientationB:seam.reverseB?'reverse':'forward', pass}
        rowsBySeam.get(seam.id).push(row)
        if (!pass) add('SEWLINE_MISMATCH',{size,seamId:seam.id,residualCm})
      } catch(error) {add('INVALID_SEWN_GEOMETRY',{size,seamId:seam.id,message:error.message})}
    }
  }
  for (const seam of project.seams) {
    const rows = rowsBySeam.get(seam.id)
    const baseline = rows.find(row=>row.size === (project.grading?.baseSize ?? 'M'))
    if (!baseline || rows.length !== sizes.length)
      add('INCOMPLETE_SEAM_SIZE_RUN',{seamId:seam.id})
    seamRows.push({seamId:seam.id,a:{...seam.a},b:{...seam.b},
      reverseB:Boolean(seam.reverseB),rows:rows.map(row=>({...row,
        deltaFromBaseCm:baseline?row.signedDeltaCm-baseline.signedDeltaCm:null})),
      allSizesPass:rows.length===sizes.length && rows.every(row=>row.pass)})
  }
  for (const size of sizes) {
    const rows=seamRows.map(seam=>seam.rows.find(row=>row.size===size)).filter(Boolean)
    sizeSummary.push({size, checkedSeams:rows.length, failingSeams:rows.filter(row=>!row.pass).length,
      largestMismatchCm:rows.length?Math.max(...rows.map(row=>row.mismatchCm)):0})
  }
  return result()
}
