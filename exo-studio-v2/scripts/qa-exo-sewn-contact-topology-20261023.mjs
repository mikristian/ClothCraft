// Independent research QA: a sewn-adjacent face pair is not automatically a
// legitimate seam touch or a safe cloth-contact exemption.
import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {classifyNativeSewnContactWitnessTopology} from
  '../src/core/backends/nativeSewnContactWitnessTopologyResearch.js'
import {inspectNativeCoupledExactSampleWitnesses} from
  '../src/core/backends/nativeCoupledExactSampleWitnessResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges,
  createNativeDevelopableHingeCandidate} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {searchNativeClearanceAwareMaterialFlips} from
  '../src/core/physics/nativeClearanceAwareFlipResearch.js'
import {rebuildNativeResearchFlipConstraintGraph} from
  '../src/core/physics/nativeFlipConstraintGraphResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'
import {auditNativeCoupledClothTrajectory} from
  '../src/core/backends/nativeCoupledClothContactResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'

const synthetic=()=>({
  particles:Array.from({length:6},(_,i)=>({position:[i,0,0]})),
  pieces:[
    {id:'front',particleIndices:[0,1,2],faces:[[0,1,2]]},
    {id:'back',particleIndices:[3,4,5],faces:[[0,1,2]]},
  ],
  constraints:[{type:'seam',seamId:'shoulder',a:0,b:3}],
  virtualSeams:[],
})
const report=()=>({
  exactNearClearancePairs:1,allNearPairsRepresented:true,
  nearestExamples:[{pieceA:'front',faceA:0,pieceB:'back',faceB:0,distanceMm:0}],
})

test('a direct sewn boundary correspondence is explanatory, never a collision waiver',()=>{
  const payload=synthetic(),frozen=JSON.stringify(payload)
  const inspected=classifyNativeSewnContactWitnessTopology(payload,report())
  assert.equal(inspected.boundarySewingIncidentPairs,1)
  assert.equal(inspected.witnesses[0].classification,'sewing_boundary_incident_faces')
  assert.deepEqual(inspected.witnesses[0].associatedSeamIds,['shoulder'])
  assert.equal(inspected.contactAtSewnBoundaryVerified,false)
  assert.equal(inspected.collisionExemptionGranted,false)
  assert.equal(inspected.staticContactCertified,false)
  assert.equal(inspected.safeToAutoApply,false)
  assert.equal(JSON.stringify(payload),frozen)
})

test('unrelated and interior sewing supports never masquerade as sewn boundary contact',()=>{
  const payload=synthetic()
  payload.constraints=[]
  assert.equal(classifyNativeSewnContactWitnessTopology(payload,report())
    .noMatchingSewingPairs,1)
  payload.pieces.forEach((piece,i)=>{
    piece.particleIndices=[i*5,i*5+1,i*5+2,i*5+3,i*5+4]
    piece.faces=[[0,1,4],[1,2,4],[2,3,4],[3,0,4]]
  })
  payload.particles=Array.from({length:10},()=>({position:[0,0,0]}))
  payload.constraints=[{type:'seam',seamId:'invalid-interior-sew',a:4,b:9}]
  const classified=classifyNativeSewnContactWitnessTopology(payload,report())
  assert.equal(classified.interiorSewingSupportPairs,1)
  assert.equal(classified.boundarySewingIncidentPairs,0)
  assert.equal(classified.collisionExemptionGranted,false)
})

test('weighted virtual sewing and witness truncation remain explicit',()=>{
  const payload=synthetic()
  payload.constraints=[]
  payload.virtualSeams=[{seamId:'virtual-shoulder',
    sourceIndices:[0,1],sourceWeights:[.5,.5],
    targetIndices:[3,4],targetWeights:[.5,.5]}]
  const classified=classifyNativeSewnContactWitnessTopology(payload,report())
  assert.deepEqual(classified.witnesses[0].associatedSeamIds,['virtual-shoulder'])
  const incomplete={exactNearClearancePairs:2,allNearPairsRepresented:false,
    nearestExamples:report().nearestExamples}
  const partial=classifyNativeSewnContactWitnessTopology(payload,incomplete)
  assert.equal(partial.unrepresentedNearPairs,1)
  assert.equal(partial.completeEvidence,false)
  assert.throws(()=>classifyNativeSewnContactWitnessTopology(payload,
    {...incomplete,allNearPairsRepresented:true}),/inconsistent/)
})

