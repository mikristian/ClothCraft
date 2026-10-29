import { gradeProject } from './grading.js'
import { edgeRangeLength, samplePieceBoundary } from './project.js'
import { measureProject } from './measurements.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'

// Independent document-level manufacturing checks. Passing is not factory approval.
const finite = (n) => typeof n === 'number' && Number.isFinite(n)
const pointValid = (p) => p && finite(p.x) && finite(p.y)
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

function onSegment(a, b, p, epsilon) {
  return Math.abs(cross(a, b, p)) <= epsilon &&
    p.x >= Math.min(a.x, b.x) - epsilon && p.x <= Math.max(a.x, b.x) + epsilon &&
    p.y >= Math.min(a.y, b.y) - epsilon && p.y <= Math.max(a.y, b.y) + epsilon
}

function segmentsMeet(a, b, c, d, epsilon) {
  const o1 = cross(a, b, c), o2 = cross(a, b, d)
  const o3 = cross(c, d, a), o4 = cross(c, d, b)
  if (((o1 > epsilon && o2 < -epsilon) || (o1 < -epsilon && o2 > epsilon)) &&
      ((o3 > epsilon && o4 < -epsilon) || (o3 < -epsilon && o4 > epsilon))) return true
  return onSegment(a, b, c, epsilon) || onSegment(a, b, d, epsilon) ||
    onSegment(c, d, a, epsilon) || onSegment(c, d, b, epsilon)
}

function polygonSignedArea(points) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length]
    return sum + p.x * q.y - q.x * p.y
  }, 0) / 2
}

function checkOutline(piece, add, scope, epsilon) {
  if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.some((p) => !pointValid(p))) {
    add('INVALID_OUTLINE', scope, 'At least three finite stitchline vertices are required.')
    return false
  }
  const count = piece.points.length
  if (piece.curves && (typeof piece.curves !== 'object' || Array.isArray(piece.curves) ||
    Object.entries(piece.curves).some(([edge, c]) => !/^(0|[1-9]\d*)$/.test(edge) || Number(edge) >= count || !finite(c?.cx) || !finite(c?.cy)))) {
    add('INVALID_CURVE', scope, 'Curve controls must be finite and reference an existing edge.')
    return false
  }
  const sampled = samplePieceBoundary(piece, 16).points
  if (sampled.length < 3 || sampled.some((p) => !pointValid(p))) {
    add('INVALID_BOUNDARY', scope, 'Sampled stitchline contains non-finite coordinates.')
    return false
  }
  if (piece.points.some((p, i) => dist(p, piece.points[(i + 1) % count]) <= epsilon)) {
    add('COLLAPSED_EDGE', scope, 'A stitchline edge collapses to a point.')
    return false
  }
  const perimeter = sampled.reduce((sum, p, i) => sum + dist(p, sampled[(i + 1) % sampled.length]), 0)
  if (!finite(perimeter) || Math.abs(polygonSignedArea(sampled)) <= epsilon * epsilon) {
    add('COLLAPSED_OUTLINE', scope, 'A graded stitchline has negligible or invalid area.')
    return false
  }
  // Avoid false positives from collinear consecutive samples along a curved edge.
  const segments = []
  for (let i = 0; i < sampled.length; i++) {
    const a = sampled[i], b = sampled[(i + 1) % sampled.length]
    if (dist(a, b) > epsilon) segments.push({ a, b, index: i })
  }
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const left = segments[i], right = segments[j]
    const neighbor = (left.index + 1) % sampled.length === right.index ||
      (right.index + 1) % sampled.length === left.index
    if (!neighbor && segmentsMeet(left.a, left.b, right.a, right.b, epsilon * epsilon)) {
      add('SELF_INTERSECTION', scope, 'A stitchline crosses or touches itself away from adjacent edges.')
      return false
    }
  }
  return true
}

function validateSide(side, lookup) {
  const piece = lookup.get(side?.pieceId)
  if (!piece || !Number.isInteger(side.edgeIndex) || side.edgeIndex < 0 || side.edgeIndex >= piece.points.length) return null
  const start = side.startT ?? 0, end = side.endT ?? 1
  if (!finite(start) || !finite(end) || start < 0 || end > 1 || start >= end) return null
  return { piece, edgeIndex: side.edgeIndex, start, end }
}

/** Check complete graded pattern size run without modifying the project.
 * `pomTargets` is optional: `{ [size]: [{id, cm, toleranceCm}] }`.
 * Without approved targets, we check consistent IDs and numeric tolerances only.
 */
