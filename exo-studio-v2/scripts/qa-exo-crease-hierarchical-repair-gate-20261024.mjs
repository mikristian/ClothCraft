import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {splitNativeCreaseEdgeResearch20261024 as split} from
  '../src/core/backends/nativeCreaseEdgeResamplingResearch20261024.js'
import {inspectNativeCreaseRepairCandidate20261024 as gate} from
  '../src/core/backends/nativeCreaseRepairCandidateGate20261024.js'
import {searchNativeCreaseRepairFlips20261024 as search} from
  '../src/core/backends/nativeCreaseRepairFlipSearchResearch20261024.js'
import {searchNativeCreaseRepairPairedFlips20261024 as pairedSearch} from
  '../src/core/backends/nativeCreaseRepairPairedFlipResearch20261024.js'

const synthetic=()=>({
  panelId:'hierarchical-test',originalVertexCount:4,
  originalParticleIndices:[0,1,2,3],
  verticesM:[[0,0,0],[0,.02,0],[-.01,.01,0],[.01,.01,0]],
  worldPositionsM:[[0,0,0],[0,.02,0],[-.01,.01,0],[.01,.01,0]],
  faces:[[0,2,1],[0,1,3]],creaseEdges:[[0,1]],
  newVertexProvenance:[],
})

test('one and two levels of provenance are accepted without physical approval',()=>{
  const original=synthetic(),frozen=JSON.stringify(original)
  const first=split(original,{edgeIndex:0,fraction:.5}).candidate
  const second=split(first,{edgeIndex:0,fraction:.5}).candidate
  for(const piece of [first,second]){
    const snapshot=JSON.stringify(piece)
    const report=gate(piece,structuredClone(piece))
    assert.equal(report.materialCoordinatesLocked,true)
    assert.equal(report.boundaryAndCreasePreserved,true)
    assert.equal(report.sourceUnchanged,true)
    assert.equal(report.physicalAcceptance,false)
    assert.equal(report.sweptCollisionCertified,false)
    assert.equal(report.safeToAutoApply,false)
    assert.equal(JSON.stringify(piece),snapshot)
  }
  assert.deepEqual(second.newVertexProvenance.map(p=>p.edge),
    [[0,1],[0,4]])
  assert.equal(JSON.stringify(original),frozen)
})

test('missing, forward, cyclic and mismatched hierarchical provenance fail closed',()=>{
  const piece=split(split(synthetic(),{edgeIndex:0}).candidate,
    {edgeIndex:0}).candidate
  const snapshot=JSON.stringify(piece)
  const corrupt=modify=>{
    const clone=structuredClone(piece)
    modify(clone)
    return clone
  }
  for(const invalid of [
    corrupt(x=>x.newVertexProvenance.pop()),
    corrupt(x=>x.newVertexProvenance[0].edge=[0,5]),
    corrupt(x=>x.newVertexProvenance[1].edge=[0,5]),
    corrupt(x=>x.newVertexProvenance[1].edge=[4,4]),
    corrupt(x=>x.newVertexProvenance[1].index=4),
    corrupt(x=>x.newVertexProvenance[1].weights=[.1,.9]),
  ])assert.throws(()=>gate(invalid,invalid),/provenance|interpolation|coordinates/)
  const moved=corrupt(x=>x.verticesM[5][1]+=.001)
  assert.throws(()=>gate(piece,moved),/interpolation|coordinates/)
  assert.equal(JSON.stringify(piece),snapshot)
})

test('real sleeves: resampled topology enters bounded flip search without mutating source',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const projectJSON=JSON.stringify(project),payloadJSON=JSON.stringify(payload)
  const panels=refineNativeUnderarmCreaseMeshResearch(payload).panels
  const started=performance.now(),results=[]
  for(const panel of panels){
    const sourceJSON=JSON.stringify(panel)
    const first=split(panel,{edgeIndex:7,fraction:.5}).candidate
    const nested=split(first,{edgeIndex:0,fraction:.5}).candidate
    const before=JSON.stringify(nested)
    const audit=gate(nested,nested)
    assert.equal(audit.materialCoordinatesLocked,true)
    assert.equal(audit.physicalAcceptance,false)
    const result=search(nested,{maxEvaluations:4,witnessFaces:[]})
    const paired=pairedSearch(nested,{maxFirst:2,maxSecond:2,
      maxWallMs:1500,witnessFaces:[]})
    assert.ok(result.attempted<=4)
    assert.ok(paired.evaluated<=4)
    assert.equal(paired.sourceUnchanged,true)
    assert.equal(paired.physicalAcceptance,false)
    assert.equal(paired.safeToAutoApply,false)
    assert.equal(result.sourceUnchanged,true)
    assert.equal(result.candidateApplied,false)
    assert.equal(result.physicalAcceptance,false)
    assert.equal(result.sweptCollisionCertified,false)
    assert.equal(JSON.stringify(nested),before)
    assert.equal(JSON.stringify(panel),sourceJSON)
    results.push({panelId:panel.panelId,vertices:nested.verticesM.length,
      faces:nested.faces.length,attempted:result.attempted,
      evaluated:result.evaluated,pairedEvaluated:paired.evaluated,
      pairedImproved:paired.improved,
      illConditioned:audit.candidate.illConditioned,
      nearClearancePairs:audit.candidate.nearClearancePairs})
  }
  assert.equal(JSON.stringify(project),projectJSON)
  assert.equal(JSON.stringify(payload),payloadJSON)
  console.log('HIERARCHICAL_REPAIR_GATE_QA '+JSON.stringify({
    results,runtimeMs:+(performance.now()-started).toFixed(3),
    sourceNonmutation:true,physicalAcceptance:false}))
})
