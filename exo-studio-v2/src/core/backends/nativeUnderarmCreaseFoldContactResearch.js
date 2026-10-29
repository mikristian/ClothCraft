// Research-only, isolated material-space crease-fold screen. This is NOT an
// avatar-positioned garment pose, a solver trajectory or swept collision CCD.
// The crease is x=0; the positive half of each sleeve rotates rigidly about
// its material y-axis. Rejected rest meshes cannot become solver-ready just
// because a rigid fold has low principal strain and small sewing gaps.
import {refineNativeUnderarmCreaseMeshResearch} from './nativeUnderarmCreaseFlipRefinementResearch.js'
import {buildNativeUnderarmCreaseConstraintGraphResearch} from './nativeUnderarmCreaseConstraintGraphResearch.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))*1000
const weighted=(positions,end)=>{
  const result=[0,0,0]
  for(let i=0;i<end.localIndices.length;i++){
    const point=positions[end.localIndices[i]],weight=end.weights[i]
    if(!finite3(point)||!Number.isFinite(weight)||weight<0)
      throw new Error('Invalid crease fold sewing endpoint')
    for(let j=0;j<3;j++)result[j]+=weight*point[j]
  }
  return result
}

export function evaluateNativeUnderarmCreaseFoldContactResearch(reference,{
  anglesRadians=[0,Math.PI/2,5*Math.PI/6,Math.PI],
  clearanceM=.001,maxFlips=128,maxFacePairs=200_000,
}={}){
  if(!Array.isArray(anglesRadians)||anglesRadians.length<1||anglesRadians.length>6||
     anglesRadians.some(a=>!Number.isFinite(a)||a<0||a>Math.PI)||
     new Set(anglesRadians).size!==anglesRadians.length)
    throw new RangeError('Invalid bounded crease fold angles')
  if(!Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.01||
     !Number.isInteger(maxFacePairs)||maxFacePairs<1||maxFacePairs>500_000)
    throw new RangeError('Invalid crease fold contact budget')
  const frozen=JSON.stringify(reference)
  const refined=refineNativeUnderarmCreaseMeshResearch(reference,{maxFlips})
  const graph=buildNativeUnderarmCreaseConstraintGraphResearch(reference,{maxFlips})
  if(refined.panels.length!==2||graph.panels.length!==2)
    throw new Error('Crease fold requires exactly two sleeve panels')
  const panels=refined.panels.map((piece,i)=>{
    const constraints=graph.panels[i]
    if(piece.panelId!==constraints.panelId||piece.faces.length!==constraints.triangleCount||
       piece.verticesM.length!==constraints.vertexCount)
      throw new Error('Crease fold topology and sewing graph disagree')
    if(piece.verticesM.some(p=>!finite3(p)||Math.abs(p[2])>1e-8)||
       piece.faces.some(f=>f.some(j=>!Number.isInteger(j)||j<0||j>=piece.verticesM.length)))
      throw new Error('Crease fold requires finite planar material coordinates')
    if(piece.faces.some(f=>{
      const xs=f.map(j=>piece.verticesM[j][0])
      return Math.min(...xs)<-1e-8&&Math.max(...xs)>1e-8
    })||piece.creaseEdges.some(([a,b])=>
      Math.abs(piece.verticesM[a][0])>1e-8||Math.abs(piece.verticesM[b][0])>1e-8))
      throw new Error('Crease fold topology crosses the material hinge')
    const facePairs=piece.faces.length*(piece.faces.length-1)/2
    if(facePairs>maxFacePairs)throw new RangeError('Crease fold contact pair budget exceeded')
    const poses=anglesRadians.map(angleRadians=>{
      const c=Math.cos(angleRadians),s=Math.sin(angleRadians)
      const positions=piece.verticesM.map(([x,y])=>x>1e-8?[x*c,y,x*s]:[x,y,0])
      const payload={pieces:[{id:piece.panelId,
        particleIndices:positions.map((_,j)=>j),
        flatVerticesM:piece.verticesM.map(p=>[...p]),
        faces:piece.faces.map(f=>[...f])}],
      particles:positions.map(position=>({position}))}
      const seamGaps=constraints.sewingPairs.map(pair=>gap(
        weighted(positions,pair.source),weighted(positions,pair.target)))
      const strain=auditNativePrincipalStrain(payload,{limitPercent:5})
      const contact=inspectNativeIntrapanelStaticContact(payload,{
        clearanceM,maxPairs:maxFacePairs})
      const maxGapMm=Math.max(...seamGaps)
      const rmsGapMm=Math.hypot(...seamGaps)/Math.sqrt(seamGaps.length)
      const staticContactClear=contact.staticDisjointThicknessScreenClear
      return {angleRadians,maxGapMm,rmsGapMm,sewingPairs:seamGaps.length,
        maximumPrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
        maximumPrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
        principalStrainWithinLimit:strain.withinDeclaredStrainLimit,
        staticContactClear,intersectingTrianglePairs:contact.intersectingTrianglePairs,
        edgeNeighborNearFoldoverPairs:contact.edgeNeighborNearFoldoverPairs,
        nonadjacentNearClearancePairs:contact.nonadjacentNearClearancePairs,
        contactPairsChecked:contact.checkedTotalPairs,
        meshQualityApproved:piece.qualityApproved,
        researchAccepted:false, // avatar/path/contact-thickness certification absent
        solverReady:false,avatarContactChecked:false,sweptCollisionCertified:false}
    })
    return {panelId:piece.panelId,illConditionedRestTriangles:
      piece.refinementAfter.illConditioned,creaseHinges:piece.creaseEdges.length,
      meshQualityApproved:piece.qualityApproved,poses}
  })
  if(JSON.stringify(reference)!==frozen)
    throw new Error('Crease fold experiment mutated source')
  return {panels,sourceUnchanged:true,materialSpacePreviewOnly:true,
    installedConstraints:false,physicalAcceptance:false,avatarContactChecked:false,
    sweptCollisionCertified:false,clothThicknessCertified:false,
    fitCertified:false,safeToAutoApply:false}
}
