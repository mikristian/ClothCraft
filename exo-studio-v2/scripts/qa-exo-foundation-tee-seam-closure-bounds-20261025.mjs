import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {auditFoundationTeeSeamClosureBoundsResearch20261025 as audit} from
  '../src/core/backends/nativeFoundationTeeSeamClosureBoundsResearch20261025.js'

const fixture=()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  return {project,payload}
}
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`)

test('actual four-panel tee reports all 102 sewn pairs and preserves source state',()=>{
  const {project,payload}=fixture()
  const before=JSON.stringify({project,payload})
  const start=performance.now()
  const result=audit(project,payload)
  const runtimeMs=performance.now()-start
  assert.equal(result.panelCount,4)
  assert.equal(result.seamGroupCount,14)
  assert.equal(result.sewingPairCount,102)
  assert.equal(result.seamGroups.reduce((n,g)=>n+g.sewingPairCount,0),102)
  assert.equal(result.seamGroups.filter(g=>!g.crossPanel).length,2)
  assert.equal(result.worstGroupsByRms.length,14)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.simultaneousClosureProven,false)
  assert.equal(result.contactChecked,false)
  assert.equal(JSON.stringify({project,payload}),before)
  console.log('FOUNDATION_TEE_CLOSURE_BOUNDS '+JSON.stringify({
    maximumSeamGapMm:result.maximumSeamGapMm,
    rmsSeamGapMm:result.rmsSeamGapMm,
    worstGroups:result.worstGroupsByRms.slice(0,5).map(id=>{
      const g=result.seamGroups.find(group=>group.seamId===id)
      return {id,maxGapMm:g.maximumGapMm,rmsGapMm:g.rmsGapMm,
        translationLowerBoundMm:g.independentTranslationRmsLowerBoundMm}
    }),runtimeMs:+runtimeMs.toFixed(2),sourceNonmutation:true,
    physicalAcceptance:false}))
})

test('independent particle-space oracle agrees on global and every group RMS',()=>{
  const {project,payload}=fixture(),result=audit(project,payload)
  const constraints=payload.constraints.filter(c=>c.type==='seam')
  const grouped=new Map()
  const gaps=[]
  for(const c of constraints){
    const a=payload.particles[c.a].position,b=payload.particles[c.b].position
    const mm=1000*Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+
      (a[2]-b[2])**2)
    gaps.push(mm)
    if(!grouped.has(c.seamId))grouped.set(c.seamId,[])
    grouped.get(c.seamId).push(mm)
  }
  near(result.maximumSeamGapMm,Math.max(...gaps))
  near(result.rmsSeamGapMm,Math.sqrt(gaps.reduce((s,x)=>s+x*x,0)/102))
  for(const group of result.seamGroups){
    const values=grouped.get(group.seamId)
    assert.equal(group.sewingPairCount,values.length)
    near(group.maximumGapMm,Math.max(...values))
    near(group.rmsGapMm,Math.sqrt(values.reduce((s,x)=>s+x*x,0)/values.length))
    if(group.crossPanel){
      assert.ok(group.independentTranslationRmsLowerBoundMm<=group.rmsGapMm+1e-8)
      assert.equal(group.bestIndependentTranslationM.length,3)
    }else{
      assert.equal(group.independentTranslationRmsLowerBoundMm,null)
      assert.equal(group.bestIndependentTranslationM,null)
      assert.equal(group.samePanelRigidTranslationCannotClose,true)
    }
  }
})

test('independent cross-panel translation bound is invariant to rigid panel offset',()=>{
  const {project,payload}=fixture()
  const original=audit(project,payload)
  const shifted=structuredClone(payload)
  const shift=[.012,-.007,.005]
  for(const particle of shifted.particles){
    if(particle.pieceId==='back')
      particle.position=particle.position.map((x,i)=>x+shift[i])
  }
  const moved=audit(project,shifted)
  for(const seamId of ['seam-shoulder-l','seam-shoulder-r']){
    const a=original.seamGroups.find(g=>g.seamId===seamId)
    const b=moved.seamGroups.find(g=>g.seamId===seamId)
    near(a.independentTranslationRmsLowerBoundMm,
      b.independentTranslationRmsLowerBoundMm)
    // Authored shoulders run from front to back; offsetting back shifts
    // the independently optimal front-to-back translation by exactly shift.
    for(let i=0;i<3;i++)
      near(b.bestIndependentTranslationM[i]-a.bestIndependentTranslationM[i],shift[i])
  }
  assert.notEqual(moved.rmsSeamGapMm,original.rmsSeamGapMm)
})

test('per-group translation lower bound is attained by a real rigid shift of one panel',()=>{
  const {project,payload}=fixture()
  const baseline=audit(project,payload)
  const shoulder=baseline.seamGroups.find(g=>g.seamId==='seam-shoulder-l')
  assert.equal(shoulder.fromPanelId,'front')
  assert.equal(shoulder.toPanelId,'back')
  const moved=structuredClone(payload)
  for(const particle of moved.particles){
    if(particle.pieceId==='front')
      particle.position=particle.position.map((x,i)=>
        x+shoulder.bestIndependentTranslationM[i])
  }
  const result=audit(project,moved)
  const closed=result.seamGroups.find(g=>g.seamId==='seam-shoulder-l')
  near(closed.rmsGapMm,shoulder.independentTranslationRmsLowerBoundMm)
  assert.ok(closed.rmsGapMm<shoulder.rmsGapMm)
  // A local optimum is NOT proof that other groups or contact remain valid.
  assert.equal(result.simultaneousClosureProven,false)
  assert.equal(result.contactChecked,false)
  assert.equal(result.physicalAcceptance,false)
})

test('same-panel underarm cannot be repaired by translating the whole sleeve',()=>{
  const {project,payload}=fixture()
  const before=audit(project,payload)
  const moved=structuredClone(payload)
  for(const particle of moved.particles){
    if(particle.pieceId==='sleeve-left')
      particle.position=particle.position.map((x,i)=>x+[.03,.04,-.01][i])
  }
  const after=audit(project,moved)
  const underarm='seam-sleeve-l-underarm'
  const a=before.seamGroups.find(g=>g.seamId===underarm)
  const b=after.seamGroups.find(g=>g.seamId===underarm)
  near(a.maximumGapMm,b.maximumGapMm)
  near(a.rmsGapMm,b.rmsGapMm)
  assert.equal(b.independentTranslationRmsLowerBoundMm,null)
})

test('malformed positions and incomplete seam inventories fail closed',()=>{
  const {project,payload}=fixture()
  for(const value of [NaN,Infinity,101]){
    const bad=structuredClone(payload)
    bad.particles[0].position[0]=value
    assert.throws(()=>audit(project,bad),/position/)
  }
  const missing=structuredClone(payload)
  missing.constraints.splice(missing.constraints.findIndex(c=>c.type==='seam'),1)
  assert.throws(()=>audit(project,missing),/frozen Foundation Tee/)
})
