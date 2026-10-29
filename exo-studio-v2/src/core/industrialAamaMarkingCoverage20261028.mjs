// Opt-in manufacturing-mark inspection of actual Seamly/AAMA DXF wires.
// A LINE on layer 7 has no directional arrow: it cannot establish nap polarity.
// This is NOT receiver CAD authentication, cutter authorization or factory release.
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

const fail=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
  markingGeometryInspected:false,napDirectionVerified:false,
  independentReceiverAuthenticated:false,receiverCadVerified:false,
  aamaCertified:false,astmCertified:false,cuttingAuthorized:false,
  factoryApproved:false,manufacturingApproved:false})
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  [Object.prototype,null].includes(Object.getPrototypeOf(x))
const sameKeys=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&
  keys.every(key=>Object.hasOwn(x,key))
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
const segmentDistance=(p,a,b)=>{
  const dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy
  if(length2<1e-12)return dist(p,a)
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length2))
  return dist(p,{x:a.x+t*dx,y:a.y+t*dy})
}
const edgeDistance=(p,poly)=>poly.reduce((best,a,i)=>
  Math.min(best,segmentDistance(p,a,poly[(i+1)%poly.length])),Infinity)
const inside=(p,poly,tolerance)=>{
  if(edgeDistance(p,poly)<=tolerance)return true
  let hit=false
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j]
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit
  }
  return hit
}
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})
// Test every interval between exact CUT-edge intersections, not a handful of
// samples: narrow concave cut-outs can otherwise conceal an escaping mark.
const cross=(a,b)=>a.x*b.y-a.y*b.x
const within=(a,b,poly,tolerance)=>{
  const r={x:b.x-a.x,y:b.y-a.y},times=[0,1]
  for(let i=0;i<poly.length;i++){
    const c=poly[i],d=poly[(i+1)%poly.length]
    const s={x:d.x-c.x,y:d.y-c.y},delta={x:c.x-a.x,y:c.y-a.y}
    const denom=cross(r,s)
    if(Math.abs(denom)<1e-12)continue
    const t=cross(delta,s)/denom,u=cross(delta,r)/denom
    if(t>=0&&t<=1&&u>=0&&u<=1)times.push(t)
  }
  times.sort((x,y)=>x-y)
  if(!inside(a,poly,tolerance)||!inside(b,poly,tolerance))return false
  for(let i=1;i<times.length;i++){
    if(times[i]-times[i-1]>1e-9&&
      !inside(lerp(a,b,(times[i]+times[i-1])/2),poly,tolerance))return false
  }
  return true
}

/** A caller must explicitly specify the expected marks for EVERY size/piece.
 * No automatic assumption that a missing mark is acceptable. In particular,
 * napDirectionRequired is fail-closed because a plain AAMA grain LINE is
 * undirected. Physical notch anchoring is checked against the CUT contour.
 */
export function inspectIndustrialAamaMarkingCoverage20261028(wiresBySize,{
  unit=null,requirementsBySize=null,toleranceMm=.25,
  notchMinDepthMm=1,notchMaxDepthMm=15,grainMinLengthMm=20,
}={}){
 try{
  if(!sameKeys(wiresBySize,Object.keys(requirementsBySize||{}))||
    !plain(requirementsBySize)||Object.keys(requirementsBySize).length<2||
    Object.keys(requirementsBySize).length>24||
    !['mm','cm','inch'].includes(unit)||
    !Number.isFinite(toleranceMm)||toleranceMm<0||toleranceMm>.5||
    !Number.isFinite(notchMinDepthMm)||notchMinDepthMm<.5||
    !Number.isFinite(notchMaxDepthMm)||notchMaxDepthMm>30||
    notchMinDepthMm>=notchMaxDepthMm||
    !Number.isFinite(grainMinLengthMm)||grainMinLengthMm<10)
    return fail('INVALID_AAMA_MARKING_POLICY')
  const rows=[];let totalBytes=0
  for(const size of Object.keys(requirementsBySize)){
    const wire=wiresBySize[size],policy=requirementsBySize[size]
    if(typeof wire!=='string'||!plain(policy)||!Object.keys(policy).length)
      return fail('INVALID_AAMA_SIZE_MARKING_POLICY',size)
    totalBytes+=new TextEncoder().encode(wire).length
    if(totalBytes>64_000_000)return fail('AAMA_MARKING_WIRE_LIMIT')
    let parsed
    try{parsed=parseSeamlyAamaManufacturingSemantics(wire,{unit})}
    catch(error){return fail('INVALID_AAMA_MARKING_DXF',`${size}: ${error.message}`)}
    const names=parsed.pieces.map(piece=>piece.name)
    if(new Set(names).size!==names.length||!sameKeys(policy,names))
      return fail('AAMA_MARKING_PIECE_IDENTITY_DRIFT',size)
    for(const piece of parsed.pieces){
      const spec=policy[piece.name]
      if(!sameKeys(spec,['expectedNotches','requireGrainline','napDirectionRequired'])||
        !Number.isSafeInteger(spec.expectedNotches)||spec.expectedNotches<0||spec.expectedNotches>64||
        typeof spec.requireGrainline!=='boolean'||typeof spec.napDirectionRequired!=='boolean')
        return fail('INVALID_AAMA_PIECE_MARKING_POLICY',`${size}: ${piece.name}`)
      if(spec.napDirectionRequired)
        return fail('AAMA_NAP_DIRECTION_UNPROVEN',`${size}: ${piece.name}: layer 7 LINE has no direction arrow`)
      if(piece.notches.length!==spec.expectedNotches||
        (spec.requireGrainline&&!piece.grainline)||(!spec.requireGrainline&&piece.grainline))
        return fail('AAMA_REQUIRED_MARKS_MISSING_OR_EXTRA',`${size}: ${piece.name}`)
      const cut=piece.cutOutlineMm.points
      for(const notch of piece.notches){
        const [a,b]=notch.points,length=dist(a,b)
        const aEdge=edgeDistance(a,cut)<=toleranceMm,bEdge=edgeDistance(b,cut)<=toleranceMm
        if(length<notchMinDepthMm||length>notchMaxDepthMm||aEdge===bEdge||
          !within(a,b,cut,toleranceMm))
          return fail('AAMA_NOTCH_CUT_ANCHOR_DRIFT',`${size}: ${piece.name}`)
      }
      if(piece.grainline){
        const [a,b]=piece.grainline.points
        if(dist(a,b)<grainMinLengthMm||!within(a,b,cut,toleranceMm))
          return fail('AAMA_GRAINLINE_GEOMETRY_DRIFT',`${size}: ${piece.name}`)
      }
      rows.push({size,piece:piece.name,notches:piece.notches.length,
        grainlinePresent:Boolean(piece.grainline),napDirectionVerified:false})
    }
  }
  return {ok:true,status:'LOCAL_AAMA_MARKING_GEOMETRY_INSPECTED',issues:[],
    sizeCount:Object.keys(requirementsBySize).length,pieceRows:rows,
    markingGeometryInspected:true,napDirectionVerified:false,
    independentReceiverAuthenticated:false,receiverCadVerified:false,
    aamaCertified:false,astmCertified:false,cuttingAuthorized:false,
    factoryApproved:false,manufacturingApproved:false,
    limitations:'This local Seamly AAMA marking inspection requires explicit per-size expectations. '
      +'Layer 7 grainline is undirected and cannot prove nap polarity. No independent '
      +'receiving CAD, physical cutter, ASTM/AAMA certification or factory sign-off.'}
 }catch(error){return fail('AAMA_MARKING_INSPECTION_REFUSED',String(error.message||error))}
}
