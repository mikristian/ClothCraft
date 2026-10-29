import {cloneProject} from './project.js'
import {gradeProject} from './grading.js'
import {evaluateIndustrialGradeTable,validateIndustrialGradeRule,INDUSTRIAL_GRADE_MODES} from './industrialGradeRules.js'

const fail = message => {throw new Error(`AccuMark batch grading: ${message}`)}
const finite = n => typeof n === 'number' && Number.isFinite(n)

function reference(project, ref) {
  if (!ref || typeof ref.pieceId !== 'string' || !ref.pieceId || !Number.isSafeInteger(ref.pointIndex) || ref.pointIndex < 0)
    fail('reference requires pieceId and nonnegative pointIndex')
  const matches = project.pieces.filter(p => p?.id === ref.pieceId)
  if (matches.length !== 1) fail('missing or ambiguous piece ID')
  const point = matches[0].points?.[ref.pointIndex]
  if (!point || !finite(point.x) || !finite(point.y)) fail('missing or nonfinite point coordinates')
  return point
}

function validatedTable(point, sizes, base, required) {
  if (!point.industrialGradeRule) {
    if (required) fail('source must have a complete industrial grading rule')
    return null
  }
  const rule = validateIndustrialGradeRule(point.industrialGradeRule)
  if (rule.baseSize !== base || JSON.stringify(rule.sizes) !== JSON.stringify(sizes))
    fail('point industrial rule has stale size or base metadata')
  const table = evaluateIndustrialGradeTable(rule)
  if (sizes.some(size => !finite(table[size]?.dx) || !finite(table[size]?.dy))) fail('invalid rule displacement')
  return table
}

/** Copy actual base-relative grading movements to multiple points in one atomic operation.
 * Existing target industrial rules supply the untouched axis; otherwise the
 * original project's automatic/legacy graded positions supply that axis.
 */
export function applyAccuMarkGradeBatch(project, {source,targets,axis='both'} = {}) {
  if (!project || !Array.isArray(project.pieces) || !project.pieces.length) fail('project with pieces required')
  const sizes = project.grading?.sizes, base = project.grading?.baseSize
  if (!Array.isArray(sizes) || sizes.length < 2 || sizes.length > 64 ||
      sizes.some(s => typeof s !== 'string' || !s.trim() || s.trim() !== s) ||
      new Set(sizes).size !== sizes.length || !sizes.includes(base)) fail('valid ordered grading size line and base required')
  if (!['both','x','y'].includes(axis)) fail('axis must be both, x or y')
  if (!Array.isArray(targets) || !targets.length) fail('nonempty target list required')
  const sourcePoint = reference(project,source)
  const sourceTable = validatedTable(sourcePoint,sizes,base,true)
  const keys = new Set()
  const targetPoints = targets.map(ref => {
    const point = reference(project,ref)
    const key = JSON.stringify([ref.pieceId,ref.pointIndex])
    if (keys.has(key)) fail('duplicate target point')
    if (ref.pieceId === source.pieceId && ref.pointIndex === source.pointIndex) fail('source cannot also be a target')
    keys.add(key)
    if (point.namedGradeRuleRef) fail('detach pinned named target grade rule before batch transfer')
    return {ref,point,table:validatedTable(point,sizes,base,false)}
  })
  // Grade the unmodified document first to resolve automatic and legacy rules.
  // This also catches invalid source geometry before any clone is changed.
  const baseline = new Map()
  for (const size of sizes) {
    const graded = gradeProject(project,size)
    if (!Array.isArray(graded.pieces) || graded.pieces.length !== project.pieces.length ||
        graded.pieces.some(p => !Array.isArray(p.points) || p.points.some(pt => !finite(pt.x) || !finite(pt.y))))
      fail(`invalid baseline geometry at ${size}`)
    baseline.set(size,graded)
  }
  const next = cloneProject(project)
  for (const {ref,point,table} of targetPoints) {
    const target = reference(next,ref)
    const positions = sizes.map(size => {
      const candidate = baseline.get(size).pieces.find(p => p.id === ref.pieceId)?.points[ref.pointIndex]
      if (!candidate || !finite(candidate.x) || !finite(candidate.y)) fail('unresolved baseline target')
      const original = table?.[size] ?? {dx:candidate.x-point.x,dy:candidate.y-point.y}
      return {
        dx: axis === 'y' ? original.dx : sourceTable[size].dx,
        dy: axis === 'x' ? original.dy : sourceTable[size].dy,
      }
    })
    const atBase = positions[sizes.indexOf(base)]
    if (Math.abs(atBase.dx) > 1e-8 || Math.abs(atBase.dy) > 1e-8)
      fail('base geometry displacement must be zero')
    const steps = positions.slice(1).map((position,index) => ({
      dx:position.dx-positions[index].dx,
      dy:position.dy-positions[index].dy,
    }))
    if (steps.some(step => !finite(step.dx) || !finite(step.dy) || Math.abs(step.dx) > 100 || Math.abs(step.dy) > 100))
      fail('invalid or unsupported grading break')
    target.industrialGradeRule = validateIndustrialGradeRule({
      mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,sizes:[...sizes],baseSize:base,steps,
    })
  }
  for (const size of sizes) {
    const result = gradeProject(next,size)
    if (result.pieces.length !== next.pieces.length ||
        result.pieces.some(p => !Array.isArray(p.points) || p.points.some(pt => !finite(pt.x) || !finite(pt.y))))
      fail(`invalid generated geometry for ${size}`)
  }
  return {project:next,validation:{sizes:[...sizes],baseSize:base,axis,targets:targets.length,units:'cm',manufacturingApproved:false}}
}
