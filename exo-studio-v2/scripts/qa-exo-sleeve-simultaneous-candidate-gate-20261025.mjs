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
import {researchSleeveSimultaneousMotion20261025} from
  '../src/core/backends/nativeSleeveSimultaneousMotionResearch20261025.js'
import {rankSleeveHingeTranslationResearch20261025 as stagedRank,
  rankSleeveSimultaneousMotionResearch20261025 as rank} from
  '../src/core/backends/nativeSleeveCoupledCandidateAdmissionResearch20261025.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'

const mock = (id, rms = 25) => {
  const max = Math.min(rms + 20, rms * 2)
  const groups = (maxGapMm, rmsGapMm) => Array.from({length: 14}, (_, i) => ({
    id: i === 0 ? 'underarm' : `seam-${i}`,
    pairCount: i < 4 ? 8 : 7, maxGapMm, rmsGapMm,
  }))
  const others = ['front', 'back', 'sleeve-left']
  const screens = () => others.map(otherPanelId => ({otherPanelId,
    coupledInterpanelIntervalClear: true, blocker: null}))
  const fold = {panelId: 'sleeve-right', angleRadians: .2,
    sewingPairCount: 102, seamGroupCount: 14, regeneratedFaceCount: 178,
    restMeshApproved: true, planarSeams: {maxGapMm: max, rmsGapMm: rms},
    seamGroupRegressions: [], sourceNonmutationVerified: true,
    samples: [0, .5, 1].map(fraction => ({fraction,
      fullPrincipalExtensionPercent: 1, fullPrincipalCompressionPercent: 1,
      staticContactValid: true})),
    interval: {coupledInterpanelIntervalClear: true},
    activePanelIntervals: screens()}
  const optimized = {panelId: 'sleeve-right', sewingPairCount: 102,
    seamGroupCount: 14, originalSeamGroupRegressions: [],
    sourceNonmutationVerified: true, selectedTranslationM: [.01, 0, 0],
    originalSeams: {maxGapMm: 100, rmsGapMm: 50},
    candidateSeams: {maxGapMm: max, rmsGapMm: rms},
    fullPrincipalExtensionPercent: 1, fullPrincipalCompressionPercent: 1,
    staticContactValid: true, activeIntervals: screens()}
  const simultaneous = {panelId: 'sleeve-right', angleRadians: .2,
    translationM: [.01, 0, 0], endpointMatchesSequential: true,
    sourceNonmutationVerified: true, simultaneousRigidPathOnly: true,
    samples: [0, .5, 1].map(fraction => ({fraction,
      maxGapMm: max, rmsGapMm: rms,
      seamGroups: groups(max, rms),
      principalExtensionPercent: 1, principalCompressionPercent: 1,
      staticContactValid: true})),
    originalSeamGroups: groups(100, 50),
    sampledSeamGapNonworse: true, sampledSeamGroupsNonworse: true,
    activePanelIntervals: screens(), interpanelMotionScreenClear: true,
    samePanelDisjointInterval: {scope: 'prescribed-rigid-sleeve-disjoint-faces-only',
      disjointIntervalClear: true, blocker: null, totalPairs: 178*177/2,
      disjointPairs: 14814, adjacentPairsNotCertified: 939,
      prunedSweptBounds: 6400, rootCheckedPairs: 8414, distanceEvaluations: 1,
      adjacentFaceSweptContactCertified: false,
      deformableCCDCertified: false, avatarContactCertified: false,
      physicalAcceptance: false, safeToAutoApply: false},
    samePanelDisjointMotionScreenClear: true, researchScreenPass: true,
    continuousDeformableCCDCertified: false,
    samePanelContinuousContactCertified: false,
    avatarEntryCertified: false, materialCalibrated: false,
    solverConstraintsRebuilt: false, physicalAcceptance: false,
    safeToAutoApply: false}
  return {id, panelId: 'sleeve-right', angleRadians: .2,
    translationM: [.01, 0, 0], illConditionedFaces: 0,
    fold, optimized, simultaneous}
}

