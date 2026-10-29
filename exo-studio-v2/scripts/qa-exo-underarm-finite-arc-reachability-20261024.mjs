// Independent finite-angle oracle: compare exact one-hinge arc lower bounds
// against actual rotated geometry. Contact and simultaneous folds NOT proven.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativeDevelopableHingeCandidate} from
  '../src/core/backends/nativeDevelopableHingeResearch.js'
import {inspectNativeUnderarmFiniteArcReachability} from
  '../src/core/backends/nativeUnderarmFiniteArcReachabilityResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from
  '../src/core/backends/nativeDevelopableHingeResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {searchNativeClearanceAwareMaterialFlips} from
  '../src/core/physics/nativeClearanceAwareFlipResearch.js'
import {rebuildNativeResearchFlipConstraintGraph} from
  '../src/core/physics/nativeFlipConstraintGraphResearch.js'
import {rejectedOffbodyDiagnosticPose} from
  './fixtures/exoRejectedOffbodyPose20261023.mjs'
import {measureNativeSeamResiduals} from
  '../src/core/backends/nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from
  '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeInterpanelExactStaticContact} from
  '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {inspectNativeIntrapanelStaticContact} from
  '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'

function fixture(){
  const rest=[[-1,-1,0],[0,-1,0],[1,-1,0],
    [-1,1,0],[0,1,0],[1,1,0]]
  const faces=[[0,1,4],[0,4,3],[1,2,5],[1,5,4]]
  return {
    pieces:['sleeve-left','sleeve-right'].map((id,j)=>({
      id,particleIndices:rest.map((_,i)=>i+j*6),
      flatVerticesM:rest.map(p=>[...p]),faces:faces.map(f=>[...f])})),
    particles:[...rest,...rest.map(p=>[p[0]+4,p[1],p[2]])]
      .map(position=>({position,invMass:1})),
    constraints:[
      {type:'seam',seamId:'seam-sleeve-l-underarm',a:0,b:2},
      {type:'seam',seamId:'seam-sleeve-r-underarm',a:6,b:8},
    ],
    virtualSeams:[{seamId:'seam-sleeve-l-underarm',
      sourceIndices:[0,3],sourceWeights:[.5,.5],
      targetIndices:[2,5],targetWeights:[.5,.5]}],
  }
}
const hinges=[
  {panelId:'sleeve-left',axisVertices:[1,4],side:'negative',worldAxisAligned:true},
  {panelId:'sleeve-right',axisVertices:[1,4],side:'negative',worldAxisAligned:true},
]
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b}`)
const gap=(p,a,b)=>Math.hypot(...p.particles[a].position.map(
  (v,k)=>v-p.particles[b].position[k]))*1000

test('full-angle arc predicts second-order seam closure missed by zero first derivative',()=>{
  const p=fixture(),before=JSON.stringify(p)
  const audit=inspectNativeUnderarmFiniteArcReachability(p,{hinges})
  assert.equal(audit.axesWithWorstPairReachability,2)
  assert.equal(audit.evaluatedAxes,2)
  assert.equal(audit.fitCertified,false)
  assert.equal(audit.contactCertified,false)
  assert.equal(audit.sweptCollisionCertified,false)
  for(const axis of audit.axes){
    near(axis.initialGroupMaxGapMm,2000)
    near(axis.optimisticWorstPairFloorMm,0)
    near(axis.optimisticGroupMaxFloorMm,0)
    near(axis.bestWorstPairAngle.groupMaxGapMm,0)
    const hinge=hinges.find(h=>h.panelId===axis.panelId)
    const plus=createNativeDevelopableHingeCandidate(p,{
      ...hinge,angleRadians:1e-5}).candidate
    const minus=createNativeDevelopableHingeCandidate(p,{
      ...hinge,angleRadians:-1e-5}).candidate
    const [a,b]=axis.panelId==='sleeve-left'?[0,2]:[6,8]
    near((gap(plus,a,b)-gap(minus,a,b))/(2e-5),0)
    const folded=createNativeDevelopableHingeCandidate(p,{
      ...hinge,angleRadians:axis.bestWorstPairAngle.angleRadians}).candidate
    near(gap(folded,a,b),axis.bestWorstPairAngle.groupMaxGapMm)
  }
  assert.equal(JSON.stringify(p),before)
})

test('invariant same-side sewing pair prevents a false all-worst-pairs claim',()=>{
  const p=fixture()
  p.constraints.push({type:'seam',seamId:'seam-sleeve-l-underarm',a:0,b:3})
  const result=inspectNativeUnderarmFiniteArcReachability(p,{hinges:[hinges[0]]})
  const axis=result.axes[0]
  near(axis.optimisticGroupMaxFloorMm,2000)
  assert.equal(axis.canReduceAllWorstPairs,false)
  assert.equal(axis.bestWorstPairAngle.groupMaxGapMm>=2000-1e-7,true)
})

test('weighted virtual seams, invalid hinge geometry and malformed evidence fail closed',()=>{
  const p=fixture(),before=JSON.stringify(p)
  assert.throws(()=>inspectNativeUnderarmFiniteArcReachability(p,{hinges:[hinges[0],hinges[0]]}),/Duplicate/)
  const boundary={...hinges[0],axisVertices:[0,3]}
  assert.throws(()=>inspectNativeUnderarmFiniteArcReachability(p,{hinges:[boundary]}),
    /Invalid|No material vertices|Hinge|axis|triangle/)
  const malformed=structuredClone(p)
  malformed.virtualSeams[0].sourceWeights=[.4,.4]
  assert.throws(()=>inspectNativeUnderarmFiniteArcReachability(malformed,{hinges:[hinges[0]]}),/Nonunit/)
  const pinned=structuredClone(p);pinned.particles[2].invMass=0
  assert.throws(()=>inspectNativeUnderarmFiniteArcReachability(pinned,{hinges:[hinges[0]]}),/pinned/)
  assert.throws(()=>inspectNativeUnderarmFiniteArcReachability(p,{hinges:[]}),/Invalid/)
  assert.throws(()=>inspectNativeUnderarmFiniteArcReachability(p,{
    hinges:[hinges[0]],minImprovementMm:0}),/Invalid/)
  assert.equal(JSON.stringify(p),before)
})

test('actual four-panel tee: second-order underarm reachability is not physical acceptance',()=>{
  const project=createTemplateProject('tee')
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const initial=discoverNativeDevelopableHinges(original,{maxResults:128}).returned
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const h=initial.find(h=>h.panelId===piece.id&&h.worldAxisAligned&&h.side==='positive')
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
  const ready=discoverNativeDevelopableHinges(repaired,{maxResults:128}).returned
  const front=ready.find(h=>h.panelId==='front'&&h.worldAxisAligned)
  const back=ready.find(h=>h.panelId==='back'&&h.worldAxisAligned)
  const frontPose=createNativeDevelopableHingeCandidate(repaired,
    {...front,angleRadians:-.1}).candidate
  const base=createNativeDevelopableHingeCandidate(frontPose,
    {...back,angleRadians:.1}).candidate
  const sleeves=discoverNativeDevelopableHinges(base,{maxResults:128}).returned
    .filter(h=>h.panelId.startsWith('sleeve')&&h.worldAxisAligned)
  const sources=[project,original,optimized,pose,repaired,frontPose,base]
  const frozen=sources.map(x=>JSON.stringify(x))
  const start=performance.now()
  const audit=inspectNativeUnderarmFiniteArcReachability(base,{hinges:sleeves})
  const elapsed=performance.now()-start
  assert.equal(audit.evaluatedAxes,40)
  assert.equal(audit.axesWithWorstPairReachability,0)
  assert.equal(audit.sourceUnchanged,true)
  const before=measureNativeSeamResiduals(base)
  near(before.maxGapMm,345)
  near(before.rmsGapMm,179.744026,1e-3)
  const promising=audit.axes.filter(a=>a.canReduceAllWorstPairs)
  // Verify a selected analytically predicted finite-angle result by moving
  // the actual triangles, NOT by trusting the analytic report alone.
  const selected=(promising.length?promising:audit.axes)
    .sort((a,b)=>a.optimisticWorstPairFloorMm-b.optimisticWorstPairFloorMm)[0]
  const hinge=sleeves.find(h=>`${h.panelId}:${h.axisVertices.join(',')}:${h.side}`===selected.key)
  assert.ok(hinge)
  const candidate=createNativeDevelopableHingeCandidate(base,{
    ...hinge,angleRadians:selected.bestWorstPairAngle.angleRadians}).candidate
  const after=measureNativeSeamResiduals(candidate)
  const id=selected.groupId
  const row=after.groups.find(g=>g.id===id)
  near(row.maxGapMm,selected.bestWorstPairAngle.groupMaxGapMm,1e-5)
  near(row.rmsGapMm,selected.bestWorstPairAngle.groupRmsGapMm,1e-5)
  const strain=auditNativePrincipalStrain(candidate)
  const avatar=inspectStagedAvatarContact(candidate)
  const inter=inspectNativeInterpanelExactStaticContact(candidate)
  const self=inspectNativeIntrapanelStaticContact(candidate)
  assert.deepEqual(sources.map(x=>JSON.stringify(x)),frozen)
  console.log('UNDERARM_FINITE_ARC_REACHABILITY '+JSON.stringify({
    axes:audit.evaluatedAxes,axesWithWorstPairReachability:promising.length,
    bestPotentialWorstPairImprovementMm:Math.max(...audit.axes.map(
      a=>a.potentialWorstPairImprovementMm)),
    selectedAxis:selected.key,selectedAngleRadians:selected.bestWorstPairAngle.angleRadians,
    selectedOptimisticWorstPairFloorMm:selected.optimisticWorstPairFloorMm,
    beforeMaxGapMm:before.maxGapMm,beforeRmsGapMm:before.rmsGapMm,
    afterMaxGapMm:after.maxGapMm,afterRmsGapMm:after.rmsGapMm,
    underarmMaxGapMm:row.maxGapMm,underarmRmsGapMm:row.rmsGapMm,
    principalExtensionPercent:strain.maximumPrincipalExtensionPercent,
    principalCompressionPercent:strain.maximumPrincipalCompressionPercent,
    avatarPenetrations:avatar.penetrating,
    staticInterpanelNearPairs:inter.nearClearancePairs,
    staticIntrapanelNearPairs:self.nonadjacentNearClearancePairs,
    runtimeMs:+elapsed.toFixed(2),stateNonmutation:true,
    fitCertified:false,sweptCollisionCertified:false}))
})
