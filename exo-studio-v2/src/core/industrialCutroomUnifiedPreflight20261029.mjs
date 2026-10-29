// Opt-in, fail-closed digital preflight. This is CUT inspection, never CUT authorization.
// Policies and equipment dimensions are declarations, not authenticated factory evidence.
import {inspectIndustrialMarkerRollDefectPlan20261028} from './industrialMarkerRollDefectPlan20261028.mjs'
import {inspectIndustrialMarkerPlyStackClearance20261029} from './industrialMarkerPlyStackClearance20261029.mjs'
import {inspectIndustrialMarkerCarriageEnvelope20261029} from './industrialMarkerCarriageEnvelope20261029.mjs'
import {fingerprintIndustrialMarkerSource20261029} from './industrialMarkerSourceFreshness20261029.mjs'
import {fingerprintIndustrialMarkerStudy20261029} from './industrialMarkerSourceFreshness20261029.mjs'
import {inspectIndustrialMarkerCutWorkflow20261028, getLocallyVerifiedIndustrialMarkerStudyDigest20261029} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialManualMarkerStudy20261029, getLocallyVerifiedIndustrialManualMarkerStudyDigest20261029} from './industrialManualMarkerStudy20261029.mjs'

const own = (x, key) => x && typeof x === 'object' && !Array.isArray(x) &&
  Object.hasOwn(x, key)
const rowKey = row => JSON.stringify([row.size, row.fabricId])
const block = (code, detail = code, stage = null) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}], stage, rows: [],
  allSizeDigitalPreflightInspected: false, physicalRollVerified: false,
  calibratedEquipmentVerified: false, independentReceivingCadVerified: false,
  cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
})

/**
 * A pass requires the SAME marker/lay/shade plan to satisfy roll-defect,
 * spreading, ply-stack and carriage inspectors, with one row per size/fabric
 * and consistent table/roll assignments. Each stage is independently invoked
 * with identical input object references. No release token is produced.
 */
