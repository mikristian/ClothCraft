import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {buildNativeUnderarmCreaseConstraintGraphResearch} from
  '../src/core/backends/nativeUnderarmCreaseConstraintGraphResearch.js'
import {searchNativeCreaseRepairPairedFlips20261024 as paired,
  classifyNativeCreaseRepairSafety20261024 as classify,
  measureNativeCreaseDisjointMinimum20261024 as minimumDisjoint} from
  '../src/core/backends/nativeCreaseRepairPairedFlipResearch20261024.js'
import {searchNativeCreaseRepairFlips20261024 as single} from
  '../src/core/backends/nativeCreaseRepairFlipSearchResearch20261024.js'
import {inspectNativeCreaseRepairCandidate20261024 as gate} from
  '../src/core/backends/nativeCreaseRepairCandidateGate20261024.js'
import {inspectNativeIntrapanelStaticContact} from
  '../src/core/backends/nativeIntrapanelContactResearch.js'
import {auditNativePrincipalStrain} from
  '../src/core/backends/nativePrincipalStrainAudit.js'

const make=()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  return {project,payload,
    panels:refineNativeUnderarmCreaseMeshResearch(payload).panels,
    graphs:buildNativeUnderarmCreaseConstraintGraphResearch(payload).panels}
}
const staticContact=(piece,faces,positions,clearanceM=.001)=>
  inspectNativeIntrapanelStaticContact({
    pieces:[{id:piece.panelId,
      particleIndices:positions.map((_,i)=>i),faces}],
    particles:positions.map(position=>({position}))},{
    clearanceM,maxPairs:200000})
const endpoint=(positions,end)=>end.localIndices.reduce((sum,id,j)=>{
  for(let k=0;k<3;k++)sum[k]+=positions[id][k]*end.weights[j]
  return sum
},[0,0,0])
const seamMetrics=(positions,pairs)=>{
  const gaps=pairs.map(pair=>{
    const a=endpoint(positions,pair.source),b=endpoint(positions,pair.target)
    return Math.hypot(...a.map((v,i)=>v-b[i]))*1000
  })
  return {maxGapMm:Math.max(...gaps),
    rmsGapMm:Math.hypot(...gaps)/Math.sqrt(gaps.length)}
}

test('safety ranking refuses count-only win with worse altitude and exact clearance',()=>{
  const {panels}=make()
  for(const piece of panels){
    const previous=single(piece,{maxEvaluations:48})
    assert.equal(previous.best.edge,'91:111')
    const candidate=gate(piece,{...piece,faces:previous.best.faces})
    assert.equal(candidate.baseline.nearClearancePairs,14)
    assert.equal(candidate.candidate.nearClearancePairs,13)
    const decision=classify(candidate.baseline,candidate.candidate,
      previous.best.baselineMinimumClearanceMm,
      previous.best.candidateMinimumClearanceMm)
    assert.equal(decision.qualityNonregression,false)
    assert.equal(decision.clearanceNonregression,false)
    assert.equal(decision.nonregressing,false)
    assert.equal(decision.improved,false)
  }
  assert.throws(()=>classify({illConditioned:0},null,1,NaN),/metrics/)
  const base={illConditioned:15,nearClearancePairs:14,
    intersectingPairs:0,minAltitudeMm:.38,maxAspect:85}
  const better={...base,illConditioned:14}
  assert.equal(classify(base,better,.38,.4).improved,true)
  assert.equal(classify(base,better,.38,.3).improved,false)
  for(const bad of [{...better,nearClearancePairs:-1},
    {...better,illConditioned:1.5},{...better,minAltitudeMm:0},
    {...better,maxAspect:NaN}])
    assert.throws(()=>classify(base,bad,.38,.4),/metrics/)
})

test('exact disjoint clearance distinguishes two safe-above-threshold minima',()=>{
  const makeGap=gap=>({panelId:'two-disjoint-faces',
    verticesM:[[0,0,0],[.01,0,0],[0,.01,0],
      [.01+gap,0,0],[.02+gap,0,0],[.01+gap,.01,0]],
    faces:[[0,1,2],[3,4,5]]})
  const three=minimumDisjoint(makeGap(.003))
  const two=minimumDisjoint(makeGap(.002))
  assert.ok(Math.abs(three-3)<1e-8)
  assert.ok(Math.abs(two-2)<1e-8)
  const base={illConditioned:2,nearClearancePairs:0,
    intersectingPairs:0,minAltitudeMm:1,maxAspect:20}
  const better={...base,illConditioned:1}
  const unsafe=classify(base,better,three,two)
  assert.equal(unsafe.qualityNonregression,true)
  assert.equal(unsafe.clearanceNonregression,false)
  assert.equal(unsafe.improved,false)
})

