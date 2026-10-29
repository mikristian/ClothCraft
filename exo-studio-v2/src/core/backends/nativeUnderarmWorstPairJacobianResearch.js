// Read-only, infinitesimal seam-gap sensitivity of the ACTUAL underarm pairs.
// A nonzero derivative is not a finite-angle improvement, and cannot certify
// bending, strain, contact, swept CCD, avatar entry or a sewn garment.
const UNDERARMS=['seam-sleeve-l-underarm','seam-sleeve-r-underarm']
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const sub=(a,b)=>a.map((v,i)=>v-b[i])
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const length=p=>Math.hypot(...p)

function endpoint(payload,indices,weights){
  if(!Array.isArray(indices)||!Array.isArray(weights)||!indices.length||
     indices.length!==weights.length||indices.length>3)
    throw new Error('Invalid seam endpoint weights')
  const result=[0,0,0]
  let total=0
  for(let k=0;k<indices.length;k++){
    const i=indices[k],w=weights[k],p=payload.particles[i]?.position
    if(!Number.isInteger(i)||i<0||!finite3(p)||!Number.isFinite(w)||w<0)
      throw new Error('Invalid seam endpoint particle or weight')
    total+=w
    for(let d=0;d<3;d++)result[d]+=w*p[d]
  }
  if(Math.abs(total-1)>1e-5)throw new Error('Nonunit seam endpoint weights')
  return {indices:[...indices],weights:[...weights],position:result}
}

function collectPairs(payload){
  const pairs=new Map(UNDERARMS.map(id=>[id,[]]))
  for(const c of payload.constraints||[]){
    if(c.type!=='seam'||!pairs.has(c.seamId))continue
    const a=endpoint(payload,[c.a],[1]),b=endpoint(payload,[c.b],[1])
    pairs.get(c.seamId).push({a,b})
  }
  for(const c of payload.virtualSeams||[]){
    const id=c.seamId||c.id
    if(!pairs.has(id))continue
    const a=endpoint(payload,c.sourceIndices,c.sourceWeights)
    const b=endpoint(payload,c.targetIndices,c.targetWeights)
    pairs.get(id).push({a,b})
  }
  for(const [id,rows] of pairs){
    if(!rows.length||rows.length>128)throw new Error(`Missing or oversized underarm group: ${id}`)
  }
  return pairs
}

function hingeVelocity(payload,hinge){
  const panel=payload.pieces.find(p=>p.id===hinge.panelId)
  if(!panel||!UNDERARMS.includes(hinge.panelId==='sleeve-left'?
    UNDERARMS[0]:hinge.panelId==='sleeve-right'?UNDERARMS[1]:'')||
    hinge.worldAxisAligned!==true||!['positive','negative'].includes(hinge.side)||
    !Array.isArray(hinge.axisVertices)||hinge.axisVertices.length!==2||
    hinge.axisVertices.some(i=>!Number.isInteger(i)||i<0||i>=panel.particleIndices.length)||
    hinge.axisVertices[0]===hinge.axisVertices[1])
    throw new Error('Invalid executable sleeve hinge')
  const [i,j]=hinge.axisVertices,rest=panel.flatVerticesM
  if(!Array.isArray(rest)||rest.length!==panel.particleIndices.length||
     !rest.every(finite3))throw new Error('Invalid sleeve rest geometry')
  // Metadata claiming worldAxisAligned must not make an arbitrary line
  // executable: the axis must be a real interior edge of exactly two faces.
  let axisUses=0
  for(const face of panel.faces){
    if(!Array.isArray(face)||face.length!==3||
       face.some(k=>!Number.isInteger(k)||k<0||k>=rest.length))
      throw new Error('Invalid sleeve material face')
    for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]])
      if((a===i&&b===j)||(a===j&&b===i))axisUses++
  }
  if(axisUses!==2)throw new Error('Sleeve hinge axis is not an interior edge')
  const a=rest[i],b=rest[j],dx=b[0]-a[0],dy=b[1]-a[1],span=Math.hypot(dx,dy)
  if(span<1e-6)throw new Error('Degenerate hinge material axis')
  const signed=rest.map(p=>(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/span)
  for(const face of panel.faces){
    if(!Array.isArray(face)||face.length!==3||face.some(k=>!Number.isInteger(k)||k<0||k>=rest.length)||
       (face.some(k=>signed[k]>1e-8)&&face.some(k=>signed[k]<-1e-8)))
      throw new Error('Hinge cuts material triangle')
  }
  const origin=payload.particles[panel.particleIndices[i]]?.position
  const other=payload.particles[panel.particleIndices[j]]?.position
  if(!finite3(origin)||!finite3(other))throw new Error('Invalid hinge world axis')
  const axisVector=sub(other,origin),axisLength=length(axisVector)
  if(axisLength<1e-6)throw new Error('Degenerate hinge world axis')
  const axis=axisVector.map(v=>v/axisLength)
  const velocities=new Map()
  for(let k=0;k<signed.length;k++){
    const particleIndex=panel.particleIndices[k],p=payload.particles[particleIndex]?.position
    if(!finite3(p))throw new Error('Invalid hinge world vertex')
    if(Math.abs(signed[k])<=1e-8){
      if(length(cross(sub(p,origin),axis))>1e-6)
        throw new Error('Hinge line is not world collinear')
      continue
    }
    if((hinge.side==='positive'?signed[k]>1e-8:signed[k]<-1e-8)){
      if((payload.particles[particleIndex].invMass??1)===0)
        throw new Error('Hinge would move pinned particle')
      velocities.set(particleIndex,cross(axis,sub(p,origin)))
    }
  }
  if(!velocities.size)throw new Error('Hinge has no moving particles')
  return velocities
}

