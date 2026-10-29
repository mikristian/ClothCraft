import { gradeProject } from './grading.js'
import { validateIndustrialGradeRule, INDUSTRIAL_GRADE_MODES } from './industrialGradeRules.js'
import { inspectDraftTopology } from './draftingTopology.js'

const fail = code => { const error = new Error('Graded straight-edge split refused: ' + code); error.code = code; throw error }
const finite = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 100000
const near = (a, b, tolerance = 1e-7) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance
const safeId = value => typeof value === 'string' && value.length > 0 && value.length < 128 && !['__proto__', 'constructor', 'prototype'].includes(value)
// Accepted fields are demonstrably independent of perimeter vertex indexing.
// Unknown or opaque metadata may encode stale vertex/edge references.
const pieceKeys = new Set(['id', 'name', 'points', 'color', 'fabricId', 'quantity', 'cutQty', 'cutQuantity', 'material', 'notes', 'label', 'type', 'category', 'description', 'rotation', 'locked', 'visible', 'position'])
const pointKeys = new Set(['id', 'x', 'y', 'gradeRule', 'industrialGradeRule'])
const projectKeys = new Set(['pieces', 'grading', 'revision', 'updatedAt', 'id', 'name', 'description'])
const gradingKeys = new Set(['sizes', 'baseSize', 'widthPerSizeCm', 'lengthPerSizeCm'])
function cloneSafe(value) {
  const active = new Set()
  let count = 0
  function visit(node, depth) {
    if (node === null || typeof node === 'string' || typeof node === 'boolean' || node === undefined) return node
    if (typeof node === 'number') { if (!Number.isFinite(node)) fail('NONFINITE_SOURCE'); return node }
    if (typeof node !== 'object' || depth > 32 || active.has(node) || ++count > 18000) fail('UNSAFE_SOURCE')
    const array = Array.isArray(node)
    if (Object.getPrototypeOf(node) !== (array ? Array.prototype : Object.prototype)) fail('SOURCE_PROTOTYPE')
    const descriptors = Object.getOwnPropertyDescriptors(node)
    const keys = Reflect.ownKeys(descriptors)
    if (keys.some(key => typeof key !== 'string' || ['__proto__','prototype','constructor','toJSON'].includes(key))) fail('SOURCE_METADATA')
    if (array && node.length > 8192) fail('ARRAY_LIMIT')
    active.add(node)
    const result = array ? [] : {}
    for (const key of keys) {
      if (array && key === 'length') continue
      const descriptor = descriptors[key]
      if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) fail('ACCESSOR_OR_HIDDEN_SOURCE')
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || +key >= node.length)) fail('ARRAY_METADATA')
      Object.defineProperty(result, key, {value: visit(descriptor.value, depth + 1), enumerable: true, configurable: true, writable: true})
    }
    if (array && Object.keys(result).length !== node.length) fail('SPARSE_ARRAY')
    active.delete(node)
    return result
  }
  return visit(value, 0)
}
function explicitRule(point) {
  return point.industrialGradeRule || point.gradeRule?.enabled
}
function checkAttachmentFree(project, piece) {
  if (Object.keys(project).some(key => !projectKeys.has(key))) fail('PROJECT_GEOMETRY_ATTACHMENT')
  if (!project.grading || Object.keys(project.grading).some(key => !gradingKeys.has(key))) fail('UNSUPPORTED_GRADING_ATTACHMENT')
  for (const candidate of project.pieces) {
    if (Object.keys(candidate).some(key => !pieceKeys.has(key))) fail('UNSUPPORTED_PIECE_ATTACHMENT')
    if (!Array.isArray(candidate.points) || candidate.points.some(point =>
      !point || Object.keys(point).some(key => !pointKeys.has(key)) ||
      point.id !== undefined && !safeId(point.id) ||
      point.gradeRule && Object.keys(point.gradeRule).some(key => !['enabled','dxPerSize','dyPerSize'].includes(key)) ||
      point.industrialGradeRule && Object.keys(point.industrialGradeRule).some(key =>
        !['mode','sizes','baseSize','steps','up','down'].includes(key)))) fail('UNSUPPORTED_POINT_ATTACHMENT')
  }
}
function assertContour(piece) {
  if (piece.points.length > 256 || !inspectDraftTopology(piece, {curveSamples: 8}).valid) fail('INVALID_CONTOUR')
}
/**
 * Splits a straight, attachment-free edge while interpolating the physical
 * location of its new vertex independently for every size of an authored
 * industrial or legacy grade run. Preserves source IDs and source revision.
 * Returns {project, detail, validation}; the result needs caller UI wiring.
 */
