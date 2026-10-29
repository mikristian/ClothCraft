// Research-only bounded coupled-hinge trust-region screen. Unlike a Pareto
// score, eligibility requires BOTH global seam residuals to decrease, every
// named seam group to remain nonworse, and all conservative safety gates.
// An eligible screen is still NOT a fitted garment or swept-CCD certificate.
import {auditNativeCoupledClothTrajectory} from './nativeCoupledClothContactResearch.js'

const finiteNonnegative=x=>Number.isFinite(x)&&x>=0
const count=x=>Number.isInteger(x)&&x>=0

export function classifyNativeCoupledTrustRegionResult(result,{
  minimumDropMm=1e-6,strainLimitPercent=5,
}={}){
  if(!Number.isFinite(minimumDropMm)||minimumDropMm<=0||minimumDropMm>100||
     !Number.isFinite(strainLimitPercent)||strainLimitPercent<=0||
     strainLimitPercent>100)
    throw new RangeError('Invalid coupled trust-region thresholds')
  const r=result
  if(!r||![r.before?.maxGapMm,r.before?.rmsGapMm,
    r.after?.maxGapMm,r.after?.rmsGapMm,
    r.maximumPrincipalExtensionPercent,r.maximumPrincipalCompressionPercent,
    r.maximumAnchorDisplacementMm].every(finiteNonnegative)||
    ![r.avatarPenetrations,r.possibleInterpanelContacts,
      r.possibleSweptInterpanelContacts,r.possibleSweptIntrapanelContacts,
      r.intrapanelIntersections,r.edgeNeighborNearFoldoverPairs,
      r.nonadjacentNearClearancePairs,r.meshConditioning?.illConditionedFaces]
      .every(count)||
    !Number.isInteger(r.before?.pairCount)||r.before.pairCount<1||
    r.after?.pairCount!==r.before.pairCount||
    typeof r.groupMerit?.allGroupsNonworse!=='boolean'||
    !Array.isArray(r.groupMerit.regressions)||
    !['contactClear','materialValid','anchorsValid','pinsUnchanged',
      'researchScreenPassed'].every(k=>typeof r[k]==='boolean')||
    r.safeToAutoApply!==false||r.fitCertified!==false||
    r.sweptCollisionCertified!==false)
    throw new Error('Incomplete or contradictory coupled research result')

  const maxDropMm=r.before.maxGapMm-r.after.maxGapMm
  const rmsDropMm=r.before.rmsGapMm-r.after.rmsGapMm
  const reasons=[]
  if(maxDropMm<=minimumDropMm)reasons.push('MAX_SEAM_NOT_REDUCED')
  if(rmsDropMm<=minimumDropMm)reasons.push('RMS_SEAM_NOT_REDUCED')
  if(!r.groupMerit.allGroupsNonworse||r.groupMerit.regressions.length)
    reasons.push('SEAM_GROUP_REGRESSION')
  if(!r.materialValid||r.maximumPrincipalExtensionPercent>strainLimitPercent+1e-6||
     r.maximumPrincipalCompressionPercent>strainLimitPercent+1e-6)
    reasons.push('PRINCIPAL_STRAIN')
  if(!r.anchorsValid||!r.pinsUnchanged)reasons.push('ANCHOR_OR_PIN')
  if(r.avatarPenetrations>0)reasons.push('SAMPLED_AVATAR_CONTACT')
  if(!r.contactClear||r.possibleInterpanelContacts||
     r.possibleSweptInterpanelContacts||r.possibleSweptIntrapanelContacts||
     r.intrapanelIntersections||r.edgeNeighborNearFoldoverPairs||
     r.nonadjacentNearClearancePairs)
    reasons.push('CLOTH_CONTACT_UNRESOLVED')
  if(r.meshConditioning.illConditionedFaces>0)
    reasons.push('REST_MESH_ILL_CONDITIONED')
  if(!r.researchScreenPassed)reasons.push('EXISTING_RESEARCH_GATE_REJECTED')
  return {maxDropMm,rmsDropMm,reasons,
    eligibleForFurtherResearch:reasons.length===0,
    // A discrete conservative screen cannot prove safe continuous motion.
    sweptCollisionCertified:false,avatarEntryCertified:false,
    fitCertified:false,safeToAutoApply:false}
}

export function searchNativeCoupledHingeTrustRegion(reference,{
  first,second,anglePairs,checkPose,steps=3,
  strainLimitPercent=5,minimumDropMm=1e-6,
}={}){
  if(!Array.isArray(anglePairs)||anglePairs.length<1||anglePairs.length>6)
    throw new RangeError('Coupled trust-region search requires 1..6 trials')
  if(typeof checkPose!=='function')throw new TypeError('Avatar screen required')
  const keys=new Set()
  for(const pair of anglePairs){
    if(!Array.isArray(pair)||pair.length!==2||
       !pair.every(a=>Number.isFinite(a)&&a!==0&&Math.abs(a)<=.25))
      throw new RangeError('Coupled trust-region angles must be nonzero and within 0.25 rad')
    const key=pair.join(',')
    if(keys.has(key))throw new Error('Duplicate coupled trust-region candidate')
    keys.add(key)
  }
  const frozen=JSON.stringify(reference)
  if(!frozen)throw new Error('Cannot snapshot coupled reference')
  const trials=[]
  for(const [firstAngleRadians,secondAngleRadians] of anglePairs){
    const start=performance.now()
    try{
      const r=auditNativeCoupledClothTrajectory(reference,{
        first,second,firstAngleRadians,secondAngleRadians,
        checkPose,steps,strainLimitPercent})
      const screen=classifyNativeCoupledTrustRegionResult(r,{
        minimumDropMm,strainLimitPercent})
      trials.push({firstAngleRadians,secondAngleRadians,
        beforeMaxGapMm:r.before.maxGapMm,afterMaxGapMm:r.after.maxGapMm,
        beforeRmsGapMm:r.before.rmsGapMm,afterRmsGapMm:r.after.rmsGapMm,
        principalExtensionPercent:r.maximumPrincipalExtensionPercent,
        principalCompressionPercent:r.maximumPrincipalCompressionPercent,
        avatarPenetrations:r.avatarPenetrations,
        staticInterpanelPotentials:r.possibleInterpanelContacts,
        sweptInterpanelPotentials:r.possibleSweptInterpanelContacts,
        sweptIntrapanelPotentials:r.possibleSweptIntrapanelContacts,
        restSlivers:r.meshConditioning.illConditionedFaces,
        regressingGroups:r.groupMerit.regressions.map(g=>g.id),
        contactClear:r.contactClear,screen,
        runtimeMs:+(performance.now()-start).toFixed(2)})
    }catch(error){
      // Fail closed on geometry errors; never convert an exception to a pass.
      trials.push({firstAngleRadians,secondAngleRadians,
        error:String(error?.message||error),runtimeMs:+(performance.now()-start).toFixed(2),
        screen:{eligibleForFurtherResearch:false,reasons:['EVALUATION_ERROR'],
          sweptCollisionCertified:false,avatarEntryCertified:false,
          fitCertified:false,safeToAutoApply:false}})
    }finally{
      if(JSON.stringify(reference)!==frozen)
        throw new Error('Coupled trust-region evaluation mutated its source')
    }
  }
  return {trialCount:trials.length,trials,
    eligibleCount:trials.filter(t=>t.screen.eligibleForFurtherResearch).length,
    sourceUnchanged:true,boundedResearch:true,
    sweptCollisionCertified:false,avatarEntryCertified:false,
    fitCertified:false,safeToAutoApply:false}
}
