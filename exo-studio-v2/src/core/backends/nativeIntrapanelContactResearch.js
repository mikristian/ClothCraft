// Research-only STATIC self-contact screen for triangles on the SAME panel.
// Nonadjacent triangles and coplanar edge-neighbor fold-overs may intersect
// even when avatar and inter-panel
// screens are clear. AABBs prune work; a triangle/triangle narrow-phase
// distinguishes genuine intersections from false-positive AABB overlaps.
// This is NOT swept CCD, noncoplanar shared-edge thickness clearance,
// or fitting approval.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const subtract=(a,b)=>a.map((x,i)=>x-b[i])
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const length=v=>Math.hypot(...v)

function triangle(payload,piece,face,index){
  if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
     face.some(i=>!Number.isInteger(i)||i<0||i>=piece.particleIndices.length))
    throw new Error('Invalid self-contact triangle topology')
  const vertices=face.map(i=>{
    const point=payload.particles[piece.particleIndices[i]]?.position
    if(!finite3(point))throw new Error('Invalid self-contact triangle position')
    return point
  })
  const area2=length(cross(subtract(vertices[1],vertices[0]),
    subtract(vertices[2],vertices[0])))
  if(area2<1e-14)throw new Error('Degenerate self-contact triangle')
  return {index,indices:face,vertices,
    min:[0,1,2].map(k=>Math.min(...vertices.map(p=>p[k]))),
    max:[0,1,2].map(k=>Math.max(...vertices.map(p=>p[k])))}
}

function boxDistance(a,b){
  return Math.hypot(...[0,1,2].map(k=>
    Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])))
}

// Research-only material-topology witness for submillimetre near contacts.
// Edge-adjacency is derived from face indices, never world-space proximity:
// a short spatial gap can span multiple fabric triangles. A bounded BFS
// describes the local remeshing neighborhood without relaxing contact vetoes.
function faceEdgeNeighbors(faces){
  const owners=new Map(),neighbors=faces.map(()=>new Set())
  faces.forEach((face,index)=>{
    for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
      const key=a<b?`${a}:${b}`:`${b}:${a}`
      if(!owners.has(key))owners.set(key,[])
      owners.get(key).push(index)
    }
  })
  for(const adjacent of owners.values()){
    if(adjacent.length>2)throw new Error('Nonmanifold self-contact material edge')
    if(adjacent.length===2){
      neighbors[adjacent[0]].add(adjacent[1])
      neighbors[adjacent[1]].add(adjacent[0])
    }
  }
  return neighbors
}

function faceEdgeHops(neighbors,from,to,maxHops=6){
  let frontier=[from],seen=new Set(frontier)
  for(let hops=0;hops<=maxHops;hops++){
    if(frontier.includes(to))return hops
    const next=[]
    for(const face of frontier)for(const neighbor of neighbors[face]){
      if(!seen.has(neighbor)){seen.add(neighbor);next.push(neighbor)}
    }
    frontier=next
    if(!frontier.length)break
  }
  return null // farther than bounded search or disconnected
}

function polygonArea2(poly){
  let sum=0
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length]
    sum+=a[0]*b[1]-a[1]*b[0]
  }
  return sum
}

// A coplanar triangle overlap must have positive AREA. Merely touching a
// shared material boundary is not a self-penetration. Clip in the dominant
// plane of the material triangle rather than testing only bounding boxes.
function coplanarAreaOverlap(a,b,normal,areaToleranceM2){
  const skip=[0,1,2].sort((i,j)=>Math.abs(normal[j])-Math.abs(normal[i]))[0]
  const project=point=>point.filter((_,i)=>i!==skip)
  let poly=a.map(project),clip=b.map(project)
  const orientation=Math.sign(polygonArea2(clip))
  if(!orientation)return false
  const signed=(p,q,x)=>orientation*((q[0]-p[0])*(x[1]-p[1])-
    (q[1]-p[1])*(x[0]-p[0]))
  for(let i=0;i<3;i++){
    const p=clip[i],q=clip[(i+1)%3],input=poly
    poly=[]
    for(let j=0;j<input.length;j++){
      const start=input[j],end=input[(j+1)%input.length]
      const ds=signed(p,q,start),de=signed(p,q,end)
      const insideStart=ds>=0,insideEnd=de>=0
      if(insideStart!==insideEnd){
        const fraction=ds/(ds-de)
        poly.push(start.map((x,k)=>x+fraction*(end[k]-x)))
      }
      if(insideEnd)poly.push(end)
    }
    if(poly.length===0)return false
  }
  return Math.abs(polygonArea2(poly))*.5>areaToleranceM2
}

