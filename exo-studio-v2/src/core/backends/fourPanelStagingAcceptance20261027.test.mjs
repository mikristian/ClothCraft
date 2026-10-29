import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../../data/templates.js'
import {buildNativeSimulationPayload} from './nativePayload.js'
import {assembleNativeSeams} from './seamAssembly.js'
import {measureNativeSeamResiduals} from './nativeSeamCandidateGate.js'

test('authored four-panel tee measures seam closure, principal strain and collision before declining fit acceptance',()=>{
  const project=createTemplateProject('tee')
  const authored=JSON.stringify(project)
  const input=buildNativeSimulationPayload(project,{quality:'quality'})
  const original=JSON.stringify(input)
  assert.equal(input.pieces.length,4)
  const before=measureNativeSeamResiduals(input)
  const output=assembleNativeSeams(input,{iterations:700,seamStiffness:.8,restStiffness:.65,positionStiffness:0,maxMoveM:.006})
  const experiment=output.assemblyExperiment
  const after=measureNativeSeamResiduals(output)
  const strain=experiment.principalStrainAudit
  const contact=experiment.collision
  const path=experiment.sampledPathContact
  assert.equal(before.pairCount,102)
  assert.equal(after.pairCount,102)
  assert.ok(after.maxGapMm<before.maxGapMm*.02)
  assert.ok(after.rmsGapMm<before.rmsGapMm*.02)
  assert.ok(experiment.output.initialMeshPeakEdgeStrainPercent<20)
  assert.equal(strain.withinDeclaredStrainLimit,false)
  assert.ok(strain.maximumPrincipalExtensionPercent>20)
  assert.ok(strain.overLimitTriangles>0)
  assert.ok(contact.penetrating>0)
  assert.ok(path.penetrating>0)
  assert.equal(experiment.candidateGate.researchScreenPassed,false)
  assert.equal(experiment.safeToAutoApply,false)
  assert.equal(experiment.collisionCertified,false)
  assert.equal(JSON.stringify(project),authored)
  assert.equal(JSON.stringify(input),original)
  console.log('FOUR_PANEL_ACCEPTANCE '+JSON.stringify({
    panels:input.pieces.length,seamPairs:before.pairCount,
    maxSeamGapMm:{before:+before.maxGapMm.toFixed(2),after:+after.maxGapMm.toFixed(2)},
    rmsSeamGapMm:{before:+before.rmsGapMm.toFixed(2),after:+after.rmsGapMm.toFixed(2)},
    peakEdgeStrainPercent:experiment.output.initialMeshPeakEdgeStrainPercent,
    peakPrincipalExtensionPercent:+strain.maximumPrincipalExtensionPercent.toFixed(2),
    overLimitTriangles:strain.overLimitTriangles,
    endpointPenetratingSamples:contact.penetrating,
    intermediatePenetratingSamples:path.penetrating,
    fitCertified:false,
  }))
})

test('avatar contact projection exposes the real four-panel seam/strain tradeoff and rejects both poses',()=>{
  const input=buildNativeSimulationPayload(createTemplateProject('tee'),{quality:'quality'})
  const options={iterations:700,seamStiffness:.8,restStiffness:.65,positionStiffness:0,maxMoveM:.006}
  const baseline=assembleNativeSeams(input,options).assemblyExperiment
  const projected=assembleNativeSeams(input,{...options,contactConstrained:true}).assemblyExperiment
  // Contact projection measurably displaces many initially penetrating samples,
  // but worsens seam closure and triangle distortion on this authored garment.
  // This prevents accidentally promoting a vertex-clearance staging pose to fit.
  assert.ok(projected.collision.penetrating<baseline.collision.penetrating)
  assert.ok(projected.sampledPathContact.penetrating<baseline.sampledPathContact.penetrating)
  assert.ok(projected.output.initialSeamGapMaximumMm>baseline.output.initialSeamGapMaximumMm)
  assert.ok(projected.principalStrainAudit.maximumPrincipalExtensionPercent>baseline.principalStrainAudit.maximumPrincipalExtensionPercent)
  for(const candidate of [baseline,projected]){
    assert.equal(candidate.principalStrainAudit.withinDeclaredStrainLimit,false)
    assert.equal(candidate.candidateGate.researchScreenPassed,false)
    assert.equal(candidate.collisionCertified,false)
    assert.equal(candidate.safeToAutoApply,false)
  }
  console.log('FOUR_PANEL_CONTACT_COMPARISON '+JSON.stringify({
    baseline:{gapMm:baseline.output.initialSeamGapMaximumMm,principalExtensionPercent:+baseline.principalStrainAudit.maximumPrincipalExtensionPercent.toFixed(2),bodyPenetration:baseline.collision.penetrating,pathPenetration:baseline.sampledPathContact.penetrating},
    contact:{gapMm:projected.output.initialSeamGapMaximumMm,principalExtensionPercent:+projected.principalStrainAudit.maximumPrincipalExtensionPercent.toFixed(2),bodyPenetration:projected.collision.penetrating,pathPenetration:projected.sampledPathContact.penetrating},
  }))
})