test('new simultaneous gate rejects lower-RMS swept self-contact missed by two-stage ranking', () => {
  const unsafe = mock('lower-rms-contact', 5)
  unsafe.simultaneous.samePanelDisjointMotionScreenClear = false
  unsafe.simultaneous.samePanelDisjointInterval.disjointIntervalClear = false
  unsafe.simultaneous.samePanelDisjointInterval.blocker = {
    reason: 'sampled-contact', faceA: 4, faceB: 27, fraction: .5, distanceMm: 0}
  unsafe.simultaneous.researchScreenPass = false
  const safe = mock('higher-rms-clear', 25)
  const before = JSON.stringify([unsafe, safe])
  const result = rank([unsafe, safe])
  assert.equal(result.bestDiagnosticId, unsafe.id)
  assert.equal(result.researchScreenedCandidateId, unsafe.id)
  assert.equal(result.simultaneousScreenedCandidateId, safe.id)
  assert.equal(result.simultaneousRejectedCount, 1)
  assert.ok(result.simultaneousCandidates[0].simultaneousReasons.includes(
    'simultaneous_same_panel_disjoint_interval'))
  assert.equal(result.adjacentHingeSweptContactCertified, false)
  assert.equal(result.continuousDeformableCCDCertified, false)
  assert.equal(result.physicalAcceptance, false)
  assert.equal(result.safeToAutoApply, false)
  assert.equal(JSON.stringify([unsafe, safe]), before)
})

test('missing, sampled, unresolved and interpanel motion evidence fail closed', () => {
  const missing = mock('missing')
  delete missing.simultaneous
  assert.equal(rank([missing]).simultaneousScreenedCandidateId, null)
  const mutations = [
    [x => {x.samples[1].staticContactValid = false}, 'simultaneous_sampled_contact'],
    [x => {x.samples[1].principalExtensionPercent = 6}, 'simultaneous_principal_fabric_strain'],
    [x => {x.interpanelMotionScreenClear = false}, 'simultaneous_interpanel_motion_interval'],
    [x => {x.activePanelIntervals[0].blocker = {reason: 'unresolved-motion-bound'}},
      'simultaneous_interpanel_motion_interval'],
    [x => {x.samePanelDisjointInterval.blocker = {reason: 'work-budget'}},
      'simultaneous_same_panel_disjoint_interval'],
    [x => {x.researchScreenPass = false}, 'simultaneous_reported_veto'],
  ]
  for (const [change, reason] of mutations) {
    const c = mock(reason)
    change(c.simultaneous)
    const result = rank([c])
    assert.equal(result.simultaneousScreenedCandidateId, null)
    assert.ok(result.simultaneousCandidates[0].simultaneousReasons.includes(reason))
  }
})

test('simultaneous path cannot hide intermediate sewing-gap excursions', () => {
  for (const field of ['maxGapMm', 'rmsGapMm']) {
    const candidate = mock(`seam-excursion-${field}`)
    // Endpoints still improve both original seam measurements. Only the
    // half-way pose exceeds the independently reported original baseline.
    candidate.simultaneous.samples[1][field] =
      candidate.optimized.originalSeams[field] + 0.25
    // The admission gate independently recomputes global metrics from each
    // named group, so this synthetic excursion must carry consistent groups.
    const middle = candidate.simultaneous.samples[1]
    if (field === 'maxGapMm') {
      middle.rmsGapMm = middle.maxGapMm / Math.sqrt(7) + 0.1
      for (const group of middle.seamGroups) {
        group.maxGapMm = middle.maxGapMm
        group.rmsGapMm = middle.rmsGapMm
      }
    } else {
      middle.maxGapMm = middle.rmsGapMm + 1
      for (const group of middle.seamGroups) {
        group.rmsGapMm = middle.rmsGapMm
        group.maxGapMm = middle.maxGapMm
      }
    }
    candidate.simultaneous.sampledSeamGapNonworse = false
    candidate.simultaneous.sampledSeamGroupsNonworse = false
    const before = JSON.stringify(candidate)
    const result = rank([candidate])
    assert.equal(result.researchScreenedCandidateId, candidate.id)
    assert.equal(result.simultaneousScreenedCandidateId, null)
    assert.ok(result.simultaneousCandidates[0].simultaneousReasons.includes(
      'simultaneous_seam_gap_excursion'))
    assert.equal(JSON.stringify(candidate), before)
  }
  assert.equal(rank([mock('clear-seam-path')]).simultaneousScreenedCandidateId,
    'clear-seam-path')
})

