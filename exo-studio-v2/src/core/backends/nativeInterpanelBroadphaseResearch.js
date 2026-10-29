// Research-only conservative cloth/cloth contact broadphase for a STATIC pose.
// Checks EVERY triangle pair on DIFFERENT garment panels, using full 3D AABBs.
// If none of the boxes approach within clearanceM, inter-panel triangles
// cannot intersect at this instant. Overlapping boxes are only POSSIBLE
// contacts (false positives allowed). This is not narrow-phase triangle
// collision, same-panel self-contact, continuous CCD, or fit certification.

const finite3 = p => Array.isArray(p) && p.length===3 && p.every(Number.isFinite)

function boundsOfPanel(payload,piece) {
  if(!Array.isArray(piece.particleIndices)||!Array.isArray(piece.faces))
    throw new TypeError('Interpanel broadphase requires triangle panels')
  return piece.faces.map((face,index)=>{
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3)
      throw new Error('Invalid or degenerate triangle topology')
    const vertices=face.map(localIndex=>{
      if(!Number.isInteger(localIndex)||localIndex<0||
         localIndex>=piece.particleIndices.length)
        throw new RangeError('Triangle index outside panel')
      const particle=payload.particles[piece.particleIndices[localIndex]]
      if(!finite3(particle?.position))throw new RangeError('Invalid triangle position')
      return particle.position
    })
    return {faceIndex:index,
      min:[0,1,2].map(i=>Math.min(...vertices.map(p=>p[i]))),
      max:[0,1,2].map(i=>Math.max(...vertices.map(p=>p[i]))),
    }
  })
}

function aabbDistance(a,b) {
  return Math.hypot(...[0,1,2].map(i=>
    Math.max(0,a.min[i]-b.max[i],b.min[i]-a.max[i])))
}

export function inspectNativeInterpanelBroadphase(payload,{
  clearanceM=.001,maxPairs=1_000_000,
}={}) {
  if(!Array.isArray(payload?.pieces)||payload.pieces.length<2||
     !Array.isArray(payload?.particles))
    throw new TypeError('Interpanel broadphase requires at least two panels')
  if(!Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.1)
    throw new RangeError('Invalid interpanel clearance')
  if(!Number.isInteger(maxPairs)||maxPairs<1||maxPairs>5_000_000)
    throw new RangeError('Invalid broadphase work budget')
  const panels=payload.pieces.map(piece=>({
    id:piece.id,triangles:boundsOfPanel(payload,piece),
  }))
  let checkedTrianglePairs=0,possibleContactPairs=0
  let minimumAabbDistanceM=Infinity
  const closest=[]
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){
    const a=panels[i],b=panels[j]
    const pairs=a.triangles.length*b.triangles.length
    if(checkedTrianglePairs+pairs>maxPairs)
      throw new RangeError('Interpanel broadphase exceeds bounded work budget')
    for(const x of a.triangles)for(const y of b.triangles){
      const distanceM=aabbDistance(x,y)
      checkedTrianglePairs++
      minimumAabbDistanceM=Math.min(minimumAabbDistanceM,distanceM)
      if(distanceM<=clearanceM){
        possibleContactPairs++
        if(closest.length<5)closest.push({
          pieceA:a.id,faceA:x.faceIndex,pieceB:b.id,faceB:y.faceIndex,
          aabbDistanceMm:distanceM*1000,
        })
      }
    }
  }
  if(checkedTrianglePairs===0)throw new Error('No interpanel triangle pairs to inspect')
  return {
    checkedTrianglePairs,possibleContactPairs,
    minimumAabbDistanceMm:minimumAabbDistanceM*1000,
    clearanceMm:clearanceM*1000,
    possibleContacts:closest,
    staticInterpanelBroadphaseClear:possibleContactPairs===0,
    samePanelSelfCollisionChecked:false,
    triangleNarrowPhaseChecked:false,
    sweptCollisionCertified:false,fitCertified:false,
  }
}
