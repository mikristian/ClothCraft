// Research-only material-space crease split. It does NOT regenerate XPBD
// constraints, certify element conditioning, or produce a solver-ready payload.
// Original local vertex IDs and sewn endpoints remain stable; new edge
// vertices carry explicit interpolation provenance for a later validated solve.
import {inspectNativeUnderarmCenterCrease} from './nativeUnderarmCenterCreaseResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&
  p.every(x=>Number.isFinite(x)&&Math.abs(x)<=100)
const area2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const lerp=(a,b,t)=>a.map((x,k)=>x+(b[k]-x)*t)
const worldTwiceArea=(a,b,c)=>{
  const u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k])
  return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
    u[0]*v[1]-u[1]*v[0])
}
const conditioning=(vertices,triangles)=>{
  let illConditionedFaces=0,maximumAspect=0,minimumAltitudeM=Infinity
  for(const face of triangles){
    const [a,b,c]=face.map(i=>vertices[i])
    const longest=Math.max(...[[a,b],[b,c],[c,a]].map(([x,y])=>
      Math.hypot(x[0]-y[0],x[1]-y[1])))
    const altitude=Math.abs(area2(a,b,c))/longest
    const aspect=longest/altitude
    if(!Number.isFinite(aspect)||aspect>25||altitude<.002)illConditionedFaces++
    maximumAspect=Math.max(maximumAspect,aspect)
    minimumAltitudeM=Math.min(minimumAltitudeM,altitude)
  }
  return {illConditionedFaces,maximumAspect,minimumAltitudeM,
    approved:illConditionedFaces===0}
}

