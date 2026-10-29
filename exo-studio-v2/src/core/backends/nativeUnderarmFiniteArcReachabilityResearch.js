// Research-only EXACT one-hinge, full-angle kinematic reachability of the
// intra-panel sleeve-underarm seams. This is an optimistic bound: it ignores
// fabric contact, bending energy, simultaneous hinge coupling and swept CCD.
// It NEVER proposes an accepted garment or changes the reference payload.
import {createNativeDevelopableHingeCandidate} from './nativeDevelopableHingeResearch.js'

const TARGETS=new Map([
  ['sleeve-left','seam-sleeve-l-underarm'],
  ['sleeve-right','seam-sleeve-r-underarm'],
])
const sub=(a,b)=>a.map((x,i)=>x-b[i])
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm=v=>Math.hypot(...v)
const finite3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)

function endpoint(payload,indices,weights){
  if(!Array.isArray(indices)||!Array.isArray(weights)||indices.length<1||
     indices.length>3||indices.length!==weights.length)
    throw new Error('Invalid finite-arc endpoint')
  let total=0
  const points=[]
  for(let k=0;k<indices.length;k++){
    const index=indices[k],weight=weights[k]
    if(!Number.isInteger(index)||index<0||!finite3(payload.particles[index]?.position)||
       !Number.isFinite(weight)||weight<0)
      throw new Error('Invalid finite-arc endpoint index or weight')
    total+=weight
    points.push({index,weight,position:payload.particles[index].position})
  }
  if(Math.abs(total-1)>1e-5)throw new Error('Nonunit finite-arc weights')
  return points
}
function collect(payload){
  const groups=new Map([...TARGETS.values()].map(id=>[id,[]]))
  for(const c of payload.constraints){
    if(c.type==='seam'&&groups.has(c.seamId))
      groups.get(c.seamId).push([endpoint(payload,[c.a],[1]),endpoint(payload,[c.b],[1])])
  }
  for(const c of payload.virtualSeams||[]){
    const id=c.seamId||c.id
    if(groups.has(id))groups.get(id).push([
      endpoint(payload,c.sourceIndices,c.sourceWeights),
      endpoint(payload,c.targetIndices,c.targetWeights)])
  }
  if([...groups.values()].some(rows=>!rows.length||rows.length>128))
    throw new Error('Missing or oversized finite-arc underarm group')
  return groups
}
function hingeGeometry(payload,hinge){
  if(!TARGETS.has(hinge?.panelId)||hinge.worldAxisAligned!==true)
    throw new Error('Finite-arc requires executable sleeve hinge')
  const piece=payload.pieces.find(p=>p.id===hinge.panelId)
  if(!piece||!Array.isArray(hinge.axisVertices)||hinge.axisVertices.length!==2)
    throw new Error('Invalid finite-arc hinge axis')
  const [i,j]=hinge.axisVertices
  // The general candidate constructor allows a boundary-aligned material
  // line. A one-hinge fold needs an ACTUAL interior edge shared by two faces.
  // Otherwise a boundary pivot can masquerade as an articulated fold.
  let edgeUses=0
  for(const face of piece.faces||[]){
    if(!Array.isArray(face)||face.length!==3)
      throw new Error('Invalid finite-arc material triangle')
    for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]])
      if((a===i&&b===j)||(a===j&&b===i))edgeUses++
  }
  if(edgeUses!==2)throw new Error('Finite-arc hinge axis is not an interior edge')
  // The shared hinge constructor verifies axis collinearity, face partition,
  // pins, finite world coordinates and material topology, not just metadata.
  createNativeDevelopableHingeCandidate(payload,{...hinge,angleRadians:0})
  const rest=piece.flatVerticesM
  const a=rest[i],b=rest[j],dx=b[0]-a[0],dy=b[1]-a[1]
  const span=Math.hypot(dx,dy)
  const moving=new Set(piece.particleIndices.filter((index,k)=>{
    const signed=(dx*(rest[k][1]-a[1])-dy*(rest[k][0]-a[0]))/span
    return hinge.side==='positive'?signed>1e-8:signed< -1e-8
  }))
  const origin=payload.particles[piece.particleIndices[i]].position
  const direction=sub(payload.particles[piece.particleIndices[j]].position,origin)
  const length=norm(direction),axis=direction.map(x=>x/length)
  return {moving,origin,axis}
}
function coefficients(pair,geometry){
  const {moving,origin,axis}=geometry
  const initial=[0,0,0],radial=[0,0,0]
  for(const [sign,points] of [[1,pair[0]],[-1,pair[1]]]){
    for(const {index,weight,position} of points){
      for(let k=0;k<3;k++)initial[k]+=sign*weight*position[k]
      if(!moving.has(index))continue
      const offset=sub(position,origin),axial=dot(offset,axis)
      for(let k=0;k<3;k++)
        radial[k]+=sign*weight*(offset[k]-axial*axis[k])
    }
  }
  const constant=sub(initial,radial),spin=cross(axis,radial)
  const r=norm(radial),parallel=dot(constant,axis)
  const perpendicular=Math.sqrt(Math.max(0,dot(constant,constant)-parallel**2))
  const minimumM=Math.hypot(parallel,perpendicular-r)
  const optimalAngleRadians=r>1e-12&&perpendicular>1e-12?
    Math.atan2(-dot(constant,spin),-dot(constant,radial)):0
  function at(angle){
    const c=Math.cos(angle),s=Math.sin(angle)
    return norm(constant.map((v,k)=>v+c*radial[k]+s*spin[k]))*1000
  }
  return {initialGapMm:norm(initial)*1000,
    minimumGapMm:minimumM*1000,optimalAngleRadians,at}
}

