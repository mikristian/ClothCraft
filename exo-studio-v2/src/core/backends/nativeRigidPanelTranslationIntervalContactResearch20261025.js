// Research-only conservative INTER-PANEL interval clearance for prescribed
// rigid, linearly translated panels. A triangle's relative translation is
// constant, so exact triangle distance is Lipschitz with constant |vB-vA|.
// This is NOT deformable cloth CCD, hinge-contact, self-contact, avatar-entry
// validation, or permission to apply a candidate to the saved garment.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&
  p.every(x=>Number.isFinite(x)&&Math.abs(x)<=100)
const length=p=>Math.hypot(...p)
const distanceBox=(a,b)=>Math.hypot(...[0,1,2].map(k=>
  Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])))
const moved=(triangle,velocity,t)=>triangle.map(p=>
  p.map((x,k)=>x+t*velocity[k]))
const bounds=(triangle,velocity)=>({
  min:[0,1,2].map(k=>Math.min(...triangle.map(p=>p[k]),
    ...triangle.map(p=>p[k]+velocity[k]))),
  max:[0,1,2].map(k=>Math.max(...triangle.map(p=>p[k]),
    ...triangle.map(p=>p[k]+velocity[k]))),
})

export function screenNativeRigidPanelTranslationIntervalContact20261025(
  payload,translationsM,{clearanceM=.001,maxDepth=8,
    maxFacePairs=500_000,maxDistanceEvaluations=100_000}={}){
  if(!Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.01||
     !Number.isInteger(maxDepth)||maxDepth<0||maxDepth>12||
     !Number.isInteger(maxFacePairs)||maxFacePairs<1||maxFacePairs>1_000_000||
     !Number.isInteger(maxDistanceEvaluations)||maxDistanceEvaluations<1||
     maxDistanceEvaluations>1_000_000)
    throw new RangeError('Invalid rigid translation interval budget')
  if(!Array.isArray(payload?.pieces)||payload.pieces.length<2||
     payload.pieces.length>8||!Array.isArray(payload?.particles)||
     payload.particles.length>4096||!translationsM||
     typeof translationsM!=='object'||Array.isArray(translationsM))
    throw new TypeError('Invalid rigid translation interval payload')
  const ids=payload.pieces.map(p=>p?.id)
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||
     Object.keys(translationsM).length!==ids.length||
     ids.some(id=>!Object.hasOwn(translationsM,id)||
       !finite3(translationsM[id])||length(translationsM[id])>1))
    throw new Error('Invalid rigid translation panel velocities')
  const ownedParticles=new Set()
  const panels=payload.pieces.map(piece=>{
    if(!Array.isArray(piece.faces)||piece.faces.length<1||piece.faces.length>2048||
       !Array.isArray(piece.particleIndices)||piece.particleIndices.length<3)
      throw new Error('Invalid rigid translation panel topology')
    for(const index of piece.particleIndices){
      if(!Number.isInteger(index)||index<0||index>=payload.particles.length||
         ownedParticles.has(index)||payload.particles[index]?.pieceId!==piece.id||
         !finite3(payload.particles[index].position))
        throw new Error('Invalid rigid translation particle ownership')
      ownedParticles.add(index)
    }
    const triangles=piece.faces.map((face,index)=>{
      if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
         face.some(i=>!Number.isInteger(i)||i<0||i>=piece.particleIndices.length))
        throw new Error('Invalid rigid translation face indices')
      const points=face.map(i=>{
        const particle=payload.particles[piece.particleIndices[i]]
        if(particle?.pieceId!==piece.id||!finite3(particle.position))
          throw new Error('Invalid rigid translation particle provenance')
        return particle.position
      })
      const u=points[1].map((x,k)=>x-points[0][k])
      const v=points[2].map((x,k)=>x-points[0][k])
      const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
        u[0]*v[1]-u[1]*v[0]]
      if(length(cross)<1e-14)throw new Error('Degenerate rigid translation face')
      return {index,points,sweptBounds:bounds(points,translationsM[piece.id])}
    })
    return {id:piece.id,velocity:translationsM[piece.id],triangles}
  })
  if(ownedParticles.size!==payload.particles.length)
    throw new Error('Unowned rigid translation particle')
  const totalPairs=panels.reduce((sum,p,i)=>sum+panels.slice(i+1)
    .reduce((s,q)=>s+p.triangles.length*q.triangles.length,0),0)
  if(!Number.isSafeInteger(totalPairs)||totalPairs>maxFacePairs)
    throw new RangeError('Rigid translation face-pair budget exceeded')
  let distanceEvaluations=0,prunedSweptBounds=0,certifiedPairs=0
  let minimumSampledDistanceMm=null,blocker=null
  const check=(a,b,velocityA,velocityB,relativeSpeed,lo,hi,depth,ids)=>{
    if(blocker)return
    if(distanceEvaluations>=maxDistanceEvaluations){
      blocker={reason:'work-budget',...ids,depth};return
    }
    const mid=(lo+hi)/2
    const first=moved(a.points,velocityA,mid)
    const second=moved(b.points,velocityB,mid)
    const d=measureNativeTriangleDistanceM(first,second)
    distanceEvaluations++
    if(!Number.isFinite(d))throw new Error('Nonfinite rigid translation distance')
    minimumSampledDistanceMm=minimumSampledDistanceMm===null?d*1000:
      Math.min(minimumSampledDistanceMm,d*1000)
    if(d<=clearanceM){
      blocker={reason:'sampled-contact',...ids,depth,fraction:mid,
        distanceMm:d*1000};return
    }
    const motionBoundM=relativeSpeed*(hi-lo)/2
    if(d>clearanceM+motionBoundM+1e-12)return
    if(depth>=maxDepth){
      blocker={reason:'unresolved-motion-bound',...ids,depth,
        fraction:mid,distanceMm:d*1000,motionBoundMm:motionBoundM*1000};return
    }
    check(a,b,velocityA,velocityB,relativeSpeed,lo,mid,depth+1,ids)
    check(a,b,velocityA,velocityB,relativeSpeed,mid,hi,depth+1,ids)
  }
  for(let i=0;i<panels.length&&!blocker;i++)
    for(let j=i+1;j<panels.length&&!blocker;j++){
      const a=panels[i],b=panels[j]
      const relativeSpeed=length(b.velocity.map((x,k)=>x-a.velocity[k]))
      for(const x of a.triangles){
        if(blocker)break
        for(const y of b.triangles){
          if(distanceBox(x.sweptBounds,y.sweptBounds)>clearanceM){
            prunedSweptBounds++;certifiedPairs++;continue
          }
          check(x,y,a.velocity,b.velocity,relativeSpeed,0,1,0,
            {pieceA:a.id,faceA:x.index,pieceB:b.id,faceB:y.index})
          if(blocker)break
          certifiedPairs++
        }
      }
    }
  return {rigidInterpanelIntervalClear:blocker===null,blocker,
    totalPairs,certifiedPairs,prunedSweptBounds,distanceEvaluations,
    minimumSampledDistanceMm,
    scope:'rigid-linear-translation-interpanel-only',
    intrapanelContactChecked:false,hingeContactChecked:false,
    avatarContactChecked:false,principalStrainChecked:false,
    sweptCollisionCertified:false,physicalAcceptance:false,
    safeToAutoApply:false}
}
