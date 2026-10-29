// Geometry-only sleeve hinge ranking for the rejected four-panel research pose.
// A moved sleeve is NOT evidence that its sewn underarm endpoints moved closer.
// Ranking does not evaluate contact, material conditioning or avatar entry.
import {createNativeDevelopableHingeCandidate} from './nativeDevelopableHingeResearch.js'
import {measureNativeSeamResiduals,compareNativeSeamGroups} from './nativeSeamCandidateGate.js'

const TARGET={
  'sleeve-left':'seam-sleeve-l-underarm',
  'sleeve-right':'seam-sleeve-r-underarm',
}
const key=h=>`${h.panelId}:${h.axisVertices.join(',')}:${h.side}`
const target=(metrics,id)=>{
  const found=metrics.groups.filter(g=>g.id===id)
  if(found.length!==1||!Number.isInteger(found[0].pairCount)||found[0].pairCount<1||
    ![found[0].maxGapMm,found[0].rmsGapMm].every(Number.isFinite))
    throw new Error(`Missing or corrupt target seam group: ${id}`)
  return found[0]
}

export function rankNativeUnderarmHingeAxes(reference,{
  hinges,anglesRadians=[-.04,.04],excludedAxisKeys=[],maxAxesPerPanel=20,
  toleranceMm=1e-6,
}={}){
  if(!Array.isArray(hinges)||hinges.length<1||hinges.length>128||
     !Array.isArray(anglesRadians)||anglesRadians.length<1||anglesRadians.length>2||
     new Set(anglesRadians).size!==anglesRadians.length||
     !anglesRadians.every(a=>Number.isFinite(a)&&a!==0&&Math.abs(a)<=.15)||
     !Number.isInteger(maxAxesPerPanel)||maxAxesPerPanel<1||maxAxesPerPanel>20||
     !Number.isFinite(toleranceMm)||toleranceMm<0||toleranceMm>.1||
     !Array.isArray(excludedAxisKeys)||excludedAxisKeys.some(k=>typeof k!=='string'))
    throw new RangeError('Invalid bounded underarm axis ranking inputs')
  const keys=new Set(),excluded=new Set(excludedAxisKeys)
  const counts={'sleeve-left':0,'sleeve-right':0}
  const selected=[]
  for(const hinge of hinges){
    if(!Object.hasOwn(TARGET,hinge?.panelId)||hinge.worldAxisAligned!==true||
       !Array.isArray(hinge.axisVertices)||hinge.axisVertices.length!==2||
       hinge.axisVertices.some(i=>!Number.isInteger(i)||i<0)||
       hinge.axisVertices[0]===hinge.axisVertices[1]||
       !['positive','negative'].includes(hinge.side))
      throw new Error('Invalid or nonexecutable sleeve hinge')
    const id=key(hinge)
    if(keys.has(id))throw new Error('Duplicate sleeve hinge axis')
    keys.add(id)
    if(excluded.has(id))continue
    if(++counts[hinge.panelId]>maxAxesPerPanel)
      throw new RangeError('Too many sleeve axes for bounded ranking')
    selected.push(hinge)
  }
  if(!selected.length)throw new Error('No untested sleeve axes')
  const snapshot=JSON.stringify(reference)
  if(!snapshot)throw new Error('Missing reference garment')
  const baseline=measureNativeSeamResiduals(reference)
  target(baseline,TARGET['sleeve-left'])
  target(baseline,TARGET['sleeve-right'])
  const started=performance.now(),ranked=[]
  // Do not let floating-point noise (~1e-14 mm) outrank real RMS progress.
  const meaningful=x=>Math.abs(x)<=toleranceMm?0:x
  const compare=(a,b)=>meaningful(b.maxDropMm)-meaningful(a.maxDropMm)||
    meaningful(b.rmsDropMm)-meaningful(a.rmsDropMm)||
    Number(b.groupSafe)-Number(a.groupSafe)
  try{
    for(const hinge of selected){
      const id=TARGET[hinge.panelId],before=target(baseline,id)
      const trials=[]
      for(const angleRadians of anglesRadians){
        const candidate=createNativeDevelopableHingeCandidate(reference,
          {...hinge,angleRadians}).candidate
        const afterMetrics=measureNativeSeamResiduals(candidate)
        if(afterMetrics.pairCount!==baseline.pairCount)
          throw new Error('Hinge changed sewing correspondence count')
        const after=target(afterMetrics,id)
        if(after.pairCount!==before.pairCount)
          throw new Error('Hinge changed underarm correspondence count')
        const groups=compareNativeSeamGroups(baseline,afterMetrics,{toleranceMm})
        trials.push({angleRadians,
          maxDropMm:before.maxGapMm-after.maxGapMm,
          rmsDropMm:before.rmsGapMm-after.rmsGapMm,
          globalMaxDropMm:baseline.maxGapMm-afterMetrics.maxGapMm,
          globalRmsDropMm:baseline.rmsGapMm-afterMetrics.rmsGapMm,
          regressingGroups:groups.regressions.map(g=>g.id),
          groupSafe:groups.allGroupsNonworse})
      }
      trials.sort(compare)
      ranked.push({axisKey:key(hinge),panelId:hinge.panelId,
        axisVertices:[...hinge.axisVertices],side:hinge.side,
        movingVertexCount:hinge.movingVertexCount,
        targetSeamId:id,targetPairCount:before.pairCount,
        best:trials[0],trials,
        measurableLeverage:trials.some(t=>Math.abs(t.maxDropMm)>toleranceMm||
          Math.abs(t.rmsDropMm)>toleranceMm),
        underarmImproved:trials.some(t=>t.maxDropMm>toleranceMm&&
          t.rmsDropMm>=-toleranceMm)})
    }
  }finally{
    if(JSON.stringify(reference)!==snapshot)
      throw new Error('Underarm ranking mutated original garment')
  }
  ranked.sort((a,b)=>compare(a.best,b.best)||a.axisKey.localeCompare(b.axisKey))
  return {evaluatedAxes:ranked.length,evaluatedAngles:ranked.length*anglesRadians.length,
    excludedCount:keys.size-selected.length,
    axesWithLeverage:ranked.filter(r=>r.measurableLeverage).length,
    axesWithUnderarmImprovement:ranked.filter(r=>r.underarmImproved).length,
    ranked,runtimeMs:+(performance.now()-started).toFixed(2),
    sourceUnchanged:true,geometryOnly:true,contactVerified:false,
    fitCertified:false,sweptCollisionCertified:false,avatarEntryCertified:false,
    safeToAutoApply:false}
}
