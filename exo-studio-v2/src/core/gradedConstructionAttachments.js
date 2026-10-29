/**
 * Size-aware construction metadata. Pattern vertices are canonical; all
 * dependent marks are re-evaluated from that base rather than graded again.
 * Unanchored internal points use an interpolated displacement field and are
 * expressly NOT substitutes for approved dart/notch attachment constraints.
 */
import { cloneProject,edgePointAt } from './project.js'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const validPoint = value => value && finite(value.x) && finite(value.y)
const edgeBound = (index, count) => Number.isInteger(index) && index >= 0 && index < count

function offsetFromVertices(source, graded, location) {
  if (!validPoint(location)) throw new Error('Construction mark endpoint requires finite x/y coordinates')
  const sourcePoints = source.points, destPoints = graded.points
  if (!Array.isArray(sourcePoints) || sourcePoints.length < 3 ||
      sourcePoints.length !== destPoints?.length) throw new Error('Graded construction source vertex count mismatch')
  let weightSum = 0, shiftX = 0, shiftY = 0
  for (let i = 0; i < sourcePoints.length; i++) {
    const a = sourcePoints[i], b = destPoints[i]
    if (!validPoint(a) || !validPoint(b)) throw new Error('Graded construction references nonfinite vertex')
    if (a.id != null && b.id != null && a.id !== b.id) throw new Error('Graded construction vertex identity mismatch')
    const distanceSq = (location.x - a.x) ** 2 + (location.y - a.y) ** 2
    if (distanceSq < 1e-18) return { x: location.x + b.x - a.x, y: location.y + b.y - a.y }
    const weight = 1 / distanceSq
    weightSum += weight
    shiftX += weight * (b.x - a.x)
    shiftY += weight * (b.y - a.y)
  }
  const x = location.x + shiftX / weightSum, y = location.y + shiftY / weightSum
  if (!finite(x) || !finite(y)) throw new Error('Construction marking interpolation exceeded finite numeric limits')
  return { x, y }
}

/** Regrade Bézier handles using the same point displacement field as marks. */
export function gradeConstructionCurveControls(source, graded) {
  if (!source.curves) return undefined
  return Object.fromEntries(Object.entries(source.curves).map(([index, control]) => {
    if (!Number.isInteger(Number(index)) || Number(index) < 0 || Number(index) >= source.points.length ||
        !finite(control?.cx) || !finite(control?.cy)) throw new Error('Graded curve has invalid base control or edge identity')
    const transformed = offsetFromVertices(source, graded, {x:control.cx,y:control.cy})
    return [index, {...cloneProject(control), cx:transformed.x, cy:transformed.y}]
  }))
}

function attachedPosition(source, graded, position, anchor) {
  if (!anchor) return offsetFromVertices(source, graded, position)
  const count = source.points.length
  if (anchor.vertexIndex != null) {
    if (!edgeBound(anchor.vertexIndex, count)) throw new Error('Construction mark has invalid vertex anchor')
    const node = graded.points[anchor.vertexIndex]
    return { x: node.x, y: node.y }
  }
  if (!edgeBound(anchor.edgeIndex, count) || !finite(anchor.t) || anchor.t < 0 || anchor.t > 1) {
    throw new Error('Construction mark has invalid edge anchor or parameter')
  }
  // Edge-linked internal lines remain attached to exact curve positions.
  const index = anchor.edgeIndex
  // Industrial seam/notch fractions are physical *arclength* fractions, not
  // raw quadratic Bézier parameter t. Use the same evaluator as the DXF
  // notch, seam-walk and measurement exporters so the 2D mark cannot drift.
  const located=edgePointAt(graded,index,anchor.t,64)
  if(!validPoint(located?.point))throw new Error('Construction edge attachment could not be evaluated')
  return {...located.point}
}

export function gradeAttachedConstructionPoint(source, graded, position, anchor) {
  return attachedPosition(source,graded,position,anchor)
}

export function gradeConstructionAttachments(source, graded) {
  if (!Array.isArray(source?.points) || !Array.isArray(graded?.points) || source.points.length !== graded.points.length) {
    throw new Error('Construction attachment source and destination must share topology')
  }
  const notches = (source.notches || []).map(notch => {
    if (!notch || !edgeBound(notch.edgeIndex, source.points.length) || !finite(notch.t ?? 0.5) ||
        (notch.t ?? 0.5) < 0 || (notch.t ?? 0.5) > 1 ||
        (notch.depthCm != null && (!finite(notch.depthCm) || notch.depthCm < 0))) {
      throw new Error(`Invalid grade-aware notch anchor on ${source.id || 'piece'}`)
    }
    const result = cloneProject(notch)
    if (validPoint(notch)) Object.assign(result, attachedPosition(source, graded, notch, {edgeIndex:notch.edgeIndex,t:notch.t ?? 0.5}))
    return result
  })
  const internalLines = (source.internalLines || []).map(line => {
    if (!line || !validPoint(line.a) || !validPoint(line.b)) throw new Error('Graded internal lines require two finite endpoints')
    return {
      ...cloneProject(line),
      a: {...cloneProject(line.a), ...attachedPosition(source, graded, line.a, line.aAnchor)},
      b: {...cloneProject(line.b), ...attachedPosition(source, graded, line.b, line.bAnchor)},
    }
  })
  return {notches,internalLines}
}

/** Explain limits without marking unknown construction metadata as factory-safe. */
export const GRADED_MARKING_NOTE = 'Edge/vertex-linked marks remain attached; otherwise construction points use an interpolated displacement. A trained patternmaker must verify dart balance, notch seam walking and designed ease.'