export function inspectIndustrialPatterns(project, {
  sizes = project?.grading?.sizes?.length ? project.grading.sizes : [project?.grading?.baseSize || 'M'],
  seamToleranceCm = 0.3,
  seamTolerancePercent = 2,
  geometricEpsilonCm = 0.0001,
  pomTargets = null,
} = {}) {
  const issues = [], seamReports = [], pomReports = [], sizeReports = []
  const add = (code, scope, message) => issues.push({ severity: 'blocker', code, scope, message })
  const validSizes = Array.isArray(sizes) && sizes.length > 0 &&
    sizes.every((s) => typeof s === 'string' && s.trim()) && new Set(sizes).size === sizes.length
  const validOptions = [seamToleranceCm, seamTolerancePercent, geometricEpsilonCm].every(finite) &&
    seamToleranceCm >= 0 && seamTolerancePercent >= 0 && geometricEpsilonCm > 0
  if (!validOptions) add('INVALID_QA_OPTIONS', 'QA', 'QA tolerances must be finite and non-negative; geometry epsilon must be positive.')
  if (!validSizes) add('INVALID_SIZE_RUN', 'Grading', 'Size run requires unique, non-empty size labels.')
  if (!Array.isArray(project?.pieces) || !project.pieces.length) add('NO_PATTERN_PIECES', 'Pattern', 'Pattern piece list must be non-empty.')
  if (project?.seams != null && !Array.isArray(project.seams)) add('INVALID_SEAMS', 'Seams', 'Seam list must be an array.')
  if (project?.customMeasurements != null && !Array.isArray(project.customMeasurements)) add('INVALID_POM', 'POM', 'Custom measurement list must be an array.')
  if (pomTargets != null && (typeof pomTargets !== 'object' || Array.isArray(pomTargets))) add('INVALID_POM_TARGETS', 'POM', 'POM targets must map size labels to rows.')
  if (issues.length) return result()

  const baseIds = project.pieces.map((p) => p?.id)
  if (baseIds.some((id) => typeof id !== 'string' || !id.trim()) || new Set(baseIds).size !== baseIds.length)
    add('INVALID_PIECE_IDS', 'Pattern', 'Piece IDs must be unique, non-empty strings.')
  for (const m of project.customMeasurements || []) {
    if (typeof m?.id !== 'string' || !m.id.trim() || !pointValid(m.a) || !pointValid(m.b) ||
      !finite(m.toleranceCm ?? 0.5) || (m.toleranceCm ?? 0.5) < 0 ||
      (m.pieceId && !baseIds.includes(m.pieceId)))
      add('INVALID_POM', `POM · ${m?.id || 'unnamed'}`, 'Measurement needs an ID, finite endpoints, valid piece reference and non-negative numeric tolerance.')
  }
  for (const [index, piece] of project.pieces.entries()) {
    if (!piece || !Array.isArray(piece.points) || piece.points.length < 3 ||
      piece.points.some((p) => !pointValid(p)))
      add('INVALID_BASE_GEOMETRY', `Pattern · ${piece?.id || index}`, 'Base piece must contain three or more finite vertices.')
  }
  const customIds = project.customMeasurements?.map((m) => m.id) || []
  if (new Set(customIds).size !== customIds.length) add('DUPLICATE_POM', 'POM', 'Custom POM IDs must be unique.')
  if (issues.length) return result()

  let referencePomIds = null
  const baseWinding = new Map()
  for (const size of sizes) {
    let graded
    try { graded = gradeProject(project, size) } catch (error) {
      add('GRADE_FAILURE', `Size · ${size}`, `Grading failed: ${error.message}`)
      continue
    }
    if (!Array.isArray(graded.pieces) || graded.pieces.length !== baseIds.length ||
      graded.pieces.some((p, i) => p?.id !== baseIds[i])) {
      add('GRADE_PIECE_CONTINUITY', `Size · ${size}`, 'Grading changed pattern IDs, order or piece count.')
      continue
    }
    const lookup = new Map(graded.pieces.map((p) => [p.id, p]))
    const baseLookup = new Map(project.pieces.map((p) => [p.id, p]))
    let passedPieces = 0
    for (const piece of graded.pieces) {
      const scope = `Size · ${size} · ${piece.id}`
      const base = baseLookup.get(piece.id)
      if (piece.points?.length !== base.points?.length ||
        piece.points?.some((p, i) => p.id != null && base.points[i]?.id != null && p.id !== base.points[i].id)) {
        add('GRADE_VERTEX_CONTINUITY', scope, 'Grading changed stitchline vertex count or preserved vertex IDs.')
        continue
      }
      if (!checkOutline(piece, add, scope, geometricEpsilonCm)) continue
      const winding = Math.sign(polygonSignedArea(samplePieceBoundary(piece, 16).points))
      const baseWindingSign = Math.sign(polygonSignedArea(samplePieceBoundary(base, 16).points))
      if (winding !== baseWindingSign) {
        add('GRADE_WINDING_FLIP', scope, 'Grading reversed the base pattern winding.')
        continue
      }
      if (baseWinding.has(piece.id) && winding !== baseWinding.get(piece.id)) {
        add('GRADE_WINDING_FLIP', scope, 'Grading reversed stitchline winding across sizes.')
        continue
      }
      baseWinding.set(piece.id, winding)
      passedPieces++
    }
    sizeReports.push({ size, checkedPieces: graded.pieces.length, passingPieces: passedPieces })
    for (const seam of project.seams || []) {
      const scope = `Size · ${size} · seam ${seam?.id || seam?.name || 'unnamed'}`
      const a = validateSide(seam?.a, lookup), b = validateSide(seam?.b, lookup)
      if (!a || !b) { add('BROKEN_SEAM', scope, 'Seam references invalid piece, edge or normalized parameter range.'); continue }
      const lengthA = edgeRangeLength(a.piece, a.edgeIndex, a.start, a.end)
      const lengthB = edgeRangeLength(b.piece, b.edgeIndex, b.start, b.end)
      if (!finite(lengthA) || !finite(lengthB) || lengthA <= geometricEpsilonCm || lengthB <= geometricEpsilonCm) {
        add('INVALID_SEAM_LENGTH', scope, 'Seam length is zero or non-finite.')
        continue
      }
      const differenceCm = Math.abs(lengthA - lengthB)
      const mismatchPercent = 200 * differenceCm / (lengthA + lengthB)
      const pass = differenceCm <= seamToleranceCm || mismatchPercent <= seamTolerancePercent
      seamReports.push({ size, seamId: seam.id ?? null, lengthA, lengthB, differenceCm, mismatchPercent, pass })
      if (!pass) add('SEAM_LENGTH_MISMATCH', scope, `Sewing interval mismatch ${differenceCm.toFixed(3)} cm (${mismatchPercent.toFixed(2)}%).`)
    }
    try {
      const rows = measureProject(graded)
      const ids = rows.map((row) => row.id)
      if (ids.some((id) => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length)
        add('POM_ID_COLLISION', `Size · ${size}`, 'Point-of-measurement IDs are missing or duplicated.')
      const idKey = JSON.stringify(ids)
      if (referencePomIds !== null && referencePomIds !== idKey)
        add('POM_ROW_CONTINUITY', `Size · ${size}`, 'Grading changed POM row identity or order.')
      referencePomIds ??= idKey
      const targets = pomTargets?.[size]
      if (pomTargets != null && !Array.isArray(targets)) add('MISSING_POM_TARGETS', `Size · ${size}`, 'Approved POM targets are required for every size.')
      const targetMap = new Map(Array.isArray(targets) ? targets.map((item) => [item?.id, item]) : [])
      if (Array.isArray(targets) && (targetMap.size !== targets.length || targets.some((target) => !ids.includes(target?.id)) || ids.some((id) => !targetMap.has(id))))
        add('POM_TARGET_CONTINUITY', `Size · ${size}`, 'Approved POM targets require exactly one matching row per measured ID.')
      for (const row of rows) {
        const scope = `Size · ${size} · POM ${row.id}`
        if (!finite(row.cm) || row.cm < 0 || !finite(row.toleranceCm) || row.toleranceCm < 0)
          add('INVALID_POM_VALUE', scope, 'POM value or tolerance is non-finite or negative.')
        const target = targetMap.get(row.id)
        if (target) {
          if (!finite(target.cm) || target.cm < 0 || !finite(target.toleranceCm) || target.toleranceCm < 0) {
            add('INVALID_POM_TARGET', scope, 'Approved target and tolerance must be non-negative finite centimeters.')
            continue
          }
          const deltaCm = Math.abs(row.cm - target.cm)
          const pass = deltaCm <= target.toleranceCm + 1e-9
          pomReports.push({ size, id: row.id, measuredCm: row.cm, targetCm: target.cm, deltaCm, toleranceCm: target.toleranceCm, pass })
          if (!pass) add('POM_OUT_OF_TOLERANCE', scope, `POM differs from approved target by ${deltaCm.toFixed(2)} cm.`)
        }
      }
    } catch (error) {
      add('POM_MEASUREMENT_FAILURE', `Size · ${size}`, `Measurement failed: ${error.message}`)
    }
  }
  // Notches are physical sewn-edge references, not decorative vertices.
  // Validate the authored pair groups on every graded size as an independent
  // manufacturing construction constraint. No easing approval is inferred.
  const notchCheck=inspectGradedNotchPairs(project,{sizes})
  issues.push(...notchCheck.issues)
  return result()

  function result() {
    return { status: issues.length ? 'blocked' : 'pass', blockers: issues.length, issues,
      sizes: validSizes ? [...sizes] : [], sizeReports, seamReports, pomReports,
      factoryCertified: false, approvedPomTargetsChecked: pomTargets != null }
  }
}
