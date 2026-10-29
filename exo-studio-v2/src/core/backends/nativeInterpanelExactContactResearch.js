// Research-only STATIC inter-panel thickness screen. The existing AABB
// broadphase deliberately over-reports contact; an exact Euclidean distance
// check can distinguish its false positives without ignoring real overlaps.
// This is neither swept CCD nor avatar-entry or garment-fit certification.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const boxDistance=(a,b)=>Math.hypot(...[0,1,2].map(k=>
  Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])))

export function inspectNativeInterpanelExactStaticContact(payload,{
  clearanceM=.001,maxPairs=1_000_000,maxNarrowphasePairs=100_000,
  maxExamples=8,
}={}){
  if(!Array.isArray(payload?.pieces)||payload.pieces.length<2||
     !Array.isArray(payload?.particles))
    throw new TypeError('Exact interpanel contact requires at least two panels')
  if(!Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.1)
    throw new RangeError('Invalid exact interpanel clearance')
  if(!Number.isInteger(maxPairs)||maxPairs<1||maxPairs>5_000_000||
     !Number.isInteger(maxNarrowphasePairs)||maxNarrowphasePairs<1||
     maxNarrowphasePairs>5_000_000)
    throw new RangeError('Invalid exact interpanel pair budget')
  if(!Number.isInteger(maxExamples)||maxExamples<1||maxExamples>256)
    throw new RangeError('Invalid exact interpanel witness limit')
  const counts=payload.pieces.map(p=>p.faces?.length)
  if(counts.some(n=>!Number.isInteger(n)||n<1))
    throw new Error('Invalid exact interpanel triangle count')
  const upper=counts.reduce((sum,n,i)=>sum+
    counts.slice(i+1).reduce((total,m)=>total+n*m,0),0)
  if(!Number.isSafeInteger(upper)||upper>maxPairs)
    throw new RangeError('Exact interpanel pair budget exceeded')
  const panels=payload.pieces.map(piece=>({id:piece.id,
    triangles:piece.faces.map((face,index)=>{
      if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
         !Array.isArray(piece.particleIndices)||
         face.some(i=>!Number.isInteger(i)||i<0||i>=piece.particleIndices.length))
        throw new Error('Invalid exact interpanel triangle topology')
      const points=face.map(i=>payload.particles[piece.particleIndices[i]]?.position)
      if(!points.every(finite3))throw new Error('Invalid exact interpanel position')
      // Validate EVERY face before broadphase pruning. Otherwise a collapsed
      // triangle far from the other panels can be skipped and the entire
      // seed incorrectly reported as contact-clear. Match the narrowphase's
      // nondegenerate-face floor, including nonfinite intermediate arithmetic.
      const [a,b,c]=points
      const u=a.map((v,k)=>b[k]-v),v=a.map((x,k)=>c[k]-x)
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
        u[0]*v[1]-u[1]*v[0]]
      const area2=n.reduce((sum,x)=>sum+x*x,0)
      if(!Number.isFinite(area2)||area2<1e-28)
        throw new Error('Degenerate exact interpanel triangle')
      return {index,points,
        min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),
        max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))}
    }),
  }))
  let broadphasePotentialPairs=0,narrowphaseCheckedPairs=0,nearClearancePairs=0
  let minimumExactGapM=Infinity
  const nearClearanceExamples=[]
  const compare=(a,b)=>a.distanceMm-b.distanceMm||
    String(a.pieceA).localeCompare(String(b.pieceA))||a.faceA-b.faceA||
    String(a.pieceB).localeCompare(String(b.pieceB))||a.faceB-b.faceB
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){
    const a=panels[i],b=panels[j]
    for(const x of a.triangles)for(const y of b.triangles){
      if(boxDistance(x,y)>clearanceM)continue
      broadphasePotentialPairs++
      if(++narrowphaseCheckedPairs>maxNarrowphasePairs)
        throw new RangeError('Exact interpanel narrowphase pair budget exceeded')
      const distanceM=measureNativeTriangleDistanceM(x.points,y.points)
      minimumExactGapM=Math.min(minimumExactGapM,distanceM)
      if(distanceM>clearanceM)continue
      nearClearancePairs++
      nearClearanceExamples.push({pieceA:a.id,faceA:x.index,
        pieceB:b.id,faceB:y.index,distanceMm:distanceM*1000})
      nearClearanceExamples.sort(compare)
      if(nearClearanceExamples.length>maxExamples)nearClearanceExamples.pop()
    }
  }
  return {checkedTrianglePairs:upper,broadphasePotentialPairs,
    narrowphaseCheckedPairs,nearClearancePairs,
    minimumExactGapMm:Number.isFinite(minimumExactGapM)?minimumExactGapM*1000:null,
    nearClearanceExamples,
    allNearPairsRepresented:nearClearancePairs===nearClearanceExamples.length,
    staticInterpanelExactClear:nearClearancePairs===0,
    triangleNarrowPhaseChecked:true,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false}
}
