// Independent, research-only static triangle contact classification QA.
import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {inspectNativeInterpanelPenetrationWitnesses} from
  '../src/core/backends/nativeInterpanelPenetrationWitnessResearch.js'
import {measureNativeTriangleDistanceM} from
  '../src/core/backends/nativeTriangleDistanceResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges,
  createNativeDevelopableHingeCandidate} from
  '../src/core/backends/nativeDevelopableHingeResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {searchNativeClearanceAwareMaterialFlips} from
  '../src/core/physics/nativeClearanceAwareFlipResearch.js'
import {rebuildNativeResearchFlipConstraintGraph} from
  '../src/core/physics/nativeFlipConstraintGraphResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'
import {auditNativeCoupledClothTrajectory} from
  '../src/core/backends/nativeCoupledClothContactResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeCoupledExactSampleWitnesses} from
  '../src/core/backends/nativeCoupledExactSampleWitnessResearch.js'
import {classifyNativeSewnContactWitnessTopology} from
  '../src/core/backends/nativeSewnContactWitnessTopologyResearch.js'

const flat=[[0,0,0],[2,0,0],[0,2,0]]
const pose=(a,b)=>({particles:[...a,...b].map(position=>({position})),
  pieces:[{id:'front',particleIndices:[0,1,2],faces:[[0,1,2]]},
    {id:'back',particleIndices:[3,4,5],faces:[[0,1,2]]}]})
const inspect=(a,b)=>{
  const witness={pieceA:'front',faceA:0,pieceB:'back',faceB:0,
    distanceMm:measureNativeTriangleDistanceM(a,b)*1000}
  return inspectNativeInterpanelPenetrationWitnesses(pose(a,b),[witness])
}

test('a strict transverse edge/face piercing has a verified interior point',()=>{
  const crossing=[[.4,.4,-1],[.4,.4,1],[1.5,1.5,.5]]
  const input=pose(flat,crossing),before=JSON.stringify(input)
  const witness={pieceA:'front',faceA:0,pieceB:'back',faceB:0,distanceMm:0}
  const result=inspectNativeInterpanelPenetrationWitnesses(input,[witness])
  assert.equal(result.strictTransversePiercings,1)
  assert.equal(result.witnesses[0].geometricClassification,'strict_transverse_piercing')
  const [x,y,z]=result.witnesses[0].strictPiercingPointM
  // Either panel's interior-crossing edge may supply the first witness.
  assert.ok(Math.abs(z)<1e-8&&Math.abs(x-y)<1e-8)
  assert.ok(x>0&&y>0&&x+y<=2+1e-8)
  assert.equal(result.collisionExemptionGranted,false)
  assert.equal(result.staticContactCertified,false)
  assert.equal(JSON.stringify(input),before)
  assert.equal(inspect(crossing,flat).strictTransversePiercings,1)
})

test('single-point touch remains unresolved; coplanar positive-area overlap is distinguished',()=>{
  const touch=[[.4,.4,0],[.4,.4,1],[1.5,1.5,.5]]
  const touching=inspect(flat,touch)
  assert.equal(touching.zeroGapUnresolvedPairs,1)
  assert.equal(touching.strictTransversePiercings,0)
  const overlap=[[.25,.25,0],[1.25,.25,0],[.25,1.25,0]]
  const coplanar=inspect(flat,overlap)
  assert.equal(coplanar.coplanarPositiveAreaOverlaps,1)
  assert.ok(Math.abs(coplanar.witnesses[0].coplanarOverlapAreaMm2-500000)<1e-6)
  assert.equal(inspect(overlap,flat).coplanarPositiveAreaOverlaps,1)
})

test('disjoint submillimetre thickness is not misclassified as a piercing',()=>{
  const parallel=[[.25,.25,.0005],[1.25,.25,.0005],[.25,1.25,.0005]]
  const result=inspect(flat,parallel)
  assert.equal(result.subclearanceDisjointPairs,1)
  assert.ok(Math.abs(result.witnesses[0].measuredGapMm-.5)<1e-9)
  assert.equal(result.witnesses[0].strictPiercingPointM,null)
  assert.equal(result.collisionExemptionGranted,false)
})

test('stale witnesses, degenerate faces and unbounded input fail closed',()=>{
  const separated=[[0,0,.0005],[2,0,.0005],[0,2,.0005]]
  const p=pose(flat,separated)
  const witness={pieceA:'front',faceA:0,pieceB:'back',faceB:0,distanceMm:0}
  assert.throws(()=>inspectNativeInterpanelPenetrationWitnesses(p,[witness]),/Stale/)
  assert.throws(()=>inspectNativeInterpanelPenetrationWitnesses(p,
    Array.from({length:257},()=>witness)),/bounded/)
  p.particles[5].position=[1,0,.0005]
  assert.throws(()=>inspectNativeInterpanelPenetrationWitnesses(p,[witness]),
    /nondegenerate/)
})

