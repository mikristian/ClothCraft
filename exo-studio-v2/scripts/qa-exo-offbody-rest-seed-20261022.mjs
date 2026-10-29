// One bounded actual four-panel research iteration; no builds, saves or UI.
import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {searchNativeOffbodyRestSeeds} from '../src/core/backends/nativeOffbodyRestSeedResearch.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectNativeInterpanelBroadphase} from '../src/core/backends/nativeInterpanelBroadphaseResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'

test('real four-panel offbody seed respects axis-specific soft garment anchors',()=>{
  const project=createTemplateProject('tee')
  const projectSnapshot=JSON.stringify(project)
  const source=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true,
  })
  const sourceSnapshot=JSON.stringify(source)
  assert.equal(source.pieces.length,4)
  assert.equal(source.particles.length,500)
  const start=performance.now()
  const out=searchNativeOffbodyRestSeeds(source,{
    offsetsM:[.35,.7,1.05,1.4],checkPose:inspectStagedAvatarContact,
  })
  const runtimeMs=performance.now()-start
  assert.equal(out.trialCount,4)
  assert.equal(out.best,null,'Static cloth thickness now blocks this offbody seed')
  assert.equal(out.restAndEndpointFeasible,false)
  assert.equal(source.anchors.length,2)
  assert.ok(source.anchors.every(anchor=>anchor.axes==='y'))
  const near=out.results[0]
  assert.equal(near.contactPenetrations,0)
  assert.equal(near.contactChecked,1268)
  assert.equal(near.violatingTriangles,0)
  assert.equal(near.materialValid,true)
  assert.equal(near.interpanelBroadphaseClear,true)
  assert.equal(near.interpanelPotentialContactPairs,0)
  assert.equal(near.interpanelExactStaticClear,true)
  assert.equal(near.interpanelExactNearClearancePairs,0)
  assert.equal(near.intrapanelStaticIntersectionFree,true)
  assert.equal(near.intrapanelIntersectingTrianglePairs,0)
  assert.equal(near.intrapanelNonadjacentNearClearancePairs,2)
  assert.ok(out.results.every(row=>row.intrapanelNonadjacentNearClearancePairs===2))
  assert.ok(near.intrapanelPossibleAabbContactPairs>0,
    'Static narrow-phase must not mistake harmless flat-mesh AABB overlap for intersection')
  // Count eligible face pairs independently from mesh topology. Vertex-only
  // neighbors are now screened; the old 73,839 constant excluded them.
  const eligiblePairs=source.pieces.reduce((total,piece)=>total+
    piece.faces.reduce((count,face,i)=>count+piece.faces.slice(i+1)
      .filter(other=>face.filter(v=>other.includes(v)).length<2).length,0),0)
  assert.equal(eligiblePairs,76912)
  assert.equal(near.intrapanelCheckedNonadjacentPairs,eligiblePairs)
  assert.ok(near.interpanelMinimumAabbDistanceMm>1)
  assert.equal(near.activeAnchorCount,2)
  assert.equal(near.anchorsCompatible,true)
  assert.ok(near.maximumAnchorDisplacementMm<1e-6)
  assert.ok(near.maximumAnchorTargetResidualMm<1e-6)
  assert.equal(out.sweptCollisionCertified,false)
  assert.equal(out.selfCollisionCertified,false)
  assert.equal(out.sewingComplete,false)
  assert.equal(out.safeToAutoApply,false)
  const rejected=rejectedOffbodyDiagnosticPose(source)
  const material=auditNativePrincipalStrain(rejected,{limitPercent:5})
  assert.ok(Math.abs(material.maximumPrincipalExtensionPercent)<1e-7)
  assert.ok(Math.abs(material.maximumPrincipalCompressionPercent)<1e-7)
  const seams=measureNativeSeamResiduals(rejected)
  assert.equal(seams.pairCount,out.before.pairCount)
  assert.equal(JSON.stringify(rejected.constraints),JSON.stringify(source.constraints))
  assert.equal(JSON.stringify(rejected.virtualSeams),JSON.stringify(source.virtualSeams))
  assert.equal(JSON.stringify(project),projectSnapshot,'Source garment was modified')
  assert.equal(JSON.stringify(source),sourceSnapshot,'Original native payload was modified')
  console.log('FOUR_PANEL_OFFBODY_REST_RESEARCH '+JSON.stringify({
    originalMaxGapMm:out.before.maxGapMm,originalRmsGapMm:out.before.rmsGapMm,
    selectedOffsetM:near.offsetM,
    seedMaxGapMm:seams.maxGapMm,seedRmsGapMm:seams.rmsGapMm,
    maxPrincipalExtensionPercent:material.maximumPrincipalExtensionPercent,
    maxPrincipalCompressionPercent:material.maximumPrincipalCompressionPercent,
    sampledAvatarPenetrations:near.contactPenetrations,
    staticInterpanelPotentialPairs:near.interpanelPotentialContactPairs,
    minimumInterpanelAabbGapMm:near.interpanelMinimumAabbDistanceMm,
    intrapanelAabbCandidates:near.intrapanelPossibleAabbContactPairs,
    intrapanelExactIntersections:near.intrapanelIntersectingTrianglePairs,
    intrapanelCheckedNonadjacentPairs:near.intrapanelCheckedNonadjacentPairs,
    activeAnchors:near.activeAnchorCount,
    maximumAnchorDisplacementMm:near.maximumAnchorDisplacementMm,
    maximumAnchorTargetResidualMm:near.maximumAnchorTargetResidualMm,
    anchorCompatible:true,anchorAxes:'y',
    contactSamples:near.contactChecked,trialCount:out.trialCount,
    runtimeMs:+runtimeMs.toFixed(2),
    sewingComplete:false,avatarReentryCertified:false,
    selfCollisionCertified:false,sweptCCDVerified:false,fitCertified:false,
  }))
})