export function splitGradedStraightEdge20261024(project, {pieceId, edgeIndex, fraction} = {}) {
  const source = cloneSafe(project)
  if (!source || !Array.isArray(source.pieces) || source.pieces.length < 1 || source.pieces.length > 64 ||
      !safeId(pieceId) || source.pieces.some(piece => !safeId(piece?.id))) fail('INVALID_PROJECT')
  if (source.pieces.filter(piece => piece.id === pieceId).length !== 1 || new Set(source.pieces.map(piece => piece.id)).size !== source.pieces.length) fail('PIECE_IDENTITY')
  const piece = source.pieces.find(piece => piece.id === pieceId)
  if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.length >= 256 ||
      piece.points.some(point => !finite(point?.x) || !finite(point?.y))) fail('POINTS_INVALID')
  if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= piece.points.length) fail('EDGE_INDEX')
  if (!finite(fraction) || fraction < 0.05 || fraction > 0.95) fail('SPLIT_FRACTION')
  checkAttachmentFree(source, piece)
  const sizes = source.grading?.sizes
  const baseSize = source.grading?.baseSize
  if (!Array.isArray(sizes) || sizes.length < 2 || sizes.length > 24 ||
      !sizes.every(safeId) || new Set(sizes).size !== sizes.length || !sizes.includes(baseSize)) fail('GRADE_SIZES')
  for (const existing of source.pieces) {
    if (!Array.isArray(existing.points) || existing.points.length < 3 || existing.points.length > 256) fail('OTHER_PIECE_INVALID')
  }
  const a = piece.points[edgeIndex], b = piece.points[(edgeIndex + 1) % piece.points.length]
  if (Math.hypot(a.x - b.x, a.y - b.y) < 0.01) fail('SHORT_EDGE')
  assertContour(piece)
  const gradeKind = point => point.industrialGradeRule ? 'industrial' : point.gradeRule?.enabled ? 'legacy' : 'automatic'
  const kinds = new Set(piece.points.map(gradeKind))
  if (kinds.size !== 1) fail('MIXED_GRADE_RULES')
  const authored = gradeKind(a) !== 'automatic'
  if ((a.industrialGradeRule && a.gradeRule?.enabled) || (b.industrialGradeRule && b.gradeRule?.enabled)) fail('AMBIGUOUS_GRADE_RULE')
  const evaluated = sizes.map(size => {
    let graded
    try { graded = gradeProject(source, size).pieces.find(candidate => candidate.id === pieceId) }
    catch { fail('GRADE_EVALUATION_FAILED') }
    if (!graded || graded.points.length !== piece.points.length) fail('GRADE_TOPOLOGY')
    assertContour(graded)
    const start = graded.points[edgeIndex], end = graded.points[(edgeIndex + 1) % graded.points.length]
    if (!finite(start.x) || !finite(start.y) || !finite(end.x) || !finite(end.y)) fail('GRADE_COORDINATES')
    if (Math.hypot(start.x - end.x, start.y - end.y) < 0.01) fail('GRADED_EDGE_TOO_SHORT')
    return {size, point: {x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction}, original: graded}
  })
  const base = evaluated.find(row => row.size === baseSize).point
  if (!near(base, {x:a.x+(b.x-a.x)*fraction, y:a.y+(b.y-a.y)*fraction})) fail('BASE_SIZE_MISMATCH')
  const existingIds = new Set(source.pieces.flatMap(p => p.points.map(point => point.id).filter(value => value !== undefined)))
  const idBase = `${pieceId}:split:${edgeIndex}:${fraction.toString(16).replace(/[^a-zA-Z0-9]/g,'_')}`
  if (!safeId(idBase)) fail('INSERTED_ID_TOO_LONG')
  let insertedId = idBase
  for (let suffix = 1; existingIds.has(insertedId); suffix++) {
    insertedId = `${idBase}:${suffix}`
    if (!safeId(insertedId) || suffix > 10000) fail('INSERTED_ID_EXHAUSTED')
  }
  const inserted = {id:insertedId,x:base.x, y:base.y}
  if (authored) {
    const offsets = evaluated.map(row => ({dx:row.point.x - base.x, dy:row.point.y - base.y}))
    inserted.industrialGradeRule = validateIndustrialGradeRule({
      mode: INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL, sizes, baseSize,
      steps: offsets.slice(1).map((current, index) => ({dx:current.dx - offsets[index].dx, dy:current.dy - offsets[index].dy})),
    })
  } else {
    // Default automatic size transforms depend on whole-piece bounds. A newly
    // inserted vertex may affect those bounds; check exact grade geometry after.
    inserted.gradeRule = {enabled:true,dxPerSize:0,dyPerSize:0}
    const baseIndex = sizes.indexOf(baseSize)
    const indexPlus = Math.min(sizes.length - 1, baseIndex + 1)
    const indexMinus = Math.max(0, baseIndex - 1)
    const step = indexPlus !== baseIndex ? {x:evaluated[indexPlus].point.x-base.x,y:evaluated[indexPlus].point.y-base.y} : {x:base.x-evaluated[indexMinus].point.x,y:base.y-evaluated[indexMinus].point.y}
    inserted.gradeRule.dxPerSize = step.x
    inserted.gradeRule.dyPerSize = step.y
  }
  piece.points.splice(edgeIndex + 1, 0, inserted)
  assertContour(piece)
  const report = []
  for (const row of evaluated) {
    let after
    try { after = gradeProject(source,row.size).pieces.find(candidate => candidate.id === pieceId) } catch { fail('GRADED_SPLIT_FAILED') }
    assertContour(after)
    const pos = after.points[edgeIndex + 1]
    if (!near(pos,row.point)) fail('GRADED_INSERTION_DRIFT')
    const original = row.original.points
    for (let index=0; index<original.length; index++) {
      const revised = after.points[index + (index > edgeIndex ? 1 : 0)]
      if (!near(revised,original[index])) fail('EXISTING_GRADE_VERTEX_DRIFT')
    }
    report.push({size:row.size,inserted:{x:pos.x,y:pos.y},contourValid:true})
  }
  return {project:source,detail:{pieceId,edgeIndex,insertedIndex:edgeIndex+1,fraction,vertex:inserted},
    validation:{status:'GRADE_GEOMETRY_VERIFIED',sizes:report,sourceUnchanged:true,manufacturingApproved:false}}
}
