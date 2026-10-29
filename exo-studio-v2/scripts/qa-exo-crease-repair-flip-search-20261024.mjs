import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {buildNativeUnderarmCreaseConstraintGraphResearch} from
  '../src/core/backends/nativeUnderarmCreaseConstraintGraphResearch.js'
import {searchNativeCreaseRepairFlips20261024 as search} from
  '../src/core/backends/nativeCreaseRepairFlipSearchResearch20261024.js'
import {inspectNativeCreaseRepairCandidate20261024 as gate} from
  '../src/core/backends/nativeCreaseRepairCandidateGate20261024.js'
import {inspectNativeIntrapanelStaticContact} from
  '../src/core/backends/nativeIntrapanelContactResearch.js'
import {auditNativePrincipalStrain} from
  '../src/core/backends/nativePrincipalStrainAudit.js'

const fixture=()=>({panelId:'synthetic',originalVertexCount:4,
  originalParticleIndices:[10,11,12,13],
  verticesM:[[-.1,0,0],[.1,0,0],[-.1,.1,0],[.1,.1,0],
    [0,0,0],[0,.1,0]],
  newVertexProvenance:[{index:4,edge:[0,1],weights:[.5,.5]},
    {index:5,edge:[2,3],weights:[.5,.5]}],
  creaseEdges:[[4,5]],
  faces:[[0,4,5],[0,5,2],[4,1,3],[4,3,5]]})

test('bounded deterministic search never applies even a valid synthetic flip',()=>{
  const source=fixture(),before=JSON.stringify(source)
  const first=search(source,{witnessFaces:[],maxEvaluations:8})
  const second=search(source,{witnessFaces:[],maxEvaluations:8})
  assert.deepEqual(first,second)
  assert.ok(first.possibleFlips>0)
  assert.ok(first.evaluated>0)
  assert.equal(first.best,null)
  assert.equal(first.sourceUnchanged,true)
  assert.equal(first.candidateApplied,false)
  assert.equal(first.physicalAcceptance,false)
  assert.equal(first.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),before)
})

test('invalid budgets and provenance fail before proposing topology changes',()=>{
  const source=fixture()
  for(const maxEvaluations of [0,65,1.5,NaN])
    assert.throws(()=>search(source,{maxEvaluations,witnessFaces:[]}),/budget/)
  for(const witnessFaces of [[-1],[4],[.5],Array(9).fill(0),'bad'])
    assert.throws(()=>search(source,{witnessFaces}),/budget/)
  const corrupted=structuredClone(source)
  corrupted.newVertexProvenance[0].weights=[.7,.3]
  assert.throws(()=>search(corrupted,{witnessFaces:[]}),
    /parent-edge interpolation/)
})

