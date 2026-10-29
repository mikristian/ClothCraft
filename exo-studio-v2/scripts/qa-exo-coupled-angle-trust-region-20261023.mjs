// Independent QA for a bounded research-only coupled hinge trust region.
// Neither an improved seam score nor a sampled clear pose certifies cloth CCD.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges,createNativeDevelopableHingeCandidate} from
  '../src/core/backends/nativeDevelopableHingeResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {searchNativeClearanceAwareMaterialFlips} from
  '../src/core/physics/nativeClearanceAwareFlipResearch.js'
import {rebuildNativeResearchFlipConstraintGraph} from
  '../src/core/physics/nativeFlipConstraintGraphResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {measureNativeSeamResiduals,compareNativeSeamGroups} from
  '../src/core/backends/nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from
  '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeInterpanelExactStaticContact} from
  '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {inspectNativeIntrapanelStaticContact} from
  '../src/core/backends/nativeIntrapanelContactResearch.js'
import {classifyNativeCoupledTrustRegionResult,
  searchNativeCoupledHingeTrustRegion} from
  '../src/core/backends/nativeCoupledAngleTrustRegionResearch.js'

const baseline=()=>({
  before:{pairCount:2,maxGapMm:10,rmsGapMm:8},
  after:{pairCount:2,maxGapMm:9,rmsGapMm:7},
  maximumPrincipalExtensionPercent:0,maximumPrincipalCompressionPercent:0,
  maximumAnchorDisplacementMm:0,avatarPenetrations:0,
  possibleInterpanelContacts:0,possibleSweptInterpanelContacts:0,
  possibleSweptIntrapanelContacts:0,intrapanelIntersections:0,
  edgeNeighborNearFoldoverPairs:0,nonadjacentNearClearancePairs:0,
  meshConditioning:{illConditionedFaces:0},
  groupMerit:{allGroupsNonworse:true,regressions:[]},
  contactClear:true,materialValid:true,anchorsValid:true,pinsUnchanged:true,
  researchScreenPassed:true,fitCertified:false,safeToAutoApply:false,
  sweptCollisionCertified:false,
})

test('strict BOTH-seam improvement can be research-eligible but never fit-certified',()=>{
  const s=classifyNativeCoupledTrustRegionResult(baseline())
  assert.equal(s.eligibleForFurtherResearch,true)
  assert.equal(s.maxDropMm,1)
  assert.equal(s.rmsDropMm,1)
  assert.equal(s.fitCertified,false)
  assert.equal(s.sweptCollisionCertified,false)
  assert.equal(s.safeToAutoApply,false)
})

test('global Pareto RMS win with unchanged maximum is not sufficient',()=>{
  const r=baseline();r.after.maxGapMm=r.before.maxGapMm
  const s=classifyNativeCoupledTrustRegionResult(r)
  assert.equal(s.eligibleForFurtherResearch,false)
  assert.ok(s.reasons.includes('MAX_SEAM_NOT_REDUCED'))
})

test('claimed contact clear cannot override an actual potential or a sliver',()=>{
  const r=baseline()
  r.possibleSweptInterpanelContacts=1
  r.meshConditioning.illConditionedFaces=36
  const s=classifyNativeCoupledTrustRegionResult(r)
  assert.equal(s.eligibleForFurtherResearch,false)
  assert.ok(s.reasons.includes('CLOTH_CONTACT_UNRESOLVED'))
  assert.ok(s.reasons.includes('REST_MESH_ILL_CONDITIONED'))
})

test('seam-group regression, strain and sampled avatar intrusion independently veto',()=>{
  const r=baseline()
  r.groupMerit={allGroupsNonworse:false,regressions:[{id:'side',maxDeltaMm:2}]}
  r.maximumPrincipalExtensionPercent=6
  r.avatarPenetrations=1
  const s=classifyNativeCoupledTrustRegionResult(r)
  assert.deepEqual(s.reasons.filter(x=>[
    'SEAM_GROUP_REGRESSION','PRINCIPAL_STRAIN','SAMPLED_AVATAR_CONTACT'].includes(x)),[
    'SEAM_GROUP_REGRESSION','PRINCIPAL_STRAIN','SAMPLED_AVATAR_CONTACT'])
})

test('malformed, nonfinite and falsely certified metrics fail closed',()=>{
  const r=baseline();r.after.rmsGapMm=NaN
  assert.throws(()=>classifyNativeCoupledTrustRegionResult(r),/Incomplete/)
  const certified=baseline();certified.sweptCollisionCertified=true
  assert.throws(()=>classifyNativeCoupledTrustRegionResult(certified),/Incomplete/)
  const missing=baseline();delete missing.possibleSweptIntrapanelContacts
  assert.throws(()=>classifyNativeCoupledTrustRegionResult(missing),/Incomplete/)
})

