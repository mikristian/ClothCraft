import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNativeGradedFitEvidence20261025 as inspect} from './nativeGradedFitEvidence20261025.js'
const snapshot=()=>({
  activeGradedSize:'L',gradedFitEvidence:{
    size:'L',nativeMeshCompiled:true,nativeStepEvidence:true,
    seamCount:1,simulationTimeSeconds:.1,maxSeamGapMm:1.3,maxRmsSeamGapMm:.5,
    measurementsFinite:true,fitCertified:false,manufacturingApproved:false,
  },
  time:.1,metrics:{step:true},positions:[[0,0,0],[.1,0,0],[0,.1,0]],
  seams:[{id:'side-sewn',gap_m:.0013,rms_gap_m:.0005}],
})
test('accepts finite size-linked live native step while never granting fit/cutting',()=>{
  const measured=inspect(snapshot())
  assert.equal(measured.ok,true,measured.reason)
  assert.equal(measured.stepVerified,true)
  assert.equal(measured.maxGapMm,1.3)
  assert.equal(measured.provisionalSeamGapWithin2Mm,true)
  assert.equal(measured.fitCertified,false)
  assert.equal(measured.manufacturingApproved,false)
  assert.equal(measured.rows.length,1)
})
test('unstepped size compiles but has no invented gap measurements',()=>{
  const scene=snapshot()
  scene.gradedFitEvidence={...scene.gradedFitEvidence,nativeStepEvidence:false,
    simulationTimeSeconds:null,maxSeamGapMm:null,maxRmsSeamGapMm:null}
  assert.equal(inspect(scene).stage,'compiled-only')
  scene.gradedFitEvidence.maxSeamGapMm=0
  assert.equal(inspect(scene).ok,false)
})
test('stale, tampered or missing 3D fitting evidence fails closed',()=>{
  for(const change of [
    s=>s.gradedFitEvidence.size='XS',
    s=>s.gradedFitEvidence.fitCertified=true,
    s=>s.time=0,
    s=>s.gradedFitEvidence.simulationTimeSeconds=.3,
    s=>s.gradedFitEvidence.maxSeamGapMm=0,
    s=>s.gradedFitEvidence.measurementsFinite=false,
    s=>s.seams[0].gap_m=Infinity,
    s=>s.positions[0][0]=NaN,
    s=>s.metrics=null,
    s=>s.gradedFitEvidence=null,
  ]){
    const scene=snapshot();change(scene)
    assert.equal(inspect(scene).ok,false)
  }
  assert.equal(inspect({...snapshot(),activeGradedSize:null}).ok,false)
})
test('duplicate sewn identities and physically impossible RMS gap are rejected',()=>{
  const duplicate=snapshot()
  duplicate.seams.push({...duplicate.seams[0]})
  duplicate.gradedFitEvidence.seamCount=2
  assert.equal(inspect(duplicate).ok,false)
  const impossible=snapshot()
  impossible.seams[0].rms_gap_m=.002
  impossible.gradedFitEvidence.maxRmsSeamGapMm=2
  assert.equal(inspect(impossible).ok,false)
})
test('sewn but open seam remains review-only; no seam inventory cannot imply closure',()=>{
  const open=snapshot()
  open.seams[0].gap_m=.008
  open.gradedFitEvidence.maxSeamGapMm=8
  assert.equal(inspect(open).provisionalSeamGapWithin2Mm,false)
  const bare=snapshot()
  bare.seams=[];bare.gradedFitEvidence.seamCount=0
  bare.gradedFitEvidence.maxSeamGapMm=null;bare.gradedFitEvidence.maxRmsSeamGapMm=null
  const result=inspect(bare)
  assert.equal(result.ok,true)
  assert.equal(result.stage,'stepped-without-seams')
  assert.equal(result.provisionalSeamGapWithin2Mm,false)
})

test('authoritative named native grade catalogs and external aliases preserve actual fitting identity',()=>{
 const named=snapshot()
 named.activeGradedSize='12'
 named.gradedFitEvidence.size='12'
 named.gradeRun={sizes:['2','4','8','12'],sizeCorrespondence:{EU40:'12'}}
 assert.equal(inspect(named).ok,true)
 named.activeGradedSize='EU40'
 named.gradedFitEvidence.size='EU40'
 assert.equal(inspect(named).ok,true)
 named.gradeRun.sizeCorrespondence.EU40='99'
 assert.equal(inspect(named).ok,false)
 named.gradeRun.sizeCorrespondence.EU40='12'
 named.gradeRun.sizes=['2','4','12','12']
 assert.equal(inspect(named).ok,false)
})
