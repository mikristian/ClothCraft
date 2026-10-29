import { create501JeansTemplate } from '../data/jeans501.js'
import { edgeRangeLength } from './project.js'
import { gradeProject } from './grading.js'
import { inspectJeans501WaistGradeCandidate } from './jeans501WaistGradeCandidate.js'
import { auditJeans501YokeJunctionConstraints } from './jeans501YokeJunctionAudit.js'
import { inspectManufacturingReleaseReadiness } from './manufacturingReleaseReadiness.js'

const SIZES = ['W28', 'W30', 'W32', 'W34', 'W36', 'W38']
const SIDES = ['left', 'right']
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const pieceMap = project => new Map(project.pieces.map(piece => [piece.id, piece]))
const measure = (project, side) => {
  const pieces = pieceMap(project)
  const yoke = pieces.get(`${side}-back-yoke`)
  const front = pieces.get(`${side}-front-waistband`)
  const back = pieces.get(`${side}-back-waistband`)
  return {
    yokeSeatEdgeCm: edgeRangeLength(yoke, 1),
    yokeOutseamEdgeCm: edgeRangeLength(yoke, 3),
    yokeTopEdgeCm: edgeRangeLength(yoke, 0),
    yokeTopstitchEdgeCm: edgeRangeLength(yoke, 2),
    waistbandTopstitchFrontCm: edgeRangeLength(front, 2),
    waistbandTopstitchBackCm: edgeRangeLength(back, 2),
    waistbandJoinTopCm: edgeRangeLength(front, 2) + edgeRangeLength(back, 2),
    // Pattern edge measurements, NOT verified body/finished-garment POMs.
    provisionalHalfWaistCutEdgeCm: edgeRangeLength(front, 0) + edgeRangeLength(back, 0),
  }
}

/**
 * Isolated multi-piece numerical study. Returns unapproved, reference-only
 * snapshots; never installs a new grade rule in the jeans template.
 */
