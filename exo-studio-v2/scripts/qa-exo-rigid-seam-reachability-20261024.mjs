// Independent rigid-motion oracle for same-panel sewing impossibility.
// No solver execution, garment save, contact exemption or app modification.
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
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeInterpanelExactStaticContact} from
  '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {inspectNativeIntrapanelStaticContact} from
  '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeRigidSeamReachability} from
  '../src/core/backends/nativeRigidSeamReachabilityResearch.js'

function fixture(){
  return {pieces:[
    {id:'sleeve-left',particleIndices:[0,1,2],
      flatVerticesM:[[0,0,0],[1,0,0],[0,1,0]],faces:[[0,1,2]]},
    {id:'front',particleIndices:[3,4,5],
      flatVerticesM:[[0,0,0],[1,0,0],[0,1,0]],faces:[[0,1,2]]}],
    particles:[[0,0,0],[1,0,0],[0,1,0],[3,0,0],[4,0,0],[3,1,0]]
      .map(position=>({position,invMass:1})),
    constraints:[
      {type:'seam',seamId:'same-panel',a:0,b:1},
      {type:'seam',seamId:'cross-panel',a:1,b:3}],
    virtualSeams:[{seamId:'weighted-same',
      sourceIndices:[0,1],sourceWeights:[.25,.75],
      targetIndices:[2],targetWeights:[1]}]}
}
function rigidMove(payload,id,{angle=.27,shift=[.03,-.02,.01]}={}){
  const next=structuredClone(payload)
  const piece=next.pieces.find(p=>p.id===id)
  const c=Math.cos(angle),s=Math.sin(angle)
  for(const index of piece.particleIndices){
    const p=next.particles[index].position
    next.particles[index].position=[
      c*p[0]-s*p[1]+shift[0],s*p[0]+c*p[1]+shift[1],p[2]+shift[2]]
  }
  return next
}
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`)
const group=(audit,id)=>audit.groups.find(g=>g.id===id)

test('same-panel and weighted sewing pairs provide exact rigid-only max/RMS floors',()=>{
  const p=fixture(),frozen=JSON.stringify(p)
  const a=inspectNativeRigidSeamReachability(p)
  assert.equal(a.pairCount,3)
  assert.equal(a.invariantPairCount,2)
  near(group(a,'same-panel').rigidOnlyMaxFloorMm,1000)
  near(group(a,'weighted-same').rigidOnlyMaxFloorMm,1250)
  near(group(a,'cross-panel').rigidOnlyMaxFloorMm,0)
  near(a.rigidOnlyMaxFloorMm,1250)
  near(a.rigidOnlyRmsFloorMm,Math.hypot(1000,1250)/Math.sqrt(3))
  assert.equal(a.fitCertified,false)
  assert.equal(a.contactCertified,false)
  assert.equal(a.sweptCollisionCertified,false)
  assert.equal(a.safeToAutoApply,false)
  const moved=rigidMove(rigidMove(p,'sleeve-left'),'front',
    {angle:-.6,shift:[-.15,.13,.08]})
  const b=inspectNativeRigidSeamReachability(moved)
  near(b.rigidOnlyMaxFloorMm,a.rigidOnlyMaxFloorMm)
  near(b.rigidOnlyRmsFloorMm,a.rigidOnlyRmsFloorMm)
  near(group(b,'same-panel').currentMaxGapMm,1000)
  near(group(b,'weighted-same').currentMaxGapMm,1250)
  assert.notEqual(group(b,'cross-panel').currentMaxGapMm,
    group(a,'cross-panel').currentMaxGapMm)
  assert.equal(JSON.stringify(p),frozen)
})

test('bad ownership, nonunit virtual weights, missing seam and work budgets fail closed',()=>{
  const p=fixture(),frozen=JSON.stringify(p)
  const duplicate=structuredClone(p);duplicate.pieces[1].particleIndices[0]=0
  assert.throws(()=>inspectNativeRigidSeamReachability(duplicate),/shared/)
  const missing=structuredClone(p);missing.constraints[0].b=999
  assert.throws(()=>inspectNativeRigidSeamReachability(missing),/index/)
  const bad=structuredClone(p);bad.virtualSeams[0].sourceWeights=[.5,.4]
  assert.throws(()=>inspectNativeRigidSeamReachability(bad),/Nonunit/)
  const noSeams=structuredClone(p);noSeams.constraints=[];noSeams.virtualSeams=[]
  assert.throws(()=>inspectNativeRigidSeamReachability(noSeams),/Missing/)
  const overflow=structuredClone(p)
  overflow.particles[1].position=[1e308,0,0]
  overflow.particles[0].position=[-1e308,0,0]
  assert.throws(()=>inspectNativeRigidSeamReachability(overflow),/Nonfinite/)
  assert.throws(()=>inspectNativeRigidSeamReachability(p,{maxPairs:2}),/budget/)
  assert.equal(JSON.stringify(p),frozen)
})

test('real repaired four-panel tee: rigid-only underarm floor survives independent sleeve rigid motions',()=>{
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
  const sources=[project,original,optimized,pose,repaired,frontPose,base]
  const frozen=sources.map(x=>JSON.stringify(x))
  const start=performance.now()
  const reach=inspectNativeRigidSeamReachability(base)
  const runtimeMs=performance.now()-start
  const before=measureNativeSeamResiduals(base)
  near(reach.currentMaxGapMm,before.maxGapMm)
  near(reach.currentRmsGapMm,before.rmsGapMm)
  near(reach.currentMaxGapMm,345)
  near(reach.currentRmsGapMm,179.744026,1e-3)
  for(const [id,a,b] of [
    ['seam-sleeve-l-underarm',314,317],
    ['seam-sleeve-r-underarm',409,412]]){
    const row=group(reach,id)
    assert.equal(row.invariantPairCount,5)
    near(row.rigidOnlyMaxFloorMm,345)
    near(row.rigidOnlyRmsFloorMm,332.617460,1e-3)
    assert.deepEqual(row.worstInvariantPairs[0].endpointA,[a])
    assert.deepEqual(row.worstInvariantPairs[0].endpointB,[b])
    near(row.worstInvariantPairs[0].restGapMm,345)
  }
  near(reach.rigidOnlyMaxFloorMm,345)
  const translated=rigidMove(rigidMove(base,'sleeve-left',{
    angle:.23,shift:[.012,.018,.006]}),'sleeve-right',
    {angle:-.17,shift:[-.009,-.015,.004]})
  const moved=inspectNativeRigidSeamReachability(translated)
  near(moved.rigidOnlyMaxFloorMm,reach.rigidOnlyMaxFloorMm)
  near(moved.rigidOnlyRmsFloorMm,reach.rigidOnlyRmsFloorMm)
  for(const id of ['seam-sleeve-l-underarm','seam-sleeve-r-underarm']){
    near(group(moved,id).currentMaxGapMm,group(reach,id).currentMaxGapMm)
    near(group(moved,id).currentRmsGapMm,group(reach,id).currentRmsGapMm)
  }
  const strain=auditNativePrincipalStrain(base)
  const movedStrain=auditNativePrincipalStrain(translated)
  const avatar=inspectStagedAvatarContact(base)
  const exact=inspectNativeInterpanelExactStaticContact(base)
  const self=inspectNativeIntrapanelStaticContact(base)
  const movedAvatar=inspectStagedAvatarContact(translated)
  const movedExact=inspectNativeInterpanelExactStaticContact(translated)
  const movedSelf=inspectNativeIntrapanelStaticContact(translated)
  assert.ok(strain.maximumPrincipalExtensionPercent<1e-7)
  assert.ok(strain.maximumPrincipalCompressionPercent<1e-7)
  assert.ok(movedStrain.maximumPrincipalExtensionPercent<1e-7)
  assert.ok(movedStrain.maximumPrincipalCompressionPercent<1e-7)
  assert.equal(avatar.penetrating,0)
  assert.equal(exact.nearClearancePairs,0)
  assert.equal(self.nonadjacentNearClearancePairs,0)
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),frozen)
  console.log('RIGID_SEAM_REACHABILITY '+JSON.stringify({
    currentMaxGapMm:reach.currentMaxGapMm,currentRmsGapMm:reach.currentRmsGapMm,
    rigidOnlyMaxFloorMm:reach.rigidOnlyMaxFloorMm,
    rigidOnlyRmsFloorMm:reach.rigidOnlyRmsFloorMm,
    invariantPairCount:reach.invariantPairCount,pairCount:reach.pairCount,
    underarms:reach.groups.filter(g=>g.id.includes('underarm')).map(g=>({
      id:g.id,invariantPairCount:g.invariantPairCount,
      rigidOnlyMaxFloorMm:g.rigidOnlyMaxFloorMm,
      rigidOnlyRmsFloorMm:g.rigidOnlyRmsFloorMm})),
    principalExtensionPercent:strain.maximumPrincipalExtensionPercent,
    principalCompressionPercent:strain.maximumPrincipalCompressionPercent,
    sampledAvatarPenetrations:avatar.penetrating,
    staticInterpanelNearPairs:exact.nearClearancePairs,
    staticSelfNearPairs:self.nonadjacentNearClearancePairs,
    translatedStaticInterpanelNearPairs:movedExact.nearClearancePairs,
    translatedStaticSelfNearPairs:movedSelf.nonadjacentNearClearancePairs,
    translatedSampledAvatarPenetrations:movedAvatar.penetrating,
    translatedPrincipalExtensionPercent:movedStrain.maximumPrincipalExtensionPercent,
    runtimeMs:+runtimeMs.toFixed(2),stateNonmutation:true,
    fitCertified:false,sweptCollisionCertified:false}))
})
