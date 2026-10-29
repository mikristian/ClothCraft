import { gradeProject } from './grading.js'
import { quadraticArcLength } from './draftingPrecision.js'

const fail = code => { throw Error(`MODARIS_GRADED_CURVED_NOTCH_${code}`) }
const finite = x => typeof x === 'number' && Number.isFinite(x)
const forbidden = ['productionSpec','cutlines','cutline','holes','markers','marker','industrialAllowanceGraph','modarisSizeLinkedGrade','modarisGradedNotchLink','sewingPairs','manufacturing','attachments']
const pieceForbidden = ['holes','cutlines','cutline','sewingPairs','edgeBindings','darts','pleats','buttonholes','pins','internalLines','seamAllowance']
const EPS = 1e-8

function safeCopy(value, depth = 0, active = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || finite(value)) return value
  if (!value || typeof value !== 'object' || depth > 32 || active.has(value)) fail('UNSAFE_INPUT')
  const isArray = Array.isArray(value)
  if (Object.getPrototypeOf(value) !== (isArray ? Array.prototype : Object.prototype)) fail('UNSAFE_PROTOTYPE')
  const keys = Reflect.ownKeys(value)
  if (keys.length > 15000 || keys.some(key => typeof key !== 'string' || ['__proto__','constructor','prototype','toJSON'].includes(key))) fail('UNSAFE_PROPERTY')
  active.add(value)
  const result = isArray ? [] : {}
  for (const key of keys) {
    if (key === 'length' && isArray) continue
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || (isArray && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) fail('UNSAFE_PROPERTY')
    result[key] = safeCopy(descriptor.value, depth + 1, active)
  }
  active.delete(value)
  if (isArray && result.length !== value.length) fail('SPARSE_INPUT')
  return result
}

function resolve(project, ref) {
  if (!ref || Object.keys(ref).sort().join(',') !== 'notchId,pieceId' || typeof ref.pieceId !== 'string' || typeof ref.notchId !== 'string') fail('REFERENCE')
  const piece = project.pieces.find(p => p.id === ref.pieceId)
  const notch = piece?.notches?.find(n => n.id === ref.notchId)
  if (!notch) fail('NOTCH_MISSING')
  return { piece, notch }
}

function edgeGeometry({ piece, notch }) {
  const i = notch.edgeIndex, points = piece.points
  const curve = piece.curves?.[i]
  if (!curve || !finite(curve.cx) || !finite(curve.cy) || Object.keys(curve).sort().join(',') !== 'cx,cy') fail('QUADRATIC_REQUIRED')
  const a = points[i], b = points[(i + 1) % points.length], c = { x:curve.cx, y:curve.cy }
  if (![a.x,a.y,b.x,b.y,c.x,c.y].every(finite) || Math.hypot(b.x-a.x,b.y-a.y) < .01) fail('INVALID_GEOMETRY')
  const length = quadraticArcLength(a,c,b)
  if (!finite(length) || length < .01 || length > 1e6) fail('INVALID_GEOMETRY')
  return { a,b,c,length }
}

function lengthTo(edge,t) { return quadraticArcLength(edge.a,edge.c,edge.b,0,t) }
function inverseStation(edge, station) {
  let lo=0,hi=1
  for (let i=0;i<55;i++) {
    const mid=(lo+hi)/2
    if (lengthTo(edge,mid)<station) lo=mid
    else hi=mid
  }
  return (lo+hi)/2
}

