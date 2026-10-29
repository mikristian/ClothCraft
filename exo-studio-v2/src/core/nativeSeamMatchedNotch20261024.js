import {nativeRustEdgeLength20261023,nativeRustArcLengthStation20261023} from './nativeRustArcLengthCompat20261023.js'

const fail=reason=>({ok:false,reason,manufacturingApproved:false})
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const validRef=x=>x&&typeof x.panel==='string'&&typeof x.edge==='string'&&
  Array.isArray(x.range)&&x.range.length===2&&x.range.every(finite)&&
  x.range[0]>=0&&x.range[1]<=1&&x.range[0]<x.range[1]

/**
 * Plan a pair of physical arclength-stationed NOTCH commands against a saved
 * native sewn relationship, including partial [0,1] seam intervals and
 * reverse_b correspondence. This does NOT automatically modify any garment.
 *
 * Rust Polygon.notch_segment interprets t as normalized material arc length,
 * NOT cubic parameter t. Each command is individually undoable; the installed
 * Rust edit-batch is currently BoardTransform-only.
 */
export function planNativeMatchedSeamNotches20261024(snapshot,{seamId,fraction=.5,depthMm=4,
  lengthToleranceMm=2,minExistingSeparationMm=2}={}){
 try{
  if(!snapshot?.template||!Number.isInteger(snapshot.revision)||snapshot.revision<0||
    typeof seamId!=='string'||!seamId)throw Error('Valid current native revision and seam required')
  if(!finite(fraction)||fraction<=.02||fraction>=.98)throw Error('Choose a physical station between 2% and 98%')
  if(!finite(depthMm)||depthMm<1||depthMm>10)throw Error('Notch depth must be 1–10 mm')
  if(!finite(lengthToleranceMm)||lengthToleranceMm<0||lengthToleranceMm>5||
    !finite(minExistingSeparationMm)||minExistingSeparationMm<.5||minExistingSeparationMm>15)
    throw Error('Invalid sewing length or notch spacing tolerance')
  const matches=snapshot.template.seams?.filter(s=>s?.id===seamId)
  if(matches?.length!==1)throw Error('Seam missing or has ambiguous identity')
  const seam=matches[0]
  if(!validRef(seam.a)||!validRef(seam.b)||typeof seam.reverse_b!=='boolean'||typeof seam.allow_ease!=='boolean')
    throw Error('Sewn source requires explicit partial interval, orientation and ease')
  if(seam.allow_ease)throw Error('Ease-enabled seam requires a separately approved distribution before transferring notches')
  if(seam.a.panel===seam.b.panel&&seam.a.edge===seam.b.edge)
    throw Error('Cannot create paired notches on identical material boundary')
  const segments=[seam.a,seam.b].map(ref=>{
    const matches=snapshot.template.panels?.filter(p=>p?.id===ref.panel)
    if(matches?.length!==1||!matches[0].polygon)throw Error('A source panel is unavailable')
    const polygon=matches[0].polygon
    if(polygon.holes?.length)throw Error('Unsupported native holes in sewn panel')
    const measured=nativeRustEdgeLength20261023(polygon,ref.edge)
    if(!measured.ok||!(measured.totalLengthM>.005))throw Error(measured.reason||'Sewn edge too short')
    const rangeLength=measured.totalLengthM*(ref.range[1]-ref.range[0])
    return{ref,polygon,totalM:measured.totalLengthM,intervalM:rangeLength}
  })
  const mismatchMm=Math.abs(segments[0].intervalM-segments[1].intervalM)*1000
  if(mismatchMm>lengthToleranceMm)throw Error('Sewn boundaries differ by '+mismatchMm.toFixed(2)+' mm; true or ease before pairing notches')
  const directions=[fraction,seam.reverse_b?1-fraction:fraction]
  const proposals=segments.map((entry,i)=>{
    const {polygon,ref,totalM,intervalM}=entry
    const t=ref.range[0]+(ref.range[1]-ref.range[0])*directions[i]
    const station=nativeRustArcLengthStation20261023(polygon,ref.edge,{distanceM:t*totalM})
    if(!station.ok||!station.position?.every(finite))throw Error('Cannot locate real boundary station: '+station.reason)
    const reserved=Math.max(minExistingSeparationMm,depthMm*.5)/1000
    if(t*totalM<reserved || (1-t)*totalM<reserved)
      throw Error('A new notch would be too close to the physical CUT boundary corner')
    const existing=polygon.notches?.[ref.edge]||[]
    if(!Array.isArray(existing)||existing.some(n=>!finite(n?.t)||!finite(n?.depth_m)))
      throw Error('Stored notch metadata cannot be safely read')
    if(existing.some(n=>Math.abs(n.t-t)*totalM<minExistingSeparationMm/1000))
      throw Error('Existing notch within '+minExistingSeparationMm+' mm of proposed marker')
    return{
      panelId:ref.panel,edge:ref.edge,t,
      stationMm:station.position.map(x=>x*1000),
      stationFromSeamStartMm:intervalM*fraction*1000,
      command:{kind:'Notch',panel:ref.panel,edge:ref.edge,t,depth_m:depthMm/1000},
    }
  })
  return{ok:true,seamId,revision:snapshot.revision,source:'RUST_MATERIAL_ARCLENGTH_NOTCH_PAIR_PROPOSAL',
    stationFraction:fraction,depthMm,mismatchMm,reverseB:seam.reverse_b,proposals,
    commands:proposals.map(p=>p.command),manufacturingApproved:false,
    atomicNativeBatchSupported:false,
    warning:'Two individual native Notch edits. Requires verifying both commands and revision before each edit. External cutter, grading and sewing approval is not implied.'}
 }catch(error){return fail(error.message||String(error))}
}
