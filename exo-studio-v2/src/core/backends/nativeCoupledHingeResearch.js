// Research-only two-stage developable bending search. A single fold can
// worsen one seam while enabling a second fold to close both seam groups.
// We therefore compare the FINAL pose against the original, but independently
// screen the intermediate pose, both curved hinge arcs, both straight chords,
// and both endpoints. Never apply a candidate to the editable garment.
// These discrete samples do NOT constitute swept CCD or fit certification.
import {createNativeDevelopableHingeCandidate,
  inspectNativeHingeArcContactPath} from './nativeDevelopableHingeResearch.js'
import {inspectNativeSampledContactPath} from './nativeSampledContactPath.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {auditNativeSeamCandidate,measureNativeSeamResiduals} from './nativeSeamCandidateGate.js'

const contactSamples=pose=>pose.pieces.reduce((sum,p)=>sum+p.particleIndices.length+p.faces.length,0)

function validateContact(pose,checkPose){
  const r=checkPose(pose)
  if(!r||r.sampledAvatarClearanceOnly!==true||
     !Number.isInteger(r.checked)||r.checked!==contactSamples(pose)||
     !Number.isInteger(r.penetrating)||r.penetrating<0||r.penetrating>r.checked||
     !Number.isFinite(r.maximumIntrusionMm)||r.maximumIntrusionMm<0)
    throw new Error('Incomplete or invalid coupled-hinge endpoint contact screen')
  return r
}

function combinePaths(parts){
  const samples=parts.flatMap(({report,stage,trajectoryType})=>
    report.samples.map(sample=>({...sample,stage,trajectoryType})))
  return {
    checked:samples.reduce((sum,s)=>sum+s.checked,0),
    penetrating:samples.reduce((sum,s)=>sum+s.penetrating,0),
    maximumIntrusionMm:Math.max(0,...samples.map(s=>s.maximumIntrusionMm)),
    intermediateSamples:samples.length,samples,
    sampledIntermediateClearanceOnly:true,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false,
  }
}

// Exactly two material-aligned hinges, up to sixteen angle combinations.
// A hinge may belong to either panel, but both folds must be executable in
// sequence without moving a pin or cutting through a material triangle.
export function searchNativeCoupledHingeCandidates(reference,{
  first,second,firstAnglesRadians,secondAnglesRadians,
  steps=8,checkPose,strainLimitPercent=5,
}={}){
  if(!Array.isArray(firstAnglesRadians)||!Array.isArray(secondAnglesRadians)||
     firstAnglesRadians.length<1||secondAnglesRadians.length<1||
     firstAnglesRadians.length*secondAnglesRadians.length>16)
    throw new RangeError('Coupled hinge search requires 1..16 angle combinations')
  if(!first||!second||typeof first!=='object'||typeof second!=='object')
    throw new TypeError('Two explicit hinge definitions are required')
  if(!Number.isInteger(steps)||steps<2||steps>16)
    throw new RangeError('Coupled hinge contact sampling requires 2..16 subdivisions')
  if(typeof checkPose!=='function')throw new TypeError('Coupled hinge requires contact evaluator')
  // Fail early on malformed axes rather than hiding programming errors as
  // unsuccessful optimization trials.
  for(const hinge of [first,second])createNativeDevelopableHingeCandidate(reference,{
    ...hinge,angleRadians:0})
  const sourceContact=validateContact(reference,checkPose)
  const before=measureNativeSeamResiduals(reference)
  const trials=[]
  let best=null
  for(const angle1 of firstAnglesRadians)for(const angle2 of secondAnglesRadians){
    const intermediate=createNativeDevelopableHingeCandidate(reference,{
      ...first,angleRadians:angle1}).candidate
    const final=createNativeDevelopableHingeCandidate(intermediate,{
      ...second,angleRadians:angle2}).candidate
    const intermediateStrain=auditNativePrincipalStrain(intermediate,{
      limitPercent:strainLimitPercent})
    const intermediateContact=validateContact(intermediate,checkPose)
    const finalContact=validateContact(final,checkPose)
    const reports=[]
    for(const [stage,from,to,hinge,angle] of [
      [1,reference,intermediate,first,angle1],
      [2,intermediate,final,second,angle2],
    ]){
      reports.push({stage,trajectoryType:'linear-chord',
        report:inspectNativeSampledContactPath(from,to,{steps,checkPose})})
      reports.push({stage,trajectoryType:'rigid-developable-hinge-arc',
        report:inspectNativeHingeArcContactPath(from,{
          ...hinge,angleRadians:angle,steps,checkPose})})
    }
    const sampledPathContact=combinePaths(reports)
    const gate=auditNativeSeamCandidate(reference,final,{
      strainLimitPercent,endpointContact:finalContact,sampledPathContact})
    const intermediateValid=intermediateStrain.withinDeclaredStrainLimit&&
      intermediateContact.penetrating===0&&sourceContact.penetrating===0
    const accepted=intermediateValid&&gate.researchScreenPassed
    const row={firstAngleRadians:angle1,secondAngleRadians:angle2,
      beforeMaxGapMm:before.maxGapMm,beforeRmsGapMm:before.rmsGapMm,
      maxGapMm:gate.after.maxGapMm,rmsGapMm:gate.after.rmsGapMm,
      intermediateMaxGapMm:measureNativeSeamResiduals(intermediate).maxGapMm,
      maxPrincipalExtensionPercent:gate.strain.maximumPrincipalExtensionPercent,
      maxPrincipalCompressionPercent:gate.strain.maximumPrincipalCompressionPercent,
      intermediateMaxPrincipalExtensionPercent:intermediateStrain.maximumPrincipalExtensionPercent,
      initialContactPenetrations:sourceContact.penetrating,
      intermediateContactPenetrations:intermediateContact.penetrating,
      finalContactPenetrations:finalContact.penetrating,
      sampledPathPenetrations:sampledPathContact.penetrating,
      checkedPathSamples:sampledPathContact.checked,
      intermediateValid,accepted,fitCertified:false,sweptCollisionCertified:false,
      safeToAutoApply:false}
    trials.push(row)
    if(accepted&&(!best||gate.after.maxGapMm<best.gate.after.maxGapMm-1e-9||
      (Math.abs(gate.after.maxGapMm-best.gate.after.maxGapMm)<=1e-9&&
       gate.after.rmsGapMm<best.gate.after.rmsGapMm)))
      best={candidate:final,gate,firstAngleRadians:angle1,
        secondAngleRadians:angle2,intermediateContact,sampledPathContact}
  }
  return {best,trials,trialCount:trials.length,
    acceptedCount:trials.filter(t=>t.accepted).length,
    sourceContactPenetrations:sourceContact.penetrating,
    fitCertified:false,sweptCollisionCertified:false,safeToAutoApply:false}
}
