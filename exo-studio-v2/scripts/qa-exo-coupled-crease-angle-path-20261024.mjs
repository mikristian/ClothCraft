import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {screenNativeCoupledCreaseAnglePath20261024 as pathScreen} from
  '../src/core/backends/nativeCoupledCreaseAnglePathResearch20261024.js'
import {screenNativeCoupledCreasePoseContact20261024 as poseScreen} from
  '../src/core/backends/nativeCoupledCreasePoseContactResearch20261024.js'
import {measureNativeTriangleDistanceM} from
  '../src/core/backends/nativeTriangleDistanceResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'

const material=[[-.03,0,0],[0,0,0],[.03,0,0],
  [-.03,.1,0],[0,.1,0],[.03,.1,0]]
const faces=[[0,1,4],[0,4,3],[1,2,4],[2,5,4]]
const panel=(panelId,shiftX=0,z=0)=>({panelId,
  verticesM:material.map(p=>[...p]),
  worldPositionsM:material.map(([x,y])=>[x+shiftX,y,z]),
  faces:faces.map(face=>[...face]),creaseEdges:[[1,4]]})

test('mid-path fabric collision vetoes two individually clear endpoints',()=>{
  const panels=[panel('moving'),panel('fixed',.06)]
  const frozen=JSON.stringify(panels)
  const start={moving:-Math.PI/2},end={moving:Math.PI/2}
  assert.equal(poseScreen(panels,{anglesRadians:start}).staticContactClear,true)
  assert.equal(poseScreen(panels,{anglesRadians:end}).staticContactClear,true)
  const result=pathScreen(panels,{startAnglesRadians:start,endAnglesRadians:end,
    subdivisions:4})
  assert.equal(result.sampledPoseCount,5)
  assert.equal(result.poses[0].staticContactClear,true)
  assert.equal(result.poses.at(-1).staticContactClear,true)
  assert.equal(result.poses[2].staticContactClear,false)
  assert.equal(result.firstContactFailureFraction,.5)
  assert.equal(result.sampledContactClear,false)
  assert.equal(result.sampledStrainValid,true)
  assert.equal(result.sampledResearchGatePass,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.sweptCollisionCertified,false)
  // Independent geometry: at 0 degrees the two sheets share [0.03,0,0].
  const front=[material[1],material[2],material[4]]
  const back=[material[0],material[1],material[4]].map(([x,y,z])=>[x+.06,y,z])
  assert.ok(measureNativeTriangleDistanceM(front,back)<1e-12)
  assert.equal(JSON.stringify(panels),frozen)
})

test('separated panels can pass sampled static screen but never earn CCD certification',()=>{
  const panels=[panel('a'),panel('b',0,.2)]
  const result=pathScreen(panels,{startAnglesRadians:{a:-.4},
    endAnglesRadians:{a:.4,b:-.2},subdivisions:4})
  assert.equal(result.sampledContactClear,true)
  assert.equal(result.sampledStrainValid,true)
  assert.equal(result.terminalSeamWithinTolerance,false)
  assert.equal(result.sampledResearchGatePass,false)
  assert.equal(result.avatarContactChecked,false)
  assert.equal(result.sweptCollisionCertified,false)
})

test('pair work and malformed angle paths are rejected before sampling',()=>{
  const panels=[panel('a'),panel('b',.06)]
  const frozen=JSON.stringify(panels)
  assert.throws(()=>pathScreen(panels,{subdivisions:17}),/settings/)
  assert.throws(()=>pathScreen(panels,{subdivisions:2.5}),/settings/)
  assert.throws(()=>pathScreen(panels,{maxPairsPerPose:1}),/pair budget/)
  assert.throws(()=>pathScreen(panels,{maxTotalPairEvaluations:30}),/pair budget/)
  assert.throws(()=>pathScreen(panels,{startAnglesRadians:{unknown:0}}),/endpoint/)
  assert.throws(()=>pathScreen(panels,{endAnglesRadians:{a:Infinity}}),/endpoint/)
  assert.throws(()=>pathScreen(panels,{startAnglesRadians:{a:4}}),/endpoint/)
  assert.equal(JSON.stringify(panels),frozen)
})

test('actual refined Foundation Tee sleeve pair remains rejected along sampled fold',()=>{
  const project=createTemplateProject('tee')
  const native=buildNativeSimulationPayload(project,{quality:'quality'})
  const frozenProject=JSON.stringify(project),frozenNative=JSON.stringify(native)
  const panels=refineNativeUnderarmCreaseMeshResearch(native).panels.map((p,i)=>
    ({...p,worldPositionsM:p.verticesM.map(([x,y])=>[x,y,i*.5])}))
  const frozenPanels=JSON.stringify(panels)
  const endAnglesRadians=Object.fromEntries(panels.map(p=>[p.panelId,5*Math.PI/12]))
  const start=performance.now()
  const result=pathScreen(panels,{endAnglesRadians,subdivisions:4})
  const runtimeMs=performance.now()-start
  assert.equal(result.sampledPoseCount,5)
  assert.equal(result.sampledStrainValid,true)
  assert.equal(result.sampledContactClear,false)
  assert.ok(result.poses.every(p=>p.intrapanelNearClearancePairs>0))
  assert.ok(result.poses.every(p=>p.interpanelNearClearancePairs===0))
  assert.equal(result.poses.at(-1).maximumSeamGapMm,null)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(JSON.stringify(project),frozenProject)
  assert.equal(JSON.stringify(native),frozenNative)
  assert.equal(JSON.stringify(panels),frozenPanels)
  console.log('COUPLED_CREASE_ANGLE_PATH_QA '+JSON.stringify({
    panels:panels.length,samples:result.sampledPoseCount,
    maxPrincipalExtensionPercent:Math.max(...result.poses.map(p=>p.maximumPrincipalExtensionPercent)),
    maxPrincipalCompressionPercent:Math.max(...result.poses.map(p=>p.maximumPrincipalCompressionPercent)),
    intrapanelWarningsBySample:result.poses.map(p=>p.intrapanelNearClearancePairs),
    interpanelWarningsBySample:result.poses.map(p=>p.interpanelNearClearancePairs),
    maxSeamGapMm:result.poses.at(-1).maximumSeamGapMm,
    rmsSeamGapMm:result.poses.at(-1).rmsSeamGapMm,
    runtimeMs:+runtimeMs.toFixed(2),sourceNonmutation:true,
    physicalAcceptance:false}))
})
