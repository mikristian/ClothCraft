// Research-only paired sleeve hinge screen. A global RMS win can leave BOTH
// underarm seams at their original maximum opening. Never treat that as fit.
import {auditNativeCoupledClothTrajectory} from './nativeCoupledClothContactResearch.js'
import {classifyNativeCoupledTrustRegionResult} from './nativeCoupledAngleTrustRegionResearch.js'

const TARGETS=['seam-sleeve-l-underarm','seam-sleeve-r-underarm']

export function inspectNativeUnderarmBottlenecks(before,after,{toleranceMm=1e-6}={}){
  if(!Number.isFinite(toleranceMm)||toleranceMm<0||toleranceMm>.1)
    throw new RangeError('Invalid underarm tolerance')
  if(!Array.isArray(before?.groups)||!Array.isArray(after?.groups)||
     before.groups.length===0||before.groups.length!==after.groups.length||
     ![before.maxGapMm,after.maxGapMm,before.rmsGapMm,after.rmsGapMm]
       .every(x=>Number.isFinite(x)&&x>=0))
    throw new Error('Incomplete underarm seam evidence')
  const old=new Map(before.groups.map(g=>[g.id,g]))
  const next=new Map(after.groups.map(g=>[g.id,g]))
  if(old.size!==before.groups.length||next.size!==after.groups.length||
     [...old.keys()].some(id=>!next.has(id)))
    throw new Error('Underarm seam group identity changed')
  const groups=TARGETS.map(id=>{
    const a=old.get(id),b=next.get(id)
    if(!a||!b||!Number.isInteger(a.pairCount)||a.pairCount<1||
       b.pairCount!==a.pairCount||
       ![a.maxGapMm,b.maxGapMm,a.rmsGapMm,b.rmsGapMm]
         .every(x=>Number.isFinite(x)&&x>=0))
      throw new Error(`Missing or invalid underarm seam: ${id}`)
    return {id,pairCount:a.pairCount,
      beforeMaxGapMm:a.maxGapMm,afterMaxGapMm:b.maxGapMm,
      beforeRmsGapMm:a.rmsGapMm,afterRmsGapMm:b.rmsGapMm,
      maxDropMm:a.maxGapMm-b.maxGapMm,
      rmsDropMm:a.rmsGapMm-b.rmsGapMm}
  })
  return {groups,bothUnderarmMaxImproved:groups.every(g=>g.maxDropMm>toleranceMm),
    bothUnderarmRmsNonworse:groups.every(g=>g.rmsDropMm>=-toleranceMm),
    globalMaxImproved:before.maxGapMm-after.maxGapMm>toleranceMm,
    globalRmsImproved:before.rmsGapMm-after.rmsGapMm>toleranceMm}
}

export function probeNativeSleeveUnderarmCoupling(reference,{
  left,right,anglePairs,checkPose,steps=3,strainLimitPercent=5,
}={}){
  if(left?.panelId!=='sleeve-left'||right?.panelId!=='sleeve-right'||
     !left.worldAxisAligned||!right.worldAxisAligned)
    throw new Error('Requires executable left/right sleeve hinge axes')
  if(!Array.isArray(anglePairs)||anglePairs.length<1||anglePairs.length>4)
    throw new RangeError('Underarm probe requires 1..4 angle pairs')
  if(typeof checkPose!=='function'||!Number.isInteger(steps)||steps<3||steps>6)
    throw new RangeError('Underarm probe requires avatar screen and 3..6 steps')
  const seen=new Set()
  for(const angles of anglePairs){
    if(!Array.isArray(angles)||angles.length!==2||
       !angles.every(a=>Number.isFinite(a)&&a!==0&&Math.abs(a)<=.15))
      throw new RangeError('Underarm angles must be nonzero within 0.15 rad')
    const key=angles.join(',')
    if(seen.has(key))throw new Error('Duplicate underarm trial')
    seen.add(key)
  }
  const snapshot=JSON.stringify(reference)
  if(!snapshot)throw new Error('Missing underarm reference')
  const trials=[]
  for(const [leftAngleRadians,rightAngleRadians] of anglePairs){
    const started=performance.now()
    try{
      const result=auditNativeCoupledClothTrajectory(reference,{
        first:left,second:right,firstAngleRadians:leftAngleRadians,
        secondAngleRadians:rightAngleRadians,steps,checkPose,strainLimitPercent})
      const underarms=inspectNativeUnderarmBottlenecks(result.before,result.after)
      const screen=classifyNativeCoupledTrustRegionResult(result,{strainLimitPercent})
      const reasons=[...screen.reasons]
      if(!underarms.bothUnderarmMaxImproved)
        reasons.push('BOTH_UNDERARMS_NOT_CLOSING')
      if(!underarms.bothUnderarmRmsNonworse)
        reasons.push('UNDERARM_RMS_REGRESSION')
      trials.push({leftAngleRadians,rightAngleRadians,underarms,
        beforeMaxGapMm:result.before.maxGapMm,afterMaxGapMm:result.after.maxGapMm,
        beforeRmsGapMm:result.before.rmsGapMm,afterRmsGapMm:result.after.rmsGapMm,
        maximumPrincipalExtensionPercent:result.maximumPrincipalExtensionPercent,
        maximumPrincipalCompressionPercent:result.maximumPrincipalCompressionPercent,
        sampledAvatarPenetrations:result.avatarPenetrations,
        possibleStaticInterpanelContacts:result.possibleInterpanelContacts,
        possibleSweptInterpanelContacts:result.possibleSweptInterpanelContacts,
        possibleSweptIntrapanelContacts:result.possibleSweptIntrapanelContacts,
        illConditionedRestFaces:result.meshConditioning.illConditionedFaces,
        regressingGroups:result.groupMerit.regressions.map(g=>g.id),
        researchEligible:reasons.length===0,reasons,
        runtimeMs:+(performance.now()-started).toFixed(2)})
    }catch(error){
      trials.push({leftAngleRadians,rightAngleRadians,error:String(error?.message||error),
        researchEligible:false,reasons:['EVALUATION_ERROR'],
        runtimeMs:+(performance.now()-started).toFixed(2)})
    }finally{
      if(JSON.stringify(reference)!==snapshot)
        throw new Error('Sleeve probe mutated original garment')
    }
  }
  return {trialCount:trials.length,trials,sourceUnchanged:true,
    boundedResearch:true,safeToAutoApply:false,fitCertified:false,
    avatarEntryCertified:false,sweptCollisionCertified:false}
}
