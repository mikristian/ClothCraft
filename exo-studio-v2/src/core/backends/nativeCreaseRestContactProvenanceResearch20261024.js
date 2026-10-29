// Research-only diagnosis of a sleeve fold's static contact witness.
// Separates a PRE-EXISTING rest-mesh clearance deficit from contact first
// introduced by folding, and locates the nearby crease-generated slivers.
// Never changes topology, grants adjacency exemptions, or certifies CCD.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])

export function diagnoseNativeCreaseRestContactProvenance20261024(piece,{
  faceA,faceB,angleRadians=5*Math.PI/12,clearanceM=.001,
}={}){
  if(!Number.isInteger(faceA)||!Number.isInteger(faceB)||faceA===faceB||
     !Number.isFinite(angleRadians)||angleRadians<0||angleRadians>Math.PI||
     !Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.01)
    throw new RangeError('Invalid bounded crease witness settings')
  const vertices=piece?.verticesM,faces=piece?.faces
  if(!Array.isArray(vertices)||vertices.length<6||vertices.length>2048||
     vertices.some(p=>!finite3(p)||Math.abs(p[2])>1e-8)||
     !Array.isArray(faces)||faces.length<2||faces.length>2048||
     faceA<0||faceB<0||faceA>=faces.length||faceB>=faces.length||
     !Number.isInteger(piece.originalVertexCount)||
     piece.originalVertexCount<3||piece.originalVertexCount>vertices.length||
     !Array.isArray(piece.newVertexProvenance))
    throw new TypeError('Invalid bounded crease witness material mesh')
  const frozen=JSON.stringify(piece)
  const provenance=new Map()
  for(const entry of piece.newVertexProvenance){
    if(!Number.isInteger(entry?.index)||entry.index<piece.originalVertexCount||
       entry.index>=vertices.length||provenance.has(entry.index)||
       !Array.isArray(entry.edge)||entry.edge.length!==2||
       entry.edge.some(i=>!Number.isInteger(i)||i<0||i>=piece.originalVertexCount)||
       !Array.isArray(entry.weights)||entry.weights.length!==2||
       entry.weights.some(w=>!Number.isFinite(w)||w<0)||
       Math.abs(entry.weights[0]+entry.weights[1]-1)>1e-6)
      throw new Error('Invalid crease intersection provenance')
    provenance.set(entry.index,entry)
  }
  if(provenance.size!==vertices.length-piece.originalVertexCount)
    throw new Error('Missing crease intersection provenance')
  const incidence=new Map(),adjacency=faces.map(()=>new Set())
  const qualities=faces.map((face,faceIndex)=>{
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       face.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length))
      throw new Error('Invalid crease witness face')
    const [a,b,c]=face.map(i=>vertices[i])
    const lengths=[Math.hypot(a[0]-b[0],a[1]-b[1]),
      Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1])]
    const longest=Math.max(...lengths),signed=cross(a,b,c)
    if(!Number.isFinite(longest)||Math.abs(signed)<1e-14)
      throw new Error('Degenerate crease witness rest triangle')
    const altitudeM=Math.abs(signed)/longest,aspect=longest/altitudeM
    for(let j=0;j<3;j++){
      const k=key(face[j],face[(j+1)%3])
      if(!incidence.has(k))incidence.set(k,[])
      incidence.get(k).push(faceIndex)
      if(incidence.get(k).length>2)throw new Error('Nonmanifold crease witness mesh')
    }
    return {faceIndex,altitudeMm:altitudeM*1000,aspect,
      illConditioned:altitudeM<.002||aspect>25,
      creaseVertices:face.filter(i=>Math.abs(vertices[i][0])<=1e-8),
      generatedVertices:face.filter(i=>provenance.has(i))}
  })
  const boundaryVertices=new Set()
  for(const [k,uses] of incidence){
    if(uses.length===2){
      adjacency[uses[0]].add(uses[1]);adjacency[uses[1]].add(uses[0])
    }else for(const i of k.split(':').map(Number))boundaryVertices.add(i)
  }
  if(faces[faceA].some(i=>faces[faceB].includes(i)))
    throw new Error('Crease witness must use disjoint material faces')
  const distances=Array(faces.length).fill(Infinity)
  distances[faceA]=0;distances[faceB]=0
  const queue=[faceA,faceB]
  for(let head=0;head<queue.length;head++){
    const i=queue[head]
    for(const j of adjacency[i])if(distances[j]===Infinity){
      distances[j]=distances[i]+1;queue.push(j)
    }
  }
  const fromA=Array(faces.length).fill(Infinity)
  fromA[faceA]=0
  const q=[faceA]
  for(let head=0;head<q.length;head++)for(const j of adjacency[q[head]])
    if(fromA[j]===Infinity){fromA[j]=fromA[q[head]]+1;q.push(j)}
  const restTriangle=i=>faces[i].map(j=>vertices[j])
  const foldedTriangle=i=>faces[i].map(j=>{
    const [x,y,z]=vertices[j]
    return x>1e-8?[x*Math.cos(angleRadians)-z*Math.sin(angleRadians),y,
      x*Math.sin(angleRadians)+z*Math.cos(angleRadians)]:[x,y,z]
  })
  const restSeparationMm=measureNativeTriangleDistanceM(
    restTriangle(faceA),restTriangle(faceB))*1000
  const foldSeparationMm=measureNativeTriangleDistanceM(
    foldedTriangle(faceA),foldedTriangle(faceB))*1000
  const slivers=qualities.filter(q=>q.illConditioned)
  const targets=new Map()
  for(const sliver of slivers)for(const vertexIndex of sliver.generatedVertices){
    if(Math.abs(vertices[vertexIndex][0])>1e-8)continue
    const prior=targets.get(vertexIndex)||{vertexIndex,sliverCount:0,
      closestWitnessFaceHops:Infinity,witnessFaceIncidence:0}
    prior.sliverCount++
    prior.closestWitnessFaceHops=Math.min(prior.closestWitnessFaceHops,
      distances[sliver.faceIndex])
    if(sliver.faceIndex===faceA||sliver.faceIndex===faceB)
      prior.witnessFaceIncidence++
    targets.set(vertexIndex,prior)
  }
  const prioritizedCreaseNodes=[...targets.values()].sort((a,b)=>
    a.closestWitnessFaceHops-b.closestWitnessFaceHops||
    b.witnessFaceIncidence-a.witnessFaceIncidence||
    b.sliverCount-a.sliverCount||a.vertexIndex-b.vertexIndex).slice(0,12)
    .map(x=>({...x,closestWitnessFaceHops:Number.isFinite(x.closestWitnessFaceHops)?
      x.closestWitnessFaceHops:null}))
  if(JSON.stringify(piece)!==frozen)throw new Error('Crease witness diagnostic mutated source')
  return {panelId:piece.panelId??null,faceA,faceB,angleRadians,
    restSeparationMm,foldSeparationMm,requiredClearanceMm:clearanceM*1000,
    restClearanceDeficitMm:Math.max(0,clearanceM*1000-restSeparationMm),
    foldClearanceDeficitMm:Math.max(0,clearanceM*1000-foldSeparationMm),
    preExistingRestClearanceBlocker:restSeparationMm<clearanceM*1000,
    foldIntroducedClearanceBlocker:restSeparationMm>=clearanceM*1000&&
      foldSeparationMm<clearanceM*1000,
    materialFaceEdgeHops:Number.isFinite(fromA[faceB])?fromA[faceB]:null,
    illConditionedFaceCount:slivers.length,
    illConditionedCreaseFaceCount:slivers.filter(q=>q.creaseVertices.length>0).length,
    illConditionedGeneratedFaceCount:slivers.filter(q=>q.generatedVertices.length>0).length,
    illConditionedBoundaryFaceCount:slivers.filter(q=>
      faces[q.faceIndex].some(i=>boundaryVertices.has(i))).length,
    witnessFaceQuality:[qualities[faceA],qualities[faceB]],
    prioritizedCreaseNodes,sourceUnchanged:true,meshRepairPerformed:false,
    clearanceRuleRelaxed:false,contactCertified:false,
    sweptCollisionCertified:false,physicalAcceptance:false,safeToAutoApply:false}
}
