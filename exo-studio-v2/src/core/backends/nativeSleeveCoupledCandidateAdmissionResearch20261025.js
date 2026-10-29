// Research-only, fail-closed admission for a bounded hinge -> translation grid.
// Each stage has its own conservative inter-panel motion screen. Passing this
// gate would NOT certify simultaneous motion, same-panel CCD, avatar entry,
// calibrated constraints, or production solver suitability.
import {types as nodeTypes} from 'node:util'
const finite = value => typeof value === 'number' && Number.isFinite(value)
const nonnegative = value => finite(value) && value >= 0
// Array#every skips holes. A missing motion component must never be treated
// as a finite coordinate (Math.hypot(undefined) also produces NaN).
const finite3 = value => Array.isArray(value) && value.length === 3 &&
  [0, 1, 2].every(i => Object.hasOwn(value, i) && finite(value[i]))

export function rankSleeveHingeTranslationResearch20261025(candidates, {
  principalStrainCapPercent = 5,
} = {}) {
  if (!Array.isArray(candidates) || candidates.length < 1 ||
      candidates.length > 6 || !finite(principalStrainCapPercent) ||
      principalStrainCapPercent <= 0 || principalStrainCapPercent > 20)
    throw new RangeError('Invalid bounded hinge-translation candidate grid')
  const ids = new Set()
  const audited = candidates.map(entry => {
    const {id, panelId, angleRadians, translationM, fold, optimized,
      illConditionedFaces} = entry || {}
    const otherPanels = panelId === 'sleeve-left' ?
      ['front', 'back', 'sleeve-right'] : ['front', 'back', 'sleeve-left']
    const completeOtherPanels = screens => Array.isArray(screens) &&
      screens.length === 3 &&
      new Set(screens.map(s => s?.otherPanelId)).size === 3 &&
      screens.every(s => otherPanels.includes(s?.otherPanelId))
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_.-]{1,64}$/.test(id) ||
        ids.has(id) || !['sleeve-left', 'sleeve-right'].includes(panelId) ||
        !finite(angleRadians) || Math.abs(angleRadians) > Math.PI / 2 ||
        !finite3(translationM) || Math.hypot(...translationM) > .150000001 ||
        !Number.isInteger(illConditionedFaces) || illConditionedFaces < 0 ||
        !fold || !optimized || fold.panelId !== panelId ||
        optimized.panelId !== panelId ||
        fold.angleRadians !== angleRadians ||
        !finite3(optimized.selectedTranslationM) ||
        optimized.selectedTranslationM.some((v, i) =>
          Math.abs(v - translationM[i]) > 1e-10) ||
        fold.sewingPairCount !== 102 || fold.seamGroupCount !== 14 ||
        optimized.sewingPairCount !== 102 || optimized.seamGroupCount !== 14 ||
        !Array.isArray(fold.samples) || fold.samples.length !== 3 ||
        fold.samples.some((s, i) => s?.fraction !== [0, .5, 1][i]) ||
        !completeOtherPanels(fold.activePanelIntervals) ||
        !completeOtherPanels(optimized.activeIntervals) ||
        !Array.isArray(fold.seamGroupRegressions) ||
        !Array.isArray(optimized.originalSeamGroupRegressions) ||
        !optimized.originalSeams || !optimized.candidateSeams ||
        !nonnegative(optimized.originalSeams.maxGapMm) ||
        !nonnegative(optimized.originalSeams.rmsGapMm) ||
        !nonnegative(optimized.candidateSeams.maxGapMm) ||
        !nonnegative(optimized.candidateSeams.rmsGapMm) ||
        !nonnegative(optimized.fullPrincipalExtensionPercent) ||
        !nonnegative(optimized.fullPrincipalCompressionPercent) ||
        typeof optimized.staticContactValid !== 'boolean' ||
        fold.sourceNonmutationVerified !== true ||
        optimized.sourceNonmutationVerified !== true)
      throw new Error('Invalid or duplicated coupled sleeve candidate evidence')
    ids.add(id)
    const reasons = []
    if (illConditionedFaces > 0) reasons.push('ill_conditioned_rest_mesh')
    if (fold.seamGroupRegressions.length ||
        optimized.originalSeamGroupRegressions.length ||
        optimized.candidateSeams.maxGapMm > optimized.originalSeams.maxGapMm + 1e-6 ||
        optimized.candidateSeams.rmsGapMm > optimized.originalSeams.rmsGapMm + 1e-6)
      reasons.push('seam_regression_against_original')
    if (optimized.fullPrincipalExtensionPercent > principalStrainCapPercent ||
        optimized.fullPrincipalCompressionPercent > principalStrainCapPercent ||
        fold.samples.some(s => !s || !nonnegative(s.fullPrincipalExtensionPercent) ||
          !nonnegative(s.fullPrincipalCompressionPercent) ||
          s.fullPrincipalExtensionPercent > principalStrainCapPercent ||
          s.fullPrincipalCompressionPercent > principalStrainCapPercent))
      reasons.push('principal_fabric_strain')
    if (!optimized.staticContactValid ||
        fold.samples.some(s => s?.staticContactValid !== true))
      reasons.push('static_contact')
    // Missing, unresolved or budget-exhausted screens are NOT a pass.
    // A nominally clear interval with a retained blocker is contradictory;
    // never promote it merely because its boolean clearance flag is true.
    if (fold.activePanelIntervals.some(s => s?.coupledInterpanelIntervalClear !== true ||
          s?.blocker != null) ||
        optimized.activeIntervals.some(s => s?.coupledInterpanelIntervalClear !== true ||
          s?.blocker != null) ||
        fold.interval?.coupledInterpanelIntervalClear !== true ||
        fold.interval?.blocker != null)
      reasons.push('interpanel_motion_interval')
    return {id, panelId, angleRadians, translationM: [...translationM],
      maxGapMm: optimized.candidateSeams.maxGapMm,
      rmsGapMm: optimized.candidateSeams.rmsGapMm,
      principalExtensionPercent: optimized.fullPrincipalExtensionPercent,
      principalCompressionPercent: optimized.fullPrincipalCompressionPercent,
      staticContactValid: optimized.staticContactValid,
      twoStageInterpanelScreenClear: !reasons.includes('interpanel_motion_interval'),
      reasons, researchScreenPass: reasons.length === 0}
  })
  const bySeam = (a, b) => a.rmsGapMm - b.rmsGapMm ||
    a.maxGapMm - b.maxGapMm || a.id.localeCompare(b.id)
  const bestDiagnostic = [...audited].sort(bySeam)[0]
  const admissible = audited.filter(x => x.researchScreenPass).sort(bySeam)
  return {candidateCount: audited.length, rejectedCount: audited.length - admissible.length,
    candidates: audited, bestDiagnosticId: bestDiagnostic.id,
    researchScreenedCandidateId: admissible[0]?.id ?? null,
    twoStageOnly: true, simultaneousCoupledPathCertified: false,
    continuousSamePanelCCDCertified: false, avatarEntryCertified: false,
    solverConstraintsRebuilt: false, materialCalibrated: false,
    physicalAcceptance: false, safeToAutoApply: false}
}

