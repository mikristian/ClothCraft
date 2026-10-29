// Independent, research-only rest-pattern fidelity gate. Better triangle
// conditioning must not silently redefine a garment's material coordinates.
// This audits a candidate against the ORIGINAL material edge lengths, not
// against the immediately preceding smoothing pass (which can hide drift).
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const xy=p=>Array.isArray(p)?p:[p?.x,p?.y]
const finitePoint=p=>{const q=xy(p);return q?.length>=2&&q.slice(0,2).every(Number.isFinite)}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const signedArea=(v,[i,j,k])=>{
  const [a,b,c]=[i,j,k].map(index=>xy(v[index]))
  return ((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2
}

export function auditRestMeshFidelity(reference,candidate,{
  maxInteriorDisplacementMm=2,
  maxRelativeEdgeDriftPercent=10,
  maxAreaDriftPercent=.01,
  boundaryToleranceMm=1e-6,
  protectedVertices=[],
}={}){
  const a=reference?.vertices,b=candidate?.vertices
  const faces=reference?.faces,otherFaces=candidate?.faces
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||
    !Array.isArray(faces)||!Array.isArray(otherFaces)||
    faces.length!==otherFaces.length||!a.every(finitePoint)||!b.every(finitePoint))
    throw new TypeError('Invalid rest-mesh fidelity inputs')
  for(let f=0;f<faces.length;f++){
    const face=faces[f],other=otherFaces[f]
    if(!Array.isArray(face)||face.length!==3||
      new Set(face).size!==3||face.some(i=>!Number.isInteger(i)||i<0||i>=a.length)||
      !Array.isArray(other)||face.some((i,k)=>other[k]!==i))
      throw new RangeError('Rest-mesh topology changed; material fidelity cannot be inferred')
  }
  const edgeCounts=new Map()
  for(const face of faces)for(let k=0;k<3;k++){
    const i=face[k],j=face[(k+1)%3],key=edgeKey(i,j)
    const entry=edgeCounts.get(key)||{i,j,count:0}
    entry.count++
    edgeCounts.set(key,entry)
  }
  if([...edgeCounts.values()].some(x=>x.count>2))
    throw new RangeError('Nonmanifold rest-mesh topology')
  const boundary=new Set()
  for(const {i,j,count} of edgeCounts.values())if(count===1){boundary.add(i);boundary.add(j)}
  if(!Array.isArray(protectedVertices)||protectedVertices.some(i=>
    !Number.isInteger(i)||i<0||i>=a.length))
    throw new RangeError('Invalid protected rest vertices')
  for(const [name,value] of Object.entries({maxInteriorDisplacementMm,
    maxRelativeEdgeDriftPercent,maxAreaDriftPercent,boundaryToleranceMm}))
    if(!Number.isFinite(value)||value<0)throw new RangeError(`Invalid ${name}`)
  const fixed=new Set([...boundary,...protectedVertices])
  let maximumFixedDisplacementMm=0,maximumInteriorDisplacementMm=0,movedVertices=0
  for(let i=0;i<a.length;i++){
    const d=1000*distance(xy(a[i]),xy(b[i]))
    if(d>1e-8)movedVertices++
    if(fixed.has(i))maximumFixedDisplacementMm=Math.max(maximumFixedDisplacementMm,d)
    else maximumInteriorDisplacementMm=Math.max(maximumInteriorDisplacementMm,d)
  }
  const drifts=[]
  for(const {i,j} of edgeCounts.values()){
    const before=distance(xy(a[i]),xy(a[j]))
    const after=distance(xy(b[i]),xy(b[j]))
    if(before<=1e-12)throw new RangeError('Degenerate material edge')
    drifts.push(100*Math.abs(after-before)/before)
  }
  drifts.sort((x,y)=>x-y)
  let originalArea=0,candidateArea=0,flippedFaces=0
  for(const face of faces){
    const before=signedArea(a,face),after=signedArea(b,face)
    if(Math.abs(before)<=1e-14||Math.abs(after)<=1e-14||
      Math.sign(before)!==Math.sign(after))flippedFaces++
    originalArea+=Math.abs(before)
    candidateArea+=Math.abs(after)
  }
  const areaDriftPercent=originalArea>1e-12
    ? 100*Math.abs(candidateArea-originalArea)/originalArea : Infinity
  const maximumRelativeEdgeDriftPercent=drifts.at(-1)||0
  const p95RelativeEdgeDriftPercent=drifts.length
    ? drifts[Math.ceil(.95*drifts.length)-1]:0
  const approved=flippedFaces===0&&
    maximumFixedDisplacementMm<=boundaryToleranceMm&&
    maximumInteriorDisplacementMm<=maxInteriorDisplacementMm&&
    maximumRelativeEdgeDriftPercent<=maxRelativeEdgeDriftPercent&&
    areaDriftPercent<=maxAreaDriftPercent
  return {approved,movedVertices,materialEdges:drifts.length,
    boundaryVertices:boundary.size,protectedVertices:protectedVertices.length,
    maximumFixedDisplacementMm,maximumInteriorDisplacementMm,
    maximumRelativeEdgeDriftPercent,p95RelativeEdgeDriftPercent,
    areaDriftPercent,flippedFaces,
    limits:{maxInteriorDisplacementMm,maxRelativeEdgeDriftPercent,
      maxAreaDriftPercent,boundaryToleranceMm},
    fitCertified:false,continuousCollisionDetectionVerified:false}
}
