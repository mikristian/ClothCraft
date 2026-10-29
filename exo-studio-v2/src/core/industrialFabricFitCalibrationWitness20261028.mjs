// Source-bound, read-only comparison of measured fabric tests with native
// simulation predictions. Not a CLO calibration or physical fit certificate.
import {estimateTensileStiffness,estimateShearStiffness,estimateCantileverBending} from './fabricCalibration.js'
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const id=s=>typeof s==='string'&&/^[A-Za-z0-9_.:-]{1,96}$/.test(s)
const blocked=(code)=>({ok:false,status:'BLOCKED',issues:[{code}],fitCertified:false,materialQualified:false,manufacturingApproved:false})
/** Require distinct measured and predicted values with explicit units and a
 * size-linked stepped Rust scene; never promote a digital match to factory fit. */
export function inspectIndustrialFabricFitCalibrationWitness20261028({fabricId,measurementId,operatorId,calibrationId,observations,scene,expectedSize,tolerancePct=10}={}){
 if(![fabricId,measurementId,operatorId,calibrationId].every(id)||
  !finite(tolerancePct)||tolerancePct<=0||tolerancePct>25)return blocked('INVALID_MEASUREMENT_PROVENANCE')
 if(!scene||scene.activeGradedSize!==expectedSize||!id(expectedSize)||
  scene.gradedFitEvidence?.size!==expectedSize||scene.gradedFitEvidence?.nativeStepEvidence!==true||
  scene.gradedFitEvidence?.measurementsFinite!==true||scene.gradedFitEvidence?.fitCertified!==false||
  scene.gradedFitEvidence?.manufacturingApproved!==false||
  !finite(scene.gradedFitEvidence?.simulationTimeSeconds)||scene.gradedFitEvidence.simulationTimeSeconds<=0)
  return blocked('MISSING_SIZE_LINKED_NATIVE_SIMULATION')
 if(!observations||!Array.isArray(observations.warp?.observations)||
  !Array.isArray(observations.weft?.observations)||!observations.shear||!observations.bending||
  !observations.predicted||typeof observations.predicted!=='object')return blocked('MISSING_FABRIC_MEASUREMENTS')
 try{
  const measured={warpNPerM:estimateTensileStiffness(observations.warp).stiffnessNPerM,
   weftNPerM:estimateTensileStiffness(observations.weft).stiffnessNPerM,
   shearNPerM:estimateShearStiffness(observations.shear),
   bendingNm:estimateCantileverBending(observations.bending)}
  const rows=Object.entries(measured).map(([key,value])=>{
   const prediction=observations.predicted[key]
   if(!finite(prediction)||prediction<=0||!finite(value)||value<=0)throw Error('invalid prediction')
   return {metric:key,measured:value,predicted:prediction,errorPct:Math.abs(prediction-value)/value*100}
  })
  const withinTolerance=rows.every(row=>row.errorPct<=tolerancePct)
  return {ok:true,status:withinTolerance?'SELF_REPORTED_MATERIAL_COMPARISON_WITHIN_TOLERANCE':'MATERIAL_PREDICTION_DRIFT',
   fabricId,measurementId,expectedSize,rows,withinTolerance,
   independentlyMeasured:false,simulationCalibrated:false,fitCertified:false,materialQualified:false,
   manufacturingApproved:false,
   limitations:'Measured inputs and native predictions are source-provided. Independent instrument, fabric batch, solver equivalence and garment fit are not authenticated.'}
 }catch{return blocked('INVALID_FABRIC_MEASUREMENT_OR_UNITS')}
}
