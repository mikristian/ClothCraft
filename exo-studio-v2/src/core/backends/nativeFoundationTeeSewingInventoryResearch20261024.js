// Research-only bridge from the authored four-panel tee sewing specification
// to the native particle-level constraints. The result can be frozen before
// testing a *different* candidate; it is NOT an independent factory manifest
// or evidence of a physically sewn, collision-free garment.
// Frozen sample counts belong ONLY to the canonical 2026-10-24 tee fixture.
// If its sampling changes, reject until an independent re-baseline is done.
const FROZEN_GROUP_COUNTS=Object.freeze({
  'seam-shoulder-l':5,'seam-side-l':5,'seam-side-r':5,
  'seam-shoulder-r':5,
  'seam-sleeve-l-front-upper':9,'seam-sleeve-l-front-lower':9,
  'seam-sleeve-l-back-lower':9,'seam-sleeve-l-back-upper':9,
  'seam-sleeve-l-underarm':5,
  'seam-sleeve-r-front-lower':9,'seam-sleeve-r-front-upper':9,
  'seam-sleeve-r-back-upper':9,'seam-sleeve-r-back-lower':9,
  'seam-sleeve-r-underarm':5,
})
export function deriveFoundationTeeSewingInventoryResearch20261024(project,payload){
  if(project?.templateId!=='tee'||!Array.isArray(project.pieces)||
     project.pieces.length!==4||!Array.isArray(project.seams)||
     project.seams.length<4||project.seams.length>64||
     !Array.isArray(payload?.pieces)||payload.pieces.length!==4||
     !Array.isArray(payload.particles)||payload.particles.length>4096||
     !Array.isArray(payload.constraints)||payload.constraints.length>10000||
     !Array.isArray(payload.virtualSeams)||payload.virtualSeams.length!==0)
    throw new Error('Unsupported Foundation Tee sewing inventory')

  const sourcePieces=new Map()
  for(const piece of project.pieces){
    if(typeof piece?.id!=='string'||!piece.id||
       sourcePieces.has(piece.id)||!Array.isArray(piece.points)||
       piece.points.length<3)
      throw new Error('Invalid authored sewing piece')
    sourcePieces.set(piece.id,piece)
  }
  const nativePieces=new Map()
  const localByGlobal=new Map()
  for(const piece of payload.pieces){
    if(!sourcePieces.has(piece?.id)||nativePieces.has(piece.id)||
       !Array.isArray(piece.particleIndices)||
       piece.particleIndices.length<3||piece.particleIndices.length>1024||
       !Array.isArray(piece.flatVerticesM)||
       piece.flatVerticesM.length!==piece.particleIndices.length)
      throw new Error('Invalid native sewing piece')
    nativePieces.set(piece.id,piece)
    piece.particleIndices.forEach((index,vertex)=>{
      if(!Number.isInteger(index)||index<0||index>=payload.particles.length||
         localByGlobal.has(index)||payload.particles[index]?.pieceId!==piece.id)
        throw new Error('Invalid native sewing particle provenance')
      localByGlobal.set(index,{panelId:piece.id,vertex})
    })
  }
  if(nativePieces.size!==sourcePieces.size||
     localByGlobal.size!==payload.particles.length)
    throw new Error('Incomplete native sewing particle inventory')

  const authored=new Map()
  for(const seam of project.seams){
    const a=seam?.a,b=seam?.b
    if(typeof seam?.id!=='string'||!seam.id||authored.has(seam.id)||
       !sourcePieces.has(a?.pieceId)||!sourcePieces.has(b?.pieceId)||
       !Number.isInteger(a.edgeIndex)||!Number.isInteger(b.edgeIndex)||
       a.edgeIndex<0||b.edgeIndex<0||
       a.edgeIndex>=sourcePieces.get(a.pieceId).points.length||
       b.edgeIndex>=sourcePieces.get(b.pieceId).points.length||
       (a.pieceId===b.pieceId&&a.edgeIndex===b.edgeIndex))
      throw new Error('Invalid authored sewing seam')
    authored.set(seam.id,{a:a.pieceId,b:b.pieceId})
  }

  const sewing=payload.constraints.filter(c=>c?.type==='seam')
  if(sewing.length<authored.size||sewing.length>512)
    throw new Error('Incomplete or oversized native sewing inventory')
  const groups=new Map([...authored.keys()].map(id=>[id,0]))
  const seen=new Set(),seenEndpoints=new Set(),requiredSewingPairs=[]
  let intraPanelPairCount=0
  let sharedJunctionPairCount=0
  for(const constraint of sewing){
    const ends=authored.get(constraint.seamId)
    const a=localByGlobal.get(constraint.a)
    const b=localByGlobal.get(constraint.b)
    if(!ends||!a||!b||constraint.a===constraint.b||
       !Number.isFinite(constraint.rest)||constraint.rest<0||
       !((a.panelId===ends.a&&b.panelId===ends.b)||
         (a.panelId===ends.b&&b.panelId===ends.a)))
      throw new Error('Native seam disagrees with authored sewing')
    const endpoints=[`${a.panelId}:${a.vertex}`,`${b.panelId}:${b.vertex}`]
      .sort().join('|')
    const key=JSON.stringify([constraint.seamId,endpoints])
    if(seen.has(key))throw new Error('Duplicate native sewing correspondence')
    seen.add(key)
    if(seenEndpoints.has(endpoints))sharedJunctionPairCount++
    seenEndpoints.add(endpoints)
    groups.set(constraint.seamId,groups.get(constraint.seamId)+1)
    if(a.panelId===b.panelId)intraPanelPairCount++
    requiredSewingPairs.push({a:{...a},b:{...b},
      seamId:constraint.seamId})
  }
  if(authored.size!==Object.keys(FROZEN_GROUP_COUNTS).length||
     [...authored.keys()].some(id=>!(id in FROZEN_GROUP_COUNTS))||
     [...groups].some(([id,count])=>count!==FROZEN_GROUP_COUNTS[id]))
    throw new Error('Native sewing differs from frozen Foundation Tee group inventory')
  return {
    requiredSewingPairs,
    seamGroupCounts:Object.fromEntries(groups),
    seamGroupCount:groups.size,
    sewingPairCount:requiredSewingPairs.length,
    crossPanelPairCount:requiredSewingPairs.length-intraPanelPairCount,
    intraPanelPairCount,sharedJunctionPairCount,
    source:'authored-project-and-frozen-native-baseline',
    independentlySigned:false,physicalAcceptance:false,
    sweptCollisionCertified:false,
  }
}
