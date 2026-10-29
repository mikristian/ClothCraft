import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectIndustrialFabricFitCalibrationWitness20261028 as inspect} from './industrialFabricFitCalibrationWitness20261028.mjs'
import {estimateTensileStiffness,estimateShearStiffness,estimateCantileverBending} from './fabricCalibration.js'
const observations=()=>{
 const warp={widthMm:50,gaugeLengthMm:100,observations:[{extensionMm:5,forceN:5},{extensionMm:10,forceN:10}]}
 const weft={widthMm:50,gaugeLengthMm:100,observations:[{extensionMm:5,forceN:3},{extensionMm:10,forceN:6}]}
 const shear={widthMm:50,forceN:2,shearAngleDeg:10}
 const bending={gsm:180,overhangMm:50,tipDeflectionMm:2}
 return {warp,weft,shear,bending,predicted:{warpNPerM:estimateTensileStiffness(warp).stiffnessNPerM,
 weftNPerM:estimateTensileStiffness(weft).stiffnessNPerM,
 shearNPerM:estimateShearStiffness(shear),bendingNm:estimateCantileverBending(bending)}}
}
const fixture=()=>({fabricId:'cotton',measurementId:'lab-1',operatorId:'operator-1',calibrationId:'cal-1',
 expectedSize:'12',scene:{activeGradedSize:'12',gradedFitEvidence:{size:'12',nativeStepEvidence:true,
 measurementsFinite:true,simulationTimeSeconds:.1,fitCertified:false,manufacturingApproved:false}},observations:observations()})
test('independent directional fabric axes and shear/bending compare without certification',()=>{
 const f=fixture(),original=structuredClone(f),r=inspect(f)
 assert.equal(r.ok,true);assert.equal(r.withinTolerance,true);assert.equal(r.rows.length,4)
 assert.equal(r.fitCertified,false);assert.equal(r.simulationCalibrated,false)
 assert.deepEqual(f,original)
})
test('drift, stale size, missing provenance, malformed measurements refuse approval',()=>{
 const f=fixture();f.observations.predicted.warpNPerM*=2
 assert.equal(inspect(f).withinTolerance,false)
 assert.equal(inspect({...f,expectedSize:'14'}).ok,false)
 assert.equal(inspect({...f,measurementId:''}).ok,false)
 f.observations.warp.observations[0].extensionMm=0
 assert.equal(inspect(f).ok,false)
})
