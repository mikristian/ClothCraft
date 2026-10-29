import { cloneProject, edgeLength } from './project.js'
import { gradeAutomaticCoordinates, gradePersistedRuleCoordinate,gradeMultiPieceBreakTable } from './rustGradingKernel.js'
import { evaluateIndustrialGradeRule,convertIndustrialGradeRule, INDUSTRIAL_GRADE_MODES } from './industrialGradeRules.js'
import {gradeConstructionAttachments, gradeConstructionCurveControls,gradeAttachedConstructionPoint} from './gradedConstructionAttachments.js'
import {applyAccuMarkNotchArcStationsToGraded} from './accumarkGradedNotchDistance20261023.js'

export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export function sizeOffset(grading, size) {
  const sizes = grading?.sizes?.length ? grading.sizes : DEFAULT_SIZES
  const baseSize = grading?.baseSize || 'M'
  if (!Array.isArray(sizes) || sizes.some(name => typeof name !== 'string' || !name.trim()) || new Set(sizes).size !== sizes.length) throw new Error('Grading sizes must have unique, non-empty names')
  if (!sizes.includes(baseSize)) throw new Error('Grading base size must belong to the size set')
  if (!sizes.includes(size)) throw new Error('Requested grading size is not in the size set')
  const baseIndex = sizes.indexOf(baseSize)
  const sizeIndex = sizes.indexOf(size)
  return sizeIndex - baseIndex
}

