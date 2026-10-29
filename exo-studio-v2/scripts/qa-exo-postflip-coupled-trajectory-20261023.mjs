// Independent, bounded four-panel integration QA: repaired rest-mesh graph
// -> two sequential material hinges -> seam/strain/contact acceptance.
// Diagnostic only. Never saves, applies, or certifies a garment.
import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {searchNativeClearanceAwareMaterialFlips} from '../src/core/physics/nativeClearanceAwareFlipResearch.js'
import {rebuildNativeResearchFlipConstraintGraph} from '../src/core/physics/nativeFlipConstraintGraphResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'
import {auditNativeCoupledClothTrajectory} from '../src/core/backends/nativeCoupledClothContactResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'

const snapshot=value=>JSON.stringify(value)

function prepare(){
  const project=createTemplateProject('tee')
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalHinges=discoverNativeDevelopableHinges(original,{maxResults:128}).returned
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const hinge=originalHinges.find(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&h.side==='positive')
    assert.ok(hinge,'Each original panel must have a protected hinge axis')
    return [piece.id,[hinge.axisVertices]]
  }))
  const optimized=buildNativeSimulationPayload(project,{quality:'quality',
    experimentalOptimizeMesh:true,experimentalProtectedHingeAxesByPiece:axes,
    experimentalCertifiedPoorFaceFlips:true})
  const pose=rejectedOffbodyDiagnosticPose(optimized)
  const replacements={},protectedEdgesByPiece={}
  for(const piece of pose.pieces.filter(p=>['front','back'].includes(p.id))){
    const mesh={vertices:piece.flatVerticesM.map(v=>[v[0]*100,v[1]*100]),
      faces:piece.faces}
    const protectedEdges=materialHingeProtectedEdges(mesh,axes[piece.id][0])
    const flip=searchNativeClearanceAwareMaterialFlips(mesh,
      piece.particleIndices.map(i=>pose.particles[i].position),
      {protectedEdges,maxCandidates:12})
    assert.ok(flip.best,'Certified local contact repair must exist')
    replacements[piece.id]=flip.best.mesh.faces
    protectedEdgesByPiece[piece.id]=protectedEdges
  }
  const rebuilt=rebuildNativeResearchFlipConstraintGraph(pose,replacements,
    {protectedEdgesByPiece})
  assert.equal(rebuilt.constraintsRegenerated,true)
  assert.equal(rebuilt.safeToAutoApply,false)
  const repaired=rebuilt.candidate
  const staticSelf=inspectNativeIntrapanelStaticContact(repaired)
  const staticInter=inspectNativeInterpanelExactStaticContact(repaired)
  assert.equal(staticSelf.nonadjacentNearClearancePairs,0)
  assert.equal(staticSelf.intersectingTrianglePairs,0)
  assert.equal(staticInter.nearClearancePairs,0)
  const hinges=discoverNativeDevelopableHinges(repaired,{maxResults:128}).returned
  const pick=panelId=>{
    const hinge=hinges.find(h=>h.panelId===panelId&&h.worldAxisAligned)
    assert.ok(hinge,`Missing executable repaired hinge on ${panelId}`)
    return hinge
  }
  return {project,original,optimized,pose,repaired,pick,
    snapshots:[project,original,optimized,pose,repaired].map(snapshot)}
}

// These two distinct angle/panel choices isolate two independent blockers:
// contact uncertainty vs per-seam-group regression. Neither is a solver win.
const fixture=prepare()
function run(firstId,secondId){
  const started=performance.now()
  const result=auditNativeCoupledClothTrajectory(fixture.repaired,{
    first:fixture.pick(firstId),second:fixture.pick(secondId),
    firstAngleRadians:-.15,secondAngleRadians:.15,
    steps:3,checkPose:inspectStagedAvatarContact,
  })
  const runtimeMs=performance.now()-started
  assert.deepEqual([fixture.project,fixture.original,fixture.optimized,
    fixture.pose,fixture.repaired].map(snapshot),fixture.snapshots,
  'Project, source mesh, and repaired candidate must remain unchanged')
  assert.equal(result.before.pairCount,result.after.pairCount)
  assert.equal(result.samples.length,7)
  assert.equal(result.maximumPrincipalExtensionPercent<1e-7,true)
  assert.equal(result.maximumPrincipalCompressionPercent<1e-7,true)
  assert.equal(result.avatarPenetrations,0)
  assert.equal(result.nonadjacentNearClearancePairs,0)
  assert.equal(result.intrapanelIntersections,0)
  assert.equal(result.meshConditioning.illConditionedFaces,36)
  assert.equal(result.materialValid,true)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(result.fitCertified,false)
  return {result,runtimeMs}
}

