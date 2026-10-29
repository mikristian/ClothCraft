import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {searchNativeCoupledHingeCandidates} from '../src/core/backends/nativeCoupledHingeResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'

// Two independently developable panels. Their sewn ends start ~150 mm
// apart. The first fold must temporarily make the seam MUCH worse before
// the second fold can bring it below 70 mm without in-plane stretching.
// A greedy per-fold seam-improvement gate would reject the valid sequence.
const material=[[0,0,0],[.5,0,0],[1,0,0],
  [0,1,0],[.5,1,0],[1,1,0]]
const faces=[[0,1,4],[0,4,3],[1,2,5],[1,5,4]]
function fixture(){
  const front=material.map(x=>[...x])
  const back=material.map(([x,y,z])=>[x+.112,y,z-.1])
  return {
    particles:[...front,...back].map(position=>({position,invMass:1})),
    pieces:[
      {id:'front',faces:faces.map(x=>[...x]),flatVerticesM:material.map(x=>[...x]),
        particleIndices:[0,1,2,3,4,5]},
      {id:'back',faces:faces.map(x=>[...x]),flatVerticesM:material.map(x=>[...x]),
        particleIndices:[6,7,8,9,10,11]},
    ],
    constraints:[{type:'seam',seamId:'join',a:2,b:8},
      {type:'seam',seamId:'join',a:5,b:11}],virtualSeams:[],
  }
}
const first={panelId:'front',axisVertices:[1,4],side:'negative'}
const second={panelId:'back',axisVertices:[1,4],side:'negative'}
const clear=pose=>({
  checked:pose.pieces.reduce((sum,p)=>sum+p.particleIndices.length+p.faces.length,0),
  penetrating:0,maximumIntrusionMm:0,sampledAvatarClearanceOnly:true,
  sweptCollisionCertified:false,
})
const run=(source,overrides={})=>searchNativeCoupledHingeCandidates(source,{
  first,second,firstAnglesRadians:[-.4],secondAnglesRadians:[-.8],
  checkPose:clear,...overrides,
})

test('two developable folds can overcome an intermediate seam regression without material strain',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const t=performance.now(),out=run(source),elapsedMs=performance.now()-t
  assert.equal(out.trialCount,1)
  assert.equal(out.acceptedCount,1)
  assert.ok(out.best)
  const row=out.trials[0]
  assert.ok(row.beforeMaxGapMm>140&&row.beforeMaxGapMm<160)
  assert.ok(row.intermediateMaxGapMm>300,
    'The first fold must temporarily worsen the seam')
  assert.ok(row.maxGapMm<70&&row.rmsGapMm<70)
  assert.ok(Math.abs(row.maxPrincipalExtensionPercent)<1e-8)
  assert.ok(Math.abs(row.maxPrincipalCompressionPercent)<1e-8)
  assert.equal(row.initialContactPenetrations,0)
  assert.equal(row.intermediateContactPenetrations,0)
  assert.equal(row.finalContactPenetrations,0)
  assert.equal(row.sampledPathPenetrations,0)
  assert.equal(row.checkedPathSamples,4*7*20)
  assert.equal(out.best.gate.groupMerit.allGroupsNonworse,true)
  assert.equal(out.best.gate.sampledPathContactChecked,true)
  assert.equal(out.best.gate.meshConditioning.approved,true)
  assert.equal(out.best.gate.pinsUnchanged,true)
  assert.equal(out.fitCertified,false)
  assert.equal(out.sweptCollisionCertified,false)
  assert.equal(out.safeToAutoApply,false)
  assert.equal(JSON.stringify(source),frozen)
  console.log('COUPLED_SYNTHETIC '+JSON.stringify({
    beforeMaxGapMm:row.beforeMaxGapMm,intermediateMaxGapMm:row.intermediateMaxGapMm,
    finalMaxGapMm:row.maxGapMm,finalRmsGapMm:row.rmsGapMm,
    maxPrincipalExtensionPercent:row.maxPrincipalExtensionPercent,
    maxPrincipalCompressionPercent:row.maxPrincipalCompressionPercent,
    sampledPathPenetrations:row.sampledPathPenetrations,
    runtimeMs:+elapsedMs.toFixed(3),sourceUnchanged:true,
    fitCertified:false,sweptCCDVerified:false,
  }))
})

