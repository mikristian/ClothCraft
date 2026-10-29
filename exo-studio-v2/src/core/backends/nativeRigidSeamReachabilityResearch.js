// Research-only exact lower bound on sewn residuals under PER-PANEL rigid
// placement. A pair whose endpoints are both attached to the same panel
// cannot be closed by translating/rotating that panel as one rigid body.
// This is a kinematic impossibility certificate, not a bending/contact solver.
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const gap=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]))*1000

export function inspectNativeRigidSeamReachability(payload,{maxPairs=4096}={}){
  if(!Array.isArray(payload?.pieces)||!payload.pieces.length||
     !Array.isArray(payload.particles)||!Array.isArray(payload.constraints)||
     (payload.virtualSeams!==undefined&&!Array.isArray(payload.virtualSeams))||
     !Number.isInteger(maxPairs)||maxPairs<1||maxPairs>4096)
    throw new Error('Invalid bounded rigid seam reachability inputs')
  const frozen=JSON.stringify(payload)
  const ownership=new Map(),material=new Map(),panelIds=new Set()
  for(const piece of payload.pieces){
    if(typeof piece.id!=='string'||!piece.id||panelIds.has(piece.id)||
       !Array.isArray(piece.particleIndices)||
       !Array.isArray(piece.flatVerticesM)||
       piece.particleIndices.length!==piece.flatVerticesM.length)
      throw new Error('Invalid or duplicate rigid panel')
    panelIds.add(piece.id)
    for(let local=0;local<piece.particleIndices.length;local++){
      const index=piece.particleIndices[local],uv=piece.flatVerticesM[local]
      if(!Number.isInteger(index)||index<0||index>=payload.particles.length||
         ownership.has(index)||!finite3(uv)||
         !finite3(payload.particles[index]?.position))
        throw new Error('Invalid or shared rigid panel particle')
      ownership.set(index,piece.id)
      material.set(index,uv)
    }
  }
  function endpoint(indices,weights){
    if(!Array.isArray(indices)||!Array.isArray(weights)||
       indices.length<1||indices.length>3||indices.length!==weights.length)
      throw new Error('Invalid weighted rigid seam endpoint')
    let total=0
    const world=[0,0,0],rest=[0,0,0],owners=new Set()
    for(let k=0;k<indices.length;k++){
      const i=indices[k],w=weights[k]
      if(!Number.isInteger(i)||!ownership.has(i)||
         !Number.isFinite(w)||w<0)
        throw new Error('Invalid rigid seam index or weight')
      total+=w
      owners.add(ownership.get(i))
      for(let j=0;j<3;j++){
        world[j]+=w*payload.particles[i].position[j]
        rest[j]+=w*material.get(i)[j]
      }
    }
    if(Math.abs(total-1)>1e-5||!finite3(world)||!finite3(rest))
      throw new Error('Nonunit or nonfinite rigid seam endpoint')
    return {world,rest,owners:[...owners],indices:[...indices]}
  }
  const rows=[],groupCounts=new Map()
  function add(id,a,b){
    if(typeof id!=='string'||!id)
      throw new Error('Missing rigid seam group identity')
    if(rows.length>=maxPairs)throw new Error('Rigid seam pair budget exceeded')
    const invariant=a.owners.length===1&&b.owners.length===1&&
      a.owners[0]===b.owners[0]
    const worldGapMm=gap(a.world,b.world)
    const restGapMm=invariant?gap(a.rest,b.rest):null
    if(!Number.isFinite(worldGapMm)||
       (invariant&&!Number.isFinite(restGapMm)))
      throw new Error('Nonfinite rigid seam separation')
    rows.push({id,pairIndex:groupCounts.get(id)||0,
      gapMm:worldGapMm,rigidInvariant:invariant,
      panelId:invariant?a.owners[0]:null,
      endpointA:a.indices,endpointB:b.indices,
      restGapMm})
    groupCounts.set(id,(groupCounts.get(id)||0)+1)
  }
  for(const c of payload.constraints){
    if(c.type!=='seam')continue
    add(c.seamId,endpoint([c.a],[1]),endpoint([c.b],[1]))
  }
  for(const c of payload.virtualSeams||[]){
    add(c.seamId||c.id,endpoint(c.sourceIndices,c.sourceWeights),
      endpoint(c.targetIndices,c.targetWeights))
  }
  if(!rows.length)throw new Error('Missing rigid seam correspondences')
  const groupIds=[...new Set(rows.map(x=>x.id))]
  const groups=groupIds.map(id=>{
    const pairs=rows.filter(x=>x.id===id)
    const fixed=pairs.filter(x=>x.rigidInvariant)
    return {id,pairCount:pairs.length,invariantPairCount:fixed.length,
      currentMaxGapMm:Math.max(...pairs.map(x=>x.gapMm)),
      currentRmsGapMm:Math.sqrt(pairs.reduce((s,x)=>s+x.gapMm**2,0)/pairs.length),
      rigidOnlyMaxFloorMm:fixed.length?Math.max(...fixed.map(x=>x.gapMm)):0,
      rigidOnlyRmsFloorMm:Math.sqrt(fixed.reduce((s,x)=>s+x.gapMm**2,0)/pairs.length),
      worstInvariantPairs:fixed.sort((a,b)=>b.gapMm-a.gapMm)
        .slice(0,3).map(x=>({...x}))}
  })
  const fixed=rows.filter(x=>x.rigidInvariant)
  const result={pairCount:rows.length,invariantPairCount:fixed.length,
    currentMaxGapMm:Math.max(...rows.map(x=>x.gapMm)),
    currentRmsGapMm:Math.sqrt(rows.reduce((s,x)=>s+x.gapMm**2,0)/rows.length),
    rigidOnlyMaxFloorMm:fixed.length?Math.max(...fixed.map(x=>x.gapMm)):0,
    rigidOnlyRmsFloorMm:Math.sqrt(fixed.reduce((s,x)=>s+x.gapMm**2,0)/rows.length),
    groups,sourceUnchanged:JSON.stringify(payload)===frozen,
    rigidPlacementOnly:true,articulatedBendingChecked:false,
    strainCertified:false,contactCertified:false,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false,safeToAutoApply:false}
  if(!result.sourceUnchanged)throw new Error('Rigid reachability mutated source')
  return result
}
