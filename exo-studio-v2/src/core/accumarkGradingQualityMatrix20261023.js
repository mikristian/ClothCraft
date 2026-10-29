import { gradeProject, DEFAULT_SIZES } from './grading.js'
import { edgeLength, edgeRangeLength, samplePieceBoundary } from './project.js'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const validIds = ids => ids.every(nonempty) && new Set(ids).size === ids.length
const BOUNDARY_SEGMENTS = 32
const MAX_PIECES = 256
const MAX_SIZES = 64
const MAX_POINTS = 4096

function outline(piece) {
  const points = piece?.points
  if (!Array.isArray(points) || points.length < 3 || points.length > MAX_POINTS ||
      points.some(point => !finite(point?.x) || !finite(point?.y))) throw Error('Invalid stitchline vertices')
  if (piece.curves != null && (typeof piece.curves !== 'object' || Array.isArray(piece.curves) ||
      Object.entries(piece.curves).some(([key, curve]) =>
        !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= points.length ||
        !finite(curve?.cx) || !finite(curve?.cy)))) throw Error('Invalid stitchline control')
  const path = samplePieceBoundary(piece, BOUNDARY_SEGMENTS).points
  if (path.length < 3 || path.some(point => !finite(point?.x) || !finite(point?.y))) throw Error('Invalid sampled stitchline')
  let signedTwiceArea = 0
  for (let i = 0; i < path.length; i++) {
    const current = path[i], next = path[(i + 1) % path.length]
    signedTwiceArea += current.x * next.y - next.x * current.y
  }
  const perimeterCm = points.reduce((sum, _, i) => sum + edgeLength(piece, i), 0)
  const areaCm = Math.abs(signedTwiceArea) / 2
  const xs = path.map(point => point.x), ys = path.map(point => point.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const widthCm = maxX - minX, heightCm = maxY - minY
  if (![perimeterCm, areaCm, widthCm, heightCm].every(finite) ||
      perimeterCm <= 0 || areaCm <= 1e-10 || widthCm <= 0 || heightCm <= 0 ||
      points.some((_, i) => !finite(edgeLength(piece, i)) || edgeLength(piece, i) <= 1e-10))
    throw Error('Collapsed or nonfinite stitchline')
  return {
    widthCm, heightCm, perimeterCm, areaCm, pointCount: points.length,
    curveCount: Object.keys(piece.curves || {}).length,
    bounds: {minX, maxX, minY, maxY},
  }
}

function seamSide(side, lookup) {
  const piece = lookup.get(side?.pieceId)
  if (!piece || !Number.isInteger(side?.edgeIndex) || side.edgeIndex < 0 ||
      side.edgeIndex >= piece.points.length) throw Error('Seam references missing piece or edge')
  const startT = side.startT ?? 0, endT = side.endT ?? 1
  if (!finite(startT) || !finite(endT) || startT < 0 || endT > 1 || startT >= endT)
    throw Error('Seam has invalid partial interval')
  const length = edgeRangeLength(piece, side.edgeIndex, startT, endT)
  if (!finite(length) || length <= 0) throw Error('Seam interval has invalid length')
  return length
}

/**
 * Diagnostic read of the graded 2D stitchline for every requested block/size.
 * All measurements are in cm (area in square cm); passing diagnostics do not
 * authorize manufacturing. An incomplete run always has ok:false.
 */
export function inspectAccuMarkGradingQualityMatrix(project, {
  pieceIds, sizeRun, maxSeamMismatchCm = 0.3,
} = {}) {
  const issues = [], blocks = [], seamPairs = []
  const add = (code, message, details = {}) =>
    issues.push({code, severity: 'blocker', message, ...details})
  const baseSize = project?.grading?.baseSize || 'M'
  const configuredSizes = project?.grading?.sizes ?? DEFAULT_SIZES
  const sizes = sizeRun === undefined ? configuredSizes : sizeRun
  const result = () => ({
    ok: issues.length === 0, baseSize,
    sizes: Array.isArray(sizes) ? [...sizes] : [],
    blocks, seamPairs, issues, manufacturingApproved: false,
  })
  if (!Array.isArray(project?.pieces) || !project.pieces.length ||
      project.pieces.length > MAX_PIECES) add('INVALID_PROJECT', 'Expected 1–256 pattern blocks')
  if (!Array.isArray(configuredSizes) || !configuredSizes.length || configuredSizes.length > MAX_SIZES ||
      !validIds(configuredSizes) || !configuredSizes.includes(baseSize))
    add('INVALID_CONFIGURED_SIZES', 'Configured size run must be unique and contain its base size')
  if (!Array.isArray(sizes) || !sizes.length || sizes.length > MAX_SIZES ||
      !validIds(sizes) || !sizes.includes(baseSize) ||
      (Array.isArray(configuredSizes) && sizes.some(size => !configuredSizes.includes(size))))
    add('INVALID_SIZE_RUN', 'Requested size run must be unique, configured, and include the base size')
  if (!finite(maxSeamMismatchCm) || maxSeamMismatchCm < 0)
    add('INVALID_TOLERANCE', 'Seam mismatch tolerance must be finite and nonnegative')
  if (project?.seams != null && !Array.isArray(project.seams))
    add('INVALID_SEAMS', 'Seams must be an array')
  if (Array.isArray(project?.pieces) && !validIds(project.pieces.map(piece => piece?.id)))
    add('DUPLICATE_PIECE_ID', 'Every pattern block needs a unique nonempty ID')
  if (Array.isArray(project?.seams) && !validIds(project.seams.map(seam => seam?.id)))
    add('DUPLICATE_SEAM_ID', 'Every seam needs a unique nonempty ID')
  if (pieceIds !== undefined && (!Array.isArray(pieceIds) || !pieceIds.length ||
      pieceIds.length > MAX_PIECES || !validIds(pieceIds) ||
      pieceIds.some(id => !project?.pieces?.some(piece => piece?.id === id))))
    add('INVALID_PIECE_SELECTION', 'Selected block IDs must be unique and exist in the project')
  if (issues.length) return result()

  const selected = pieceIds === undefined ? project.pieces.map(piece => piece.id) : [...pieceIds]
  const selectedSet = new Set(selected)
  // A seam belonging to a selected block cannot be diagnosed using a
  // synthesized or omitted counterpart. Grade all authored source pieces.
  const seams = (project.seams || []).filter(seam =>
    selectedSet.has(seam?.a?.pieceId) || selectedSet.has(seam?.b?.pieceId))
  const rowsByPiece = new Map(selected.map(id => [id, []]))
  const seamRows = new Map(seams.map(seam => [seam.id, []]))
  const boundsByPiece = new Map(selected.map(id => [id, {}]))

  for (const size of sizes) {
    let graded
    try { graded = gradeProject(project, size) }
    catch (error) {
      add('GRADING_FAILED', `Could not grade ${size}: ${error.message}`, {size})
      continue
    }
    const ids = graded?.pieces?.map(piece => piece?.id)
    const sourceIds = project.pieces.map(piece => piece.id)
    if (!Array.isArray(ids) || !validIds(ids) ||
        ids.length !== sourceIds.length || ids.some((id, i) => id !== sourceIds[i])) {
      add('GRADED_PIECE_IDS', 'Grading changed pattern block identities or order', {size})
      continue
    }
    const lookup = new Map(graded.pieces.map(piece => [piece.id, piece]))
    for (const pieceId of selected) {
      const piece = lookup.get(pieceId)
      const authored = project.pieces.find(item => item.id === pieceId)
      if (piece?.points?.length !== authored?.points?.length ||
          piece?.points?.some((point, i) => point?.id != null && authored.points[i]?.id != null &&
            point.id !== authored.points[i].id)) {
        add('GRADED_TOPOLOGY', 'Grading changed point count or point identities', {size, pieceId})
        continue
      }
      try {
        const {bounds, ...metrics} = outline(piece)
        rowsByPiece.get(pieceId).push({size, ...metrics})
        boundsByPiece.get(pieceId)[size] = bounds
      } catch (error) {
        add('INVALID_GRADED_GEOMETRY', error.message, {size, pieceId})
      }
    }
    for (const seam of seams) {
      try {
        const lenACm = seamSide(seam.a, lookup)
        const lenBCm = seamSide(seam.b, lookup)
        const deltaCm = Math.abs(lenACm - lenBCm)
        const pass = deltaCm <= maxSeamMismatchCm
        seamRows.get(seam.id).push({size, lenACm, lenBCm, deltaCm, pass})
        if (!pass) add('SEAM_MISMATCH',
          `Seam ${seam.id} differs by ${deltaCm.toFixed(3)} cm in ${size}`,
          {size, seamId: seam.id})
      } catch (error) {
        add('INCOMPLETE_SEAM', `Seam ${seam.id}: ${error.message}`, {size, seamId: seam.id})
      }
    }
  }
  for (const pieceId of selected) {
    const authored = project.pieces.find(piece => piece.id === pieceId)
    const rows = rowsByPiece.get(pieceId)
    if (rows.length !== sizes.length)
      add('INCOMPLETE_BLOCK_SIZE_RUN', 'Block is missing one or more graded size measurements', {pieceId})
    blocks.push({pieceId, name: authored?.name || pieceId, rows, bounds: boundsByPiece.get(pieceId)})
  }
  for (const seam of seams) {
    const rows = seamRows.get(seam.id)
    if (rows.length !== sizes.length)
      add('INCOMPLETE_SEAM_SIZE_RUN', 'Seam is missing one or more graded size checks', {seamId: seam.id})
    seamPairs.push({seamId: seam.id, rows})
  }
  return result()
}
