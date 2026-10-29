import { edgeRangeLength } from './project.js'
import { gradeProject } from './grading.js'
import { buildSewingAssemblyWorkflow20261024 } from './sewingAssemblyWorkflow20261024.js'

const finite = n => typeof n === 'number' && Number.isFinite(n)
const fail = (code, detail = code) => ({ ok: false, code, detail, manufacturingApproved: false })

// Descriptor-only clone: inspection must never invoke accessors or toJSON.
function copySource(value) {
  let nodes = 0
  const seen = new Set()
  const visit = (input, depth) => {
    if (input === null || typeof input === 'string' || typeof input === 'boolean' || finite(input)) return input
    if (!input || typeof input !== 'object' || depth > 32 || ++nodes > 24000 || seen.has(input)) throw Error('UNSAFE_SOURCE_GRAPH')
    const array = Array.isArray(input), proto = Object.getPrototypeOf(input)
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) throw Error('UNSAFE_SOURCE_PROTOTYPE')
    const fields = Object.getOwnPropertyDescriptors(input)
    const keys = Reflect.ownKeys(fields)
    if (keys.length > 8192 || (array && (input.length > 4096 || keys.length !== input.length + 1))) throw Error('SOURCE_COMPLEXITY_BUDGET')
    const result = array ? [] : Object.create(null)
    seen.add(input)
    for (const key of keys) {
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key)) throw Error('UNSAFE_SOURCE_KEY')
      if (array && key === 'length') continue
      const d = fields[key]
      if (!d.enumerable || !Object.hasOwn(d, 'value')) throw Error('UNSAFE_SOURCE_PROPERTY')
      result[key] = visit(d.value, depth + 1)
    }
    seen.delete(input)
    return result
  }
  return visit(value, 0)
}

function guard(project) {
  const clean = copySource(project)
  if (!clean || !Array.isArray(clean.pieces) || clean.pieces.length < 1 || clean.pieces.length > 128 ||
    !Array.isArray(clean.seams) || clean.seams.length > 256 ||
    !Array.isArray(clean.grading?.sizes) || clean.grading.sizes.length < 1 || clean.grading.sizes.length > 16 ||
    !clean.grading.sizes.includes(clean.grading.baseSize) || new Set(clean.grading.sizes).size !== clean.grading.sizes.length ||
    clean.grading.sizes.some(s => typeof s !== 'string' || !s || s.length > 40)) throw Error('INVALID_GRADED_PROJECT')
  const ids = new Set()
  let points = 0
  for (const piece of clean.pieces) {
    if (!piece || typeof piece.id !== 'string' || !piece.id || ids.has(piece.id) ||
      !Array.isArray(piece.points) || piece.points.length < 3 || piece.points.length > 4096 ||
      piece.points.some(p => !finite(p?.x) || !finite(p?.y) || Math.abs(p.x) > 1e6 || Math.abs(p.y) > 1e6)) throw Error('INVALID_PATTERN_PIECES')
    points += piece.points.length
    ids.add(piece.id)
    if (piece.curves && Object.entries(piece.curves).some(([key, c]) => !Number.isSafeInteger(Number(key)) || Number(key) < 0 || Number(key) >= piece.points.length || !finite(c?.cx) || !finite(c?.cy))) throw Error('INVALID_CURVE_CONTROLS')
  }
  if (points > 4096) throw Error('SOURCE_COMPLEXITY_BUDGET')
  return clean
}

function seamLength(graded, endpoint) {
  const piece = graded.pieces.find(p => p.id === endpoint?.pieceId)
  if (!piece || !Number.isSafeInteger(endpoint.edgeIndex) || endpoint.edgeIndex < 0 || endpoint.edgeIndex >= piece.points.length) throw Error('INVALID_SEWING_ENDPOINT')
  const start = endpoint.startT ?? 0, end = endpoint.endT ?? 1
  if (![start, end].every(finite) || start < 0 || end > 1 || end <= start) throw Error('INVALID_SEWING_INTERVAL')
  const cm = edgeRangeLength(piece, endpoint.edgeIndex, start, end)
  if (!finite(cm) || cm < .01 || cm > 1e6) throw Error('INVALID_SEWN_LENGTH')
  return cm
}

/** A measurement-based calibration proposal for the complete saved size run.
 * Never changes authored sewing curves, grade rules, notches or source data.
 * Length reconciliation alone cannot establish sewability or physical fit. */
