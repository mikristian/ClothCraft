// Research-only bounded rigid seam-merit step AFTER a developable sleeve fold.
// This does not solve coupled bending, repair rest slivers, or certify CCD.
// A sewing improvement is diagnostic only; contact/strain veto promotion.
import {measureNativeSeamResiduals,compareNativeSeamMerit,
  compareNativeSeamGroups} from './nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'
import {screenNativeCoupledHingeTranslationInterval20261025} from
  './nativeCoupledHingeTranslationIntervalResearch20261025.js'

const finite3=v=>Array.isArray(v)&&v.length===3&&v.every(x=>
  typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<100)
const norm=v=>Math.hypot(...v)
const subtract=(a,b)=>a.map((x,i)=>x-b[i])
const weighted=(payload,indices,weights)=>{
  if(!Array.isArray(indices)||!Array.isArray(weights)||!indices.length||
     indices.length!==weights.length)throw new Error('Invalid weighted sewing correspondence')
  const point=[0,0,0];let sum=0,coefficient=0
  for(let i=0;i<indices.length;i++){
    const index=indices[i],weight=weights[i],particle=payload.particles[index]
    if(!Number.isInteger(index)||!particle||!finite3(particle.position)||
       !Number.isFinite(weight)||weight<0)
      throw new Error('Invalid weighted sewing endpoint')
    sum+=weight
    for(let k=0;k<3;k++)point[k]+=particle.position[k]*weight
  }
  if(Math.abs(sum-1)>1e-5)throw new Error('Invalid sewing weight sum')
  return point
}

