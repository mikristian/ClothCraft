import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {inspectNativeCreaseRepairCandidate20261024 as inspect} from
  '../src/core/backends/nativeCreaseRepairCandidateGate20261024.js'

const synthetic=()=>({panelId:'synthetic',originalVertexCount:4,
  originalParticleIndices:[10,11,12,13],
  verticesM:[[-.1,0,0],[.1,0,0],[-.1,.1,0],[.1,.1,0],
    [0,0,0],[0,.1,0]],
  newVertexProvenance:[{index:4,edge:[0,1],weights:[.5,.5]},
    {index:5,edge:[2,3],weights:[.5,.5]}],
  creaseEdges:[[4,5]],
  faces:[[0,4,5],[0,5,2],[4,1,3],[4,3,5]]})

test('a topology-only alternative diagonal preserves material, crease, and contact',()=>{
  const source=synthetic(),candidate=structuredClone(source)
  candidate.faces[0]=[0,4,2]
  candidate.faces[1]=[4,5,2]
  const original=JSON.stringify(source),proposal=JSON.stringify(candidate)
  const out=inspect(source,candidate)
  assert.equal(out.baseline.illConditioned,0)
  assert.equal(out.candidate.illConditioned,0)
  assert.equal(out.researchGeometryScreenPassed,true)
  assert.equal(out.staticContactClear,true)
  assert.equal(out.materialCoordinatesLocked,true)
  assert.equal(out.physicalAcceptance,false)
  assert.equal(out.foldContactChecked,false)
  assert.equal(out.sweptCollisionCertified,false)
  assert.equal(out.candidateApplied,false)
  assert.equal(JSON.stringify(source),original)
  assert.equal(JSON.stringify(candidate),proposal)
})

test('a tiny generated crease-node displacement is NOT provenance-preserving',()=>{
  const source=synthetic(),candidate=structuredClone(source)
  candidate.verticesM[4][1]+=.00001
  assert.throws(()=>inspect(source,candidate),/parent-edge interpolation/)
  const changed=structuredClone(source)
  changed.verticesM[0][1]+=.00001
  assert.throws(()=>inspect(source,changed),/material coordinates/)
  const altered=structuredClone(source)
  altered.newVertexProvenance[0].weights=[.6,.4]
  assert.throws(()=>inspect(source,altered),/provenance or topology budget/)
})

test('boundary, hinge, winding, degenerate and budget violations fail closed',()=>{
  const source=synthetic()
  const reversed=structuredClone(source)
  reversed.faces[0].reverse()
  assert.throws(()=>inspect(source,reversed),/winding/)
  const degenerate=structuredClone(source)
  degenerate.faces[0]=[0,4,4]
  assert.throws(()=>inspect(source,degenerate),/Invalid crease repair face/)
  const broken=structuredClone(source)
  broken.faces[0]=[0,4,2]
  assert.throws(()=>inspect(source,broken),/constrained crease edges|boundary, area or hinge/)
  const lostHinge=structuredClone(source)
  lostHinge.creaseEdges=[]
  assert.throws(()=>inspect(source,lostHinge),/ownership, provenance or topology budget/)
  assert.throws(()=>inspect(source,source,{maxFaces:1}),/budget/)
  assert.throws(()=>inspect(source,source,{clearanceM:0}),/budget/)
  const accessor=structuredClone(source)
  Object.defineProperty(accessor.verticesM[0],0,{get(){throw Error('must not execute')}})
  assert.throws(()=>inspect(source,accessor),/without accessors/)
  const nonenumerable=structuredClone(source)
  Object.defineProperty(nonenumerable.newVertexProvenance[0],'secret',{
    value:'unapproved',enumerable:false})
  assert.throws(()=>inspect(nonenumerable,structuredClone(source)),
    /Invalid crease repair vertex provenance/)
  const hiddenCandidate=structuredClone(source)
  Object.defineProperty(hiddenCandidate.newVertexProvenance[0],'secret',{
    value:'unapproved',enumerable:false})
  assert.throws(()=>inspect(source,hiddenCandidate),/Invalid candidate crease vertex provenance fields/)
  const cycle=structuredClone(source)
  cycle.self=cycle
  assert.throws(()=>inspect(source,cycle),/without accessors/)
})

test('real refined sleeves remain blocked: 15 slivers and pre-existing static contacts',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const beforeProject=JSON.stringify(project),beforePayload=JSON.stringify(payload)
  const panels=refineNativeUnderarmCreaseMeshResearch(payload).panels
  const started=performance.now()
  const results=panels.map(panel=>{
    const before=JSON.stringify(panel)
    const out=inspect(panel,structuredClone(panel))
    assert.equal(out.baseline.illConditioned,15)
    assert.equal(out.candidate.illConditioned,15)
    assert.equal(out.improvedRestConditioning,false)
    assert.equal(out.researchGeometryScreenPassed,false)
    assert.equal(out.staticContactClear,false)
    assert.ok(out.candidate.nearClearancePairs>=14)
    assert.equal(out.originalSewingEndpointsPreserved,true)
    assert.equal(out.sourceUnchanged,true)
    assert.equal(out.safeToAutoApply,false)
    assert.equal(JSON.stringify(panel),before)
    return {panelId:panel.panelId,illConditioned:out.candidate.illConditioned,
      nearClearancePairs:out.candidate.nearClearancePairs,
      intersectingPairs:out.candidate.intersectingPairs,
      geometryScreenPassed:out.researchGeometryScreenPassed}
  })
  assert.equal(results.length,2)
  assert.equal(JSON.stringify(project),beforeProject)
  assert.equal(JSON.stringify(payload),beforePayload)
  console.log('CREASE_REPAIR_GATE_QA '+JSON.stringify({results,
    runtimeMs:+(performance.now()-started).toFixed(3),
    sourceNonmutation:true,physicalAcceptance:false}))
})
