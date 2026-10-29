import { gradeProject } from './grading.js'
import { edgeRangeLength } from './project.js'
import { inspectIndustrialPatterns } from './industrialPatternQA.js'
import { inspectGradedCutlines } from './industrialCutlineQA.js'

// Experimental construction worksheet. Only the returned graded snapshots change.
// This is not an approved size rule, POM, factory pattern, or installed template.
export const JEANS501_WAIST_GRADE_STATUS = 'PROVISIONAL_UNAPPROVED'
const SIZES = ['W28', 'W30', 'W32', 'W34', 'W36', 'W38']
const SIDES = ['left', 'right']
const MATCHES = [
  ['yoke-join', 'back-leg', 9, 'back-yoke', 2],
  ['front-waist', 'front-leg', 10, 'front-waistband', 0],
  ['back-waist', 'back-yoke', 0, 'back-waistband', 0],
]
const finite = value => typeof value === 'number' && Number.isFinite(value)
const clone = value => structuredClone(value)
const discrepancy = (a, b) => Math.abs(a - b)

function references(project) {
  if (!project || !Array.isArray(project.pieces) || !Array.isArray(project.seams) ||
      JSON.stringify(project.grading?.sizes) !== JSON.stringify(SIZES) || project.grading?.baseSize !== 'W32')
    throw new Error('Unsupported 501 size run or malformed project')
  const pieces = new Map()
  for (const piece of project.pieces) {
    if (typeof piece?.id !== 'string' || pieces.has(piece.id) || !Array.isArray(piece.points) ||
        piece.points.length < 3 || piece.points.some(point => !finite(point?.x) || !finite(point?.y)))
      throw new Error('Missing, duplicated or malformed 501 piece')
    pieces.set(piece.id, piece)
  }
  const required = []
  for (const side of SIDES) for (const [label, first, firstEdge, second, secondEdge] of MATCHES) {
    const id = `${side}-${label}`
    const a = `${side}-${first}`, b = `${side}-${second}`
    const seam = project.seams.filter(item => item?.id === id)
    if (seam.length !== 1 || seam[0].a?.pieceId !== a || seam[0].a?.edgeIndex !== firstEdge ||
        seam[0].b?.pieceId !== b || seam[0].b?.edgeIndex !== secondEdge ||
        seam[0].a?.startT != null || seam[0].a?.endT != null ||
        seam[0].b?.startT != null || seam[0].b?.endT != null ||
        !pieces.has(a) || !pieces.has(b) ||
        firstEdge >= pieces.get(a).points.length || secondEdge >= pieces.get(b).points.length)
      throw new Error(`Missing or altered sewing references: ${id}`)
    required.push({ id, a, firstEdge, b, secondEdge })
  }
  // Require the actual W32 partner construction. No arbitrary source projects.
  for (const side of SIDES) {
    const yoke = pieces.get(`${side}-back-yoke`)
    const front = pieces.get(`${side}-front-waistband`)
    const back = pieces.get(`${side}-back-waistband`)
    if (yoke.points.length !== 4 || front.points.length !== 4 || back.points.length !== 4 ||
        Object.keys(yoke.curves || {}).length || Object.keys(front.curves || {}).length || Object.keys(back.curves || {}).length ||
        discrepancy(yoke.points[3].x, -1.2) > 1e-8 ||
        discrepancy(front.points[1].x - front.points[0].x, 20.3) > 1e-8 ||
        discrepancy(back.points[1].x - back.points[0].x, 21.7) > 1e-8)
      throw new Error('Unrecognized W32 source partner geometry')
  }
  const base = gradeProject(project, 'W32')
  const lookup = new Map(base.pieces.map(piece => [piece.id, piece]))
  for (const seam of required) {
    const lengthA = edgeRangeLength(lookup.get(seam.a), seam.firstEdge)
    const lengthB = edgeRangeLength(lookup.get(seam.b), seam.secondEdge)
    if (!finite(lengthA) || !finite(lengthB) || discrepancy(lengthA, lengthB) > 0.3)
      throw new Error(`Unmatched W32 reference seam: ${seam.id}`)
  }
  return required
}

