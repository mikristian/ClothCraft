import { cloneProject } from './project.js'
import { gradeProject } from './grading.js'
import { evaluateIndustrialGradeTable, validateIndustrialGradeRule, INDUSTRIAL_GRADE_MODES } from './industrialGradeRules.js'

// Experimental legacy-project contract. All geometry and grade displacements are centimeters.
const fail = message => { throw new Error(`Modaris linked grade: ${message}`) }
const finite = value => typeof value === 'number' && Number.isFinite(value)
const key = ref => `${ref.pieceId}:${ref.pointIndex}`
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const identity = piece => ({ id: piece.id, pointIds: piece.points.map(p => p.id ?? null),
  edgeNames: piece.edgeNames ?? null, curveEdges: Object.keys(piece.curves ?? {}).sort() })

function validateProject(project) {
  if (!project || !Array.isArray(project.pieces) || !project.pieces.length) fail('pieces required')
  const { sizes, baseSize } = project.grading ?? {}
  if (!Array.isArray(sizes) || sizes.length < 2 || sizes.length > 64 || sizes.some(s => typeof s !== 'string' || !s.trim() || s.trim() !== s) || new Set(sizes).size !== sizes.length || !sizes.includes(baseSize)) fail('invalid size metadata')
  if (project.units !== undefined && project.units !== 'cm') fail('only centimeter projects supported')
  const ids = new Set()
  for (const piece of project.pieces) {
    if (typeof piece.id !== 'string' || !piece.id || ids.has(piece.id)) fail('duplicate or missing piece ID')
    ids.add(piece.id)
    if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.some(p => !finite(p.x) || !finite(p.y))) fail('invalid polygon points')
    if (piece.points.some((p, i) => same([p.x,p.y], [piece.points[(i+1)%piece.points.length].x,piece.points[(i+1)%piece.points.length].y]))) fail('zero-length edge')
    if (piece.edgeNames && (!Array.isArray(piece.edgeNames) || piece.edgeNames.length !== piece.points.length)) fail('invalid named edges')
    if (Object.entries(piece.curves ?? {}).some(([index,c]) => !/^(0|[1-9]\d*)$/.test(index) || Number(index) >= piece.points.length || !finite(c.cx) || !finite(c.cy))) fail('invalid quadratic curve topology')
    for (const p of piece.points) if (p.industrialGradeRule) {
      const rule = validateIndustrialGradeRule(p.industrialGradeRule)
      if (!same(rule.sizes,sizes) || rule.baseSize !== baseSize) fail('stale point size metadata')
    }
  }
  return { sizes:[...sizes], baseSize }
}

function resolve(project, ref) {
  if (!ref || typeof ref.pieceId !== 'string' || !Number.isSafeInteger(ref.pointIndex) || ref.pointIndex < 0) fail('invalid point reference')
  const piece = project.pieces.find(p => p.id === ref.pieceId)
  const point = piece?.points[ref.pointIndex]
  if (!point) fail('missing point reference')
  return { piece, point }
}

function order(links) {
  const byTarget = new Map()
  for (const link of links) {
    if (key(link.source) === key(link.target)) fail('self-linked point')
    if (byTarget.has(key(link.target))) fail('duplicate target')
    byTarget.set(key(link.target),link)
  }
  const visiting = new Set(), visited = new Set(), sorted = []
  function visit(link) {
    const id = key(link.target)
    if (visiting.has(id)) fail('dependency cycle')
    if (visited.has(id)) return
    visiting.add(id)
    const previous = byTarget.get(key(link.source))
    if (previous) visit(previous)
    visiting.delete(id)
    visited.add(id)
    sorted.push(link)
  }
  links.forEach(visit)
  return sorted
}

function signature(point) {
  return {x:point.x,y:point.y,id:point.id ?? null,rule:point.industrialGradeRule ?? null}
}

function table(project, ref, sizes, baseSize) {
  const {point} = resolve(project,ref)
  if (!point.industrialGradeRule) fail('source requires explicit industrial rule')
  const rule = validateIndustrialGradeRule(point.industrialGradeRule)
  if (!same(rule.sizes,sizes) || rule.baseSize !== baseSize) fail('stale source size metadata')
  return evaluateIndustrialGradeTable(rule)
}

function transfer(project, links, sizes, baseSize) {
  const next = cloneProject(project)
  for (const link of order(links)) {
    const movements = table(next,link.source,sizes,baseSize)
    const {point:target} = resolve(next,link.target)
    const retained = target.industrialGradeRule ? evaluateIndustrialGradeTable(target.industrialGradeRule) : null
    if (link.axis !== 'both' && !retained) fail('single-axis link requires target industrial rule')
    const deltas = sizes.map(size => ({dx:link.axis === 'y' ? retained[size].dx : movements[size].dx,
      dy:link.axis === 'x' ? retained[size].dy : movements[size].dy}))
    const base = deltas[sizes.indexOf(baseSize)]
    if (Math.abs(base.dx)>1e-8 || Math.abs(base.dy)>1e-8) fail('nonzero base displacement')
    const steps = deltas.slice(1).map((d,i) => ({dx:d.dx-deltas[i].dx,dy:d.dy-deltas[i].dy}))
    if (steps.some(d => !finite(d.dx) || !finite(d.dy) || Math.abs(d.dx)>100 || Math.abs(d.dy)>100)) fail('unsafe break')
    target.industrialGradeRule = validateIndustrialGradeRule({mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,sizes:[...sizes],baseSize,steps})
  }
  return next
}

