import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {
  createNativeDevelopableHingeCandidate,searchNativeDevelopableHingeCandidates,
  inspectNativeHingeArcContactPath,discoverNativeDevelopableHinges,
} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {auditNativeSeamCandidate} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectNativeSampledContactPath} from '../src/core/backends/nativeSampledContactPath.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'

// A six-vertex panel with a TRUE internal triangulation-aligned material
// hinge at x=.5. The right half can fold as a rigid triangle fan while the
// left half stays fixed; no triangle is crossed by the fold line.
function fixture(){
  const front=[[0,0,0],[.5,0,0],[1,0,0],
    [0,1,0],[.5,1,0],[1,1,0]]
  const back=[[0,0,0],[0,1,0],[.2,.5,0]]
  const backWorld=[[.96,0,.2],[.96,1,.2],[1.16,.5,.2]]
  return {
    particles:[...front,...backWorld].map(position=>({position:[...position],invMass:1})),
    pieces:[
      {id:'front',faces:[[0,1,4],[0,4,3],[1,2,5],[1,5,4]],
        flatVerticesM:front,particleIndices:[0,1,2,3,4,5]},
      {id:'back',faces:[[0,1,2]],flatVerticesM:back,particleIndices:[6,7,8]},
    ],
    constraints:[
      {type:'seam',seamId:'sleeve-join',a:2,b:6},
      {type:'seam',seamId:'sleeve-join',a:5,b:7},
    ],virtualSeams:[],
  }
}
const contact=pose=>({
  checked:pose.pieces.reduce((s,p)=>s+p.particleIndices.length+p.faces.length,0),
  penetrating:0,maximumIntrusionMm:0,
  sampledAvatarClearanceOnly:true,sweptCollisionCertified:false,
})
const hinge={panelId:'front',axisVertices:[1,4],side:'negative'}
const fold=(p,angleRadians=-.4)=>createNativeDevelopableHingeCandidate(p,{
  ...hinge,angleRadians})

