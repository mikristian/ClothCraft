// Bounded, detached underarm contact sensitivity on the ACTUAL four-panel tee.
// A small displacement of one non-target-tip sleeve vertex along the opposite
// contact face normal is a diagnostic perturbation, NOT a fabric bend, a
// calibrated solver step, or a safe pattern edit. No candidate is applied.
// Some neighboring vertices participate in OTHER sewn correspondences; their
// displacement is intentionally measured as a seam/contact tradeoff, never
// interpreted as sewing-preserving motion.
import {createTemplateProject} from '../../data/templates.js'
import {buildNativeSimulationPayload} from './nativePayload.js'
import {auditCanonicalFoundationTeeSewnContactLocality20261025} from
  './nativeCanonicalTeeSewnContactProvenanceResearch20261025.js'
import {auditNativeSeamCandidate,measureNativeSeamResiduals} from './nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'

const sub=(a,b)=>a.map((v,i)=>v-b[i])
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm=a=>Math.hypot(...a)
const CONTACT_FACE_A=37,CONTACT_FACE_B=58,STEP_M=.0005

function contactFaceNormal(payload,piece){
  const face=piece.faces[CONTACT_FACE_A]
  const vertices=face.map(i=>payload.particles[piece.particleIndices[i]].position)
  const n=cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0]))
  const magnitude=norm(n)
  if(!(magnitude>1e-12))throw new Error('Degenerate canonical underarm face')
  return n.map(x=>x/magnitude)
}

function scopedContact(payload){
  const self=inspectNativeIntrapanelStaticContact(payload,{clearanceM:.001})
  const between=inspectNativeInterpanelExactStaticContact(payload,{
    clearanceM:.001,maxPairs:1_000_000,maxNarrowphasePairs:100_000})
  return {intrapanelIntersections:self.intersectingTrianglePairs,
    intrapanelNearClearancePairs:self.nonadjacentNearClearancePairs,
    intrapanelNearFoldovers:self.edgeNeighborNearFoldoverPairs,
    interpanelNearClearancePairs:between.nearClearancePairs,
    staticContactClear:self.staticDisjointThicknessScreenClear&&
      between.staticInterpanelExactClear}
}

