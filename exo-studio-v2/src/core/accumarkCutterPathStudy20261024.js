import {polygonConflict} from './accumarkPolygonNesting20261024.js'
import {inspectCutterStudyOutlineGeometry20261028} from './accumarkCutterPathInspectionGeometry20261028.js'

const fail=(code,reason)=>({ok:false,code,reason,cuttingAuthorized:false,manufacturingApproved:false})
const finite=v=>typeof v==='number'&&Number.isFinite(v)
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
const bounds=pts=>({minX:Math.min(...pts.map(p=>p.x)),minY:Math.min(...pts.map(p=>p.y)),
 maxX:Math.max(...pts.map(p=>p.x)),maxY:Math.max(...pts.map(p=>p.y))})
const mm=p=>({xMm:+(p.x*10).toFixed(4),yMm:+(p.y*10).toFixed(4)})
/** Machine-neutral study, absolutely no cutter protocol, command stream or
 * implicit physical authorization. Device-specific notch/drill/laser profiles
 * and physical start/end offsets are deliberately NOT constructed.
 */
export function buildAccuMarkCutterPathStudy20261024(nest,{
 fabricWidthCm,spaceCm=0,calibrationMm=100,
}={}){
 if(nest?.ok!==true||nest.unplaced?.length||nest.errors?.length||
   !Array.isArray(nest?.placements)||!nest.placements.length||nest.placements.length>5000)
   return fail('INVALID_NEST','A complete verified polygon nest is required')
 if(!finite(fabricWidthCm)||fabricWidthCm<=0||fabricWidthCm>1000||
   !finite(spaceCm)||spaceCm<0||spaceCm>50||calibrationMm!==100)
   return fail('INVALID_STUDY_LIMITS','Physical fabric width, gap and 100-mm calibration required')
 const seen=new Set(),placed=[]
 for(const [i,row] of nest.placements.entries()){
  const id=row?.pieceId+'@@'+row?.instance
  if(seen.has(id)||typeof row.pieceId!=='string'||!Number.isSafeInteger(row.instance)||row.instance<0)
   return fail('DUPLICATE_INSTANCE','Duplicate or malformed cut instance')
  seen.add(id)
  // The CUT study only serializes the outside contour. A supplied marker
  // carrying separate manufacturing features cannot silently lose them.
  // Refuse the study until those features have an independently validated
  // transfer path; do NOT synthesize cutter commands from their presence.
  const featureKeys=['notches','notchMarks','drills','drillMarks','punches',
    'holes','cutHoles','internalCutouts','internalLines','internalCuts']
  for(const key of featureKeys){
   if(!Object.hasOwn(row,key))continue
   const value=row[key]
   const empty=Array.isArray(value)?value.length===0:
    value&&typeof value==='object'?Object.keys(value).length===0:false
   if(!empty)return fail('UNTRANSFERRED_CUT_FEATURE',
    `Placement ${row.pieceId} carries ${key}, but CUT inspection cannot preserve that feature`)
  }
  const outline=row.outline
  if(!Array.isArray(outline)||outline.length<3||outline.length>2000||
    outline.some(p=>!finite(p.x)||!finite(p.y)))
    return fail('INVALID_CUTLINE','Physical CUT geometry is missing')
  // A nest can be supplied by a separate editor or an imported file with
  // ok:true. Never trust that flag to imply a simple, noncollapsed physical
  // CUT contour after the actual study's 0.0001 mm serialization.
  const geometry=inspectCutterStudyOutlineGeometry20261028(outline)
  if(!geometry.ok)return fail(geometry.code,geometry.reason)
  const b=bounds(outline)
  if(b.minX < -1e-6||b.minY < -1e-6||b.maxX>fabricWidthCm+1e-6)
    return fail('CUT_OUT_OF_BOUNDS','Physical CUT extends outside the fabric width')
  if(placed.some(old=>polygonConflict(outline,old.outline,spaceCm)))
    return fail('CUTLINE_COLLISION','CUT paths overlap or violate physical clearance')
  placed.push({pieceId:row.pieceId,instance:row.instance,outline})
 }
 const sorted=[...placed].sort((a,b)=>{
  const ay=Math.min(...a.outline.map(p=>p.y)),by=Math.min(...b.outline.map(p=>p.y))
  return ay-by||a.pieceId.localeCompare(b.pieceId)||a.instance-b.instance
 })
 const records=[]
 let totalCutLengthMm=0,totalTravelMm=0,position={x:0,y:0}
 for(const [cutIndex,p] of sorted.entries()){
  const start=p.outline[0],close=[...p.outline,start]
  totalTravelMm+=distance(position,start)*10
  let perimeter=0
  for(let i=1;i<close.length;i++)perimeter+=distance(close[i-1],close[i])*10
  if(!finite(perimeter)||perimeter<=0)return fail('DEGENERATE_CUT','Cut contour collapsed')
  totalCutLengthMm+=perimeter
  records.push({sequence:cutIndex+1,pieceId:p.pieceId,instance:p.instance,units:'mm',
    closed:true,physicalCutPathMm:close.map(mm),
    travelStartMm:mm(position),perimeterMm:+perimeter.toFixed(4),
    notchCuttingVerified:false,drillVerified:false,materialVerificationRequired:true})
  position=start
 }
 return{ok:true,format:'exo.machine-neutral-CUT-inspection.v1',units:'mm',fabricWidthMm:fabricWidthCm*10,
   calibration:{horizontalMm:100,verticalMm:100,physicalPrintRequired:true},
   records,totals:{physicalCuts:records.length,totalPerimeterMm:+totalCutLengthMm.toFixed(4),
     toolUpTravelMm:+totalTravelMm.toFixed(4)},
   commandProtocol:null,hardwareDriver:null,cuttingAuthorized:false,
   manufacturingApproved:false,plotterProfileVerified:false,
   warning:'GEOMETRIC CUT PATH STUDY ONLY. Must not be sent to a cutter. Does not include safe cut order, actual machine start/stop, knife compensation, notch/drill protocol, material feed or factory approval.'}
}
