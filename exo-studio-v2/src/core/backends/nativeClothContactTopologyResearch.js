// Research-only explanation of unresolved same-panel contact candidates.
// Topological proximity is NOT a collision exemption: a nearby pair can still
// intersect or violate fabric thickness. This module never changes a pose.
const validPoint=p=>Array.isArray(p)&&p.length>=2&&
  Number.isFinite(p[0])&&Number.isFinite(p[1])

export function inspectNativeFacePairRestTopology(piece,faceA,faceB){
  const vertices=piece?.flatVerticesM,faces=piece?.faces
  if(!Array.isArray(vertices)||!Array.isArray(faces)||
     !Number.isInteger(faceA)||!Number.isInteger(faceB)||
     faceA<0||faceB<0||faceA>=faces.length||faceB>=faces.length||faceA===faceB)
    throw new Error('Invalid cloth-contact rest topology request')
  const adjacency=Array.from({length:vertices.length},()=>new Set())
  for(const face of faces){
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       face.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length||
         !validPoint(vertices[i])))
      throw new Error('Invalid cloth-contact rest face')
    for(let k=0;k<3;k++){
      const a=face[k],b=face[(k+1)%3]
      adjacency[a].add(b)
      adjacency[b].add(a)
    }
  }
  const targets=new Set(faces[faceB])
  let frontier=[...faces[faceA]],hops=0
  const visited=new Set(frontier)
  let minimumMaterialEdgeHops=null
  while(frontier.length){
    if(frontier.some(i=>targets.has(i))){minimumMaterialEdgeHops=hops;break}
    const next=[]
    for(const i of frontier)for(const j of adjacency[i])if(!visited.has(j)){
      visited.add(j)
      next.push(j)
    }
    frontier=next
    hops++
  }
  const qualities=[faceA,faceB].map(index=>{
    const [a,b,c]=faces[index].map(i=>vertices[i])
    const length=(u,v)=>Math.hypot(u[0]-v[0],u[1]-v[1])
    const longest=Math.max(length(a,b),length(b,c),length(c,a))
    const doubleArea=Math.abs((b[0]-a[0])*(c[1]-a[1])-
      (b[1]-a[1])*(c[0]-a[0]))
    const altitude=longest>0?doubleArea/longest:0
    const aspect=altitude>0?longest/altitude:null
    return {altitudeMm:altitude*1000,aspectRatio:aspect,
      illConditioned:altitude*1000<2||aspect===null||aspect>25}
  })
  return {minimumMaterialEdgeHops,
    restFaceAltitudesMm:qualities.map(x=>x.altitudeMm),
    restFaceAspectRatios:qualities.map(x=>x.aspectRatio),
    illConditionedRestFaces:qualities.filter(x=>x.illConditioned).length,
    clearanceExemptionGranted:false}
}
