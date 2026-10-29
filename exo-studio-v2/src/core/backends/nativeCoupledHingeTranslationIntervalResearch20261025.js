// Research-only conservative INTER-PANEL interval screen for prescribed
// rigid translations plus per-panel articulated hinge rotations. Triangles
// must remain rigid: a face may straddle a hinge only at stationary axis
// vertices. Does NOT screen self-contact, sewn-neighbor thickness, avatar,
// material conditioning, or an actual simulated trajectory. Never auto-apply.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&
  p.every(x=>Number.isFinite(x)&&Math.abs(x)<=100)
const norm=p=>Math.hypot(...p)
const sub=(a,b)=>a.map((x,k)=>x-b[k])
const dot=(a,b)=>a.reduce((sum,x,k)=>sum+x*b[k],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const box=points=>({min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),
  max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))})
const boxGap=(a,b)=>Math.hypot(...[0,1,2].map(k=>
  Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])))

export function screenNativeCoupledHingeTranslationInterval20261025(
  payload,motions,{clearanceM=.001,maxDepth=8,maxFacePairs=500_000,
    maxDistanceEvaluations=100_000}={}){
  if(!Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.01||
     !Number.isInteger(maxDepth)||maxDepth<0||maxDepth>12||
     !Number.isInteger(maxFacePairs)||maxFacePairs<1||maxFacePairs>1_000_000||
     !Number.isInteger(maxDistanceEvaluations)||maxDistanceEvaluations<1||
     maxDistanceEvaluations>1_000_000)
    throw new RangeError('Invalid coupled interval budget')
  if(!Array.isArray(payload?.pieces)||payload.pieces.length<2||
     payload.pieces.length>8||!Array.isArray(payload?.particles)||
     payload.particles.length>4096||!motions||typeof motions!=='object'||
     Array.isArray(motions))throw new TypeError('Invalid coupled interval payload')
  const ids=payload.pieces.map(p=>p?.id)
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||
     Reflect.ownKeys(motions).length!==ids.length||
     ids.some(id=>!Object.hasOwn(motions,id)))
    throw new Error('Invalid coupled panel motion inventory')
  const owned=new Set()
  const panels=payload.pieces.map(piece=>{
    if(!Array.isArray(piece.particleIndices)||piece.particleIndices.length<3||
       piece.particleIndices.length>1024||!Array.isArray(piece.faces)||
       piece.faces.length<1||piece.faces.length>2048)
      throw new Error('Invalid coupled panel topology')
    const m=motions[piece.id]
    if(!m||!finite3(m.translationM)||norm(m.translationM)>1)
      throw new Error('Invalid coupled panel translation')
    const h=m.hinge
    let moving=new Set(),origin=null,axis=null,delta=0,start=0
    if(h!==undefined&&h!==null){
      if(!finite3(h.axisOriginM)||!finite3(h.axisUnit)||
         Math.abs(norm(h.axisUnit)-1)>1e-8||
         !Number.isFinite(h.startRadians)||!Number.isFinite(h.endRadians)||
         Math.abs(h.startRadians)>Math.PI||Math.abs(h.endRadians)>Math.PI||
         !Array.isArray(h.movingVertices)||h.movingVertices.length<1||
         h.movingVertices.length>piece.particleIndices.length)
        throw new Error('Invalid coupled hinge specification')
      origin=h.axisOriginM;axis=h.axisUnit
      delta=h.endRadians-h.startRadians;start=h.startRadians
      for(const i of h.movingVertices){
        if(!Number.isInteger(i)||i<0||i>=piece.particleIndices.length||moving.has(i))
          throw new Error('Invalid coupled hinge moving vertex')
        moving.add(i)
      }
    }
    const positions=piece.particleIndices.map(i=>{
      if(!Number.isInteger(i)||i<0||i>=payload.particles.length||owned.has(i)||
         payload.particles[i]?.pieceId!==piece.id||
         !finite3(payload.particles[i].position))
        throw new Error('Invalid coupled particle ownership')
      owned.add(i)
      return payload.particles[i].position
    })
    const radii=positions.map((p,i)=>moving.has(i)?
      norm(cross(axis,sub(p,origin))):0)
    const at=(i,t)=>{
      const p=positions[i]
      let result=p
      if(moving.has(i)){
        const angle=start+delta*t,v=sub(p,origin),c=Math.cos(angle),s=Math.sin(angle)
        const spin=cross(axis,v),along=dot(axis,v)
        result=origin.map((x,k)=>x+v[k]*c+spin[k]*s+axis[k]*along*(1-c))
      }
      return result.map((x,k)=>x+m.translationM[k]*t)
    }
    const triangles=piece.faces.map((face,index)=>{
      if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
         face.some(i=>!Number.isInteger(i)||i<0||i>=positions.length))
        throw new Error('Invalid coupled face indices')
      if(face.some(i=>moving.has(i))&&face.some(i=>!moving.has(i)&&
         norm(cross(axis,sub(positions[i],origin)))>1e-8))
        throw new Error('Coupled hinge would deform a material triangle')
      const p=face.map(i=>positions[i]),u=sub(p[1],p[0]),v=sub(p[2],p[0])
      if(norm(cross(u,v))<1e-14)
        throw new Error('Degenerate coupled material triangle')
      const speed=norm(m.translationM)+Math.abs(delta)*Math.max(...face.map(i=>radii[i]))
      const midpoint=face.map(i=>at(i,.5)),b=box(midpoint)
      return {index,face,speed,at:t=>face.map(i=>at(i,t)),
        swept:{min:b.min.map(x=>x-speed/2),max:b.max.map(x=>x+speed/2)}}
    })
    return {id:piece.id,triangles}
  })
  if(owned.size!==payload.particles.length)
    throw new Error('Unowned coupled interval particle')
  const totalPairs=panels.reduce((sum,p,i)=>sum+panels.slice(i+1)
    .reduce((n,q)=>n+p.triangles.length*q.triangles.length,0),0)
  if(!Number.isSafeInteger(totalPairs)||totalPairs>maxFacePairs)
    throw new RangeError('Coupled interval face-pair budget exceeded')
  let certifiedPairs=0,prunedSweptBounds=0,distanceEvaluations=0,blocker=null
  let minimumSampledDistanceMm=null
  const check=(a,b,lo,hi,depth,ids)=>{
    if(blocker)return
    if(distanceEvaluations>=maxDistanceEvaluations){
      blocker={reason:'work-budget',...ids,depth};return
    }
    const mid=(lo+hi)/2,A=a.at(mid),B=b.at(mid)
    const bound=(a.speed+b.speed)*(hi-lo)/2
    // AABB separation is a lower bound on exact triangle distance.
    if(boxGap(box(A),box(B))>clearanceM+bound+1e-12)return
    const d=measureNativeTriangleDistanceM(A,B)
    distanceEvaluations++
    if(!Number.isFinite(d))throw new Error('Nonfinite coupled triangle distance')
    minimumSampledDistanceMm=minimumSampledDistanceMm===null?d*1000:
      Math.min(minimumSampledDistanceMm,d*1000)
    if(d<=clearanceM){
      blocker={reason:'sampled-contact',...ids,depth,fraction:mid,distanceMm:d*1000};return
    }
    if(d>clearanceM+bound+1e-12)return
    if(depth>=maxDepth){
      blocker={reason:'unresolved-motion-bound',...ids,depth,fraction:mid,
        distanceMm:d*1000,motionBoundMm:bound*1000};return
    }
    check(a,b,lo,mid,depth+1,ids)
    check(a,b,mid,hi,depth+1,ids)
  }
  for(let i=0;i<panels.length&&!blocker;i++)for(let j=i+1;j<panels.length&&!blocker;j++)
    for(const a of panels[i].triangles){
      if(blocker)break
      for(const b of panels[j].triangles){
        if(boxGap(a.swept,b.swept)>clearanceM){
          prunedSweptBounds++;certifiedPairs++;continue
        }
        check(a,b,0,1,0,{pieceA:panels[i].id,faceA:a.index,
          pieceB:panels[j].id,faceB:b.index})
        if(blocker)break
        certifiedPairs++
      }
    }
  return {coupledInterpanelIntervalClear:blocker===null,blocker,totalPairs,
    certifiedPairs,prunedSweptBounds,distanceEvaluations,minimumSampledDistanceMm,
    scope:'prescribed-rigid-hinge-plus-translation-interpanel-only',
    intraPanelContactChecked:false,avatarContactChecked:false,
    principalStrainChecked:false,meshQualityApproved:false,
    sweptCollisionCertified:false,physicalAcceptance:false,safeToAutoApply:false}
}
