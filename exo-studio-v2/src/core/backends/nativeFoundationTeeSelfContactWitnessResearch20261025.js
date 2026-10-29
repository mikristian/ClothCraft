// Detached, bounded diagnosis of same-panel STATIC contact witnesses. This
// classifies proven transverse edge/face piercings separately from unresolved
// touching or tangential contact. It never clears a contact veto or certifies
// continuous deformable collision detection.
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const sub=(a,b)=>a.map((x,i)=>x-b[i])
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm=a=>Math.hypot(...a)

// Only strict interior crossings count as proof. Endpoints on the other
// triangle's plane, triangle edges and coplanar overlaps are NOT classified
// by this test; they remain unresolved and contact-rejected.
function strictSegmentTriangleCrossing(a,b,tri){
  const n=cross(sub(tri[1],tri[0]),sub(tri[2],tri[0]))
  const nlen=norm(n)
  if(!(nlen>1e-12))throw new Error('Degenerate witness triangle')
  const da=dot(n,sub(a,tri[0]))/nlen
  const db=dot(n,sub(b,tri[0]))/nlen
  if(!((da>1e-9&&db< -1e-9)||(da< -1e-9&&db>1e-9)))return null
  const t=da/(da-db)
  if(!(t>1e-8&&t<1-1e-8))return null
  const p=a.map((x,i)=>x+t*(b[i]-x))
  const u=sub(tri[1],tri[0]),v=sub(tri[2],tri[0]),w=sub(p,tri[0])
  const uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),wu=dot(w,u),wv=dot(w,v)
  const denom=uu*vv-uv*uv
  if(!(denom>1e-24))throw new Error('Degenerate witness barycentric frame')
  const beta=(wu*vv-wv*uv)/denom
  const gamma=(wv*uu-wu*uv)/denom
  if(beta<=1e-8||gamma<=1e-8||1-beta-gamma<=1e-8)return null
  return p
}

export function diagnoseNativeSamePanelContactWitnesses20261025(payload,{
  clearanceM=.001,maxPairs=500_000,
}={}){
  const sourceSnapshot=JSON.stringify(payload)
  const contact=inspectNativeIntrapanelStaticContact(payload,{
    clearanceM,maxPairs,maxIntersectionWitnesses:256,
  })
  if(!Array.isArray(payload.constraints))
    throw new Error('Missing authored sewing correspondence inventory')
  const pieces=new Map(payload.pieces.map(piece=>[piece.id,piece]))
  const witnesses=contact.intersections.map(w=>{
    const piece=pieces.get(w.pieceId)
    if(!piece)throw new Error('Missing contact witness panel')
    const ids=[piece.faces[w.faceA],piece.faces[w.faceB]]
    const triangles=ids.map(face=>face.map(i=>
      payload.particles[piece.particleIndices[i]].position))
    const crossings=[]
    for(const [from,to] of [[0,1],[1,0]])for(let edge=0;edge<3;edge++){
      const point=strictSegmentTriangleCrossing(triangles[from][edge],
        triangles[from][(edge+1)%3],triangles[to])
      if(point)crossings.push({fromFace:from===0?w.faceA:w.faceB,
        edge,pointM:point})
    }
    const coincidentDistinctMaterialVertices=[]
    for(let a=0;a<3;a++)for(let b=0;b<3;b++){
      if(ids[0][a]===ids[1][b])continue
      const worldDistanceM=norm(sub(triangles[0][a],triangles[1][b]))
      if(worldDistanceM<=1e-9){
        const materialDistanceM=norm(sub(piece.flatVerticesM[ids[0][a]],
          piece.flatVerticesM[ids[1][b]]))
        const globalA=piece.particleIndices[ids[0][a]]
        const globalB=piece.particleIndices[ids[1][b]]
        const directSewingSeamIds=payload.constraints.filter(c=>
          c.type==='seam'&&((c.a===globalA&&c.b===globalB)||
            (c.a===globalB&&c.b===globalA))).map(c=>c.seamId)
        coincidentDistinctMaterialVertices.push({indexA:ids[0][a],
          indexB:ids[1][b],materialDistanceMm:materialDistanceM*1000,
          worldDistanceMm:worldDistanceM*1000,directSewingSeamIds})
      }
    }
    return {...w,
      exactTriangleDistanceMm:measureNativeTriangleDistanceM(...triangles)*1000,
      strictTransverseCrossings:crossings,
      coincidentDistinctMaterialVertices,
      classification:crossings.length?'strict-transverse-piercing-detected':
        'unresolved-touching-tangency-or-other-contact',
      contactVetoRetained:true}
  })
  if(JSON.stringify(payload)!==sourceSnapshot)
    throw new Error('Same-panel witness diagnosis mutated source state')
  const strictTransversePiercingWitnesses=witnesses.filter(w=>
    w.strictTransverseCrossings.length>0).length
  return {scope:'static-same-panel-contact-diagnostic-only',
    totalIntersectionWarnings:contact.intersectingTrianglePairs,
    intersectionCountsByPiece:contact.intersectionCountsByPiece,
    witnessInventoryComplete:contact.intersectionWitnessesComplete,
    witnesses,strictTransversePiercingWitnesses,
    sampledUnresolvedWarnings:witnesses.length-strictTransversePiercingWitnesses,
    uninspectedIntersectionWarnings:contact.intersectingTrianglePairs-
      witnesses.length,
    staticContactClear:contact.staticDisjointThicknessScreenClear,
    sourceNonmutationVerified:true,physicalAcceptance:false,
    continuousDeformableCCDCertified:false,safeToAutoApply:false}
}
