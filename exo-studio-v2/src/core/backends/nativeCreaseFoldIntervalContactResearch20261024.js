// Research-only conservative interval screen for DISJOINT material triangles.
// A rotating half-panel follows a prescribed rigid y-axis crease trajectory.
// For any triangle pair, distance(t) >= distance(midpoint) - maxMotion(A) -
// maxMotion(B). The motion bound is 2*r*sin(deltaAngle/4), where r is the
// greatest moving-vertex radius and deltaAngle is the interval width.
// This does not check adjacent hinge thickness, the avatar, other panels,
// physical mesh quality, or any general-purpose deformable swept CCD.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const boxGap=(a,b)=>Math.hypot(...[0,1,2].map(k=>Math.max(0,
  Math.min(...a.map(p=>p[k]))-Math.max(...b.map(p=>p[k])),
  Math.min(...b.map(p=>p[k]))-Math.max(...a.map(p=>p[k])))))

export function screenNativeCreaseFoldIntervalContactResearch20261024(piece,{
  startAngleRadians=0,endAngleRadians=5*Math.PI/6,
  clearanceM=.001,maxDepth=7,maxPairChecks=200_000,
}={}){
  if(!Number.isFinite(startAngleRadians)||!Number.isFinite(endAngleRadians)||
     startAngleRadians<0||endAngleRadians>Math.PI||
     startAngleRadians>=endAngleRadians||
     !Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.01||
     !Number.isInteger(maxDepth)||maxDepth<0||maxDepth>12||
     !Number.isInteger(maxPairChecks)||maxPairChecks<1||maxPairChecks>1_000_000)
    throw new RangeError('Invalid bounded crease interval screen settings')
  const vertices=piece?.verticesM,faces=piece?.faces
  if(!Array.isArray(vertices)||vertices.length<3||vertices.length>4096||
     vertices.some(p=>!finite3(p))||!Array.isArray(faces)||
     faces.length<2||faces.length>2048)
    throw new TypeError('Invalid crease interval material mesh')
  for(const face of faces){
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       face.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length))
      throw new Error('Invalid crease interval face indices')
    const [a,b,c]=face.map(i=>vertices[i]),u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k])
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
    if(Math.hypot(...cross)<1e-14)throw new Error('Degenerate crease interval rest face')
  }
  const snapshot=JSON.stringify(piece)
  const radii=faces.map(f=>Math.max(0,...f.map(i=>{
    const [x,,z]=vertices[i]
    return x>1e-8?Math.hypot(x,z):0
  })))
  const rotate=(i,angle)=>{
    const [x,y,z]=vertices[i]
    return x>1e-8?[x*Math.cos(angle)-z*Math.sin(angle),y,
      x*Math.sin(angle)+z*Math.cos(angle)]:[x,y,z]
  }
  const faceAt=(index,angle)=>faces[index].map(i=>rotate(i,angle))
  let checkedFacePairs=0,distanceEvaluations=0,boxEvaluations=0
  let certifiedPairs=0,minimumSampledDistanceMm=null
  let blocker=null
  const testPair=(i,j,lo,hi,depth)=>{
    if(blocker)return
    if(++boxEvaluations>maxPairChecks){
      blocker={reason:'work-budget',faceA:i,faceB:j,depth};return
    }
    const mid=(lo+hi)/2, a=faceAt(i,mid),b=faceAt(j,mid)
    const displacement=2*(radii[i]+radii[j])*Math.sin((hi-lo)/4)
    // AABB distance is a rigorous lower bound on triangle distance.
    if(boxGap(a,b)>clearanceM+displacement+1e-12)return
    if(++distanceEvaluations>maxPairChecks){
      blocker={reason:'work-budget',faceA:i,faceB:j,depth};return
    }
    const d=measureNativeTriangleDistanceM(a,b)
    if(!Number.isFinite(d))throw new Error('Nonfinite crease interval distance')
    minimumSampledDistanceMm=minimumSampledDistanceMm===null?d*1000:
      Math.min(minimumSampledDistanceMm,d*1000)
    if(d<clearanceM){
      blocker={reason:'sampled-contact',faceA:i,faceB:j,depth,
        angleRadians:mid,distanceMm:d*1000};return
    }
    if(d>=clearanceM+displacement+1e-12)return
    if(depth>=maxDepth){
      blocker={reason:'unresolved-motion-bound',faceA:i,faceB:j,depth,
        angleRadians:mid,distanceMm:d*1000,
        motionBoundMm:displacement*1000};return
    }
    testPair(i,j,lo,mid,depth+1)
    testPair(i,j,mid,hi,depth+1)
  }
  for(let i=0;i<faces.length&&!blocker;i++)for(let j=i+1;j<faces.length&&!blocker;j++){
    if(faces[i].some(index=>faces[j].includes(index)))continue
    checkedFacePairs++
    testPair(i,j,startAngleRadians,endAngleRadians,0)
    if(!blocker)certifiedPairs++
  }
  if(JSON.stringify(piece)!==snapshot)throw new Error('Crease interval screen mutated material mesh')
  return {nonadjacentIntervalScreenClear:blocker===null,blocker,
    checkedFacePairs,certifiedPairs,boxEvaluations,distanceEvaluations,
    minimumSampledDistanceMm,sourceUnchanged:true,
    adjacentHingeContactChecked:false,interpanelContactChecked:false,
    avatarContactChecked:false,principalStrainChecked:false,
    meshQualityApproved:false,physicalAcceptance:false,
    sweptCollisionCertified:false,safeToAutoApply:false}
}
