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
import {researchSleeveSimultaneousMotion20261025 as study} from
  '../src/core/backends/nativeSleeveSimultaneousMotionResearch20261025.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {measureNativeTriangleDistanceM} from '../src/core/backends/nativeTriangleDistanceResearch.js'

let fixture
const getFixture = () => {
  if (fixture) return fixture
  const source = buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality: 'quality'})
  const mesh = researchFoundationTeeSleeveQualityContact20261025(source, 'sleeve-right')
  const fold = studyFoundationTeeDevelopableSleeveHingeResearch20261025(
    source, 'sleeve-right', mesh, {angleRadians: .2})
  const optimized = researchFoldedSleeveSeamMerit20261025(
    source, fold.foldedPayload, 'sleeve-right')
  return (fixture = {source, mesh, fold, optimized})
}

test('actual four-panel simultaneous hinge+translation path has independently checked midpoint, endpoint and vetoes', () => {
  const {source, mesh, fold, optimized} = getFixture()
  const snapshots = [source, mesh, fold, optimized].map(x => JSON.stringify(x))
  const start = performance.now()
  const result = study(source, fold, optimized)
  const runtimeMs = performance.now() - start
  assert.deepEqual(result.samples.map(x => x.fraction), [0, .5, 1])
  assert.equal(result.endpointMatchesSequential, true)
  assert.equal(result.activePanelIntervals.length, 3)
  assert.equal(result.samePanelDisjointInterval.scope,
    'prescribed-rigid-sleeve-disjoint-faces-only')
  assert.equal(result.samePanelDisjointInterval.deformableCCDCertified, false)
  assert.equal(result.samePanelDisjointInterval.adjacentFaceSweptContactCertified, false)
  assert.equal(result.samePanelDisjointInterval.totalPairs,
    178 * 177 / 2)
  assert.equal(result.samePanelDisjointMotionScreenClear, false)
  assert.equal(result.samePanelDisjointInterval.blocker?.reason, 'sampled-contact')
  const witness = result.samePanelDisjointInterval.blocker
  assert.equal(witness.fraction, .5)
  assert.equal(result.samePanelDisjointInterval.disjointPairs +
    result.samePanelDisjointInterval.adjacentPairsNotCertified,
    result.samePanelDisjointInterval.totalPairs)
  assert.deepEqual(new Set(result.activePanelIntervals.map(x => x.otherPanelId)),
    new Set(['front', 'back', 'sleeve-left']))
  assert.equal(result.researchScreenPass, false)
  assert.equal(result.sampledSeamGapNonworse, false)
  assert.equal(result.sampledSeamGroupsNonworse, false)
  assert.equal(result.physicalAcceptance, false)
  assert.equal(result.safeToAutoApply, false)
  assert.equal(result.continuousDeformableCCDCertified, false)
  assert.equal(result.avatarEntryCertified, false)
  // Independent midpoint Rodrigues oracle: do not use implementation's
  // trajectory constructor or trust its reported seam/strain/contact fields.
  const midpoint = structuredClone(fold.basePayload)
  const sleeve = midpoint.pieces.find(p => p.id === 'sleeve-right')
  const hinge = fold.motion.hinge
  const moving = new Set(hinge.movingVertices)
  const angle = fold.angleRadians * .5, c = Math.cos(angle), s = Math.sin(angle)
  const [ux, uy, uz] = hinge.axisUnit
  const [ox, oy, oz] = hinge.axisOriginM
  for (let i = 0; i < sleeve.particleIndices.length; i++) {
    const index = sleeve.particleIndices[i]
    const p = fold.basePayload.particles[index].position
    let expected = p
    if (moving.has(i)) {
      const [x, y, z] = [p[0] - ox, p[1] - oy, p[2] - oz]
      const parallel = ux * x + uy * y + uz * z
      expected = [
        ox + x*c + (uy*z-uz*y)*s + ux*parallel*(1-c),
        oy + y*c + (uz*x-ux*z)*s + uy*parallel*(1-c),
        oz + z*c + (ux*y-uy*x)*s + uz*parallel*(1-c),
      ]
    }
    midpoint.particles[index].position = expected.map((v, k) =>
      v + optimized.selectedTranslationM[k] * .5)
  }
  const seam = measureNativeSeamResiduals(midpoint)
  const strain = auditNativePrincipalStrain(midpoint)
  const intra = inspectNativeIntrapanelStaticContact(midpoint)
  const inter = inspectNativeInterpanelExactStaticContact(midpoint)
  const middle = result.samples[1]
  const witnessFaces = [witness.faceA, witness.faceB].map(index =>
    sleeve.faces[index].map(i => midpoint.particles[sleeve.particleIndices[i]].position))
  const independentlyMeasuredGapMm = measureNativeTriangleDistanceM(...witnessFaces)*1000
  assert.ok(independentlyMeasuredGapMm < 1)
  assert.ok(Math.abs(independentlyMeasuredGapMm-witness.distanceMm)<1e-8)
  assert.ok(Math.abs(seam.maxGapMm - middle.maxGapMm) < 1e-8)
  assert.ok(Math.abs(seam.rmsGapMm - middle.rmsGapMm) < 1e-8)
  const measuredById = new Map(seam.groups.map(g => [g.id, g]))
  assert.equal(middle.seamGroups.length, 14)
  for (const group of middle.seamGroups) {
    const measured = measuredById.get(group.id)
    assert.ok(measured)
    assert.equal(group.pairCount, measured.pairCount)
    assert.ok(Math.abs(group.maxGapMm - measured.maxGapMm) < 1e-8)
    assert.ok(Math.abs(group.rmsGapMm - measured.rmsGapMm) < 1e-8)
  }
  assert.ok(Math.abs(strain.maximumPrincipalExtensionPercent -
    middle.principalExtensionPercent) < 1e-8)
  assert.equal(intra.intersectingTrianglePairs, middle.intrapanelIntersections)
  assert.equal(inter.nearClearancePairs, middle.interpanelNearClearancePairs)
  const endpoint = measureNativeSeamResiduals(optimized.candidatePayload)
  assert.ok(Math.abs(endpoint.maxGapMm - result.samples[2].maxGapMm) < 1e-8)
  assert.ok(Math.abs(endpoint.rmsGapMm - result.samples[2].rmsGapMm) < 1e-8)
  assert.deepEqual([source, mesh, fold, optimized].map(x => JSON.stringify(x)), snapshots)
  console.log('SIMULTANEOUS_RESEARCH ' + JSON.stringify({runtimeMs: +runtimeMs.toFixed(2),
    samples: result.samples, activePanelIntervals: result.activePanelIntervals.map(x =>
      ({otherPanelId: x.otherPanelId, clear: x.coupledInterpanelIntervalClear,
        blocker: x.blocker})), sourceNonmutationVerified: true,
    samePanelDisjointInterval: result.samePanelDisjointInterval,
    physicalAcceptance: result.physicalAcceptance}))
})

