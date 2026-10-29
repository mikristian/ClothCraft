import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeSleeveQualityContact20261025} from
  '../src/core/backends/nativeSleeveCreaseQualityContactResearch20261025.js'
import {studyFoundationTeeDevelopableSleeveHingeResearch20261025} from
  '../src/core/backends/nativeSleeveDevelopableHingeCandidateResearch20261025.js'
import {researchFoldedSleeveSeamMerit20261025 as optimize} from
  '../src/core/backends/nativeSleeveFoldedSeamMeritResearch20261025.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'

const payload=()=>buildNativeSimulationPayload(createTemplateProject('tee'),{quality:'quality'})
const fixture=id=>{
  const source=payload(),mesh=researchFoundationTeeSleeveQualityContact20261025(source,id)
  const fold=studyFoundationTeeDevelopableSleeveHingeResearch20261025(source,id,mesh,
    {angleRadians:.35})
  return {source,mesh,folded:fold.foldedPayload}
}
const norm=a=>Math.hypot(...a)
const diff=(a,b)=>a.map((x,i)=>x-b[i])
const translate=(payload,id,shift)=>{
  const clone=structuredClone(payload),piece=clone.pieces.find(p=>p.id===id)
  for(const index of piece.particleIndices)
    clone.particles[index].position=clone.particles[index].position.map((x,k)=>x+shift[k])
  return clone
}

test('both real folded sleeves get bounded analytic sewing directions, never physical acceptance',()=>{
  const started=performance.now()
  for(const id of ['sleeve-left','sleeve-right']){
    const {source,mesh,folded}=fixture(id)
    const before=JSON.stringify(source),foldBefore=JSON.stringify(folded),
      meshBefore=JSON.stringify(mesh)
    const result=optimize(source,folded,id)
    assert.equal(result.sewingPairCount,102)
    assert.equal(result.seamGroupCount,14)
    assert.ok(norm(result.selectedTranslationM)<=.150000000001)
    assert.ok(result.candidateSeams.rmsGapMm<result.foldedSeams.rmsGapMm-1e-5)
    assert.ok(result.trials.length===5)
    assert.ok(result.trials.every(x=>Number.isFinite(x.maxGapMm)&&
      Number.isFinite(x.rmsGapMm)))
    assert.ok(result.trials.at(-1).rmsGapMm<=result.trials[0].rmsGapMm+1e-9)
    const independent=measureNativeSeamResiduals(result.candidatePayload)
    assert.ok(Math.abs(independent.maxGapMm-result.candidateSeams.maxGapMm)<1e-9)
    assert.ok(Math.abs(independent.rmsGapMm-result.candidateSeams.rmsGapMm)<1e-9)
    assert.ok(result.fullPrincipalExtensionPercent>1000)
    assert.equal(result.staticContactValid,false)
    assert.equal(result.limitedResearchGatePass,false)
    for(const flag of ['solverConstraintsRebuilt','materialCalibrated',
      'continuousDeformableCCDCertified','avatarContactChecked',
      'physicalAcceptance','safeToAutoApply'])
      assert.equal(result[flag],false)
    const selected=result.candidatePayload.pieces.find(p=>p.id===id)
    const original=folded.pieces.find(p=>p.id===id)
    for(let i=0;i<selected.particleIndices.length;i++){
      const a=folded.particles[original.particleIndices[i]].position
      const b=result.candidatePayload.particles[selected.particleIndices[i]].position
      assert.ok(norm(diff(diff(b,a),result.selectedTranslationM))<1e-10)
    }
    assert.equal(JSON.stringify(source),before)
    assert.equal(JSON.stringify(folded),foldBefore)
    assert.equal(JSON.stringify(mesh),meshBefore)
    console.log('FOLDED_SEAM_MERIT '+JSON.stringify({id,
      folded:result.foldedSeams,candidate:result.candidateSeams,
      translation:result.selectedTranslationM,
      original:result.originalSeams,regressions:result.seamGroupRegressions.length,
      originalRegressions:result.originalSeamGroupRegressions.length,
      principalExtension:result.fullPrincipalExtensionPercent,
      principalCompression:result.fullPrincipalCompressionPercent,
      intrapanelIntersections:result.intrapanelIntersections,
      intrapanelNearClearance:result.intrapanelNearClearancePairs,
      interpanelNearClearance:result.interpanelNearClearancePairs,
      staticContactValid:result.staticContactValid,
      activeIntervalClear:result.activeIntervals.map(x=>({
        panel:x.otherPanelId,clear:x.coupledInterpanelIntervalClear}))}))
  }
  console.log('FOLDED_SEAM_MERIT_TWO_SLEEVES_MS '+(performance.now()-started).toFixed(2))
})

