// Research-only bounded search over provenance-valid crease split locations.
// Unlike another fixed-vertex edge-flip pass, this changes the sampling
// position along an existing constrained crease while preserving its parent
// interpolation. Flat contact is not world contact; no pose is installed.
import {performance} from 'node:perf_hooks'
import {splitNativeCreaseEdgeResearch20261024 as split} from './nativeCreaseEdgeResamplingResearch20261024.js'
import {measureNativeCreaseDisjointMinimum20261024 as minimum} from './nativeCreaseRepairPairedFlipResearch20261024.js'
import {classifyNativeCreaseRepairSafety20261024 as classify} from './nativeCreaseRepairPairedFlipResearch20261024.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'

const metrics=(quality,contact)=>({
  illConditioned:quality.illConditioned,
  minAltitudeMm:quality.minAltitudeMm,
  maxAspect:quality.maxAspect,
  nearClearancePairs:contact.nearClearancePairs,
  intersectingPairs:contact.intersectingPairs,
})

function foldedScreen(piece,angle,clearanceM){
  const c=Math.cos(angle),s=Math.sin(angle)
  const positions=piece.verticesM.map(([x,y])=>x>1e-8?
    [x*c,y,x*s]:[x,y,0])
  const payload={pieces:[{id:piece.panelId||'research-sleeve',
    particleIndices:positions.map((_,i)=>i),
    flatVerticesM:piece.verticesM,faces:piece.faces}],
  particles:positions.map(position=>({position}))}
  const strain=auditNativePrincipalStrain(payload,{limitPercent:5})
  const contact=inspectNativeIntrapanelStaticContact(payload,{
    clearanceM,maxPairs:200000})
  return {
    principalExtensionPercent:strain.maximumPrincipalExtensionPercent,
    principalCompressionPercent:strain.maximumPrincipalCompressionPercent,
    strainWithinLimit:strain.withinDeclaredStrainLimit,
    nearClearancePairs:contact.nonadjacentNearClearancePairs,
    intersectingPairs:contact.intersectingTrianglePairs,
    edgeNeighborNearFoldoverPairs:contact.edgeNeighborNearFoldoverPairs,
    staticContactClear:contact.staticDisjointThicknessScreenClear,
  }
}

export function searchNativeCreaseFractionSweep20261024(reference,{
  edgeIndices=[7,9,16],fractions=[.2,.35,.5,.65,.8],
  clearanceM=.001,foldAngleRadians=5*Math.PI/12,
  maxCandidates=24,maxWallMs=12000,
}={}){
  if(!Array.isArray(edgeIndices)||edgeIndices.length<1||edgeIndices.length>8||
     edgeIndices.some(i=>!Number.isInteger(i)||i<0||i>=reference?.creaseEdges?.length)||
     new Set(edgeIndices).size!==edgeIndices.length||
     !Array.isArray(fractions)||fractions.length<1||fractions.length>8||
     fractions.some(f=>!Number.isFinite(f)||f<.1||f>.9)||
     new Set(fractions).size!==fractions.length||
     edgeIndices.length*fractions.length>maxCandidates||
     !Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>64||
     !Number.isInteger(maxWallMs)||maxWallMs<1000||maxWallMs>30000||
     !Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.01||
     !Number.isFinite(foldAngleRadians)||foldAngleRadians<0||
     foldAngleRadians>Math.PI)
    throw new RangeError('Invalid bounded crease fraction sweep')
  const frozen=JSON.stringify(reference)
  const started=performance.now()
  const baseMinimum=minimum(reference,clearanceM)
  const results=[]
  let budgetExhausted=false
  for(const edgeIndex of edgeIndices)for(const fraction of fractions){
    if(performance.now()-started>=maxWallMs){budgetExhausted=true;break}
    const out=split(reference,{edgeIndex,fraction,clearanceM})
    const base=metrics(out.baseline,out.baselineContact)
    const next=metrics(out.resampled,out.resampledContact)
    const candidateMinimum=minimum(out.candidate,clearanceM)
    const decision=classify(base,next,baseMinimum,candidateMinimum)
    const fold=foldedScreen(out.candidate,foldAngleRadians,clearanceM)
    results.push({edgeIndex,fraction,
      baseline:base,candidate:next,
      baselineMinimumClearanceMm:baseMinimum,
      candidateMinimumClearanceMm:candidateMinimum,
      ...decision,fold,
      restScreenClear:out.restContactScreenClear,
      // Research may rank a nonregressing candidate, never promote it.
      eligibleForFurtherResearch:decision.improved&&
        next.illConditioned===0&&out.restContactScreenClear&&
        fold.strainWithinLimit&&fold.staticContactClear,
      physicalAcceptance:false})
  }
  if(JSON.stringify(reference)!==frozen)
    throw new Error('Crease fraction sweep mutated source')
  const nonregressing=results.filter(r=>r.nonregressing)
  const improved=nonregressing.filter(r=>r.improved)
  return {baselineMinimumClearanceMm:baseMinimum,
    tested:results.length,requested:edgeIndices.length*fractions.length,
    budgetExhausted,results,nonregressingCount:nonregressing.length,
    improvedCount:improved.length,
    furtherResearchEligibleCount:results.filter(r=>r.eligibleForFurtherResearch).length,
    runtimeMs:performance.now()-started,
    sourceUnchanged:true,restAndIsolatedFoldOnly:true,
    seamGeometryModified:false,worldPoseInstalled:false,
    avatarContactChecked:false,sweptCollisionCertified:false,
    physicalAcceptance:false,safeToAutoApply:false}
}