test('malformed seam references, weights, faces, and witness budgets fail closed',()=>{
  const payload=synthetic(),frozen=JSON.stringify(payload)
  payload.constraints[0].b=999
  assert.throws(()=>classifyNativeSewnContactWitnessTopology(payload,report()),/indices/)
  payload.constraints[0].b=3
  payload.virtualSeams=[{sourceIndices:[0],sourceWeights:[.5],
    targetIndices:[3],targetWeights:[1]}]
  assert.throws(()=>classifyNativeSewnContactWitnessTopology(payload,report()),/weights/)
  payload.virtualSeams=[]
  payload.pieces[0].faces=[[0,1,1]]
  assert.throws(()=>classifyNativeSewnContactWitnessTopology(payload,report()),/face/)
  assert.notEqual(JSON.stringify(payload),frozen)
  const pair=(z)=>({particles:[{position:[0,0,0]},
    {position:[.1,0,0]},{position:[0,.1,0]},
    {position:[0,0,z]},{position:[.1,0,z]},{position:[0,.1,z]}],
    pieces:synthetic().pieces})
  const samples=[{stage:0,fraction:0,pose:pair(0)},
    {stage:1,fraction:1,pose:pair(0)}]
  assert.throws(()=>inspectNativeCoupledExactSampleWitnesses(samples,
    {maxWitnesses:257}),/witness limit/)
  const short=inspectNativeCoupledExactSampleWitnesses(samples,{maxWitnesses:1})
  assert.equal(short.allNearPairsRepresented,false)
  assert.equal(short.exactNearClearancePairs,2)
  assert.equal(short.nearestExamples.length,1)
  const full=inspectNativeCoupledExactSampleWitnesses(samples,{maxWitnesses:2})
  assert.equal(full.allNearPairsRepresented,true)
  assert.equal(full.nearestExamples.length,2)
})

test('actual repaired tee: classify all 16 front/back exact witnesses without granting exemptions',()=>{
  const started=performance.now()
  const project=createTemplateProject('tee')
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalHinges=discoverNativeDevelopableHinges(original,{maxResults:128}).returned
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const h=originalHinges.find(h=>h.panelId===piece.id&&h.worldAxisAligned&&
      h.side==='positive')
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
  const coupled=auditNativeCoupledClothTrajectory(repaired,{
    first,second,firstAngleRadians:-.15,secondAngleRadians:.15,
    steps:3,checkPose:inspectStagedAvatarContact,
  })
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
  const classified=classifyNativeSewnContactWitnessTopology(repaired,exact)
  assert.equal(exact.exactNearClearancePairs,16)
  assert.equal(classified.classifiedWitnesses,16)
  assert.equal(classified.completeEvidence,true)
  assert.equal(classified.unrepresentedNearPairs,0)
  assert.equal(classified.boundarySewingIncidentPairs,11)
  assert.equal(classified.interiorSewingSupportPairs,0)
  assert.equal(classified.noMatchingSewingPairs,5)
  assert.ok(classified.witnesses.every(w=>w.stage===2&&w.fraction===1))
  assert.ok(classified.witnesses.filter(w=>
    w.classification==='sewing_boundary_incident_faces')
    .every(w=>w.associatedSeamIds.includes('seam-side-r')))
  assert.equal(classified.boundarySewingIncidentPairs+
    classified.interiorSewingSupportPairs+
    classified.noMatchingSewingPairs,16)
  assert.ok(classified.witnesses.every(w=>!w.collisionExemptionGranted))
  assert.equal(coupled.researchScreenPassed,false)
  assert.equal(coupled.possibleSweptInterpanelContacts,20)
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),frozen)
  console.log('SEWN_CONTACT_TOPOLOGY '+JSON.stringify({
    totalExactNearPairs:classified.totalExactNearPairs,
    boundarySewingIncidentPairs:classified.boundarySewingIncidentPairs,
    interiorSewingSupportPairs:classified.interiorSewingSupportPairs,
    noMatchingSewingPairs:classified.noMatchingSewingPairs,
    witnesses:classified.witnesses.map(w=>({
      stage:w.stage,fraction:w.fraction,pieceA:w.pieceA,faceA:w.faceA,
      pieceB:w.pieceB,faceB:w.faceB,distanceMm:w.distanceMm,
      classification:w.classification,seams:w.associatedSeamIds,
    })),
    maxGapBeforeMm:coupled.before.maxGapMm,
    maxGapAfterMm:coupled.after.maxGapMm,
    rmsBeforeMm:coupled.before.rmsGapMm,
    rmsAfterMm:coupled.after.rmsGapMm,
    principalExtensionPercent:coupled.maximumPrincipalExtensionPercent,
    principalCompressionPercent:coupled.maximumPrincipalCompressionPercent,
    avatarPenetrations:coupled.avatarPenetrations,
    unresolvedSweptPairs:coupled.possibleSweptInterpanelContacts,
    illConditionedRestFaces:coupled.meshConditioning.illConditionedFaces,
    runtimeMs:+(performance.now()-started).toFixed(2),
    stateUnchanged:true,accepted:false,
  }))
})