export function splitMaterialPanelAtCreaseResearch20261025(
  flatVerticesM,worldVerticesM,faces,{originM,direction,
    axisToleranceM=1e-8,maxVertices=2048,maxFaces=4096}={}){
  if(!Array.isArray(flatVerticesM)||!Array.isArray(worldVerticesM)||
     flatVerticesM.length<3||flatVerticesM.length>1024||
     worldVerticesM.length!==flatVerticesM.length||
     !flatVerticesM.every(finite3)||!worldVerticesM.every(finite3)||
     !Array.isArray(faces)||faces.length<1||faces.length>2048||
     !Array.isArray(originM)||originM.length!==2||
     !originM.every(x=>Number.isFinite(x)&&Math.abs(x)<=100)||
     !Array.isArray(direction)||
     direction.length!==2||!direction.every(Number.isFinite)||
     Math.abs(Math.hypot(...direction)-1)>1e-8||
     !Number.isFinite(axisToleranceM)||axisToleranceM<=0||axisToleranceM>1e-6||
     !Number.isInteger(maxVertices)||maxVertices<3||maxVertices>4096||
     !Number.isInteger(maxFaces)||maxFaces<1||maxFaces>8192)
    throw new Error('Invalid bounded crease split inputs')
  const originalCount=flatVerticesM.length
  const rest=flatVerticesM.map(p=>[...p]),world=worldVerticesM.map(p=>[...p])
  const provenance=rest.map((_,i)=>({kind:'original',originalVertex:i}))
  const signed=p=>direction[0]*(p[1]-originM[1])-
    direction[1]*(p[0]-originM[0])
  const signs=rest.map(p=>{const s=signed(p);return s>axisToleranceM?1:s< -axisToleranceM?-1:0})
  const distances=rest.map(signed)
  const intersections=new Map(),outFaces=[],sourceFaceIndices=[]
  let crossingFaces=0,maxAreaErrorM2=0
  // Refuse pre-existing T-junctions: an independently authored vertex inside
  // an unsplit edge would become a second coincident cut vertex, disconnecting
  // the output despite matching coordinates and apparent area conservation.
  const sourceEdges=new Set()
  for(const face of faces){
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       face.some(i=>!Number.isInteger(i)||i<0||i>=originalCount))
      throw new Error('Invalid crease source face')
    for(let k=0;k<3;k++){
      const a=face[k],b=face[(k+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`
      if(sourceEdges.has(key))continue
      sourceEdges.add(key)
      const x=rest[a],y=rest[b],dx=y[0]-x[0],dy=y[1]-x[1]
      const length2=dx*dx+dy*dy
      if(length2<1e-16)throw new Error('Degenerate crease source edge')
      for(let i=0;i<originalCount;i++){
        if(i===a||i===b)continue
        const t=((rest[i][0]-x[0])*dx+(rest[i][1]-x[1])*dy)/length2
        if(t>1e-9&&t<1-1e-9&&
           Math.hypot(rest[i][0]-x[0]-t*dx,
             rest[i][1]-x[1]-t*dy)<=1e-10)
          throw new Error('Source crease mesh contains a T-junction')
      }
    }
  }
  const edgeCut=(a,b)=>{
    if(signs[a]===0)return a
    if(signs[b]===0)return b
    if(signs[a]===signs[b])throw new Error('Crease cut lacks opposite sides')
    const key=a<b?`${a}:${b}`:`${b}:${a}`
    if(intersections.has(key))return intersections.get(key)
    if(rest.length>=maxVertices)throw new RangeError('Crease vertex budget exceeded')
    const t=distances[a]/(distances[a]-distances[b])
    if(!(t>0&&t<1))throw new Error('Invalid crease edge intersection')
    const id=rest.length
    rest.push(lerp(rest[a],rest[b],t))
    world.push(lerp(world[a],world[b],t))
    provenance.push({kind:'edge-intersection',edge:[a,b],weights:[1-t,t]})
    signs.push(0);distances.push(0)
    intersections.set(key,id)
    return id
  }
  const clip=(face,side)=>{
    const polygon=[]
    for(let k=0;k<3;k++){
      const a=face[k],b=face[(k+1)%3]
      const insideA=side*signs[a]>=0,insideB=side*signs[b]>=0
      if(insideA!==insideB)polygon.push(edgeCut(a,b))
      if(insideB)polygon.push(b)
    }
    return polygon.filter((id,k)=>id!==polygon[(k+polygon.length-1)%polygon.length])
  }
  for(let faceIndex=0;faceIndex<faces.length;faceIndex++){
    const face=faces[faceIndex]
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       face.some(i=>!Number.isInteger(i)||i<0||i>=originalCount))
      throw new Error('Invalid crease source face')
    const originalArea=area2(...face.map(i=>rest[i]))
    if(!Number.isFinite(originalArea)||Math.abs(originalArea)<1e-14)
      throw new Error('Degenerate crease source face')
    if(worldTwiceArea(...face.map(i=>world[i]))<1e-14)
      throw new Error('Collapsed crease source world triangle')
    const hasPositive=face.some(i=>signs[i]>0),hasNegative=face.some(i=>signs[i]<0)
    const polygons=hasPositive&&hasNegative?
      [clip(face,1),clip(face,-1)]:[face]
    if(polygons.length===2)crossingFaces++
    let areaSum=0
    for(const polygon of polygons){
      if(polygon.length<3||polygon.length>4||new Set(polygon).size!==polygon.length)
        throw new Error('Invalid clipped crease polygon')
      for(let k=1;k<polygon.length-1;k++){
        if(outFaces.length>=maxFaces)throw new RangeError('Crease face budget exceeded')
        const triangle=[polygon[0],polygon[k],polygon[k+1]]
        const area=area2(...triangle.map(i=>rest[i]))
        if(Math.abs(area)<1e-14||area*originalArea<=0)
          throw new Error('Crease split produced inverted or degenerate triangle')
        if(worldTwiceArea(...triangle.map(i=>world[i]))<1e-14)
          throw new Error('Crease split produced collapsed world triangle')
        if(triangle.some(i=>signs[i]>0)&&triangle.some(i=>signs[i]<0))
          throw new Error('Crease split left a crossing triangle')
        outFaces.push(triangle);sourceFaceIndices.push(faceIndex)
        areaSum+=area
      }
    }
    const error=Math.abs(areaSum-originalArea)/2
    maxAreaErrorM2=Math.max(maxAreaErrorM2,error)
    if(error>Math.max(1e-12,Math.abs(originalArea)*1e-8))
      throw new Error('Crease split changed material area')
  }
  // Every cut edge must be reused by all incident source faces; an output
  // with non-manifold edges is unsafe even as a research topology preview.
  const incidence=new Map()
  for(const face of outFaces)for(let k=0;k<3;k++){
    const a=face[k],b=face[(k+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`
    const prior=incidence.get(key)
    const orientation=a<b?1:-1
    if(prior?.orientation===orientation)
      throw new Error('Inconsistent crease output face winding')
    const n=(prior?.count||0)+1
    if(n>2)throw new Error('Nonmanifold crease output edge')
    incidence.set(key,{count:n,orientation})
  }
  const beforeConditioning=conditioning(flatVerticesM,faces)
  const afterConditioning=conditioning(rest,outFaces)
  return {flatVerticesM:rest,worldVerticesM:world,faces:outFaces,
    vertexProvenance:provenance,sourceFaceIndices,originalVertexCount:originalCount,
    originalFaceCount:faces.length,cutEdgeCount:intersections.size,
    crossingFacesSplit:crossingFaces,remainingCrossingFaces:0,
    maxAreaErrorM2,restConditioning:{before:beforeConditioning,
      after:afterConditioning,nonworse:
        afterConditioning.illConditionedFaces<=beforeConditioning.illConditionedFaces&&
        afterConditioning.maximumAspect<=beforeConditioning.maximumAspect&&
        afterConditioning.minimumAltitudeM>=beforeConditioning.minimumAltitudeM},
    topologyPreviewOnly:true,solverConstraintsRebuilt:false,
    principalStrainCertified:false,contactCertified:false,safeToAutoApply:false}
}

export function researchFoundationTeeSleeveCreaseMesh20261025(payload,panelId){
  if(panelId!=='sleeve-left'&&panelId!=='sleeve-right')
    throw new Error('Only authored Foundation Tee sleeves supported')
  const inspection=inspectNativeUnderarmCenterCrease(payload)
  const crease=inspection.panels.find(p=>p.panelId===panelId)
  const panel=payload.pieces.find(p=>p.id===panelId)
  if(!panel||!crease)throw new Error('Missing Foundation Tee sleeve')
  const world=panel.particleIndices.map(i=>payload.particles[i]?.position)
  const result=splitMaterialPanelAtCreaseResearch20261025(
    panel.flatVerticesM,world,panel.faces,{originM:crease.creaseOriginM,
      direction:crease.creaseDirection})
  if(result.crossingFacesSplit!==crease.crossingFaceCount||
     result.cutEdgeCount!==crease.cutEdgeCount)
    throw new Error('Crease topology disagrees with independent inventory')
  return {panelId,seamId:crease.seamId,creaseOriginM:crease.creaseOriginM,
    creaseDirection:crease.creaseDirection,...result,
    // Existing particle IDs and sewing constraints are not rewritten.
    originalParticleIndices:[...panel.particleIndices],
    sewingProvenancePreserved:true,physicalAcceptance:false}
}
