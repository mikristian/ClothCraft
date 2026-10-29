// Research-only diagnostics for the REAL four-panel Foundation Tee pose.
// For a cross-panel seam group, subtracting the mean endpoint displacement
// gives the best possible RMS under a single relative TRANSLATION of that
// group's two panels. Each group is optimized independently: these bounds
// do NOT imply a jointly feasible four-panel motion, hinge bend, collision-
// free trajectory, or production-ready garment.
import {deriveFoundationTeeSewingInventoryResearch20261024} from
  './nativeFoundationTeeSewingInventoryResearch20261024.js'

const distanceMm=vector=>Math.hypot(...vector)*1000

export function auditFoundationTeeSeamClosureBoundsResearch20261025(project,payload){
  const inventory=deriveFoundationTeeSewingInventoryResearch20261024(project,payload)
  const pieces=new Map(payload.pieces.map(piece=>[piece.id,piece]))
  const authored=new Map(project.seams.map(seam=>[seam.id,seam]))
  const groups=new Map(project.seams.map(seam=>[seam.id,[]]))
  const position=endpoint=>{
    const piece=pieces.get(endpoint.panelId)
    const index=piece?.particleIndices?.[endpoint.vertex]
    const point=payload.particles[index]?.position
    if(!Array.isArray(point)||point.length!==3||
       point.some(x=>!Number.isFinite(x)||Math.abs(x)>100))
      throw new Error('Invalid Foundation Tee world-space sewing position')
    return point
  }
  let globalMaxMm=0,globalSquaredMm=0,globalCount=0
  for(const pair of inventory.requiredSewingPairs){
    const seam=authored.get(pair.seamId)
    const reverse=pair.a.panelId!==seam.a.pieceId
    const a=position(reverse?pair.b:pair.a)
    const b=position(reverse?pair.a:pair.b)
    const delta=b.map((x,i)=>x-a[i])
    if(delta.some(x=>!Number.isFinite(x)))
      throw new Error('Invalid Foundation Tee sewing displacement')
    groups.get(pair.seamId).push(delta)
    const gapMm=distanceMm(delta)
    globalMaxMm=Math.max(globalMaxMm,gapMm)
    globalSquaredMm+=gapMm*gapMm
    globalCount++
  }
  const seamGroups=[...groups].map(([seamId,deltas])=>{
    const seam=authored.get(seamId)
    const crossPanel=seam.a.pieceId!==seam.b.pieceId
    const mean=deltas[0].map((_,i)=>
      deltas.reduce((sum,delta)=>sum+delta[i],0)/deltas.length)
    const gaps=deltas.map(distanceMm)
    const maximumGapMm=Math.max(...gaps)
    const rmsGapMm=Math.hypot(...gaps)/Math.sqrt(gaps.length)
    const centered=deltas.map(delta=>distanceMm(delta.map((x,i)=>x-mean[i])))
    const centeredRmsMm=Math.hypot(...centered)/Math.sqrt(centered.length)
    // Translation of an entire sleeve cannot close its own underarm seam.
    // For cross-panel seams this is a per-group unconstrained lower bound,
    // not an achievable coupled garment solution.
    return {seamId,fromPanelId:seam.a.pieceId,toPanelId:seam.b.pieceId,
      sewingPairCount:deltas.length,maximumGapMm,rmsGapMm,
      crossPanel,bestIndependentTranslationM:crossPanel?mean:null,
      independentTranslationRmsLowerBoundMm:crossPanel?centeredRmsMm:null,
      potentialIndependentTranslationRmsReductionMm:crossPanel?
        Math.max(0,rmsGapMm-centeredRmsMm):0,
      samePanelRigidTranslationCannotClose:!crossPanel}
  })
  return {panelCount:4,seamGroupCount:seamGroups.length,
    sewingPairCount:globalCount,maximumSeamGapMm:globalMaxMm,
    rmsSeamGapMm:Math.sqrt(globalSquaredMm/globalCount),
    seamGroups,
    worstGroupsByRms:[...seamGroups].sort((a,b)=>
      b.rmsGapMm-a.rmsGapMm||a.seamId.localeCompare(b.seamId))
      .map(group=>group.seamId),
    perGroupTranslationOnly:true,simultaneousClosureProven:false,
    strainChecked:false,contactChecked:false,trajectoryChecked:false,
    sourceUnchanged:true,physicalAcceptance:false,safeToAutoApply:false}
}
