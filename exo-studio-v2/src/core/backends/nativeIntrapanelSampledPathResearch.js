// Research-only discrete within-panel self-contact along a proposed motion.
// Existing endpoint-only checks can miss an intersection between poses.
// Every sample reuses the independent static triangle narrowphase, including
// edge-neighbor coplanar fold-overs. All face pairs count against work limits.
// This is NOT continuous collision detection or cloth-thickness clearance.
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'

function sameTopology(reference,pose){
  if(!Array.isArray(pose?.pieces)||!Array.isArray(pose?.particles)||
     pose.pieces.length!==reference.pieces.length||
     pose.particles.length!==reference.particles.length)
    throw new Error('Sampled self-contact topology mismatch')
  for(let i=0;i<reference.pieces.length;i++){
    const a=reference.pieces[i],b=pose.pieces[i]
    if(a.id!==b.id||
       JSON.stringify(a.particleIndices)!==JSON.stringify(b.particleIndices)||
       JSON.stringify(a.faces)!==JSON.stringify(b.faces))
      throw new Error('Sampled self-contact topology mismatch')
  }
}

// poseAt(fraction) may be a linear interpolation or a true hinge arc.
// Sample only interior fractions: endpoints MUST be checked separately.
export function inspectNativeIntrapanelSampledTrajectory(reference,{
  steps=4,poseAt,clearanceM=.001,maxPairsPerSample=500_000,
  maxTotalPairs=1_000_000,
}={}){
  if(!Array.isArray(reference?.pieces)||!Array.isArray(reference?.particles))
    throw new TypeError('Sampled self-contact requires a native payload')
  if(!Number.isInteger(steps)||steps<2||steps>16)
    throw new RangeError('Sampled self-contact steps must be 2..16')
  if(typeof poseAt!=='function')
    throw new TypeError('Sampled self-contact requires a pose generator')
  if(!Number.isInteger(maxTotalPairs)||maxTotalPairs<1||maxTotalPairs>5_000_000)
    throw new RangeError('Invalid sampled self-contact total work budget')
  if(!Number.isInteger(maxPairsPerSample)||maxPairsPerSample<1||
     maxPairsPerSample>5_000_000)
    throw new RangeError('Invalid sampled self-contact per-sample work budget')
  const samples=[]
  let checkedNonadjacentPairs=0,checkedTotalPairs=0
  let possibleAabbContactPairs=0,intersectingTrianglePairs=0
  let nonadjacentNearClearancePairs=0,edgeNeighborNearFoldoverPairs=0
  for(let index=1;index<steps;index++){
    const fraction=index/steps
    const pose=poseAt(fraction)
    sameTopology(reference,pose)
    const budget=Math.min(maxPairsPerSample,maxTotalPairs-checkedTotalPairs)
    if(budget<1)throw new RangeError('Sampled self-contact total work budget exceeded')
    const result=inspectNativeIntrapanelStaticContact(pose,{
      clearanceM,maxPairs:budget,
    })
    checkedNonadjacentPairs+=result.checkedNonadjacentPairs
    checkedTotalPairs+=result.checkedTotalPairs
    possibleAabbContactPairs+=result.possibleAabbContactPairs
    intersectingTrianglePairs+=result.intersectingTrianglePairs
    nonadjacentNearClearancePairs+=result.nonadjacentNearClearancePairs
    edgeNeighborNearFoldoverPairs+=result.edgeNeighborNearFoldoverPairs
    samples.push({fraction,checkedNonadjacentPairs:result.checkedNonadjacentPairs,
      checkedTotalPairs:result.checkedTotalPairs,
      possibleAabbContactPairs:result.possibleAabbContactPairs,
      intersectingTrianglePairs:result.intersectingTrianglePairs,
      nonadjacentNearClearancePairs:result.nonadjacentNearClearancePairs,
      edgeNeighborNearFoldoverPairs:result.edgeNeighborNearFoldoverPairs})
  }
  return {samples,intermediateSamples:samples.length,checkedNonadjacentPairs,checkedTotalPairs,
    possibleAabbContactPairs,intersectingTrianglePairs,
    nonadjacentNearClearancePairs,edgeNeighborNearFoldoverPairs,
    sampledSelfIntersectionsAbsent:intersectingTrianglePairs===0,
    sampledStaticThicknessScreenClear:intersectingTrianglePairs===0&&
      nonadjacentNearClearancePairs===0&&edgeNeighborNearFoldoverPairs===0,
    endpointsChecked:false,clothThicknessClearanceCertified:false,
    sweptCollisionCertified:false,selfCollisionCertified:false,fitCertified:false}
}

export function inspectNativeIntrapanelSampledChord(reference,endpoint,options={}){
  sameTopology(reference,endpoint)
  return inspectNativeIntrapanelSampledTrajectory(reference,{
    ...options,
    poseAt:fraction=>{
      const pose=structuredClone(reference)
      for(let i=0;i<pose.particles.length;i++){
        const a=reference.particles[i].position,b=endpoint.particles[i].position
        if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||
           !a.every(Number.isFinite)||!b.every(Number.isFinite))
          throw new Error('Invalid sampled self-contact coordinates')
        pose.particles[i].position=a.map((v,k)=>v+(b[k]-v)*fraction)
      }
      return pose
    },
  })
}
