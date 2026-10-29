// Research-only, topology-conforming crease-edge subdivision. Unlike the
// fixed-vertex flip search, this creates a NEW interpolation-provenanced
// vertex on an existing interior crease edge. This is a topology primitive,
// NOT a mesh-quality repair, solver integration, or cloth-contact exemption.
// All contact and conditioning checks here use FLAT REST material coordinates,
// never the optional deformed worldPositionsM. Posed-world collision remains
// unverified even if the flat-rest contact screen is clear.
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'

const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const lerp=(a,b,t)=>a.map((x,i)=>x*(1-t)+b[i]*t)
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)

function requirePlain(value){
  let count=0
  const active=new WeakSet()
  function check(x,depth){
    if(x===null||typeof x==='string'||typeof x==='boolean'||
       (typeof x==='number'&&Number.isFinite(x)))return
    if(typeof x!=='object'||depth>12||++count>16000||active.has(x)||
       !(Array.isArray(x)||Object.getPrototypeOf(x)===Object.prototype))
      throw new TypeError('Crease resampling requires finite plain acyclic data')
    active.add(x)
    for(const k of Reflect.ownKeys(x)){
      const desc=Object.getOwnPropertyDescriptor(x,k)
      if(typeof k!=='string'||!desc||!Object.hasOwn(desc,'value'))
        throw new TypeError('Crease resampling forbids accessors and symbols')
      if(!desc.enumerable&&!(Array.isArray(x)&&k==='length'))
        throw new TypeError('Crease resampling forbids hidden source fields')
      check(desc.value,depth+1)
    }
    active.delete(x)
  }
  check(value,0)
}

function audit(piece){
  const vertices=piece.verticesM,faces=piece.faces
  if(!Array.isArray(vertices)||vertices.length<4||vertices.length>512||
     !vertices.every(v=>finite3(v)&&Math.abs(v[2])<=1e-9)||
     !Array.isArray(faces)||faces.length<2||faces.length>512||
     !Array.isArray(piece.creaseEdges)||!piece.creaseEdges.length||
     !Number.isInteger(piece.originalVertexCount)||
     piece.originalVertexCount<3||piece.originalVertexCount>vertices.length||
     !Array.isArray(piece.originalParticleIndices)||
     piece.originalParticleIndices.length!==piece.originalVertexCount||
     new Set(piece.originalParticleIndices).size!==piece.originalVertexCount||
     piece.originalParticleIndices.some(i=>!Number.isInteger(i)||i<0)||
     !Array.isArray(piece.newVertexProvenance)||
     !Array.isArray(piece.worldPositionsM)||
     piece.worldPositionsM.length!==vertices.length||
     !piece.worldPositionsM.every(finite3))
    throw new Error('Invalid bounded crease resampling mesh')
  // The new vertex may be interpolated from an earlier generated crease
  // vertex, but NEVER from a future vertex or itself. Validate the full DAG.
  const provenance=new Map()
  for(const entry of piece.newVertexProvenance){
    if(!entry||!same(Reflect.ownKeys(entry).sort(),['edge','index','weights'])||
       !Number.isInteger(entry.index)||
       entry.index<piece.originalVertexCount||entry.index>=vertices.length||
       provenance.has(entry.index)||!Array.isArray(entry.edge)||
       entry.edge.length!==2||entry.edge[0]===entry.edge[1]||
       entry.edge.some(i=>!Number.isInteger(i)||i<0||i>=entry.index)||
       !Array.isArray(entry.weights)||entry.weights.length!==2||
       entry.weights.some(w=>!Number.isFinite(w)||w<=0||w>=1)||
       Math.abs(entry.weights[0]+entry.weights[1]-1)>1e-10||
       !vertices[entry.index].every((x,j)=>Math.abs(x-
         entry.edge.reduce((sum,id,k)=>sum+vertices[id][j]*entry.weights[k],0))<=1e-10))
      throw new Error('Invalid crease resampling interpolation provenance')
    provenance.set(entry.index,entry)
  }
  if(provenance.size!==vertices.length-piece.originalVertexCount)
    throw new Error('Incomplete crease resampling provenance')
  const incidence=new Map()
  let area=0,illConditioned=0,minAltitudeMm=Infinity,maxAspect=0,sign=0
  for(let i=0;i<faces.length;i++){
    const face=faces[i]
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       face.some(j=>!Number.isInteger(j)||j<0||j>=vertices.length))
      throw new Error('Invalid crease resampling triangle')
    const v=face.map(j=>vertices[j]),signed=cross(...v)
    if(!Number.isFinite(signed)||Math.abs(signed)<=1e-14||
       (sign&&Math.sign(signed)!==sign))
      throw new Error('Degenerate or inconsistent crease resampling winding')
    sign=Math.sign(signed)
    const xs=v.map(p=>p[0])
    if(Math.min(...xs)<-1e-9&&Math.max(...xs)>1e-9)
      throw new Error('Crease resampling triangle crosses fold axis')
    const lengths=[0,1,2].map(j=>Math.hypot(
      v[j][0]-v[(j+1)%3][0],v[j][1]-v[(j+1)%3][1]))
    const longest=Math.max(...lengths),altitude=Math.abs(signed)/longest
    const aspect=longest/altitude
    if(!Number.isFinite(aspect))throw new Error('Nonfinite crease resampling quality')
    area+=Math.abs(signed)/2
    illConditioned+=Number(altitude<.002||aspect>25)
    minAltitudeMm=Math.min(minAltitudeMm,altitude*1000)
    maxAspect=Math.max(maxAspect,aspect)
    for(let j=0;j<3;j++){
      const a=face[j],b=face[(j+1)%3],k=edgeKey(a,b)
      if(!incidence.has(k))incidence.set(k,[])
      incidence.get(k).push({faceIndex:i,opposite:face[(j+2)%3]})
      if(incidence.get(k).length>2)
        throw new Error('Nonmanifold crease resampling topology')
    }
  }
  const boundary=[...incidence].filter(([,uses])=>uses.length===1)
    .map(([k])=>k).sort()
  const creaseKeys=piece.creaseEdges.map(edge=>{
    if(!Array.isArray(edge)||edge.length!==2||
       edge.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length)||
       edge[0]===edge[1])throw new Error('Invalid crease resampling edge')
    return edgeKey(...edge)
  })
  if(new Set(creaseKeys).size!==creaseKeys.length||
     creaseKeys.some(k=>{
       const [a,b]=k.split(':').map(Number),uses=incidence.get(k)
       return !uses||uses.length!==2||
         Math.abs(vertices[a][0])>1e-9||Math.abs(vertices[b][0])>1e-9||
         vertices[uses[0].opposite][0]*vertices[uses[1].opposite][0]>=-1e-14
     }))throw new Error('Invalid interior crease hinge')
  const actualAxisHinges=[...incidence].filter(([k,uses])=>{
    if(uses.length!==2)return false
    const [a,b]=k.split(':').map(Number)
    return Math.abs(vertices[a][0])<=1e-9&&
      Math.abs(vertices[b][0])<=1e-9&&
      vertices[uses[0].opposite][0]*vertices[uses[1].opposite][0]<-1e-14
  }).map(([k])=>k)
  if(actualAxisHinges.length!==creaseKeys.length||
     actualAxisHinges.some(k=>!creaseKeys.includes(k)))
    throw new Error('Incomplete constrained crease hinge inventory')
  return {incidence,boundary,area,illConditioned,minAltitudeMm,maxAspect,
    structuralEdges:incidence.size,
    bendingHinges:[...incidence.values()].filter(uses=>uses.length===2).length,
    creaseHinges:creaseKeys.length}
}