test('interpanel AABB broadphase detects overlapping and near-touching triangles, not just vertex samples',()=>{
  const build=gap=>({
    particles:[[0,0,0],[1,0,0],[0,1,0],[0,0,gap],[1,0,gap],[0,1,gap]]
      .map(position=>({position})),
    pieces:[{id:'A',particleIndices:[0,1,2],faces:[[0,1,2]]},
      {id:'B',particleIndices:[3,4,5],faces:[[0,1,2]]}],
  })
  const overlap=inspectNativeInterpanelBroadphase(build(0))
  assert.equal(overlap.checkedTrianglePairs,1)
  assert.equal(overlap.possibleContactPairs,1)
  assert.equal(overlap.staticInterpanelBroadphaseClear,false)
  const near=inspectNativeInterpanelBroadphase(build(.0005))
  assert.equal(near.staticInterpanelBroadphaseClear,false)
  const clear=inspectNativeInterpanelBroadphase(build(.02))
  assert.equal(clear.possibleContactPairs,0)
  assert.equal(clear.staticInterpanelBroadphaseClear,true)
  assert.ok(Math.abs(clear.minimumAabbDistanceMm-20)<1e-8)
  assert.equal(clear.sweptCollisionCertified,false)
  assert.equal(clear.samePanelSelfCollisionChecked,false)
  assert.throws(()=>inspectNativeInterpanelBroadphase(build(.02),{maxPairs:0}),/work budget/)
  assert.throws(()=>inspectNativeInterpanelBroadphase(build(.02),{clearanceM:-.1}),/clearance/)
})

test('offbody seed refuses overlapping cloth panels even if avatar-only screen reports clear',()=>{
  const project=createTemplateProject('tee')
  const source=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true,
  })
  // Force all source panel centers onto one depth plane. A large positive
  // offbody offset will NOT fix inter-panel overlap between flat sheets.
  const samePlane=structuredClone(source)
  samePlane.particles.forEach(p=>{p.position[2]=0})
  const before=JSON.stringify(samePlane)
  const fakeAvatarClear=pose=>({
    sampledAvatarClearanceOnly:true,
    checked:pose.pieces.reduce((sum,p)=>sum+p.particleIndices.length+p.faces.length,0),
    penetrating:0,maximumIntrusionMm:0,
  })
  const result=searchNativeOffbodyRestSeeds(samePlane,{
    offsetsM:[1.4],checkPose:fakeAvatarClear,
  })
  assert.equal(result.best,null)
  assert.equal(result.restAndEndpointFeasible,false)
  assert.equal(result.results[0].contactClear,true)
  assert.equal(result.results[0].materialValid,true)
  assert.equal(result.results[0].interpanelBroadphaseClear,false)
  assert.ok(result.results[0].interpanelPotentialContactPairs>0)
  assert.equal(result.results[0].interpanelExactStaticClear,false)
  assert.ok(result.results[0].interpanelExactNearClearancePairs>0)
  assert.equal(JSON.stringify(samePlane),before)
})

test('offbody seed rejects pinned cloth, invalid offset grids and incomplete contact',()=>{
  const project=createTemplateProject('tee')
  const source=buildNativeSimulationPayload(project,{quality:'quality'})
  assert.throws(()=>searchNativeOffbodyRestSeeds(source,{
    offsetsM:Array(7).fill(.5),checkPose:inspectStagedAvatarContact,
  }),/1..6/)
  assert.throws(()=>searchNativeOffbodyRestSeeds(source,{
    offsetsM:[.4,.4],checkPose:inspectStagedAvatarContact,
  }),/unique/)
  assert.throws(()=>searchNativeOffbodyRestSeeds(source,{
    offsetsM:[.4],maxAnchorDisplacementM:-1,checkPose:inspectStagedAvatarContact,
  }),/anchor displacement limit/)
  const invalidAnchors=structuredClone(source)
  invalidAnchors.anchors[0].axes='nonsense'
  assert.throws(()=>searchNativeOffbodyRestSeeds(invalidAnchors,{
    offsetsM:[.4],checkPose:inspectStagedAvatarContact,
  }),/anchor axes/)
  const zAnchored=structuredClone(source)
  zAnchored.anchors[0].axes='z'
  const incompatible=searchNativeOffbodyRestSeeds(zAnchored,{
    offsetsM:[.35],checkPose:inspectStagedAvatarContact,
  })
  assert.equal(incompatible.best,null,
    'An active Z-anchor must reject a displaced off-body seed')
  assert.equal(incompatible.results[0].anchorsCompatible,false)
  assert.ok(incompatible.results[0].maximumAnchorDisplacementMm>250)
  assert.throws(()=>searchNativeOffbodyRestSeeds(source,{
    offsetsM:[.4],checkPose:()=>({checked:1,penetrating:0,
      maximumIntrusionMm:0,sampledAvatarClearanceOnly:true}),
  }),/Incomplete/)
  const pinned=structuredClone(source)
  pinned.particles[0].invMass=0
  assert.throws(()=>searchNativeOffbodyRestSeeds(pinned,{
    offsetsM:[.4],checkPose:inspectStagedAvatarContact,
  }),/pinned/)
})
