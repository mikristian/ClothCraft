import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchCanonicalTeeUnderarmSensitivity20261025 as study} from
  '../src/core/backends/nativeCanonicalTeeUnderarmSensitivityResearch20261025.js'
import {auditCanonicalFoundationTeeSewnContactLocality20261025 as locality} from
  '../src/core/backends/nativeCanonicalTeeSewnContactProvenanceResearch20261025.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'

const fixture=()=>buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality:'quality'})
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,
  `${a} differs from ${b}`)
const rawSeams=payload=>{
  const gaps=payload.constraints.filter(c=>c.type==='seam').map(c=>
    1000*Math.hypot(...payload.particles[c.a].position.map((x,i)=>
      x-payload.particles[c.b].position[i])))
  return {count:gaps.length,max:Math.max(...gaps),
    rms:Math.sqrt(gaps.reduce((sum,g)=>sum+g*g,0)/gaps.length)}
}
let baseline,report

test('actual canonical underarm study is bounded, detached and physically rejected',()=>{
  baseline=fixture()
  const before=JSON.stringify(baseline),start=performance.now()
  report=study(baseline)
  const wallMs=performance.now()-start
  assert.equal(report.trialCount,8)
  assert.equal(report.stepMm,.5)
  assert.equal(new Set(report.trials.map(t=>t.id)).size,8)
  assert.equal(report.trials.filter(t=>t.panelId==='sleeve-left').length,4)
  assert.equal(report.trials.filter(t=>t.panelId==='sleeve-right').length,4)
  assert.equal(report.canonicalInitialPoseVerified,true)
  assert.equal(report.sourceNonmutationVerified,true)
  assert.equal(JSON.stringify(baseline),before)
  const raw=rawSeams(baseline)
  assert.equal(raw.count,102)
  near(report.baseline.maxGapMm,raw.max)
  near(report.baseline.rmsGapMm,raw.rms)
  assert.equal(report.baseline.totalIntersectionWarnings,6)
  assert.equal(report.baseline.persistentOutsideTipWarnings,2)
  assert.equal(report.baseline.staticContactClear,false)
  assert.equal(report.physicalAcceptance,false)
  assert.equal(report.safeToAutoApply,false)
  assert.equal(report.deformableContinuousCCDCertified,false)
  assert.equal(report.avatarEntryCertified,false)
  console.log('UNDERARM_SENSITIVITY '+JSON.stringify({
    wallMs:+wallMs.toFixed(2),baseline:report.baseline,
    best:report.bestRetainedSeparationTrialId,
    maximumScopedRetainedSeparationGainMm:
      report.maximumScopedRetainedSeparationGainMm,
    trials:report.trials.map(t=>({id:t.id,distanceMm:t.targetRetainedDistanceMm,
      rmsGapMm:t.rmsGapMm,staticContactClear:t.staticContactClear}))}))
})

test('independent single-vertex replay matches scoped distance, seam and strain',()=>{
  assert.ok(report)
  const trial=report.trials.find(t=>t.id===report.bestRetainedSeparationTrialId)
  assert.ok(trial)
  const candidate=structuredClone(baseline)
  const previous=structuredClone(candidate.particles[trial.globalIndex].position)
  candidate.particles[trial.globalIndex].position=previous.map((x,k)=>
    x+trial.deltaM[k])
  near(Math.hypot(...trial.deltaM),.0005,1e-12)
  const independentLocality=locality(candidate)
  const witness=independentLocality.witnesses.find(w=>
    w.pieceId===trial.panelId&&w.faceA===37&&w.faceB===58)
  assert.ok(witness)
  near(witness.outsideSewnNeighborhoodDistanceMm,trial.targetRetainedDistanceMm)
  const seam=rawSeams(candidate)
  near(seam.max,trial.maxGapMm)
  near(seam.rms,trial.rmsGapMm)
  const strain=auditNativePrincipalStrain(candidate)
  near(strain.maximumPrincipalExtensionPercent,
    trial.maximumPrincipalExtensionPercent,1e-6)
  near(strain.maximumPrincipalCompressionPercent,
    trial.maximumPrincipalCompressionPercent,1e-6)
  const self=inspectNativeIntrapanelStaticContact(candidate,{clearanceM:.001})
  const between=inspectNativeInterpanelExactStaticContact(candidate,{
    clearanceM:.001,maxPairs:1_000_000,maxNarrowphasePairs:100_000})
  assert.equal(self.intersectingTrianglePairs,trial.intrapanelIntersections)
  assert.equal(between.nearClearancePairs,trial.interpanelNearClearancePairs)
  assert.equal(trial.staticContactClear,false)
  assert.equal(trial.staticResearchGate,false)
})

test('sewn-neighbor tradeoff is explicit; no perturbation cures static contact',()=>{
  const sewn=new Set(baseline.constraints.filter(c=>c.type==='seam')
    .flatMap(c=>[c.a,c.b]))
  assert.ok(report.trials.every(t=>t.pinsUnchanged))
  for(const trial of report.trials){
    assert.equal(sewn.has(trial.globalIndex),trial.affectedSeamIds.length>0)
    if(trial.localVertex===64)
      assert.deepEqual(trial.affectedSeamIds,[
        `seam-sleeve-${trial.panelId==='sleeve-left'?'l':'r'}-underarm`])
    if(trial.localVertex===65)assert.deepEqual(trial.affectedSeamIds,[])
    assert.equal(trial.totalIntersectionWarnings,6)
    assert.equal(trial.persistentOutsideTipWarnings,2)
    assert.equal(trial.intrapanelIntersections,6)
    assert.equal(trial.staticContactClear,false)
    assert.equal(trial.strainWithinLimit,false)
    assert.equal(trial.staticResearchGate,false)
    assert.equal(trial.physicalAcceptance,false)
    assert.equal(trial.safeToAutoApply,false)
    assert.ok(trial.maximumPrincipalExtensionPercent>7000)
  }
  assert.ok(report.maximumScopedRetainedSeparationGainMm>0)
  assert.ok(report.maximumScopedRetainedSeparationGainMm<.01)
  const best=report.trials.find(t=>t.id===report.bestRetainedSeparationTrialId)
  assert.ok(best.affectedSeamIds.length>0)
  assert.ok(best.rmsGapMm>report.baseline.rmsGapMm)
  assert.ok(best.seamGroupRegressions.length>0)
})

test('changed canonical pose or previous-state baseline is rejected',()=>{
  for(const mode of ['position','previous']){
    const changed=fixture(),before=JSON.stringify(changed)
    changed.particles[0][mode][0]+=.0001
    const modified=JSON.stringify(changed)
    assert.notEqual(modified,before)
    assert.throws(()=>study(changed),/canonical initial pose/)
    assert.equal(JSON.stringify(changed),modified)
  }
})

test('forged seam physics and material topology fail canonical provenance',()=>{
  for(const mode of ['seam','material','thickness']){
    const changed=fixture()
    if(mode==='seam')changed.constraints.find(c=>c.type==='seam').rest=999
    if(mode==='material')changed.pieces[0].faces[0].reverse()
    if(mode==='thickness')changed.particles[0].thickness=999
    const before=JSON.stringify(changed)
    assert.throws(()=>study(changed),/canonical material\/sewing identity mismatch/)
    assert.equal(JSON.stringify(changed),before)
  }
})