// Neighboring faces can share a material vertex OR edge yet overlap across
// positive coplanar area after folding. A noncoplanar shared boundary alone
// is not proof of penetration; this narrow check requires area overlap.
function vertexNeighborAreaOverlap(a,b,planeToleranceM=1e-9,areaToleranceM2=1e-12){
  const va=a.vertices,vb=b.vertices
  const na=cross(subtract(va[1],va[0]),subtract(va[2],va[0]))
  const nb=cross(subtract(vb[1],vb[0]),subtract(vb[2],vb[0]))
  const naLength=length(na),nbLength=length(nb)
  if(length(cross(na,nb))/(naLength*nbLength)>=1e-9||
     !vb.every(point=>Math.abs(dot(na,subtract(point,va[0])))/naLength<=planeToleranceM))
    return false
  return coplanarAreaOverlap(va,vb,na,areaToleranceM2)
}

// Conservative STATIC warning for a nearly flattened shared-edge hinge.
// Both faces touch along their material edge, so a generic minimum-distance
// test would reject EVERY valid hinge. Instead require (1) positive-area
// overlap after projection onto the first face and (2) the opposite vertex
// of the second face to be within the requested thickness distance of that
// plane. This catches near-coplanar fold-backs but is NOT a complete
// triangle/triangle thickness oracle or a swept collision certificate.
function edgeNeighborNearFoldover(a,b,clearanceM){
  if(clearanceM<=0)return false
  const shared=a.indices.filter(i=>b.indices.includes(i))
  if(shared.length!==2)return false
  const normal=cross(subtract(a.vertices[1],a.vertices[0]),
    subtract(a.vertices[2],a.vertices[0]))
  const magnitude=length(normal)
  const opposite=b.vertices[b.indices.findIndex(i=>!shared.includes(i))]
  const signed=dot(normal,subtract(opposite,a.vertices[0]))/magnitude
  if(Math.abs(signed)>clearanceM)return false
  const projected=b.vertices.map(p=>{
    const distance=dot(normal,subtract(p,a.vertices[0]))/(magnitude*magnitude)
    return p.map((v,k)=>v-distance*normal[k])
  })
  return coplanarAreaOverlap(a.vertices,projected,normal,1e-12)
}

// For two noncoplanar triangles sharing one vertex, both planes meet on a
// line through that vertex. Each triangle contributes a ray segment on the
// line only when its opposite edge crosses the other triangle's plane.
// Positive overlap of these segments is a crossing; the common point alone
// is not. This is a STATIC geometric test, not a cloth-thickness/CCD proof.
function vertexNeighborNoncoplanarCrossing(a,b,sharedIndex,epsilonM=1e-9){
  const va=a.vertices,vb=b.vertices
  const origin=va[a.indices.indexOf(sharedIndex)]
  const na=cross(subtract(va[1],va[0]),subtract(va[2],va[0]))
  const nb=cross(subtract(vb[1],vb[0]),subtract(vb[2],vb[0]))
  const line=cross(na,nb),magnitude=length(line)
  if(magnitude/(length(na)*length(nb))<1e-9)return false
  const direction=line.map(x=>x/magnitude)
  const rayEnd=(triangle,indices,otherNormal)=>{
    const opposite=triangle.filter((_,i)=>indices[i]!==sharedIndex)
    const normalLength=length(otherNormal)
    const d=opposite.map(p=>dot(otherNormal,subtract(p,origin))/normalLength)
    if(d.every(x=>Math.abs(x)<=epsilonM))return null
    if(d[0]*d[1]>0&&d.every(x=>Math.abs(x)>epsilonM))return null
    if(Math.abs(d[0])<=epsilonM)return opposite[0]
    if(Math.abs(d[1])<=epsilonM)return opposite[1]
    const t=d[0]/(d[0]-d[1])
    return opposite[0].map((x,i)=>x+t*(opposite[1][i]-x))
  }
  const endA=rayEnd(va,a.indices,nb),endB=rayEnd(vb,b.indices,na)
  if(!endA||!endB)return false
  const ta=dot(subtract(endA,origin),direction)
  const tb=dot(subtract(endB,origin),direction)
  return (ta>epsilonM&&tb>epsilonM)||(ta< -epsilonM&&tb< -epsilonM)
}

