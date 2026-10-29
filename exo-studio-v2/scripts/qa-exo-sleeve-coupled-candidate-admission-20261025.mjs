import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeSleeveQualityContact20261025} from
  '../src/core/backends/nativeSleeveCreaseQualityContactResearch20261025.js'
import {studyFoundationTeeDevelopableSleeveHingeResearch20261025} from
  '../src/core/backends/nativeSleeveDevelopableHingeCandidateResearch20261025.js'
import {researchFoldedSleeveSeamMerit20261025} from
  '../src/core/backends/nativeSleeveFoldedSeamMeritResearch20261025.js'
import {rankSleeveHingeTranslationResearch20261025 as rank} from
  '../src/core/backends/nativeSleeveCoupledCandidateAdmissionResearch20261025.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'

const safe = (id, rms = 25) => ({
  id, panelId: 'sleeve-right', angleRadians: .2, translationM: [.01, 0, 0],
  illConditionedFaces: 0,
  fold: {panelId: 'sleeve-right', sewingPairCount: 102, seamGroupCount: 14,
    seamGroupRegressions: [], sourceNonmutationVerified: true,
    angleRadians: .2,
    samples: [0, .5, 1].map(fraction => ({fraction, fullPrincipalExtensionPercent: 1,
      fullPrincipalCompressionPercent: 1, staticContactValid: true})),
    interval: {coupledInterpanelIntervalClear: true},
    activePanelIntervals: ['front', 'back', 'sleeve-left'].map(otherPanelId =>
      ({otherPanelId, coupledInterpanelIntervalClear: true}))},
  optimized: {panelId: 'sleeve-right', sewingPairCount: 102, seamGroupCount: 14,
    originalSeamGroupRegressions: [], sourceNonmutationVerified: true,
    selectedTranslationM: [.01, 0, 0],
    originalSeams: {maxGapMm: 100, rmsGapMm: 50},
    candidateSeams: {maxGapMm: rms + 20, rmsGapMm: rms},
    fullPrincipalExtensionPercent: 1, fullPrincipalCompressionPercent: 1,
    staticContactValid: true,
    activeIntervals: ['front', 'back', 'sleeve-left'].map(otherPanelId =>
      ({otherPanelId, coupledInterpanelIntervalClear: true}))},
})

test('contact-aware rank refuses a lower-RMS colliding candidate', () => {
  const unsafe = safe('lower-rms-but-colliding', 5)
  unsafe.optimized.staticContactValid = false
  const admissible = safe('higher-rms-clear', 25)
  const result = rank([unsafe, admissible])
  assert.equal(result.bestDiagnosticId, unsafe.id)
  assert.equal(result.researchScreenedCandidateId, admissible.id)
  assert.deepEqual(result.candidates[0].reasons, ['static_contact'])
  assert.equal(result.physicalAcceptance, false)
  assert.equal(result.safeToAutoApply, false)
  assert.equal(result.simultaneousCoupledPathCertified, false)
  assert.equal(result.continuousSamePanelCCDCertified, false)
})

test('every individual unsafe condition vetoes an otherwise low-error pose', () => {
  const mutations = [
    [c => { c.illConditionedFaces = 1 }, 'ill_conditioned_rest_mesh'],
    [c => { c.fold.seamGroupRegressions.push({name: 'side'}) },
      'seam_regression_against_original'],
    [c => { c.optimized.candidateSeams.maxGapMm = 120 },
      'seam_regression_against_original'],
    [c => { c.fold.samples[1].fullPrincipalCompressionPercent = 6 },
      'principal_fabric_strain'],
    [c => { c.optimized.fullPrincipalExtensionPercent = 6 },
      'principal_fabric_strain'],
    [c => { c.fold.samples[0].staticContactValid = false }, 'static_contact'],
    [c => { c.fold.interval = {} }, 'interpanel_motion_interval'],
    [c => { c.fold.activePanelIntervals[1].coupledInterpanelIntervalClear = false },
      'interpanel_motion_interval'],
    [c => { c.optimized.activeIntervals[2].coupledInterpanelIntervalClear = undefined },
      'interpanel_motion_interval'],
  ]
  for (const [mutate, expected] of mutations) {
    const c = safe('candidate')
    mutate(c)
    const result = rank([c])
    assert.equal(result.researchScreenedCandidateId, null)
    assert.ok(result.candidates[0].reasons.includes(expected))
  }
})

