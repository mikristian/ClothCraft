import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectIndustrialCalibratedFitWitness20261028 as audit} from './industrialCalibratedFitWitness20261028.mjs'

const source=()=>({activeGradedSize:'10',gradeRun:{sizes:['4','6','8','10'],sizeCorrespondence:{EU40:'10'}},
 gradedFitEvidence:{size:'10',nativeMeshCompiled:true,nativeStepEvidence:true,
 seamCount:1,simulationTimeSeconds:.1,maxSeamGapMm:1.3,maxRmsSeamGapMm:.5,
 measurementsFinite:true,fitCertified:false,manufacturingApproved:false},time:.1,
 metrics:{step:true},positions:[[0,0,0],[.1,0,0],[0,.1,0]],
 seams:[{id:'side',gap_m:.0013,rms_gap_m:.0005}]})
const sample=()=>({format:'exo.physical-fit-observation.v1',size:'10',operatorId:'TEST',
 calibrationId:'C1',sampleId:'S1',seams:[{seamId:'side',measuredMaxGapMm:1.5}]})

test('size-linked native 3D fit and physical measurement can be compared without certification',()=>{
 const input=source(),physical=sample(),before=structuredClone({input,physical})
 const checked=audit(input,physical)
 assert.equal(checked.ok,true)
 assert(Math.abs(checked.rows[0].deltaMm-.2)<1e-9)
 assert.equal(checked.fitCertified,false)
 assert.equal(checked.physicalFitAuthenticated,false)
 assert.deepEqual({input,physical},before)
})
test('wrong size, changed seam identity and measured outlier fail closed',()=>{
 for(const mutate of [
  p=>{p.size='8'},p=>{p.seams[0].seamId='other'},
  p=>{p.seams[0].measuredMaxGapMm=9},p=>{p.seams.push({...p.seams[0]})},
 ]){const p=sample();mutate(p);assert.equal(audit(source(),p).ok,false)}
})
test('unstable or unstepped native fit cannot borrow self-reported physical measurements',()=>{
 const native=source();native.gradedFitEvidence.nativeStepEvidence=false
 assert.equal(audit(native,sample()).ok,false)
})