export function inspectJeans501CoordinatedGradeStudy(project = create501JeansTemplate()) {
  const before = JSON.stringify(project)
  const waistband = inspectJeans501WaistGradeCandidate(project)
  const yokeAudit = auditJeans501YokeJunctionConstraints(project)
  const snapshots = {}
  const seams = []
  const adjacent = []
  const reference = new Map()
  for (const size of SIZES) {
    const snapshot = structuredClone(waistband.snapshots[size])
    const pieces = pieceMap(snapshot)
    const original = gradeProject(project, size)
    const originals = pieceMap(original)
    for (const side of SIDES) {
      const yoke = pieces.get(`${side}-back-yoke`)
      const backLeg = pieces.get(`${side}-back-leg`)
      if (!yoke || !backLeg || yoke.points.length !== 4 || backLeg.points.length !== 10)
        throw new Error('Unexpected yoke/leg topology')
      const pre = measure(snapshot, side)
      const oldCorners = [structuredClone(yoke.points[2]), structuredClone(yoke.points[3])]
      // Exact shared stations, including BOTH x and y, are required.
      if (size !== 'W32') {
        yoke.points[2] = { ...yoke.points[2], x: backLeg.points[9].x, y: backLeg.points[9].y }
        yoke.points[3] = { ...yoke.points[3], x: backLeg.points[0].x, y: backLeg.points[0].y }
      }
      const post = measure(snapshot, side)
      adjacent.push({
        size, side, before: pre, after: post,
        changesCm: Object.fromEntries(Object.keys(pre).map(key => [key, post[key] - pre[key]])),
        cornersMovedCm: [distance(oldCorners[0], yoke.points[2]), distance(oldCorners[1], yoke.points[3])],
        adjacentYokeEdges: [1, 3],
        referencedYokeTopstitchEdge: 2,
        pomVerified: false,
        status: 'PATTERNMAKER_REVIEW_REQUIRED',
      })
      if (size === 'W32' && JSON.stringify(yoke) !== JSON.stringify(originals.get(yoke.id)))
        throw new Error('Base W32 yoke unexpectedly changed')
    }
    for (const side of SIDES) for (const suffix of ['front-waist', 'back-waist', 'yoke-join']) {
      const seamId = `${side}-${suffix}`
      const ref = snapshot.seams.find(row => row.id === seamId)
      if (!ref || ref.a?.startT != null || ref.a?.endT != null ||
          ref.b?.startT != null || ref.b?.endT != null) throw new Error(`Unexpected seam reference ${seamId}`)
      const a = pieces.get(ref.a.pieceId), b = pieces.get(ref.b.pieceId)
      if (!a || !b) throw new Error(`Missing seam partner ${seamId}`)
      const lengthA = edgeRangeLength(a, ref.a.edgeIndex)
      const lengthB = edgeRangeLength(b, ref.b.edgeIndex)
      const endpointsA = [a.points[ref.a.edgeIndex], a.points[(ref.a.edgeIndex + 1) % a.points.length]]
      const endpointsB = [b.points[ref.b.edgeIndex], b.points[(ref.b.edgeIndex + 1) % b.points.length]]
      const pairing = ref.reverseB ? endpointsB : [...endpointsB].reverse()
      // Sewn waistband edges live in local per-piece coordinate space. Only
      // yoke/back-leg junctions share an authored physical coordinate station.
      const endpointGapsCm = suffix === 'yoke-join'
        ? [distance(endpointsA[0], pairing[0]), distance(endpointsA[1], pairing[1])]
        : null
      seams.push({ size, seamId, lengthAcm: lengthA, lengthBcm: lengthB,
        lengthErrorCm: Math.abs(lengthA - lengthB), endpointGapsCm,
        lengthPass: Math.abs(lengthA - lengthB) <= 0.3,
        endpointPass: endpointGapsCm === null || endpointGapsCm.every(gap => gap < 1e-8) })
    }
    if (JSON.stringify(snapshot.seams) !== JSON.stringify(project.seams))
      throw new Error('Seam references were changed')
    for (const p of snapshot.pieces) {
      if (p.id.includes('-leg') && JSON.stringify(p) !== JSON.stringify(originals.get(p.id)))
        throw new Error(`Leg was changed: ${p.id}`)
    }
    snapshot.gradeProvenance = {
      ...snapshot.gradeProvenance,
      source: 'jeans501-coordinated-grade-study',
      status: 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED',
      referenceOnly: true, approved: false, factoryCertified: false,
      reason: 'Aligned yoke endpoints alter neighboring yoke seat/outseam and topstitch geometry; all POM, factory pattern and sample approvals remain outstanding.',
    }
    snapshot.patternSource = { ...snapshot.patternSource, referenceOnly: true, developmentCandidate: true }
    snapshots[size] = snapshot
    reference.set(size, inspectManufacturingReleaseReadiness(snapshot))
  }
  if (JSON.stringify(project) !== before) throw new Error('Coordinated study mutated source')
  const lengthPasses = seams.filter(row => row.lengthPass).length
  const endpointPasses = seams.filter(row => row.endpointPass && row.endpointGapsCm).length
  return {
    schema: 'exo-jeans501-coordinated-grade-study.v1',
    status: 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED',
    approved: false, factoryCertified: false, installed: false, referenceOnly: true,
    sourcePreserved: true, sizes: [...SIZES],
    waistbandStudyStatus: waistband.status, yokeAuditSchema: yokeAudit.schema,
    seams, adjacent, snapshots,
    numerical: { checked: seams.length, lengthPasses, lengthFailures: seams.length - lengthPasses,
      yokeEndpointChecks: 12, yokeEndpointPasses: endpointPasses },
    releases: Object.fromEntries([...reference].map(([size, result]) =>
      [size, { status: result.status, blockers: result.blockers.map(issue => issue.code),
        factoryCertified: result.factoryCertified, factoryCuttingAuthorized: result.factoryCuttingAuthorized }])),
    outstanding: 'Numerical joining lengths and endpoints alone cannot establish seat/outseam transitions, topstitch offsets, verified POM, physical fit, receiver-CAD integrity or factory release.',
  }
}
