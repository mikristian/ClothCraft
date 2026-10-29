import { gradeProject } from './grading.js'
import { inspectIndustrialPatterns } from './industrialPatternQA.js'
import { inspectGradedCutlines } from './industrialCutlineQA.js'
import { studyCloSmallSizeGrades } from './cloSmallSizeGradeStudy.js'

const SIZES = Object.freeze(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
const APPROVAL = 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED'

/** Diagnostic only: a crossing at a sampled edge cannot safely be assigned a
 * replacement vertex without an approved pattern/grade rule and sewn sample.
 * In particular, displacing the crossing can change seam lengths and marks.
 */
export function studyCloSmallSizeCrossingRepair(canonicalProject, { sizes = SIZES } = {}) {
  if (canonicalProject?.canonicalizationProvenance?.status !== APPROVAL ||
      !canonicalProject.canonicalizationProvenance.indexMaps) {
    throw new Error('Crossing repair study requires an opt-in canonicalized CLO reference and original index maps')
  }
  const maps = canonicalProject.canonicalizationProvenance.indexMaps
  const original = structuredClone(canonicalProject)
  const diagnostics = studyCloSmallSizeGrades(canonicalProject, { sizes })
  const results = diagnostics.results.map(result => {
    const graded = gradeProject(canonicalProject, result.size)
    const industrial = inspectIndustrialPatterns(canonicalProject, { sizes: [result.size] })
    const cutStitch = inspectGradedCutlines(canonicalProject, { sizes: [result.size] })
    const intersections = result.pieces.flatMap(piece => piece.intersections.map(hit => {
      const map = maps[piece.pieceId]
      if (!map) throw new Error(`Missing source-index map for crossing ${piece.pieceId}`)
      const sourceIndex = edge => {
        if (!Number.isInteger(edge) || edge < 0 || edge >= map.canonicalToOriginal.length) {
          throw new Error(`Invalid edge index ${edge} in ${piece.pieceId}`)
        }
        return map.canonicalToOriginal[edge]
      }
      return { pieceId: piece.pieceId, contour: piece.contour,
        sampledSegments: [hit.segmentA, hit.segmentB],
        canonicalEdges: [hit.sourceEdgeA, hit.sourceEdgeB],
        originalStartVertexIndices: [sourceIndex(hit.sourceEdgeA), sourceIndex(hit.sourceEdgeB)],
        originalCollapsedEdgeIndices: [...map.collapsedOriginalEdgeIndices],
        point: hit.location, type: hit.type }
    }))
    return { size: result.size, status: result.status, blockers: result.blockers,
      industrial: { status: industrial.status, blockers: industrial.blockers },
      cutStitch: { status: cutStitch.status, blockers: cutStitch.blockers },
      marksAndSeams: {
        seams: graded.seams?.length ?? 0,
        customMeasurements: graded.customMeasurements?.length ?? 0,
        fasteners: graded.fasteners?.length ?? 0,
        pieceMarkCounts: graded.pieces.map(piece => ({ pieceId: piece.id,
          notches: piece.notches?.length ?? 0,
          internalLines: piece.internalLines?.length ?? 0 })) },
      intersections }
  })
  if (JSON.stringify(original) !== JSON.stringify(canonicalProject)) {
    throw new Error('Study mutated the caller project')
  }
  return { approval: APPROVAL, factoryCertified: false,
    candidate: { accepted: false, geometryChanged: false,
      reason: 'No authored XS/S grade increments, seam-ease specification or patternmaker-approved vertex displacement exists. Any geometric correction would be speculative.' },
    manufacturingExportAllowed: false, baseSizePreserved: true,
    results }
}
