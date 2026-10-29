// Independent material-hinge seam-leverage QA. Never saves an EXO garment.
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
import {measureNativeSeamResiduals,auditNativeSeamCandidate} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeInterpanelExactStaticContact} from
  '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {rankNativeUnderarmHingeAxes} from
  '../src/core/backends/nativeUnderarmAxisLeverageResearch.js'

function synthetic(){
  const coords=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],
    [1,0,.05],[3,0,0],[4,0,0],[4,1,0],[3,1,0],[4,0,.05]]
  const pieces=[['sleeve-left',[0,1,2,3]],['sleeve-right',[5,6,7,8]]]
    .map(([id,indices])=>({id,particleIndices:indices,
      flatVerticesM:indices.map(i=>coords[i].map((x,j)=>j===2?0:x)),
      faces:[[0,1,2],[0,2,3]]}))
  return {particles:coords.map(position=>({position:[...position],invMass:1})),pieces,
    constraints:[{type:'seam',seamId:'seam-sleeve-l-underarm',a:1,b:4},
      {type:'seam',seamId:'seam-sleeve-r-underarm',a:6,b:9}]}
}
const hinge=panelId=>({panelId,axisVertices:[0,2],side:'negative',
  worldAxisAligned:true,movingVertexCount:1})

test('synthetic underarm: both axes have measurable signed leverage, but no safety certification',()=>{
  const reference=synthetic(),frozen=JSON.stringify(reference)
  const result=rankNativeUnderarmHingeAxes(reference,{hinges:[hinge('sleeve-left'),hinge('sleeve-right')],
    anglesRadians:[-.1,.1]})
  assert.equal(result.evaluatedAxes,2)
  assert.equal(result.evaluatedAngles,4)
  assert.equal(result.axesWithUnderarmImprovement,2)
  assert.equal(result.contactVerified,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.sweptCollisionCertified,false)
  for(const row of result.ranked){
    assert.ok(row.best.maxDropMm>1e-4)
    assert.ok(row.best.rmsDropMm>1e-4)
    assert.equal(row.targetPairCount,1)
    assert.ok(row.trials.some(t=>t.maxDropMm<0))
  }
  assert.equal(JSON.stringify(reference),frozen)
})

test('duplicate, nonexecutable, oversized, malformed and completed axes fail closed',()=>{
  const ref=synthetic(),left=hinge('sleeve-left'),right=hinge('sleeve-right')
  assert.throws(()=>rankNativeUnderarmHingeAxes(ref,{hinges:[left,left]}),/Duplicate/)
  assert.throws(()=>rankNativeUnderarmHingeAxes(ref,{hinges:[{...left,worldAxisAligned:false}]}),/nonexecutable/)
  assert.throws(()=>rankNativeUnderarmHingeAxes(ref,{hinges:[left],anglesRadians:[NaN]}),/bounded/)
  assert.throws(()=>rankNativeUnderarmHingeAxes(ref,{hinges:[left],anglesRadians:[.04,.04]}),/bounded/)
  assert.throws(()=>rankNativeUnderarmHingeAxes(ref,{hinges:[left],maxAxesPerPanel:21}),/bounded/)
  assert.throws(()=>rankNativeUnderarmHingeAxes(ref,{hinges:[left],excludedAxisKeys:['sleeve-left:0,2:negative']}),/No untested/)
  const corrupt=synthetic();corrupt.constraints[0].seamId='wrong'
  assert.throws(()=>rankNativeUnderarmHingeAxes(corrupt,{hinges:[left,right]}),/target seam/)
})

