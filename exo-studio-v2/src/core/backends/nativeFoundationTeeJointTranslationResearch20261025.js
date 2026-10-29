// Research-only joint least-squares translation of the REAL four-panel tee.
// All 102 sewing pairs are optimized together, with front fixed as the gauge.
// A rigid shift preserves each panel's deformation gradient, but does NOT
// preserve inter-panel contact, avatar clearance, or a safe motion trajectory.
// Never apply the candidate to a stored garment or production solver.
import {deriveFoundationTeeSewingInventoryResearch20261024} from
  './nativeFoundationTeeSewingInventoryResearch20261024.js'

const norm=v=>Math.hypot(...v)
const finite3=v=>Array.isArray(v)&&v.length===3&&
  v.every(x=>Number.isFinite(x)&&Math.abs(x)<=100)

function solve(matrix,vector){
  const n=vector.length
  const rows=matrix.map((row,i)=>[...row,vector[i]])
  for(let k=0;k<n;k++){
    let pivot=k
    for(let i=k+1;i<n;i++)
      if(Math.abs(rows[i][k])>Math.abs(rows[pivot][k]))pivot=i
    if(Math.abs(rows[pivot][k])<1e-10)
      throw new Error('Disconnected or singular joint sewing graph')
    ;[rows[k],rows[pivot]]=[rows[pivot],rows[k]]
    const divisor=rows[k][k]
    for(let j=k;j<=n;j++)rows[k][j]/=divisor
    for(let i=0;i<n;i++)if(i!==k){
      const factor=rows[i][k]
      for(let j=k;j<=n;j++)rows[i][j]-=factor*rows[k][j]
    }
  }
  return rows.map(row=>row[n])
}

export function researchFoundationTeeJointTranslation20261025(project,payload){
  const inventory=deriveFoundationTeeSewingInventoryResearch20261024(project,payload)
  const panelIds=payload.pieces.map(piece=>piece.id)
  if(panelIds.length!==4||!panelIds.includes('front'))
    throw new Error('Joint tee translation requires a fixed front panel')
  const movable=panelIds.filter(id=>id!=='front')
  const indexById=new Map(movable.map((id,i)=>[id,i]))
  const pieces=new Map(payload.pieces.map(piece=>[piece.id,piece]))
  for(const particle of payload.particles)
    if(!finite3(particle?.position)||!pieces.has(particle.pieceId))
      throw new Error('Invalid joint tee world-space particle')
  const at=endpoint=>{
    const piece=pieces.get(endpoint.panelId)
    const index=piece?.particleIndices?.[endpoint.vertex]
    const point=payload.particles[index]?.position
    if(!finite3(point))throw new Error('Invalid joint tee sewing endpoint')
    return point
  }
  const n=movable.length
  const matrix=Array.from({length:n},()=>Array(n).fill(0))
  const rhs=Array.from({length:3},()=>Array(n).fill(0))
  const pairs=[]
  for(const pair of inventory.requiredSewingPairs){
    const a=at(pair.a),b=at(pair.b)
    const delta=b.map((x,k)=>x-a[k])
    pairs.push({pair,delta})
    if(pair.a.panelId===pair.b.panelId)continue
    const coeff=movable.map(id=>
      (id===pair.b.panelId?1:0)-(id===pair.a.panelId?1:0))
    for(let i=0;i<n;i++){
      for(let j=0;j<n;j++)matrix[i][j]+=coeff[i]*coeff[j]
      for(let k=0;k<3;k++)rhs[k][i]-=coeff[i]*delta[k]
    }
  }
  const axes=rhs.map(vector=>solve(matrix,vector))
  const translationsM={front:[0,0,0]}
  movable.forEach((id,i)=>{
    translationsM[id]=axes.map(axis=>axis[i])
    if(!finite3(translationsM[id])||norm(translationsM[id])>1)
      throw new Error('Joint tee translation exceeds research motion budget')
  })
  const metrics=translated=>{
    const gaps=pairs.map(({pair,delta})=>{
      const shiftA=translated?translationsM[pair.a.panelId]:translationsM.front
      const shiftB=translated?translationsM[pair.b.panelId]:translationsM.front
      return norm(delta.map((x,k)=>x+shiftB[k]-shiftA[k]))*1000
    })
    return {maximumSeamGapMm:Math.max(...gaps),
      rmsSeamGapMm:Math.hypot(...gaps)/Math.sqrt(gaps.length)}
  }
  const before=metrics(false),after=metrics(true)
  if(after.rmsSeamGapMm>before.rmsSeamGapMm+1e-8)
    throw new Error('Joint least-squares solution increased sewing RMS')
  const candidatePayload=structuredClone(payload)
  for(const particle of candidatePayload.particles)
    particle.position=particle.position.map((x,k)=>
      x+translationsM[particle.pieceId][k])
  return {panelCount:4,sewingPairCount:pairs.length,
    crossPanelPairCount:inventory.crossPanelPairCount,
    intraPanelPairCount:inventory.intraPanelPairCount,
    translationsM,before,after,candidatePayload,
    translationOnly:true,hingeBendingPerformed:false,
    principalStrainCertified:false,contactCertified:false,
    avatarContactCertified:false,sweptCollisionCertified:false,
    physicalAcceptance:false,safeToAutoApply:false}
}