test('mesh-aligned hinge discovery returns reproducible executable axes without modifying a garment',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const result=discoverNativeDevelopableHinges(source,{maxResults:16})
  assert.equal(result.panels.length,2)
  assert.ok(result.restAlignedAxes>=1)
  assert.ok(result.worldAlignedAxes>=1)
  assert.ok(result.executableHingeSides>=1)
  const selected=result.returned.find(x=>x.panelId==='front'&&
    x.axisVertices.join(',')==='1,4'&&x.side==='negative')
  assert.ok(selected,'Expected material-aligned fold edge not discovered')
  assert.equal(selected.worldAxisAligned,true)
  const {candidate}=createNativeDevelopableHingeCandidate(source,{
    ...selected,angleRadians:-.4})
  const strain=auditNativePrincipalStrain(candidate)
  assert.equal(strain.withinDeclaredStrainLimit,true)
  assert.equal(JSON.stringify(source),frozen)
  assert.deepEqual(discoverNativeDevelopableHinges(source,{maxResults:16}),result)
  assert.equal(result.fitCertified,false)
  assert.equal(result.sweptCollisionCertified,false)
})
test('hinge discovery rejects malformed bounds and pins on moving sides',()=>{
  const source=fixture()
  assert.throws(()=>discoverNativeDevelopableHinges(source,{maxResults:0}),/1..128/)
  assert.throws(()=>discoverNativeDevelopableHinges(source,{maxResults:129}),/1..128/)
  assert.throws(()=>discoverNativeDevelopableHinges(source,{restToleranceM:-1}),/tolerance/)
  assert.throws(()=>discoverNativeDevelopableHinges(source,{worldAxisToleranceM:Infinity}),/tolerance/)
  source.particles[2].invMass=0
  source.particles[5].invMass=0
  const result=discoverNativeDevelopableHinges(source,{maxResults:128})
  assert.equal(result.returned.some(x=>x.panelId==='front'&&
    x.axisVertices.join(',')==='1,4'&&x.side==='negative'),false,
    'A moving pinned vertex must disqualify that hinge side')
})
test('real four-panel hinge inventory exposes rest-remeshing versus foldability tradeoff',()=>{
  const project=createTemplateProject('tee'),projectBefore=JSON.stringify(project)
  const baseline=buildNativeSimulationPayload(project,{quality:'quality'})
  const optimized=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true})
  const before=JSON.stringify(baseline),after=JSON.stringify(optimized)
  const first=discoverNativeDevelopableHinges(baseline,{maxResults:128})
  const second=discoverNativeDevelopableHinges(optimized,{maxResults:128})
  assert.equal(first.panels.length,4)
  assert.equal(second.panels.length,4)
  assert.ok(first.restAlignedAxes>second.restAlignedAxes,
    'Opt-in edge flips unexpectedly preserved all useful material fold lines')
  assert.ok(first.worldAlignedAxes>second.worldAlignedAxes)
  assert.ok(first.executableHingeSides>0)
  assert.ok(second.executableHingeSides>0)
  for(const [payload,inventory] of [[baseline,first],[optimized,second]]){
    for(const option of inventory.returned.filter(x=>x.worldAxisAligned).slice(0,4)){
      const {candidate}=createNativeDevelopableHingeCandidate(payload,{
        ...option,angleRadians:.15})
      assert.equal(candidate.pieces.length,4)
      assert.equal(candidate.particles.length,payload.particles.length)
    }
  }
  assert.equal(JSON.stringify(project),projectBefore)
  assert.equal(JSON.stringify(baseline),before)
  assert.equal(JSON.stringify(optimized),after)
  console.log('FOUR_PANEL_HINGE_DISCOVERY '+JSON.stringify({
    original:{restAlignedAxes:first.restAlignedAxes,worldAlignedAxes:first.worldAlignedAxes,
      executableHingeSides:first.executableHingeSides},
    optInEdgeFlips:{restAlignedAxes:second.restAlignedAxes,
      worldAlignedAxes:second.worldAlignedAxes,
      executableHingeSides:second.executableHingeSides},
    garmentUnchanged:true,fitCertified:false,sweptCCDVerified:false}))
})
test('bounded real four-panel hinge-angle search rejects attractive but physically invalid folds',()=>{
  const project=createTemplateProject('tee'),originalProject=JSON.stringify(project)
  const payload=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true})
  const originalPayload=JSON.stringify(payload)
  const initial=measureNativeSeamResiduals(payload)
  const hinges=discoverNativeDevelopableHinges(payload,{maxResults:128})
  const trials=[]
  const started=performance.now()
  for(const hinge of hinges.returned.filter(h=>h.worldAxisAligned)){
    const result=searchNativeDevelopableHingeCandidates(payload,{
      ...hinge,anglesRadians:[-.2,.2],steps:8,
      checkPose:inspectStagedAvatarContact})
    assert.equal(result.best,null)
    assert.equal(result.acceptedCount,0)
    trials.push(...result.trials)
  }
  assert.equal(hinges.executableHingeSides,6)
  assert.equal(trials.length,12)
  assert.ok(trials.some(t=>t.maximumSeamGapMm<initial.maxGapMm&&
    t.rmsSeamGapMm<initial.rmsGapMm),
  'Research folds should expose a measurable but insufficient seam improvement')
  assert.ok(trials.every(t=>t.researchScreenPassed===false&&
    t.safeToAutoApply===false))
  assert.ok(trials.every(t=>t.maximumPrincipalExtensionPercent>5))
  assert.ok(trials.every(t=>t.endpointPenetrations>0))
  const best=[...trials].sort((a,b)=>a.maximumSeamGapMm-b.maximumSeamGapMm)[0]
  assert.equal(JSON.stringify(payload),originalPayload)
  assert.equal(JSON.stringify(project),originalProject)
  console.log('FOUR_PANEL_HINGE_SEARCH_REJECTED '+JSON.stringify({
    baselineMaxGapMm:initial.maxGapMm,baselineRmsGapMm:initial.rmsGapMm,
    bestExperimentalMaxGapMm:best.maximumSeamGapMm,
    bestExperimentalRmsGapMm:best.rmsSeamGapMm,
    bestExperimentalPrincipalExtensionPercent:best.maximumPrincipalExtensionPercent,
    bestExperimentalEndpointPenetrations:best.endpointPenetrations,
    bestExperimentalPathPenetrations:best.sampledPathPenetrations,
    trialCount:trials.length,accepted:0,
    experimentalWallMs:+(performance.now()-started).toFixed(2),
    projectUnchanged:true,fitCertified:false,sweptCCDVerified:false}))
})
test('mesh-aligned internal hinge improves seam max/RMS with zero material extension/compression',()=>{
  const original=fixture(),frozen=JSON.stringify(original)
  const t=performance.now()
  const {candidate,hinge:meta}=fold(original)
  const endpointContact=contact(candidate)
  const sampledPathContact=inspectNativeSampledContactPath(original,candidate,{
    steps:8,checkPose:contact})
  const gate=auditNativeSeamCandidate(original,candidate,{endpointContact,sampledPathContact})
  const ms=performance.now()-t
  assert.equal(meta.movedVertexCount,2)
  assert.equal(meta.restMeshAligned,true)
  assert.equal(gate.before.pairCount,2)
  assert.ok(gate.before.maxGapMm>200)
  assert.ok(gate.after.maxGapMm<10)
  assert.ok(gate.after.rmsGapMm<10)
  assert.ok(Math.abs(gate.strain.maximumPrincipalExtensionPercent)<1e-7)
  assert.ok(Math.abs(gate.strain.maximumPrincipalCompressionPercent)<1e-7)
  assert.equal(gate.strain.withinDeclaredStrainLimit,true)
  assert.equal(gate.groupMerit.allGroupsNonworse,true)
  assert.equal(gate.meshConditioning.approved,true)
  assert.equal(gate.endpointContactClear,true)
  assert.equal(gate.sampledPathContactClear,true)
  assert.equal(gate.researchScreenPassed,true)
  assert.equal(gate.safeToAutoApply,false)
  assert.equal(gate.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(original),frozen,'Source garment mutated')
  assert.deepEqual(candidate.particles[0],original.particles[0])
  assert.deepEqual(candidate.particles[1],original.particles[1])
  assert.deepEqual(candidate.particles[4],original.particles[4])
  console.log('DEVELOPABLE_HINGE_RESEARCH '+JSON.stringify({
    maxSeamBeforeMm:gate.before.maxGapMm,maxSeamAfterMm:gate.after.maxGapMm,
    rmsBeforeMm:gate.before.rmsGapMm,rmsAfterMm:gate.after.rmsGapMm,
    maximumPrincipalExtensionPercent:gate.strain.maximumPrincipalExtensionPercent,
    maximumPrincipalCompressionPercent:gate.strain.maximumPrincipalCompressionPercent,
    sampledPathPenetrations:sampledPathContact.penetrating,
    experimentalRuntimeMs:+ms.toFixed(3),sourceUnchanged:true,
    actualFourPanelFitCertified:false,sweptCCDVerified:false,
  }))
})
test('candidate rejects a hinge that slices through an unsplit material triangle',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  source.pieces[0].faces[0]=[0,2,4]
  const unchanged=JSON.stringify(source)
  assert.throws(()=>fold(source),/cuts through a triangle/)
  assert.equal(JSON.stringify(source),unchanged)
  assert.notEqual(frozen,unchanged)
})
test('candidate rejects moving pins and preserves fixed on-axis pins',()=>{
  const source=fixture()
  source.particles[2].invMass=0
  assert.throws(()=>fold(source),/pinned/)
  source.particles[2].invMass=1
  source.particles[1].invMass=0
  const {candidate}=fold(source)
  assert.deepEqual(candidate.particles[1],source.particles[1])
  assert.equal(candidate.particles[1].invMass,0)
})
test('hinge refuses off-axis material vertices, invalid angles and missing panels',()=>{
  const source=fixture()
  assert.throws(()=>fold(source,Infinity),/angle/)
  assert.throws(()=>fold(source,4),/angle/)
  assert.throws(()=>createNativeDevelopableHingeCandidate(source,{
    ...hinge,axisVertices:[1,1],angleRadians:-.4}),/distinct/)
  assert.throws(()=>createNativeDevelopableHingeCandidate(source,{
    ...hinge,panelId:'not-a-panel',angleRadians:-.4}),/does not exist/)
  // Add a third rest vertex to the fold line without moving its world pose:
  // it is no longer collinear with the other hinge points in 3D.
  source.pieces[0].flatVerticesM[0]=[.5,.5,0]
  assert.throws(()=>fold(source),/not on the world hinge axis|Degenerate/)
})
test('bounded search selects a feasible hinge and rejects no-improvement candidate',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const result=searchNativeDevelopableHingeCandidates(source,{
    ...hinge,anglesRadians:[0,-.2,-.4],checkPose:contact})
  assert.equal(result.trials.length,3)
  assert.equal(result.trials[0].researchScreenPassed,false)
  assert.equal(result.acceptedCount,2)
  assert.equal(result.best.hinge.angleRadians,-.4)
  assert.ok(result.best.gate.after.maxGapMm<10)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozen)
  assert.throws(()=>searchNativeDevelopableHingeCandidates(source,{
    ...hinge,anglesRadians:Array(13).fill(0),checkPose:contact}),/1..12/)
})
test('contact blocker rejects the folded candidate despite good seam and strain',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const bodyScreen=pose=>{
    const isFolded=pose.particles[2].position[2]>.02
    return {...contact(pose),penetrating:isFolded?1:0,
      maximumIntrusionMm:isFolded?5:0}
  }
  const result=searchNativeDevelopableHingeCandidates(source,{
    ...hinge,anglesRadians:[-.4],checkPose:bodyScreen})
  assert.equal(result.best,null)
  assert.equal(result.acceptedCount,0)
  assert.ok(result.trials[0].maximumSeamGapMm<10)
  assert.ok(result.trials[0].sampledPathPenetrations>0)
  assert.equal(JSON.stringify(source),frozen)
})
test('hinge arc screen catches a curved-path collision invisible to the chord and both endpoints',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const angleRadians=-1.2
  const {candidate}=fold(source,angleRadians)
  // Moving vertex 2 follows x=.5+.5*cos(theta), z=-.5*sin(theta).
  // At theta=-.6 (mid-fold) it crosses this narrow synthetic obstacle.
  // The straight chord between its endpoints stays far from that obstacle.
  const targetX=.5+.5*Math.cos(.6),targetZ=.5*Math.sin(.6)
  const narrowObstacle=pose=>{
    const p=pose.particles[2].position
    const hit=Math.abs(p[0]-targetX)<.002&&Math.abs(p[2]-targetZ)<.002
    return {...contact(pose),penetrating:Number(hit),maximumIntrusionMm:hit?2:0}
  }
  assert.equal(narrowObstacle(source).penetrating,0)
  assert.equal(narrowObstacle(candidate).penetrating,0)
  const chord=inspectNativeSampledContactPath(source,candidate,{
    steps:8,checkPose:narrowObstacle})
  assert.equal(chord.penetrating,0)
  const arc=inspectNativeHingeArcContactPath(source,{
    ...hinge,angleRadians,steps:8,checkPose:narrowObstacle})
  assert.equal(arc.penetrating,1)
  assert.equal(arc.worstFraction,.5)
  assert.equal(arc.checked,7*14)
  assert.equal(arc.sweptCollisionCertified,false)
  const searched=searchNativeDevelopableHingeCandidates(source,{
    ...hinge,anglesRadians:[angleRadians],checkPose:narrowObstacle})
  assert.equal(searched.acceptedCount,0)
  assert.equal(searched.best,null)
  assert.equal(searched.trials[0].chordPathPenetrations,0)
  assert.equal(searched.trials[0].hingeArcPenetrations,1)
  assert.equal(searched.trials[0].sampledPathPenetrations,1)
  assert.equal(searched.trials[0].checkedIntermediateSamples,14*14)
  assert.equal(JSON.stringify(source),frozen)
})
test('hinge arc sampling rejects unbounded work and invalid contact reports',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  assert.throws(()=>inspectNativeHingeArcContactPath(source,{
    ...hinge,angleRadians:-.4,steps:17,checkPose:contact}),/2..16/)
  assert.throws(()=>inspectNativeHingeArcContactPath(source,{
    ...hinge,angleRadians:-.4,steps:8}),/contact screen/)
  assert.throws(()=>inspectNativeHingeArcContactPath(source,{
    ...hinge,angleRadians:-.4,steps:8,checkPose:()=>({
      checked:1,penetrating:2,maximumIntrusionMm:0,sampledAvatarClearanceOnly:true,
    })}),/Invalid sampled hinge arc/)
  assert.throws(()=>inspectNativeHingeArcContactPath(source,{
    ...hinge,angleRadians:-.4,steps:8,checkPose:()=>({
      checked:1,penetrating:0,maximumIntrusionMm:0,sampledAvatarClearanceOnly:true,
    })}),/Invalid sampled hinge arc/)
  assert.equal(JSON.stringify(source),frozen)
})
test('independent spectral oracle catches a nonisometric vertex perturbation',()=>{
  const {candidate}=fold(fixture())
  const before=auditNativePrincipalStrain(candidate)
  assert.equal(before.withinDeclaredStrainLimit,true)
  candidate.particles[2].position[0]+=.04
  const after=auditNativePrincipalStrain(candidate)
  assert.equal(after.withinDeclaredStrainLimit,false)
  assert.ok(after.maximumPrincipalExtensionPercent>5)
})