test('per-group excursion veto catches underarm regression hidden by improving global seam metrics', () => {
  const candidate = mock('hidden-underarm-regression')
  // Keep the independently recomputable original aggregate RMS exactly 50,
  // while the underarm group starts better than the other 13 groups.
  const reference = candidate.simultaneous.originalSeamGroups
  reference[0].maxGapMm = 30
  reference[0].rmsGapMm = 15
  const otherRms = Math.sqrt((102 * 50 ** 2 - 8 * 15 ** 2) / 94)
  for (const group of reference.slice(1)) group.rmsGapMm = otherRms
  candidate.simultaneous.sampledSeamGroupsNonworse = false
  const before = JSON.stringify(candidate)
  const result = rank([candidate])
  assert.equal(result.researchScreenedCandidateId, candidate.id)
  assert.equal(result.simultaneousScreenedCandidateId, null)
  assert.ok(result.simultaneousCandidates[0].simultaneousReasons.includes(
    'simultaneous_seam_group_excursion'))
  assert.ok(!result.simultaneousCandidates[0].simultaneousReasons.includes(
    'simultaneous_seam_gap_excursion'))
  assert.equal(JSON.stringify(candidate), before)
})

test('sewing group inventory and weighted RMS must match all sampled global metrics', () => {
  const changes = [
    x => { x.originalSeamGroups.pop() },
    x => { x.originalSeamGroups[0].id = x.originalSeamGroups[1].id },
    x => { x.originalSeamGroups[0].pairCount++ },
    x => { x.originalSeamGroups[0].rmsGapMm = 80 },
    x => { x.originalSeamGroups[0].rmsGapMm = 0 },
    x => { x.samples[1].seamGroups[0].maxGapMm += 1 },
    x => { x.samples[1].seamGroups[0].rmsGapMm += 1 },
    x => { x.samples[1].seamGroups[0].id = 'forged-underarm' },
    x => { delete x.samples[1].seamGroups[0] },
  ]
  for (const change of changes) {
    const candidate = mock('bad-group-evidence')
    change(candidate.simultaneous)
    assert.throws(() => rank([candidate]), /invalid|accessor|proxy/i)
  }
})

test('contradictory producer sewing flags cannot override independently measured group evidence', () => {
  const forged = mock('false-clear-flag')
  forged.simultaneous.sampledSeamGroupsNonworse = false
  assert.throws(() => rank([forged]), /contradictory sampled sewing/i)
  const hidden = mock('false-claimed-clear')
  hidden.simultaneous.originalSeamGroups[0].maxGapMm = 30
  hidden.simultaneous.originalSeamGroups[0].rmsGapMm = 15
  const otherRms = Math.sqrt((102 * 50 ** 2 - 8 * 15 ** 2) / 94)
  for (const group of hidden.simultaneous.originalSeamGroups.slice(1))
    group.rmsGapMm = otherRms
  assert.throws(() => rank([hidden]), /contradictory sampled sewing/i)
})

test('contradictory staged clear intervals with blockers cannot pass simultaneous admission', () => {
  const cases = [
    x => { x.fold.activePanelIntervals[0].blocker = {reason: 'unresolved-fold'} },
    x => { x.fold.interval.blocker = {reason: 'unresolved-hinge'} },
    x => { x.optimized.activeIntervals[0].blocker = {reason: 'unresolved-translation'} },
  ]
  for (const [i, mutate] of cases.entries()) {
    const candidate = mock(`staged-blocker-${i}`)
    const snapshot = JSON.stringify(candidate)
    mutate(candidate)
    const afterMutation = JSON.stringify(candidate)
    assert.notEqual(afterMutation, snapshot)
    const result = rank([candidate])
    assert.equal(result.researchScreenedCandidateId, null)
    assert.equal(result.simultaneousScreenedCandidateId, null)
    assert.ok(result.simultaneousCandidates[0].simultaneousReasons.includes(
      'interpanel_motion_interval'))
    assert.equal(JSON.stringify(candidate), afterMutation)
  }
})

