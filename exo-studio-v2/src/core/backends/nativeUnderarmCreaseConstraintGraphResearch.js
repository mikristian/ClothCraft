// Research-only reconstruction of material springs, rest-shape matrices and
// dihedral hinge *topology* after constrained sleeve crease remeshing.
// No forces are integrated, no garment is saved, and no collision is certified.
import {refineNativeUnderarmCreaseMeshResearch} from './nativeUnderarmCreaseFlipRefinementResearch.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const targets=new Map([['sleeve-left','seam-sleeve-l-underarm'],
  ['sleeve-right','seam-sleeve-r-underarm']])

function mapEndpoint(indices,weights,lookup){
  if(!Array.isArray(indices)||!Array.isArray(weights)||
     indices.length<1||indices.length>3||indices.length!==weights.length)
    throw new Error('Malformed sleeve sewing endpoint')
  let sum=0
  const localIndices=[]
  for(let i=0;i<indices.length;i++){
    const index=lookup.get(indices[i]),weight=weights[i]
    if(index===undefined||!Number.isFinite(weight)||weight<0)
      throw new Error('Sleeve sewing endpoint missing or invalid')
    localIndices.push(index);sum+=weight
  }
  if(Math.abs(sum-1)>1e-6)throw new Error('Sleeve sewing weights must sum to one')
  return {localIndices,weights:[...weights]}
}

export function buildNativeUnderarmCreaseConstraintGraphResearch(reference,{
  maxFlips=128,maxEdges=4096,maxHinges=4096,
}={}){
  if(!Number.isInteger(maxEdges)||maxEdges<1||maxEdges>8192||
     !Number.isInteger(maxHinges)||maxHinges<1||maxHinges>8192)
    throw new RangeError('Invalid bounded crease constraint graph budget')
  const snapshot=JSON.stringify(reference)
  const refined=refineNativeUnderarmCreaseMeshResearch(reference,{maxFlips})
  const panels=refined.panels.map(piece=>{
    const vertices=piece.verticesM,faces=piece.faces
    const incidence=new Map(),restShapes=[]
    for(let i=0;i<faces.length;i++){
      const face=faces[i]
      if(face.length!==3||new Set(face).size!==3||
         face.some(j=>!Number.isInteger(j)||j<0||j>=vertices.length))
        throw new Error('Malformed refined material face')
      const [a,b,c]=face.map(j=>vertices[j])
      const signed=cross(a,b,c)
      if(!Number.isFinite(signed)||Math.abs(signed)<1e-14)
        throw new Error('Singular rest shape matrix')
      // Dm columns are (b-a,c-a). These matrices are diagnostics until
      // every triangle passes conditioning and contact gates.
      const inverseDm=[(c[1]-a[1])/signed,-(c[0]-a[0])/signed,
        -(b[1]-a[1])/signed,(b[0]-a[0])/signed]
      if(inverseDm.some(x=>!Number.isFinite(x)))
        throw new Error('Nonfinite inverse rest matrix')
      restShapes.push({faceIndex:i,areaM2:Math.abs(signed)/2,inverseDm})
      for(let j=0;j<3;j++){
        const u=face[j],v=face[(j+1)%3],opposite=face[(j+2)%3]
        const k=key(u,v)
        if(!incidence.has(k))incidence.set(k,[])
        incidence.get(k).push({faceIndex:i,opposite})
      }
    }
    if(incidence.size>maxEdges)throw new RangeError('Crease structural edge budget exhausted')
    const crease=new Set(piece.creaseEdges.map(([a,b])=>key(a,b)))
    const structuralEdges=[],bendingHinges=[]
    for(const [k,uses] of incidence){
      if(uses.length<1||uses.length>2)throw new Error('Nonmanifold crease graph')
      const [a,b]=k.split(':').map(Number)
      const restLengthM=distance(vertices[a],vertices[b])
      if(!Number.isFinite(restLengthM)||restLengthM<=1e-9)
        throw new Error('Invalid structural rest length')
      structuralEdges.push({vertices:[a,b],restLengthM,
        boundary:uses.length===1,crease:crease.has(k)})
      if(uses.length===2){
        const [left,right]=uses
        if(left.opposite===right.opposite)
          throw new Error('Degenerate bending hinge')
        const isCrease=crease.has(k)
        if(isCrease){
          const x=vertices[left.opposite][0],y=vertices[right.opposite][0]
          if(x*y>=-1e-14)
            throw new Error('Crease hinge does not separate material sides')
        }
        bendingHinges.push({edge:[a,b],opposite:[left.opposite,right.opposite],
          faces:[left.faceIndex,right.faceIndex],restFlatAngleRad:0,
          crease:isCrease})
        if(bendingHinges.length>maxHinges)
          throw new RangeError('Crease bending hinge budget exhausted')
      }else if(crease.has(k))throw new Error('Crease hinge is not interior')
    }
    if(bendingHinges.filter(h=>h.crease).length!==crease.size)
      throw new Error('Missing constrained crease hinge')
    const lookup=new Map(piece.originalParticleIndices.map((id,i)=>[id,i]))
    if(lookup.size!==piece.originalParticleIndices.length)
      throw new Error('Duplicate original sleeve particle')
    const seamId=targets.get(piece.panelId),sewingPairs=[]
    for(const c of reference.constraints||[]){
      if(c.type!=='seam'||c.seamId!==seamId)continue
      sewingPairs.push({source:mapEndpoint([c.a],[1],lookup),
        target:mapEndpoint([c.b],[1],lookup)})
    }
    for(const c of reference.virtualSeams||[]){
      if((c.seamId||c.id)!==seamId)continue
      sewingPairs.push({source:mapEndpoint(c.sourceIndices,c.sourceWeights,lookup),
        target:mapEndpoint(c.targetIndices,c.targetWeights,lookup)})
    }
    if(sewingPairs.length<2||sewingPairs.length>128)
      throw new Error('Missing or oversized sleeve sewing constraints')
    return {panelId:piece.panelId,vertexCount:vertices.length,
      triangleCount:faces.length,structuralEdges,bendingHinges,restShapes,
      sewingPairs,seamId,creaseHingeCount:crease.size,
      illConditionedRestTriangles:piece.refinementAfter.illConditioned,
      minRestAltitudeMm:piece.refinementAfter.minAltitudeMm,
      maxRestAspect:piece.refinementAfter.maxAspect,
      meshQualityApproved:piece.qualityApproved,
      originalParticleIndices:[...piece.originalParticleIndices],
      newVertexProvenance:piece.newVertexProvenance.map(p=>({...p,
        edge:[...p.edge],weights:[...p.weights]}))}
  })
  if(JSON.stringify(reference)!==snapshot)
    throw new Error('Crease constraint preview mutated source')
  return {panels,sourceUnchanged:true,materialGraphPreviewBuilt:true,
    structuralConstraintsInstalled:false,bendingConstraintsInstalled:false,
    contactCertified:false,sweptCollisionCertified:false,
    strainCertified:false,solverReady:false,safeToAutoApply:false}
}
