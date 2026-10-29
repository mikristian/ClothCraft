// Read-only numerical comparison of live native 3D fit evidence to an
// independently supplied physical observation. No sensor provenance, material
// law or factory certification can be established from this JSON alone.
import {inspectNativeGradedFitEvidence20261025} from './nativeGradedFitEvidence20261025.js'

const deny=code=>({ok:false,code,fitCertified:false,physicalFitAuthenticated:false,manufacturingApproved:false})
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,96}$/.test(value)
const finite=Number.isFinite
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(value))

export function inspectIndustrialCalibratedFitWitness20261028(snapshot,physical,{
 toleranceMm=2,
}={}){
 const native=inspectNativeGradedFitEvidence20261025(snapshot)
 if(!native.ok||native.stepVerified!==true||native.seamCount<1)
  return deny('NATIVE_STEPPED_FIT_REQUIRED')
 if(!finite(toleranceMm)||toleranceMm<=0||toleranceMm>10)
  return deny('INVALID_FIT_TOLERANCE')
 if(!plain(physical)||physical.format!=='exo.physical-fit-observation.v1'||
  physical.size!==native.size||!safeId(physical.operatorId)||
  !safeId(physical.calibrationId)||!safeId(physical.sampleId)||
  !Array.isArray(physical.seams)||physical.seams.length!==native.rows.length)
  return deny('UNVERIFIED_FIT_OBSERVATION_IDENTITY')
 const observed=new Map(),rows=[]
 for(const seam of physical.seams){
  if(!plain(seam)||!safeId(seam.seamId)||observed.has(seam.seamId)||
   !finite(seam.measuredMaxGapMm)||seam.measuredMaxGapMm<0)
   return deny('INVALID_OR_DUPLICATE_SEAM_OBSERVATION')
  observed.set(seam.seamId,seam)
 }
 for(const seam of native.rows){
  const measurement=observed.get(seam.seamId)
  if(!measurement)return deny('MISSING_SEAM_MEASUREMENT')
  const deltaMm=measurement.measuredMaxGapMm-seam.maxGapMm
  rows.push({seamId:seam.seamId,nativeMaxGapMm:seam.maxGapMm,
   reportedPhysicalGapMm:measurement.measuredMaxGapMm,deltaMm,
   withinTolerance:Math.abs(deltaMm)<=toleranceMm})
 }
 const numericalAgreement=rows.every(row=>row.withinTolerance)
 return {ok:numericalAgreement,code:numericalAgreement?'LOCAL_FIT_NUMERICAL_AGREEMENT':'PHYSICAL_FIT_DISAGREEMENT',
  size:native.size,toleranceMm,rows,fitCertified:false,physicalFitAuthenticated:false,
  manufacturingApproved:false,
  limitations:'Reported physical seam gaps only; no authenticated measurement, fabric stiffness calibration, avatar contact, strain or real garment fit acceptance.'}
}
