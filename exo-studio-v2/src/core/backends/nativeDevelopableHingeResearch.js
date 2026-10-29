// Experimental rest-mesh-aligned hinge rotation, NOT a production cloth solver.
// A candidate rotates one material-side of a panel around a shared mesh-edge
// line. When every face lies wholly on one side and the axis vertices are
// collinear in world space, the fold is an exact triangle-wise isometry:
// the material can bend without inventing in-plane fabric stretch.
//
// This does not solve inter-panel seams, contact, bending energy, or swept CCD.
// Search results must still pass the independent research candidate gate.
import {auditNativeSeamCandidate} from './nativeSeamCandidateGate.js'
import {inspectNativeSampledContactPath} from './nativeSampledContactPath.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const norm=p=>Math.hypot(...p)
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
const subtract=(a,b)=>a.map((x,i)=>x-b[i])
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]

// Discover *geometrically feasible* fold axes from existing internal mesh
// edges. A fold is legal only if its infinite rest-material line partitions
// the entire panel without cutting the interior of any triangle. Inspect
// world-axis collinearity and moving pins separately: remeshing can improve
// aspect ratios while destroying useful fold lines, and a valid rest fold
// may be impossible in the current 3D pose.
//
// This is bounded, read-only research metadata, not an optimizer or fit pass.
export function discoverNativeDevelopableHinges(reference,{
  maxResults=32,restToleranceM=1e-8,worldAxisToleranceM=1e-6,
}={}){
  if(!Array.isArray(reference?.pieces)||!Array.isArray(reference?.particles))
    throw new TypeError('Hinge discovery requires native pieces and particles')
  if(!Number.isInteger(maxResults)||maxResults<1||maxResults>128)
    throw new RangeError('Hinge discovery maxResults must be 1..128')
  if(!Number.isFinite(restToleranceM)||restToleranceM<0||restToleranceM>1e-3||
     !Number.isFinite(worldAxisToleranceM)||worldAxisToleranceM<0||worldAxisToleranceM>1e-3)
    throw new RangeError('Invalid hinge discovery tolerance')
  const candidates=[],panels=[]
  for(const panel of reference.pieces){
    const rest=panel.flatVerticesM
    const world=panel.particleIndices?.map(i=>reference.particles[i]?.position)
    if(!Array.isArray(rest)||!Array.isArray(world)||rest.length!==world.length||
      !rest.every(finite3)||!world.every(finite3))
      throw new Error('Hinge discovery requires valid rest and world vertices')
    const edges=new Map()
    for(const face of panel.faces){
      if(!Array.isArray(face)||face.length!==3||
        face.some(i=>!Number.isInteger(i)||i<0||i>=rest.length))
        throw new Error('Hinge discovery found invalid triangle indices')
      for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
        const [i,j]=a<b?[a,b]:[b,a],key=`${i},${j}`
        edges.set(key,{i,j,uses:(edges.get(key)?.uses||0)+1})
      }
    }
    const stats={panelId:panel.id,interiorEdges:0,restAlignedAxes:0,
      worldAlignedAxes:0,pinCompatibleHingeSides:0}
    for(const {i,j,uses} of edges.values()){
      if(uses!==2)continue // Boundary/non-manifold edges cannot be fold axes.
      stats.interiorEdges++
      const a=rest[i],b=rest[j]
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
      if(length<1e-6)continue
      const signed=rest.map(p=>(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/length)
      if(!signed.some(x=>x>restToleranceM)||!signed.some(x=>x< -restToleranceM))
        continue
      if(panel.faces.some(face=>
        face.some(k=>signed[k]>restToleranceM)&&
        face.some(k=>signed[k]< -restToleranceM)))continue
      stats.restAlignedAxes++
      const worldAxis=subtract(world[j],world[i]),worldLength=norm(worldAxis)
      const unit=worldLength>1e-6?worldAxis.map(x=>x/worldLength):null
      const worldAligned=Boolean(unit&&signed.every((value,k)=>
        Math.abs(value)>restToleranceM||
        norm(cross(subtract(world[k],world[i]),unit))<=worldAxisToleranceM))
      if(worldAligned)stats.worldAlignedAxes++
      for(const side of ['negative','positive']){
        const moving=panel.particleIndices.filter((index,k)=>
          side==='positive'?signed[k]>restToleranceM:signed[k]< -restToleranceM)
        if(!moving.length||moving.some(index=>
          (reference.particles[index].invMass??1)===0))continue
        stats.pinCompatibleHingeSides++
        candidates.push({panelId:panel.id,axisVertices:[i,j],side,
          movingVertexCount:moving.length,restMeshAligned:true,worldAxisAligned:worldAligned,
          sweptCollisionCertified:false,fitCertified:false,safeToAutoApply:false})
      }
    }
    panels.push(stats)
  }
  // Prefer axes currently executable without violating their hinge-line
  // geometry, then prefer folds with a useful number of moving vertices.
  candidates.sort((a,b)=>Number(b.worldAxisAligned)-Number(a.worldAxisAligned)||
    b.movingVertexCount-a.movingVertexCount||
    a.panelId.localeCompare(b.panelId)||
    a.axisVertices[0]-b.axisVertices[0]||
    a.axisVertices[1]-b.axisVertices[1]||
    a.side.localeCompare(b.side))
  return {panels,restAlignedAxes:panels.reduce((s,p)=>s+p.restAlignedAxes,0),
    worldAlignedAxes:panels.reduce((s,p)=>s+p.worldAlignedAxes,0),
    executableHingeSides:candidates.filter(x=>x.worldAxisAligned).length,
    returned:candidates.slice(0,maxResults),truncated:candidates.length>maxResults,
    safeToAutoApply:false,fitCertified:false,sweptCollisionCertified:false}
}

