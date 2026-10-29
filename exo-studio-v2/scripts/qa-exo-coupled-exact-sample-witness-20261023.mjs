// Independent research QA: distinguish sampled AABB contact *possibilities*
// from actual static triangle clearance violations, without waiving swept CCD.
import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {inspectNativeCoupledExactSampleWitnesses} from '../src/core/backends/nativeCoupledExactSampleWitnessResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges,
  createNativeDevelopableHingeCandidate} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {searchNativeClearanceAwareMaterialFlips} from '../src/core/physics/nativeClearanceAwareFlipResearch.js'
import {rebuildNativeResearchFlipConstraintGraph} from '../src/core/physics/nativeFlipConstraintGraphResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'
import {auditNativeCoupledClothTrajectory} from '../src/core/backends/nativeCoupledClothContactResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'

const first=[[0,0,0],[.1,0,0],[0,.002,0]]
const separated=[[-.0009416804937645793,.0026925243507139383,0],
  [-.009237413975410164,.011640347691718489,0],
  [-.0005736354375258088,.007611119647044688,0]]
const pair=(a,b)=>({particles:[...a,...b].map(position=>({position:[...position]})),
  pieces:[{id:'front',particleIndices:[0,1,2],faces:[[0,1,2]]},
    {id:'back',particleIndices:[3,4,5],faces:[[0,1,2]]}]})
const series=(a,b)=>[
  {stage:0,fraction:0,pose:pair(a,b)},
  {stage:1,fraction:1,pose:pair(a,a)},
]

test('exact static samples remove only demonstrable AABB false alarms',()=>{
  const safe=series(first,separated),frozen=JSON.stringify(safe)
  const measured=inspectNativeCoupledExactSampleWitnesses(safe)
  assert.equal(measured.sampleCount,2)
  assert.equal(measured.broadphasePotentialPairs,2)
  assert.equal(measured.exactNearClearancePairs,1)
  assert.equal(measured.perSample[0].exactNearClearancePairs,0)
  assert.equal(measured.perSample[1].exactNearClearancePairs,1)
  assert.equal(measured.sampledStaticExactClear,false)
  assert.equal(measured.sweptCollisionCertified,false)
  assert.equal(measured.safeToAutoApply,false)
  assert.equal(JSON.stringify(safe),frozen)
})

test('budget exhaustion and malformed samples fail closed without mutation',()=>{
  const samples=series(first,separated),frozen=JSON.stringify(samples)
  assert.throws(()=>inspectNativeCoupledExactSampleWitnesses(samples,
    {maxTotalPairs:1}),/budget/)
  assert.throws(()=>inspectNativeCoupledExactSampleWitnesses(samples,
    {maxNarrowphasePairs:0}),/budget/)
  assert.throws(()=>inspectNativeCoupledExactSampleWitnesses(samples,
    {maxNarrowphasePairs:1}),/narrowphase pair budget|cumulative narrowphase budget/)
  const invalid=structuredClone(samples)
  invalid[1].pose.particles[0].position=[NaN,0,0]
  assert.throws(()=>inspectNativeCoupledExactSampleWitnesses(invalid),/position/)
  const invalidFace=structuredClone(samples)
  invalidFace[1].pose.particles[0].position=[0,0,0]
  invalidFace[1].pose.particles[1].position=[.1,0,0]
  invalidFace[1].pose.particles[2].position=[.2,0,0]
  assert.throws(()=>inspectNativeCoupledExactSampleWitnesses(invalidFace),/Degenerate/)
  assert.equal(JSON.stringify(samples),frozen)
})

function repairedTee(){
  const project=createTemplateProject('tee')
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalHinges=discoverNativeDevelopableHinges(original,{maxResults:128}).returned
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const hinge=originalHinges.find(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&h.side==='positive')
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
  const rebuilt=rebuildNativeResearchFlipConstraintGraph(pose,replacements,
    {protectedEdgesByPiece})
  assert.equal(rebuilt.safeToAutoApply,false)
  return {sources:[project,original,optimized,pose,rebuilt.candidate],
    repaired:rebuilt.candidate}
}

