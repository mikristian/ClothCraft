import { polygonArea, seamAllowanceBoundary } from './project.js'
import { rustMarkerPlacements, rustMarkerRotatePoint, rustMarkerNormalizedRotation } from './rustMarkerKernel.js'
import {inspectMarkerManufacturingConstraints20261028} from './markerManufacturingConstraints20261028.js'

function rotatePoint(point, rotationDeg) {
  return rustMarkerRotatePoint(point,rotationDeg)
}

function normalizedRotation(value) {
  return rustMarkerNormalizedRotation(value)
}

function pieceBounds(piece, rotationDeg = 0) {
  const sampled = seamAllowanceBoundary(piece, 10).map((point) => rotatePoint(point, rotationDeg))
  const xs = sampled.map((point) => point.x)
  const ys = sampled.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    sampled,
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function orientations(piece, fabricWidth) {
  // Fabric length is the marker Y axis. Rotate the pattern by the negative of
  // its grainline angle so that the production grainline runs with fabric
  // length. A 90-degree option is only legal when cross-grain is explicitly
  // enabled on that pattern.
  const baseRotation = normalizedRotation(-Number(piece.grainAngleDeg || 0))
  const rotations = [baseRotation]
  if (piece.marker?.allowCrossGrain) rotations.push(normalizedRotation(baseRotation + 90))

  const seen = new Set()
  return rotations
    .map((rotationDeg, index) => {
      const key = Math.round(normalizedRotation(rotationDeg) * 1000) / 1000
      if (seen.has(key)) return null
      seen.add(key)
      const box = pieceBounds(piece, rotationDeg)
      return {
        rotationDeg: normalizedRotation(rotationDeg),
        rotated: index > 0,
        crossGrain: index > 0,
        width: box.width,
        height: box.height,
        box,
      }
    })
    .filter(Boolean)
}

function outlineForPlacement(option, x, y) {
  const { box } = option
  return box.sampled.map((point) => ({
    x: x + point.x - box.minX,
    y: y + point.y - box.minY,
  }))
}

function overlaps(a, b, gap) {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  )
}

function candidatePositions(placements, gap) {
  const xs = new Set([0])
  const ys = new Set([0])
  for (const placement of placements) {
    xs.add(placement.x + placement.width + gap)
    ys.add(placement.y + placement.height + gap)
  }
  return {
    xs: [...xs].sort((a, b) => a - b),
    ys: [...ys].sort((a, b) => a - b),
  }
}

function bestPlacement(entry, placements, fabricWidth, gap) {
  const candidates = candidatePositions(placements, gap)
  let best = null
  const existingLength = placements.length
    ? Math.max(...placements.map((placement) => placement.y + placement.height))
    : 0

  for (const option of entry.options) {
    for (const y of candidates.ys) {
      for (const x of candidates.xs) {
        if (x + option.width > fabricWidth + 1e-6) continue
        const rectangle = { x, y, width: option.width, height: option.height }
        if (placements.some((placement) => overlaps(rectangle, placement, gap))) continue
        const resultingLength = Math.max(existingLength, y + option.height)
        const rightWaste = fabricWidth - (x + option.width)
        const score = resultingLength * 1_000_000 + y * 10_000 + rightWaste * 10 + x
        if (!best || score < best.score) best = { x, y, option, score }
      }
    }
  }
  return best
}

