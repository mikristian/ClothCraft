// Independent finite-difference oracle for a read-only analytical seam Jacobian.
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
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectNativeUnderarmWorstPairJacobian} from
  '../src/core/backends/nativeUnderarmWorstPairJacobianResearch.js'

function synthetic(){
  const coords=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[1,0,.05],
    [3,0,0],[4,0,0],[4,1,0],[3,1,0],[4,0,.05]]
  const pieces=[['sleeve-left',[0,1,2,3]],['sleeve-right',[5,6,7,8]]]
    .map(([id,indices])=>({id,particleIndices:indices,
      flatVerticesM:indices.map(i=>coords[i].map((v,j)=>j===2?0:v)),
      faces:[[0,1,2],[0,2,3]]}))
  return {particles:coords.map(position=>({position:[...position],invMass:1})),
    pieces,constraints:[
      {type:'seam',seamId:'seam-sleeve-l-underarm',a:1,b:4},
      {type:'seam',seamId:'seam-sleeve-r-underarm',a:6,b:9}]}
}
const hinge=panelId=>({panelId,axisVertices:[0,2],side:'negative',
  worldAxisAligned:true})
const group=(metrics,id)=>metrics.groups.find(g=>g.id===id)

test('synthetic analytical worst-pair derivative matches independently measured centered finite difference',()=>{
  const reference=synthetic(),frozen=JSON.stringify(reference)
  const hinges=[hinge('sleeve-left'),hinge('sleeve-right')]
  const audit=inspectNativeUnderarmWorstPairJacobian(reference,{hinges})
  assert.equal(audit.evaluatedAxes,2)
  assert.equal(audit.safeToAutoApply,false)
  assert.equal(audit.contactCertified,false)
  assert.equal(audit.sweptCollisionCertified,false)
  for(const h of hinges){
    const id=h.panelId==='sleeve-left'?'seam-sleeve-l-underarm':'seam-sleeve-r-underarm'
    const row=audit.groups.find(g=>g.id===id).worstPairs[0]
    const analytical=row.sensitivities.find(s=>s.panelId===h.panelId)
    const eps=1e-5
    const plus=createNativeDevelopableHingeCandidate(reference,{...h,angleRadians:eps}).candidate
    const minus=createNativeDevelopableHingeCandidate(reference,{...h,angleRadians:-eps}).candidate
    const numerical=(group(measureNativeSeamResiduals(plus),id).maxGapMm-
      group(measureNativeSeamResiduals(minus),id).maxGapMm)/(2*eps)
    assert.ok(Math.abs(analytical.signedDerivativeMmPerRad-numerical)<1e-6,
      `Analytical ${analytical.signedDerivativeMmPerRad} vs independent ${numerical}`)
    assert.equal(analytical.firstOrderLeverage,true)
  }
  assert.equal(JSON.stringify(reference),frozen)
})

test('malformed weighted seams, missing group, duplicate axes, invalid hinges and pins reject without mutation',()=>{
  const ref=synthetic(),frozen=JSON.stringify(ref),h=hinge('sleeve-left')
  assert.throws(()=>inspectNativeUnderarmWorstPairJacobian(ref,{hinges:[h,h]}),/Duplicate/)
  assert.throws(()=>inspectNativeUnderarmWorstPairJacobian(ref,{hinges:[{...h,side:'broken'}]}),/Invalid/)
  assert.throws(()=>inspectNativeUnderarmWorstPairJacobian(ref,{hinges:[{...h,axisVertices:[0,1]}]}),/interior edge/)
  assert.throws(()=>inspectNativeUnderarmWorstPairJacobian(ref,{hinges:[h],maxHinges:0}),/bounded/)
  const missing=structuredClone(ref);missing.constraints.pop()
  assert.throws(()=>inspectNativeUnderarmWorstPairJacobian(missing,{hinges:[h]}),/Missing/)
  const weighted=structuredClone(ref)
  weighted.virtualSeams=[{seamId:'seam-sleeve-l-underarm',
    sourceIndices:[1,2],sourceWeights:[.4,.4],
    targetIndices:[4],targetWeights:[1]}]
  assert.throws(()=>inspectNativeUnderarmWorstPairJacobian(weighted,{hinges:[h]}),/Nonunit/)
  const pinned=structuredClone(ref);pinned.particles[1].invMass=0
  assert.throws(()=>inspectNativeUnderarmWorstPairJacobian(pinned,{hinges:[h]}),/pinned/)
  assert.equal(JSON.stringify(ref),frozen)
})