test('real repaired tee: quantify exact static contact independently of swept veto',()=>{
  const {sources,repaired}=repairedTee()
  const frozen=sources.map(x=>JSON.stringify(x))
  const hinges=discoverNativeDevelopableHinges(repaired,{maxResults:128}).returned
  const pick=id=>{
    const h=hinges.find(x=>x.panelId===id&&x.worldAxisAligned)
    assert.ok(h)
    return h
  }
  for(const secondId of ['back','sleeve-left']){
    const firstHinge=pick('front'),secondHinge=pick(secondId)
    const started=performance.now()
    const coupled=auditNativeCoupledClothTrajectory(repaired,{
      first:firstHinge,second:secondHinge,
      firstAngleRadians:-.15,secondAngleRadians:.15,steps:3,
      checkPose:inspectStagedAvatarContact,
    })
    const samples=[{stage:0,fraction:0,pose:repaired},
      {stage:1,fraction:1,pose:coupled.intermediate},
      {stage:2,fraction:1,pose:coupled.final}]
    for(const fraction of [1/3,2/3]){
      samples.push({stage:1,fraction,pose:
        createNativeDevelopableHingeCandidate(repaired,{
          ...firstHinge,angleRadians:-.15*fraction}).candidate})
      samples.push({stage:2,fraction,pose:
        createNativeDevelopableHingeCandidate(coupled.intermediate,{
          ...secondHinge,angleRadians:.15*fraction}).candidate})
    }
    const witness=inspectNativeCoupledExactSampleWitnesses(samples)
    assert.equal(witness.sampleCount,7)
    assert.equal(witness.broadphasePotentialPairs,coupled.possibleInterpanelContacts)
    assert.equal(witness.exactNearClearancePairs<=witness.broadphasePotentialPairs,true)
    if(secondId==='back'){
      assert.equal(witness.broadphasePotentialPairs,67)
      assert.equal(witness.exactNearClearancePairs,16)
      assert.equal(witness.nearestExamples[0].distanceMm,0)
    }else{
      assert.equal(witness.broadphasePotentialPairs,0)
      assert.equal(witness.exactNearClearancePairs,0)
    }
    assert.equal(witness.perSample.length,coupled.samples.length)
    for(let i=0;i<samples.length;i++){
      assert.equal(witness.perSample[i].broadphasePotentialPairs,
        coupled.samples[i].interpanelPotentialContacts)
    }
    assert.equal(witness.sweptCollisionCertified,false)
    assert.equal(coupled.sweptCollisionCertified,false)
    assert.equal(coupled.researchScreenPassed,false)
    console.log('POSTFLIP_EXACT_STATIC_WITNESS '+JSON.stringify({
      pair:`front/${secondId}`,maxGapBeforeMm:coupled.before.maxGapMm,
      maxGapAfterMm:coupled.after.maxGapMm,
      rmsBeforeMm:coupled.before.rmsGapMm,rmsAfterMm:coupled.after.rmsGapMm,
      maxPrincipalExtensionPercent:coupled.maximumPrincipalExtensionPercent,
      maxPrincipalCompressionPercent:coupled.maximumPrincipalCompressionPercent,
      avatarPenetrations:coupled.avatarPenetrations,
      staticAabbPotentials:witness.broadphasePotentialPairs,
      exactStaticNearPairs:witness.exactNearClearancePairs,
      nearest:witness.nearestExamples.slice(0,3),
      unresolvedSweptPotentials:coupled.possibleSweptInterpanelContacts,
      illConditionedRestFaces:coupled.meshConditioning.illConditionedFaces,
      runtimeMs:+(performance.now()-started).toFixed(2),
      originalStateUnchanged:true,accepted:false,
    }))
  }
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),frozen)
})
