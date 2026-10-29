// Detached, hypothetical material-parameter study ONLY. No production solver
// installation, stiffness calibration, contact exclusions, or fit certification.
import {auditDetachedSleeveConstraintInventoryResearch20261025} from './nativeSleeveRemeshConstraintInventoryResearch20261025.js'
import {auditDetachedSleeveMassContactTopologyResearch20261025} from './nativeSleeveRemeshMassContactTopologyResearch20261025.js'
import {researchFoundationTeeSleeveQualityContact20261025} from './nativeSleeveCreaseQualityContactResearch20261025.js'

const parameters = ['arealDensityKgPerM2','structuralStiffnessNPerM',
  'hingeStiffnessNmPerRad','timeStepSeconds']

function validateParameters(input){
  if(!input || typeof input!=='object' || Array.isArray(input) ||
     ![Object.prototype,null].includes(Object.getPrototypeOf(input)) ||
     Reflect.ownKeys(input).length!==parameters.length ||
     Reflect.ownKeys(input).some(k=>!parameters.includes(k)))
    throw new Error('Explicit four-field hypothetical material parameters required')
  const bounds={arealDensityKgPerM2:[0,5],
    structuralStiffnessNPerM:[0,1e8],
    hingeStiffnessNmPerRad:[0,1e5],timeStepSeconds:[0,0.1]}
  const snapshot={}
  for(const [key,[low,high]] of Object.entries(bounds)){
    const descriptor=Object.getOwnPropertyDescriptor(input,key)
    const value=descriptor?.value
    if(!descriptor||!('value' in descriptor)||typeof value!=='number'||
       !Number.isFinite(value)||!(value>low)||!(value<=high))
      throw new Error(`Invalid hypothetical material parameter: ${key}`)
    snapshot[key]=value
  }
  return snapshot
}

export function auditDetachedSleeveParameterizedConstraintsResearch20261025(
  payload,panelId,mesh,input){
  const material=validateParameters(input)
  const mass=auditDetachedSleeveMassContactTopologyResearch20261025(payload,panelId,mesh)
  const inventory=auditDetachedSleeveConstraintInventoryResearch20261025(payload,panelId,mesh)
  // Soft/partial anchors cannot be treated as hard zero-inverse-mass pins.
  // Refuse to construct an incomplete mass/constraint model for those inputs.
  const piece=payload.pieces.find(p=>p.id===panelId)
  const sleeveParticles=new Set(piece.particleIndices)
  if(!Array.isArray(payload.anchors)||payload.anchors.some(a=>
    !a||typeof a!=='object'||Array.isArray(a)||
    Object.keys(a).length!==5||
    Object.keys(a).some(k=>!['particle','target','stiffness','axes','type'].includes(k))||
    !Number.isInteger(a.particle)||a.particle<0||
    a.particle>=payload.particles.length||
    !Array.isArray(a.target)||a.target.length!==3||
    a.target.some(v=>typeof v!=='number'||!Number.isFinite(v))||
    typeof a.stiffness!=='number'||!Number.isFinite(a.stiffness)||
    a.stiffness<0||a.stiffness>1||a.type!=='fit-anchor'||
    typeof a.axes!=='string'||!/^[xyz]{1,3}$/.test(a.axes)||
    new Set(a.axes).size!==a.axes.length))
    throw new Error('Malformed source anchor references')
  if(payload.anchors.some(a=>sleeveParticles.has(a.particle)))
    throw new Error('Pinned/soft-anchor sleeve mass treatment is not yet supported')
  if(!mass.lumpedVertexAreaM2.length ||
     mass.lumpedVertexAreaM2.length!==inventory.vertexCount ||
     inventory.structuralCount===0||inventory.bendingHingeCount===0)
    throw new Error('Incomplete sleeve material/constraint inventory')
  const massesKg=mass.lumpedVertexAreaM2.map(a=>a*material.arealDensityKgPerM2)
  const totalMassKg=massesKg.reduce((sum,v)=>sum+v,0)
  const expectedMassKg=mass.remeshedAreaM2*material.arealDensityKgPerM2
  if(massesKg.some(m=>!Number.isFinite(m)||m<=0)||
     !(totalMassKg>0)||Math.abs(totalMassKg-expectedMassKg)>
       Math.max(1e-12,expectedMassKg*1e-9))
    throw new Error('Hypothetical mass budget failed conservation')
  const inverseMassesPerKg=massesKg.map(m=>1/m)
  if(inverseMassesPerKg.some(m=>!Number.isFinite(m)||m<=0))
    throw new Error('Hypothetical inverse mass is invalid')
  const dtSquared=material.timeStepSeconds**2
  const structuralComplianceMPerN=1/material.structuralStiffnessNPerM
  const hingeComplianceRadPerNm=1/material.hingeStiffnessNmPerRad
  const structuralAlphaTilde=structuralComplianceMPerN/dtSquared
  const hingeAlphaTilde=hingeComplianceRadPerNm/dtSquared
  if([structuralAlphaTilde,hingeAlphaTilde].some(x=>!Number.isFinite(x)||x<=0))
    throw new Error('Hypothetical XPBD compliance overflows')
  const structural=inventory.structural.map(s=>({
    edge:[...s.edge],restLengthM:s.restLengthM,
    complianceMPerN:structuralComplianceMPerN,alphaTilde:structuralAlphaTilde,
  }))
  const hinges=inventory.hinges.map(h=>({
    edge:[...h.edge],opposite:[...h.opposite],faces:[...h.faces],
    restDihedralRad:h.restDihedralRad,
    initialWorldDihedralRad:h.initialWorldDihedralRad,crease:h.crease,
    complianceRadPerNm:hingeComplianceRadPerNm,alphaTilde:hingeAlphaTilde,
  }))
  return {
    panelId,materialParameters:material,hypotheticalInputs:true,
    vertexCount:inventory.vertexCount,structuralCount:structural.length,
    bendingHingeCount:hinges.length,creaseHingeCount:inventory.creaseHingeCount,
    sourceSewingConstraints:inventory.sourceSewingConstraints,
    sourceSewingEndpointReferences:inventory.sourceSewingEndpointReferences,
    massesKg,inverseMassesPerKg,totalMassKg,structural,hinges,
    contactPairClassification:{...mass.contactPairClassification},
    contact:{...inventory.contact},staticContactValid:inventory.staticContactValid,
    maximumPrincipalExtensionPercent:inventory.maximumPrincipalExtensionPercent,
    maximumPrincipalCompressionPercent:inventory.maximumPrincipalCompressionPercent,
    withinDeclaredStrainLimit:inventory.withinDeclaredStrainLimit,
    // Every neighboring face still requires appropriate contact screening;
    // no face pair is silently excluded from collision evaluation.
    contactExclusionsCreated:0,contactPolicyImplemented:false,
    calibratedMaterialVerified:false,solverConstraintsRebuilt:false,
    physicalAcceptance:false,continuousContactCertified:false,
    safeToAutoApply:false,
  }
}

export function researchFoundationTeeSleeveParameterizedConstraints20261025(
  payload,panelId,input){
  const mesh=researchFoundationTeeSleeveQualityContact20261025(payload,panelId)
  return auditDetachedSleeveParameterizedConstraintsResearch20261025(payload,panelId,mesh,input)
}
