// Research-only crease-conforming sleeve kinematics. This builds a detached,
// strain-free reference from authored material coordinates, then rotates one
// side about a material crease. It is NOT a solver step, saved garment pose,
// calibrated fabric law, deformable CCD, or safe avatar-entry trajectory.
import {auditDetachedSleeveConstraintInventoryResearch20261025} from './nativeSleeveRemeshConstraintInventoryResearch20261025.js'
import {researchFoundationTeeSleeveQualityContact20261025} from './nativeSleeveCreaseQualityContactResearch20261025.js'
import {inspectNativeUnderarmCenterCrease} from './nativeUnderarmCenterCreaseResearch.js'
import {measureNativeSeamResiduals,compareNativeSeamGroups} from './nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'
import {screenNativeCoupledHingeTranslationInterval20261025} from './nativeCoupledHingeTranslationIntervalResearch20261025.js'

const sub=(a,b)=>a.map((x,i)=>x-b[i])
const add=(a,b)=>a.map((x,i)=>x+b[i])
const mul=(a,k)=>a.map(x=>x*k)
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm=a=>Math.hypot(...a)
const unit=a=>{const n=norm(a);if(!Number.isFinite(n)||n<1e-8)
  throw new Error('Degenerate source sleeve crease frame');return mul(a,1/n)}
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(x=>
  typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1)

