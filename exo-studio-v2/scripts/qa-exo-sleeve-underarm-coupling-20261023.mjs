// New four-panel sleeve-underarm hinge probes; research only, no garment saves.
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
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeInterpanelExactStaticContact} from
  '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {inspectNativeUnderarmBottlenecks,probeNativeSleeveUnderarmCoupling} from
  '../src/core/backends/nativeSleeveUnderarmCouplingResearch.js'

const metrics=(l=10,r=10)=>({maxGapMm:Math.max(l,r),rmsGapMm:8,
  groups:[{id:'seam-sleeve-l-underarm',pairCount:2,maxGapMm:l,rmsGapMm:l/2},
    {id:'seam-sleeve-r-underarm',pairCount:2,maxGapMm:r,rmsGapMm:r/2}]})

test('both underarm bottlenecks must improve, not merely one side',()=>{
  const b=metrics(),a=metrics(8,10)
  const v=inspectNativeUnderarmBottlenecks(b,a)
  assert.equal(v.bothUnderarmMaxImproved,false)
  assert.equal(v.globalMaxImproved,false)
  assert.equal(v.groups[0].maxDropMm,2)
  assert.equal(v.groups[1].maxDropMm,0)
  assert.equal(inspectNativeUnderarmBottlenecks(b,metrics(8,9)).bothUnderarmMaxImproved,true)
})

test('missing, duplicated, nonfinite, and mismatched sewing evidence fails closed',()=>{
  const b=metrics(),a=metrics()
  a.groups[1].id=a.groups[0].id
  assert.throws(()=>inspectNativeUnderarmBottlenecks(b,a),/identity/)
  const c=metrics();c.groups[1].pairCount=3
  assert.throws(()=>inspectNativeUnderarmBottlenecks(b,c),/underarm seam/)
  const d=metrics();d.groups[0].rmsGapMm=NaN
  assert.throws(()=>inspectNativeUnderarmBottlenecks(b,d),/underarm seam/)
  assert.throws(()=>inspectNativeUnderarmBottlenecks(b,metrics(),{toleranceMm:-1}),/tolerance/)
})

test('duplicate, excessive and invalid paired sleeve trials are refused before running',()=>{
  const ref={},hinge={panelId:'sleeve-left',worldAxisAligned:true},
    other={panelId:'sleeve-right',worldAxisAligned:true},checkPose=()=>({})
  const opts={left:hinge,right:other,checkPose}
  assert.throws(()=>probeNativeSleeveUnderarmCoupling(ref,{
    ...opts,anglePairs:[[.1,.1],[.1,.1]]}),/Duplicate/)
  assert.throws(()=>probeNativeSleeveUnderarmCoupling(ref,{
    ...opts,anglePairs:[[.2,.1]]}),/within 0.15/)
  assert.throws(()=>probeNativeSleeveUnderarmCoupling(ref,{
    ...opts,anglePairs:Array.from({length:5},()=>[.01,.02])}),/1..4/)
  assert.throws(()=>probeNativeSleeveUnderarmCoupling(ref,{
    ...opts,left:{...hinge,worldAxisAligned:false},anglePairs:[[.01,.02]]}),/executable/)
})

