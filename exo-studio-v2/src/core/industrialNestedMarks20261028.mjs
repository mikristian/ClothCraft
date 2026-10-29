import {projectToDxf} from './dxf.js'
import {parseAccuMarkGradedDxfWire20261023} from './accumarkGradedDxfRoundtripAudit20261023.js'
import {seamAllowanceBoundary} from './project.js'
const finite=Number.isFinite
const token=x=>String(x).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,48).toUpperCase()
const near=(a,b,t=.013)=>Math.hypot(a.x-b.x,a.y-b.y)<=t
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
function inside(p,poly){let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(segmentDistance(p,a,b)<.0001)return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result}return result}
function transform(point,cut,placement){const deg=placement.rotationDeg*Math.PI/180,c=Math.cos(deg),s=Math.sin(deg);const rotated=pt=>({x:pt.x*c-pt.y*s,y:pt.x*s+pt.y*c});const bounds=cut.map(rotated);const minX=Math.min(...bounds.map(p=>p.x)),minY=Math.min(...bounds.map(p=>p.y));const q=rotated(point);return {x:q.x-minX+placement.x,y:q.y-minY+placement.y}}
/** Transfer authored, DXF-checked manufacturing marks to each real nested CUT instance.
 * No device-specific instructions, no guessed drill operations. Coordinates in cm.
 */
export function inspectNestedManufacturingMarks20261028(graded,nest,{size=graded?.previewSize}={}){
 const reject=(code,detail)=>({ok:false,issues:[{code,detail}],placements:[],cuttingAuthorized:false,machineReady:false})
 if(!graded?.pieces?.length||nest?.ok!==true||!Array.isArray(nest.placements)||!nest.placements.length)return reject('INVALID_MARKER','Complete graded pattern and polygon nest required')
 for(const piece of graded.pieces){
  if(['drills','drillMarks','punches','holes','cutHoles','internalCutouts','internalCuts'].some(k=>piece[k]?.length))
   return reject('DRILL_OR_CUTOUT_PROTOCOL_UNVERIFIED',piece.id)
 }
 try{
  const wire=projectToDxf(graded,size,{cutlineMode:'manufacturing',requireGradedGeometry:true})
  const parsed=parseAccuMarkGradedDxfWire20261023(wire)
  if(!parsed.ok)return reject('INVALID_DXF_MARKS',JSON.stringify(parsed.issues).slice(0,300))
  const pieces=new Map(graded.pieces.map(p=>[p.id,p]))
  const expected=new Map()
  for(const piece of graded.pieces){
   // The generic DXF writer doesn't encode physical drills. Refuse rather than
   // guessing hole locations, depths or machine-specific punch semantics.
   if(['drills','drillMarks','punches','holes','cutHoles','internalCutouts','internalCuts'].some(k=>piece[k]?.length))return reject('DRILL_OR_CUTOUT_PROTOCOL_UNVERIFIED',piece.id)
   const rows=parsed.entities.filter(e=>e.type==='LINE'&&e.layer===`NOTCH_${token(piece.name)}`)
   const declared=(piece.notches||[]).reduce((n,m)=>n+(m.type==='double'?2:1),0)
   if(rows.length!==declared)return reject('NOTCH_COUNT_MISMATCH',piece.id)
   const cut=seamAllowanceBoundary(piece,12)
   // DXF layout is translated by exporter xOffset. Recover offsets using
   // the CUT entity itself, which must geometrically match the authored CUT.
   const matchingCuts=parsed.entities.filter(e=>e.layer===`CUT_${token(piece.name)}_${token(size)}`&&e.type==='POLYLINE')
   if(matchingCuts.length!==1)return reject('CUT_CONTOUR_IDENTITY',piece.id)
   const cutEntity=matchingCuts[0]
   if(!cutEntity||cutEntity.points.length!==cut.length)return reject('CUT_CONTOUR_IDENTITY',piece.id)
   const deltaX=cutEntity.points[0].x/10-cut[0].x,deltaY=cutEntity.points[0].y/10-cut[0].y
   if(!cut.every((p,i)=>near({x:cutEntity.points[i].x/10-deltaX,y:cutEntity.points[i].y/10-deltaY},p,.001)))return reject('CUT_CONTOUR_MISMATCH',piece.id)
   const marks=rows.map(e=>({a:{x:e.values[10]/10-deltaX,y:e.values[20]/10-deltaY},b:{x:e.values[11]/10-deltaX,y:e.values[21]/10-deltaY}}))
   for(const mark of marks){if(![mark.a.x,mark.a.y,mark.b.x,mark.b.y].every(finite)||!cut.some((p,i)=>segmentDistance(mark.a,p,cut[(i+1)%cut.length])<.002)||!inside(mark.b,cut))return reject('INVALID_NOTCH_POSITION',piece.id)}
   expected.set(piece.id,{piece,cut,marks})
  }
  const placements=[]
  for(const row of nest.placements){
   const ref=expected.get(row.pieceId)
   if(!ref||!finite(row.x)||!finite(row.y)||!finite(row.rotationDeg))return reject('UNMATCHED_NEST_INSTANCE',row.pieceId)
   const marks=ref.marks.map((m,i)=>({index:i+1,startCm:transform(m.a,ref.cut,row),endCm:transform(m.b,ref.cut,row)}))
   if(marks.some(m=>!row.outline.some((p,i)=>segmentDistance(m.startCm,p,row.outline[(i+1)%row.outline.length])<.025)||!inside(m.endCm,row.outline)))return reject('NESTED_NOTCH_OUTSIDE_CUT',row.pieceId)
   placements.push({size,pieceId:row.pieceId,instance:row.instance,rotationDeg:row.rotationDeg,notches:marks,drills:[],physicalNotchesPreserved:marks.length===ref.marks.length})
  }
  return {ok:true,size,placements,notchCount:placements.reduce((s,p)=>s+p.notches.length,0),drillCount:0,
   machineReady:false,cuttingAuthorized:false,manufacturingApproved:false,
   note:'Authored notches are traced through DXF geometry and nested rotations. Machine-specific cutter notch execution is NOT approved.'}
 }catch(error){return reject('MARK_TRANSFER_REFUSED',String(error.message||error))}
}
