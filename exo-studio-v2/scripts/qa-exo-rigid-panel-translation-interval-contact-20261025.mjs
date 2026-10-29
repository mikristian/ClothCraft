import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {measureNativeTriangleDistanceM} from
  '../src/core/backends/nativeTriangleDistanceResearch.js'
import {auditNativePrincipalStrain} from
  '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from
  '../src/core/backends/nativeSeamCandidateGate.js'
import {researchFoundationTeeJointTranslation20261025 as joint} from
  '../src/core/backends/nativeFoundationTeeJointTranslationResearch20261025.js'
import {screenNativeRigidPanelTranslationIntervalContact20261025 as screen} from
  '../src/core/backends/nativeRigidPanelTranslationIntervalContactResearch20261025.js'

const triangle=[[0,0,0],[.1,0,0],[0,.1,0]]
const fixture=(shift=[-.2,0,0])=>({
  pieces:[{id:'a',particleIndices:[0,1,2],faces:[[0,1,2]]},
    {id:'b',particleIndices:[3,4,5],faces:[[0,1,2]]}],
  particles:[...triangle.map(position=>({pieceId:'a',position:[...position]})),
    ...triangle.map(p=>({pieceId:'b',position:p.map((x,k)=>x+shift[k])}))],
})
const velocities=(v=[.4,0,0])=>({a:[0,0,0],b:v})
const at=(payload,piece,velocity,fraction)=>piece.faces[0].map(i=>{
  const p=payload.particles[piece.particleIndices[i]].position
  return p.map((x,k)=>x+velocity[k]*fraction)
})

test('independent triangle oracle proves endpoints clear but midpoint collision is rejected',()=>{
  const payload=fixture(),v=velocities(),snapshot=JSON.stringify({payload,v})
  for(const fraction of [0,1]){
    const d=measureNativeTriangleDistanceM(at(payload,payload.pieces[0],v.a,fraction),
      at(payload,payload.pieces[1],v.b,fraction))
    assert.ok(d>.05)
  }
  assert.ok(measureNativeTriangleDistanceM(at(payload,payload.pieces[0],v.a,.5),
    at(payload,payload.pieces[1],v.b,.5))<1e-10)
  const result=screen(payload,v)
  assert.equal(result.rigidInterpanelIntervalClear,false)
  assert.equal(result.blocker.reason,'sampled-contact')
  assert.equal(result.blocker.fraction,.5)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(JSON.stringify({payload,v}),snapshot)
})

test('swept bounding box safely certifies a distant pair without narrowphase',()=>{
  const payload=fixture([-.2,.5,0]),v=velocities()
  const result=screen(payload,v)
  assert.equal(result.rigidInterpanelIntervalClear,true)
  assert.equal(result.certifiedPairs,1)
  assert.equal(result.prunedSweptBounds,1)
  assert.equal(result.distanceEvaluations,0)
  assert.equal(result.avatarContactChecked,false)
  assert.equal(result.safeToAutoApply,false)
})

test('exact triangle distance certifies separated faces whose swept boxes overlap',()=>{
  const payload=fixture([.08,.08,0]),v=velocities([0,0,0])
  const oracle=measureNativeTriangleDistanceM(at(payload,payload.pieces[0],v.a,0),
    at(payload,payload.pieces[1],v.b,0))
  assert.ok(oracle>.001)
  const result=screen(payload,v)
  assert.equal(result.rigidInterpanelIntervalClear,true)
  assert.equal(result.certifiedPairs,1)
  assert.equal(result.prunedSweptBounds,0)
  assert.equal(result.distanceEvaluations,1)
  assert.ok(Math.abs(result.minimumSampledDistanceMm-oracle*1000)<1e-8)
})

test('near-boundary interval uncertainty and work exhaustion fail closed',()=>{
  const payload=fixture([.12,0,0]),v=velocities([-.02,0,0])
  const uncertain=screen(payload,v,{maxDepth:0})
  assert.equal(uncertain.rigidInterpanelIntervalClear,false)
  assert.equal(uncertain.blocker.reason,'unresolved-motion-bound')
  assert.equal(uncertain.blocker.depth,0)
  const limited=screen(payload,v,{maxDistanceEvaluations:1,maxDepth:8})
  assert.equal(limited.rigidInterpanelIntervalClear,false)
  assert.equal(limited.blocker.reason,'work-budget')
})

test('static overlap cannot pass with zero motion',()=>{
  const payload=fixture([0,0,0])
  const result=screen(payload,velocities([0,0,0]))
  assert.equal(result.rigidInterpanelIntervalClear,false)
  assert.equal(result.blocker.reason,'sampled-contact')
})