export function proposeSewingMismatchCalibration20261024(project, {toleranceCm = .35, percentTolerance = 2} = {}) {
  try {
    if (!finite(toleranceCm) || toleranceCm < 0 || toleranceCm > 20 ||
      !finite(percentTolerance) || percentTolerance < 0 || percentTolerance > 100) throw Error('INVALID_TOLERANCE')
    const source = guard(project)
    const review = buildSewingAssemblyWorkflow20261024(source, {toleranceCm, percentTolerance, checkGrading: true})
    if (review.issues.some(issue => !['SEAM_LENGTH_MISMATCH', 'GRADED_SEAM_MISMATCH'].includes(issue.code)))
      throw Error('UNRESOLVED_ASSEMBLY_TOPOLOGY_OR_GRADE')
    const snapshots = source.grading.sizes.map(size => ({size, project: gradeProject(source, size)}))
    const proposals = []
    const seamIds = new Set()
    for (const seam of source.seams) {
      if (!seam || typeof seam.id !== 'string' || !seam.id || seamIds.has(seam.id) ||
        !['normal', undefined].includes(seam.type)) throw Error('UNSUPPORTED_SEAM_TREATMENT_OR_ID')
      seamIds.add(seam.id)
      const measurements = snapshots.map(({size, project: graded}) => {
        const a = seamLength(graded, seam.a), b = seamLength(graded, seam.b)
        const delta = a - b
        const mismatchCm = Math.abs(delta)
        const mismatchPercent = mismatchCm / Math.max(a, b) * 100
        return {size, sourceLengthCm:a, targetLengthCm:b, signedDifferenceCm:delta,
          mismatchCm, mismatchPercent, withinTolerance:mismatchCm <= toleranceCm || mismatchPercent <= percentTolerance}
      })
      if (measurements.some(m => !m.withinTolerance)) proposals.push({seamId:seam.id, name:seam.name || seam.id,
        a:copySource(seam.a), b:copySource(seam.b), measurements,
        treatment:'REQUIRES_AUTHORED_PATTERN_TRUEING',
        reason:'Curve control, notch station, shared edges and graded seam geometry must be reconciled as one authored design.'})
    }
    return {ok:true,proposalOnly:true,manufacturingApproved:false,certifiedPhysicalFit:false,
      sourceRevision:source.revision ?? null, checkedSizes:snapshots.map(s=>s.size),
      baselineIssues:review.issues.length, affectedSeams:proposals.length, proposals,
      calibrated:false, repairApplied:false,
      note:'Diagnostic physical sewn-edge lengths across graded sizes; no ease substitution or manufacturing approval.'}
  } catch (error) {return fail('CALIBRATION_REFUSED', error.message)}
}

/** Probe a bounded, source-only quadratic-control edit against EVERY graded
 * stitch edge. The caller receives measurements, never a changed project.
 * This isolates the currently used normal grading path, whose fitted sleeve
 * caps are computed outside the source and cannot be corrected by editing a
 * base curve alone. */
export function probeSourceSleeveCurveTrueing20261024(project, {
  pieceId='sleeve-left', edgeIndex=0, maxShiftCm=8, stepCm=.5,
  toleranceCm=.35, percentTolerance=2,
}={}) {
  try {
    if(typeof pieceId!=='string'||!pieceId||!Number.isSafeInteger(edgeIndex)||edgeIndex<0||
      !finite(maxShiftCm)||maxShiftCm<=0||maxShiftCm>12||!finite(stepCm)||stepCm<.1||stepCm>2)
      throw Error('INVALID_BOUNDED_PROBE')
    if(!finite(toleranceCm)||toleranceCm<0||toleranceCm>20||!finite(percentTolerance)||percentTolerance<0||percentTolerance>100)
      throw Error('INVALID_TOLERANCE')
    const source=guard(project)
    const piece=source.pieces.find(p=>p.id===pieceId)
    const curve=piece?.curves?.[edgeIndex]
    if(!curve)throw Error('SOURCE_CURVE_REQUIRED')
    if(!source.seams.some(s=>[s.a,s.b].some(e=>e.pieceId===pieceId&&e.edgeIndex===edgeIndex)))
      throw Error('UNSEWN_EDGE')
    const original=proposeSewingMismatchCalibration20261024(source,{toleranceCm,percentTolerance})
    if(!original.ok)throw Error(original.detail)
    const count=Math.ceil(maxShiftCm/stepCm)
    if((count*2+1)**2>30000)throw Error('PROBE_WORK_BUDGET')
    let best=null,attempts=0
    const sourceCurve={cx:curve.cx,cy:curve.cy}
    // A source-only edit is not a legal repair when it would invalidate an
    // authored symmetric partner. Candidate measurements are diagnostic only.
    for(let i=-count;i<=count;i++)for(let j=-count;j<=count;j++){
      const dx=i*stepCm,dy=j*stepCm
      if(Math.abs(dx)>maxShiftCm||Math.abs(dy)>maxShiftCm)continue
      curve.cx=sourceCurve.cx+dx;curve.cy=sourceCurve.cy+dy
      let peak=0,passed=true
      for(const size of source.grading.sizes){
        const graded=gradeProject(source,size)
        for(const seam of source.seams){
          if(![seam.a,seam.b].some(e=>e.pieceId===pieceId&&e.edgeIndex===edgeIndex))continue
          const a=seamLength(graded,seam.a),b=seamLength(graded,seam.b)
          const mismatch=Math.abs(a-b),percent=mismatch/Math.max(a,b)*100
          peak=Math.max(peak,mismatch)
          if(mismatch>toleranceCm&&percent>percentTolerance)passed=false
        }
      }
      attempts++
      if(!best||peak<best.worstMismatchCm)best={deltaCxCm:dx,deltaCyCm:dy,worstMismatchCm:peak,allSizesWithinTolerance:passed}
    }
    return {ok:true,proposalOnly:true,manufacturingApproved:false,sourceRevision:source.revision??null,
      pieceId,edgeIndex,attempts,checkedSizes:[...source.grading.sizes],baselineAffectedSeams:original.affectedSeams,
      best,repairApplied:false,
      note:'Bounded diagnostic for one source control. Does not reconcile mirror controls, curve geometry, graded notch stations, or physical sewability.'}
  }catch(error){return fail('SOURCE_CURVE_PROBE_REFUSED',error.message)}
}

/** Deliberately fail closed until a shared-edge, notch-aware curve+grade solver exists. */
export function applySewingMismatchRepair20261024(project, options) {
  const calibration = proposeSewingMismatchCalibration20261024(project, options)
  if (!calibration.ok) return calibration
  return {...fail('MANUAL_TRUEING_REQUIRED','Authored curves, notches, seam allowances, and all graded sizes require joint physical reconciliation.'),
    proposal:calibration, repairApplied:false}
}