// Stronger, still RESEARCH-ONLY ranking for an independently evaluated
// simultaneous hinge+translation path. The older two-stage ranking is kept
// intact for diagnostics; it cannot establish clearance during simultaneous
// motion. A disjoint-face sleeve interval screen cannot certify adjacent
// hinged faces, deformable cloth, avatar entry, or production acceptance.
export function rankSleeveSimultaneousMotionResearch20261025(candidates, options = {}) {
  // Do not invoke caller-controlled getters/Proxy traps while deciding whether
  // evidence can pass a research admission screen. This path is Node QA only.
  const data = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        nodeTypes.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype ||
        Object.values(Object.getOwnPropertyDescriptors(value)).some(d =>
          !Object.hasOwn(d, 'value')))
      throw new Error('Invalid accessor or Proxy research evidence')
  }
  const array = value => {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) ||
        value.length > 4096 ||
        !Array.from({length: value.length}, (_, i) => i).every(i =>
          Object.hasOwn(value, i)) ||
        Object.values(Object.getOwnPropertyDescriptors(value)).some(d =>
          !Object.hasOwn(d, 'value')))
      throw new Error('Invalid accessor or Proxy research evidence')
  }
  array(candidates)
  data(options)
  for (const entry of candidates) {
    data(entry)
    for (const key of ['fold', 'optimized']) data(entry[key])
    array(entry.translationM)
    array(entry.optimized.selectedTranslationM)
    for (const key of ['samples', 'activePanelIntervals', 'seamGroupRegressions'])
      array(entry.fold[key])
    for (const key of ['activeIntervals', 'originalSeamGroupRegressions'])
      array(entry.optimized[key])
    for (const value of [...entry.fold.samples, ...entry.fold.activePanelIntervals,
      ...entry.optimized.activeIntervals]) data(value)
    for (const value of [entry.fold.interval, entry.fold.planarSeams,
      entry.optimized.originalSeams, entry.optimized.candidateSeams]) data(value)
    if (entry.simultaneous != null) {
      const motion = entry.simultaneous
      data(motion)
      array(motion.translationM)
      array(motion.samples)
      array(motion.activePanelIntervals)
      array(motion.originalSeamGroups)
      for (const group of motion.originalSeamGroups) data(group)
      for (const value of [...motion.samples, ...motion.activePanelIntervals,
        motion.samePanelDisjointInterval]) data(value)
      for (const sample of motion.samples) {
        array(sample.seamGroups)
        for (const group of sample.seamGroups) data(group)
      }
    }
  }
  const staged = rankSleeveHingeTranslationResearch20261025(candidates, options)
  const cap = options.principalStrainCapPercent ?? 5
  const nonnegativeInt = n => Number.isSafeInteger(n) && n >= 0
  const close = (a, b) => Math.abs(a - b) <= 1e-6
  const validGroups = groups => Array.isArray(groups) && groups.length === 14 &&
    groups.every(g => typeof g.id === 'string' && g.id.length > 0 &&
      g.id.length <= 128 && Number.isSafeInteger(g.pairCount) &&
      g.pairCount > 0 && nonnegative(g.maxGapMm) &&
      nonnegative(g.rmsGapMm) && g.rmsGapMm <= g.maxGapMm + 1e-6 &&
      // The largest residual contributes at least max² / pairCount to RMS².
      g.rmsGapMm + 1e-6 >= g.maxGapMm / Math.sqrt(g.pairCount)) &&
    new Set(groups.map(g => g.id)).size === 14 &&
    groups.reduce((n, g) => n + g.pairCount, 0) === 102
  const matchesAggregate = (groups, max, rms) =>
    close(Math.max(...groups.map(g => g.maxGapMm)), max) &&
    close(Math.sqrt(groups.reduce((sum, g) =>
      sum + g.pairCount * g.rmsGapMm ** 2, 0) / 102), rms)
  const completeScreens = (screens, panelId) => {
    const expected = panelId === 'sleeve-left' ?
      ['front', 'back', 'sleeve-right'] : ['front', 'back', 'sleeve-left']
    return Array.isArray(screens) && screens.length === 3 &&
      new Set(screens.map(s => s?.otherPanelId)).size === 3 &&
      screens.every(s => expected.includes(s?.otherPanelId) &&
        typeof s.coupledInterpanelIntervalClear === 'boolean')
  }
  const audited = staged.candidates.map((prior, i) => {
    const {fold, optimized, simultaneous: motion} = candidates[i]
    if (motion == null) return {...prior,
      simultaneousScreenPass: false,
      simultaneousReasons: [...prior.reasons, 'missing_simultaneous_motion_evidence']}
    const samples = motion.samples, sweep = motion.samePanelDisjointInterval
    const expectedPairs = fold.regeneratedFaceCount *
      (fold.regeneratedFaceCount - 1) / 2
    if (typeof fold.restMeshApproved !== 'boolean' ||
        fold.restMeshApproved !== (candidates[i].illConditionedFaces === 0) ||
        !fold.planarSeams ||
        !nonnegative(fold.planarSeams.maxGapMm) ||
        !nonnegative(fold.planarSeams.rmsGapMm) ||
        motion.panelId !== prior.panelId ||
        motion.angleRadians !== prior.angleRadians ||
        !finite3(motion.translationM) ||
        motion.translationM.some((x, k) => !close(x, prior.translationM[k])) ||
        motion.endpointMatchesSequential !== true ||
        motion.sourceNonmutationVerified !== true ||
        motion.simultaneousRigidPathOnly !== true ||
        !Array.isArray(samples) || samples.length !== 3 ||
        samples.some((s, k) => !s || s.fraction !== [0, .5, 1][k] ||
          !nonnegative(s.maxGapMm) || !nonnegative(s.rmsGapMm) ||
          !nonnegative(s.principalExtensionPercent) ||
          !nonnegative(s.principalCompressionPercent) ||
          typeof s.staticContactValid !== 'boolean') ||
        !close(samples[0].maxGapMm, fold.planarSeams.maxGapMm) ||
        !close(samples[0].rmsGapMm, fold.planarSeams.rmsGapMm) ||
        !close(samples[2].maxGapMm, optimized.candidateSeams.maxGapMm) ||
        !close(samples[2].rmsGapMm, optimized.candidateSeams.rmsGapMm) ||
        !close(samples[2].principalExtensionPercent,
          optimized.fullPrincipalExtensionPercent) ||
        !close(samples[2].principalCompressionPercent,
          optimized.fullPrincipalCompressionPercent) ||
        !validGroups(motion.originalSeamGroups) ||
        typeof motion.sampledSeamGapNonworse !== 'boolean' ||
        typeof motion.sampledSeamGroupsNonworse !== 'boolean' ||
        !matchesAggregate(motion.originalSeamGroups,
          optimized.originalSeams.maxGapMm, optimized.originalSeams.rmsGapMm) ||
        samples.some(s => !validGroups(s.seamGroups) ||
          !matchesAggregate(s.seamGroups, s.maxGapMm, s.rmsGapMm) ||
          s.seamGroups.some(g => !motion.originalSeamGroups.some(ref =>
            ref.id === g.id && ref.pairCount === g.pairCount))) ||
        !completeScreens(motion.activePanelIntervals, prior.panelId) ||
        !Number.isInteger(fold.regeneratedFaceCount) ||
        fold.regeneratedFaceCount < 3 || fold.regeneratedFaceCount > 2048 ||
        !sweep || sweep.scope !== 'prescribed-rigid-sleeve-disjoint-faces-only' ||
        typeof sweep.disjointIntervalClear !== 'boolean' ||
        !nonnegativeInt(sweep.totalPairs) || sweep.totalPairs !== expectedPairs ||
        !nonnegativeInt(sweep.disjointPairs) ||
        sweep.disjointPairs < 1 ||
        !nonnegativeInt(sweep.adjacentPairsNotCertified) ||
        sweep.disjointPairs + sweep.adjacentPairsNotCertified !== sweep.totalPairs ||
        !nonnegativeInt(sweep.prunedSweptBounds) ||
        sweep.prunedSweptBounds > sweep.disjointPairs ||
        !nonnegativeInt(sweep.rootCheckedPairs) ||
        sweep.rootCheckedPairs > sweep.disjointPairs ||
        sweep.prunedSweptBounds + sweep.rootCheckedPairs > sweep.disjointPairs ||
        (sweep.disjointIntervalClear &&
          sweep.prunedSweptBounds + sweep.rootCheckedPairs !== sweep.disjointPairs) ||
        !nonnegativeInt(sweep.distanceEvaluations) ||
        (sweep.rootCheckedPairs === 0 && sweep.distanceEvaluations !== 0) ||
        sweep.adjacentFaceSweptContactCertified !== false ||
        sweep.deformableCCDCertified !== false ||
        sweep.avatarContactCertified !== false ||
        sweep.physicalAcceptance !== false || sweep.safeToAutoApply !== false ||
        motion.physicalAcceptance !== false || motion.safeToAutoApply !== false ||
        motion.continuousDeformableCCDCertified !== false ||
        motion.samePanelContinuousContactCertified !== false ||
        motion.avatarEntryCertified !== false ||
        motion.materialCalibrated !== false ||
        motion.solverConstraintsRebuilt !== false ||
        typeof motion.interpanelMotionScreenClear !== 'boolean' ||
        typeof motion.samePanelDisjointMotionScreenClear !== 'boolean' ||
        typeof motion.researchScreenPass !== 'boolean')
      throw new Error('Invalid simultaneous sleeve research evidence')
    const reasons = [...prior.reasons]
    // A terminal sewing improvement is insufficient if the prescribed
    // simultaneous motion temporarily opens a seam beyond the original pose.
    // Check both metrics at every sampled state, not just the endpoint.
    if (samples.some(s =>
      s.maxGapMm > optimized.originalSeams.maxGapMm + 1e-6 ||
      s.rmsGapMm > optimized.originalSeams.rmsGapMm + 1e-6))
      reasons.push('simultaneous_seam_gap_excursion')
    // A global improvement cannot mask an intermediate regression in a
    // particular named sewing group, especially at the underarm junction.
    if (samples.some(s => s.seamGroups.some(g => {
      const original = motion.originalSeamGroups.find(ref => ref.id === g.id)
      return g.maxGapMm > original.maxGapMm + 1e-6 ||
        g.rmsGapMm > original.rmsGapMm + 1e-6
    }))) reasons.push('simultaneous_seam_group_excursion')
    // Never trust producer booleans over the independently rechecked data.
    if (motion.sampledSeamGapNonworse !==
          !reasons.includes('simultaneous_seam_gap_excursion') ||
        motion.sampledSeamGroupsNonworse !==
          !reasons.includes('simultaneous_seam_group_excursion'))
      throw new Error('Contradictory sampled sewing group research evidence')
    if (samples.some(s => !s.staticContactValid))
      reasons.push('simultaneous_sampled_contact')
    if (samples.some(s => s.principalExtensionPercent > cap ||
        s.principalCompressionPercent > cap))
      reasons.push('simultaneous_principal_fabric_strain')
    if (!motion.interpanelMotionScreenClear ||
        motion.activePanelIntervals.some(s => s.coupledInterpanelIntervalClear !== true ||
          s.blocker != null))
      reasons.push('simultaneous_interpanel_motion_interval')
    if (!motion.samePanelDisjointMotionScreenClear ||
        !sweep.disjointIntervalClear || sweep.blocker != null)
      reasons.push('simultaneous_same_panel_disjoint_interval')
    if (!motion.researchScreenPass)
      reasons.push('simultaneous_reported_veto')
    return {...prior,simultaneousScreenPass: reasons.length === 0,
      simultaneousReasons: reasons,
      adjacentHingeSweptContactCertified: false}
  })
  const eligible = audited.filter(x => x.simultaneousScreenPass).sort((a, b) =>
    a.rmsGapMm - b.rmsGapMm || a.maxGapMm - b.maxGapMm ||
    a.id.localeCompare(b.id))
  return {...staged,simultaneousCandidates: audited,
    simultaneousScreenedCandidateId: eligible[0]?.id ?? null,
    simultaneousRejectedCount: audited.length - eligible.length,
    simultaneousRigidDisjointFaceScreenOnly: true,
    adjacentHingeSweptContactCertified: false,
    continuousDeformableCCDCertified: false,
    physicalAcceptance: false,safeToAutoApply: false}
}