function intersects(a,b,{planeToleranceM=1e-9,areaToleranceM2=1e-12}={}){
  const va=a.vertices,vb=b.vertices
  const ea=[subtract(va[1],va[0]),subtract(va[2],va[1]),
    subtract(va[0],va[2])]
  const eb=[subtract(vb[1],vb[0]),subtract(vb[2],vb[1]),
    subtract(vb[0],vb[2])]
  const na=cross(ea[0],subtract(va[2],va[0]))
  const nb=cross(eb[0],subtract(vb[2],vb[0]))
  const naLength=length(na),nbLength=length(nb)
  const coplanar=length(cross(na,nb))/(naLength*nbLength)<1e-9&&
    vb.every(point=>Math.abs(dot(na,subtract(point,va[0])))/naLength<=planeToleranceM)
  if(coplanar)return coplanarAreaOverlap(va,vb,na,areaToleranceM2)
  // Triangle/triangle separating axes: both face normals and all 9 edge
  // cross products. Normalized axis avoids scale-dependent tolerances.
  for(const axis of [na,nb,...ea.flatMap(x=>eb.map(y=>cross(x,y)))]){
    const magnitude=length(axis)
    if(magnitude<1e-14)continue
    const p=va.map(v=>dot(v,axis)/magnitude)
    const q=vb.map(v=>dot(v,axis)/magnitude)
    if(Math.max(...p)<Math.min(...q)-planeToleranceM||
       Math.max(...q)<Math.min(...p)-planeToleranceM)return false
  }
  return true
}