const staticContact=(piece,clearanceM)=>inspectNativeIntrapanelStaticContact({
  pieces:[{id:piece.panelId||'research-sleeve',
    particleIndices:piece.verticesM.map((_,i)=>i),faces:piece.faces}],
  particles:piece.verticesM.map(position=>({position}))},
{clearanceM,maxPairs:512*511/2})

export function splitNativeCreaseEdgeResearch20261024(reference,{
  edgeIndex=7,fraction=.5,clearanceM=.001,
}={}){
  if(!Number.isInteger(edgeIndex)||edgeIndex<0||edgeIndex>511||
     !Number.isFinite(fraction)||fraction<.1||fraction>.9||
     !Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.01)
    throw new RangeError('Invalid bounded crease edge resampling settings')
  requirePlain(reference)
  const frozen=JSON.stringify(reference),before=audit(reference)
  const selected=reference.creaseEdges[edgeIndex]
  if(!selected)throw new RangeError('Crease edge index outside available hinges')
  const [a,b]=selected,uses=before.incidence.get(edgeKey(a,b))
  if(!uses||uses.length!==2)throw new Error('Selected crease is not an interior edge')
  const verticesM=reference.verticesM.map(p=>[...p]),
    worldPositionsM=reference.worldPositionsM.map(p=>[...p]),
    faces=reference.faces.map(f=>[...f]),newIndex=verticesM.length
  verticesM.push(lerp(verticesM[a],verticesM[b],fraction))
  worldPositionsM.push(lerp(worldPositionsM[a],worldPositionsM[b],fraction))
  const replacement=[]
  for(const {faceIndex} of uses){
    const face=faces[faceIndex],j=face.findIndex((id,k)=>
      (id===a&&face[(k+1)%3]===b)||(id===b&&face[(k+1)%3]===a))
    if(j<0)throw new Error('Crease edge incidence is inconsistent')
    const u=face[j],v=face[(j+1)%3],c=face[(j+2)%3]
    replacement.push({faceIndex,first:[u,newIndex,c],second:[newIndex,v,c]})
  }
  for(const item of replacement)faces[item.faceIndex]=item.first
  for(const item of replacement)faces.push(item.second)
  // Deep isolation matters: editing an experimental candidate later must
  // never mutate even a nested array in the original editable source.
  const candidate=structuredClone(reference)
  candidate.verticesM=verticesM
  candidate.worldPositionsM=worldPositionsM
  candidate.faces=faces
  candidate.creaseEdges=reference.creaseEdges.filter((_,i)=>i!==edgeIndex)
    .map(e=>[...e]).concat([[a,newIndex],[newIndex,b]])
  candidate.newVertexProvenance=reference.newVertexProvenance.map(entry=>({
    index:entry.index,edge:[...entry.edge],weights:[...entry.weights]}))
    .concat([{index:newIndex,edge:[a,b],weights:[1-fraction,fraction]}])
  const after=audit(candidate)
  if(before.boundary.length!==after.boundary.length||
     !same(before.boundary,after.boundary)||
     Math.abs(before.area-after.area)>Math.max(1e-11,before.area*1e-8)||
     after.structuralEdges!==before.structuralEdges+3||
     after.bendingHinges!==before.bendingHinges+3||
     after.creaseHinges!==before.creaseHinges+1||
     candidate.faces.length!==reference.faces.length+2||
     candidate.verticesM.length!==reference.verticesM.length+1||
     !same(candidate.originalParticleIndices,reference.originalParticleIndices))
    throw new Error('Crease resampling failed topology or material conservation')
  // Do not confuse a flat-rest screen with world-pose contact. The original
  // worldPositionsM can legitimately be deformed/translated independently.
  const restBefore=staticContact(reference,clearanceM)
  const restAfter=staticContact(candidate,clearanceM)
  // Refresh inherited diagnostic fields; otherwise a downstream research
  // reader could mistake the pre-subdivision counts for the new topology.
  candidate.newVertexCount=verticesM.length
  candidate.newFaceCount=faces.length
  candidate.creaseEdgeCount=candidate.creaseEdges.length
  candidate.remeshedAreaM2=after.area
  candidate.afterQuality={illConditioned:after.illConditioned,
    minAltitudeMm:after.minAltitudeMm,maxAspect:after.maxAspect}
  candidate.refinementAfter={...candidate.afterQuality,area:after.area}
  candidate.qualityApproved=after.illConditioned===0
  candidate.qualityRegressed=after.illConditioned>before.illConditioned
  candidate.researchOnly=true
  if(JSON.stringify(reference)!==frozen)
    throw new Error('Crease resampling mutated original mesh')
  const report=m=>({illConditioned:m.illConditioned,
    minAltitudeMm:m.minAltitudeMm,maxAspect:m.maxAspect,
    structuralEdges:m.structuralEdges,bendingHinges:m.bendingHinges,
    creaseHinges:m.creaseHinges,areaM2:m.area})
  return {candidate,baseline:report(before),resampled:report(after),
    baselineContact:{nearClearancePairs:restBefore.nonadjacentNearClearancePairs,
      intersectingPairs:restBefore.intersectingTrianglePairs,
      staticClear:restBefore.staticDisjointThicknessScreenClear},
    resampledContact:{nearClearancePairs:restAfter.nonadjacentNearClearancePairs,
      intersectingPairs:restAfter.intersectingTrianglePairs,
      staticClear:restAfter.staticDisjointThicknessScreenClear},
    splitEdge:[a,b],newVertexIndex:newIndex,fraction,
    provenanceReconstructed:true,materialBoundaryPreserved:true,
    materialAreaPreserved:true,originalSewingEndpointsPreserved:true,
    sourceUnchanged:true,solverGraphPreviewOnly:true,
    meshQualityApproved:after.illConditioned===0,
    restMeshQualityApproved:after.illConditioned===0,
    restContactScreenClear:restAfter.staticDisjointThicknessScreenClear,
    restMaterialContactOnly:true,worldPoseContactChecked:false,
    worldPoseValidityCertified:false,
    qualityNonregression:after.illConditioned<=before.illConditioned&&
      after.minAltitudeMm+1e-9>=before.minAltitudeMm&&
      after.maxAspect<=before.maxAspect+1e-9,
    candidateApplied:false,structuralConstraintsInstalled:false,
    bendingConstraintsInstalled:false,physicalAcceptance:false,
    avatarContactChecked:false,sweptCollisionCertified:false,
    clothThicknessCertified:false,safeToAutoApply:false}
}
