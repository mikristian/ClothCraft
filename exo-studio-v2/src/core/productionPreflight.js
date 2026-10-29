import { buildFabricMarkers } from './marker.js'
import { gradeProject } from './grading.js'
import { edgeLength, polygonArea, samplePieceBoundary, seamLengthReport } from './project.js'
import { initializeRustPreflightCrossingKernel, rustHasCrossing } from './rustPreflightCrossingKernel.js'
import {preflightCheck,preflightStatus} from './rustPreflightKernel.js'

if (typeof window !== 'undefined') void initializeRustPreflightCrossingKernel()

// Document checks, not a substitute for factory CAD import, physical samples,
// independent seam verification, or graded marker/cutter acceptance testing.
const finite = (value) => typeof value === 'number' && preflightCheck(0,value)

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function intersects(a, b, c, d) {
  const abC = orientation(a, b, c)
  const abD = orientation(a, b, d)
  const cdA = orientation(c, d, a)
  const cdB = orientation(c, d, b)
  // Collinear/touching segments are not enough evidence for a crossing.
  return abC * abD < -1e-9 && cdA * cdB < -1e-9
}

function hasCrossing(piece) {
  const points = samplePieceBoundary(piece, 6).points
  return hasCrossingSampled(points)
}

export function hasCrossingSampled(points) {
  const native=rustHasCrossing(points)
  if(native!==null)return native
  const count = points.length
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 2; j < count; j += 1) {
      if (i === 0 && j === count - 1) continue
      if (intersects(points[i], points[(i + 1) % count], points[j], points[(j + 1) % count])) return true
    }
  }
  return false
}