export function createNativeDevelopableHingeCandidate(reference,{
  panelId,axisVertices,angleRadians,side='negative',
  restToleranceM=1e-8,worldAxisToleranceM=1e-6,
}={}){
  if(!Array.isArray(reference?.pieces)||!Array.isArray(reference?.particles))
    throw new TypeError('Native hinge requires pieces and particles')
  const panel=reference.pieces.find(p=>p.id===panelId)
  if(!panel)throw new Error('Hinge panel does not exist')
  if(!Array.isArray(axisVertices)||axisVertices.length!==2||
     axisVertices[0]===axisVertices[1]||
     axisVertices.some(i=>!Number.isInteger(i)||i<0||i>=panel.particleIndices.length))
    throw new RangeError('Hinge requires two distinct panel-local vertices')
  if(!Number.isFinite(angleRadians)||Math.abs(angleRadians)>Math.PI)
    throw new RangeError('Hinge angle must be finite and bounded by pi')
  if(!['positive','negative'].includes(side))throw new RangeError('Invalid hinge side')
  if(!Number.isFinite(restToleranceM)||restToleranceM<0||restToleranceM>1e-3||
     !Number.isFinite(worldAxisToleranceM)||worldAxisToleranceM<0||worldAxisToleranceM>1e-3)
    throw new RangeError('Invalid hinge axis tolerance')
  const material=panel.flatVerticesM
  if(!Array.isArray(material)||material.length!==panel.particleIndices.length||
     !material.every(finite3))
    throw new Error('Hinge requires valid rest coordinates')
  const [i,j]=axisVertices
  const [a,b]=[material[i],material[j]]
  const materialAxis=[b[0]-a[0],b[1]-a[1]]
  const restAxisLength=Math.hypot(...materialAxis)
  if(restAxisLength<1e-6)throw new Error('Degenerate rest hinge axis')
  const signed=material.map(p=>
    (materialAxis[0]*(p[1]-a[1])-materialAxis[1]*(p[0]-a[0]))/restAxisLength)
  // If the fold cuts through any face interior, rotating one side would
  // stretch that face. Reject instead of quietly distorting the cloth.
  for(const face of panel.faces){
    if(!Array.isArray(face)||face.length!==3||
       face.some(k=>!Number.isInteger(k)||k<0||k>=material.length))
      throw new Error('Invalid triangle in hinge material mesh')
    const signs=face.map(k=>signed[k])
    if(signs.some(x=>x>restToleranceM)&&signs.some(x=>x< -restToleranceM))
      throw new Error('Hinge cuts through a triangle; remesh on the material fold line')
  }
  const world=panel.particleIndices.map(k=>reference.particles[k]?.position)
  if(!world.every(finite3))throw new Error('Nonfinite hinge world positions')
  const worldA=world[i],worldB=world[j]
  const axisVector=subtract(worldB,worldA),axisLength=norm(axisVector)
  if(axisLength<1e-6)throw new Error('Degenerate world hinge axis')
  const axis=axisVector.map(x=>x/axisLength)
  for(let k=0;k<signed.length;k++){
    if(Math.abs(signed[k])>restToleranceM)continue
    const offset=subtract(world[k],worldA)
    if(norm(cross(offset,axis))>worldAxisToleranceM)
      throw new Error('Material hinge vertex is not on the world hinge axis')
  }
  const moving=panel.particleIndices.filter((index,k)=>
    side==='positive'?signed[k]>restToleranceM:signed[k]< -restToleranceM)
  if(!moving.length)throw new Error('No material vertices on requested hinge side')
  for(const index of moving)
    if((reference.particles[index].invMass??1)===0)
      throw new Error('Hinge would move a pinned vertex')
  const candidate=structuredClone(reference)
  const cosine=Math.cos(angleRadians),sine=Math.sin(angleRadians)
  for(const index of moving){
    const point=reference.particles[index].position
    const offset=subtract(point,worldA)
    const spin=cross(axis,offset),projection=dot(axis,offset)
    candidate.particles[index].position=worldA.map((origin,k)=>
      origin+offset[k]*cosine+spin[k]*sine+axis[k]*projection*(1-cosine))
  }
  return {candidate,hinge:{
    panelId,axisVertices:[...axisVertices],angleRadians,side,
    movedVertexCount:moving.length,restMeshAligned:true,
    sweptCollisionCertified:false,fitCertified:false,safeToAutoApply:false,
  }}
}

