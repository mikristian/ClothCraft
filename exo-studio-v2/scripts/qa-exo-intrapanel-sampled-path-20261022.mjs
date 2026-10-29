import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {inspectNativeIntrapanelSampledChord,
  inspectNativeIntrapanelSampledTrajectory} from '../src/core/backends/nativeIntrapanelSampledPathResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {createNativeDevelopableHingeCandidate,
  discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {searchNativeOffbodyRestSeeds} from '../src/core/backends/nativeOffbodyRestSeedResearch.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeInterpanelBroadphase} from '../src/core/backends/nativeInterpanelBroadphaseResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'

const tri=[[0,0,0],[1,0,0],[0,1,0]]
const pair=z=>({
  particles:[...tri,...tri.map(([x,y])=>[x+.1,y+.1,z])].map(position=>({position})),
  pieces:[{id:'cloth',particleIndices:[0,1,2,3,4,5],faces:[[0,1,2],[3,4,5]]}],
})

test('clear endpoints can hide an interior self-intersection',()=>{
  const before=pair(-.4),after=pair(.4),frozen=JSON.stringify(before)
  assert.equal(inspectNativeIntrapanelStaticContact(before).intersectingTrianglePairs,0)
  assert.equal(inspectNativeIntrapanelStaticContact(after).intersectingTrianglePairs,0)
  const result=inspectNativeIntrapanelSampledChord(before,after,{steps:4})
  assert.equal(result.intermediateSamples,3)
  assert.ok(result.intersectingTrianglePairs>=1)
  assert.equal(result.sampledSelfIntersectionsAbsent,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(result.endpointsChecked,false)
  assert.equal(JSON.stringify(before),frozen)
})

test('separated motion does not invent intersections',()=>{
  const before=pair(1),after=pair(2)
  const out=inspectNativeIntrapanelSampledChord(before,after,{steps:4})
  assert.equal(out.intersectingTrianglePairs,0)
  assert.equal(out.sampledSelfIntersectionsAbsent,true)
  assert.equal(out.fitCertified,false)
})

test('sampled motion reports submillimetre static clearance without claiming swept CCD',()=>{
  const source=pair(.0004),frozen=JSON.stringify(source)
  const out=inspectNativeIntrapanelSampledChord(source,source,{steps:4})
  assert.equal(out.intersectingTrianglePairs,0)
  assert.equal(out.nonadjacentNearClearancePairs,3)
  assert.equal(out.edgeNeighborNearFoldoverPairs,0)
  assert.equal(out.sampledSelfIntersectionsAbsent,true)
  assert.equal(out.sampledStaticThicknessScreenClear,false)
  assert.equal(out.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('a curved trajectory is independently sampled, not approximated by its chord',()=>{
  const source=pair(-.4)
  const endpoint=pair(-.4)
  const chord=inspectNativeIntrapanelSampledChord(source,endpoint,{steps:4})
  const arc=inspectNativeIntrapanelSampledTrajectory(source,{
    steps:4,poseAt:fraction=>pair(-.4+.4*Math.sin(Math.PI*fraction)),
  })
  assert.equal(chord.intersectingTrianglePairs,0)
  assert.ok(arc.intersectingTrianglePairs>0)
})

test('topology and pair budgets fail closed',()=>{
  const source=pair(-.4),target=pair(.4)
  target.pieces[0].faces[0]=[0,2,1]
  assert.throws(()=>inspectNativeIntrapanelSampledChord(source,target),/topology mismatch/)
  assert.throws(()=>inspectNativeIntrapanelSampledChord(source,pair(.4),{
    steps:4,maxTotalPairs:1,
  }),/work budget/)
  assert.throws(()=>inspectNativeIntrapanelSampledTrajectory(source,{
    steps:17,poseAt:()=>source,
  }),/2\.\.16/)
})

test('a shared-edge fold-over at an interior hinge pose is rejected within total pair budget',()=>{
  const source={particles:[[0,0,0],[1,0,0],[0,1,0],[0,-1,0]]
    .map(position=>({position:[...position]})),
  pieces:[{id:'fold',particleIndices:[0,1,2,3],faces:[[0,1,2],[0,1,3]]}]}
  const frozen=JSON.stringify(source)
  const result=inspectNativeIntrapanelSampledTrajectory(source,{
    steps:4,maxTotalPairs:3,poseAt:fraction=>{
      const pose=structuredClone(source),angle=2*Math.PI*fraction
      pose.particles[3].position=[0,-Math.cos(angle),-Math.sin(angle)]
      return pose
    },
  })
  assert.equal(result.checkedNonadjacentPairs,0)
  assert.equal(result.checkedTotalPairs,3)
  assert.equal(result.intersectingTrianglePairs,1)
  assert.equal(result.sampledSelfIntersectionsAbsent,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozen)
  assert.throws(()=>inspectNativeIntrapanelSampledTrajectory(source,{
    steps:4,maxTotalPairs:2,poseAt:()=>source,
  }),/work budget/)
})

test('real four-panel offbody seed: one bounded isometric hinge trajectory remains research-only',()=>{
  const project=createTemplateProject('tee'),frozenProject=JSON.stringify(project)
  const source=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true,
  })
  const frozenSource=JSON.stringify(source)
  const started=performance.now()
  const search=searchNativeOffbodyRestSeeds(source,{
    offsetsM:[.35],checkPose:inspectStagedAvatarContact,
  })
  assert.equal(search.best,null,'Submillimetre static cloth clearance blocks this seed')
  assert.equal(search.results[0].intrapanelNonadjacentNearClearancePairs,2)
  const seed=rejectedOffbodyDiagnosticPose(source)
  const hinges=discoverNativeDevelopableHinges(seed,{maxResults:128})
  const hinge=hinges.returned.find(h=>h.panelId==='sleeve-left'&&h.worldAxisAligned)
  assert.ok(hinge,'Need a feasible sleeve hinge in the actual four-panel rest mesh')
  const angleRadians=.15
  const final=createNativeDevelopableHingeCandidate(seed,{
    ...hinge,angleRadians,
  }).candidate
  const path=inspectNativeIntrapanelSampledTrajectory(seed,{
    steps:4,maxTotalPairs:500_000,
    poseAt:fraction=>createNativeDevelopableHingeCandidate(seed,{
      ...hinge,angleRadians:angleRadians*fraction,
    }).candidate,
  })
  const initial=measureNativeSeamResiduals(seed)
  const after=measureNativeSeamResiduals(final)
  const strain=auditNativePrincipalStrain(final,{limitPercent:5})
  const avatar=inspectStagedAvatarContact(final)
  const interpanel=inspectNativeInterpanelBroadphase(final)
  const endpointSelf=inspectNativeIntrapanelStaticContact(final)
  const elapsedMs=performance.now()-started
  assert.equal(seed.pieces.length,4)
  assert.equal(strain.withinDeclaredStrainLimit,true)
  assert.equal(path.intermediateSamples,3)
  assert.equal(path.intersectingTrianglePairs,0)
  assert.equal(endpointSelf.intersectingTrianglePairs,0)
  assert.equal(endpointSelf.staticDisjointThicknessScreenClear,false)
  assert.equal(avatar.penetrating,0)
  assert.equal(interpanel.possibleContactPairs,0)
  assert.ok(after.rmsGapMm>initial.rmsGapMm,
    'This is a contact-safe research motion, NOT a seam-improving garment')
  assert.equal(path.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozenSource)
  assert.equal(JSON.stringify(project),frozenProject)
  console.log('FOUR_PANEL_HINGE_SAMPLED_RESEARCH '+JSON.stringify({
    initialMaxGapMm:initial.maxGapMm,initialRmsGapMm:initial.rmsGapMm,
    candidateMaxGapMm:after.maxGapMm,candidateRmsGapMm:after.rmsGapMm,
    maxPrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
    maxPrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
    avatarPenetrations:avatar.penetrating,avatarSamples:avatar.checked,
    interpanelPotentialContactPairs:interpanel.possibleContactPairs,
    endpointSelfIntersections:endpointSelf.intersectingTrianglePairs,
    pathSelfIntersections:path.intersectingTrianglePairs,
    pathCheckedTrianglePairs:path.checkedNonadjacentPairs,
    runtimeMs:+elapsedMs.toFixed(2),fitCertified:false,
    sweptCollisionCertified:false,safeToAutoApply:false,
  }))
})