test('real repaired tee: independently classify all five unmatched contact pairs',()=>{
  const started=performance.now()
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
  const staged=rejectedOffbodyDiagnosticPose(optimized)
  const replacements={},protectedEdgesByPiece={}
  for(const piece of staged.pieces.filter(p=>['front','back'].includes(p.id))){
    const mesh={vertices:piece.flatVerticesM.map(v=>[v[0]*100,v[1]*100]),
      faces:piece.faces}
    const protectedEdges=materialHingeProtectedEdges(mesh,axes[piece.id][0])
    const flip=searchNativeClearanceAwareMaterialFlips(mesh,
      piece.particleIndices.map(i=>staged.particles[i].position),
      {protectedEdges,maxCandidates:12})
    assert.ok(flip.best)
    replacements[piece.id]=flip.best.mesh.faces
    protectedEdgesByPiece[piece.id]=protectedEdges
  }
  const repaired=rebuildNativeResearchFlipConstraintGraph(staged,replacements,
    {protectedEdgesByPiece}).candidate
  const sources=[project,original,optimized,staged,repaired]
  const frozen=sources.map(x=>JSON.stringify(x))
  const hinges=discoverNativeDevelopableHinges(repaired,{maxResults:128}).returned
  const first=hinges.find(h=>h.panelId==='front'&&h.worldAxisAligned)
  const second=hinges.find(h=>h.panelId==='back'&&h.worldAxisAligned)
  const coupled=auditNativeCoupledClothTrajectory(repaired,{
    first,second,firstAngleRadians:-.15,secondAngleRadians:.15,
    steps:3,checkPose:inspectStagedAvatarContact})
  const samples=[{stage:0,fraction:0,pose:repaired},
    {stage:1,fraction:1,pose:coupled.intermediate},
    {stage:2,fraction:1,pose:coupled.final}]
  for(const fraction of [1/3,2/3]){
    samples.push({stage:1,fraction,pose:
      createNativeDevelopableHingeCandidate(repaired,{
        ...first,angleRadians:-.15*fraction}).candidate})
    samples.push({stage:2,fraction,pose:
      createNativeDevelopableHingeCandidate(coupled.intermediate,{
        ...second,angleRadians:.15*fraction}).candidate})
  }
  const exact=inspectNativeCoupledExactSampleWitnesses(samples,{maxWitnesses:64})
  const sewn=classifyNativeSewnContactWitnessTopology(repaired,exact)
  const unmatched=sewn.witnesses.filter(w=>
    w.classification==='no_matching_sewing_correspondence')
  assert.equal(exact.exactNearClearancePairs,16)
  assert.equal(unmatched.length,5)
  assert.ok(unmatched.every(w=>w.stage===2&&w.fraction===1))
  const geometry=inspectNativeInterpanelPenetrationWitnesses(coupled.final,unmatched)
  assert.equal(geometry.totalWitnesses,5)
  assert.equal(geometry.strictTransversePiercings,4)
  assert.equal(geometry.coplanarPositiveAreaOverlaps,0)
  assert.equal(geometry.subclearanceDisjointPairs,1)
  assert.equal(geometry.zeroGapUnresolvedPairs,0)
  assert.deepEqual(geometry.witnesses.map(w=>[w.faceA,w.faceB]),
    [[52,52],[52,60],[55,52],[60,60],[52,55]])
  assert.ok(Math.abs(geometry.witnesses[4].measuredGapMm-.3903548488843967)<1e-6)
  assert.equal(geometry.strictTransversePiercings+
    geometry.coplanarPositiveAreaOverlaps+geometry.subclearanceDisjointPairs+
    geometry.zeroGapUnresolvedPairs,5)
  assert.ok(geometry.witnesses.every(w=>!w.collisionExemptionGranted))
  assert.equal(coupled.researchScreenPassed,false)
  assert.equal(coupled.possibleSweptInterpanelContacts,20)
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),frozen)
  console.log('PENETRATION_WITNESSES '+JSON.stringify({
    geometricCounts:{piercings:geometry.strictTransversePiercings,
      coplanarOverlap:geometry.coplanarPositiveAreaOverlaps,
      subclearanceDisjoint:geometry.subclearanceDisjointPairs,
      zeroGapUnresolved:geometry.zeroGapUnresolvedPairs},
    pairs:geometry.witnesses.map(w=>({front:w.faceA,back:w.faceB,
      gapMm:w.measuredGapMm,classification:w.geometricClassification,
      pointM:w.strictPiercingPointM})),
    maxBeforeMm:coupled.before.maxGapMm,maxAfterMm:coupled.after.maxGapMm,
    rmsBeforeMm:coupled.before.rmsGapMm,rmsAfterMm:coupled.after.rmsGapMm,
    principalExtensionPercent:coupled.maximumPrincipalExtensionPercent,
    principalCompressionPercent:coupled.maximumPrincipalCompressionPercent,
    avatarPenetrations:coupled.avatarPenetrations,
    sweptUnresolved:coupled.possibleSweptInterpanelContacts,
    illConditionedRestFaces:coupled.meshConditioning.illConditionedFaces,
    runtimeMs:+(performance.now()-started).toFixed(2),
    stateUnchanged:true,accepted:false}))
})
