// Research-only, non-installable material remesh for the sleeve center crease.
// Splits intersected triangles and shares intersection vertices across edges.
// Does NOT reconstruct springs, create a folded pose or certify collisions.
import {inspectNativeUnderarmCenterCrease} from './nativeUnderarmCenterCreaseResearch.js'

const finite3 = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)
const key = (a,b) => a < b ? `${a}:${b}` : `${b}:${a}`
const area2 = (v,f) => {
  const [a,b,c] = f.map(i=>v[i])
  return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
}
const lerp = (a,b,t) => a.map((x,i)=>x+(b[i]-x)*t)
const edges = f => [[f[0],f[1]],[f[1],f[2]],[f[2],f[0]]]
const quality = (vertices,faces) => {
  let illConditioned=0,minAltitudeMm=Infinity,maxAspect=0
  for(const face of faces){
    const [a,b,c]=face.map(i=>vertices[i])
    const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),
      Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))
    const altitude=Math.abs(area2(vertices,face))/longest
    const aspect=longest/altitude
    if(!Number.isFinite(aspect)||altitude<.002||aspect>25)illConditioned++
    minAltitudeMm=Math.min(minAltitudeMm,altitude*1000)
    maxAspect=Math.max(maxAspect,aspect)
  }
  return {illConditioned,minAltitudeMm,maxAspect}
}
function incidence(faces){
  const map = new Map()
  for(const f of faces)for(const [a,b] of edges(f)){
    const k=key(a,b)
    map.set(k,(map.get(k)||0)+1)
    if(map.get(k)>2)throw new Error('Nonmanifold material edge')
  }
  return map
}

