// Research-only material-area weights and face-pair contact classification.
// This is NOT a calibrated mass model, a solver constraint rebuild, or CCD.
import {auditDetachedSleeveConstraintInventoryResearch20261025} from './nativeSleeveRemeshConstraintInventoryResearch20261025.js'
import {researchFoundationTeeSleeveQualityContact20261025} from './nativeSleeveCreaseQualityContactResearch20261025.js'

const area=(points,face)=>{
  const [a,b,c]=face.map(i=>points[i])
  return Math.abs((b[0]-a[0])*(c[1]-a[1])-
    (b[1]-a[1])*(c[0]-a[0]))/2
}
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`

export function auditDetachedSleeveMassContactTopologyResearch20261025(payload,panelId,mesh){
  // Reuse the full sewing, crease, provenance, winding, and static-contact
  // preflight; a bare array of faces is never trusted as a solver mesh.
  const inventory=auditDetachedSleeveConstraintInventoryResearch20261025(
    payload,panelId,mesh)
  const piece=payload.pieces.find(p=>p.id===panelId)
  const originalArea=piece.faces.reduce((sum,face)=>sum+area(piece.flatVerticesM,face),0)
  const weights=new Array(mesh.flatVerticesM.length).fill(0)
  let remeshedArea=0
  for(const face of mesh.faces){
    const a=area(mesh.flatVerticesM,face)
    if(!Number.isFinite(a)||a<=1e-14)
      throw new Error('Invalid remeshed material face area')
    remeshedArea+=a
    for(const i of face)weights[i]+=a/3
  }
  if(!(originalArea>1e-12)||!Number.isFinite(originalArea)||
     Math.abs(originalArea-remeshedArea)>Math.max(1e-10,originalArea*1e-8))
    throw new Error('Remeshed material area is not conserved')
  if(weights.some(w=>!Number.isFinite(w)||w<=0)||
     Math.abs(weights.reduce((sum,w)=>sum+w,0)-remeshedArea)>1e-10)
    throw new Error('Invalid lumped material area weights')

  // A face sharing a vertex or edge is NOT automatically safe to omit from
  // contact tests. Shared-edge foldovers and shared-vertex crossings must
  // remain checked, as in nativeIntrapanelContactResearch.
  const faceOwners=mesh.flatVerticesM.map(()=>[])
  mesh.faces.forEach((face,f)=>face.forEach(i=>faceOwners[i].push(f)))
  const shared=new Map()
  for(const owners of faceOwners)for(let i=0;i<owners.length;i++)
    for(let j=i+1;j<owners.length;j++){
      const k=key(owners[i],owners[j])
      shared.set(k,(shared.get(k)||0)+1)
    }
  const faceCount=mesh.faces.length,totalPairs=faceCount*(faceCount-1)/2
  let edgeNeighbors=0,vertexNeighbors=0
  for(const count of shared.values()){
    if(count===2)edgeNeighbors++
    else if(count===1)vertexNeighbors++
    else throw new Error('Duplicate or invalid remeshed face pair')
  }
  const nonAdjacent=totalPairs-edgeNeighbors-vertexNeighbors
  if(nonAdjacent<0||edgeNeighbors!==inventory.bendingHingeCount)
    throw new Error('Face contact adjacency disagrees with bending inventory')
  const creaseKeys=new Set(inventory.hinges.filter(h=>h.crease).map(h=>key(...h.faces)))
  if(creaseKeys.size!==inventory.creaseHingeCount||
     [...creaseKeys].some(k=>shared.get(k)!==2))
    throw new Error('Crease contact adjacency is incomplete')
  const anchored=new Set((payload.anchors||[]).map(a=>a.particle))
  const anchoredOriginalVertices=piece.particleIndices.flatMap((global,i)=>
    anchored.has(global)?[i]:[])
  return {
    panelId,vertexCount:weights.length,faceCount,
    originalAreaM2:originalArea,remeshedAreaM2:remeshedArea,
    // Units are m², NOT kg or inverse mass. Density and pinning require
    // independently verified material data before creating solver masses.
    lumpedVertexAreaM2:weights,
    normalizedVertexAreaFractions:weights.map(w=>w/remeshedArea),
    anchoredOriginalVertices,
    contactPairClassification:{totalPairs,edgeNeighborPairs:edgeNeighbors,
      vertexNeighborPairs:vertexNeighbors,nonAdjacentPairs:nonAdjacent,
      creaseEdgeNeighborPairs:creaseKeys.size},
    staticContactValid:inventory.staticContactValid,
    withinDeclaredStrainLimit:inventory.withinDeclaredStrainLimit,
    contact:inventory.contact,
    sourceSewingConstraints:inventory.sourceSewingConstraints,
    massCalibrationVerified:false,stiffnessCalibrated:false,
    solverConstraintsRebuilt:false,samePanelContactExclusionsRebuilt:false,
    continuousContactCertified:false,physicalAcceptance:false,safeToAutoApply:false,
  }
}

export function researchFoundationTeeSleeveMassContactTopology20261025(payload,panelId){
  const mesh=researchFoundationTeeSleeveQualityContact20261025(payload,panelId)
  return auditDetachedSleeveMassContactTopologyResearch20261025(payload,panelId,mesh)
}