export function researchCanonicalTeeUnderarmSensitivity20261025(sourcePayload){
  const sourceBefore=JSON.stringify(sourcePayload)
  const canonical=buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality:'quality'})
  // Canonical wrapper authenticates all static sewing/material/solver fields.
  const baselineLocality=auditCanonicalFoundationTeeSewnContactLocality20261025(
    sourcePayload)
  if(sourcePayload.particles.length!==canonical.particles.length||
     sourcePayload.particles.some((p,i)=>
       !['position','previous'].every(key=>Array.isArray(p[key])&&
         p[key].length===3&&p[key].every((x,k)=>
           Number.isFinite(x)&&x===canonical.particles[i][key][k]))))
    throw new Error('Underarm sensitivity requires the canonical initial pose')
  const baselineContact=scopedContact(sourcePayload)
  const baselineSeams=measureNativeSeamResiduals(sourcePayload)
  const baselineStrain=auditNativePrincipalStrain(sourcePayload)
  const originalRetainedDistanceMm=Object.fromEntries(
    ['sleeve-left','sleeve-right'].map(id=>[id,
      baselineLocality.witnesses.find(w=>w.pieceId===id&&
        w.faceA===CONTACT_FACE_A&&w.faceB===CONTACT_FACE_B)
        ?.outsideSewnNeighborhoodDistanceMm]))
  const trials=[]
  for(const panelId of ['sleeve-left','sleeve-right']){
    const piece=sourcePayload.pieces.find(p=>p.id===panelId)
    const witness=baselineLocality.witnesses.find(w=>w.pieceId===panelId&&
      w.faceA===CONTACT_FACE_A&&w.faceB===CONTACT_FACE_B)
    if(!piece||!witness||witness.locality!==
       'contact-persists-outside-excised-sewn-tip')
      throw new Error('Missing canonical underarm persistent-contact witness')
    const sewn=witness.coincidentDistinctMaterialVertices.filter(c=>
      c.directSewingSeamIds.length>0)
    if(sewn.length!==1||!piece.faces[CONTACT_FACE_B].includes(sewn[0].indexB))
      throw new Error('Ambiguous canonical underarm sewn endpoint')
    const normal=contactFaceNormal(sourcePayload,piece)
    const movable=piece.faces[CONTACT_FACE_B].filter(i=>i!==sewn[0].indexB)
    if(movable.length!==2)throw new Error('Incomplete underarm face')
    for(const localVertex of movable)for(const sign of [-1,1]){
      const globalIndex=piece.particleIndices[localVertex]
      if(sourcePayload.particles[globalIndex].invMass===0)
        throw new Error('Cannot perturb a pinned underarm vertex')
      const affectedSeamIds=[...new Set(sourcePayload.constraints.filter(c=>
        c.type==='seam'&&(c.a===globalIndex||c.b===globalIndex))
        .map(c=>c.seamId))].sort()
      const deltaM=normal.map(x=>x*STEP_M*sign)
      const candidate=structuredClone(sourcePayload)
      candidate.particles[globalIndex].position=
        candidate.particles[globalIndex].position.map((x,k)=>x+deltaM[k])
      // Every perturbed pose must still match the independent canonical
      // static identity; the original contact veto is never waived.
      const locality=auditCanonicalFoundationTeeSewnContactLocality20261025(
        candidate)
      const contact=scopedContact(candidate)
      const seam=auditNativeSeamCandidate(sourcePayload,candidate)
      const target=locality.witnesses.find(w=>w.pieceId===panelId&&
        w.faceA===CONTACT_FACE_A&&w.faceB===CONTACT_FACE_B)
      const staticResearchGate=seam.merit.paretoImproved&&
        seam.groupMerit.allGroupsNonworse&&seam.strain.withinDeclaredStrainLimit&&
        seam.meshConditioning.approved&&seam.pinsUnchanged&&
        contact.staticContactClear&&locality.originalStaticContactClear
      trials.push({id:`${panelId}:${localVertex}:${sign}`,
        panelId,localVertex,globalIndex,sign,deltaM,affectedSeamIds,
        targetContactStillWarned:Boolean(target),
        targetRetainedDistanceMm:target?.outsideSewnNeighborhoodDistanceMm??null,
        totalIntersectionWarnings:locality.totalIntersectionWarnings,
        persistentOutsideTipWarnings:
          locality.persistentOutsideSewnNeighborhoodContactWitnesses,
        maxGapMm:seam.after.maxGapMm,rmsGapMm:seam.after.rmsGapMm,
        seamGroupRegressions:seam.groupMerit.regressions.map(r=>r.id),
        maximumPrincipalExtensionPercent:
          seam.strain.maximumPrincipalExtensionPercent,
        maximumPrincipalCompressionPercent:
          seam.strain.maximumPrincipalCompressionPercent,
        strainWithinLimit:seam.strain.withinDeclaredStrainLimit,
        meshConditioningApproved:seam.meshConditioning.approved,
        pinsUnchanged:seam.pinsUnchanged,...contact,
        staticResearchGate,physicalAcceptance:false,safeToAutoApply:false})
    }
  }
  if(trials.length!==8||JSON.stringify(sourcePayload)!==sourceBefore)
    throw new Error('Underarm sensitivity inventory or source nonmutation failed')
  const leastWarnings=[...trials].sort((a,b)=>
    a.totalIntersectionWarnings-b.totalIntersectionWarnings||
    a.intrapanelNearClearancePairs-b.intrapanelNearClearancePairs||
    a.interpanelNearClearancePairs-b.interpanelNearClearancePairs||
    a.id.localeCompare(b.id))[0]
  const bestRetained=[...trials].filter(t=>t.targetContactStillWarned&&
    Number.isFinite(t.targetRetainedDistanceMm)).sort((a,b)=>
    (b.targetRetainedDistanceMm-originalRetainedDistanceMm[b.panelId])-
    (a.targetRetainedDistanceMm-originalRetainedDistanceMm[a.panelId])||
    a.id.localeCompare(b.id))[0]
  return {scope:'canonical-static-underarm-vertex-sensitivity-only',
    stepMm:STEP_M*1000,trialCount:trials.length,
    baseline:{maxGapMm:baselineSeams.maxGapMm,
      rmsGapMm:baselineSeams.rmsGapMm,
      maximumPrincipalExtensionPercent:baselineStrain.maximumPrincipalExtensionPercent,
      maximumPrincipalCompressionPercent:baselineStrain.maximumPrincipalCompressionPercent,
      totalIntersectionWarnings:baselineLocality.totalIntersectionWarnings,
      persistentOutsideTipWarnings:
        baselineLocality.persistentOutsideSewnNeighborhoodContactWitnesses,
      underarmRetainedDistanceMm:originalRetainedDistanceMm,
      ...baselineContact},
    trials,leastWarningsTrialId:leastWarnings.id,
    bestRetainedSeparationTrialId:bestRetained?.id??null,
    maximumScopedRetainedSeparationGainMm:bestRetained?
      bestRetained.targetRetainedDistanceMm-
      originalRetainedDistanceMm[bestRetained.panelId]:null,
    sourceNonmutationVerified:true,canonicalInitialPoseVerified:true,
    finiteThicknessCertified:false,deformableContinuousCCDCertified:false,
    avatarEntryCertified:false,calibratedSolverIntegrated:false,
    physicalAcceptance:false,safeToAutoApply:false}
}
