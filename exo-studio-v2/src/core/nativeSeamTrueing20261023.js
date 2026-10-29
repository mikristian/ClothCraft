import {nativeRustEdgeLength20261023,nativeRustArcLengthStation20261023} from './nativeRustArcLengthCompat20261023.js'

// A seam truing DIAGNOSTIC, not a cutter-ready reshaping or seam-ease solver.
// Matches the native Rust edge arclength sampling and names but does not
// rewrite sewn endpoints, free curve derivatives, notches, or graded sizes.
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const diff=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const magnitude=p=>Math.hypot(...p)
const mul=(p,t)=>p.map(v=>v*t)
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0]
const rotate=(p,cos,sin)=>[p[0]*cos-p[1]*sin,p[0]*sin+p[1]*cos]
const angleDeg=(a,b)=>Math.atan2(Math.abs(cross(a,b)),dot(a,b))*180/Math.PI
const resultFail=reason=>({ok:false,reason,issues:[reason],manufacturingApproved:false})

const endpoint=(polygon,edge,end)=>{
  const i=polygon.edges.indexOf(edge)
  if(i<0||!Array.isArray(polygon.points)||!polygon.points.every(point))throw Error('Invalid seam panel vertices')
  return polygon.points[end?((i+1)%polygon.points.length):i]
}
const matched=(edge,side)=>Array.isArray(edge?.range)&&edge.range.length===2&&
  edge.range.every(Number.isFinite)&&Math.abs(edge.range[0])<1e-8&&Math.abs(edge.range[1]-1)<1e-8

const station=(polygon,edge,total,fraction)=>{
  if(fraction<=0)return [...endpoint(polygon,edge,0)]
  if(fraction>=1)return [...endpoint(polygon,edge,1)]
  const measured=nativeRustArcLengthStation20261023(polygon,edge,{distanceM:total*fraction})
  if(!measured.ok)throw Error(`Unable to sample true seam station: ${measured.reason}`)
  return measured.position
}

/** Inspect two full-length sewn boundaries after chord-based rigid alignment.
 * `reverse_b` is the Rust sewing correspondence bit, not an arbitrary guessed
 * design rule. The shape residuals are measured at physically matched stations
 * and highlight differences, including tangent mismatch at seam joins.
 */