/** Create persisted links. Link targets must already have explicit grade rules. */
export function createModarisSizeLinkedGrade(project, definitions) {
  const {sizes,baseSize} = validateProject(project)
  if (project.modarisSizeLinkedGrade) fail('existing link graph requires reapply')
  if (!Array.isArray(definitions) || !definitions.length) fail('links required')
  const links = definitions.map(({source,target,axis='both',curves=false}) => {
    const a=resolve(project,source),b=resolve(project,target)
    if (!['both','x','y'].includes(axis)) fail('invalid axis')
    if (curves && (axis !== 'both' || a.piece.points.length !== b.piece.points.length || !same(Object.keys(a.piece.curves??{}).sort(),Object.keys(b.piece.curves??{}).sort()))) fail('curves require matching piece topology and both axes')
    if (!b.point.industrialGradeRule) fail('target requires explicit industrial rule')
    return {source:{...source},target:{...target},axis,curves:Boolean(curves),sourceTopology:identity(a.piece),targetTopology:identity(b.piece),sourceBase:{x:a.point.x,y:a.point.y,id:a.point.id??null},targetBase:{x:b.point.x,y:b.point.y,id:b.point.id??null},targetRule:b.point.industrialGradeRule}
  })
  order(links)
  const next=transfer(project,links,sizes,baseSize)
  next.modarisSizeLinkedGrade={version:1,units:'cm',sizes,baseSize,links:links.map(l=>({...cloneProject(l),appliedRule:cloneProject(resolve(next,l.target).point.industrialGradeRule)}))}
  return {project:next,validation:{sizes,baseSize,links:links.length,units:'cm',manufacturingApproved:false}}
}

/** Recompute changes to source rule tables atomically. Authored source coordinates remain fixed. */
export function reapplyModarisSizeLinkedGrade(project) {
  const {sizes,baseSize}=validateProject(project)
  const graph=project.modarisSizeLinkedGrade
  if (!graph || graph.version!==1 || graph.units!=='cm' || !same(graph.sizes,sizes) || graph.baseSize!==baseSize || !Array.isArray(graph.links) || !graph.links.length) fail('stale or missing link graph')
  const links=order(graph.links)
  for(const link of links){
    const a=resolve(project,link.source),b=resolve(project,link.target)
    if (!same(identity(a.piece),link.sourceTopology) || !same(identity(b.piece),link.targetTopology)) fail('stale piece topology or named edges')
    if (!same({x:a.point.x,y:a.point.y,id:a.point.id??null},link.sourceBase) || !same({x:b.point.x,y:b.point.y,id:b.point.id??null},link.targetBase)) fail('stale authored source or target')
    if (!same(b.point.industrialGradeRule,link.appliedRule)) fail('target rule changed outside linked grade')
  }
  const next=transfer(project,links,sizes,baseSize)
  next.modarisSizeLinkedGrade={...cloneProject(graph),links:graph.links.map(link=>({...cloneProject(link),appliedRule:cloneProject(resolve(next,link.target).point.industrialGradeRule)}))}
  return {project:next,validation:{sizes,baseSize,links:links.length,units:'cm',manufacturingApproved:false}}
}

/** Generate a deterministic size preview; linked quadratic controls follow source curve deltas. */
export function buildModarisSizeLinkedGradeRun(project) {
  const refreshed=reapplyModarisSizeLinkedGrade(project).project
  const {sizes,baseSize}=validateProject(refreshed)
  const run={}
  for (const size of sizes) {
    const graded=gradeProject(refreshed,size)
    for (const link of refreshed.modarisSizeLinkedGrade.links) {
      if (!link.curves) continue
      const source=resolve(refreshed,link.source).piece
      const target=resolve(refreshed,link.target).piece
      const gradedSource=graded.pieces.find(p=>p.id===source.id)
      const gradedTarget=graded.pieces.find(p=>p.id===target.id)
      for(const edge of Object.keys(source.curves ?? {})) {
        const dx=gradedSource.curves[edge].cx-source.curves[edge].cx
        const dy=gradedSource.curves[edge].cy-source.curves[edge].cy
        gradedTarget.curves[edge]={...gradedTarget.curves[edge],cx:target.curves[edge].cx+dx,cy:target.curves[edge].cy+dy}
        if(!finite(gradedTarget.curves[edge].cx)||!finite(gradedTarget.curves[edge].cy)) fail('invalid linked curve control')
      }
    }
    graded.previewSize=size
    run[size]=graded
  }
  return {run,validation:{sizes,baseSize,units:'cm',manufacturingApproved:false}}
}
