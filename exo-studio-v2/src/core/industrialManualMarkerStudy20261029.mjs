// Source-derived, journaled manual marker inspection for the bounded 2D/CAM
// cutroom workflow. No persistent issuer, machine instructions or CUT approval.
// The journal contains operator intent, NOT a trusted placement digest.
import {gradeProject} from './grading.js'
import {adjustAccuMarkManualMarker20261024} from './accumarkManualMarker20261024.js'
import {inspectNestedManufacturingMarks20261028} from './industrialNestedMarks20261028.mjs'
import {buildAccuMarkCutterPathStudy20261024} from './accumarkCutterPathStudy20261024.js'
import {inspectIndustrialMarkerCutWorkflow20261028} from './industrialMarkerCutWorkflow20261028.mjs'
import {
  fingerprintIndustrialMarkerSource20261029 as sourceFingerprint,
  fingerprintIndustrialMarkerStudy20261029 as digest,
} from './industrialMarkerSourceFreshness20261029.mjs'

const verifiedManualStudies = new Map()
const fail = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], rows: [],
  cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
})
const names = ['size', 'fabricId', 'pieceId', 'instance', 'x', 'y', 'rotationDeg']
const own = (o, k) => Object.hasOwn(o, k)
const keyFor = (sourceSha, options, edits) => digest({sourceSha, options, edits})

export function getLocallyVerifiedIndustrialManualMarkerStudyDigest20261029(sourceSha, options, edits) {
  const key = keyFor(sourceSha, options, edits)
  return key ? verifiedManualStudies.get(key) ?? null : null
}

/** Rebuild the authoritative auto marker and independently replay each edit.
 * The marker editor cannot simply attach a current source SHA to forged CUT.
 * Manual reposition is intentionally limited to plain, nonfold, nondefect,
 * nonregistered material until independent specialty validators exist.
 */
