// Detached research only: one prescribed simultaneous sleeve hinge + rigid
// translation, not a solver step, deformable CCD, or production garment pose.
import {screenNativeCoupledHingeTranslationInterval20261025} from './nativeCoupledHingeTranslationIntervalResearch20261025.js'
import {screenNativeSleeveDisjointSweptContactResearch20261025} from './nativeSleeveDisjointSweptContactResearch20261025.js'
import {measureNativeSeamResiduals} from './nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'
import {createTemplateProject} from '../../data/templates.js'
import {buildNativeSimulationPayload} from './nativePayload.js'

const finite3 = p => Array.isArray(p) && p.length === 3 &&
  p.every(x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 100)
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]))
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const signedMaterialArea = piece => {
  if (!Array.isArray(piece?.faces) || !Array.isArray(piece?.flatVerticesM))
    throw new Error('Invalid source sleeve material topology')
  let area = 0
  const keys = new Set()
  for (const f of piece.faces) {
    if (!Array.isArray(f) || f.length !== 3 || new Set(f).size !== 3 ||
        f.some(i => !Number.isInteger(i) || i < 0 ||
          i >= piece.flatVerticesM.length))
      throw new Error('Invalid source sleeve material face')
    const key = [...f].sort((a, b) => a - b).join(',')
    if (keys.has(key)) throw new Error('Duplicate source sleeve material face')
    keys.add(key)
    const [a, b, c] = f.map(i => piece.flatVerticesM[i])
    if (![a, b, c].every(finite3))
      throw new Error('Invalid source sleeve material vertex')
    const signed = ((b[0] - a[0]) * (c[1] - a[1]) -
      (b[1] - a[1]) * (c[0] - a[0])) / 2
    if (signed <= 1e-12) throw new Error('Inverted or degenerate source sleeve face')
    area += signed
  }
  return area
}