test('actual four-panel tee: independent ranking of NEW sleeve axes only, no acceptance',()=>{
  const project=createTemplateProject('tee')
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const initialHinges=discoverNativeDevelopableHinges(original,{maxResults:128}).returned
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const h=initialHinges.find(h=>h.panelId===piece.id&&h.worldAxisAligned&&h.side==='positive')
    assert.ok(h)
    return [piece.id,[h.axisVertices]]
  }))
  const optimized=buildNativeSimulationPayload(project,{quality:'quality',
    experimentalOptimizeMesh:true,experimentalProtectedHingeAxesByPiece:axes,
    experimentalCertifiedPoorFaceFlips:true})
  const pose=rejectedOffbodyDiagnosticPose(optimized)
  const replacements={},protectedEdgesByPiece={}
  for(const piece of pose.pieces.filter(p=>['front','back'].includes(p.id))){
    const mesh={vertices:piece.flatVerticesM.map(v=>[v[0]*100,v[1]*100]),faces:piece.faces}
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
  const frontPose=createNativeDevelopableHingeCandidate(repaired,
    {...front,angleRadians:-.1}).candidate
  const base=createNativeDevelopableHingeCandidate(frontPose,
    {...back,angleRadians:.1}).candidate
  const discovered=discoverNativeDevelopableHinges(base,{maxResults:128})
  assert.equal(discovered.truncated,false)
  const sleeves=discovered.returned.filter(h=>h.panelId.startsWith('sleeve')&&h.worldAxisAligned)
  const sources=[project,original,optimized,pose,repaired,base]
  const frozen=sources.map(x=>JSON.stringify(x))
  const excludedAxisKeys=['sleeve-left:33,34:positive','sleeve-right:33,34:positive']
  const ranked=rankNativeUnderarmHingeAxes(base,{hinges:sleeves,
    anglesRadians:[-.04,.04],excludedAxisKeys})
  assert.equal(ranked.evaluatedAxes,38)
  assert.equal(ranked.evaluatedAngles,76)
  assert.equal(ranked.excludedCount,2)
  assert.ok(ranked.ranked.every(r=>!excludedAxisKeys.includes(r.axisKey)))
  assert.ok(ranked.ranked[0].best.rmsDropMm>1e-3,
    'Submicron max-gap floating-point noise must not outrank actual RMS leverage')
  assert.equal(ranked.axesWithUnderarmImprovement,0,
    'Do not claim a successful maximum-gap reduction from unchanged underarms')
  assert.equal(ranked.safeToAutoApply,false)
  assert.equal(ranked.contactVerified,false)
  const baseline=measureNativeSeamResiduals(base)
  assert.ok(Math.abs(baseline.maxGapMm-345)<1e-8)
  assert.ok(Math.abs(baseline.rmsGapMm-179.744026)<.001)
  // Independent endpoint reconstruction for the strongest *new* axis.
  const best=ranked.ranked[0]
  const endpoint=createNativeDevelopableHingeCandidate(base,
    {...best,angleRadians:best.best.angleRadians}).candidate
  const after=measureNativeSeamResiduals(endpoint)
  const beforeGroup=baseline.groups.find(g=>g.id===best.targetSeamId)
  const afterGroup=after.groups.find(g=>g.id===best.targetSeamId)
  assert.ok(Math.abs(best.best.maxDropMm-(beforeGroup.maxGapMm-afterGroup.maxGapMm))<1e-8)
  assert.ok(Math.abs(best.best.rmsDropMm-(beforeGroup.rmsGapMm-afterGroup.rmsGapMm))<1e-8)
  const strain=auditNativePrincipalStrain(endpoint)
  const exact=inspectNativeInterpanelExactStaticContact(endpoint)
  const avatar=inspectStagedAvatarContact(endpoint)
  const gate=auditNativeSeamCandidate(base,endpoint,{endpointContact:avatar})
  assert.equal(avatar.penetrating,0)
  assert.equal(gate.meshConditioning.illConditionedFaces,36)
  assert.equal(gate.researchScreenPassed,false)
  assert.equal(gate.sampledPathContactChecked,false)
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),frozen)
  console.log('NEW_UNDERARM_AXIS_RANKING '+JSON.stringify({
    baselineMaxGapMm:baseline.maxGapMm,baselineRmsGapMm:baseline.rmsGapMm,
    evaluatedAxes:ranked.evaluatedAxes,evaluatedAngles:ranked.evaluatedAngles,
    axesWithLeverage:ranked.axesWithLeverage,
    axesWithUnderarmImprovement:ranked.axesWithUnderarmImprovement,
    topByPanel:['sleeve-left','sleeve-right'].map(panelId=>({panelId,
      top:ranked.ranked.filter(r=>r.panelId===panelId).slice(0,3)
        .map(r=>({axisKey:r.axisKey,angle:r.best.angleRadians,
          maxDropMm:r.best.maxDropMm,rmsDropMm:r.best.rmsDropMm,
          regressingGroups:r.best.regressingGroups}))})),
    independentTop:{axisKey:best.axisKey,globalMaxGapMm:after.maxGapMm,
      globalRmsGapMm:after.rmsGapMm,
      maximumPrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
      maximumPrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
      exactStaticNearPairs:exact.nearClearancePairs,
      sampledAvatarPenetrations:avatar.penetrating,
      illConditionedRestFaces:gate.meshConditioning.illConditionedFaces},
    runtimeMs:ranked.runtimeMs,stateNonmutation:true,
    contactCertified:false,fitCertified:false}))
})