test('duplicate or out-of-range trust-region candidates rejected before evaluation',()=>{
  const ref={pieces:[],particles:[]},checkPose=()=>({})
  assert.throws(()=>searchNativeCoupledHingeTrustRegion(ref,{
    anglePairs:[[.02,-.02],[.02,-.02]],checkPose}),/Duplicate/)
  assert.throws(()=>searchNativeCoupledHingeTrustRegion(ref,{
    anglePairs:[[.3,-.02]],checkPose}),/within 0.25/)
  assert.throws(()=>searchNativeCoupledHingeTrustRegion(ref,{
    anglePairs:Array.from({length:7},()=>[.01,.02]),checkPose}),/1..6/)
})

test('actual repaired four-panel tee: bounded NEW hinge-angle trust region remains fail-closed',()=>{
  const project=createTemplateProject('tee')
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalHinges=discoverNativeDevelopableHinges(original,{maxResults:128}).returned
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const h=originalHinges.find(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&h.side==='positive')
    assert.ok(h)
    return [piece.id,[h.axisVertices]]
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
    assert.ok(flip.best)
    replacements[piece.id]=flip.best.mesh.faces
    protectedEdgesByPiece[piece.id]=protectedEdges
  }
  const repaired=rebuildNativeResearchFlipConstraintGraph(pose,replacements,
    {protectedEdgesByPiece}).candidate
  const sources=[project,original,optimized,pose,repaired]
  const frozen=sources.map(x=>JSON.stringify(x))
  const hinges=discoverNativeDevelopableHinges(repaired,{maxResults:128}).returned
  const first=hinges.find(h=>h.panelId==='front'&&h.worldAxisAligned)
  const second=hinges.find(h=>h.panelId==='back'&&h.worldAxisAligned)
  assert.ok(first&&second)
  // These four angles were not in the completed native two-panel grid or
  // the previous rejected -0.15/+0.15 four-panel witness experiment.
  const angles=[[-.025,.025],[-.05,.05],[-.075,.075],[-.1,.1]]
  const result=searchNativeCoupledHingeTrustRegion(repaired,{
    first,second,anglePairs:angles,steps:3,checkPose:inspectStagedAvatarContact})
  assert.equal(result.trialCount,4)
  assert.equal(result.eligibleCount,0)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.sweptCollisionCertified,false)
  for(const trial of result.trials){
    assert.equal(trial.error,undefined)
    assert.equal(trial.restSlivers,36)
    assert.ok(trial.principalExtensionPercent<1e-7)
    assert.equal(trial.avatarPenetrations,0)
    assert.ok(trial.screen.reasons.includes('REST_MESH_ILL_CONDITIONED'))
    assert.equal(trial.screen.eligibleForFurtherResearch,false)
    assert.equal(trial.screen.safeToAutoApply,false)
  }
  // Rebuild the strongest endpoint independently of the trust-region audit;
  // independently recompute seam groups, strain and exact STATIC clearance.
  const strongest=result.trials.at(-1)
  const mid=createNativeDevelopableHingeCandidate(repaired,{
    ...first,angleRadians:strongest.firstAngleRadians}).candidate
  const final=createNativeDevelopableHingeCandidate(mid,{
    ...second,angleRadians:strongest.secondAngleRadians}).candidate
  const before=measureNativeSeamResiduals(repaired)
  const after=measureNativeSeamResiduals(final)
  const groups=compareNativeSeamGroups(before,after)
  const strain=auditNativePrincipalStrain(final)
  const exact=inspectNativeInterpanelExactStaticContact(final)
  const self=inspectNativeIntrapanelStaticContact(final)
  assert.ok(Math.abs(before.maxGapMm-strongest.beforeMaxGapMm)<1e-8)
  assert.ok(Math.abs(after.maxGapMm-strongest.afterMaxGapMm)<1e-8)
  assert.ok(Math.abs(after.rmsGapMm-strongest.afterRmsGapMm)<1e-8)
  assert.equal(groups.allGroupsNonworse,true)
  assert.equal(exact.nearClearancePairs,0)
  assert.equal(self.nonadjacentNearClearancePairs,0)
  assert.equal(self.intersectingTrianglePairs,0)
  assert.ok(strain.maximumPrincipalExtensionPercent<1e-7)
  const maxGroups=after.groups.filter(g=>
    Math.abs(g.maxGapMm-after.maxGapMm)<1e-6).map(g=>g.id)
  assert.ok(maxGroups.length>=1,'Must identify unchanged worst-seam bottleneck')
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),frozen)
  console.log('COUPLED_ANGLE_TRUST_REGION '+JSON.stringify({
    trials:result.trials,maxGapBottleneckGroups:maxGroups,
    independentlyCheckedEndpoint:{maxGapMm:after.maxGapMm,
      rmsGapMm:after.rmsGapMm,exactStaticNearPairs:exact.nearClearancePairs,
      samePanelStaticIntersections:self.intersectingTrianglePairs,
      principalExtensionPercent:strain.maximumPrincipalExtensionPercent},
    sourceUnchanged:true,fitCertified:false}))
})