test('weighted virtual underarm seam has the correct independent finite-difference derivative',()=>{
  const reference=synthetic(),frozen=JSON.stringify(reference)
  reference.constraints.shift()
  reference.virtualSeams=[{seamId:'seam-sleeve-l-underarm',
    sourceIndices:[1,3],sourceWeights:[.25,.75],
    targetIndices:[4],targetWeights:[1]}]
  const stable=JSON.stringify(reference),h=hinge('sleeve-left')
  const row=inspectNativeUnderarmWorstPairJacobian(reference,{hinges:[h]})
    .groups.find(g=>g.id==='seam-sleeve-l-underarm').worstPairs[0]
  const derivative=row.sensitivities[0].signedDerivativeMmPerRad
  const eps=1e-5
  const plus=createNativeDevelopableHingeCandidate(reference,{...h,angleRadians:eps}).candidate
  const minus=createNativeDevelopableHingeCandidate(reference,{...h,angleRadians:-eps}).candidate
  const numerical=(group(measureNativeSeamResiduals(plus),'seam-sleeve-l-underarm').maxGapMm-
    group(measureNativeSeamResiduals(minus),'seam-sleeve-l-underarm').maxGapMm)/(2*eps)
  assert.ok(Math.abs(derivative-numerical)<1e-6)
  assert.equal(JSON.stringify(reference),stable)
  assert.notEqual(stable,frozen)
})

test('real four-panel repaired tee: report exact worst-pair identities and hinge differential reachability',()=>{
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
  const frontPose=createNativeDevelopableHingeCandidate(repaired,
    {...front,angleRadians:-.1}).candidate
  const base=createNativeDevelopableHingeCandidate(frontPose,
    {...back,angleRadians:.1}).candidate
  const sleeves=discoverNativeDevelopableHinges(base,{maxResults:128}).returned
    .filter(h=>h.panelId.startsWith('sleeve')&&h.worldAxisAligned)
  const sources=[project,original,optimized,pose,repaired,base]
  const snapshots=sources.map(x=>JSON.stringify(x))
  const started=performance.now()
  const audit=inspectNativeUnderarmWorstPairJacobian(base,{hinges:sleeves})
  const elapsed=performance.now()-started
  assert.equal(audit.evaluatedAxes,40)
  for(const row of audit.groups){
    assert.equal(row.pairCount,5)
    assert.ok(Math.abs(row.maxGapMm-345)<1e-8)
    assert.ok(row.worstPairs.length>=1)
    assert.ok(row.worstPairs.every(p=>p.sensitivities.length===40))
  }
  // Independent finite-angle oracle: selected analytic derivatives predict
  // the centered derivative of the corresponding *individual* worst pair.
  // No trial is accepted or saved; no finite-angle contact safety is inferred.
  const h=sleeves.find(h=>h.panelId==='sleeve-left'&&h.axisVertices.join(',')==='33,34'&&h.side==='positive')
  assert.ok(h)
  const row=audit.groups[0].worstPairs[0]
  const s=row.sensitivities.find(s=>s.axisKey===`${h.panelId}:${h.axisVertices.join(',')}:${h.side}`)
  assert.ok(s)
  const eps=1e-5
  const plus=createNativeDevelopableHingeCandidate(base,{...h,angleRadians:eps}).candidate
  const minus=createNativeDevelopableHingeCandidate(base,{...h,angleRadians:-eps}).candidate
  const pairGap=(candidate,pair)=>{
    const a=candidate.particles[pair.endpointA[0]].position
    const b=candidate.particles[pair.endpointB[0]].position
    return Math.hypot(...a.map((v,k)=>v-b[k]))*1000
  }
  // Direct seam endpoints are required for this finite-difference oracle.
  assert.equal(row.endpointA.length,1)
  assert.equal(row.endpointB.length,1)
  const numerical=(pairGap(plus,row)-pairGap(minus,row))/(2*eps)
  assert.ok(Math.abs(s.signedDerivativeMmPerRad-numerical)<1e-5)
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),snapshots)
  console.log('UNDERARM_WORST_PAIR_JACOBIAN '+JSON.stringify({
    groups:audit.groups.map(g=>({id:g.id,pairCount:g.pairCount,
      maxGapMm:g.maxGapMm,axesWithFirstOrderLeverage:g.axesWithFirstOrderLeverage,
      axesMovingEveryWorstPair:g.axesMovingEveryWorstPair,
      worstPairs:g.worstPairs.map(p=>({pairIndex:p.pairIndex,
        gapMm:p.gapMm,endpointA:p.endpointA,endpointB:p.endpointB,
        nonzeroDerivatives:p.sensitivities.filter(s=>s.firstOrderLeverage).length}))})),
    runtimeMs:+elapsed.toFixed(2),stateNonmutation:true,fitCertified:false}))
})