export function buildNativeUnderarmCreaseRemeshResearch(reference,{
  axisToleranceM=1e-9,maxInputVertices=1024,maxOutputFaces=4096,
}={}){
  if(!Number.isFinite(axisToleranceM)||axisToleranceM<=0||axisToleranceM>1e-5||
     !Number.isInteger(maxInputVertices)||maxInputVertices<4||maxInputVertices>2048||
     !Number.isInteger(maxOutputFaces)||maxOutputFaces<4||maxOutputFaces>8192)
    throw new RangeError('Invalid bounded crease remesh budget')
  const proposal=inspectNativeUnderarmCenterCrease(reference,{axisToleranceM})
  const snapshot=JSON.stringify(reference)
  const panels=[]
  for(const crease of proposal.panels){
    const piece=reference.pieces.find(p=>p.id===crease.panelId)
    const n=piece.particleIndices.length
    if(n>maxInputVertices||piece.faces.length>maxOutputFaces)
      throw new RangeError('Crease remesh input budget exhausted')
    const vertices=piece.flatVerticesM.map(p=>[...p])
    const world=piece.particleIndices.map(i=>{
      const p=reference.particles[i]?.position
      if(!finite3(p))throw new Error('Missing finite sleeve world position')
      return [...p]
    })
    const originalFaces=piece.faces
    const originalEdges=incidence(originalFaces)
    const origin=crease.creaseOriginM,dir=crease.creaseDirection
    const signed=p=>dir[0]*(p[1]-origin[1])-dir[1]*(p[0]-origin[0])
    const sign=vertices.map(signed)
    const splits=new Map(),provenance=[],faces=[]
    let originalArea=0
    function intersection(a,b){
      if(Math.abs(sign[a])<=axisToleranceM)return a
      if(Math.abs(sign[b])<=axisToleranceM)return b
      if(sign[a]*sign[b]>=0)throw new Error('Crease intersection is not bracketed')
      const k=key(a,b)
      if(splits.has(k))return splits.get(k)
      const t=sign[a]/(sign[a]-sign[b])
      if(!(t>0&&t<1)||vertices.length>=maxInputVertices*2)
        throw new RangeError('Crease split budget or interpolation invalid')
      const id=vertices.length
      vertices.push(lerp(vertices[a],vertices[b],t))
      world.push(lerp(world[a],world[b],t))
      sign.push(signed(vertices[id]))
      splits.set(k,id)
      provenance.push({index:id,edge:[a,b],weights:[1-t,t]})
      return id
    }
    function clip(face,side){
      const out=[]
      for(let j=0;j<3;j++){
        const a=face[j],b=face[(j+1)%3]
        const insideA=sign[a]*side>=-axisToleranceM
        const insideB=sign[b]*side>=-axisToleranceM
        if(insideA!==insideB)out.push(intersection(a,b))
        if(insideB)out.push(b)
      }
      const unique=[]
      for(const i of out)if(unique.at(-1)!==i)unique.push(i)
      if(unique.length>1&&unique[0]===unique.at(-1))unique.pop()
      return unique
    }
    for(const face of originalFaces){
      const originalSigned=area2(vertices,face)
      if(!Number.isFinite(originalSigned)||Math.abs(originalSigned)<1e-14)
        throw new Error('Degenerate input material face')
      originalArea+=Math.abs(originalSigned)/2
      const hasPos=face.some(i=>sign[i]>axisToleranceM)
      const hasNeg=face.some(i=>sign[i]<-axisToleranceM)
      if(!hasPos||!hasNeg){faces.push([...face]);continue}
      for(const side of [1,-1]){
        const polygon=clip(face,side)
        if(polygon.length<3||polygon.length>4)
          throw new Error('Invalid crease-clipped polygon')
        const candidates=polygon.length===3?[[polygon]]:[
          [[polygon[0],polygon[1],polygon[2]],
            [polygon[0],polygon[2],polygon[3]]],
          [[polygon[0],polygon[1],polygon[3]],
            [polygon[1],polygon[2],polygon[3]]],
        ]
        const choices=candidates.map(tris=>({tris,quality:quality(vertices,tris)}))
          .filter(x=>x.tris.every(tri=>area2(vertices,tri)*originalSigned>1e-14))
          .sort((a,b)=>a.quality.illConditioned-b.quality.illConditioned||
            b.quality.minAltitudeMm-a.quality.minAltitudeMm||
            a.quality.maxAspect-b.quality.maxAspect)
        if(choices.length===0)throw new Error('No valid crease triangulation')
        for(const tri of choices[0].tris){
          const signedArea=area2(vertices,tri)
          if(!Number.isFinite(signedArea)||signedArea*originalSigned<=1e-14)
            throw new Error('Degenerate or reversed remesh triangle')
          faces.push(tri)
          if(faces.length>maxOutputFaces)throw new RangeError('Crease output face budget exhausted')
        }
      }
    }
    const remeshEdges=incidence(faces)
    const expectedBoundary=new Set()
    for(const [k,count] of originalEdges){
      if(count!==1)continue
      const [a,b]=k.split(':').map(Number),middle=splits.get(k)
      if(middle===undefined)expectedBoundary.add(k)
      else{expectedBoundary.add(key(a,middle));expectedBoundary.add(key(middle,b))}
    }
    const actualBoundary=new Set([...remeshEdges].filter(([,count])=>count===1).map(([k])=>k))
    if(expectedBoundary.size!==actualBoundary.size||
       [...expectedBoundary].some(k=>!actualBoundary.has(k)))
      throw new Error('Crease remesh changed material boundary topology')
    const newArea=faces.reduce((sum,f)=>sum+Math.abs(area2(vertices,f))/2,0)
    if(Math.abs(newArea-originalArea)>Math.max(1e-11,originalArea*1e-8))
      throw new Error('Crease remesh changed material area')
    if(faces.some(f=>f.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length)||
       f.some(i=>sign[i]>axisToleranceM)&&f.some(i=>sign[i]<-axisToleranceM)))
      throw new Error('Crease remesh leaves unsplit crossing faces')
    const creaseEdges=[...remeshEdges].filter(([k,count])=>{
      if(count!==2)return false
      const [a,b]=k.split(':').map(Number)
      return Math.abs(sign[a])<=axisToleranceM&&Math.abs(sign[b])<=axisToleranceM
    }).map(([k])=>k.split(':').map(Number))
    if(creaseEdges.length===0||splits.size!==crease.cutEdgeCount)
      throw new Error('Crease remesh did not construct shared hinge topology')
    const beforeQuality=quality(piece.flatVerticesM,originalFaces)
    const afterQuality=quality(vertices,faces)
    panels.push({panelId:crease.panelId,originalVertexCount:n,
      originalFaceCount:originalFaces.length,newVertexCount:vertices.length,
      newFaceCount:faces.length,splitEdgeCount:splits.size,
      creaseEdgeCount:creaseEdges.length,creaseEdges,
      materialAreaM2:originalArea,remeshedAreaM2:newArea,
      beforeQuality,afterQuality,
      qualityRegressed:afterQuality.illConditioned>beforeQuality.illConditioned,
      qualityApproved:afterQuality.illConditioned===0,
      originalBoundaryEdgeCount:[...originalEdges.values()].filter(x=>x===1).length,
      remeshedBoundaryEdgeCount:actualBoundary.size,
      originalParticleIndices:[...piece.particleIndices],
      verticesM:vertices,worldPositionsM:world,faces,
      newVertexProvenance:provenance})
  }
  if(JSON.stringify(reference)!==snapshot)throw new Error('Crease remesh mutated source')
  return {panels,sourceUnchanged:true,originalParticleIndicesPreserved:true,
    originalSewingCorrespondencesPreserved:true,
    materialAreaAndBoundaryCertified:true,structuralConstraintsRebuilt:false,
    bendingConstraintsRebuilt:false,meshConditioningCertified:false,
    actualStrainCertified:false,contactCertified:false,
    sweptCollisionCertified:false,simulated3DPose:false,
    fitCertified:false,safeToAutoApply:false}
}