export function inspectProduction(project, { allSizes = true } = {}) {
  const issues = []
  const add = (severity, code, scope, message) => issues.push({ severity, code, scope, message })
  const pieces = project?.pieces || []
  const fabrics = project?.fabrics || {}
  const ids = new Set()
  const validPieces = new Set()
  if (!pieces.length) add('blocker', 'NO_PATTERNS', 'Pattern', 'There are no pattern pieces to manufacture.')

  for (const piece of pieces) {
    const scope = `Pattern · ${piece?.name || piece?.id || 'unnamed'}`
    if (!piece || typeof piece !== 'object') {
      add('blocker', 'INVALID_GEOMETRY', scope, 'Pattern is missing or malformed.')
      continue
    }
    if (!piece.id || ids.has(piece.id)) add('blocker', 'DUPLICATE_ID', scope, 'Pattern ID is missing or duplicated.')
    ids.add(piece.id)
    if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.some((point) => !point || !finite(point.x) || !finite(point.y))) {
      add('blocker', 'INVALID_GEOMETRY', scope, 'Pattern has fewer than three valid finite points.')
      continue
    }
    const cutQty = Number(piece.cutQuantity ?? 1)
    if (!preflightCheck(1,cutQty)) add('blocker', 'CUT_QUANTITY', scope, 'Cut quantity must be an integer from 1 to 99.')
    const fabricId = piece.fabricId || 'main'
    if (!fabrics[fabricId]) add('blocker', 'MISSING_FABRIC', scope, `Fabric '${fabricId}' is not present in the material library.`)
    const allowance = Number(piece.seamAllowance ?? 0)
    if (!preflightCheck(2,allowance)) add('blocker', 'SEAM_ALLOWANCE', scope, 'Invalid seam allowance.')
    const invalidEdge = piece.points.some((_, index) => preflightCheck(3,edgeLength(piece,index)))
    if (invalidEdge) add('blocker', 'ZERO_LENGTH_EDGE', scope, 'Pattern has an extremely short or invalid edge (under 0.5 mm).')
    const boundary = samplePieceBoundary(piece, 6).points
    if (preflightCheck(4,polygonArea(boundary))) add('blocker', 'ZERO_AREA', scope, 'Pattern area is too small (under 0.1 cm²).')
    if (hasCrossing(piece)) add('blocker', 'SELF_INTERSECTION', scope, 'Cut outline crosses itself. Repair the drafting topology before production.')
    for (const notch of piece.notches || []) {
      if (!preflightCheck(5,Number(notch.edgeIndex),piece.points.length) || !preflightCheck(6,Number(notch.t ?? 0.5))) {
        add('warning', 'NOTCH_INVALID', scope, 'A notch has an invalid edge or position and could be dropped by DXF export.')
      }
    }
    validPieces.add(piece.id)
  }

  for (const seam of project?.seams || []) {
    const scope = `Seam · ${seam.name || seam.id || 'unnamed'}`
    const valid = [seam.a, seam.b].every((side) => {
      const piece = pieces.find((p) => p?.id === side?.pieceId)
      return piece && validPieces.has(piece.id) && typeof side.edgeIndex==='number' && preflightCheck(5,side.edgeIndex,piece.points.length)
    })
    if (!valid) {
      add('blocker', 'BROKEN_SEAM', scope, 'Sewing references a missing pattern or edge.')
      continue
    }
    // seamLengthReport uses project-wide piece lookup; reject corrupt entries
    // before reaching it even when this seam references only healthy pieces.
    if (pieces.some((piece) => !piece || !Array.isArray(piece.points) || piece.points.some((point) => !point))) {
      add('blocker', 'BROKEN_SEAM', scope, 'Pattern inventory contains malformed geometry.')
      continue
    }
    const report = seamLengthReport(project, seam)
    if (preflightCheck(7,report.mismatchPercent,report.lengthA,report.lengthB)) {
      add('blocker', 'INVALID_SEAM_LENGTH', scope, 'Seam endpoints have invalid lengths.')
    } else if (preflightCheck(9,report.status==='good'?1:0)) {
      add('warning', 'SEAM_MISMATCH', scope, `Edge length mismatch ${report.mismatchPercent.toFixed(1)}%. Review ease, gathering and construction.`)
    }
  }

  const sizes = allSizes
    ? (project?.grading?.sizes?.length ? project.grading.sizes : [project?.grading?.baseSize || 'M'])
    : [project?.previewSize || project?.grading?.baseSize || 'M']
  if (new Set(sizes).size !== sizes.length) add('blocker', 'DUPLICATE_SIZE', 'Grading', 'Size run contains duplicate size names.')
  if (sizes.some((size) => typeof size !== 'string' || !size.trim())) add('blocker', 'INVALID_SIZE_LABEL', 'Grading', 'Size labels must be non-empty names.')
  if (project?.grading?.baseSize && !sizes.includes(project.grading.baseSize) && allSizes) add('blocker', 'INVALID_BASE_SIZE', 'Grading', 'Base size is not part of the configured size run.')
  for (const field of ['widthPerSizeCm', 'lengthPerSizeCm']) {
    const value = project?.grading?.[field]
    const limit = field === 'widthPerSizeCm' ? 12 : 8
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > limit)) {
      add('blocker', 'INVALID_GRADE_STEP', 'Grading', `${field} must be a finite number between 0 and ${limit} centimeters per size.`)
    }
  }
  for (const piece of pieces) for (const [index, point] of (piece?.points || []).entries()) {
    if (!point?.gradeRule?.enabled) continue
    const rule = point.gradeRule
    // A grade rule with nonnumeric increments may silently fall back to AUTO
    // in the numerical bridge. Warn before creating manufacturing outputs.
    for (const field of ['dxPerSize', 'dyPerSize']) {
      if (rule[field] == null || rule[field] === '' || typeof rule[field] !== 'number' || !Number.isFinite(rule[field]) || Math.abs(rule[field]) > 12) {
        add('blocker', 'INVALID_GRADE_RULE', `Grading · ${piece?.name || piece?.id || 'unnamed'} · P${index + 1}`, `${field} must be a finite numeric grading increment.`)
      }
    }
  }
  const validGeometry = !issues.some((issue) => issue.severity === 'blocker' &&
    ['NO_PATTERNS', 'INVALID_GEOMETRY', 'ZERO_LENGTH_EDGE', 'ZERO_AREA', 'SELF_INTERSECTION'].includes(issue.code))
  const markerSummary = []
  if (validGeometry) {
    for (const size of [...new Set(sizes)]) {
      try {
        const graded = gradeProject(project, size)
        const markers = buildFabricMarkers(graded, Number(project.markerSettings?.fabricWidthCm ?? 150), Number(project.markerSettings?.gapCm ?? 1.5))
        for (const [fabricId, marker] of Object.entries(markers)) {
          markerSummary.push({ size, fabricId, requested: marker.requestedPieces, placed: marker.placements.length, unplaced: marker.unusedPieces, lengthCm: marker.length, efficiency: marker.efficiency })
          if (marker.unusedPieces) add('blocker', 'MARKER_OVERFLOW', `${size} · ${fabricId}`, `${marker.unusedPieces} cut piece(s) could not fit the configured fabric width (${marker.width} cm).`)
          if (preflightCheck(8,marker.length,marker.efficiency)) add('blocker', 'INVALID_MARKER', `${size} · ${fabricId}`, 'Marker layout contains invalid dimensions.')
        }
      } catch (error) {
        add('blocker', 'MARKER_GENERATION', `Size · ${size}`, `Could not generate size marker: ${error.message}`)
      }
    }
  }
  const blockers = issues.filter((issue) => issue.severity === 'blocker').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length
  return {
    status: preflightStatus(blockers,warnings),
    blockers, warnings, issues, sizes: [...new Set(sizes)], markerSummary,
    // A structurally valid export is NEVER an independently certified factory file.
    factoryCertified: false,
  }
}