export function gradePointForPiece(piece, grading, size, point) {
  const offset = sizeOffset(grading, size)
  // Industry-style per-break rules take precedence over the older single
  // constant X/Y grade step. They are evaluated from the base geometry, never
  // by recursively resizing the last rendered size. A changed project size set
  // must not silently apply a stale rule from another product revision.
  if (point.industrialGradeRule) {
    const rule = point.industrialGradeRule
    const sizes = grading?.sizes?.length ? grading.sizes : DEFAULT_SIZES
    if (JSON.stringify(rule.sizes) !== JSON.stringify(sizes) || rule.baseSize !== (grading?.baseSize || 'M')) {
      throw new Error('Industrial grade rule size set or base size differs from garment grading')
    }
    const {dx,dy}=evaluateIndustrialGradeRule(rule,size)
    const x=point.x+dx,y=point.y+dy
    if (!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Industrial grade rule produces nonfinite pattern coordinates')
    return {...cloneProject(point),x,y}
  }
  if (!offset) return cloneProject(point)
  const widthPerSize = Number(grading?.widthPerSizeCm ?? 3)
  const lengthPerSize = Number(grading?.lengthPerSizeCm ?? 1.2)
  const pieceBounds = bounds(piece.points)
  const automatic = gradeAutomaticCoordinates(point, pieceBounds, offset, widthPerSize, lengthPerSize)
  const rule = point.gradeRule
  if (!rule?.enabled) return {...cloneProject(point), ...automatic}
  return {
    ...cloneProject(point),
    x: gradePersistedRuleCoordinate(point.x,rule.dxPerSize,offset,automatic.x),
    y: gradePersistedRuleCoordinate(point.y,rule.dyPerSize,offset,automatic.y),
  }
}

function bounds(points = []) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

// Preserve a graded stitch-arc length by reshaping its quadratic control.
// Evaluate a few smooth, nearby controls rather than trying to mask the
// geometric mismatch with sleeve easing or a solver constraint.
function fitGradedSleeveArc(piece, edge, target, preferred) {
  let best = { error: Infinity, cost: Infinity, control: preferred }
  const evaluate = (cx, cy) => {
    piece.curves[edge] = { cx, cy }
    // Only the signed/absolute views differ. One sampled length is enough
    // for both, avoiding a redundant curve walk at every sleeve-search step.
    const difference = edgeLength(piece, edge) - target
    const error = Math.abs(difference)
    const cost = error * 400 + Math.hypot(cx - preferred.cx, cy - preferred.cy) * 0.07
    if (cost < best.cost) best = { error, cost, control: { cx, cy } }
    return difference
  }
  for (let column = -7; column <= 7; column++) {
    const cx = preferred.cx + column * .35
    let prior = null
    for (let row = -30; row <= 30; row++) {
      const cy = preferred.cy + row * .25
      const difference = evaluate(cx, cy)
      if (prior && prior.difference * difference < 0) {
        let lo = prior.cy, hi = cy, flo = prior.difference
        for (let i=0; i<19; i++) {
          const mid=(lo+hi)*.5, fmid=evaluate(cx,mid)
          if (fmid*flo<=0) hi=mid
          else { lo=mid; flo=fmid }
        }
      }
      prior = { cy, difference }
    }
  }
  piece.curves[edge] = best.control
  return best.error
}

export function gradePiece(piece, grading, size) {
  const offset = sizeOffset(grading, size)
  const hasPointBreaks = piece.points.some(point => Boolean(point.industrialGradeRule))
  const hasExplicitAttachments = (piece.internalLines || []).some(line => line.aAnchor || line.bAnchor)
  if (!offset) {
    const result = {
      ...piece,
      points: piece.points.map(point => point.industrialGradeRule ? gradePointForPiece(piece, grading, size, point) : cloneProject(point)),
      curves: piece.curves ? Object.fromEntries(Object.entries(piece.curves).map(([key, curve]) => [key, { ...curve }])) : undefined,
      internalLines: (piece.internalLines || []).map((line) => ({
        ...line,
        a: { ...line.a },
        b: { ...line.b },
      })),
    }
    if(hasPointBreaks||hasExplicitAttachments){
      if(hasPointBreaks)result.curves=gradeConstructionCurveControls(piece,result)
      const marks=gradeConstructionAttachments(piece,result)
      result.internalLines=marks.internalLines
      if(piece.notches)result.notches=marks.notches
    }else if(piece.notches)result.notches=cloneProject(piece.notches)
    return result
  }
  const transform = (point) => gradePointForPiece(piece, grading, size, point)

  const points = piece.points.map(transform)
  const curves = piece.curves
    ? Object.fromEntries(Object.entries(piece.curves).map(([edgeIndex, curve]) => {
      const transformed = transform({ x: curve.cx, y: curve.cy })
      return [edgeIndex, { cx: transformed.x, cy: transformed.y }]
    }))
    : undefined
  const internalLines = (piece.internalLines || []).map((line) => ({
    ...line,
    a: transform(line.a),
    b: transform(line.b),
  }))

  const result = {
    ...piece,
    points,
    curves,
    internalLines,
    gradeSize: size,
  }
  if(hasPointBreaks||hasExplicitAttachments){
    if(hasPointBreaks)result.curves=gradeConstructionCurveControls(piece,result)
    const marks=gradeConstructionAttachments(piece,result)
    result.internalLines=marks.internalLines
    if(piece.notches)result.notches=marks.notches
  }else if(piece.notches)result.notches=cloneProject(piece.notches)
  return result
}

export function gradeProject(project, size) {
  // The regular T-shirt's 14 true stitch-seam pairs must remain geometrically
  // matched throughout XS–XXL. A generic per-piece normalized-Y grader changes
  // sleeve caps and armscyes by different proportions, resulting in >10%
  // stitching mismatch for XS/XXL. Apply one affine stitchline transform to
  // every piece and curve as a controlled development-grade starting point.
  // Explicit designer grade rules continue to use the general grader.
  const specialTee = project.productionSpec?.gradingModel === 'seam-locked-affine-v1'
    && !(project.pieces || []).some(piece => piece.points?.some(point => point.gradeRule?.enabled||point.industrialGradeRule))
  if (specialTee) {
    const graded = cloneProject(project)
    graded.previewSize = size
    const offset = sizeOffset(project.grading, size)
    const stepWidth = Number(project.grading?.widthPerSizeCm ?? 3)
    const stepLength = Number(project.grading?.lengthPerSizeCm ?? 1.2)
    const referenceWidth = Math.max(1, Number(project.productionSpec.referenceHalfChestCm ?? 54))
    const referenceLength = Math.max(1, Number(project.productionSpec.referenceBodyLengthCm ?? 71))
    const sx = 1 + offset * stepWidth / referenceWidth
    const sy = 1 + offset * stepLength / referenceLength
    if (!(sx > .4 && sy > .4)) throw new Error('Unsupported T-shirt grading factors')
    const scale = point => ({...point, x: point.x * sx, y: point.y * sy})
    graded.pieces = project.pieces.map(piece => ({
      ...cloneProject(piece),
      points: piece.points.map(scale),
      curves: piece.curves ? Object.fromEntries(Object.entries(piece.curves).map(([key, curve]) => [key, { cx: curve.cx * sx, cy: curve.cy * sy }])) : undefined,
      internalLines: (piece.internalLines || []).map(line => ({ ...cloneProject(line), a: scale(line.a), b: scale(line.b) })),
      gradeSize: size,
    }))
    if (offset) {
      const front = graded.pieces.find(piece => piece.id === 'front')
      const leftSleeve = graded.pieces.find(piece => piece.id === 'sleeve-left')
      const rightSleeve = graded.pieces.find(piece => piece.id === 'sleeve-right')
      if (front && leftSleeve?.points.length === 7 && rightSleeve?.points.length === 7) {
        const upper = edgeLength(front, 1)
        const lower = edgeLength(front, 2)
        const capRise = (project.pieces.find(piece => piece.id === 'sleeve-left').points[0].y
          - project.pieces.find(piece => piece.id === 'sleeve-left').points[1].y) * sy
        const capWidth = Math.sqrt(Math.max(0, upper**2 - capRise**2)) - .2
        const underarmWidth = 17.25 + offset * .5
        for (const sleeve of [leftSleeve, rightSleeve]) {
          sleeve.points[1].x = -capWidth
          sleeve.points[6].x = capWidth
          sleeve.points[2].x = -underarmWidth
          sleeve.points[5].x = underarmWidth
          const preferredUpper = { cx: -capWidth*.55, cy: 23.5*sy }
          const preferredLower = { cx: -underarmWidth + .75, cy: 22*sy }
          fitGradedSleeveArc(sleeve, 0, upper, preferredUpper)
          fitGradedSleeveArc(sleeve, 1, lower, preferredLower)
          // Mirror the left cap into the right half of the SAME sleeve piece.
          // The armholes on both body sides remain exact mirrors as well.
          sleeve.curves[6] = { cx: -sleeve.curves[0].cx, cy: sleeve.curves[0].cy }
          sleeve.curves[5] = { cx: -sleeve.curves[1].cx, cy: sleeve.curves[1].cy }
        }
      }
    }
    graded.customMeasurements = (project.customMeasurements || []).map(measurement => ({
      ...cloneProject(measurement),
      a: measurement.a ? scale(measurement.a) : measurement.a,
      b: measurement.b ? scale(measurement.b) : measurement.b,
    }))
    return applyAccuMarkNotchArcStationsToGraded(graded,project,size)
  }
  const graded = cloneProject(project)
  graded.previewSize = size
  graded.pieces = project.pieces.map((piece) => gradePiece(piece, project.grading, size))
  graded.customMeasurements = (project.customMeasurements || []).map((measurement) => {
    const piece = project.pieces.find((item) => item.id === measurement.pieceId)
    if (!piece) return cloneProject(measurement)
    const gradedPiece=graded.pieces.find(item=>item.id===piece.id)
    if(piece.points.some(point=>point.industrialGradeRule)||measurement.aAnchor||measurement.bAnchor){
      return {...cloneProject(measurement),
        a:measurement.a?{...cloneProject(measurement.a),...gradeAttachedConstructionPoint(piece,gradedPiece,measurement.a,measurement.aAnchor)}:measurement.a,
        b:measurement.b?{...cloneProject(measurement.b),...gradeAttachedConstructionPoint(piece,gradedPiece,measurement.b,measurement.bAnchor)}:measurement.b,
      }
    }
    return {
      ...cloneProject(measurement),
      a: gradePointForPiece(piece, project.grading, size, measurement.a),
      b: gradePointForPiece(piece, project.grading, size, measurement.b),
    }
  })
  return applyAccuMarkNotchArcStationsToGraded(graded,project,size)
}

export function buildSizeRun(project) {
  const sizes = project.grading?.sizes?.length ? project.grading.sizes : DEFAULT_SIZES
  if (Array.isArray(project.pieces) && project.pieces.length &&
      project.pieces.every(piece => piece.points?.length && piece.points.every(point => Boolean(point.industrialGradeRule)))) {
    return buildNativeIndustrialSizeRun(project)
  }
  return Object.fromEntries(sizes.map((size) => [size, gradeProject(project, size)]))
}

/**
 * Native Rust batch grading for garments with complete point-by-point grade
 * rules. Exact source coordinates and rule breaks are passed into the Rust
 * kernel as one validated, transactional, multi-piece size run. Original
 * string IDs are preserved in the JS document rather than hashed or
 * truncated to the numeric C ABI. 2D marks and construction metadata are
 * computed from the resulting geometry and checked against independent JS
 * evaluation; no partial size run is returned if the two disagree.
 */
export function buildNativeIndustrialSizeRun(project) {
  const sizes=project?.grading?.sizes?.length?project.grading.sizes:DEFAULT_SIZES
  const baseSize=project?.grading?.baseSize||'M'
  if(!Array.isArray(project?.pieces)||!project.pieces.length||!sizes.includes(baseSize))throw new Error('Native multi-piece grading requires a valid project and base size')
  const numericPieces=project.pieces.map((piece,pieceIndex)=>{
    if(!Array.isArray(piece.points)||!piece.points.length)throw new Error(`Native grading piece ${piece.id} has no points`)
    return {id:pieceIndex+1,points:piece.points.map((point,pointIndex)=>{
      if(!point.industrialGradeRule)throw new Error(`Native grading requires industrial rule for ${piece.id} point ${pointIndex}`)
      if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw new Error('Nonfinite authored pattern coordinate')
      const rule=convertIndustrialGradeRule(point.industrialGradeRule,INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL)
      if(JSON.stringify(rule.sizes)!==JSON.stringify(sizes)||rule.baseSize!==baseSize)throw new Error(`Stale grade-rule size set in ${piece.id} point ${pointIndex}`)
      return {id:pointIndex+1,x:point.x,y:point.y,steps:rule.steps}
    })}
  })
  const batch=gradeMultiPieceBreakTable({pieces:numericPieces,sizes,baseSize})
  // First construct the entire graded document in memory. Only return after
  // validating each size's geometry/metadata. This cannot partially mutate
  // the caller's project even on an exception.
  const run={}
  for(const computed of batch){
    const graded=gradeProject(project,computed.size)
    if(graded.pieces.length!==computed.pieces.length)throw new Error(`Rust size run changed piece count in ${computed.size}`)
    for(let p=0;p<graded.pieces.length;p++){
      const nativePiece=computed.pieces[p], jsPiece=graded.pieces[p]
      if(nativePiece.id!==p+1||nativePiece.points.length!==jsPiece.points.length)throw new Error(`Native point identity mismatch in ${computed.size}`)
      for(let i=0;i<jsPiece.points.length;i++){
        const computedPoint=nativePiece.points[i], current=jsPiece.points[i]
        if(computedPoint.id!==i+1||!Number.isFinite(computedPoint.x)||!Number.isFinite(computedPoint.y)||
          Math.abs(computedPoint.x-current.x)>1e-8||Math.abs(computedPoint.y-current.y)>1e-8){
          throw new Error(`Rust/JS industrial grading disagreement: ${computed.size} ${jsPiece.id} point ${i}`)
        }
        current.x=computedPoint.x
        current.y=computedPoint.y
      }
    }
    run[computed.size]=graded
  }
  return run
}