test('malformed, duplicated and oversized grids fail closed', () => {
  assert.throws(() => rank([]), /invalid/i)
  assert.throws(() => rank([safe('same'), safe('same')]), /invalid|duplicated/i)
  assert.throws(() => rank(Array.from({length: 7}, (_, i) => safe('c' + i))), /invalid/i)
  assert.throws(() => rank([safe('a')], {principalStrainCapPercent: NaN}), /invalid/i)
  for (const mutate of [
    c => { c.translationM = [Infinity, 0, 0] },
    c => { c.optimized.candidateSeams.rmsGapMm = NaN },
    c => { c.fold.samples = [] },
    c => { c.optimized.sourceNonmutationVerified = false },
    c => { c.optimized.activeIntervals = [] },
    c => { c.fold.sewingPairCount = 101 },
    c => { c.fold.angleRadians = -.2 },
    c => { c.optimized.selectedTranslationM = [.02, 0, 0] },
    c => { c.fold.samples[1].fraction = .75 },
    c => { c.fold.activePanelIntervals[1].otherPanelId = 'front' },
    c => { c.optimized.activeIntervals[2].otherPanelId = 'front' },
  ]) {
    const c = safe('candidate')
    mutate(c)
    assert.throws(() => rank([c]), /invalid/i)
  }
})

test('real Foundation Tee opposite-angle right sleeve grid is rejected with independent numeric oracles', () => {
  const started = performance.now()
  const source = buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality: 'quality'})
  const original = JSON.stringify(source)
  const mesh = researchFoundationTeeSleeveQualityContact20261025(source,
    'sleeve-right')
  const meshOriginal = JSON.stringify(mesh)
  const grid = []
  for (const angleRadians of [-.2, .2]) {
    const fold = studyFoundationTeeDevelopableSleeveHingeResearch20261025(
      source, 'sleeve-right', mesh, {angleRadians})
    const foldedBefore = JSON.stringify(fold.foldedPayload)
    const optimized = researchFoldedSleeveSeamMerit20261025(
      source, fold.foldedPayload, 'sleeve-right')
    const independentSeam = measureNativeSeamResiduals(optimized.candidatePayload)
    const independentStrain = auditNativePrincipalStrain(optimized.candidatePayload)
    assert.ok(Math.abs(independentSeam.maxGapMm - optimized.candidateSeams.maxGapMm) < 1e-8)
    assert.ok(Math.abs(independentSeam.rmsGapMm - optimized.candidateSeams.rmsGapMm) < 1e-8)
    assert.ok(Math.abs(independentStrain.maximumPrincipalExtensionPercent -
      optimized.fullPrincipalExtensionPercent) < 1e-8)
    assert.equal(JSON.stringify(fold.foldedPayload), foldedBefore)
    grid.push({id: angleRadians < 0 ? 'right-negative' : 'right-positive',
      panelId: 'sleeve-right', angleRadians,
      translationM: optimized.selectedTranslationM, fold, optimized,
      illConditionedFaces: mesh.afterQuality.illConditionedFaces})
  }
  const result = rank(grid)
  assert.equal(result.candidateCount, 2)
  assert.equal(result.researchScreenedCandidateId, null)
  assert.equal(result.rejectedCount, 2)
  assert.ok(result.candidates.every(c => c.reasons.includes('ill_conditioned_rest_mesh')))
  assert.ok(result.candidates.every(c => c.principalExtensionPercent > 1000))
  assert.equal(JSON.stringify(source), original)
  assert.equal(JSON.stringify(mesh), meshOriginal)
  console.log('COUPLED_RESEARCH_GRID ' + JSON.stringify({
    runtimeMs: +(performance.now() - started).toFixed(2),
    candidates: result.candidates, bestDiagnosticId: result.bestDiagnosticId,
    physicalAcceptance: result.physicalAcceptance,
    simultaneousCoupledPathCertified: result.simultaneousCoupledPathCertified,
    sourceNonmutationVerified: true,
  }))
})