test('independent two-sleeve QA detects one less static warning but a worse minimum altitude',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const frozenProject=JSON.stringify(project),frozenPayload=JSON.stringify(payload)
  const panels=refineNativeUnderarmCreaseMeshResearch(payload).panels
  const graph=buildNativeUnderarmCreaseConstraintGraphResearch(payload).panels
  const t=performance.now(),results=[]
  for(const piece of panels){
    const original=JSON.stringify(piece)
    const out=search(piece,{maxEvaluations:48})
    assert.equal(out.possibleFlips,155)
    assert.equal(out.attempted,48)
    assert.equal(out.evaluated,48)
    assert.equal(out.improved,1)
    assert.equal(out.best?.edge,'91:111')
    assert.equal(out.baseline.illConditioned,15)
    assert.equal(out.baseline.nearClearancePairs,14)
    assert.equal(out.best.metrics.illConditioned,15)
    assert.equal(out.best.metrics.nearClearancePairs,13)
    assert.equal(out.best.metrics.intersectingPairs,0)
    assert.equal(out.best.minimumAltitudeRegressed,true)
    assert.equal(out.best.minimumClearanceRegressed,true)
    assert.ok(Math.abs(out.best.baselineMinimumClearanceMm-
      .3839069111027)<1e-6)
    assert.ok(Math.abs(out.best.candidateMinimumClearanceMm-
      .3271730832691)<1e-6)
    assert.equal(out.best.meshQualityStillBlocked,true)
    assert.equal(out.best.flatContactStillBlocked,true)
    assert.equal(out.candidateApplied,false)
    assert.equal(out.safeToAutoApply,false)
    const candidate={...piece,faces:out.best.faces}
    const independentlyGated=gate(piece,candidate)
    assert.equal(independentlyGated.candidate.nearClearancePairs,13)
    assert.equal(independentlyGated.candidate.illConditioned,15)
    assert.equal(independentlyGated.researchGeometryScreenPassed,false)
    assert.ok(independentlyGated.candidate.minAltitudeMm<
      independentlyGated.baseline.minAltitudeMm)
    const baselineStatic=inspectNativeIntrapanelStaticContact({
      pieces:[{id:piece.panelId,particleIndices:piece.verticesM.map((_,i)=>i),
        faces:piece.faces}],
      particles:piece.verticesM.map(position=>({position}))},{
      clearanceM:.001,maxPairs:200000})
    assert.ok(out.best.candidateMinimumClearanceMm<
      baselineStatic.minimumNearClearanceMm)
    const seams=graph.find(p=>p.panelId===piece.panelId).sewingPairs
    const poses=[]
    for(const degrees of [0,75,180]){
      const angle=degrees*Math.PI/180
      const positions=piece.verticesM.map(([x,y])=>
        x>1e-8?[x*Math.cos(angle),y,x*Math.sin(angle)]:[x,y,0])
      const sample={pieces:[{id:piece.panelId,
        particleIndices:positions.map((_,i)=>i),
        flatVerticesM:piece.verticesM,faces:out.best.faces}],
      particles:positions.map(position=>({position}))}
      const contact=inspectNativeIntrapanelStaticContact(sample,{
        clearanceM:.001,maxPairs:200000})
      const strain=auditNativePrincipalStrain(sample,{limitPercent:5})
      const endpoint=end=>end.localIndices.reduce((sum,index,j)=>{
        const w=end.weights[j]
        for(let k=0;k<3;k++)sum[k]+=w*positions[index][k]
        return sum
      },[0,0,0])
      const gaps=seams.map(pair=>{
        const a=endpoint(pair.source),b=endpoint(pair.target)
        return Math.hypot(...a.map((v,i)=>v-b[i]))*1000
      })
      const maxGapMm=Math.max(...gaps)
      const rmsGapMm=Math.hypot(...gaps)/Math.sqrt(gaps.length)
      assert.ok(Math.abs(maxGapMm-345*Math.cos(angle/2))<1e-6)
      assert.ok(Math.abs(rmsGapMm-332.6174604557*Math.cos(angle/2))<1e-6)
      assert.ok(Math.abs(strain.maximumPrincipalExtensionPercent)<1e-8)
      assert.ok(Math.abs(strain.maximumPrincipalCompressionPercent)<1e-8)
      assert.equal(contact.staticDisjointThicknessScreenClear,false)
      if(degrees<180){
        assert.equal(contact.nonadjacentNearClearancePairs,13)
        assert.equal(contact.intersectingTrianglePairs,0)
      }else assert.ok(contact.intersectingTrianglePairs>0)
      poses.push({degrees,maxGapMm,rmsGapMm,
        nearClearancePairs:contact.nonadjacentNearClearancePairs,
        intersectingPairs:contact.intersectingTrianglePairs})
    }
    assert.equal(JSON.stringify(piece),original)
    results.push({panelId:piece.panelId,edge:out.best.edge,
      baseline:out.baseline,candidate:out.best.metrics,poses})
  }
  assert.equal(JSON.stringify(project),frozenProject)
  assert.equal(JSON.stringify(payload),frozenPayload)
  assert.equal(results.length,2)
  console.log('CREASE_REPAIR_FLIP_SEARCH_QA '+JSON.stringify({
    results,runtimeMs:+(performance.now()-t).toFixed(3),
    sourceNonmutation:true,physicalAcceptance:false}))
})
