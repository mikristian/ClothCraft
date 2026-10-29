// Research-only, bounded discrete screening of a prescribed coupled hinge-angle
// path. This is NOT swept CCD: contact between samples can remain undetected.
import {screenNativeCoupledCreasePoseContact20261024} from './nativeCoupledCreasePoseContactResearch20261024.js'

const plainObject=value=>value!==null&&typeof value==='object'&&
  Object.getPrototypeOf(value)===Object.prototype

export function screenNativeCoupledCreaseAnglePath20261024(panels,{
  startAnglesRadians={},endAnglesRadians={},subdivisions=8,
  sewingPairs=[],requiredSewingPairs=null,clearanceM=.001,strainLimitPercent=5,
  seamToleranceMm=1,maxPairsPerPose=250000,
  maxTotalPairEvaluations=1_000_000,
}={}){
  if(!Array.isArray(panels)||panels.length<2||panels.length>4||
     !Number.isInteger(subdivisions)||subdivisions<2||subdivisions>16||
     !Number.isInteger(maxPairsPerPose)||maxPairsPerPose<1||maxPairsPerPose>1_000_000||
     !Number.isSafeInteger(maxTotalPairEvaluations)||
     maxTotalPairEvaluations<1||maxTotalPairEvaluations>5_000_000||
     !Number.isFinite(seamToleranceMm)||seamToleranceMm<0||seamToleranceMm>100||
     !plainObject(startAnglesRadians)||!plainObject(endAnglesRadians)||
     !Array.isArray(sewingPairs)||sewingPairs.length>512||
     (requiredSewingPairs!==null&&
       (!Array.isArray(requiredSewingPairs)||requiredSewingPairs.length<1||
        requiredSewingPairs.length>512)))
    throw new RangeError('Invalid coupled angle-path settings')
  const ids=panels.map(panel=>panel?.panelId)
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)
    throw new Error('Invalid coupled angle-path panel identities')
  const idSet=new Set(ids)
  // A terminal gap is meaningful only when correspondences actually join the
  // panels under study. A self-pair or a disconnected four-panel subset can
  // otherwise report zero gap and falsely pass the sampled research gate.
  const panelById=new Map(panels.map(panel=>[panel.panelId,panel]))
  const connected=new Map(ids.map(id=>[id,id]))
  const root=id=>{
    while(connected.get(id)!==id)id=connected.get(id)
    return id
  }
  const validatePairs=(pairs,label)=>{
    const seen=new Set()
    for(const pair of pairs){
    const a=pair?.a,b=pair?.b
    if(!a||!b||!idSet.has(a.panelId)||!idSet.has(b.panelId)||
       !Number.isInteger(a.vertex)||!Number.isInteger(b.vertex)||
       a.vertex<0||b.vertex<0||
       a.vertex>=panelById.get(a.panelId)?.verticesM?.length||
       b.vertex>=panelById.get(b.panelId)?.verticesM?.length||
       // Real tee underarms sew two distinct vertices on the SAME sleeve.
       // Only admit those pairs when a declared full manifest is present;
       // without one, preserve the stricter cross-panel-only behavior.
       (a.panelId===b.panelId&&
         (requiredSewingPairs===null||a.vertex===b.vertex)))
      throw new Error(`Invalid ${label} cross-panel sewing correspondence`)
    if(pair.seamId!==undefined&&
       (typeof pair.seamId!=='string'||!pair.seamId||
        pair.seamId.length>128))
      throw new Error(`Invalid ${label} sewing group identity`)
    // Four authored sleeve junctions legitimately reuse a vertex pair in
    // TWO distinct seam groups. A full manifest preserves that multiplicity
    // using seamId; without a manifest duplicates still fail closed.
    const ends=[[`${a.panelId}`,a.vertex],[`${b.panelId}`,b.vertex]]
      .sort((x,y)=>x[0].localeCompare(y[0])||x[1]-y[1])
    const key=JSON.stringify([ends,
      requiredSewingPairs===null?null:(pair.seamId??null)])
    if(seen.has(key))throw new Error(`Duplicate ${label} sewing correspondence`)
    seen.add(key)
    }
    return seen
  }
  const seenPairs=validatePairs(sewingPairs,'supplied')
  for(const pair of sewingPairs){
    const a=pair.a,b=pair.b
    if(a.panelId!==b.panelId)connected.set(root(a.panelId),root(b.panelId))
  }
  // A connected sewing graph can be formed by just N-1 vertex pairs. When
  // the caller has an independently authored sewing manifest, reject missing
  // OR extra correspondences rather than treating that spanning tree as sewn.
  const required=requiredSewingPairs===null?null:
    validatePairs(requiredSewingPairs,'required')
  const sewingCoverageMatchesManifest=required===null?null:
    required.size===seenPairs.size&&[...required].every(key=>seenPairs.has(key))
  const sewingGraphConnected=sewingPairs.length>0&&
    new Set(ids.map(root)).size===1
  const intraPanelPairsChecked=sewingPairs.filter(pair=>
    pair.a.panelId===pair.b.panelId).length
  for(const angles of [startAnglesRadians,endAnglesRadians]){
    for(const id of Reflect.ownKeys(angles)){
      if(typeof id!=='string'||!idSet.has(id)||
         !Number.isFinite(angles[id])||Math.abs(angles[id])>Math.PI)
        throw new RangeError('Invalid coupled angle-path endpoint')
    }
  }
  if(panels.some(panel=>!Array.isArray(panel?.faces)))
    throw new Error('Invalid coupled angle-path faces')
  const faceCount=panels.reduce((sum,panel)=>sum+panel.faces.length,0)
  const pairsPerPose=faceCount*(faceCount-1)/2
  const totalPotentialPairs=pairsPerPose*(subdivisions+1)
  if(!Number.isSafeInteger(totalPotentialPairs)||pairsPerPose>maxPairsPerPose||
     totalPotentialPairs>maxTotalPairEvaluations)
    throw new RangeError('Coupled angle-path pair budget exceeded')

  const poses=[]
  for(let step=0;step<=subdivisions;step++){
    const fraction=step/subdivisions
    const anglesRadians=Object.fromEntries(ids.map(id=>[id,
      (startAnglesRadians[id]??0)*(1-fraction)+
      (endAnglesRadians[id]??0)*fraction]))
    const result=screenNativeCoupledCreasePoseContact20261024(panels,{
      anglesRadians,sewingPairs,clearanceM,strainLimitPercent,
      maxPairs:maxPairsPerPose,
    })
    poses.push({fraction,maximumSeamGapMm:result.maximumSeamGapMm,
      rmsSeamGapMm:result.rmsSeamGapMm,
      maximumPrincipalExtensionPercent:result.maximumPrincipalExtensionPercent,
      maximumPrincipalCompressionPercent:result.maximumPrincipalCompressionPercent,
      principalStrainValid:result.principalStrainValid,
      staticContactClear:result.staticContactClear,
      intrapanelNearClearancePairs:result.intrapanelNearClearancePairs,
      interpanelNearClearancePairs:result.interpanelNearClearancePairs})
  }
  const terminal=poses.at(-1)
  const sampledContactClear=poses.every(pose=>pose.staticContactClear)
  const sampledStrainValid=poses.every(pose=>pose.principalStrainValid)
  const terminalSeamWithinTolerance=sewingPairs.length>0&&
    terminal.maximumSeamGapMm!==null&&
    terminal.maximumSeamGapMm<=seamToleranceMm
  return {poses,sampledPoseCount:poses.length,pairsPerPose,totalPotentialPairs,
    sampledContactClear,sampledStrainValid,terminalSeamWithinTolerance,
    sewingGraphConnected,intraPanelPairsChecked,
    sewingCoverageChecked:required!==null,
    sewingCoverageMatchesManifest,
    sampledResearchGatePass:sewingGraphConnected&&sampledContactClear&&sampledStrainValid&&
      terminalSeamWithinTolerance&&sewingCoverageMatchesManifest!==false,
    firstContactFailureFraction:poses.find(pose=>!pose.staticContactClear)?.fraction??null,
    sourceUnchanged:true,discreteSamplesOnly:true,avatarContactChecked:false,
    sweptCollisionCertified:false,physicalAcceptance:false,safeToAutoApply:false}
}