// A hinge does NOT travel along the straight segment between its endpoint
// poses. The moving fabric vertices follow circular arcs. The generic
// sampled-path screen checks the straight chord; use this second independent
// screen to reject avatar contacts that occur only on the actual hinge arc.
// Both are discrete samples, not swept CCD or a guarantee of collision-free
// contact between samples. Source, candidate and saved garments are untouched.
export function inspectNativeHingeArcContactPath(reference,{
  panelId,axisVertices,angleRadians,side='negative',
  steps=8,checkPose,
}={}){
  if(!Number.isInteger(steps)||steps<2||steps>16)
    throw new RangeError('Hinge arc contact path requires 2..16 subdivisions')
  if(typeof checkPose!=='function')
    throw new TypeError('Hinge arc contact path requires a pose contact screen')
  const expectedSamples=reference?.pieces?.reduce((sum,piece)=>
    sum+piece.particleIndices.length+piece.faces.length,0)
  if(!Number.isInteger(expectedSamples)||expectedSamples<1)
    throw new Error('Hinge arc requires valid panel contact sampling coverage')
  let checked=0,penetrating=0,maximumIntrusionMm=0,worstFraction=null
  const samples=[]
  for(let index=1;index<steps;index++){
    const fraction=index/steps
    const {candidate}=createNativeDevelopableHingeCandidate(reference,{
      panelId,axisVertices,side,angleRadians:angleRadians*fraction})
    const result=checkPose(candidate)
    if(!result||result.sampledAvatarClearanceOnly!==true||
      !Number.isInteger(result.checked)||result.checked!==expectedSamples||
      !Number.isInteger(result.penetrating)||result.penetrating<0||
      result.penetrating>result.checked||
      !Number.isFinite(result.maximumIntrusionMm)||result.maximumIntrusionMm<0)
      throw new Error('Invalid sampled hinge arc avatar contact screen')
    checked+=result.checked
    penetrating+=result.penetrating
    if(result.maximumIntrusionMm>maximumIntrusionMm){
      maximumIntrusionMm=result.maximumIntrusionMm
      worstFraction=fraction
    }
    samples.push({fraction,checked:result.checked,penetrating:result.penetrating,
      maximumIntrusionMm:result.maximumIntrusionMm})
  }
  return {checked,penetrating,maximumIntrusionMm,worstFraction,
    intermediateSamples:steps-1,subdivisions:steps,samples,
    trajectoryType:'rigid-developable-hinge-arc',
    sampledIntermediateClearanceOnly:true,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false}
}

