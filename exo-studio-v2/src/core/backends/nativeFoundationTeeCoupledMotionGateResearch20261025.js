// Research-only, fail-closed composition for the AUTHORED four-panel tee.
// A prescribed rigid hinge/translation path is not a deformable cloth solve.
// The interval oracle checks cross-panel motion; discrete self-contact and
// principal strain are additional vetoes, never continuous certifications.
import {deriveFoundationTeeSewingInventoryResearch20261024} from './nativeFoundationTeeSewingInventoryResearch20261024.js'
import {screenNativeCoupledHingeTranslationInterval20261025} from './nativeCoupledHingeTranslationIntervalResearch20261025.js'
import {auditNativeSeamCandidate,measureNativeSeamResiduals} from './nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'

const sub=(a,b)=>a.map((x,i)=>x-b[i])
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]

function prescribedPose(reference,motions,fraction){
  const candidate=structuredClone(reference)
  for(const piece of candidate.pieces){
    const motion=motions[piece.id],h=motion.hinge
    const moving=h?new Set(h.movingVertices):null
    for(let i=0;i<piece.particleIndices.length;i++){
      const particle=candidate.particles[piece.particleIndices[i]]
      const original=reference.particles[piece.particleIndices[i]].position
      let result=[...original]
      if(h&&moving.has(i)){
        const angle=h.startRadians+(h.endRadians-h.startRadians)*fraction
        const v=sub(original,h.axisOriginM),c=Math.cos(angle),s=Math.sin(angle)
        const spin=cross(h.axisUnit,v),along=dot(h.axisUnit,v)
        result=h.axisOriginM.map((x,k)=>x+v[k]*c+spin[k]*s+
          h.axisUnit[k]*along*(1-c))
      }
      particle.position=result.map((x,k)=>x+motion.translationM[k]*fraction)
    }
  }
  return candidate
}

export function auditFoundationTeeCoupledMotionGateResearch20261025(project,payload,motions,{
  sampleFractions=[0,.5,1],clearanceM=.001,strainLimitPercent=5,
  maxFacePairs=500_000,maxDistanceEvaluations=100_000,maxDepth=8,
}={}){
  if(!Array.isArray(sampleFractions)||sampleFractions.length<3||
     sampleFractions.length>7||sampleFractions[0]!==0||
     sampleFractions.at(-1)!==1||sampleFractions.some((t,i)=>
       !Number.isFinite(t)||t<0||t>1||(i>0&&t<=sampleFractions[i-1]))||
     !Number.isFinite(strainLimitPercent)||strainLimitPercent<0||
     strainLimitPercent>100)
    throw new RangeError('Invalid coupled tee research sample settings')
  const sourceProject=JSON.stringify(project),sourcePayload=JSON.stringify(payload)
  const sourceMotions=JSON.stringify(motions)
  const inventory=deriveFoundationTeeSewingInventoryResearch20261024(project,payload)
  if(inventory.sewingPairCount!==102||inventory.seamGroupCount!==14)
    throw new Error('Incomplete authored Foundation Tee sewing coverage')
  // The interval preflight validates every face, hinge axis, moving vertex,
  // ownership, translation and resource budget before posing any garment.
  const interval=screenNativeCoupledHingeTranslationInterval20261025(payload,motions,{
    clearanceM,maxFacePairs,maxDistanceEvaluations,maxDepth})
  const referenceSeams=measureNativeSeamResiduals(payload)
  const poses=[]
  let terminalCandidate=null
  for(const fraction of sampleFractions){
    const candidate=prescribedPose(payload,motions,fraction)
    const seams=measureNativeSeamResiduals(candidate)
    if(seams.pairCount!==inventory.sewingPairCount||seams.groups.length!==14)
      throw new Error('Coupled tee motion changed sewing coverage')
    const strain=auditNativePrincipalStrain(candidate,{limitPercent:strainLimitPercent})
    const self=inspectNativeIntrapanelStaticContact(candidate,{clearanceM,
      maxPairs:maxFacePairs})
    const between=inspectNativeInterpanelExactStaticContact(candidate,{clearanceM,
      maxPairs:maxFacePairs,maxNarrowphasePairs:maxFacePairs})
    poses.push({fraction,maxGapMm:seams.maxGapMm,rmsGapMm:seams.rmsGapMm,
      principalExtensionPercent:strain.maximumPrincipalExtensionPercent,
      principalCompressionPercent:strain.maximumPrincipalCompressionPercent,
      principalStrainValid:strain.withinDeclaredStrainLimit,
      intrapanelIntersections:self.intersectingTrianglePairs,
      intrapanelNearClearancePairs:self.nonadjacentNearClearancePairs,
      intrapanelNearFoldovers:self.edgeNeighborNearFoldoverPairs,
      interpanelNearClearancePairs:between.nearClearancePairs,
      staticContactClear:self.staticDisjointThicknessScreenClear&&
        between.staticInterpanelExactClear})
    if(fraction===1)terminalCandidate=candidate
  }
  const candidateAudit=auditNativeSeamCandidate(payload,terminalCandidate,{
    strainLimitPercent})
  const terminal=poses.at(-1)
  const sampledContactClear=poses.every(p=>p.staticContactClear)
  const sampledStrainValid=poses.every(p=>p.principalStrainValid)
  const seamGroupsNonworse=candidateAudit.groupMerit.allGroupsNonworse
  const limitedResearchGatePass=interval.coupledInterpanelIntervalClear&&
    sampledContactClear&&sampledStrainValid&&
    candidateAudit.meshConditioning.approved&&candidateAudit.pinsUnchanged&&
    candidateAudit.merit.paretoImproved&&seamGroupsNonworse
  if(JSON.stringify(project)!==sourceProject||
     JSON.stringify(payload)!==sourcePayload||
     JSON.stringify(motions)!==sourceMotions)
    throw new Error('Coupled tee research mutated its sources')
  return {sewingPairCount:inventory.sewingPairCount,
    seamGroupCount:inventory.seamGroupCount,referenceSeams:{
      maxGapMm:referenceSeams.maxGapMm,rmsGapMm:referenceSeams.rmsGapMm},
    poses,terminal,interval,meshConditioning:candidateAudit.meshConditioning,
    pinsUnchanged:candidateAudit.pinsUnchanged,
    seamGroupsNonworse,seamGroupRegressions:candidateAudit.groupMerit.regressions,
    sampledContactClear,sampledStrainValid,limitedResearchGatePass,
    sourceNonmutationVerified:true,
    // Missing continuous same-panel/cloth-body CCD and avatar trajectory.
    adjacentHingeThicknessCertified:false,avatarContactChecked:false,
    deformableContinuousCollisionCertified:false,avatarEntryCertified:false,
    physicalAcceptance:false,safeToAutoApply:false}
}
