import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {inspectNativeCreaseRepairCandidate20261024 as gate} from
  '../src/core/backends/nativeCreaseRepairCandidateGate20261024.js'

const piece=()=>({panelId:'pose-integrity',originalVertexCount:4,
  originalParticleIndices:[0,1,2,3],
  verticesM:[[-.1,0,0],[.1,0,0],[-.1,.1,0],[.1,.1,0],
    [0,0,0],[0,.1,0]],
  worldPositionsM:[[-.1,0,0],[.1,0,0],[-.1,.1,0],[.1,.1,0],
    [0,0,0],[0,.1,0]],
  newVertexProvenance:[{index:4,edge:[0,1],weights:[.5,.5]},
    {index:5,edge:[2,3],weights:[.5,.5]}],
  creaseEdges:[[4,5]],
  constraintsCache:{hinges:[{edge:[4,5],restAngle:0}]},
  faces:[[0,4,5],[0,5,2],[4,1,3],[4,3,5]]})

test('valid topology-only change preserves world pose and nested constraint metadata',()=>{
  const reference=piece(),candidate=structuredClone(reference)
  candidate.faces[0]=[0,4,2]
  candidate.faces[1]=[4,5,2]
  const frozen=JSON.stringify(reference),candidateFrozen=JSON.stringify(candidate)
  const result=gate(reference,candidate)
  assert.equal(result.researchGeometryScreenPassed,true)
  assert.equal(result.foldContactChecked,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(JSON.stringify(reference),frozen)
  assert.equal(JSON.stringify(candidate),candidateFrozen)
})

test('world-pose edits, metadata insertion and stale cached hinges fail closed',()=>{
  const reference=piece(),frozen=JSON.stringify(reference)
  for(const change of [
    c=>c.worldPositionsM[0][2]+=.02,
    c=>{delete c.worldPositionsM},
    c=>{c.unapprovedSolverApproval=true},
    c=>{c.constraintsCache.hinges[0].restAngle=Math.PI},
    c=>{c.constraintsCache.hinges.push({edge:[0,1],restAngle:0})},
    c=>{Object.defineProperty(c,'hiddenPose',{value:[0,0,1],enumerable:false})},
    c=>{Object.defineProperty(c.constraintsCache,'hiddenStaleGraph',{
      value:{faceIndex:999},enumerable:false})},
  ]){
    const candidate=structuredClone(reference)
    change(candidate)
    const before=JSON.stringify(candidate)
    assert.throws(()=>gate(reference,candidate),/non-topology metadata or world pose/)
    assert.equal(JSON.stringify(candidate),before)
  }
  assert.equal(JSON.stringify(reference),frozen)
})

test('hidden triangle fields and nonfinite metadata cannot bypass safety gate',()=>{
  const reference=piece()
  const hiddenFace=structuredClone(reference)
  Object.defineProperty(hiddenFace.faces[0],'staleEdge',{value:999,enumerable:false})
  assert.throws(()=>gate(reference,hiddenFace),/Invalid crease repair face/)
  const badNumber=structuredClone(reference)
  badNumber.constraintsCache.hinges[0].restAngle=NaN
  assert.throws(()=>gate(reference,badNumber),/without accessors/)
})

test('actual four-panel source and native payload stay unchanged under pose-spoof regression',()=>{
  const project=createTemplateProject('tee')
  const native=buildNativeSimulationPayload(project,{quality:'quality'})
  const projectFrozen=JSON.stringify(project),nativeFrozen=JSON.stringify(native)
  const panels=refineNativeUnderarmCreaseMeshResearch(native).panels
  assert.equal(panels.length,2)
  for(const reference of panels){
    const frozen=JSON.stringify(reference)
    const valid=gate(reference,structuredClone(reference))
    assert.equal(valid.researchGeometryScreenPassed,false)
    assert.equal(valid.physicalAcceptance,false)
    const candidate=structuredClone(reference)
    candidate.worldPositionsM[0][2]+=.01
    assert.throws(()=>gate(reference,candidate),/non-topology metadata or world pose/)
    assert.equal(JSON.stringify(reference),frozen)
  }
  assert.equal(JSON.stringify(project),projectFrozen)
  assert.equal(JSON.stringify(native),nativeFrozen)
})