test('forged terminal seams, incomplete pair accounting and certification claims are rejected', () => {
  const changes = [
    x => {x.simultaneous.samples[2].rmsGapMm += 1},
    x => {x.simultaneous.samples[0].maxGapMm += 1},
    x => {x.simultaneous.samples[2].principalExtensionPercent += 1},
    x => {x.simultaneous.translationM[0] += .001},
    x => {x.simultaneous.panelId = 'sleeve-left'},
    x => {x.simultaneous.activePanelIntervals.pop()},
    x => {x.simultaneous.activePanelIntervals[1].otherPanelId = 'front'},
    x => {x.simultaneous.samePanelDisjointInterval.totalPairs -= 1},
    x => {x.simultaneous.samePanelDisjointInterval.disjointPairs -= 1},
    x => {x.simultaneous.samePanelDisjointInterval.disjointPairs = 0;
      x.simultaneous.samePanelDisjointInterval.adjacentPairsNotCertified = 178*177/2},
    x => {x.simultaneous.samePanelDisjointInterval.distanceEvaluations = -1},
    x => {x.simultaneous.samePanelDisjointInterval.rootCheckedPairs = 1},
    x => {x.simultaneous.samePanelDisjointInterval.rootCheckedPairs = -1},
    x => {x.simultaneous.samePanelDisjointInterval.rootCheckedPairs = 0},
    x => {x.simultaneous.samePanelDisjointInterval.rootCheckedPairs = 8415},
    x => {x.simultaneous.samePanelDisjointInterval.adjacentFaceSweptContactCertified = true},
    x => {x.simultaneous.continuousDeformableCCDCertified = true},
    x => {x.simultaneous.physicalAcceptance = true},
    x => {x.fold.regeneratedFaceCount = 999},
    x => {x.fold.restMeshApproved = false},
    x => {x.simultaneous.samples[0].fraction = .1},
    x => {x.simultaneous.samples[1].principalCompressionPercent = NaN},
  ]
  for (const change of changes) {
    const c = mock('candidate')
    change(c)
    assert.throws(() => rank([c]), /invalid simultaneous sleeve research evidence/i)
  }
})

test('clear root-pair census is exhaustive while blocked reports may stop early', () => {
  const broadphaseClear = mock('all-root-pairs-pruned')
  const clearSweep = broadphaseClear.simultaneous.samePanelDisjointInterval
  clearSweep.prunedSweptBounds = clearSweep.disjointPairs
  clearSweep.rootCheckedPairs = 0
  clearSweep.distanceEvaluations = 0
  assert.equal(rank([broadphaseClear]).simultaneousScreenedCandidateId,
    'all-root-pairs-pruned')

  const forgedClear = mock('missing-root-pair')
  forgedClear.simultaneous.samePanelDisjointInterval.rootCheckedPairs--
  assert.throws(() => rank([forgedClear]), /invalid simultaneous sleeve research evidence/i)

  const blocked = mock('partial-but-blocked')
  const blockedSweep = blocked.simultaneous.samePanelDisjointInterval
  blockedSweep.rootCheckedPairs = 1
  blockedSweep.disjointIntervalClear = false
  blockedSweep.blocker = {reason: 'sampled-contact', faceA: 2, faceB: 5}
  blocked.simultaneous.samePanelDisjointMotionScreenClear = false
  blocked.simultaneous.researchScreenPass = false
  assert.equal(rank([blocked]).simultaneousScreenedCandidateId, null)
})

test('accessor and Proxy evidence is rejected without invoking traps', () => {
  const getter = mock('getter')
  let called = 0
  Object.defineProperty(getter.simultaneous, 'researchScreenPass', {
    get() { called++; return true }, enumerable: true,
  })
  assert.throws(() => rank([getter]), /accessor|proxy/i)
  assert.equal(called, 0)
  const proxy = mock('proxy')
  proxy.simultaneous = new Proxy(proxy.simultaneous, {
    get(target, key, receiver) { called++; return Reflect.get(target, key, receiver) },
  })
  assert.throws(() => rank([proxy]), /accessor|proxy/i)
  assert.equal(called, 0)
  const vector = mock('vector-proxy')
  vector.simultaneous.translationM = new Proxy(vector.simultaneous.translationM, {
    get(target, key, receiver) { called++; return Reflect.get(target, key, receiver) },
  })
  assert.throws(() => rank([vector]), /accessor|proxy/i)
  assert.equal(called, 0)
})

test('sparse motion vectors cannot bypass finite-coordinate validation', () => {
  for (const field of ['translationM', 'selectedTranslationM', 'motionTranslationM']) {
    const candidate = mock(`sparse-${field}`)
    if (field === 'translationM') delete candidate.translationM[1]
    if (field === 'selectedTranslationM') delete candidate.optimized.selectedTranslationM[1]
    if (field === 'motionTranslationM') delete candidate.simultaneous.translationM[1]
    const snapshot = JSON.stringify(candidate)
    assert.throws(() => rank([candidate]), /invalid|accessor|proxy/i)
    assert.equal(JSON.stringify(candidate), snapshot)
  }
  const allSparse = mock('sparse-all-vectors')
  delete allSparse.translationM[1]
  delete allSparse.optimized.selectedTranslationM[1]
  delete allSparse.simultaneous.translationM[1]
  assert.throws(() => rank([allSparse]), /invalid|accessor|proxy/i)
  assert.throws(() => stagedRank([allSparse]), /invalid|duplicated/i)
  const hole = mock('sparse-middle-sample')
  delete hole.simultaneous.samples[1]
  assert.throws(() => rank([hole]), /invalid|accessor|proxy/i)
})

