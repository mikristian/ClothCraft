import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {screenNativeCoupledCreasePoseContact20261024 as screen} from
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
const panel=(id,z)=>({panelId:id,verticesM:material.map(p=>[...p]),
  worldPositionsM:material.map(([x,y])=>[x,y,z]),
  faces:faces.map(f=>[...f]),creaseEdges:[[1,4]]})
const seam=[{a:{panelId:'front',vertex:2},b:{panelId:'back',vertex:1}}]

test('coupled contact vetoes a seam-closing fold even when each sheet is isometric',()=>{
  const panels=[panel('front',0),panel('back',.03)]
  const frozen=JSON.stringify(panels)
  const baseline=screen(panels,{sewingPairs:seam})
  const folded=screen(panels,{anglesRadians:{front:-Math.PI/2},sewingPairs:seam})
  assert.equal(baseline.staticContactClear,true)
  assert.ok(Math.abs(baseline.maximumSeamGapMm-Math.hypot(.03,.03)*1000)<1e-9)
  assert.ok(folded.maximumSeamGapMm<1e-10)
  assert.ok(folded.rmsSeamGapMm<baseline.rmsSeamGapMm)
  assert.ok(folded.maximumPrincipalExtensionPercent<1e-8)
  assert.ok(folded.maximumPrincipalCompressionPercent<1e-8)
  assert.equal(folded.principalStrainValid,true)
  assert.ok(folded.interpanelNearClearancePairs>0)
  assert.equal(folded.staticContactClear,false)
  // Independent geometric witness: the folded positive-X front triangle
  // touches the back's stationary crease edge at [0,0,0.03].
  const frontMoving=[[0,0,0],[0,0,.03],[0,.1,0]]
  const backStationary=[[-.03,0,.03],[0,0,.03],[0,.1,.03]]
  assert.ok(measureNativeTriangleDistanceM(frontMoving,backStationary)<1e-12)
  assert.equal(folded.physicalAcceptance,false)
  assert.equal(folded.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(panels),frozen)
})

test('separated coupled sheets remain statically clear without fit certification',()=>{
  const panels=[panel('front',0),panel('back',.15)]
  const out=screen(panels,{anglesRadians:{front:-.2,back:.2},sewingPairs:seam})
  assert.equal(out.staticContactClear,true)
  assert.equal(out.interpanelNearClearancePairs,0)
  assert.equal(out.principalStrainValid,true)
  assert.equal(out.avatarContactChecked,false)
  assert.equal(out.intervalContactChecked,false)
  assert.equal(out.physicalAcceptance,false)
})

test('malformed seams, noncollinear axes and exhausted pair budgets fail closed',()=>{
  const panels=[panel('front',0),panel('back',.03)]
  const frozen=JSON.stringify(panels)
  assert.throws(()=>screen(panels,{maxPairs:1}),/pair budget/)
  assert.throws(()=>screen(panels,{anglesRadians:{front:Infinity}}),/angle/)
  assert.throws(()=>screen(panels,{anglesRadians:{other:.2}}),/identities/)
  assert.throws(()=>screen(panels,{sewingPairs:[{a:{panelId:'front',vertex:99},
    b:{panelId:'back',vertex:1}}]}),/sewing correspondence/)
  const bad=structuredClone(panels)
  bad[0].verticesM.push([0,.05,0])
  bad[0].worldPositionsM.push([.01,.05,0])
  bad[0].creaseEdges.push([1,6])
  assert.throws(()=>screen(bad),/not collinear/)
  assert.equal(JSON.stringify(panels),frozen)
})

test('real Foundation Tee sleeve rest-topology remains contact-rejected in a separated two-panel research pose',()=>{
  const project=createTemplateProject('tee')
  const native=buildNativeSimulationPayload(project,{quality:'quality'})
  const frozenProject=JSON.stringify(project),frozenNative=JSON.stringify(native)
  const refined=refineNativeUnderarmCreaseMeshResearch(native).panels
  const panels=refined.map((p,i)=>({...p,
    worldPositionsM:p.verticesM.map(([x,y])=>[x,y,i*.5])}))
  const frozenPanels=JSON.stringify(panels)
  const started=performance.now()
  const result=screen(panels,{anglesRadians:Object.fromEntries(panels.map(p=>
    [p.panelId,5*Math.PI/12]))})
  const runtimeMs=performance.now()-started
  assert.equal(result.sewnPairsChecked,0)
  assert.equal(result.maximumSeamGapMm,null)
  assert.ok(result.maximumPrincipalExtensionPercent<1e-8)
  assert.ok(result.maximumPrincipalCompressionPercent<1e-8)
  assert.equal(result.interpanelNearClearancePairs,0)
  assert.ok(result.intrapanelNearClearancePairs>0)
  assert.equal(result.staticContactClear,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(JSON.stringify(panels),frozenPanels)
  assert.equal(JSON.stringify(project),frozenProject)
  assert.equal(JSON.stringify(native),frozenNative)
  console.log('COUPLED_CREASE_STATIC_QA '+JSON.stringify({
    panelCount:panels.length,maximumSeamGapMm:result.maximumSeamGapMm,
    maximumPrincipalExtensionPercent:result.maximumPrincipalExtensionPercent,
    maximumPrincipalCompressionPercent:result.maximumPrincipalCompressionPercent,
    intrapanelNearClearancePairs:result.intrapanelNearClearancePairs,
    interpanelNearClearancePairs:result.interpanelNearClearancePairs,
    staticContactClear:result.staticContactClear,runtimeMs:+runtimeMs.toFixed(2),
    sourceNonmutation:true,physicalAcceptance:false}))
})