export function inspectNativeUnderarmFiniteArcReachability(payload,{
  hinges,maxHinges=128,minImprovementMm=.01,
}={}){
  if(!Array.isArray(payload?.pieces)||!Array.isArray(payload?.particles)||
     !Array.isArray(payload?.constraints)||
     (payload.virtualSeams!==undefined&&!Array.isArray(payload.virtualSeams))||
     !Number.isInteger(maxHinges)||maxHinges<1||maxHinges>128||
     !Number.isFinite(minImprovementMm)||minImprovementMm<1e-4||
     minImprovementMm>1||
     !Array.isArray(hinges)||!hinges.length||hinges.length>maxHinges)
    throw new Error('Invalid bounded finite-arc inputs')
  const frozen=JSON.stringify(payload),groups=collect(payload),keys=new Set()
  const axes=[]
  for(const hinge of hinges){
    const key=`${hinge.panelId}:${hinge.axisVertices?.join(',')}:${hinge.side}`
    if(keys.has(key))throw new Error('Duplicate finite-arc hinge')
    keys.add(key)
    const geometry=hingeGeometry(payload,hinge)
    const id=TARGETS.get(hinge.panelId)
    const curves=groups.get(id).map(pair=>coefficients(pair,geometry))
    const worst=Math.max(...curves.map(c=>c.initialGapMm))
    const worstIndices=curves.flatMap((c,i)=>c.initialGapMm>=worst-1e-6?[i]:[])
    const optimisticWorstFloorMm=Math.max(...worstIndices.map(i=>curves[i].minimumGapMm))
    const candidateAngles=[...new Set(worstIndices.map(i=>curves[i].optimalAngleRadians))]
    const sampled=candidateAngles.map(angle=>({
      angleRadians:angle,
      groupMaxGapMm:Math.max(...curves.map(c=>c.at(angle))),
      groupRmsGapMm:Math.hypot(...curves.map(c=>c.at(angle)))/Math.sqrt(curves.length),
    }))
    const best=sampled.sort((a,b)=>a.groupMaxGapMm-b.groupMaxGapMm||
      a.groupRmsGapMm-b.groupRmsGapMm)[0]
    axes.push({key,panelId:hinge.panelId,groupId:id,pairCount:curves.length,
      initialGroupMaxGapMm:worst,
      optimisticWorstPairFloorMm:optimisticWorstFloorMm,
      optimisticGroupMaxFloorMm:Math.max(...curves.map(c=>c.minimumGapMm)),
      optimisticGroupRmsFloorMm:Math.hypot(...curves.map(c=>c.minimumGapMm))/
        Math.sqrt(curves.length),
      potentialWorstPairImprovementMm:Math.max(0,worst-optimisticWorstFloorMm),
      canReduceAllWorstPairs:worst-optimisticWorstFloorMm>minImprovementMm,
      bestWorstPairAngle:best,
      worstPairs:worstIndices.map(i=>({
        pairIndex:i,initialGapMm:curves[i].initialGapMm,
        minimumGapMm:curves[i].minimumGapMm,
        optimalAngleRadians:curves[i].optimalAngleRadians,
      }))})
  }
  if(JSON.stringify(payload)!==frozen)
    throw new Error('Finite-arc reachability mutated source')
  return {axes,evaluatedAxes:axes.length,minImprovementMm,
    axesWithWorstPairReachability:axes.filter(a=>a.canReduceAllWorstPairs).length,
    sourceUnchanged:true,oneHingeFullAngleKinematicsOnly:true,
    simultaneousMultiHingeFeasibilityCertified:false,
    strainCertified:false,contactCertified:false,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false,safeToAutoApply:false}
}
