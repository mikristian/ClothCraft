import { sampleEdge } from './project.js'

function normalize(x, y) {
  const length = Math.hypot(x, y) || 1
  return { x: x / length, y: y / length }
}

function finiteSetting(value, fallback, min = -Infinity, max = Infinity) {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

function stitchRows(value) {
  return Math.trunc(finiteSetting(value, 1, 1, 8))
}

export function offsetEdgePath(piece, edgeIndex, offsetCm = 0, segments = 28) {
  const edgeCount = piece?.points?.length || 0
  if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= edgeCount) return []
  const path = sampleEdge(piece, edgeIndex, Math.trunc(finiteSetting(segments, 28, 8, 256)))
  if (path.length < 2 || !path.every(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))) return []
  const safeOffset = finiteSetting(offsetCm, 0)
  const shifted = path.map((point, index) => {
    const previous = path[Math.max(0, index - 1)]
    const next = path[Math.min(path.length - 1, index + 1)]
    const tangent = normalize(next.x - previous.x, next.y - previous.y)
    const normal = { x: -tangent.y, y: tangent.x }
    return {
      x: point.x + normal.x * safeOffset,
      y: point.y + normal.y * safeOffset,
    }
  })
  return shifted.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)) ? shifted : []
}

export function topstitchPaths(piece, topstitch = {}) {
  const rows = stitchRows(topstitch.rows)
  const baseOffset = finiteSetting(topstitch.offsetCm, 0.7)
  const rowGap = finiteSetting(topstitch.rowGapCm, 0.45)
  return Array.from({ length: rows }, (_, index) => (
    offsetEdgePath(piece, topstitch.edgeIndex, baseOffset + index * rowGap, 32)
  ))
}

export function zipperPaths(piece, zipper = {}) {
  const offset = finiteSetting(zipper.offsetCm, 0)
  const halfWidth = finiteSetting(zipper.widthCm, 1.2, 0) * 0.5
  return [
    offsetEdgePath(piece, zipper.edgeIndex, offset - halfWidth, 32),
    offsetEdgePath(piece, zipper.edgeIndex, offset + halfWidth, 32),
  ]
}

export function pieceCenter(piece) {
  const points = (piece?.points || []).filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))
  if (!points.length) return { x: 0, y: 0 }
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  }
}

export function trimSummary(project) {
  let topstitchRows = 0
  let zippers = 0
  let buttons = 0
  let buttonholes = 0
  for (const piece of project?.pieces || []) {
    topstitchRows += (piece.topstitches || []).reduce((sum, stitch) => sum + stitchRows(stitch?.rows), 0)
    zippers += (piece.zippers || []).length
    buttons += (piece.buttons || []).length
    buttonholes += (piece.buttonholes || []).length
  }
  return { topstitchRows, zippers, buttons, buttonholes }
}