test('tampered simultaneous endpoint, motion, sewing and budgets fail closed', () => {
  const {source, fold, optimized} = getFixture()
  for (const [change, pattern] of [
    [[x => { x.fold.motion.hinge.endRadians = -.2 }], /endpoint|invalid/i],
    [[x => { x.optimized.candidatePayload.particles[
      x.fold.basePayload.pieces.find(p => p.id === 'sleeve-right').particleIndices[20]
    ].position[0] += .005 }], /endpoint/i],
    [[x => { x.optimized.candidatePayload.constraints.pop() }], /sewing/i],
    [[x => { x.fold.motion.hinge.movingVertices.push(999) }], /moving/i],
    [[x => { x.fold.basePayload.pieces[0].faces.pop() }], /topology/i],
    [[x => { x.source.pieces.find(p => p.id === 'sleeve-right').faces = [] }],
      /source fixture|source geometry/i],
    [[x => { x.source.particles[x.source.pieces.find(p =>
      p.id === 'sleeve-right').particleIndices[10]].position[0] += .02 }],
      /source fixture|source geometry/i],
    [[x => { x.source.pieces.find(p => p.id === 'front').faces[0].reverse() }],
      /source fixture|source geometry/i],
    [[x => { x.fold.sourceNonmutationVerified = 'yes' }], /invalid/i],
    [[x => { x.optimized.sourceNonmutationVerified = 'yes' }], /invalid/i],
    [[x => { x.fold.foldedPayload.constraints.pop() }], /sewing/i],
    [[x => { x.fold.foldedPayload.virtualSeams = [{sourceIndices: [0],
      targetIndices: [1], sourceWeights: [1], targetWeights: [1]}] }], /sewing/i],
  ]) {
    const x = structuredClone({source, fold, optimized})
    change[0](x)
    assert.throws(() => study(x.source, x.fold, x.optimized), pattern)
  }
  assert.throws(() => study(source, fold, optimized, {maxFacePairs: 0}), /budget/i)
  assert.throws(() => study(source, fold, optimized, {clearanceM: NaN}), /budget/i)
})