export function researchFoldedSleeveSeamMerit20261025(source,folded,panelId,{
  maxTranslationM=.15,clearanceM=.001,maxFacePairs=500000}={}){
  if(!['sleeve-left','sleeve-right'].includes(panelId))
    throw new Error('Expected Foundation Tee sleeve')
  if(!Number.isFinite(maxTranslationM)||maxTranslationM<=0||
     maxTranslationM>.15||!Number.isFinite(clearanceM)||
     clearanceM<=0||clearanceM>.01||!Number.isInteger(maxFacePairs)||
     maxFacePairs<1||maxFacePairs>500000)
    throw new RangeError('Invalid bounded seam-merit parameters')
  if(!Array.isArray(source?.pieces)||source.pieces.length!==4||
     !Array.isArray(folded?.pieces)||folded.pieces.length!==4||
     !Array.isArray(source.particles)||!Array.isArray(folded.particles)||
     folded.particles.length>1024||!Array.isArray(folded.constraints)||
     JSON.stringify(source.constraints)!==JSON.stringify(folded.constraints)||
     JSON.stringify(source.virtualSeams||[])!==JSON.stringify(folded.virtualSeams||[])||
     JSON.stringify(source.anchors||[])!==JSON.stringify(folded.anchors||[]))
    throw new Error('Invalid detached folded sewing source')
  const originalPiece=source.pieces.find(p=>p.id===panelId)
  const foldedPiece=folded.pieces.find(p=>p.id===panelId)
  if(!originalPiece||!foldedPiece||
     originalPiece.particleIndices.length!==95||
     originalPiece.faces?.length!==144||
     foldedPiece.particleIndices.length!==112||
     foldedPiece.flatVerticesM?.length!==112||
     foldedPiece.faces?.length!==178||
     JSON.stringify(foldedPiece.particleIndices.slice(0,
       originalPiece.particleIndices.length))!==JSON.stringify(originalPiece.particleIndices))
    throw new Error('Invalid detached folded sleeve provenance')
  for(let i=0;i<originalPiece.particleIndices.length;i++)
    if(JSON.stringify(foldedPiece.flatVerticesM[i])!==
       JSON.stringify(originalPiece.flatVerticesM[i]))
      throw new Error('Folded sleeve changed authored material provenance')
  if(new Set(foldedPiece.particleIndices).size!==112||
     foldedPiece.particleIndices.some(index=>
       !Number.isInteger(index)||index<0||index>=folded.particles.length))
    throw new Error('Invalid detached sleeve particle mapping')
  // Do not accept inverted or malformed material faces merely because their
  // (unsigned) 3D edge lengths happen to match the flattened coordinates.
  for(const piece of [originalPiece,foldedPiece]){
    for(const face of piece.faces){
      if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
         face.some(i=>!Number.isInteger(i)||i<0||i>=piece.flatVerticesM.length))
        throw new Error('Invalid authored sleeve face topology')
      const [a,b,c]=face.map(i=>piece.flatVerticesM[i])
      if(!finite3(a)||!finite3(b)||!finite3(c)||
         (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<=1e-12)
        throw new Error('Invalid sleeve material face winding or area')
    }
  }
  const sourceSnapshot=JSON.stringify(source),foldedSnapshot=JSON.stringify(folded)
  for(const other of source.pieces.filter(p=>p.id!==panelId)){
    const current=folded.pieces.find(p=>p.id===other.id)
    if(!current||JSON.stringify(current)!==JSON.stringify(other))
      throw new Error('Folded research payload modified another panel')
    for(const index of other.particleIndices)
      if(JSON.stringify(source.particles[index])!==JSON.stringify(folded.particles[index]))
        throw new Error('Folded research payload modified stationary particles')
  }
  const movable=new Set(foldedPiece.particleIndices)
  for(const index of movable)
    if(!finite3(folded.particles[index]?.position))
      throw new Error('Invalid folded sleeve particle')
  if((folded.anchors||[]).some(anchor=>movable.has(anchor.particle)))
    throw new Error('Pinned sleeve translation is unsupported')
  // Independently verify the folded sleeve's triangle-edge material isometry.
  for(const face of foldedPiece.faces){
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3)
      throw new Error('Invalid folded sleeve face')
    for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
      const ra=foldedPiece.flatVerticesM[a],rb=foldedPiece.flatVerticesM[b]
      const pa=folded.particles[foldedPiece.particleIndices[a]]?.position
      const pb=folded.particles[foldedPiece.particleIndices[b]]?.position
      if(!finite3(ra)||!finite3(rb)||!finite3(pa)||!finite3(pb)||
         Math.abs(norm(subtract(ra,rb))-norm(subtract(pa,pb)))>1e-8)
        throw new Error('Folded sleeve violates material-edge isometry')
    }
  }
  const seamBefore=measureNativeSeamResiduals(folded)
  const originalSeams=measureNativeSeamResiduals(source)
  if(seamBefore.pairCount!==102||seamBefore.groups.length!==14||
     originalSeams.pairCount!==102)
    throw new Error('Incomplete Foundation Tee sewing inventory')
  let sumCoefficientSq=0
  const rhs=[0,0,0]
  const endpoint=index=>{
    if(!Number.isInteger(index)||index<0||index>=folded.particles.length||
       !finite3(folded.particles[index]?.position))
      throw new Error('Invalid sewing endpoint index')
    return {position:folded.particles[index].position,
      coefficient:movable.has(index)?1:0}
  }
  const accumulate=(a,b)=>{
    const c=a.coefficient-b.coefficient
    if(!c)return
    const delta=subtract(a.position,b.position)
    sumCoefficientSq+=c*c
    for(let k=0;k<3;k++)rhs[k]-=c*delta[k]
  }
  for(const seam of folded.constraints){
    if(seam.type==='seam')accumulate(endpoint(seam.a),endpoint(seam.b))
  }
  for(const seam of folded.virtualSeams||[]){
    const side=(indices,weights)=>{
      const position=weighted(folded,indices,weights)
      let coefficient=0
      for(let i=0;i<indices.length;i++)
        if(movable.has(indices[i]))coefficient+=weights[i]
      return {position,coefficient}
    }
    accumulate(side(seam.sourceIndices,seam.sourceWeights),
      side(seam.targetIndices,seam.targetWeights))
  }
  if(sumCoefficientSq<1e-10)throw new Error('Disconnected sleeve sewing graph')
  const unconstrained=rhs.map(x=>x/sumCoefficientSq)
  const length=norm(unconstrained)
  const direction=length>maxTranslationM?
    unconstrained.map(x=>x*maxTranslationM/length):unconstrained
  const fractions=[0,.25,.5,.75,1]
  const trials=fractions.map(fraction=>{
    const translationM=direction.map(x=>x*fraction)
    const candidate=structuredClone(folded)
    for(const index of movable){
      const p=candidate.particles[index]
      p.position=p.position.map((x,k)=>x+translationM[k])
      if(finite3(p.previous))p.previous=p.previous.map((x,k)=>x+translationM[k])
    }
    const seam=measureNativeSeamResiduals(candidate)
    return {fraction,translationM,seam,candidate}
  })
  const ranked=[...trials].sort((a,b)=>
    a.seam.rmsGapMm-b.seam.rmsGapMm||a.seam.maxGapMm-b.seam.maxGapMm)
  const selected=ranked[0]
  const groupMerit=compareNativeSeamGroups(seamBefore,selected.seam)
  const originalGroupMerit=compareNativeSeamGroups(originalSeams,selected.seam)
  const merit=compareNativeSeamMerit(seamBefore,selected.seam)
  const strain=auditNativePrincipalStrain(selected.candidate)
  const intra=inspectNativeIntrapanelStaticContact(selected.candidate,
    {clearanceM,maxPairs:maxFacePairs})
  const inter=inspectNativeInterpanelExactStaticContact(selected.candidate,
    {clearanceM,maxPairs:maxFacePairs,maxNarrowphasePairs:maxFacePairs})
  // Isolate the moving sleeve against each other panel: a pre-existing
  // collision between two stationary panels must not hide a motion witness.
  const activeIntervals=folded.pieces.filter(p=>p.id!==panelId).map(other=>{
    const selectedPieces=[foldedPiece,other]
    const compact={pieces:[],particles:[]}
    for(const piece of selectedPieces){
      const particleIndices=[]
      for(const old of piece.particleIndices){
        particleIndices.push(compact.particles.length)
        compact.particles.push(structuredClone(folded.particles[old]))
      }
      compact.pieces.push({...piece,particleIndices})
    }
    const motions=Object.fromEntries(selectedPieces.map(p=>[p.id,{
      translationM:p.id===panelId?selected.translationM:[0,0,0]}]))
    const result=screenNativeCoupledHingeTranslationInterval20261025(
      compact,motions,{clearanceM,maxFacePairs,
        maxDistanceEvaluations:100000,maxDepth:8})
    return {otherPanelId:other.id,...result}
  })
  if(JSON.stringify(source)!==sourceSnapshot||JSON.stringify(folded)!==foldedSnapshot)
    throw new Error('Seam-merit study mutated input')
  const staticContactValid=intra.staticDisjointThicknessScreenClear&&
    inter.staticInterpanelExactClear
  return {panelId,analyticTranslationM:unconstrained,
    cappedTranslationM:direction,selectedTranslationM:selected.translationM,
    candidatePayload:selected.candidate,originalSeams:{maxGapMm:originalSeams.maxGapMm,
      rmsGapMm:originalSeams.rmsGapMm},
    foldedSeams:{maxGapMm:seamBefore.maxGapMm,rmsGapMm:seamBefore.rmsGapMm},
    candidateSeams:{maxGapMm:selected.seam.maxGapMm,rmsGapMm:selected.seam.rmsGapMm},
    trials:trials.map(x=>({fraction:x.fraction,
      maxGapMm:x.seam.maxGapMm,rmsGapMm:x.seam.rmsGapMm})),
    sewingPairCount:seamBefore.pairCount,seamGroupCount:seamBefore.groups.length,
    seamMerit:merit,seamGroupRegressions:groupMerit.regressions,
    originalSeamGroupRegressions:originalGroupMerit.regressions,
    fullPrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
    fullPrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
    intrapanelIntersections:intra.intersectingTrianglePairs,
    intrapanelNearClearancePairs:intra.nonadjacentNearClearancePairs,
    interpanelNearClearancePairs:inter.nearClearancePairs,
    staticContactValid,activeIntervals,
    limitedResearchGatePass:merit.paretoImproved&&groupMerit.allGroupsNonworse&&
      strain.withinDeclaredStrainLimit&&staticContactValid&&
      activeIntervals.every(x=>x.coupledInterpanelIntervalClear),
    solverConstraintsRebuilt:false,materialCalibrated:false,
    continuousDeformableCCDCertified:false,avatarContactChecked:false,
    physicalAcceptance:false,safeToAutoApply:false,sourceNonmutationVerified:true}
}