test('repaired front/back hinge improves RMS but unresolved interpanel contacts veto acceptance',()=>{
  const {result:r,runtimeMs}=run('front','back')
  const independent=measureNativeSeamResiduals(r.final)
  assert.ok(Math.abs(independent.maxGapMm-r.after.maxGapMm)<1e-9)
  assert.ok(Math.abs(independent.rmsGapMm-r.after.rmsGapMm)<1e-9)
  assert.ok(Math.abs(r.after.maxGapMm-r.before.maxGapMm)<1e-8)
  assert.ok(r.after.rmsGapMm<r.before.rmsGapMm-10)
  assert.equal(r.merit.paretoImproved,true)
  assert.equal(r.groupMerit.allGroupsNonworse,true)
  assert.ok(r.possibleInterpanelContacts>0)
  assert.ok(r.possibleSweptInterpanelContacts>0)
  assert.equal(r.contactClear,false)
  assert.equal(r.researchScreenPassed,false)
  console.log('POSTFLIP_COUPLED_CONTACT_BLOCKED '+JSON.stringify({
    beforeMaxGapMm:r.before.maxGapMm,beforeRmsGapMm:r.before.rmsGapMm,
    afterMaxGapMm:r.after.maxGapMm,afterRmsGapMm:r.after.rmsGapMm,
    maxPrincipalExtensionPercent:r.maximumPrincipalExtensionPercent,
    maxPrincipalCompressionPercent:r.maximumPrincipalCompressionPercent,
    avatarPenetrations:r.avatarPenetrations,
    staticNearClearancePairs:r.nonadjacentNearClearancePairs,
    interpanelPotentialPairs:r.possibleInterpanelContacts,
    sweptInterpanelPotentialPairs:r.possibleSweptInterpanelContacts,
    illConditionedRestFaces:r.meshConditioning.illConditionedFaces,
    runtimeMs:+runtimeMs.toFixed(2),sourceUnchanged:true,accepted:false,
  }))
})

test('contact-clear repaired front/sleeve motion still vetoes regressing seam groups',()=>{
  const {result:r,runtimeMs}=run('front','sleeve-left')
  assert.ok(Math.abs(r.after.maxGapMm-r.before.maxGapMm)<1e-8)
  assert.ok(r.after.rmsGapMm<r.before.rmsGapMm-5)
  assert.equal(r.merit.paretoImproved,true)
  assert.equal(r.contactClear,true)
  assert.equal(r.possibleSweptInterpanelContacts,0)
  assert.equal(r.possibleSweptIntrapanelContacts,0)
  assert.equal(r.groupMerit.allGroupsNonworse,false)
  assert.ok(r.groupMerit.regressions.length>0)
  assert.equal(r.researchScreenPassed,false)
  console.log('POSTFLIP_COUPLED_SEAM_GROUP_BLOCKED '+JSON.stringify({
    beforeMaxGapMm:r.before.maxGapMm,beforeRmsGapMm:r.before.rmsGapMm,
    afterMaxGapMm:r.after.maxGapMm,afterRmsGapMm:r.after.rmsGapMm,
    maxPrincipalExtensionPercent:r.maximumPrincipalExtensionPercent,
    maxPrincipalCompressionPercent:r.maximumPrincipalCompressionPercent,
    avatarPenetrations:r.avatarPenetrations,
    contactClear:r.contactClear,regressingSeamGroups:r.groupMerit.regressions,
    illConditionedRestFaces:r.meshConditioning.illConditionedFaces,
    runtimeMs:+runtimeMs.toFixed(2),sourceUnchanged:true,accepted:false,
  }))
})
