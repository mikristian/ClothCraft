import {rustCalibrationScalar,rustCalibrationTensile} from './rustFabricKernel.js'

/**
 * Open textile measurement conversions (SI). These are measurement tools,
 * not copies of CLO's proprietary Emulator fitting curve or a validated
 * inverse of EXO's nonlinear Rust solver. Force-response data is essential:
 * a '5% stretch' preset alone does NOT establish a stiffness in N/m.
 */
function positive(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${label} must be finite and positive`)
  return number
}

export function fabricAreaMassKg(areaSquareMeters, gsm) {
  const area=positive(areaSquareMeters,'Area'), mass=positive(gsm,'GSM')
  return rustCalibrationScalar('mass',[area,mass],()=>area*mass/1000)
}

/**
 * Effective tensile membrane stiffness along ONE material axis (N/m).
 * Assumes a uniform rectangular specimen, engineering strain epsilon =
 * elongation/gaugeLength, and measured force along that axis.
 * Fit a line through the origin to {epsilon, force/width} observations.
 * This small-strain tangent *approximation* is not a complete nonlinear
 * loading/unloading or hysteresis material model.
 */
export function estimateTensileStiffness({widthMm,gaugeLengthMm,observations}) {
  const width=positive(widthMm,'Strip width')
  const widthM=width/1000
  const gaugeMm=positive(gaugeLengthMm,'Gauge length')
  if (!Array.isArray(observations) || observations.length<1) throw new RangeError('At least one measured point required')
  const pairs=observations.map((entry,index)=>{
    const extension=positive(entry.extensionMm,`Extension ${index+1}`)
    const force=positive(entry.forceN,`Force ${index+1}`)
    const strain=extension/gaugeMm
    const membraneForce=force/widthM
    if (strain>1) throw new RangeError('Extension exceeds gauge length; verify units and test method')
    return {strain,membraneForce,extension,force}
  })
  const fit=rustCalibrationTensile(width,gaugeMm,pairs.map(p=>[p.extension,p.force]),()=>{
    const denominator=pairs.reduce((sum,p)=>sum+p.strain*p.strain,0)
    const stiffnessNPerM=pairs.reduce((sum,p)=>sum+p.strain*p.membraneForce,0)/denominator
    const rmsErrorNPerM=Math.sqrt(pairs.reduce((sum,p)=>sum+(p.membraneForce-stiffnessNPerM*p.strain)**2,0)/pairs.length)
    return {stiffnessNPerM,rmsErrorNPerM,maxMeasuredStrain:Math.max(...pairs.map(p=>p.strain))}
  })
  return {
    ...fit,points:pairs.length,
    method:'linear membrane fit through origin; assumes small strain and prescribed load history',
  }
}

/**
 * Effective shear stiffness (N/m) from a rectangular strip: gamma = tan(theta)
 * for simple shear. Lab shear frames may need correction for their geometry.
 */
export function estimateShearStiffness({widthMm,forceN,shearAngleDeg}) {
  const width=positive(widthMm,'Strip width')
  const widthM=width/1000
  const angle=positive(shearAngleDeg,'Shear angle')
  const radians=angle*Math.PI/180
  if (radians>=Math.PI/4) throw new RangeError('Use a small shear angle below 45 degrees')
  const force=positive(forceN,'Shear force')
  return rustCalibrationScalar('shear',[width,force,angle],()=>force/(widthM*Math.tan(radians)))
}

/**
 * Small-deflection cantilever model: q = (GSM/1000)g w, delta=q L^4/(8 B w).
 * Returns effective bending rigidity per unit width B [N·m]. Use only for
 * deflection substantially smaller than specimen overhang (delta/L < 0.15).
 */
export function estimateCantileverBending({gsm,overhangMm,tipDeflectionMm,gravity=9.80665}) {
  const mass=positive(gsm,'GSM'), overhang=positive(overhangMm,'Overhang'), deflection=positive(tipDeflectionMm,'Tip deflection')
  const massPerArea=mass/1000
  const length=overhang/1000
  const delta=deflection/1000
  if (delta/length>=.15) throw new RangeError('Large deflection requires nonlinear cantilever fit')
  const g=positive(gravity,'Gravity')
  return rustCalibrationScalar('bending',[mass,overhang,deflection,g],()=>massPerArea*g*length**4/(8*delta))
}

/** Idealized onset-of-slide incline method, coefficient = tan(theta).
 * Real friction depends on the contacting fabric, surface and conditions.
 */
export function frictionFromInclineAngle(angleDeg) {
  const angle=positive(angleDeg,'Incline angle')
  if (angle>=85) throw new RangeError('Incline angle must be below 85 degrees')
  return rustCalibrationScalar('friction',[angle],()=>Math.tan(angle*Math.PI/180))
}