test('invalid topology, velocities and resource limits reject rather than certify',()=>{
  const payload=fixture(),v=velocities()
  for(const options of [{clearanceM:-1},{clearanceM:Infinity},{maxDepth:13},
    {maxFacePairs:0},{maxDistanceEvaluations:0}])
    assert.throws(()=>screen(payload,v,options),/Invalid rigid translation interval budget/)
  for(const bad of [{a:[0,0,0]},{a:[0,0,0],b:[NaN,0,0]},
    {a:[0,0,0],b:[2,0,0]},{a:[0,0,0],b:[0,0,0],extra:[0,0,0]}])
    assert.throws(()=>screen(payload,bad),/velocities/)
  const malformed=structuredClone(payload)
  malformed.pieces[1].faces[0]=[0,0,2]
  assert.throws(()=>screen(malformed,v),/face indices/)
  const provenance=structuredClone(payload)
  provenance.particles[3].pieceId='a'
  assert.throws(()=>screen(provenance,v),/ownership/)
  const unowned=structuredClone(payload)
  unowned.particles.push({pieceId:'b',position:[NaN,0,0]})
  assert.throws(()=>screen(unowned,v),/Unowned/)
  const duplicate=structuredClone(payload)
  duplicate.pieces[1].particleIndices[0]=0
  assert.throws(()=>screen(duplicate,v),/ownership/)
  const degenerate=structuredClone(payload)
  degenerate.particles[3].position=degenerate.particles[4].position
  assert.throws(()=>screen(degenerate,v),/Degenerate/)
  assert.throws(()=>screen(payload,v,{maxFacePairs:1-1}),/budget/)
})

test('actual four-panel joint motion has a reproducible exact contact witness and no mutation',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const source=JSON.stringify({project,payload})
  const result=joint(project,payload)
  const start=performance.now()
  const path=screen(payload,result.translationsM,{maxDepth:8,
    maxFacePairs:500_000,maxDistanceEvaluations:100_000})
  const runtimeMs=performance.now()-start
  assert.equal(path.rigidInterpanelIntervalClear,false)
  assert.equal(path.blocker.reason,'sampled-contact')
  const witness=path.blocker
  const pa=payload.pieces.find(p=>p.id===witness.pieceA)
  const pb=payload.pieces.find(p=>p.id===witness.pieceB)
  const faceAt=(piece,index)=>piece.faces[index].map(vertex=>{
    const position=payload.particles[piece.particleIndices[vertex]].position
    return position.map((x,k)=>x+witness.fraction*result.translationsM[piece.id][k])
  })
  const independentDistance=measureNativeTriangleDistanceM(
    faceAt(pa,witness.faceA),faceAt(pb,witness.faceB))*1000
  assert.ok(Math.abs(independentDistance-witness.distanceMm)<1e-8)
  assert.ok(independentDistance<=1)
  const before=measureNativeSeamResiduals(payload)
  const after=measureNativeSeamResiduals(result.candidatePayload)
  assert.ok(after.maxGapMm<before.maxGapMm)
  assert.ok(after.rmsGapMm<before.rmsGapMm)
  const strainBefore=auditNativePrincipalStrain(payload,{limitPercent:5})
  const strainAfter=auditNativePrincipalStrain(result.candidatePayload,{limitPercent:5})
  assert.ok(Math.abs(strainAfter.maximumPrincipalExtensionPercent-
    strainBefore.maximumPrincipalExtensionPercent)<1e-7)
  assert.ok(Math.abs(strainAfter.maximumPrincipalCompressionPercent-
    strainBefore.maximumPrincipalCompressionPercent)<1e-7)
  assert.equal(strainAfter.withinDeclaredStrainLimit,false)
  assert.equal(JSON.stringify({project,payload}),source)
  assert.equal(path.sweptCollisionCertified,false)
  assert.equal(path.physicalAcceptance,false)
  console.log('FOUR_PANEL_RIGID_INTERVAL '+JSON.stringify({
    before:{maxGapMm:before.maxGapMm,rmsGapMm:before.rmsGapMm},
    after:{maxGapMm:after.maxGapMm,rmsGapMm:after.rmsGapMm},
    principalExtensionPercent:strainAfter.maximumPrincipalExtensionPercent,
    principalCompressionPercent:strainAfter.maximumPrincipalCompressionPercent,
    contactValidity:false,blocker:witness,
    checkedPairs:path.totalPairs,certifiedBeforeBlocker:path.certifiedPairs,
    distanceEvaluations:path.distanceEvaluations,runtimeMs:+runtimeMs.toFixed(2),
    sourceNonmutation:true,physicalAcceptance:false}))
})
