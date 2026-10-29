// Research-only STATIC geometric classification of exact inter-panel witnesses.
// A zero triangle distance is not itself evidence of penetration. Conversely,
// a sewing-adjacent pair is never exempt from the cloth contact veto.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const sub=(a,b)=>a.map((x,i)=>x-b[i])
const add=(a,b)=>a.map((x,i)=>x+b[i])
const mul=(a,s)=>a.map(x=>x*s)
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm=a=>Math.hypot(...a)
const valid3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)

function strictEdgePiercing(first,second,planeToleranceM){
  const origin=second[0],u=sub(second[1],origin),v=sub(second[2],origin)
  const n=cross(u,v),length=norm(n),unit=mul(n,1/length)
  const uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),den=uu*vv-uv*uv
  for(let i=0;i<3;i++){
    const p=first[i],q=first[(i+1)%3]
    const d0=dot(sub(p,origin),unit),d1=dot(sub(q,origin),unit)
    // A boundary endpoint or a near-plane endpoint is ambiguous, not a
    // certified transverse interior crossing.
    if(!((d0>planeToleranceM&&d1< -planeToleranceM)||
         (d1>planeToleranceM&&d0< -planeToleranceM)))continue
    const t=d0/(d0-d1)
    if(t<=1e-8||t>=1-1e-8)continue
    const point=add(p,mul(sub(q,p),t)),w=sub(point,origin)
    const s=(dot(w,u)*vv-dot(w,v)*uv)/den
    const r=(dot(w,v)*uu-dot(w,u)*uv)/den
    if(s>1e-8&&r>1e-8&&1-s-r>1e-8)
      return {pointM:point,edgeIndex:i,edgeFraction:t}
  }
  return null
}

const signedArea2=poly=>poly.reduce((sum,p,i)=>{
  const q=poly[(i+1)%poly.length]
  return sum+p[0]*q[1]-p[1]*q[0]
},0)

function coplanarOverlapAreaM2(a,b,planeToleranceM){
  const n=cross(sub(a[1],a[0]),sub(a[2],a[0]))
  const m=cross(sub(b[1],b[0]),sub(b[2],b[0]))
  const ln=norm(n),lm=norm(m)
  if(norm(cross(n,m))/(ln*lm)>1e-8||
     b.some(p=>Math.abs(dot(sub(p,a[0]),n))/ln>planeToleranceM))
    return null
  const skip=[0,1,2].sort((i,j)=>Math.abs(n[j])-Math.abs(n[i]))[0]
  const project=p=>p.filter((_,i)=>i!==skip)
  let poly=a.map(project)
  const clip=b.map(project),orientation=Math.sign(signedArea2(clip))
  if(!orientation)return null
  const side=(p,q,x)=>orientation*((q[0]-p[0])*(x[1]-p[1])-
    (q[1]-p[1])*(x[0]-p[0]))
  for(let i=0;i<3;i++){
    const p=clip[i],q=clip[(i+1)%3],input=poly
    poly=[]
    if(!input.length)break
    for(let j=0;j<input.length;j++){
      const start=input[j],end=input[(j+1)%input.length]
      const ds=side(p,q,start),de=side(p,q,end)
      if((ds>0&&de<0)||(ds<0&&de>0)){
        const t=ds/(ds-de)
        poly.push(start.map((x,k)=>x+t*(end[k]-x)))
      }
      if(de>=0)poly.push(end)
    }
  }
  return poly.length<3?0:Math.abs(signedArea2(poly))*.5*ln/Math.abs(n[skip])
}

export function inspectNativeInterpanelPenetrationWitnesses(pose,witnesses,{
  planeToleranceM=1e-9,clearanceM=.001,
}={}){
  if(!Array.isArray(pose?.pieces)||!Array.isArray(pose?.particles)||
     !Array.isArray(witnesses)||witnesses.length>256||
     !Number.isFinite(planeToleranceM)||planeToleranceM<=0||
     planeToleranceM>1e-6||!Number.isFinite(clearanceM)||
     clearanceM<=planeToleranceM||clearanceM>.1)
    throw new Error('Invalid bounded penetration witness input')
  const pieces=new Map()
  for(const piece of pose.pieces){
    if(typeof piece?.id!=='string'||pieces.has(piece.id)||
       !Array.isArray(piece.faces)||!Array.isArray(piece.particleIndices))
      throw new Error('Invalid penetration witness piece')
    pieces.set(piece.id,piece)
  }
  const result=witnesses.map(w=>{
    const a=pieces.get(w?.pieceA),b=pieces.get(w?.pieceB)
    if(!a||!b||a===b||!Number.isInteger(w.faceA)||
       !Number.isInteger(w.faceB)||!Number.isFinite(w.distanceMm)||
       w.distanceMm<0)throw new Error('Invalid penetration witness pair')
    const facePoints=(piece,index)=>{
      const face=piece.faces[index]
      if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
         face.some(i=>!Number.isInteger(i)||i<0||i>=piece.particleIndices.length))
        throw new Error('Invalid penetration witness face')
      const points=face.map(i=>pose.particles[piece.particleIndices[i]]?.position)
      if(!points.every(valid3))throw new Error('Invalid penetration witness position')
      return points
    }
    const x=facePoints(a,w.faceA),y=facePoints(b,w.faceB)
    const gapM=measureNativeTriangleDistanceM(x,y)
    if(Math.abs(gapM*1000-w.distanceMm)>1e-6||gapM>clearanceM+1e-9)
      throw new Error('Stale or mismatched penetration witness geometry')
    const piercing=strictEdgePiercing(x,y,planeToleranceM)||
      strictEdgePiercing(y,x,planeToleranceM)
    const overlapAreaM2=coplanarOverlapAreaM2(x,y,planeToleranceM)
    const classification=piercing?'strict_transverse_piercing':
      overlapAreaM2!==null&&overlapAreaM2>1e-12?
        'coplanar_positive_area_overlap':
        gapM>planeToleranceM?'subclearance_disjoint':'zero_gap_unresolved'
    return {...w,geometricClassification:classification,
      measuredGapMm:gapM*1000,
      strictPiercingPointM:piercing?.pointM||null,
      coplanarOverlapAreaMm2:overlapAreaM2===null?null:overlapAreaM2*1e6,
      collisionExemptionGranted:false}
  })
  const count=classification=>result.filter(w=>
    w.geometricClassification===classification).length
  return {totalWitnesses:result.length,
    strictTransversePiercings:count('strict_transverse_piercing'),
    coplanarPositiveAreaOverlaps:count('coplanar_positive_area_overlap'),
    subclearanceDisjointPairs:count('subclearance_disjoint'),
    zeroGapUnresolvedPairs:count('zero_gap_unresolved'),
    witnesses:result,staticContactCertified:false,sweptCollisionCertified:false,
    avatarEntryCertified:false,fitCertified:false,
    collisionExemptionGranted:false,safeToAutoApply:false}
}