function velocity(endpoint,velocities){
  const v=[0,0,0]
  for(let k=0;k<endpoint.indices.length;k++){
    const contribution=velocities.get(endpoint.indices[k])
    if(!contribution)continue
    for(let d=0;d<3;d++)v[d]+=endpoint.weights[k]*contribution[d]
  }
  return v
}

export function inspectNativeUnderarmWorstPairJacobian(payload,{
  hinges,toleranceMm=1e-6,maxHinges=128,
}={}){
  if(!Array.isArray(payload?.pieces)||!Array.isArray(payload?.particles)||
     !Array.isArray(payload?.constraints)||!Array.isArray(hinges)||
     !hinges.length||hinges.length>maxHinges||!Number.isInteger(maxHinges)||
     maxHinges<1||maxHinges>128||!Number.isFinite(toleranceMm)||
     toleranceMm<0||toleranceMm>.1)
    throw new Error('Invalid bounded worst-pair Jacobian inputs')
  const snapshot=JSON.stringify(payload),pairs=collectPairs(payload)
  const axes=[],keys=new Set()
  for(const hinge of hinges){
    const key=`${hinge.panelId}:${hinge.axisVertices?.join(',')}:${hinge.side}`
    if(keys.has(key))throw new Error('Duplicate sleeve hinge')
    keys.add(key)
    axes.push({key,panelId:hinge.panelId,velocities:hingeVelocity(payload,hinge)})
  }
  const groups=[]
  for(const [id,rows] of pairs){
    const distances=rows.map(({a,b})=>length(sub(a.position,b.position))*1000)
    const maxGapMm=Math.max(...distances)
    const worstPairs=rows.flatMap(({a,b},index)=>{
      if(distances[index]<maxGapMm-toleranceMm)return []
      const diff=sub(a.position,b.position),gapM=length(diff)
      if(!Number.isFinite(gapM)||gapM<=0)
        throw new Error('Cannot differentiate zero or invalid worst seam gap')
      const unit=diff.map(v=>v/gapM)
      const sensitivities=axes.map(axis=>{
        const da=velocity(a,axis.velocities),db=velocity(b,axis.velocities)
        const signedDerivativeMmPerRad=dot(unit,sub(da,db))*1000
        return {axisKey:axis.key,panelId:axis.panelId,
          movesEndpointA:length(da)>1e-12,movesEndpointB:length(db)>1e-12,
          signedDerivativeMmPerRad,
          firstOrderLeverage:Math.abs(signedDerivativeMmPerRad)>1e-6}
      })
      return [{pairIndex:index,gapMm:distances[index],
        endpointA:[...a.indices],endpointB:[...b.indices],sensitivities}]
    })
    if(!worstPairs.length||worstPairs.some(p=>!Number.isFinite(p.gapMm)||p.gapMm<=0))
      throw new Error('Cannot differentiate zero or invalid worst seam gap')
    groups.push({id,pairCount:rows.length,maxGapMm,worstPairs,
      axesWithFirstOrderLeverage:axes.filter(axis=>worstPairs.some(pair=>
        pair.sensitivities.some(s=>s.axisKey===axis.key&&s.firstOrderLeverage))).length,
      axesMovingEveryWorstPair:axes.filter(axis=>worstPairs.every(pair=>
        pair.sensitivities.some(s=>s.axisKey===axis.key&&
          (s.movesEndpointA||s.movesEndpointB)))).length})
  }
  if(JSON.stringify(payload)!==snapshot)throw new Error('Worst-pair Jacobian mutated source')
  return {groups,evaluatedAxes:axes.length,sourceUnchanged:true,
    linearizedGeometryOnly:true,finiteAngleImprovementCertified:false,
    contactCertified:false,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false,safeToAutoApply:false}
}