export function buildMarker(project, fabricWidth = 150, gap = 1.5, options = {}) {
  // A preview must never silently change a factory order or accept an
  // impossible roll width. Keep the preview separate from cut authorization.
  if (!Number.isFinite(fabricWidth) || fabricWidth <= 0 || fabricWidth > 1000)
    throw Error('INVALID_FABRIC_WIDTH')
  if (!Number.isFinite(gap) || gap < 0 || gap > 50)
    throw Error('INVALID_MARKER_SPACING')
  if (!project || !Array.isArray(project.pieces)) throw Error('INVALID_MARKER_PIECES')
  const fabricId = options?.fabricId ?? null
  if (options?.strictProductionDemand) {
    const fabricIds=fabricId?[fabricId]:[...new Set(project.pieces.map(p=>p.fabricId||'main'))]
    const issues=fabricIds.flatMap(id=>inspectMarkerManufacturingConstraints20261028(project,{fabricId:id,nap:options.nap===true,
      repeatRegistrationValidatedElsewhere:options.repeatRegistrationValidatedElsewhere===true}))
    if(issues.length)throw Error(`MARKER_CONSTRAINT_REFUSED:${issues.map(i=>i.code).join(',')}`)
  }
  const entries = []
  for (const piece of project.pieces || []) {
    const pieceFabricId = piece.fabricId || 'main'
    if (fabricId && pieceFabricId !== fabricId) continue
    if (options?.strictProductionDemand && (!Number.isSafeInteger(piece.cutQuantity) || piece.cutQuantity < 1 || piece.cutQuantity > 99))
      throw Error(`MISSING_OR_INVALID_CUT_QUANTITY:${piece.id || 'unknown'}`)
    const allowedOrientations = orientations(piece, fabricWidth)
    if (!allowedOrientations.length) continue
    const quantity = options?.strictProductionDemand ? piece.cutQuantity : Math.max(1, Math.min(99, Math.round(Number(piece.cutQuantity || 1))))
    for (let instance = 0; instance < quantity; instance += 1) {
      entries.push({
        piece,
        instance,
        area: polygonArea(seamAllowanceBoundary(piece, 12)),
        options: allowedOrientations,
      })
    }
  }

  entries.sort((a, b) => {
    const areaDifference = b.area - a.area
    if (Math.abs(areaDifference) > 1e-6) return areaDifference
    const aLongest = Math.max(...a.options.map((option) => Math.max(option.width, option.height)))
    const bLongest = Math.max(...b.options.map((option) => Math.max(option.width, option.height)))
    return bLongest - aLongest
  })

  const placements = []
  let unusedPieces = 0
  const unplaced = []
  const rustPlacements = rustMarkerPlacements(entries, fabricWidth, gap)
  for (const [index, entry] of entries.entries()) {
    const best = rustPlacements ? rustPlacements[index] : bestPlacement(entry, placements, fabricWidth, gap)
    if (!best) {
      unusedPieces += 1
      const minimumWidth = entry.options.length ? Math.min(...entry.options.map((option) => option.width)) : null
      unplaced.push({
        pieceId: entry.piece.id,
        instance: entry.instance,
        name: entry.piece.name,
        minimumWidthCm: Number.isFinite(minimumWidth) ? minimumWidth : null,
        reason: Number.isFinite(minimumWidth) && minimumWidth > fabricWidth ? 'too-wide' : 'no-space',
      })
      continue
    }
    const { option, x, y } = best
    placements.push({
      pieceId: entry.piece.id,
      instance: entry.instance,
      name: entry.piece.name,
      x,
      y,
      width: option.width,
      height: option.height,
      rotationDeg: option.rotationDeg,
      rotated: option.rotated,
      crossGrain: option.crossGrain,
      area: entry.area,
      outline: outlineForPlacement(option, x, y),
    })
  }

  const length = placements.length ? Math.max(...placements.map((placement) => placement.y + placement.height)) : 0
  const placedArea = placements.reduce((sum, placement) => sum + placement.area, 0)
  const markerArea = fabricWidth * Math.max(length, 0.001)
  return {
    fabricId,
    width: fabricWidth,
    length,
    gap,
    placements,
    efficiency: markerArea > 0 ? placedArea / markerArea : 0,
    unusedPieces,
    requestedPieces: entries.length,
    unplaced,
  }
}

export function buildFabricMarkers(project, defaultFabricWidth = 150, gap = 1.5) {
  const fabricIds = [...new Set((project.pieces || []).map((piece) => piece.fabricId || 'main'))]
  const widthOverrides = project.markerSettings?.fabricWidthsCm || {}
  return Object.fromEntries(fabricIds.map((fabricId) => {
    const width = widthOverrides[fabricId] ?? defaultFabricWidth
    return [fabricId, buildMarker(project, width, gap, { fabricId })]
  }))
}
