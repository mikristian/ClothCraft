// Independent research QA: actual sewn-boundary-incident faces can still pierce.
// This is sampled STATIC geometry only, not continuous collision certification.
import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
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
import {auditNativeCoupledClothTrajectory} from
  '../src/core/backends/nativeCoupledClothContactResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeCoupledExactSampleWitnesses} from
  '../src/core/backends/nativeCoupledExactSampleWitnessResearch.js'
import {classifyNativeSewnContactWitnessTopology} from
  '../src/core/backends/nativeSewnContactWitnessTopologyResearch.js'
import {inspectNativeInterpanelPenetrationWitnesses} from
  '../src/core/backends/nativeInterpanelPenetrationWitnessResearch.js'

test('sewing correspondence does not excuse independently proven transverse piercing',()=>{
  const p={particles:[
    {position:[0,0,0]},{position:[2,0,0]},{position:[0,2,0]},
    {position:[.4,.4,-1]},{position:[.4,.4,1]},
    {position:[1.5,1.5,.5]}],
    pieces:[{id:'front',particleIndices:[0,1,2],faces:[[0,1,2]]},
      {id:'back',particleIndices:[3,4,5],faces:[[0,1,2]]}],
    constraints:[{type:'seam',seamId:'synthetic-sewn-edge',a:0,b:3}],
    virtualSeams:[]}
  const before=JSON.stringify(p)
  const witness={pieceA:'front',faceA:0,pieceB:'back',faceB:0,distanceMm:0}
  const topology=classifyNativeSewnContactWitnessTopology(p,{
    exactNearClearancePairs:1,allNearPairsRepresented:true,nearestExamples:[witness]})
  assert.equal(topology.boundarySewingIncidentPairs,1)
  const geometric=inspectNativeInterpanelPenetrationWitnesses(p,topology.witnesses)
  assert.equal(geometric.strictTransversePiercings,1)
  assert.equal(geometric.collisionExemptionGranted,false)
  assert.equal(geometric.witnesses[0].collisionExemptionGranted,false)
  assert.equal(JSON.stringify(p),before)
})

test('real repaired tee: geometrically adjudicate all eleven sewn-incident contact pairs',()=>{
  const started=performance.now()
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
  const snapshots=sources.map(x=>JSON.stringify(x))
  const hinges=discoverNativeDevelopableHinges(repaired,{maxResults:128}).returned
  const first=hinges.find(h=>h.panelId==='front'&&h.worldAxisAligned)
  const second=hinges.find(h=>h.panelId==='back'&&h.worldAxisAligned)
  assert.ok(first&&second)
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
  assert.equal(exact.exactNearClearancePairs,16)
  assert.equal(sewn.completeEvidence,true)
  const incident=sewn.witnesses.filter(w=>
    w.classification==='sewing_boundary_incident_faces')
  assert.equal(incident.length,11)
  assert.ok(incident.every(w=>w.stage===2&&w.fraction===1&&
    w.associatedSeamIds.includes('seam-side-r')))
  const geometric=inspectNativeInterpanelPenetrationWitnesses(coupled.final,incident)
  assert.equal(geometric.totalWitnesses,11)
  // The seam-side-r label is not a safety exemption: all eleven incident
  // face pairs in this frozen rejected trajectory genuinely pierce.
  assert.equal(geometric.strictTransversePiercings,11)
  assert.equal(geometric.coplanarPositiveAreaOverlaps,0)
  assert.equal(geometric.subclearanceDisjointPairs,0)
  assert.equal(geometric.zeroGapUnresolvedPairs,0)
  assert.deepEqual(geometric.witnesses.map(w=>[w.faceA,w.faceB]),[
    [53,53],[53,55],[54,54],[54,61],[55,55],[57,57],
    [57,59],[59,54],[59,59],[61,53],[61,61]])
  assert.ok(geometric.witnesses.every(w=>w.strictPiercingPointM?.length===3))
  assert.equal(geometric.strictTransversePiercings+
    geometric.coplanarPositiveAreaOverlaps+
    geometric.subclearanceDisjointPairs+
    geometric.zeroGapUnresolvedPairs,11)
  assert.equal(geometric.collisionExemptionGranted,false)
  assert.equal(geometric.staticContactCertified,false)
  assert.equal(geometric.sweptCollisionCertified,false)
  assert.ok(geometric.witnesses.every(w=>w.collisionExemptionGranted===false))
  assert.equal(coupled.researchScreenPassed,false)
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),snapshots)
  console.log('SEWN_GEOMETRY_ADJUDICATION '+JSON.stringify({
    incidentPairs:11,strictPiercings:geometric.strictTransversePiercings,
    coplanarOverlaps:geometric.coplanarPositiveAreaOverlaps,
    disjointSubclearance:geometric.subclearanceDisjointPairs,
    zeroGapUnresolved:geometric.zeroGapUnresolvedPairs,
    pairs:geometric.witnesses.map(w=>({faceA:w.faceA,faceB:w.faceB,
      gapMm:w.measuredGapMm,classification:w.geometricClassification})),
    maxBeforeMm:coupled.before.maxGapMm,maxAfterMm:coupled.after.maxGapMm,
    rmsBeforeMm:coupled.before.rmsGapMm,rmsAfterMm:coupled.after.rmsGapMm,
    extensionPercent:coupled.maximumPrincipalExtensionPercent,
    compressionPercent:coupled.maximumPrincipalCompressionPercent,
    avatarPenetrations:coupled.avatarPenetrations,
    sweptUnresolved:coupled.possibleSweptInterpanelContacts,
    restSlivers:coupled.meshConditioning.illConditionedFaces,
    runtimeMs:+(performance.now()-started).toFixed(2),stateUnchanged:true,
    accepted:false}))
})