test('analytic unconstrained direction independently minimizes sewing sum-of-squares',()=>{
  const {source,folded}=fixture('sleeve-left')
  const result=optimize(source,folded,'sleeve-left')
  const t=result.analyticTranslationM
  assert.ok(norm(t)>0)
  const objective=shift=>measureNativeSeamResiduals(
    translate(folded,'sleeve-left',shift)).rmsGapMm**2
  const at=objective(t)
  const h=.0001
  for(let k=0;k<3;k++){
    const plus=[...t],minus=[...t]
    plus[k]+=h;minus[k]-=h
    assert.ok(objective(plus)>=at-1e-7)
    assert.ok(objective(minus)>=at-1e-7)
    assert.ok(Math.abs(objective(plus)-objective(minus))<1e-6)
  }
})

test('tampered sewing, non-isometric folds, pins and unsafe budgets fail closed',()=>{
  const {source,folded}=fixture('sleeve-right')
  const sourceBefore=JSON.stringify(source),foldedBefore=JSON.stringify(folded)
  for(const options of [{maxTranslationM:0},{maxTranslationM:.151},
    {maxTranslationM:NaN},{clearanceM:0},{maxFacePairs:0}])
    assert.throws(()=>optimize(source,folded,'sleeve-right',options),/invalid/i)
  assert.throws(()=>optimize(source,folded,'front'),/sleeve/i)
  const missing=structuredClone(folded)
  missing.constraints.splice(missing.constraints.findIndex(x=>x.type==='seam'),1)
  assert.throws(()=>optimize(source,missing,'sleeve-right'),/sewing/i)
  const stretched=structuredClone(folded)
  const index=stretched.pieces.find(p=>p.id==='sleeve-right').particleIndices[15]
  stretched.particles[index].position[0]+=.01
  assert.throws(()=>optimize(source,stretched,'sleeve-right'),/isometry/i)
  const changedMaterial=structuredClone(folded)
  changedMaterial.pieces.find(p=>p.id==='sleeve-right').flatVerticesM[0][0]+=.01
  assert.throws(()=>optimize(source,changedMaterial,'sleeve-right'),/provenance/i)
  const inverted=structuredClone(folded)
  inverted.pieces.find(p=>p.id==='sleeve-right').faces[0].reverse()
  assert.throws(()=>optimize(source,inverted,'sleeve-right'),/winding|area/i)
  const emptySource=structuredClone(source)
  emptySource.pieces.find(p=>p.id==='sleeve-right').faces=[]
  assert.throws(()=>optimize(emptySource,folded,'sleeve-right'),/provenance/i)
  const pinned=structuredClone(source),pinnedFold=structuredClone(folded)
  const anchor={particle:folded.pieces.find(p=>p.id==='sleeve-right')
    .particleIndices[0],target:[0,0,0],stiffness:1,axes:'xyz',type:'fit-anchor'}
  pinned.anchors.push(anchor);pinnedFold.anchors.push(anchor)
  assert.throws(()=>optimize(pinned,pinnedFold,'sleeve-right'),/pinned/i)
  assert.equal(JSON.stringify(source),sourceBefore)
  assert.equal(JSON.stringify(folded),foldedBefore)
})
