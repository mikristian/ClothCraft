// CLO-inspired sewing inspection over measured native Rust boundary lengths.
// Measurements are already expressed in centimetres; the ratio here uses the
// longer partner as reference and must be disclosed rather than assumed to be
// the proprietary CLO ratio convention.
import {rustSeamLengthMetrics} from './rustSewingKernel.js'

export function sewingLengthDiagnostic(measurement, options = {}) {
  const firstCm=measurement?.first?.length2DCm
  const secondCm=measurement?.second?.length2DCm
  const valid=Number.isFinite(firstCm)&&Number.isFinite(secondCm)&&firstCm>0&&secondCm>0
  if(!valid)return {
    seamId:measurement?.seamId??null,valid:false,firstCm:null,secondCm:null,
    signedDifferenceCm:null,absoluteDifferenceCm:null,differencePercent:null,warning:false,
  }
  const lengthThreshold=Number.isFinite(options.lengthThreshold)&&options.lengthThreshold>=0?options.lengthThreshold:.5
  const ratioThreshold=Number.isFinite(options.ratioThreshold)&&options.ratioThreshold>=0?options.ratioThreshold:10
  const native=rustSeamLengthMetrics(firstCm,secondCm,lengthThreshold,ratioThreshold,
    options.lengthOn!==false,options.ratioOn!==false)
  const signedDifferenceCm=native?.signedDifferenceCm??firstCm-secondCm
  const absoluteDifferenceCm=native?.absoluteDifferenceCm??Math.abs(signedDifferenceCm)
  const differencePercent=native?.differencePercent??
    absoluteDifferenceCm/Math.max(firstCm,secondCm)*100
  const warning=native?.warning??((options.lengthOn!==false&&absoluteDifferenceCm>lengthThreshold)||
    (options.ratioOn!==false&&differencePercent>ratioThreshold))
  return {
    seamId:measurement?.seamId??null,valid:true,firstCm,secondCm,
    // Physical seam lengths cannot be negative; omit malformed optional 3D
    // measurements instead of displaying them as valid factory dimensions.
    first3DCm:Number.isFinite(measurement?.first?.length3DCm)&&measurement.first.length3DCm>=0?measurement.first.length3DCm:null,
    second3DCm:Number.isFinite(measurement?.second?.length3DCm)&&measurement.second.length3DCm>=0?measurement.second.length3DCm:null,
    signedDifferenceCm,absoluteDifferenceCm,differencePercent,warning,
  }
}

export function inspectSewingLengths(measurements=[],options={}) {
  const rows=Array.isArray(measurements)?measurements.map(item=>sewingLengthDiagnostic(item,options)):[]
  return {
    rows,
    total:rows.length,
    measured:rows.filter(row=>row.valid).length,
    warnings:rows.filter(row=>row.warning).length,
    unavailable:rows.filter(row=>!row.valid).length,
  }
}
