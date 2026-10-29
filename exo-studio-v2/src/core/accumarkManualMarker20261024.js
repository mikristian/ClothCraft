import {seamAllowanceBoundary} from './project.js'
import {polygonConflict} from './accumarkPolygonNesting20261024.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const fail=(code,reason)=>({ok:false,code,reason,manufacturingApproved:false,cuttingAuthorized:false})
const bounds=points=>({minX:Math.min(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),
  maxX:Math.max(...points.map(p=>p.x)),maxY:Math.max(...points.map(p=>p.y))})
const rotate=(points,deg)=>{const c=Math.cos(deg*Math.PI/180),s=Math.sin(deg*Math.PI/180)
  return points.map(p=>({x:p.x*c-p.y*s,y:p.x*s+p.y*c}))}
const normal=degrees=>((degrees%360)+360)%360
function makeOutline(piece,rotationDeg,x,y,curveSamples){
 const raw=seamAllowanceBoundary(piece,curveSamples)
 if(!Array.isArray(raw)||raw.length<3||raw.length>2000||raw.some(p=>!finite(p.x)||!finite(p.y)))
   throw Error('Invalid physical CUT geometry')
 const rotated=rotate(raw,rotationDeg),b=bounds(rotated)
 return {outline:rotated.map(p=>({x:p.x-b.minX+x,y:p.y-b.minY+y})),width:b.maxX-b.minX,height:b.maxY-b.minY}
}

/** Manual Easy Marking foundation: change a placement, validate the entire marker
 * against the authoritative physical piece contours, never silently commit a
 * colliding or wrong-grain arrangement.
 */
export function adjustAccuMarkManualMarker20261024(project,nest,{
 pieceId,instance=0,x,y,rotationDeg, fabricWidthCm, gapCm=0, maxLengthCm=1000,
 curveSamples=8,
}={}){
 try{
  if(!nest?.ok||!Array.isArray(nest.placements)||!nest.placements.length||
    nest.unplaced?.length||nest.errors?.length)return fail('UNVERIFIED_MARKER','Start with a fully placed polygon marker')
  if(!Array.isArray(project?.pieces)||!project.pieces.length||project.pieces.length>300||
    !finite(fabricWidthCm)||fabricWidthCm<=0||fabricWidthCm>1000||
    !finite(gapCm)||gapCm<0||gapCm>50||!finite(maxLengthCm)||maxLengthCm<=0||
    !finite(x)||!finite(y)||!finite(rotationDeg)||!Number.isSafeInteger(instance)||instance<0||
    typeof pieceId!=='string'||!pieceId||![8,12].includes(curveSamples))
    return fail('INVALID_LAYOUT','Provide a valid source project, piece instance and finite physical marker limits')
  const sourceById=new Map(project.pieces.map(p=>[p.id,p]))
  if(sourceById.size!==project.pieces.length)return fail('DUPLICATE_PIECE','Marker source piece IDs must be unique')
  const placements=[],counts=new Map(),ids=new Set()
  let targetFound=0
  for(const row of nest.placements){
   const piece=sourceById.get(row.pieceId)
   if(!piece||!Number.isInteger(row.instance)||row.instance<0||!Number.isInteger(piece.cutQuantity)||piece.cutQuantity<1||
      row.instance>=piece.cutQuantity)return fail('UNKNOWN_PIECE','Marker contains an unknown or invalid piece instance')
   const id=row.pieceId+'\u0000'+row.instance
   if(ids.has(id))return fail('DUPLICATE_INSTANCE','Duplicate placed source piece instance')
   ids.add(id);counts.set(piece.id,(counts.get(piece.id)||0)+1)
   if(piece.fold||piece.cutOnFold||piece.marker?.fold||piece.marker?.onFold||
      piece.holes?.length||piece.internalCutouts?.length)return fail('FOLD_HOLE_UNSUPPORTED','Fold or hole geometry cannot be verified for manual industrial placement')
   if(!finite(piece.grainAngleDeg)||!['one-way','none'].includes(piece.marker?.nap))return fail('MISSING_FABRIC_RULES','Provide source grain and directional nap')
   const selected=row.pieceId===pieceId&&row.instance===instance
   if(selected)targetFound++
   const placedRotation=selected?rotationDeg:row.rotationDeg
   const rotated=normal(placedRotation+piece.grainAngleDeg)
   const allowed=(Math.abs(rotated)<=.0001||Math.abs(rotated-360)<=.0001)||
      (piece.marker.nap==='none'&&piece.marker.allowReverseGrain===true&&Math.abs(rotated-180)<=.0001)||
      (piece.marker.nap==='none'&&piece.marker.allowCrossGrain===true&&
       (Math.abs(rotated-90)<=.0001||Math.abs(rotated-270)<=.0001))
   if(!allowed)return fail('GRAIN_NAP_VIOLATION','Rotation conflicts with the authored physical grain and nap')
   const xx=selected?x:row.x,yy=selected?y:row.y
   if(!finite(xx)||!finite(yy))return fail('INVALID_PLACEMENT','All marker coordinates must be finite')
   const calculated=makeOutline(piece,placedRotation,xx,yy,curveSamples)
   const b=bounds(calculated.outline)
   if(b.minX< -1e-6||b.minY< -1e-6||b.maxX>fabricWidthCm+1e-6||b.maxY>maxLengthCm+1e-6)
     return fail('FABRIC_BOUNDS','Placement exceeds the physical fabric width or marker length')
   if(placements.some(p=>polygonConflict(calculated.outline,p.outline,gapCm)))
     return fail('PHYSICAL_COLLISION','CUT geometry overlaps another piece or violates the required spacing')
   placements.push({...row,...calculated,x:xx,y:yy,rotationDeg:normal(placedRotation)})
  }
  if(targetFound!==1)return fail('TARGET_MISSING','Choose exactly one existing marker piece instance')
  for(const piece of project.pieces)
    if(counts.get(piece.id)!==piece.cutQuantity)return fail('MISSING_QUANTITY','Marker does not place every required physical piece')
  const length=Math.max(...placements.map(p=>p.y+p.height))
  const area=placements.reduce((sum,p)=>sum+Math.abs(p.outline.reduce((acc,a,i)=>{
    const b=p.outline[(i+1)%p.outline.length];return acc+a.x*b.y-b.x*a.y
  },0))/2,0)
  const result={...nest,ok:true,placements,unplaced:[],errors:[],
    metrics:{...nest.metrics,placed:placements.length,requested:placements.length,
      length,fabricWidth:fabricWidthCm,efficiency:area/(fabricWidthCm*length)},
    manualEdit:{pieceId,instance,x,y,rotationDeg:normal(rotationDeg)},
    manufacturingApproved:false,cuttingAuthorized:false}
  return result
 }catch(error){return fail('GEOMETRY_REFUSED',error.message||String(error))}
}
