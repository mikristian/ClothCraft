// Conservative edge-flip quality optimization on the already sampled cloth
// polygon. Boundary coordinates, vertex indices and cut/sewing edge paths
// remain unchanged; only interior diagonals of valid convex quads can flip.
// Does NOT guarantee a high-quality mesh: bad boundary sampling and needle
// triangles still require constrained remeshing with interior points.
import {rustConvexQuad,rustQualityFlipBetter} from '../rustQualityFlipKernel.js'

const coordinates = value => Array.isArray(value) ? value : [value.x,value.y]
const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const key = (a,b) => a<b ? `${a}:${b}` : `${b}:${a}`

function orientLike(vertices,original,proposed) {
  const sign=Math.sign(cross(...original.map(i=>coordinates(vertices[i]))))
  const nextSign=Math.sign(cross(...proposed.map(i=>coordinates(vertices[i]))))
  return nextSign===sign ? proposed : [proposed[0],proposed[2],proposed[1]]
}

// Optional research-only protected interior edges let a remesher retain a
// physically meaningful material fold line. This does not improve collision
// or fit by itself; default behavior is byte-for-byte unchanged.
export function optimizeTriangleQuality(mesh,{passes=8,minImprovement=0.01,protectedEdges=[]}={}) {
  const vertices=mesh.vertices
  const faces=mesh.faces.map(face=>[...face])
  if(!Array.isArray(protectedEdges))throw new TypeError('Protected edges must be index pairs')
  const originalEdges=new Set(faces.flatMap(face=>[
    key(face[0],face[1]),key(face[1],face[2]),key(face[2],face[0])]))
  const protectedKeys=new Set()
  for(const pair of protectedEdges){
    if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||
      pair.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length))
      throw new RangeError('Invalid protected mesh edge')
    const id=key(pair[0],pair[1])
    if(!originalEdges.has(id))throw new RangeError('Protected edge not present in original mesh')
    protectedKeys.add(id)
  }
  let totalFlips=0
  for (let pass=0;pass<passes;pass++) {
    const edges=new Map()
    faces.forEach((face,index)=>{
      for(let i=0;i<3;i++) {
        const a=face[i],b=face[(i+1)%3],opposite=face[(i+2)%3],k=key(a,b)
        if(!edges.has(k))edges.set(k,[])
        edges.get(k).push({index,a,b,opposite})
      }
    })
    let changed=0
    // The edge adjacency was computed at the start of the pass. Once a face
    // flips its prior edges are stale, so it must not be considered again
    // until adjacency is rebuilt on the next pass; otherwise boundary edges
    // can accidentally change even though the local four-vertex test passes.
    const usedFaces=new Set()
    for(const pair of edges.values()) {
      if(pair.length!==2)continue // keep every boundary and non-manifold edge
      const [left,right]=pair
      if(protectedKeys.has(key(left.a,left.b)))continue
      if(usedFaces.has(left.index)||usedFaces.has(right.index))continue
      const a=left.a,b=left.b,c=left.opposite,d=right.opposite
      if(new Set([a,b,c,d]).size!==4)continue
      // A valid convex quadrilateral has c,d on opposite sides of AB and
      // a,b on opposite sides of its proposed replacement diagonal CD.
      const [pa,pb,pc,pd]=[a,b,c,d].map(i=>coordinates(vertices[i]))
      if(!rustConvexQuad(pa,pb,pc,pd))continue
      // No triangle should flip orientation relative to the original mesh.
      const nextA=orientLike(vertices,faces[left.index],[c,d,a])
      const nextB=orientLike(vertices,faces[right.index],[d,c,b])
      if(!rustQualityFlipBetter(pa,pb,pc,pd,minImprovement))continue
      faces[left.index]=nextA
      faces[right.index]=nextB
      usedFaces.add(left.index)
      usedFaces.add(right.index)
      changed++
    }
    totalFlips+=changed
    if(!changed)break
  }
  return {vertices,faces,flips:totalFlips}
}

// Derive *all* internal mesh segments on an existing developable fold line,
// not just the two vertices selected to identify that line. Preserving only
// one short edge would allow the rest of the line to be triangulated away.
export function materialHingeProtectedEdges(mesh,axisVertices,{tolerance=1e-8}={}){
  const {vertices,faces}=mesh
  if(!Array.isArray(vertices)||!Array.isArray(faces)||
    !Array.isArray(axisVertices)||axisVertices.length!==2||
    axisVertices[0]===axisVertices[1]||
    axisVertices.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length))
    throw new RangeError('Invalid material hinge axis')
  if(!Number.isFinite(tolerance)||tolerance<0||tolerance>1e-3)
    throw new RangeError('Invalid material hinge tolerance')
  const [a,b]=axisVertices.map(i=>coordinates(vertices[i]))
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
  if(!(length>1e-9))throw new RangeError('Degenerate material hinge axis')
  const signed=vertices.map(value=>{
    const p=coordinates(value)
    return (dx*(p[1]-a[1])-dy*(p[0]-a[0]))/length
  })
  if(!signed.some(v=>v>tolerance)||!signed.some(v=>v< -tolerance)||
    faces.some(face=>face.some(i=>signed[i]>tolerance)&&
      face.some(i=>signed[i]< -tolerance)))
    throw new RangeError('Material hinge axis cuts through a face or does not partition the panel')
  const edges=new Map()
  for(const face of faces)for(const [i,j] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
    const id=key(i,j),old=edges.get(id)
    edges.set(id,{pair:i<j?[i,j]:[j,i],count:(old?.count||0)+1})
  }
  const protectedEdges=[...edges.values()].filter(item=>item.count===2&&
    item.pair.every(i=>Math.abs(signed[i])<=tolerance)).map(item=>item.pair)
  if(!protectedEdges.length||!protectedEdges.some(pair=>
    key(...pair)===key(...axisVertices)))
    throw new RangeError('Material hinge axis must include an internal mesh edge')
  return protectedEdges
}