export function inspectIndustrialCutroomUnifiedPreflight20261029(
  project, markerStudy, layPolicy, shadePolicy,
  {rollPlanById, spreadingPolicy, stackPolicy, carriagePolicy} = {},
) {
  try {
    const currentSourceSha256 = fingerprintIndustrialMarkerSource20261029(project)
    if (!currentSourceSha256 || markerStudy?.sourceProjectSha256 !== currentSourceSha256)
      return block('STALE_OR_UNBOUND_MARKER_SOURCE_GEOMETRY')
    // Reconstruct the exact deterministic graded CUT/marker study from current
    // source and recorded effective builder options. A copied source fingerprint
    // on altered placements, metrics, or cutter geometry must never pass.
    const options = markerStudy?.markerBuildOptions
    if (!own(options, 'version') ||
        Object.keys(options).sort().join(',') !==
          ['version','fabricWidthCm','spacingCm','maxLengthCm','maxCandidates',
            'constrainedLayout','usesSuppliedDxf','usesCutterProfile'].sort().join(',') ||
        options.version !== 1 || options.usesSuppliedDxf !== false ||
        options.usesCutterProfile !== false)
      return block('MARKER_CONTENT_OR_OPTIONS_UNBOUND',
        'Missing/version-drifted marker builder or externally supplied CAD/cutter profile')
    if (!fingerprintIndustrialMarkerStudy20261029(options))
      return block('MARKER_CONTENT_OR_OPTIONS_UNBOUND', 'Invalid marker builder options')
    const hasManualJournal = Object.hasOwn(markerStudy, 'manualMarkerEditsV1')
    let expectedDigest = hasManualJournal
      ? getLocallyVerifiedIndustrialManualMarkerStudyDigest20261029(
        currentSourceSha256, options, markerStudy.manualMarkerEditsV1)
      : getLocallyVerifiedIndustrialMarkerStudyDigest20261029(currentSourceSha256, options)
    if (!expectedDigest) {
      const regenerated = hasManualJournal
        ? inspectIndustrialManualMarkerStudy20261029(
          project, markerStudy.manualMarkerEditsV1, options)
        : inspectIndustrialMarkerCutWorkflow20261028(project, {
          fabricWidthCm: options.fabricWidthCm,
          spacingCm: options.spacingCm,
          maxLengthCm: options.maxLengthCm,
          maxCandidates: options.maxCandidates,
          constrainedLayout: options.constrainedLayout,
        })
      expectedDigest = regenerated?.ok
        ? fingerprintIndustrialMarkerStudy20261029(regenerated) : null
    }
    if (!expectedDigest || expectedDigest !== fingerprintIndustrialMarkerStudy20261029(markerStudy))
      return block('MARKER_CONTENT_OR_OPTIONS_UNBOUND',
        'Marker geometry, quantity, layout options, or cut study differs from the current source')
    for (const [key, value] of Object.entries({
      rollPlanById, spreadingPolicy, stackPolicy, carriagePolicy,
    })) {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return block('MISSING_PREFLIGHT_POLICY', key)
    }
    const stages = [
      ['rollDefects', () => inspectIndustrialMarkerRollDefectPlan20261028(
        project, markerStudy, layPolicy, shadePolicy, {rollPlanById})],
      ['plyStack', () => inspectIndustrialMarkerPlyStackClearance20261029(
        project, markerStudy, layPolicy, shadePolicy, spreadingPolicy, stackPolicy)],
      ['carriage', () => inspectIndustrialMarkerCarriageEnvelope20261029(
        project, markerStudy, layPolicy, shadePolicy, spreadingPolicy, carriagePolicy)],
    ]
    const results = {}
    for (const [stage, inspect] of stages) {
      const result = inspect()
      if (!result?.ok) return block('PREFLIGHT_STAGE_BLOCKED', result?.issues ?? 'NO_RESULT', stage)
      results[stage] = result
    }
    const stackRows = results.plyStack.rows
    const carriageRows = results.carriage.rows
    const sizes = project?.grading?.sizes
    const pieces = project?.pieces
    if (!Array.isArray(sizes) || !Array.isArray(pieces) || !sizes.length || !pieces.length)
      return block('PREFLIGHT_PROJECT_INVENTORY_MISSING')
    const fabrics = [...new Set(pieces.map(piece => piece.fabricId || 'main'))]
    const expectedKeys = new Set(sizes.flatMap(size =>
      fabrics.map(fabricId => JSON.stringify([size, fabricId]))))
    if (expectedKeys.size !== sizes.length * fabrics.length)
      return block('PREFLIGHT_PROJECT_INVENTORY_INVALID')
    const expected = new Map()
    for (const row of stackRows) {
      const key = rowKey(row)
      if (!expectedKeys.has(key) || expected.has(key))
        return block('DUPLICATE_OR_UNKNOWN_PREFLIGHT_ROW', key)
      expected.set(key, row)
    }
    if (expected.size !== expectedKeys.size || expected.size !== carriageRows.length ||
        expected.size !== markerStudy?.rows?.length ||
        results.plyStack.sizeCount !== sizes.length ||
        results.carriage.sizeCount !== sizes.length ||
        results.plyStack.fabricCount !== fabrics.length ||
        results.carriage.fabricCount !== fabrics.length)
      return block('PREFLIGHT_ROW_COVERAGE_MISMATCH')
    const rows = []
    for (const carriage of carriageRows) {
      const key = rowKey(carriage)
      const stack = expected.get(key)
      const lay = layPolicy?.laysBySize?.[carriage.size]?.[carriage.fabricId]
      if (!stack || !lay || stack.tableId !== carriage.tableId ||
          stack.rollId !== lay.rollId || stack.plies !== lay.plies ||
          !Number.isFinite(carriage.requiredLayLengthCm) ||
          !Number.isFinite(carriage.requiredTravelCm) ||
          !Number.isFinite(stack.requiredClearanceMm))
        return block('PREFLIGHT_ROW_ASSIGNMENT_MISMATCH', key)
      const markerRow = markerStudy.rows.find(row => row.size === carriage.size &&
        row.fabricId === carriage.fabricId)
      const expectedLength = markerRow?.marker?.metrics?.length * lay.markerRepeats +
        lay.endLossCmPerPly
      if (!Number.isFinite(expectedLength) ||
          Math.abs(carriage.requiredLayLengthCm - expectedLength) >
            8 * Number.EPSILON * Math.max(1, Math.abs(expectedLength)))
        return block('PREFLIGHT_LAY_LENGTH_DRIFT', key)
      rows.push({size: carriage.size, fabricId: carriage.fabricId,
        rollId: stack.rollId, tableId: stack.tableId, plies: stack.plies,
        requiredLayLengthCm: carriage.requiredLayLengthCm,
        requiredTravelCm: carriage.requiredTravelCm,
        requiredWidthCm: carriage.requiredWidthCm,
        requiredStackClearanceMm: stack.requiredClearanceMm})
      expected.delete(key)
    }
    if (expected.size) return block('PREFLIGHT_ROW_COVERAGE_MISMATCH')
    const usedRolls = new Set(rows.map(row => row.rollId))
    if (usedRolls.size !== results.rollDefects.rolls.length ||
        results.rollDefects.rolls.some(roll => !usedRolls.has(roll.rollId)))
      return block('PREFLIGHT_ROLL_COVERAGE_MISMATCH')
    if (!own(results.rollDefects, 'rollDefectPlanInspected') ||
        results.rollDefects.rollDefectPlanInspected !== true ||
        results.plyStack.plyStackInspected !== true ||
        results.carriage.carriageEnvelopeInspected !== true)
      return block('PREFLIGHT_INSPECTOR_PROOF_MISSING')
    return {ok: true, status: 'LOCAL_ALL_SIZE_CUTROOM_PREFLIGHT_INSPECTED',
      issues: [], rows, sizeCount: results.carriage.sizeCount,
      fabricCount: results.carriage.fabricCount,
      rollCount: results.rollDefects.rolls.length,
      allSizeDigitalPreflightInspected: true, physicalRollVerified: false,
      markerSourceRevisionMatched: true, markerStudySourceDerivedMatch: true,
      manualMarkerJournalInspected: hasManualJournal,
      sourceProjectSha256: currentSourceSha256,
      calibratedEquipmentVerified: false, independentReceivingCadVerified: false,
      cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
      limitations: 'All roll defects, fabric thickness, shade lots, table and carriage ' +
        'limits are caller-declared digital inputs. The marker source fingerprint detects ' +
        'local source edits; placement/settings match a locally source-generated witness (cached or rebuilt), not an independent signature or tamper-proof receipt. No independently authenticated ' +
        'receiving CAD, physical machine/roll measurements, cutter qualification ' +
        'or sewn-sample sign-off. CUT inspection is not cutting authorization.',
    }
  } catch (error) {
    return block('PREFLIGHT_INSPECTION_REFUSED', String(error?.message || error))
  }
}
