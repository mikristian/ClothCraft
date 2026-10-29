import { seamAllowanceBoundary } from './project.js'

const EPS = 1e-7
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const dot = (a,b) => a.x*b.x+a.y*b.y
const dist2 = (a,b) => (a.x-b.x)**2+(a.y-b.y)**2
function onSegment(p,a,b) { return Math.abs(cross(a,b,p))<=EPS && p.x>=Math.min(a.x,b.x)-EPS && p.x<=Math.max(a.x,b.x)+EPS && p.y>=Math.min(a.y,b.y)-EPS && p.y<=Math.max(a.y,b.y)+EPS }
function intersect(a,b,c,d) {
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b)
  return (x*y < -EPS && z*w < -EPS) || (Math.abs(x)<=EPS&&onSegment(c,a,b)) || (Math.abs(y)<=EPS&&onSegment(d,a,b)) || (Math.abs(z)<=EPS&&onSegment(a,c,d)) || (Math.abs(w)<=EPS&&onSegment(b,c,d))
}
function inside(p,poly) {
  let result=false
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j]
    if(onSegment(p,a,b)) return true
    if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) result=!result
  }
  return result
}
function pointSegmentDistance2(p,a,b) {
  const v={x:b.x-a.x,y:b.y-a.y}, w={x:p.x-a.x,y:p.y-a.y},len=dot(v,v)
  const t=len ? Math.max(0,Math.min(1,dot(w,v)/len)) : 0
  return dist2(p,{x:a.x+t*v.x,y:a.y+t*v.y})
}
function polygonConflict(a,b,gap) {
  // A polygon may sit wholly inside a concavity without touching another
  // edge.  Check both end points of each edge for clearance as well as the
  // edge pair distances below.
  for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) {
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length]
    if(intersect(p,q,r,s)) return true
    if(gap>EPS && (pointSegmentDistance2(p,r,s)<(gap-EPS)**2 || pointSegmentDistance2(q,r,s)<(gap-EPS)**2 ||
      pointSegmentDistance2(r,p,q)<(gap-EPS)**2 || pointSegmentDistance2(s,p,q)<(gap-EPS)**2)) return true
  }
  return inside(a[0],b)||inside(b[0],a)
}
const bounds = poly => ({minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minY:Math.min(...poly.map(p=>p.y)),maxY:Math.max(...poly.map(p=>p.y))})
function validPolygon(poly) {
  if(!Array.isArray(poly)||poly.length<3||poly.length>2000||poly.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))) return false
  let area=0
  for(let i=0;i<poly.length;i++) {
    const a=poly[i],b=poly[(i+1)%poly.length]
    if(dist2(a,b)<EPS*EPS) return false
    area+=a.x*b.y-b.x*a.y
    for(let j=i+1;j<poly.length;j++) {
      if(j===i+1||(i===0&&j===poly.length-1)) continue
      if(intersect(a,b,poly[j],poly[(j+1)%poly.length])) return false
    }
  }
  return Number.isFinite(area) && Math.abs(area)>EPS
}
function rotate(poly,deg) {
  const rad=deg*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad)
  return poly.map(p=>({x:p.x*c-p.y*s,y:p.x*s+p.y*c}))
}
function options(piece,{foldEdge=null}={}) {
  const angle=Number(piece.grainAngleDeg)
  if(!Number.isFinite(angle)) throw Error('missing-grain-angle')
  const folded=Boolean(piece.marker?.fold||piece.cutOnFold||piece.fold||piece.marker?.onFold)
  if(folded&&foldEdge===null)throw Error('fold-requires-dedicated-layout')
  if(folded&&(piece.marker?.fold!==true&&piece.marker?.onFold!==true&&piece.cutOnFold!==true&&piece.fold!==true))throw Error('unsupported-fold-declaration')
  if(piece.marker?.nap !== 'one-way' && piece.marker?.nap !== 'none') throw Error('missing-nap-semantics')
  if(piece.holes?.length || piece.cutHoles?.length || piece.internalCutouts?.length) throw Error('holes-unsupported')
  const poly=seamAllowanceBoundary(piece,8)
  if(!validPolygon(poly)) throw Error('invalid-physical-cutline')
  const rotations=[-angle]
  if(piece.marker.nap==='none' && piece.marker.allowReverseGrain) rotations.push(180-angle)
  if(piece.marker.nap==='none' && piece.marker.allowCrossGrain) rotations.push(90-angle,270-angle)
  return [...new Set(rotations.map(r=>((r%360)+360)%360))].flatMap(rotationDeg=>{
    const raw=rotate(poly,rotationDeg),b=bounds(raw)
    const outline=raw.map(p=>({x:p.x-b.minX,y:p.y-b.minY}))
    if(!folded)return [{rotationDeg,outline,width:b.maxX-b.minX,height:b.maxY-b.minY}]
    const edgeIndex=piece.marker?.foldEdgeIndex
    if(!Number.isInteger(edgeIndex)||edgeIndex<0||edgeIndex>=outline.length)throw Error('fold-edge-index-required')
    const a=outline[edgeIndex],z=outline[(edgeIndex+1)%outline.length]
    if(Math.abs(a.x-z.x)>EPS||Math.abs(a.y-z.y)<=EPS)return []
    if(foldEdge==='left'&&Math.abs(a.x)>EPS)return []
    if(foldEdge==='right'&&Math.abs(a.x-(b.maxX-b.minX))>EPS)return []
    return [{rotationDeg,outline,width:b.maxX-b.minX,height:b.maxY-b.minY,folded:true}]
  })
}
/** Deterministic bounded polygon marker. Coordinates and fabric width are centimeters.
 * Every piece requires explicit grainAngleDeg and marker.nap ('none' or 'one-way').
 * This geometric preview does not constitute manufacturing approval.
 */
