import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeJointTranslation20261025 as joint} from
  '../src/core/backends/nativeFoundationTeeJointTranslationResearch20261025.js'
import {auditFoundationTeeCoupledMotionGateResearch20261025 as audit} from
  '../src/core/backends/nativeFoundationTeeCoupledMotionGateResearch20261025.js'
import {inspectNativeUnderarmCenterCrease} from
  '../src/core/backends/nativeUnderarmCenterCreaseResearch.js'
import {measureNativeTriangleDistanceM} from
  '../src/core/backends/nativeTriangleDistanceResearch.js'

const make=()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const candidate=joint(project,payload)
  const motions=Object.fromEntries(payload.pieces.map(piece=>[
    piece.id,{translationM:candidate.translationsM[piece.id]}]))
  return {project,payload,candidate,motions}
}
const manualSeams=payload=>{
  const gaps=payload.constraints.filter(c=>c.type==='seam').map(c=>{
    const a=payload.particles[c.a].position,b=payload.particles[c.b].position
    return Math.hypot(...a.map((x,k)=>x-b[k]))*1000
  })
  return {count:gaps.length,max:Math.max(...gaps),
    rms:Math.sqrt(gaps.reduce((s,g)=>s+g*g,0)/gaps.length)}
}

test('real four-panel coupled gate audits all 102 sewing samples and rejects unsafe seam-only improvement',()=>{
  const {project,payload,candidate,motions}=make()
  const before=JSON.stringify({project,payload,motions})
  const start=performance.now(),result=audit(project,payload,motions)
  const runtimeMs=performance.now()-start
  const independentBefore=manualSeams(payload)
  const independentAfter=manualSeams(candidate.candidatePayload)
  assert.equal(result.sewingPairCount,102)
  assert.equal(result.seamGroupCount,14)
  assert.equal(independentBefore.count,102)
  assert.equal(independentAfter.count,102)
  assert.ok(Math.abs(result.referenceSeams.maxGapMm-independentBefore.max)<1e-8)
  assert.ok(Math.abs(result.referenceSeams.rmsGapMm-independentBefore.rms)<1e-8)
  assert.ok(Math.abs(result.terminal.maxGapMm-independentAfter.max)<1e-8)
  assert.ok(Math.abs(result.terminal.rmsGapMm-independentAfter.rms)<1e-8)
  assert.ok(result.terminal.maxGapMm<result.referenceSeams.maxGapMm)
  assert.ok(result.terminal.rmsGapMm<result.referenceSeams.rmsGapMm)
  assert.equal(result.poses.length,3)
  assert.ok(result.poses.every(p=>!p.staticContactClear&&!p.principalStrainValid))
  assert.equal(result.interval.coupledInterpanelIntervalClear,false)
  assert.equal(result.interval.blocker.reason,'sampled-contact')
  assert.equal(result.meshConditioning.approved,false)
  assert.equal(result.meshConditioning.illConditionedFaces,192)
  assert.equal(result.seamGroupsNonworse,false)
  assert.deepEqual(result.seamGroupRegressions.map(x=>x.id).sort(),
    ['seam-side-l','seam-side-r'])
  assert.ok(result.seamGroupRegressions.every(x=>x.maxDeltaMm>79))
  assert.equal(result.limitedResearchGatePass,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.deformableContinuousCollisionCertified,false)
  assert.equal(result.avatarEntryCertified,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.sourceNonmutationVerified,true)
  assert.equal(JSON.stringify({project,payload,motions}),before)
  console.log('FOUR_PANEL_COUPLED_MOTION_GATE '+JSON.stringify({
    before:result.referenceSeams,after:{maxGapMm:result.terminal.maxGapMm,
      rmsGapMm:result.terminal.rmsGapMm},
    principalExtensionPercent:result.terminal.principalExtensionPercent,
    principalCompressionPercent:result.terminal.principalCompressionPercent,
    interpanelContactBySample:result.poses.map(p=>p.interpanelNearClearancePairs),
    intrapanelIntersectionsBySample:result.poses.map(p=>p.intrapanelIntersections),
    meshIllConditionedFaces:result.meshConditioning.illConditionedFaces,
    groupRegressions:result.seamGroupRegressions,intervalBlocker:result.interval.blocker,
    runtimeMs:+runtimeMs.toFixed(2),sourceNonmutation:true,accepted:false}))
})

test('independent geometric witness reproduces rejected inter-panel interval contact',()=>{
  const {project,payload,motions}=make()
  const result=audit(project,payload,motions)
  const witness=result.interval.blocker
  assert.equal(witness.fraction,.875)
  const at=(id,face)=>{
    const piece=payload.pieces.find(p=>p.id===id)
    return piece.faces[face].map(local=>{
      const point=payload.particles[piece.particleIndices[local]].position
      return point.map((x,k)=>x+motions[id].translationM[k]*witness.fraction)
    })
  }
  const distance=measureNativeTriangleDistanceM(
    at(witness.pieceA,witness.faceA),at(witness.pieceB,witness.faceB))*1000
  assert.ok(distance<1e-8)
  assert.ok(Math.abs(distance-witness.distanceMm)<1e-8)
})

test('actual underarm crease cannot rotate the unremeshed sleeve across material faces',()=>{
  const {project,payload,motions}=make()
  const inspection=inspectNativeUnderarmCenterCrease(payload)
  assert.equal(inspection.panels.length,2)
  assert.ok(inspection.panels.every(p=>p.crossingFaceCount>0&&
    p.requiresCreaseConformingRemesh))
  const sleeve=payload.pieces.find(p=>p.id==='sleeve-left')
  const crease=inspection.panels.find(p=>p.panelId==='sleeve-left')
  const signed=([x,y])=>{
    const [dx,dy]=crease.creaseDirection
    return dx*(y-crease.creaseOriginM[1])-dy*(x-crease.creaseOriginM[0])
  }
  const movingVertices=sleeve.flatVerticesM.flatMap((p,i)=>signed(p)>1e-6?[i]:[])
  assert.ok(movingVertices.length>0&&movingVertices.length<sleeve.particleIndices.length)
  motions['sleeve-left'].hinge={axisOriginM:[0,0,0],axisUnit:[0,1,0],
    startRadians:0,endRadians:Math.PI/3,movingVertices}
  const before=JSON.stringify({project,payload,motions})
  assert.throws(()=>audit(project,payload,motions),/deform a material triangle/)
  assert.equal(JSON.stringify({project,payload,motions}),before)
})

test('invalid sampling, incomplete authored sewing and bad motion fail closed without mutation',()=>{
  const {project,payload,motions}=make()
  const snapshot=JSON.stringify({project,payload,motions})
  for(const sampleFractions of [[0,1],[0,.5,.5,1],[.1,.5,1],
    [0,.5,.9],[0,NaN,1],Array.from({length:8},(_,i)=>i/7)])
    assert.throws(()=>audit(project,payload,motions,{sampleFractions}),/sample settings/)
  assert.throws(()=>audit(project,payload,motions,{maxFacePairs:1}),/budget/)
  assert.throws(()=>audit(project,payload,motions,{strainLimitPercent:-1}),/sample settings/)
  assert.throws(()=>audit(project,payload,{...motions,front:{translationM:[2,0,0]}}),
    /translation/)
  const missing=structuredClone(project)
  missing.seams=missing.seams.slice(1)
  assert.throws(()=>audit(missing,payload,motions),/sewing/)
  assert.equal(JSON.stringify({project,payload,motions}),snapshot)
})