test('real repaired tee: new paired sleeve motions after contact-clear bodice fold remain fail-closed',()=>{
  const project=createTemplateProject('tee')
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const hinge=discoverNativeDevelopableHinges(original,{maxResults:128})
      .returned.find(h=>h.panelId===piece.id&&h.worldAxisAligned&&h.side==='positive')
    assert.ok(hinge)
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
    assert.ok(flip.best)
    replacements[piece.id]=flip.best.mesh.faces
    protectedEdgesByPiece[piece.id]=protectedEdges
  }
  const repaired=rebuildNativeResearchFlipConstraintGraph(pose,replacements,
    {protectedEdgesByPiece}).candidate
  const hinges=discoverNativeDevelopableHinges(repaired,{maxResults:128}).returned
  const front=hinges.find(h=>h.panelId==='front'&&h.worldAxisAligned)
  const back=hinges.find(h=>h.panelId==='back'&&h.worldAxisAligned)
  assert.ok(front&&back)
  const afterFront=createNativeDevelopableHingeCandidate(repaired,
    {...front,angleRadians:-.1}).candidate
  const base=createNativeDevelopableHingeCandidate(afterFront,
    {...back,angleRadians:.1}).candidate
  const sleeves=discoverNativeDevelopableHinges(base,{maxResults:128}).returned
  const left=sleeves.find(h=>h.panelId==='sleeve-left'&&h.worldAxisAligned&&h.side==='positive')
  const right=sleeves.find(h=>h.panelId==='sleeve-right'&&h.worldAxisAligned&&h.side==='positive')
  assert.ok(left&&right)
  const sources=[project,original,optimized,pose,repaired,base]
  const frozen=sources.map(s=>JSON.stringify(s))
  const angles=[[-.04,.04],[-.08,.08],[.04,-.04],[.08,-.08]]
  const search=probeNativeSleeveUnderarmCoupling(base,{
    left,right,anglePairs:angles,checkPose:inspectStagedAvatarContact,steps:3})
  assert.equal(search.trialCount,4)
  assert.equal(search.safeToAutoApply,false)
  assert.equal(search.sweptCollisionCertified,false)
  for(const trial of search.trials){
    assert.equal(trial.error,undefined,JSON.stringify(trial))
    assert.equal(trial.illConditionedRestFaces,36)
    assert.equal(trial.researchEligible,false)
    assert.ok(trial.reasons.includes('REST_MESH_ILL_CONDITIONED'))
    assert.ok(trial.maximumPrincipalExtensionPercent<1e-7)
    assert.equal(trial.sampledAvatarPenetrations,0)
    assert.equal(trial.underarms.groups.length,2)
    // This particular sleeve axis moves fabric, but has ZERO leverage over
    // either of the five-pair underarm seam groups. Do not repeat it as a
    // maximum-gap optimization candidate in a later bounded search.
    assert.equal(trial.underarms.bothUnderarmMaxImproved,false)
    for(const group of trial.underarms.groups){
      assert.equal(group.pairCount,5)
      assert.ok(Math.abs(group.maxDropMm)<1e-8)
      assert.ok(Math.abs(group.rmsDropMm)<1e-8)
    }
    assert.ok(Math.abs(trial.afterMaxGapMm-345)<1e-8)
  }
  // Independent endpoint recalculation, not trusting the probe's seam report.
  const t=search.trials[0]
  const leftPose=createNativeDevelopableHingeCandidate(base,
    {...left,angleRadians:t.leftAngleRadians}).candidate
  const endpoint=createNativeDevelopableHingeCandidate(leftPose,
    {...right,angleRadians:t.rightAngleRadians}).candidate
  const before=measureNativeSeamResiduals(base),after=measureNativeSeamResiduals(endpoint)
  const independent=inspectNativeUnderarmBottlenecks(before,after)
  const groups=compareNativeSeamGroups(before,after)
  const strain=auditNativePrincipalStrain(endpoint)
  const exact=inspectNativeInterpanelExactStaticContact(endpoint)
  assert.ok(Math.abs(t.afterMaxGapMm-after.maxGapMm)<1e-8)
  assert.ok(Math.abs(t.afterRmsGapMm-after.rmsGapMm)<1e-8)
  assert.deepEqual(t.underarms,independent)
  assert.ok(strain.maximumPrincipalExtensionPercent<1e-7)
  assert.deepEqual(sources.map(s=>JSON.stringify(s)),frozen)
  console.log('PAIRED_SLEEVE_UNDERARM '+JSON.stringify({
    baseMaxGapMm:before.maxGapMm,baseRmsGapMm:before.rmsGapMm,
    trials:search.trials,independentEndpoint:{
      maxGapMm:after.maxGapMm,rmsGapMm:after.rmsGapMm,
      groupsNonworse:groups.allGroupsNonworse,exactStaticNearPairs:exact.nearClearancePairs,
      principalExtensionPercent:strain.maximumPrincipalExtensionPercent},
    stateNonmutation:true,fitCertified:false}))
})