test('paired search is bounded, deterministic, provenance-preserving and never auto-applies',()=>{
  const {project,payload,panels,graphs}=make()
  const projectBefore=JSON.stringify(project),payloadBefore=JSON.stringify(payload)
  const start=performance.now(),results=[]
  for(const piece of panels){
    const frozen=JSON.stringify(piece)
    const out=paired(piece,{maxFirst:12,maxSecond:12})
    assert.equal(out.firstFlips,12)
    assert.equal(out.pairBudget,144)
    assert.equal(out.evaluated,80)
    assert.equal(out.rejected,0)
    assert.equal(out.duplicatesSkipped,64)
    assert.equal(out.uniqueFinalTopologies,80)
    assert.equal(out.qualityRegressions,53)
    assert.equal(out.nonregressing,27)
    assert.equal(out.improved,0)
    assert.equal(out.best,null)
    assert.equal(out.timeBudgetExhausted,false)
    assert.equal(out.baseline.illConditioned,15)
    assert.equal(out.baseline.nearClearancePairs,14)
    assert.ok(Math.abs(out.baselineMinimumClearanceMm-
      .3839069111027)<1e-6)
    assert.equal(out.sourceUnchanged,true)
    assert.equal(out.candidateApplied,false)
    assert.equal(out.physicalAcceptance,false)
    assert.equal(out.sweptCollisionCertified,false)
    assert.equal(out.safeToAutoApply,false)
    const pairs=graphs.find(g=>g.panelId===piece.panelId).sewingPairs
    const poses=[]
    for(const degrees of [0,75,180]){
      const angle=degrees*Math.PI/180
      const positions=piece.verticesM.map(([x,y])=>
        x>1e-8?[x*Math.cos(angle),y,x*Math.sin(angle)]:[x,y,0])
      const seam=seamMetrics(positions,pairs)
      const contact=staticContact(piece,piece.faces,positions)
      const strain=auditNativePrincipalStrain({
        pieces:[{id:piece.panelId,
          particleIndices:positions.map((_,i)=>i),
          flatVerticesM:piece.verticesM,faces:piece.faces}],
        particles:positions.map(position=>({position}))},{limitPercent:5})
      assert.ok(Math.abs(seam.maxGapMm-
        345*Math.cos(angle/2))<1e-6)
      assert.ok(Math.abs(seam.rmsGapMm-
        332.6174604557*Math.cos(angle/2))<1e-6)
      assert.ok(Math.abs(strain.maximumPrincipalExtensionPercent)<1e-8)
      assert.ok(Math.abs(strain.maximumPrincipalCompressionPercent)<1e-8)
      assert.equal(contact.staticDisjointThicknessScreenClear,false)
      if(degrees<180){
        assert.equal(contact.nonadjacentNearClearancePairs,14)
        assert.equal(contact.intersectingTrianglePairs,0)
      }else assert.ok(contact.intersectingTrianglePairs>0)
      poses.push({degrees,...seam,
        principalExtensionPercent:strain.maximumPrincipalExtensionPercent,
        principalCompressionPercent:strain.maximumPrincipalCompressionPercent,
        clearanceWarnings:contact.nonadjacentNearClearancePairs,
        staticIntersections:contact.intersectingTrianglePairs})
    }
    assert.equal(JSON.stringify(piece),frozen)
    results.push({panelId:piece.panelId,search:out,poses})
  }
  assert.equal(JSON.stringify(project),projectBefore)
  assert.equal(JSON.stringify(payload),payloadBefore)
  console.log('CREASE_PAIRED_FLIP_QA '+JSON.stringify({
    results,runtimeMs:+(performance.now()-start).toFixed(3),
    originalStateUnchanged:true,physicalAcceptance:false}))
})

test('budgets and malformed provenance fail closed without source mutation',()=>{
  const piece=make().panels[0],before=JSON.stringify(piece)
  for(const maxFirst of [0,25,1.5,NaN])
    assert.throws(()=>paired(piece,{maxFirst}),/budget/)
  for(const maxSecond of [0,25,1.5,NaN])
    assert.throws(()=>paired(piece,{maxSecond}),/budget/)
  for(const maxWallMs of [0,999,60001,1.5,NaN])
    assert.throws(()=>paired(piece,{maxWallMs}),/budget/)
  for(const witnessFaces of [[-1],[178],[.5],'bad',Array(9).fill(0)])
    assert.throws(()=>paired(piece,{witnessFaces}),/budget/)
  const corrupt=structuredClone(piece)
  corrupt.newVertexProvenance[0].weights=[.7,.3]
  assert.throws(()=>paired(corrupt),/parent-edge interpolation/)
  assert.equal(JSON.stringify(piece),before)
})