test('actual Foundation Tee simultaneous fold+translation remains rejected without mutation', () => {
  const start = performance.now()
  const source = buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality: 'quality'})
  const mesh = researchFoundationTeeSleeveQualityContact20261025(source,
    'sleeve-right')
  const fold = studyFoundationTeeDevelopableSleeveHingeResearch20261025(
    source, 'sleeve-right', mesh, {angleRadians: .2})
  const optimized = researchFoldedSleeveSeamMerit20261025(
    source, fold.foldedPayload, 'sleeve-right')
  const simultaneous = researchSleeveSimultaneousMotion20261025(
    source, fold, optimized)
  const snapshots = [source, mesh, fold, optimized, simultaneous].map(JSON.stringify)
  const entry = {id: 'real-right-hinge-translation', panelId: 'sleeve-right',
    angleRadians: .2, translationM: optimized.selectedTranslationM,
    illConditionedFaces: mesh.afterQuality.illConditionedFaces,
    fold, optimized, simultaneous}
  const result = rank([entry])
  assert.equal(simultaneous.sampledSeamGapNonworse, false)
  assert.equal(simultaneous.sampledSeamGroupsNonworse, false)
  const seams = measureNativeSeamResiduals(optimized.candidatePayload)
  const originalSeams = measureNativeSeamResiduals(source)
  const strain = auditNativePrincipalStrain(optimized.candidatePayload)
  assert.ok(Math.abs(seams.maxGapMm - result.simultaneousCandidates[0].maxGapMm) < 1e-8)
  assert.ok(Math.abs(seams.rmsGapMm - result.simultaneousCandidates[0].rmsGapMm) < 1e-8)
  assert.ok(Math.abs(strain.maximumPrincipalExtensionPercent -
    result.simultaneousCandidates[0].principalExtensionPercent) < 1e-8)
  for (const [reported, measured] of [
    [simultaneous.originalSeamGroups, originalSeams.groups],
    [simultaneous.samples[2].seamGroups, seams.groups],
  ]) {
    assert.equal(reported.length, 14)
    const byId = new Map(measured.map(group => [group.id, group]))
    for (const group of reported) {
      const truth = byId.get(group.id)
      assert.ok(truth)
      assert.equal(group.pairCount, truth.pairCount)
      assert.ok(Math.abs(group.maxGapMm - truth.maxGapMm) < 1e-8)
      assert.ok(Math.abs(group.rmsGapMm - truth.rmsGapMm) < 1e-8)
    }
  }
  assert.equal(result.simultaneousScreenedCandidateId, null)
  assert.equal(result.researchScreenedCandidateId, null)
  assert.ok(result.simultaneousCandidates[0].simultaneousReasons.includes(
    'simultaneous_same_panel_disjoint_interval'))
  assert.equal(simultaneous.samePanelDisjointInterval.disjointIntervalClear, false)
  assert.ok(simultaneous.samePanelDisjointInterval.prunedSweptBounds +
    simultaneous.samePanelDisjointInterval.rootCheckedPairs <=
    simultaneous.samePanelDisjointInterval.disjointPairs)
  assert.equal(simultaneous.samples.some(s => !s.staticContactValid), true)
  assert.deepEqual([source, mesh, fold, optimized, simultaneous].map(JSON.stringify), snapshots)
  console.log('SIMULTANEOUS_ADMISSION '+JSON.stringify({
    runtimeMs: +(performance.now()-start).toFixed(2),
    original: optimized.originalSeams, candidate: optimized.candidateSeams,
    extensionPercent: strain.maximumPrincipalExtensionPercent,
    compressionPercent: strain.maximumPrincipalCompressionPercent,
    contact: {staticValid: optimized.staticContactValid,
      intra: optimized.intrapanelIntersections,
      inter: optimized.interpanelNearClearancePairs,
      simultaneousDisjointClear: simultaneous.samePanelDisjointMotionScreenClear},
    reasons: result.simultaneousCandidates[0].simultaneousReasons,
    physicalAcceptance: result.physicalAcceptance, sourceNonmutationVerified: true}))
})