export function researchSleeveSimultaneousMotion20261025(source, fold, optimized, {
  clearanceM = .001, maxFacePairs = 500000,
} = {}) {
  if (!Number.isFinite(clearanceM) || clearanceM <= 0 || clearanceM > .01 ||
      !Number.isInteger(maxFacePairs) || maxFacePairs < 1 || maxFacePairs > 500000)
    throw new RangeError('Invalid simultaneous research motion budget')
  const base = fold?.basePayload, terminal = fold?.foldedPayload
  const final = optimized?.candidatePayload, panelId = fold?.panelId
  const motion = fold?.motion, hinge = motion?.hinge
  if (!['sleeve-left', 'sleeve-right'].includes(panelId) ||
      optimized?.panelId !== panelId || !Array.isArray(source?.pieces) ||
      source.pieces.length !== 4 || !Array.isArray(base?.pieces) ||
      base.pieces.length !== 4 || !Array.isArray(terminal?.pieces) ||
      terminal.pieces.length !== 4 || !Array.isArray(final?.pieces) ||
      final.pieces.length !== 4 || !Array.isArray(base?.particles) ||
      !Array.isArray(terminal?.particles) || !Array.isArray(final?.particles) ||
      base.particles.length !== terminal.particles.length ||
      base.particles.length !== final.particles.length ||
      !finite3(optimized?.selectedTranslationM) ||
      Math.hypot(...optimized.selectedTranslationM) > .150000001 ||
      !finite3(motion?.translationM) || motion.translationM.some(x => x !== 0) ||
      !finite3(hinge?.axisOriginM) || !finite3(hinge?.axisUnit) ||
      Math.abs(Math.hypot(...hinge.axisUnit) - 1) > 1e-8 ||
      hinge.startRadians !== 0 || hinge.endRadians !== fold.angleRadians ||
      !Number.isFinite(fold.angleRadians) || Math.abs(fold.angleRadians) > Math.PI / 2 ||
      !Array.isArray(hinge.movingVertices) || !hinge.movingVertices.length ||
      fold.sewingPairCount !== 102 || fold.seamGroupCount !== 14 ||
      optimized.sewingPairCount !== 102 || optimized.seamGroupCount !== 14 ||
      !Array.isArray(fold.seamGroupRegressions) ||
      !Array.isArray(optimized.originalSeamGroupRegressions) ||
      typeof fold.restMeshApproved !== 'boolean' ||
      fold.sourceNonmutationVerified !== true ||
      optimized.sourceNonmutationVerified !== true)
    throw new Error('Invalid detached simultaneous sleeve inputs')
  const snapshots = [source, fold, optimized].map(x => JSON.stringify(x))
  // This particular study is explicitly for the frozen generated Foundation
  // Tee, not an arbitrary edited garment. A stale/forged source can otherwise
  // pass endpoint checks because the folded copy has already lost the original
  // distorted source pose. Rebuild the fixture independently, read-only.
  const expectedSource = buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality: 'quality'})
  if (JSON.stringify(source) !== JSON.stringify(expectedSource))
    throw new Error('Changed Foundation Tee source fixture or source geometry')
  const piece = base.pieces.find(p => p.id === panelId)
  const original = source.pieces.find(p => p.id === panelId)
  if (!piece || !original || piece.particleIndices.length !== 112 ||
      original.particleIndices.length !== 95 || original.faces?.length !== 144 ||
      piece.faces?.length !== 178 ||
      JSON.stringify(piece.particleIndices.slice(0, 95)) !==
        JSON.stringify(original.particleIndices) ||
      JSON.stringify(piece.flatVerticesM?.slice(0, 95)) !==
        JSON.stringify(original.flatVerticesM) ||
      base.pieces.some(p => !terminal.pieces.some(q => JSON.stringify(p) === JSON.stringify(q))) ||
      base.pieces.some(p => !final.pieces.some(q => JSON.stringify(p) === JSON.stringify(q))) ||
      JSON.stringify(base.constraints) !== JSON.stringify(source.constraints) ||
      JSON.stringify(base.constraints) !== JSON.stringify(terminal.constraints) ||
      JSON.stringify(base.constraints) !== JSON.stringify(final.constraints) ||
      JSON.stringify(base.virtualSeams || []) !== JSON.stringify(source.virtualSeams || []) ||
      JSON.stringify(base.virtualSeams || []) !== JSON.stringify(terminal.virtualSeams || []) ||
      JSON.stringify(base.virtualSeams || []) !== JSON.stringify(final.virtualSeams || []) ||
      JSON.stringify(base.anchors || []) !== JSON.stringify(source.anchors || []) ||
      JSON.stringify(base.anchors || []) !== JSON.stringify(terminal.anchors || []) ||
      JSON.stringify(base.anchors || []) !== JSON.stringify(final.anchors || []))
    throw new Error('Changed detached sleeve topology or sewing provenance')
  if (Math.abs(signedMaterialArea(piece) - signedMaterialArea(original)) > 1e-9)
    throw new Error('Detached sleeve material area differs from source')
  for (const p of source.pieces.filter(p => p.id !== panelId))
    if (!base.pieces.some(q => JSON.stringify(p) === JSON.stringify(q)))
      throw new Error('Detached base changed source stationary panel topology')
  const moving = new Set(hinge.movingVertices)
  if (moving.size !== hinge.movingVertices.length ||
      [...moving].some(i => !Number.isInteger(i) || i < 0 || i >= piece.particleIndices.length))
    throw new Error('Invalid moving sleeve vertex inventory')
  const sleeveIds = new Set(piece.particleIndices)
  if (source.anchors?.some(a => sleeveIds.has(a.particle)))
    throw new Error('Pinned sleeve simultaneous motion unsupported')
  const motions = Object.fromEntries(base.pieces.map(p => [p.id, {
    translationM: p.id === panelId ? [...optimized.selectedTranslationM] : [0, 0, 0],
  }]))
  motions[panelId].hinge = structuredClone(hinge)
  const at = (i, t) => {
    const p = base.particles[piece.particleIndices[i]]?.position
    if (!finite3(p)) throw new Error('Invalid sleeve source particle')
    let result = p
    if (moving.has(i)) {
      const v = p.map((x, k) => x - hinge.axisOriginM[k])
      const angle = hinge.endRadians * t
      const c = Math.cos(angle), s = Math.sin(angle)
      const spin = cross(hinge.axisUnit, v), axial = dot(hinge.axisUnit, v)
      result = hinge.axisOriginM.map((x, k) => x + v[k] * c + spin[k] * s +
        hinge.axisUnit[k] * axial * (1 - c))
    }
    return result.map((x, k) => x + optimized.selectedTranslationM[k] * t)
  }
  // Validate that this path's endpoint is exactly the separately computed
  // fold-then-translation endpoint, rather than silently evaluating another pose.
  for (let i = 0; i < piece.particleIndices.length; i++) {
    const id = piece.particleIndices[i]
    if (!finite3(terminal.particles[id]?.position) ||
        !finite3(final.particles[id]?.position) ||
        distance(at(i, 1), final.particles[id].position) > 1e-8 ||
        distance(terminal.particles[id].position.map((x, k) =>
          x + optimized.selectedTranslationM[k]), final.particles[id].position) > 1e-8)
      throw new Error('Simultaneous endpoint differs from verified sequential pose')
  }
  for (const p of base.pieces.filter(p => p.id !== panelId))
    for (const id of p.particleIndices)
      if (JSON.stringify(base.particles[id]) !== JSON.stringify(source.particles[id]) ||
          JSON.stringify(base.particles[id]) !== JSON.stringify(final.particles[id]) ||
          JSON.stringify(base.particles[id]) !== JSON.stringify(terminal.particles[id]))
        throw new Error('Unexpected stationary panel motion')
  // Preserve group-level sewing evidence at each prescribed pose. Global max
  // and RMS can improve while one underarm sewing group becomes worse.
  const compactGroups = seam => seam.groups.map(group => ({
    id: group.id, pairCount: group.pairCount,
    maxGapMm: group.maxGapMm, rmsGapMm: group.rmsGapMm,
  }))
  const sample = fraction => {
    const payload = structuredClone(base)
    for (let i = 0; i < piece.particleIndices.length; i++) {
      const particle = payload.particles[piece.particleIndices[i]]
      particle.position = at(i, fraction)
      particle.previous = [...particle.position]
    }
    const seam = measureNativeSeamResiduals(payload)
    if (seam.pairCount !== 102 || seam.groups.length !== 14)
      throw new Error('Incomplete simultaneous sewing inventory')
    const strain = auditNativePrincipalStrain(payload)
    const intra = inspectNativeIntrapanelStaticContact(payload,
      {clearanceM, maxPairs: maxFacePairs})
    const inter = inspectNativeInterpanelExactStaticContact(payload,
      {clearanceM, maxPairs: maxFacePairs, maxNarrowphasePairs: maxFacePairs})
    return {fraction, maxGapMm: seam.maxGapMm, rmsGapMm: seam.rmsGapMm,
      seamGroups: compactGroups(seam),
      principalExtensionPercent: strain.maximumPrincipalExtensionPercent,
      principalCompressionPercent: strain.maximumPrincipalCompressionPercent,
      intrapanelIntersections: intra.intersectingTrianglePairs,
      interpanelNearClearancePairs: inter.nearClearancePairs,
      staticContactValid: intra.staticDisjointThicknessScreenClear &&
        inter.staticInterpanelExactClear}
  }
  const samples = [0, .5, 1].map(sample)
  const originalSeams = measureNativeSeamResiduals(source)
  if (originalSeams.pairCount !== 102 || originalSeams.groups.length !== 14)
    throw new Error('Incomplete original four-panel sewing inventory')
  const baselineGroups = new Map(originalSeams.groups.map(g => [g.id, g]))
  const sampledSeamGapNonworse = samples.every(s =>
    s.maxGapMm <= originalSeams.maxGapMm + 1e-6 &&
    s.rmsGapMm <= originalSeams.rmsGapMm + 1e-6)
  const sampledSeamGroupsNonworse = samples.every(s =>
    s.seamGroups.length === baselineGroups.size && s.seamGroups.every(g => {
      const original = baselineGroups.get(g.id)
      return original?.pairCount === g.pairCount &&
        g.maxGapMm <= original.maxGapMm + 1e-6 &&
        g.rmsGapMm <= original.rmsGapMm + 1e-6
    }))
  const activePanelIntervals = base.pieces.filter(p => p.id !== panelId).map(other => {
    const compact = {pieces: [], particles: []}
    for (const selected of [piece, other]) {
      const particleIndices = selected.particleIndices.map(id => {
        const next = compact.particles.length
        compact.particles.push(structuredClone(base.particles[id]))
        return next
      })
      compact.pieces.push({...selected, particleIndices})
    }
    const result = screenNativeCoupledHingeTranslationInterval20261025(compact,
      {[panelId]: motions[panelId], [other.id]: motions[other.id]},
      {clearanceM, maxFacePairs, maxDepth: 8, maxDistanceEvaluations: 100000})
    return {otherPanelId: other.id, ...result}
  })
  // Disjoint SAME-sleeve faces can collide between the three static samples.
  // This is a conservative veto, not adjacent-hinge or deformable CCD proof.
  const samePanelDisjointInterval = screenNativeSleeveDisjointSweptContactResearch20261025(
    base, panelId, hinge, optimized.selectedTranslationM,
    {clearanceM, maxFacePairs, maxDepth: 10, maxDistanceEvaluations: 100000})
  if ([source, fold, optimized].some((x, i) => JSON.stringify(x) !== snapshots[i]))
    throw new Error('Simultaneous study mutated source inputs')
  return {panelId, angleRadians: fold.angleRadians,
    translationM: [...optimized.selectedTranslationM], samples,
    originalSeamGroups: compactGroups(originalSeams),
    sampledSeamGapNonworse, sampledSeamGroupsNonworse,
    activePanelIntervals, samePanelDisjointInterval,
    samePanelDisjointMotionScreenClear: samePanelDisjointInterval.disjointIntervalClear,
    endpointMatchesSequential: true,
    interpanelMotionScreenClear: activePanelIntervals.every(x =>
      x.coupledInterpanelIntervalClear === true),
    researchScreenPass: fold.restMeshApproved &&
      fold.seamGroupRegressions.length === 0 &&
      optimized.originalSeamGroupRegressions.length === 0 &&
      sampledSeamGapNonworse && sampledSeamGroupsNonworse &&
      samples.every(x => x.staticContactValid &&
      x.principalExtensionPercent <= 5 && x.principalCompressionPercent <= 5) &&
      activePanelIntervals.every(x => x.coupledInterpanelIntervalClear === true) &&
      samePanelDisjointInterval.disjointIntervalClear === true,
    sourceNonmutationVerified: true, physicalAcceptance: false,
    simultaneousRigidPathOnly: true, continuousDeformableCCDCertified: false,
    samePanelContinuousContactCertified: false, avatarEntryCertified: false,
    materialCalibrated: false, solverConstraintsRebuilt: false,
    safeToAutoApply: false}
}