function combineSampledHingeContactScreens(chord,arc){
  return {checked:chord.checked+arc.checked,
    penetrating:chord.penetrating+arc.penetrating,
    maximumIntrusionMm:Math.max(chord.maximumIntrusionMm,arc.maximumIntrusionMm),
    intermediateSamples:chord.intermediateSamples+arc.intermediateSamples,
    samples:[...chord.samples.map(sample=>({...sample,trajectoryType:'linear-chord'})),
      ...arc.samples.map(sample=>({...sample,trajectoryType:'rigid-developable-hinge-arc'}))],
    trajectories:['linear-chord','rigid-developable-hinge-arc'],
    sampledIntermediateClearanceOnly:true,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false}
}

// A small deterministic line search: no solver writes, no network, no saved
// garment changes. Every trial must pass independently recomputed seam,
// material, pin, rest-mesh and discrete endpoint/path contact screens.
export function searchNativeDevelopableHingeCandidates(reference,{
  anglesRadians,panelId,axisVertices,side='negative',
  checkPose,steps=8,strainLimitPercent=5,
}={}){
  if(!Array.isArray(anglesRadians)||anglesRadians.length<1||anglesRadians.length>12)
    throw new RangeError('Hinge search requires 1..12 bounded trial angles')
  if(typeof checkPose!=='function')throw new TypeError('Hinge search requires contact evaluator')
  const trials=[]
  let best=null
  for(const angleRadians of anglesRadians){
    const {candidate,hinge}=createNativeDevelopableHingeCandidate(reference,{
      panelId,axisVertices,side,angleRadians})
    const endpointContact=checkPose(candidate)
    const sampledPathContact=inspectNativeSampledContactPath(reference,candidate,{
      steps,checkPose})
    const hingeArcContact=inspectNativeHingeArcContactPath(reference,{
      panelId,axisVertices,angleRadians,side,steps,checkPose})
    const combinedPathContact=combineSampledHingeContactScreens(
      sampledPathContact,hingeArcContact)
    const gate=auditNativeSeamCandidate(reference,candidate,{
      strainLimitPercent,endpointContact,sampledPathContact:combinedPathContact})
    trials.push({
      angleRadians,maximumSeamGapMm:gate.after.maxGapMm,
      rmsSeamGapMm:gate.after.rmsGapMm,
      maximumPrincipalExtensionPercent:gate.strain.maximumPrincipalExtensionPercent,
      maximumPrincipalCompressionPercent:gate.strain.maximumPrincipalCompressionPercent,
      endpointPenetrations:endpointContact.penetrating,
      sampledPathPenetrations:combinedPathContact.penetrating,
      chordPathPenetrations:sampledPathContact.penetrating,
      hingeArcPenetrations:hingeArcContact.penetrating,
      checkedIntermediateSamples:combinedPathContact.checked,
      researchScreenPassed:gate.researchScreenPassed,
      safeToAutoApply:false,
    })
    if(gate.researchScreenPassed&&(!best||
      gate.after.maxGapMm<best.gate.after.maxGapMm-1e-9||
      (Math.abs(gate.after.maxGapMm-best.gate.after.maxGapMm)<=1e-9&&
        gate.after.rmsGapMm<best.gate.after.rmsGapMm))){
      best={candidate,gate,hinge}
    }
  }
  return {best,trials,acceptedCount:trials.filter(x=>x.researchScreenPassed).length,
    sweptCollisionCertified:false,avatarEntryCertified:false,
    safeToAutoApply:false,fitCertified:false}
}
