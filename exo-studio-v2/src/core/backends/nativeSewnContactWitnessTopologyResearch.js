// Research-only explanation of sampled inter-panel static contact witnesses.
// A face incident to a sewing correspondence is NOT proof that its nearest
// contact point lies on the sewn boundary, nor a collision exemption.
// This helper never edits a garment or changes any collision acceptance gate.
const finiteIndex=(n,length)=>Number.isInteger(n)&&n>=0&&n<length
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`

function inspectPieces(payload){
  if(!Array.isArray(payload?.particles)||!Array.isArray(payload?.pieces)||
     payload.pieces.length<2)
    throw new TypeError('Sewn contact topology requires a native garment')
  const pieces=new Map(),particlePiece=new Map()
  for(const piece of payload.pieces){
    if(typeof piece?.id!=='string'||!piece.id||pieces.has(piece.id)||
       !Array.isArray(piece.faces)||piece.faces.length===0||
       !Array.isArray(piece.particleIndices)||piece.particleIndices.length<3)
      throw new Error('Invalid sewn contact panel topology')
    const indices=piece.particleIndices
    for(const global of indices){
      if(!finiteIndex(global,payload.particles.length)||particlePiece.has(global))
        throw new Error('Invalid or shared sewn contact particle')
      particlePiece.set(global,piece.id)
    }
    const edges=new Map()
    const faces=piece.faces.map(face=>{
      if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
         face.some(i=>!finiteIndex(i,indices.length)))
        throw new Error('Invalid sewn contact face')
      for(let i=0;i<3;i++){
        const edge=key(face[i],face[(i+1)%3])
        edges.set(edge,(edges.get(edge)||0)+1)
        if(edges.get(edge)>2)throw new Error('Nonmanifold sewn contact edge')
      }
      return new Set(face.map(i=>indices[i]))
    })
    const boundary=new Set()
    for(const [edge,count] of edges)if(count===1)
      edge.split(':').forEach(i=>boundary.add(indices[Number(i)]))
    pieces.set(piece.id,{faces,boundary})
  }
  return {pieces,particlePiece}
}

function sewingSupports(payload,particlePiece){
  const sewing=[]
  const append=(id,left,right,type)=>{
    if(!Array.isArray(left)||!Array.isArray(right)||!left.length||!right.length||
       [...left,...right].some(i=>!particlePiece.has(i)))
      throw new Error('Invalid sewn contact correspondence indices')
    const a=particlePiece.get(left[0]),b=particlePiece.get(right[0])
    if(left.some(i=>particlePiece.get(i)!==a)||
       right.some(i=>particlePiece.get(i)!==b))
      throw new Error('Sewing support spans multiple panels')
    if(a!==b)sewing.push({id:String(id||'unnamed-seam'),a,b,
      left:new Set(left),right:new Set(right),type})
  }
  if(!Array.isArray(payload.constraints))throw new Error('Missing sewing constraints')
  for(const seam of payload.constraints)if(seam.type==='seam')
    append(seam.seamId,[seam.a],[seam.b],'direct')
  if(payload.virtualSeams!==undefined&&!Array.isArray(payload.virtualSeams))
    throw new Error('Invalid virtual sewing list')
  for(const seam of payload.virtualSeams||[]){
    const supports=(indices,weights)=>{
      if(!Array.isArray(indices)||!Array.isArray(weights)||
         indices.length===0||indices.length!==weights.length||
         weights.some(w=>!Number.isFinite(w)||w<0)||
         Math.abs(weights.reduce((sum,w)=>sum+w,0)-1)>1e-5)
        throw new Error('Invalid virtual sewing weights')
      return indices.filter((_,i)=>weights[i]>0)
    }
    append(seam.seamId||seam.id,
      supports(seam.sourceIndices,seam.sourceWeights),
      supports(seam.targetIndices,seam.targetWeights),'virtual')
  }
  return sewing
}

const intersects=(a,b)=>[...a].some(x=>b.has(x))

export function classifyNativeSewnContactWitnessTopology(payload,report){
  if(!Number.isInteger(report?.exactNearClearancePairs)||
     report.exactNearClearancePairs<0||
     !Array.isArray(report.nearestExamples)||
     report.nearestExamples.length>256||
     report.nearestExamples.length>report.exactNearClearancePairs||
     typeof report.allNearPairsRepresented!=='boolean'||
     (report.allNearPairsRepresented!==
       (report.nearestExamples.length===report.exactNearClearancePairs)))
    throw new Error('Invalid or inconsistent exact contact witness report')
  const {pieces,particlePiece}=inspectPieces(payload)
  const sewing=sewingSupports(payload,particlePiece)
  const classified=report.nearestExamples.map(w=>{
    const a=pieces.get(w.pieceA),b=pieces.get(w.pieceB)
    if(!a||!b||a===b||!finiteIndex(w.faceA,a.faces.length)||
       !finiteIndex(w.faceB,b.faces.length)||
       !Number.isFinite(w.distanceMm)||w.distanceMm<0)
      throw new Error('Invalid sewn contact witness')
    const faceA=a.faces[w.faceA],faceB=b.faces[w.faceB]
    const associated=[],interior=[]
    for(const seam of sewing){
      const direct=seam.a===w.pieceA&&seam.b===w.pieceB
      const reverse=seam.b===w.pieceA&&seam.a===w.pieceB
      if(!direct&&!reverse)continue
      const left=direct?seam.left:seam.right
      const right=direct?seam.right:seam.left
      if(!intersects(faceA,left)||!intersects(faceB,right))continue
      const boundaryA=new Set([...faceA].filter(i=>a.boundary.has(i)))
      const boundaryB=new Set([...faceB].filter(i=>b.boundary.has(i)))
      if(intersects(boundaryA,left)&&intersects(boundaryB,right))
        associated.push(seam.id)
      else interior.push(seam.id)
    }
    const classification=associated.length?'sewing_boundary_incident_faces':
      interior.length?'sewing_support_incident_interior_faces':
      'no_matching_sewing_correspondence'
    return {pieceA:w.pieceA,faceA:w.faceA,pieceB:w.pieceB,
      faceB:w.faceB,distanceMm:w.distanceMm,
      ...(w.stage===undefined?{}:{stage:w.stage,fraction:w.fraction}),
      classification,associatedSeamIds:[...new Set(associated)].sort(),
      interiorSeamIds:[...new Set(interior)].sort(),
      contactAtSewnBoundaryVerified:false,collisionExemptionGranted:false}
  })
  const count=classification=>classified.filter(w=>w.classification===classification).length
  return {
    totalExactNearPairs:report.exactNearClearancePairs,
    classifiedWitnesses:classified.length,
    unrepresentedNearPairs:report.exactNearClearancePairs-classified.length,
    completeEvidence:report.allNearPairsRepresented,
    boundarySewingIncidentPairs:count('sewing_boundary_incident_faces'),
    interiorSewingSupportPairs:count('sewing_support_incident_interior_faces'),
    noMatchingSewingPairs:count('no_matching_sewing_correspondence'),
    witnesses:classified,
    contactAtSewnBoundaryVerified:false,
    staticContactCertified:false,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false,
    collisionExemptionGranted:false,safeToAutoApply:false,
  }
}
