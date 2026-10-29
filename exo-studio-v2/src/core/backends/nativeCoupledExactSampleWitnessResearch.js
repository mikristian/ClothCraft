// Research-only exact STATIC contact witnesses across supplied hinge samples.
// A sampled path is never a swept collision certificate. This diagnostic must
// not override the conservative inter-sample contact veto in the coupled gate.
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'

export function inspectNativeCoupledExactSampleWitnesses(samples,{
  clearanceM=.001,maxTotalPairs=4_000_000,maxNarrowphasePairs=100_000,
  maxWitnesses=8,
}={}){
  if(!Array.isArray(samples)||samples.length<2||samples.length>20)
    throw new RangeError('Exact coupled witnesses require 2..20 samples')
  if(!Number.isInteger(maxTotalPairs)||maxTotalPairs<1||maxTotalPairs>5_000_000)
    throw new RangeError('Invalid exact coupled total pair budget')
  if(!Number.isInteger(maxNarrowphasePairs)||maxNarrowphasePairs<1||
     maxNarrowphasePairs>5_000_000)
    throw new RangeError('Invalid exact coupled narrowphase budget')
  if(!Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.1)
    throw new RangeError('Invalid exact coupled clearance')
  if(!Number.isInteger(maxWitnesses)||maxWitnesses<1||maxWitnesses>256)
    throw new RangeError('Invalid exact coupled witness limit')

  // Reserve the full Cartesian inter-panel work budget BEFORE inspecting
  // any sample. Never rely on partial, prematurely accepted trajectories.
  let upper=0
  for(const sample of samples){
    if(!Number.isInteger(sample?.stage)||sample.stage<0||sample.stage>2||
       !Number.isFinite(sample.fraction)||sample.fraction<0||
       sample.fraction>1||!Array.isArray(sample.pose?.pieces)||
       sample.pose.pieces.length<2)
      throw new Error('Invalid exact coupled sample')
    const counts=sample.pose.pieces.map(p=>p.faces?.length)
    if(counts.some(n=>!Number.isInteger(n)||n<1))
      throw new Error('Invalid exact coupled sample faces')
    const count=counts.reduce((sum,n,i)=>sum+
      counts.slice(i+1).reduce((s,m)=>s+n*m,0),0)
    upper+=count
    if(!Number.isSafeInteger(upper)||upper>maxTotalPairs)
      throw new RangeError('Exact coupled sample pair budget exceeded')
  }
  const perSample=[]
  let broadphasePotentialPairs=0,exactNearClearancePairs=0
  let narrowphaseCheckedPairs=0,minimumExactGapMm=Infinity
  const nearest=[]
  for(const sample of samples){
    const remainingNarrowphase=maxNarrowphasePairs-narrowphaseCheckedPairs
    if(remainingNarrowphase<1)
      throw new RangeError('Exact coupled cumulative narrowphase budget exceeded')
    const inspected=inspectNativeInterpanelExactStaticContact(sample.pose,{
      clearanceM,maxPairs:maxTotalPairs,
      maxNarrowphasePairs:remainingNarrowphase,
      maxExamples:maxWitnesses,
    })
    broadphasePotentialPairs+=inspected.broadphasePotentialPairs
    exactNearClearancePairs+=inspected.nearClearancePairs
    narrowphaseCheckedPairs+=inspected.narrowphaseCheckedPairs
    if(inspected.minimumExactGapMm!==null)
      minimumExactGapMm=Math.min(minimumExactGapMm,inspected.minimumExactGapMm)
    perSample.push({stage:sample.stage,fraction:sample.fraction,
      broadphasePotentialPairs:inspected.broadphasePotentialPairs,
      exactNearClearancePairs:inspected.nearClearancePairs,
      minimumExactGapMm:inspected.minimumExactGapMm})
    for(const example of inspected.nearClearanceExamples)
      nearest.push({stage:sample.stage,fraction:sample.fraction,...example})
  }
  nearest.sort((a,b)=>a.distanceMm-b.distanceMm||a.stage-b.stage||
    a.fraction-b.fraction||String(a.pieceA).localeCompare(String(b.pieceA))||
    a.faceA-b.faceA||String(a.pieceB).localeCompare(String(b.pieceB))||
    a.faceB-b.faceB)
  return {sampleCount:samples.length,checkedTrianglePairs:upper,
    broadphasePotentialPairs,narrowphaseCheckedPairs,exactNearClearancePairs,
    minimumExactGapMm:Number.isFinite(minimumExactGapMm)?minimumExactGapMm:null,
    nearestExamples:nearest.slice(0,maxWitnesses),perSample,
    allNearPairsRepresented:exactNearClearancePairs<=maxWitnesses&&
      nearest.length===exactNearClearancePairs,
    sampledStaticExactClear:exactNearClearancePairs===0,
    conservativeSweptGateUnchanged:true,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false,safeToAutoApply:false}
}