export function inspectNativeSeamTrueing20261023(snapshot,{
  seamId,stations=9,lengthToleranceMm=2,shapeToleranceMm=3,tangentToleranceDegrees=5,
}={}){
  try{
    if(!snapshot?.template||typeof seamId!=='string'||!seamId)throw Error('Select a saved native sewing relationship')
    if(!Number.isInteger(stations)||stations<5||stations>33)throw Error('Station count must be 5–33')
    for(const [key,n,min,max] of [['lengthToleranceMm',lengthToleranceMm,0,100],['shapeToleranceMm',shapeToleranceMm,0,100],['tangentToleranceDegrees',tangentToleranceDegrees,0,90]]){
      if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(`Invalid ${key}`)
    }
    const seams=snapshot.template.seams?.filter(s=>s?.id===seamId)
    if(seams?.length!==1)throw Error('Missing or ambiguous saved sewing relationship')
    const seam=seams[0]
    if(!matched(seam.a)||!matched(seam.b))throw Error('Partial or invalid seam intervals require an independent interval-aware truing solver')
    if(typeof seam.reverse_b!=='boolean'||typeof seam.allow_ease!=='boolean')throw Error('Sewing metadata lacks explicit direction/ease settings')
    const panels=snapshot.template.panels
    const find=ref=>{
      const matches=panels?.filter(p=>p?.id===ref?.panel)
      if(matches?.length!==1||!matches[0].polygon||typeof ref.edge!=='string')throw Error('Named native sewing edge is unavailable')
      return matches[0].polygon
    }
    const a=find(seam.a),b=find(seam.b)
    const first=nativeRustEdgeLength20261023(a,seam.a.edge)
    const second=nativeRustEdgeLength20261023(b,seam.b.edge)
    if(!first.ok||!second.ok)throw Error(first.reason||second.reason||'Invalid native sewn curve')
    const al=first.totalLengthM,bl=second.totalLengthM
    if(!(al>1e-4&&bl>1e-4))throw Error('Sewn material edge is too short for reliable truing')
    const reverse=seam.reverse_b
    const aa=station(a,seam.a.edge,al,0),az=station(a,seam.a.edge,al,1)
    const ba=station(b,seam.b.edge,bl,reverse?1:0),bz=station(b,seam.b.edge,bl,reverse?0:1)
    const axisA=diff(az,aa),axisB=diff(bz,ba)
    const lenA=magnitude(axisA),lenB=magnitude(axisB)
    if(lenA<.0001||lenB<.0001)throw Error('Closed or degenerate seam chord cannot be aligned for truing')
    const cos=dot(axisA,axisB)/(lenA*lenB),sin=cross(axisB,axisA)/(lenA*lenB)
    const rows=[]
    const spacing=1/(stations-1)
    for(let i=0;i<stations;i++){
      const f=spacing*i
      const pa=station(a,seam.a.edge,al,f)
      const pb=station(b,seam.b.edge,bl,reverse?1-f:f)
      const relativeB=rotate(diff(pb,ba),cos,sin)
      const mappedB=[aa[0]+relativeB[0],aa[1]+relativeB[1]]
      const delta=diff(pa,mappedB)
      const along=dot(delta,axisA)/lenA
      const normal=cross(axisA,delta)/lenA
      rows.push({fraction:f,arclengthAmm:f*al*1000,arclengthBmm:f*bl*1000,
        alongMm:along*1000,normalMm:normal*1000,deviationMm:magnitude(delta)*1000,
        firstMm:pa.map(v=>v*1000),secondAlignedMm:mappedB.map(v=>v*1000)})
    }
    const unitTangent=(polygon,edge,total,f)=>{
      const delta=Math.min(.002/total,.02)
      const start=Math.max(0,f-delta),end=Math.min(1,f+delta)
      const p=station(polygon,edge,total,start),q=station(polygon,edge,total,end)
      const d=diff(q,p),m=magnitude(d)
      if(m<1e-9)throw Error('Collapsed local sewing tangent')
      return mul(d,1/m)
    }
    const tangent=at=>{
      const va=unitTangent(a,seam.a.edge,al,at)
      const vb=unitTangent(b,seam.b.edge,bl,reverse?1-at:at)
      const aligned=rotate(reverse?mul(vb,-1):vb,cos,sin)
      return angleDeg(va,aligned)
    }
    const tangents={startDeg:tangent(0),endDeg:tangent(1)}
    const maxShapeMm=Math.max(...rows.map(r=>Math.abs(r.normalMm)))
    const rmsShapeMm=Math.sqrt(rows.reduce((sum,r)=>sum+r.normalMm**2,0)/rows.length)
    const maxTangentDegrees=Math.max(tangents.startDeg,tangents.endDeg)
    const lengthMismatchMm=Math.abs(al-bl)*1000
    const issues=[]
    if(seam.allow_ease)issues.push('EASE_ENABLED: material mismatch may be intentional; shape truing needs a specified ease distribution')
    if(lengthMismatchMm>lengthToleranceMm)issues.push('SEAM_LENGTH_MISMATCH')
    if(maxShapeMm>shapeToleranceMm)issues.push('SEAM_SHAPE_NORMAL_RESIDUAL')
    if(maxTangentDegrees>tangentToleranceDegrees)issues.push('JOIN_TANGENT_DISCONTINUITY')
    return {ok:true,seamId,revision:snapshot.revision,panels:[seam.a.panel,seam.b.panel],
      edgeNames:[seam.a.edge,seam.b.edge],reversedSecond:reverse,easeEnabled:seam.allow_ease,
      lengthsMm:[al*1000,bl*1000],lengthMismatchMm,maxShapeMm,rmsShapeMm,
      maxTangentDegrees,tangents,rows,issues,referenceWithinTolerance:issues.length===0,
      referenceTolerance:{lengthMm:lengthToleranceMm,shapeMm:shapeToleranceMm,tangentDegrees:tangentToleranceDegrees},
      method:'RUST_COMPAT_MATERIAL_ARCLENGTH_CHORD_ALIGNMENT',manufacturingApproved:false,
      caveat:'Measured whole-edge physical seam-shape and tangents; no cutline offset, notch transfer, ease allocation, multi-size verification, physical sample or factory approval.'}
  }catch(error){return resultFail(error.message||String(error))}
}