export function nestPolygons(project,{fabricWidth=150,gap=1.5,maxLength=1000,maxCandidates=30000,fabricId=null,placementOrder='input',foldEdge=null,defectZones=[],repeatRegistration=null}={}) {
  const placements=[],unplaced=[],errors=[]
  if(![fabricWidth,gap,maxLength,maxCandidates].every(Number.isFinite)||fabricWidth<=0||gap<0||maxLength<=0||!Number.isSafeInteger(maxCandidates)||maxCandidates<1||!['input','largest-first'].includes(placementOrder)) return {ok:false,placements,unplaced,errors:['invalid-layout-limits'],metrics:null,manufacturingApproved:false}
  if((foldEdge!==null&&!['left','right'].includes(foldEdge))||!Array.isArray(defectZones)||defectZones.length>200||
     defectZones.some(d=>!d||![d.x,d.y,d.width,d.height].every(Number.isFinite)||d.x<0||d.y<0||d.width<=0||d.height<=0||d.x+d.width>fabricWidth+EPS||d.y+d.height>maxLength+EPS))
    return {ok:false,placements,unplaced,errors:['invalid-physical-constraints'],metrics:null,manufacturingApproved:false}
  const excluded=defectZones.map(d=>({outline:[{x:d.x,y:d.y},{x:d.x+d.width,y:d.y},{x:d.x+d.width,y:d.y+d.height},{x:d.x,y:d.y+d.height}],...d}))
  if(repeatRegistration!==null&&project?.pieces?.some(piece=>{
    if(fabricId&&(piece.fabricId||'main')!==fabricId)return false
    const anchors=piece.marker?.repeatAnchorsBySize
    const anchor=anchors?.[project.previewSize||project.grading?.baseSize]
    return !anchor||!Number.isFinite(anchor.anchorXcm)||!Number.isFinite(anchor.anchorYcm)||
      [['repeatXcm','targetXcm'],['repeatYcm','targetYcm']].some(([period,target])=>
        Object.hasOwn(repeatRegistration,period)&&(!Number.isFinite(anchor[target])||
          anchor[target]<0||anchor[target]>=repeatRegistration[period]))
  }))return {ok:false,placements,unplaced,errors:['invalid-repeat-anchor'],metrics:null,manufacturingApproved:false}
  if(repeatRegistration!==null&&(!repeatRegistration||typeof repeatRegistration!=='object'||Array.isArray(repeatRegistration)||
    !['repeatXcm','repeatYcm'].some(k=>Object.hasOwn(repeatRegistration,k))||
    !Number.isFinite(repeatRegistration.toleranceCm)||repeatRegistration.toleranceCm<0||repeatRegistration.toleranceCm>.1||
    [['repeatXcm','originXcm'],['repeatYcm','originYcm']].some(([period,origin])=>
      (Object.hasOwn(repeatRegistration,period)||Object.hasOwn(repeatRegistration,origin))&&
      (!Number.isFinite(repeatRegistration[period])||repeatRegistration[period]<=0||
       !Number.isFinite(repeatRegistration[origin])||repeatRegistration.toleranceCm>=repeatRegistration[period]/2))))
    return {ok:false,placements,unplaced,errors:['invalid-repeat-registration'],metrics:null,manufacturingApproved:false}
  if(repeatRegistration!==null&&project?.pieces?.some(piece=>
    (!fabricId||(piece.fabricId||'main')===fabricId)&&
    (piece.marker?.repeatAnchorsBySize===undefined||
      !Object.hasOwn(piece.marker.repeatAnchorsBySize,project.previewSize||project.grading?.baseSize))))
    return {ok:false,placements,unplaced,errors:['missing-authored-size-repeat-anchor'],metrics:null,manufacturingApproved:false}
  // Keep fold/defect constraints explicit: a pin or defect which cannot be
  // proven from source geometry is not converted into an ordinary free piece.
  if(foldEdge!==null&&project?.markerSettings?.foldEdge!==undefined&&project.markerSettings.foldEdge!==foldEdge)
    return {ok:false,placements,unplaced,errors:['conflicting-fold-edge'],metrics:null,manufacturingApproved:false}
  const entries=[]
  for(const piece of project?.pieces||[]) {
    if(fabricId && (piece.fabricId||'main')!==fabricId) continue
    try {
      const qty=Number(piece.cutQuantity)
      if(!Number.isSafeInteger(qty)||qty<1||qty>99) throw Error('invalid-cut-quantity')
      const opts=options(piece,{foldEdge})
      if(!opts.length)throw Error('no-fold-edge-aligned-orientation')
      for(let instance=0;instance<qty;instance++) entries.push({piece,instance,opts})
    } catch(e) { errors.push({pieceId:piece.id,reason:e.message}) }
  }
  if(errors.length) return {ok:false,placements,unplaced,errors,metrics:null,manufacturingApproved:false}
  // Prioritize pieces with the largest minimum physical footprint when requested.
  // Keep quantity instance identities stable for guarded manual edits and export.
  if(placementOrder==='largest-first') entries.sort((a,b)=>{
    const footprint=entry=>Math.min(...entry.opts.map(o=>o.width*o.height))
    return footprint(b)-footprint(a)
  })
  let checks=0
  for(const entry of entries) {
    let best=null
    for(const option of entry.opts) {
      if(option.width>fabricWidth+EPS||option.height>maxLength+EPS) continue
      const candidates=new Map()
      const add=(x,y)=>{
        if(!Number.isFinite(x)||!Number.isFinite(y)||x < -EPS||y < -EPS||x+option.width>fabricWidth+EPS||y+option.height>maxLength+EPS) return
        const candidate={x:Math.max(0,x),y:Math.max(0,y)}
        // Quantize only the lookup key; retain original geometry coordinates.
        const key=candidate.x.toFixed(6)+','+candidate.y.toFixed(6)
        if(!candidates.has(key)) candidates.set(key,candidate)
      }
      add(0,0)
      if(repeatRegistration){
        const anchor=entry.piece.marker?.repeatAnchorsBySize?.[project.previewSize||project.grading?.baseSize]
        if(anchor&&Number.isFinite(anchor.anchorXcm)&&Number.isFinite(anchor.anchorYcm)){
          const raw=rotate(seamAllowanceBoundary(entry.piece,8),option.rotationDeg)
          const low=bounds(raw),rotated=rotate([{x:anchor.anchorXcm,y:anchor.anchorYcm}],option.rotationDeg)[0]
          const relative={x:rotated.x-low.minX,y:rotated.y-low.minY}
          const refX=Object.hasOwn(repeatRegistration,'repeatXcm')?
            repeatRegistration.originXcm+anchor.targetXcm-relative.x:0
          const refY=Object.hasOwn(repeatRegistration,'repeatYcm')?
            repeatRegistration.originYcm+anchor.targetYcm-relative.y:0
          const xs=Object.hasOwn(repeatRegistration,'repeatXcm')?
            Array.from({length:Math.min(200,Math.ceil(fabricWidth/repeatRegistration.repeatXcm)+5)},(_,i)=>refX+(i-2)*repeatRegistration.repeatXcm).filter(x=>x>=-EPS):[0]
          const ys=Object.hasOwn(repeatRegistration,'repeatYcm')?
            Array.from({length:Math.min(500,Math.ceil(maxLength/repeatRegistration.repeatYcm)+5)},(_,i)=>refY+(i-2)*repeatRegistration.repeatYcm).filter(y=>y>=-EPS):[0]
          for(const x of xs)for(const y of ys)add(x,y)
        }
      }
      if(foldEdge==='right'&&option.folded)add(fabricWidth-option.width,0)
      for(const defect of excluded){
        add(defect.x+defect.width+gap,0)
        add(0,defect.y+defect.height+gap)
        for(const a of defect.outline)for(const b of option.outline){
          add(a.x-b.x+gap,a.y-b.y)
          add(a.x-b.x,a.y-b.y+gap)
        }
      }
      for(const placed of placements) {
        add(placed.x+placed.width+gap,0);add(0,placed.y+placed.height+gap)
        for(const a of placed.outline) for(const b of option.outline) {
          add(a.x-b.x+gap,a.y-b.y);add(a.x-b.x-gap,a.y-b.y)
          add(a.x-b.x,a.y-b.y+gap);add(a.x-b.x,a.y-b.y-gap)
          add(a.x-b.x+gap,a.y-b.y+gap);add(a.x-b.x-gap,a.y-b.y-gap)
          add(a.x-b.x+gap,a.y-b.y-gap);add(a.x-b.x-gap,a.y-b.y+gap)
        }
      }
      for(const {x,y} of [...candidates.values()].sort((a,b)=>a.y-b.y||a.x-b.x)) {
        if(checks>=maxCandidates) break
        checks++
        const outline=option.outline.map(p=>({x:p.x+x,y:p.y+y}))
        if(repeatRegistration){
          const anchor=entry.piece.marker?.repeatAnchorsBySize?.[project.previewSize||project.grading?.baseSize]
          if(!anchor||!Number.isFinite(anchor.anchorXcm)||!Number.isFinite(anchor.anchorYcm))continue
          const raw=rotate(seamAllowanceBoundary(entry.piece,8),option.rotationDeg)
          const low=bounds(raw),a=rotate([{x:anchor.anchorXcm,y:anchor.anchorYcm}],option.rotationDeg)[0]
          const actual={x:x+a.x-low.minX,y:y+a.y-low.minY}
          const valid=([axis,p,o,t])=>{
            if(!Object.hasOwn(repeatRegistration,p))return true
            const period=repeatRegistration[p],target=anchor[t]
            if(!Number.isFinite(target)||target<0||target>=period)return false
            const phase=actual[axis]-repeatRegistration[o]-target
            const delta=((phase%period)+period)%period
            return Math.min(delta,period-delta)<=repeatRegistration.toleranceCm+EPS
          }
          if(!valid(['x','repeatXcm','originXcm','targetXcm'])||!valid(['y','repeatYcm','originYcm','targetYcm']))continue
        }
        if(option.folded&&Math.abs(x-(foldEdge==='right'?fabricWidth-option.width:0))>EPS)continue
        if(excluded.some(d=>polygonConflict(outline,d.outline,gap)))continue
        if(placements.some(p=>polygonConflict(outline,p.outline,gap))) continue
        const score=Math.max(y+option.height,...placements.map(p=>p.y+p.height),0)
        if(!best||score<best.score-EPS||(Math.abs(score-best.score)<=EPS&&(y<best.y-EPS||(Math.abs(y-best.y)<=EPS&&x<best.x)))) best={...option,x,y,outline,score}
      }
      if(checks>=maxCandidates) break
    }
    if(best) placements.push({...best,pieceId:entry.piece.id,instance:entry.instance,name:entry.piece.name})
    else unplaced.push({pieceId:entry.piece.id,instance:entry.instance,reason:checks>=maxCandidates?'candidate-budget-exceeded':'no-safe-placement'})
  }
  const length=Math.max(0,...placements.map(p=>p.y+p.height))
  const area=placements.reduce((sum,p)=>sum+Math.abs(p.outline.reduce((s,a,i)=>{const b=p.outline[(i+1)%p.outline.length];return s+a.x*b.y-b.x*a.y},0))/2,0)
  return {ok:unplaced.length===0,placements,unplaced,errors,metrics:{fabricWidth,length,requested:entries.length,placed:placements.length,efficiency:length?area/(fabricWidth*length):0,candidateChecks:checks,placementOrder,defectCount:excluded.length,foldEdge},manufacturingApproved:false}
}

export { polygonConflict }