test('coupled search checks intermediate contact even if final endpoint is clear',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const intermediateOnlyObstacle=pose=>{
    const frontZ=pose.particles[2].position[2]
    const backZ=pose.particles[8].position[2]
    const hit=frontZ>.1&&backZ<-.05
    return {...clear(pose),penetrating:Number(hit),maximumIntrusionMm:hit?4:0}
  }
  const out=run(source,{checkPose:intermediateOnlyObstacle})
  assert.equal(out.acceptedCount,0)
  assert.equal(out.best,null)
  assert.equal(out.trials[0].initialContactPenetrations,0)
  assert.equal(out.trials[0].finalContactPenetrations,0)
  assert.equal(out.trials[0].intermediateContactPenetrations,1)
  assert.equal(out.trials[0].intermediateValid,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('coupled search rejects an intermediate curved-arc collision missed by straight chords',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const targetX=.5+.5*Math.cos(.2),targetZ=.5*Math.sin(.2)
  const curvedObstacle=pose=>{
    const p=pose.particles[2].position
    const hit=Math.abs(p[0]-targetX)<.001&&Math.abs(p[2]-targetZ)<.001
    return {...clear(pose),penetrating:Number(hit),maximumIntrusionMm:hit?2:0}
  }
  const out=run(source,{checkPose:curvedObstacle})
  assert.equal(out.acceptedCount,0)
  assert.equal(out.best,null)
  assert.equal(out.trials[0].initialContactPenetrations,0)
  assert.equal(out.trials[0].intermediateContactPenetrations,0)
  assert.equal(out.trials[0].finalContactPenetrations,0)
  assert.ok(out.trials[0].sampledPathPenetrations>0,
    'A curved fold path must be screened even when endpoints are clear')
  assert.equal(JSON.stringify(source),frozen)
})

test('coupled search refuses incomplete pose-contact reports and unbounded trial grids',()=>{
  const source=fixture()
  assert.throws(()=>run(source,{checkPose:pose=>({...clear(pose),checked:1})}),
    /Incomplete or invalid/)
  assert.throws(()=>run(source,{firstAnglesRadians:Array(5).fill(0),
    secondAnglesRadians:Array(4).fill(0)}),/1..16/)
  assert.throws(()=>run(source,{steps:17}),/2..16/)
  assert.throws(()=>run(source,{second:{...second,axisVertices:[1,1]}}),
    /distinct/)
})

test('four-panel tee coupled hinge trial is rejected; all input state remains unchanged',()=>{
  const project=createTemplateProject('tee'),frozenProject=JSON.stringify(project)
  const base=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalHinges=discoverNativeDevelopableHinges(base,{maxResults:128})
  const protectedAxes=Object.fromEntries(base.pieces.map(piece=>[
    piece.id,[originalHinges.returned.find(h=>
      h.panelId===piece.id&&h.worldAxisAligned&&h.side==='positive').axisVertices],
  ]))
  const payload=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true,
    experimentalProtectedHingeAxesByPiece:protectedAxes,
  })
  const frozen=JSON.stringify(payload)
  const hinges=discoverNativeDevelopableHinges(payload,{maxResults:128})
  const pick=id=>hinges.returned.find(h=>h.panelId===id&&
    h.worldAxisAligned&&h.side==='positive')
  const initial=measureNativeSeamResiduals(payload)
  const started=performance.now()
  const out=searchNativeCoupledHingeCandidates(payload,{
    first:pick('back'),second:pick('sleeve-left'),
    firstAnglesRadians:[-.2,.2],secondAnglesRadians:[-.2,.2],
    checkPose:inspectStagedAvatarContact,steps:8,
  })
  const runtimeMs=performance.now()-started
  assert.equal(out.trialCount,4)
  assert.equal(out.acceptedCount,0)
  assert.equal(out.best,null)
  assert.ok(out.sourceContactPenetrations>0)
  assert.ok(out.trials.every(row=>!row.accepted&&
    row.maxPrincipalExtensionPercent>5&&row.initialContactPenetrations>0))
  assert.equal(JSON.stringify(project),frozenProject)
  assert.equal(JSON.stringify(payload),frozen)
  const best=[...out.trials].sort((a,b)=>a.maxGapMm-b.maxGapMm)[0]
  console.log('FOUR_PANEL_COUPLED_REJECTED '+JSON.stringify({
    trialCount:out.trialCount,accepted:out.acceptedCount,
    initialMaxGapMm:initial.maxGapMm,initialRmsGapMm:initial.rmsGapMm,
    bestTrialMaxGapMm:best.maxGapMm,bestTrialRmsGapMm:best.rmsGapMm,
    bestTrialPrincipalExtensionPercent:best.maxPrincipalExtensionPercent,
    initialContactPenetrations:best.initialContactPenetrations,
    intermediateContactPenetrations:best.intermediateContactPenetrations,
    finalContactPenetrations:best.finalContactPenetrations,
    sampledPathPenetrations:best.sampledPathPenetrations,
    runtimeMs:+runtimeMs.toFixed(2),originalGarmentUnchanged:true,
    fitCertified:false,sweptCCDVerified:false,
  }))
})