export function studyFoundationTeeDevelopableSleeveHingeResearch20261025(
  source,panelId,mesh,{angleRadians=0.35,translationM=[0,0,0],
    clearanceM=.001,maxFacePairs=500000}={}){
  if(panelId!=='sleeve-left'&&panelId!=='sleeve-right')
    throw new Error('Only Foundation Tee sleeve crease candidates supported')
  if(!Number.isFinite(angleRadians)||Math.abs(angleRadians)>Math.PI/2||
     !finite3(translationM)||norm(translationM)>.15||
     !Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.01||
     !Number.isInteger(maxFacePairs)||maxFacePairs<1||maxFacePairs>500000)
    throw new RangeError('Invalid bounded sleeve hinge motion parameters')
  if(!Array.isArray(source?.pieces)||source.pieces.length!==4||
     !Array.isArray(source.particles)||source.particles.length>1024)
    throw new Error('Expected actual four-panel Foundation Tee source')
  const sourceSnapshot=JSON.stringify(source),meshSnapshot=JSON.stringify(mesh)
  const inventory=auditDetachedSleeveConstraintInventoryResearch20261025(source,panelId,mesh)
  if(inventory.creaseHingeCount!==20||inventory.sourceSewingConstraints!==41||
     inventory.sourceSewingEndpointReferences!==46)
    throw new Error('Incomplete crease and original sewing inventory')
  const crease=inspectNativeUnderarmCenterCrease(source).panels.find(p=>p.panelId===panelId)
  if(!crease)throw new Error('Missing authored sleeve crease')
  const original=source.pieces.find(p=>p.id===panelId)
  if(!original||original.particleIndices.length!==mesh.originalVertexCount||
     mesh.flatVerticesM.length!==mesh.worldVerticesM.length||
     mesh.flatVerticesM.length!==inventory.vertexCount)
    throw new Error('Incompatible detached sleeve provenance')
  const originalIds=new Set(original.particleIndices)
  if((source.anchors||[]).some(a=>originalIds.has(a.particle)))
    throw new Error('Sleeve pin/soft anchor is unsupported by detached hinge motion')
  const origin=crease.creaseOriginM,direction=crease.creaseDirection
  const material=mesh.flatVerticesM.map(p=>{
    const v=[p[0]-origin[0],p[1]-origin[1]]
    return {s:v[0]*direction[0]+v[1]*direction[1],
      t:direction[0]*v[1]-direction[1]*v[0]}
  })
  const onCrease=material.flatMap((p,i)=>Math.abs(p.t)<=1e-8?[i]:[])
  const originalOnCrease=onCrease.filter(i=>i<mesh.originalVertexCount)
  if(originalOnCrease.length<2||onCrease.length<3)
    throw new Error('Incomplete material crease axis')
  const sorted=[...originalOnCrease].sort((a,b)=>material[a].s-material[b].s)
  const a=sorted[0],b=sorted.at(-1)
  if(material[b].s-material[a].s<.02)
    throw new Error('Insufficient material crease span')
  const axis=unit(sub(mesh.worldVerticesM[b],mesh.worldVerticesM[a]))
  // Least-squares rigid-frame translation. The original crease is not
  // straight in world space: do not pretend it is already a valid hinge.
  const axisOrigin=mul(originalOnCrease.reduce((sum,i)=>
    add(sum,sub(mesh.worldVerticesM[i],mul(axis,material[i].s))),[0,0,0]),
    1/originalOnCrease.length)
  let transverseFit=[0,0,0]
  for(let i=0;i<mesh.originalVertexCount;i++){
    const p=material[i]
    const residual=sub(mesh.worldVerticesM[i],add(axisOrigin,mul(axis,p.s)))
    transverseFit=add(transverseFit,mul(residual,p.t))
  }
  transverseFit=sub(transverseFit,mul(axis,dot(axis,transverseFit)))
  const transverse=unit(transverseFit),normal=unit(cross(axis,transverse))
  const creaseResidualMm=Math.max(...onCrease.map(i=>{
    const v=sub(mesh.worldVerticesM[i],axisOrigin)
    return norm(sub(v,mul(axis,dot(axis,v))))*1000
  }))
  const moving=material.flatMap((p,i)=>p.t>1e-8?[i]:[])
  if(moving.length===0||material.every(p=>p.t>=-1e-8))
    throw new Error('Crease does not separate two sleeve material regions')
  const originalSeams=measureNativeSeamResiduals(source)
  if(originalSeams.pairCount!==102||originalSeams.groups.length!==14)
    throw new Error('Incomplete four-panel sewing correspondences')

  function pose(fraction){
    const angle=angleRadians*fraction
    const candidate=structuredClone(source)
    const piece=candidate.pieces.find(p=>p.id===panelId)
    piece.faces=mesh.faces.map(f=>[...f])
    piece.flatVerticesM=mesh.flatVerticesM.map(p=>[...p])
    const positions=material.map(({s,t})=>{
      const c=t>1e-8?Math.cos(angle):1,si=t>1e-8?Math.sin(angle):0
      return add(add(add(axisOrigin,mul(axis,s)),
        mul(transverse,t*c)),add(mul(normal,t*si),mul(translationM,fraction)))
    })
    for(let i=0;i<positions.length;i++){
      if(i<mesh.originalVertexCount){
        const particle=candidate.particles[piece.particleIndices[i]]
        particle.position=[...positions[i]];particle.previous=[...positions[i]]
      }else{
        const index=candidate.particles.length
        piece.particleIndices.push(index)
        candidate.particles.push({id:`research-${panelId}-${i}`,pieceId:panelId,
          position:[...positions[i]],previous:[...positions[i]],invMass:1})
      }
    }
    return candidate
  }
  const base=pose(0),terminal=pose(1)
  const baseSeams=measureNativeSeamResiduals(base)
  const terminalSeams=measureNativeSeamResiduals(terminal)
  const seamGroups=compareNativeSeamGroups(originalSeams,terminalSeams)
  const metrics=payload=>{
    const sleeve=payload.pieces.find(p=>p.id===panelId)
    const strain=auditNativePrincipalStrain({particles:payload.particles,pieces:[sleeve]})
    const fullStrain=auditNativePrincipalStrain(payload)
    const sleeveContact=inspectNativeIntrapanelStaticContact({
      particles:payload.particles,pieces:[sleeve]},
    {clearanceM,maxPairs:maxFacePairs})
    const intra=inspectNativeIntrapanelStaticContact(payload,{clearanceM,maxPairs:maxFacePairs})
    const inter=inspectNativeInterpanelExactStaticContact(payload,{clearanceM,
      maxPairs:maxFacePairs,maxNarrowphasePairs:maxFacePairs})
    return {maxGapMm:measureNativeSeamResiduals(payload).maxGapMm,
      rmsGapMm:measureNativeSeamResiduals(payload).rmsGapMm,
      sleevePrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
      sleevePrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
      sleeveStrainValid:strain.withinDeclaredStrainLimit,
      sleeveIntrapanelIntersections:sleeveContact.intersectingTrianglePairs,
      sleeveIntrapanelNearFoldovers:sleeveContact.edgeNeighborNearFoldoverPairs,
      sleeveIntrapanelNearClearancePairs:sleeveContact.nonadjacentNearClearancePairs,
      fullPrincipalExtensionPercent:fullStrain.maximumPrincipalExtensionPercent,
      fullPrincipalCompressionPercent:fullStrain.maximumPrincipalCompressionPercent,
      fullStrainValid:fullStrain.withinDeclaredStrainLimit,
      intrapanelIntersections:intra.intersectingTrianglePairs,
      intrapanelNearFoldovers:intra.edgeNeighborNearFoldoverPairs,
      intrapanelNearClearancePairs:intra.nonadjacentNearClearancePairs,
      interpanelNearClearancePairs:inter.nearClearancePairs,
      staticContactValid:intra.staticDisjointThicknessScreenClear&&
        inter.staticInterpanelExactClear}
  }
  const samples=[0,.5,1].map(fraction=>({fraction,...metrics(
    fraction===0?base:fraction===1?terminal:pose(fraction))}))
  const motions=Object.fromEntries(base.pieces.map(p=>[p.id,{
    translationM:p.id===panelId?[...translationM]:[0,0,0]}]))
  motions[panelId].hinge={axisOriginM:[...axisOrigin],axisUnit:[...axis],
    movingVertices:moving,startRadians:0,endRadians:angleRadians}
  const interval=screenNativeCoupledHingeTranslationInterval20261025(base,motions,
    {clearanceM,maxFacePairs,maxDistanceEvaluations:100000,maxDepth:8})
  // Screen the moving sleeve against each other panel separately as well:
  // pre-existing collisions between two stationary panels must not conceal
  // the first collision witness involving the actual proposed hinge motion.
  const activePanelIntervals=base.pieces.filter(p=>p.id!==panelId).map(other=>{
    const selected=[base.pieces.find(p=>p.id===panelId),other]
    const compact={pieces:[],particles:[]}
    for(const piece of selected){
      const indices=[]
      for(const old of piece.particleIndices){
        indices.push(compact.particles.length)
        compact.particles.push(structuredClone(base.particles[old]))
      }
      compact.pieces.push({...piece,particleIndices:indices})
    }
    const pairMotions=Object.fromEntries(selected.map(p=>[p.id,motions[p.id]]))
    const screen=screenNativeCoupledHingeTranslationInterval20261025(
      compact,pairMotions,{clearanceM,maxFacePairs,
        maxDistanceEvaluations:100000,maxDepth:8})
    return {otherPanelId:other.id,...screen}
  })
  if(JSON.stringify(source)!==sourceSnapshot||JSON.stringify(mesh)!==meshSnapshot)
    throw new Error('Developable hinge study mutated source state')
  const seamNonworse=terminalSeams.maxGapMm<=originalSeams.maxGapMm+1e-6&&
    terminalSeams.rmsGapMm<=originalSeams.rmsGapMm+1e-6
  const seamStrictImprovement=terminalSeams.maxGapMm<originalSeams.maxGapMm-1e-6||
    terminalSeams.rmsGapMm<originalSeams.rmsGapMm-1e-6
  return {panelId,angleRadians,translationM:[...translationM],
    originalCreaseLineResidualMm:creaseResidualMm,
    materialCreaseVertexCount:onCrease.length,movingVertexCount:moving.length,
    regeneratedVertexCount:mesh.flatVerticesM.length,
    regeneratedFaceCount:mesh.faces.length,creaseHingeCount:inventory.creaseHingeCount,
    sewingPairCount:originalSeams.pairCount,seamGroupCount:originalSeams.groups.length,
    originalSeams:{maxGapMm:originalSeams.maxGapMm,rmsGapMm:originalSeams.rmsGapMm},
    planarSeams:{maxGapMm:baseSeams.maxGapMm,rmsGapMm:baseSeams.rmsGapMm},
    foldedSeams:{maxGapMm:terminalSeams.maxGapMm,rmsGapMm:terminalSeams.rmsGapMm},
    seamNonworse,seamStrictImprovement,
    seamGroupRegressions:seamGroups.regressions,
    samples,interval,activePanelIntervals,
    restMeshApproved:mesh.afterQuality.illConditionedFaces===0,
    limitedResearchGatePass:seamNonworse&&seamStrictImprovement&&
      seamGroups.allGroupsNonworse&&
      samples.every(p=>p.sleeveStrainValid&&p.fullStrainValid&&
        p.staticContactValid)&&
      mesh.afterQuality.illConditionedFaces===0&&interval.coupledInterpanelIntervalClear&&
      activePanelIntervals.every(x=>x.coupledInterpanelIntervalClear),
    // Expose detached copies for independent geometric QA, NEVER solver handoff.
    basePayload:base,foldedPayload:terminal,motion:motions[panelId],
    sourceNonmutationVerified:true,solverConstraintsRebuilt:false,
    materialCalibrated:false,avatarContactChecked:false,
    continuousSamePanelContactCertified:false,continuousDeformableCCDCertified:false,
    physicalAcceptance:false,safeToAutoApply:false}
}

export function researchFoundationTeeDevelopableSleeveHinge20261025(source,panelId,options){
  const mesh=researchFoundationTeeSleeveQualityContact20261025(source,panelId)
  return studyFoundationTeeDevelopableSleeveHingeResearch20261025(source,panelId,mesh,options)
}