// A set of pre-graded, measured size snapshots, not a synthetic approved grade rule.
// Preserve each yoke's bottom joining edge and both side/seat endpoints. Its top
// edge may be translated in x only to match the authored back-leg joining edge.
// On waistband rectangles, move the right two endpoints by the exact required
// x increment. W32 is untouched; no leg, curve, seam or metadata is altered.
function fitSnapshot(graded, requirements) {
  const pieces = new Map(graded.pieces.map(piece => [piece.id, piece]))
  const diagnostics = []
  for (const row of requirements) {
    const a = pieces.get(row.a), b = pieces.get(row.b)
    const beforeA = edgeRangeLength(a, row.firstEdge)
    const beforeB = edgeRangeLength(b, row.secondEdge)
    const record = { size: graded.previewSize, seamId: row.id, targetCm: beforeA,
      beforeCm: beforeB, afterCm: beforeB, errorCm: discrepancy(beforeA, beforeB),
      applied: false, disposition: 'BLOCKED' }
    if (!finite(beforeA) || !finite(beforeB) || beforeA <= 0 || beforeB <= 0) {
      record.reason = 'Nonfinite or collapsed seam'
      diagnostics.push(record)
      continue
    }
    if (graded.previewSize === 'W32') {
      record.disposition = record.errorCm <= 0.3 ? 'BASE_SOURCE_RETAINED' : 'BLOCKED'
      diagnostics.push(record)
      continue
    }
    if (row.id.endsWith('yoke-join')) {
      // Edge 2 is bottom-right to bottom-left. Move the right endpoint in x,
      // leaving the yoke bottom-left, and the center/outside vertical stations.
      const start = b.points[2], end = b.points[3]
      if (Math.abs(start.y - end.y) > 1e-8 || beforeA <= 1) {
        record.reason = 'Unsupported slanted joining edge'
      } else {
        const delta = beforeA - (start.x - end.x)
        if (Math.abs(delta) <= 4 && start.x + delta > end.x + 1) {
          // Endpoint 2 is also part of the yoke right/seat edge: changing it
          // would alter another real junction. Keep this case blocked.
          record.reason = 'Joining-edge endpoint is shared with seat edge; no approved independent trim'
        } else record.reason = 'Unsupported yoke displacement'
      }
    } else {
      const base = b.points
      const dx = beforeA - beforeB
      if (Math.abs(dx) > 4 || base.length !== 4 || Math.abs(base[0].y - base[1].y) > 1e-8 ||
          Math.abs(base[2].y - base[3].y) > 1e-8 ||
          base[1].x + dx <= base[0].x + 1 || base[2].x + dx <= base[3].x + 1) {
        record.reason = 'Constrained waistband candidate exceeds geometry bounds'
      } else {
        b.points[1].x += dx
        b.points[2].x += dx
        record.afterCm = edgeRangeLength(b, row.secondEdge)
        record.errorCm = discrepancy(beforeA, record.afterCm)
        record.applied = record.errorCm < 1e-8
        record.disposition = record.applied ? 'PROVISIONAL_UNAPPROVED' : 'BLOCKED'
      }
    }
    diagnostics.push(record)
  }
  return diagnostics
}

export function inspectJeans501WaistGradeCandidate(project, { sizes = SIZES } = {}) {
  const sourceBefore = JSON.stringify(project)
  const required = references(project)
  if (!Array.isArray(sizes) || !sizes.length || sizes.some(size => !SIZES.includes(size)) ||
      new Set(sizes).size !== sizes.length) throw new Error('Invalid 501 candidate sizes')
  const originalIndustrial = inspectIndustrialPatterns(project, { sizes })
  const originalCutlines = inspectGradedCutlines(project, { sizes })
  const snapshots = {}, rows = []
  for (const size of sizes) {
    const graded = gradeProject(project, size)
    rows.push(...fitSnapshot(graded, required))
    // The graded coordinates are a study snapshot, while the inherited size
    // run still describes source W32 grading rules. Mark both restrictions on
    // the saved project itself so downstream export gates retain the warning.
    graded.gradeProvenance = {
      status: 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED',
      source: 'jeans501-waist-yoke-grade-candidate',
      sourceProjectId: project.id,
      sourceTemplateId: project.templateId,
      snapshotSize: size,
      approved: false,
      factoryCertified: false,
      referenceOnly: true,
      reason: 'Snapshot contains provisional fitted waistband coordinates and inherited multi-size source grade rules; requires independent patternmaker and factory approval.',
    }
    graded.patternSource = {
      ...(graded.patternSource || {}),
      referenceOnly: true,
      sourceProjectId: project.id,
      sourceTemplateId: project.templateId,
      developmentCandidate: true,
    }
    snapshots[size] = graded
  }
  if (JSON.stringify(project) !== sourceBefore) throw new Error('Candidate mutated source project')
  // Grade-project QA expects base project plus rules, while this opt-in fixture
  // intentionally stores concrete sizes. Validate each clone as a W32-only run.
  const checks = Object.fromEntries(sizes.map(size => {
    const snapshot = clone(snapshots[size])
    snapshot.grading = { ...clone(project.grading), sizes: [size], baseSize: size }
    for (const piece of snapshot.pieces) {
      piece.points = piece.points.map(point => {
        const clean = clone(point)
        delete clean.industrialGradeRule
        clean.gradeRule = { enabled: true, dxPerSize: 0, dyPerSize: 0 }
        return clean
      })
    }
    const industrial = inspectIndustrialPatterns(snapshot, { sizes: [size] })
    const cutlines = inspectGradedCutlines(snapshot, { sizes: [size] })
    return [size, { industrial, cutlines }]
  }))
  const failed = rows.filter(row => row.disposition === 'BLOCKED')
  const qaBlockers = Object.values(checks).reduce((total, item) => total + item.industrial.blockers + item.cutlines.blockers, 0)
  return { schema: 'exo-jeans501-waist-grade-candidate.v1', status: failed.length || qaBlockers ? 'BLOCKED' : 'PROVISIONAL_UNAPPROVED',
    approved: false, factoryCertified: false, installed: false, sizes: [...sizes],
    sourcePreserved: true, originalIndustrial, originalCutlines, rows, snapshots, checks,
    remainingSeamBlockers: failed.length, qaBlockers,
    note: 'No construction ease, POM, manufacturing authorization or physical-sample approval inferred.' }
}