function validate(project) {
  if (!Number.isSafeInteger(project?.revision) || project.revision < 0 || project.units !== 'cm' || !Array.isArray(project.pieces) || project.pieces.length < 2 || project.pieces.length > 32) fail('PROJECT')
  if (forbidden.some(key => Object.hasOwn(project,key)) || (project.seams !== undefined && (!Array.isArray(project.seams) || project.seams.length))) fail('ATTACHED_PRODUCTION')
  const sizes=project.grading?.sizes
  if (!Array.isArray(sizes) || sizes.length < 2 || sizes.length > 12 || sizes.some(s => typeof s !== 'string' || !s) || new Set(sizes).size !== sizes.length || !sizes.includes(project.grading.baseSize)) fail('SIZES')
  const ids=new Set()
  for (const piece of project.pieces) {
    if (!piece || typeof piece.id !== 'string' || !piece.id || ids.has(piece.id)) fail('PIECE_ID')
    ids.add(piece.id)
    if (pieceForbidden.some(key => Object.hasOwn(piece,key)) || piece.locked === true) fail('PIECE_ATTACHMENTS')
    if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.length > 64 || piece.points.some(pt => !finite(pt?.x) || !finite(pt?.y))) fail('TOPOLOGY')
    if (piece.edgeNames !== undefined && (!Array.isArray(piece.edgeNames) || piece.edgeNames.length !== piece.points.length || piece.edgeNames.some(n=>typeof n!=='string'))) fail('EDGE_IDENTITY')
    if (!Array.isArray(piece.notches) || piece.notches.length > 64 || new Set(piece.notches.map(n=>n?.id)).size !== piece.notches.length) fail('NOTCH_IDS')
    for (const n of piece.notches) if (!n || Object.keys(n).sort().join(',') !== 'edgeIndex,id,t' || typeof n.id !== 'string' || !n.id || !Number.isInteger(n.edgeIndex) || n.edgeIndex < 0 || n.edgeIndex >= piece.points.length || !finite(n.t) || n.t <= 0 || n.t >= 1) fail('NOTCH_SCHEMA')
    for (const [key, curve] of Object.entries(piece.curves ?? {})) if (!/^(0|[1-9]\d*)$/.test(key) || Number(key)>=piece.points.length || !curve || Object.keys(curve).sort().join(',')!=='cx,cy' || !finite(curve.cx) || !finite(curve.cy)) fail('CURVE_TOPOLOGY')
  }
  return sizes
}

/** One legacy notch t can represent a graded arclength station only if every size agrees. */
export function transferModarisGradedCurvedNotch20261027(input,{source,target,expectedRevision}={}) {
  const p=safeCopy(input)
  const sizes=validate(p)
  if (expectedRevision !== p.revision) fail('STALE_REVISION')
  const src=resolve(p,source), dst=resolve(p,target)
  if (src.piece === dst.piece) fail('SAME_PIECE')
  const sourceEdge=edgeGeometry(src), targetEdge=edgeGeometry(dst)
  const sourceIndex=src.notch.edgeIndex,targetIndex=dst.notch.edgeIndex
  const sourceFraction=lengthTo(sourceEdge,src.notch.t)/sourceEdge.length
  if (!finite(sourceFraction) || sourceFraction <= 0 || sourceFraction >= 1) fail('INVALID_STATION')
  const proof=[]
  for (const size of sizes) {
    const graded=gradeProject(p,size)
    const a=resolve(graded,source),b=resolve(graded,target)
    if (a.piece.points.length!==src.piece.points.length || b.piece.points.length!==dst.piece.points.length || a.notch.edgeIndex!==sourceIndex || b.notch.edgeIndex!==targetIndex || a.notch.t!==src.notch.t || b.notch.t!==dst.notch.t || JSON.stringify(a.piece.edgeNames??null)!==JSON.stringify(src.piece.edgeNames??null) || JSON.stringify(b.piece.edgeNames??null)!==JSON.stringify(dst.piece.edgeNames??null)) fail('SIZE_TOPOLOGY_DRIFT')
    const sourceCurve=edgeGeometry(a),targetCurve=edgeGeometry(b)
    const sourceStationCm=lengthTo(sourceCurve,a.notch.t)
    const normalizedStation=sourceStationCm/sourceCurve.length
    const targetStationCm=normalizedStation*targetCurve.length
    const requiredTargetT=inverseStation(targetCurve,targetStationCm)
    const residualCm=Math.abs(lengthTo(targetCurve,requiredTargetT)-targetStationCm)
    if (!finite(requiredTargetT) || requiredTargetT<=0 || requiredTargetT>=1 || residualCm>1e-6) fail('NUMERICAL_INVERSION')
    proof.push({size,sourceEdgeCm:sourceCurve.length,sourceStationCm,normalizedStation,targetEdgeCm:targetCurve.length,targetStationCm,requiredTargetT,residualCm})
  }
  // The legacy mark has only one t. Also reject when physical source arclength
  // fraction changes by size: a source size map would be necessary as well.
  const t=proof[0].requiredTargetT
  if (proof.some(row=>Math.abs(row.requiredTargetT-t)>EPS || Math.abs(row.normalizedStation-sourceFraction)>EPS)) fail('REQUIRES_PER_SIZE_NOTCH_MAP')
  const baseEdge=targetEdge
  if (Math.abs(lengthTo(baseEdge,t)/baseEdge.length-sourceFraction)>EPS) fail('REQUIRES_PER_SIZE_NOTCH_MAP')
  dst.notch.t=t
  p.revision++
  return {project:p,proof,manufacturingApproved:false}
}