export function inspectNativeIntrapanelStaticContact(payload,{
  clearanceM=.001,maxPairs=500_000,maxIntersectionWitnesses=5,
}={}){
  if(!Array.isArray(payload?.pieces)||payload.pieces.length===0||
     !Array.isArray(payload?.particles))
    throw new TypeError('Self-contact screen requires native panels and particles')
  if(!Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.1)
    throw new RangeError('Invalid self-contact clearance')
  if(!Number.isInteger(maxPairs)||maxPairs<1||maxPairs>5_000_000)
    throw new RangeError('Invalid self-contact work budget')
  if(!Number.isInteger(maxIntersectionWitnesses)||
     maxIntersectionWitnesses<0||maxIntersectionWitnesses>256)
    throw new RangeError('Invalid bounded self-contact intersection witness budget')
  let checkedNonadjacentPairs=0,checkedVertexNeighborPairs=0
  let checkedEdgeNeighborPairs=0,checkedTotalPairs=0
  let possibleAabbContactPairs=0,intersectingTrianglePairs=0,intersectingVertexNeighborPairs=0
  let intersectingEdgeNeighborPairs=0,edgeNeighborNearFoldoverPairs=0
  let nonadjacentNearClearancePairs=0
  let minimumNearClearanceMm=null
  const nearClearanceExamples=[]
  let minimumAabbDistanceM=Infinity
  const intersections=[]
  const intersectionCountsByPiece=Object.create(null)
  for(const piece of payload.pieces){
    if(!Array.isArray(piece?.faces)||!Array.isArray(piece.particleIndices))
      throw new TypeError('Invalid self-contact panel topology')
    const triangles=piece.faces.map((face,index)=>triangle(payload,piece,face,index))
    const neighbors=faceEdgeNeighbors(piece.faces)
    for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++){
      const a=triangles[i],b=triangles[j]
      // An edge-neighbor is permitted to meet along its shared edge, but
      // NOT to fold back onto its neighbor over positive coplanar area.
      // Noncoplanar hinge contact and finite fabric thickness remain unproven.
      const sharedVertices=a.indices.filter(index=>b.indices.includes(index)).length
      if(++checkedTotalPairs>maxPairs)
        throw new RangeError('Self-contact exceeds bounded work budget')
      if(sharedVertices>=2)checkedEdgeNeighborPairs++
      else checkedNonadjacentPairs++
      if(sharedVertices===1)checkedVertexNeighborPairs++
      const distanceM=boxDistance(a,b)
      if(sharedVertices<2)
        minimumAabbDistanceM=Math.min(minimumAabbDistanceM,distanceM)
      if(distanceM>clearanceM)continue
      possibleAabbContactPairs++
      const hit=sharedVertices>=2?vertexNeighborAreaOverlap(a,b):sharedVertices===1?(
        vertexNeighborAreaOverlap(a,b)||
        vertexNeighborNoncoplanarCrossing(a,b,
          a.indices.find(index=>b.indices.includes(index)))
      ):intersects(a,b)
      // A foldover warning must not depend on which face happens to have the
      // smaller index. The opposite vertex's plane distance scales with its
      // triangle altitude: a narrow face can lie within thickness of a broad
      // neighbor even when the broad face's opposite vertex is farther away.
      if(sharedVertices===2&&!hit&&(
        edgeNeighborNearFoldover(a,b,clearanceM)||
        edgeNeighborNearFoldover(b,a,clearanceM)))
        edgeNeighborNearFoldoverPairs++
      // Disjoint material faces may pass the zero-thickness intersection
      // test yet violate finite static clearance. Shared-vertex/edge faces
      // necessarily touch and need their own topology-aware hinge treatment.
      if(sharedVertices===0&&!hit&&clearanceM>0){
        const exactDistanceM=measureNativeTriangleDistanceM(a.vertices,b.vertices)
        if(exactDistanceM<clearanceM){
          nonadjacentNearClearancePairs++
          const distanceMm=exactDistanceM*1000
          minimumNearClearanceMm=minimumNearClearanceMm===null?distanceMm:
            Math.min(minimumNearClearanceMm,distanceMm)
          // Keep the eight CLOSEST violating pairs, not the first eight
          // encountered in face-index order. The latter could hide the most
          // severe contact blockers when a mesh has many near contacts.
          const witness={pieceId:piece.id,faceA:a.index,faceB:b.index,distanceMm,
            materialFaceEdgeHops:faceEdgeHops(neighbors,a.index,b.index)}
          const compare=(x,y)=>x.distanceMm-y.distanceMm||
            (String(x.pieceId)<String(y.pieceId)?-1:
              String(x.pieceId)>String(y.pieceId)?1:0)||
            x.faceA-y.faceA||x.faceB-y.faceB
          if(nearClearanceExamples.length<8||
             compare(witness,nearClearanceExamples[nearClearanceExamples.length-1])<0){
            nearClearanceExamples.push(witness)
            nearClearanceExamples.sort(compare)
            if(nearClearanceExamples.length>8)nearClearanceExamples.pop()
          }
        }
      }
      if(hit){
        intersectingTrianglePairs++
        intersectionCountsByPiece[piece.id]=(intersectionCountsByPiece[piece.id]||0)+1
        if(sharedVertices===1)intersectingVertexNeighborPairs++
        if(sharedVertices>=2)intersectingEdgeNeighborPairs++
        if(intersections.length<maxIntersectionWitnesses)intersections.push({
          pieceId:piece.id,faceA:a.index,faceB:b.index,
          aabbDistanceMm:distanceM*1000,
          sharedMaterialVertices:sharedVertices,
          materialFaceEdgeHops:faceEdgeHops(neighbors,a.index,b.index),
        })
      }
    }
  }
  return {
    checkedNonadjacentPairs,checkedVertexNeighborPairs,checkedEdgeNeighborPairs,
    checkedTotalPairs,possibleAabbContactPairs,
    intersectingTrianglePairs,intersectingVertexNeighborPairs,intersectingEdgeNeighborPairs,
    edgeNeighborNearFoldoverPairs,nonadjacentNearClearancePairs,
    minimumNearClearanceMm,nearClearanceExamples,
    minimumAabbDistanceMm:Number.isFinite(minimumAabbDistanceM)?
      minimumAabbDistanceM*1000:null,
    intersections,intersectionCountsByPiece:{...intersectionCountsByPiece},
    intersectionWitnessesComplete:intersections.length===intersectingTrianglePairs,
    staticNonadjacentTriangleIntersectionsAbsent:intersectingTrianglePairs===0,
    adjacentTrianglesExcluded:false,edgeAdjacentTrianglesExcluded:false,
    edgeNeighborCoplanarFoldoverChecked:true,
    edgeNeighborNearFoldoverChecked:true,
    staticNearFoldoverScreenClear:intersectingTrianglePairs===0&&edgeNeighborNearFoldoverPairs===0,
    staticDisjointThicknessScreenClear:intersectingTrianglePairs===0&&
      edgeNeighborNearFoldoverPairs===0&&nonadjacentNearClearancePairs===0,
    nonadjacentTriangleDistanceChecked:true,
    vertexOnlyCoplanarOverlapChecked:true,
    vertexOnlyNoncoplanarCrossingChecked:true,triangleNarrowPhaseChecked:true,
    clothThicknessClearanceCertified:false,sweptCollisionCertified:false,
    selfCollisionCertified:false,fitCertified:false,
  }
}