export function inspectIndustrialManualMarkerStudy20261029(project, edits, builderOptions = {}) {
  try {
    const sha = sourceFingerprint(project)
    if (!sha) return fail('MANUAL_SOURCE_INVALID')
    if (!Array.isArray(edits) || edits.length < 1 || edits.length > 12 ||
        !digest({edits}))
      return fail('MANUAL_EDIT_JOURNAL_INVALID')
    const sizeSet = new Set(project.grading.sizes)
    const fabrics = new Set(project.pieces.map(p => p.fabricId || 'main'))
    for (const e of edits) {
      if (!e || typeof e !== 'object' || Array.isArray(e) ||
          Object.keys(e).length !== names.length ||
          !names.every(k => own(e, k)) ||
          !sizeSet.has(e.size) || !fabrics.has(e.fabricId) ||
          typeof e.pieceId !== 'string' || !e.pieceId ||
          !Number.isSafeInteger(e.instance) || e.instance < 0 ||
          ![e.x, e.y, e.rotationDeg].every(Number.isFinite) ||
          e.x < 0 || e.y < 0 || Math.abs(e.rotationDeg) > 360)
        return fail('MANUAL_EDIT_JOURNAL_INVALID')
    }
    // Reject caller-created "signatures", external CAD and anything requiring
    // physical fold/defect verification that the existing manual editor lacks.
    if (!builderOptions || typeof builderOptions !== 'object' ||
        builderOptions.constrainedLayout !== null &&
        builderOptions.constrainedLayout !== undefined ||
        builderOptions.usesSuppliedDxf === true ||
        builderOptions.usesCutterProfile === true)
      return fail('MANUAL_SPECIALTY_LAYOUT_UNVERIFIED')
    const request = {
      fabricWidthCm: builderOptions.fabricWidthCm ?? null,
      spacingCm: builderOptions.spacingCm ?? null,
      maxLengthCm: builderOptions.maxLengthCm ?? 1000,
      maxCandidates: builderOptions.maxCandidates ?? 30000,
      constrainedLayout: null,
    }
    const base = inspectIndustrialMarkerCutWorkflow20261028(project, request)
    if (!base.ok || base.markerBuildOptions?.usesSuppliedDxf ||
        base.markerBuildOptions?.usesCutterProfile ||
        base.markerBuildOptions?.constrainedLayout !== null)
      return fail('MANUAL_BASE_MARKER_UNVERIFIED', base.issues)
    const study = structuredClone(base)
    const gradedBySize = new Map()
    for (const e of edits) {
      const row = study.rows.find(r => r.size === e.size && r.fabricId === e.fabricId)
      if (!row || !row.ok || !row.marker?.ok)
        return fail('MANUAL_EDIT_ROW_MISSING')
      if (!gradedBySize.has(e.size))
        gradedBySize.set(e.size, gradeProject(project, e.size))
      const graded = gradedBySize.get(e.size)
      const sourcePieces = graded.pieces.filter(p => (p.fabricId || 'main') === e.fabricId)
        .map(p => ({
          ...p, cutQuantity: p.cutQuantity ?? 1,
          marker: {...p.marker, nap: p.marker?.nap ?? 'one-way'},
        }))
      const validated = adjustAccuMarkManualMarker20261024(
        {...graded, pieces: sourcePieces}, row.marker,
        {...e, fabricWidthCm: row.marker.metrics.fabricWidth,
          gapCm: base.clearanceCm, maxLengthCm: base.markerBuildOptions.maxLengthCm,
          // DXF/notch transfer is generated using 12 CUT curve subdivisions.
          // Rebuild and collision-check every manual placement at that same
          // contour resolution, rather than relying on the 8-sample nest.
          curveSamples: 12},
      )
      if (!validated.ok)
        return fail('MANUAL_GEOMETRY_REJECTED', validated.code)
      const marks = inspectNestedManufacturingMarks20261028(graded, validated, {size: e.size})
      if (!marks.ok)
        return fail('MANUAL_MARK_TRANSFER_REJECTED', marks.issues)
      const cut = buildAccuMarkCutterPathStudy20261024(validated, {
        fabricWidthCm: row.marker.metrics.fabricWidth, spaceCm: base.clearanceCm,
      })
      if (!cut.ok)
        return fail('MANUAL_CUT_STUDY_REJECTED', cut.code)
      row.marker = validated
      row.markTransfer = marks
      row.cutterStudy = cut
      row.cutterQualification = null
      row.ok = true
    }
    study.manualMarkerEditsV1 = structuredClone(edits)
    // These reference flags describe the ORIGINAL auto-nest/DXF comparison,
    // not a claim that newly moved placement coordinates were present in DXF.
    study.originalAutoMarkerParity = base.referenceMarkerParity
    study.originalAutoCheckedDxfPlacements = base.checkedDxFPlacements
    study.referenceMarkerParity = false
    study.checkedDxFPlacements = 0
    study.manualSourceCutGeometryVerified = true
    study.manualEditedRowCount = new Set(edits.map(e => JSON.stringify([e.size, e.fabricId]))).size
    study.verifiedManualContourSamples = 12
    study.unchangedAutoContourSamples = 8
    study.status = 'LOCAL_MANUAL_MARKER_GEOMETRY_VERIFIED'
    study.limitations = 'Source-derived manual CUT reposition and mark transfer inspected. ' +
      'No independent edit issuer, factory roll, physical fabric, cutter or receiver approval.'
    study.machineReady = false
    study.cuttingAuthorized = false
    study.manufacturingApproved = false
    const buildDigest = digest(study)
    const k = keyFor(sha, study.markerBuildOptions, study.manualMarkerEditsV1)
    if (!k || !buildDigest) return fail('MANUAL_RESULT_NONCANONICAL')
    verifiedManualStudies.set(k, buildDigest)
    if (verifiedManualStudies.size > 64)
      verifiedManualStudies.delete(verifiedManualStudies.keys().next().value)
    return study
  } catch (error) {
    return fail('MANUAL_MARKER_INSPECTION_REFUSED', String(error?.message || error))
  }
}
