import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {researchFoundationTeeJointTranslation20261025 as joint} from
  '../src/core/backends/nativeFoundationTeeJointTranslationResearch20261025.js'

const fixture=()=>{
  const project=createTemplateProject('tee')
  return {project,payload:buildNativeSimulationPayload(project,{quality:'quality'})}
}
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`)
const rawMetrics=payload=>{
  const distances=payload.constraints.filter(c=>c.type==='seam').map(c=>{
    const a=payload.particles[c.a].position,b=payload.particles[c.b].position
    return 1000*Math.sqrt(a.reduce((sum,x,k)=>sum+(x-b[k])**2,0))
  })
  return {maximumSeamGapMm:Math.max(...distances),
    rmsSeamGapMm:Math.sqrt(distances.reduce((sum,x)=>sum+x*x,0)/distances.length)}
}

test('real four-panel simultaneous 102-pair least-squares solution is independently measured and immutable',()=>{
  const {project,payload}=fixture()
  const original=JSON.stringify({project,payload})
  const start=performance.now(),result=joint(project,payload)
  const runtimeMs=performance.now()-start
  assert.equal(result.panelCount,4)
  assert.equal(result.sewingPairCount,102)
  assert.equal(result.crossPanelPairCount,92)
  assert.equal(result.intraPanelPairCount,10)
  for(const key of ['before','after']){
    const measured=rawMetrics(key==='before'?payload:result.candidatePayload)
    near(result[key].maximumSeamGapMm,measured.maximumSeamGapMm)
    near(result[key].rmsSeamGapMm,measured.rmsSeamGapMm)
  }
  assert.ok(result.after.rmsSeamGapMm<result.before.rmsSeamGapMm)
  assert.equal(JSON.stringify({project,payload}),original)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.sweptCollisionCertified,false)
  console.log('FOUNDATION_TEE_JOINT_TRANSLATION '+JSON.stringify({
    before:result.before,after:result.after,translationsM:result.translationsM,
    runtimeMs:+runtimeMs.toFixed(2),sourceNonmutation:true}))
})

test('joint translations preserve all per-panel principal spectral strains, but do not certify contact',()=>{
  const {project,payload}=fixture(),result=joint(project,payload)
  const before=auditNativePrincipalStrain(payload,{limitPercent:5})
  const after=auditNativePrincipalStrain(result.candidatePayload,{limitPercent:5})
  near(after.maximumPrincipalExtensionPercent,before.maximumPrincipalExtensionPercent,1e-7)
  near(after.maximumPrincipalCompressionPercent,before.maximumPrincipalCompressionPercent,1e-7)
  assert.equal(after.overLimitTriangles,before.overLimitTriangles)
  assert.equal(after.withinDeclaredStrainLimit,false)
  const self=inspectNativeIntrapanelStaticContact(result.candidatePayload,{clearanceM:.001})
  const between=inspectNativeInterpanelExactStaticContact(result.candidatePayload,{
    clearanceM:.001,maxPairs:1_000_000,maxNarrowphasePairs:100_000})
  assert.ok(self.intersectingTrianglePairs>0||
    self.nonadjacentNearClearancePairs>0||between.nearClearancePairs>0||
    !after.withinDeclaredStrainLimit)
  console.log('FOUNDATION_TEE_JOINT_PHYSICS '+JSON.stringify({
    principalExtensionPercent:after.maximumPrincipalExtensionPercent,
    principalCompressionPercent:after.maximumPrincipalCompressionPercent,
    intrapanelIntersections:self.intersectingTrianglePairs,
    intrapanelNearClearancePairs:self.nonadjacentNearClearancePairs,
    interpanelNearClearancePairs:between.nearClearancePairs,
    contactClear:self.staticDisjointThicknessScreenClear&&between.staticInterpanelExactClear,
    physicalAcceptance:false,avatarContactChecked:false,sweptCCDVerified:false}))
})

test('three discrete coupled translation-path poses independently reject static fabric contact',()=>{
  const {project,payload}=fixture(),result=joint(project,payload)
  const snapshot=JSON.stringify(payload),samples=[]
  for(const fraction of [0,.5,1]){
    const pose=structuredClone(payload)
    for(const particle of pose.particles)
      particle.position=particle.position.map((x,k)=>
        x+fraction*result.translationsM[particle.pieceId][k])
    const self=inspectNativeIntrapanelStaticContact(pose,{clearanceM:.001})
    const between=inspectNativeInterpanelExactStaticContact(pose,{
      clearanceM:.001,maxPairs:1_000_000,maxNarrowphasePairs:100_000})
    const seams=rawMetrics(pose)
    const contactClear=self.staticDisjointThicknessScreenClear&&
      between.staticInterpanelExactClear
    samples.push({fraction,maxGapMm:seams.maximumSeamGapMm,
      rmsGapMm:seams.rmsSeamGapMm,
      intrapanelIntersections:self.intersectingTrianglePairs,
      interpanelNearClearancePairs:between.nearClearancePairs,contactClear})
    assert.equal(contactClear,false)
  }
  near(samples[0].rmsGapMm,result.before.rmsSeamGapMm)
  near(samples[2].rmsGapMm,result.after.rmsSeamGapMm)
  assert.equal(JSON.stringify(payload),snapshot)
  console.log('FOUNDATION_TEE_JOINT_SAMPLED_CONTACT '+JSON.stringify({
    samples,discreteOnly:true,sweptCCDVerified:false,physicalAcceptance:false}))
})

test('optimal joint translations satisfy an independent finite-difference objective test',()=>{
  const {project,payload}=fixture(),result=joint(project,payload)
  const objective=(translations)=>{
    let sum=0
    for(const c of payload.constraints.filter(c=>c.type==='seam')){
      const a=payload.particles[c.a],b=payload.particles[c.b]
      const ta=translations[a.pieceId],tb=translations[b.pieceId]
      for(let k=0;k<3;k++){
        const residual=b.position[k]+tb[k]-a.position[k]-ta[k]
        sum+=residual*residual
      }
    }
    return sum
  }
  const optimum=objective(result.translationsM)
  for(const id of ['back','sleeve-left','sleeve-right'])
    for(let axis=0;axis<3;axis++)
      for(const delta of [-.001,.001]){
        const shifted=structuredClone(result.translationsM)
        shifted[id][axis]+=delta
        assert.ok(objective(shifted)>=optimum-1e-10,
          `joint optimum not stationary for ${id} axis ${axis}`)
      }
})

test('same-panel sleeve underarm gaps cannot be changed by joint rigid translations',()=>{
  const {project,payload}=fixture(),result=joint(project,payload)
  const old=payload.constraints.filter(c=>c.type==='seam'&&c.a!==c.b&&
    payload.particles[c.a].pieceId===payload.particles[c.b].pieceId)
  assert.equal(old.length,10)
  for(const c of old){
    const gap=p=>Math.hypot(...p.particles[c.a].position.map((x,k)=>
      x-p.particles[c.b].position[k]))
    near(gap(payload),gap(result.candidatePayload),1e-12)
  }
})

test('global rigid offsets do not alter the relative joint solution',()=>{
  const {project,payload}=fixture(),baseline=joint(project,payload)
  const moved=structuredClone(payload)
  for(const particle of moved.particles)
    particle.position=particle.position.map((x,k)=>x+[.013,-.027,.018][k])
  const second=joint(project,moved)
  for(const id of Object.keys(baseline.translationsM))
    for(let k=0;k<3;k++)
      near(baseline.translationsM[id][k],second.translationsM[id][k],1e-10)
  near(baseline.after.rmsSeamGapMm,second.after.rmsSeamGapMm)
})

test('joint result is detached from original and candidate edits cannot alter the source',()=>{
  const {project,payload}=fixture(),before=JSON.stringify(payload)
  const result=joint(project,payload)
  result.candidatePayload.particles[0].position[0]+=1
  result.translationsM.back[0]+=1
  assert.equal(JSON.stringify(payload),before)
})

test('invalid particle coordinates and incomplete frozen sewing fail closed',()=>{
  const {project,payload}=fixture()
  for(const value of [NaN,Infinity,101]){
    const invalid=structuredClone(payload)
    invalid.particles[0].position[0]=value
    assert.throws(()=>joint(project,invalid),/particle/)
  }
  const missing=structuredClone(payload)
  missing.constraints.splice(missing.constraints.findIndex(c=>c.type==='seam'),1)
  assert.throws(()=>joint(project,missing),/frozen Foundation Tee/)
})
