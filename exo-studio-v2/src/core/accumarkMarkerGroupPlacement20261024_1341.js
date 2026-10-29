import {adjustAccuMarkManualMarker20261024} from './accumarkManualMarker20261024.js'

const fail=(code,reason=code)=>({ok:false,code,reason,manufacturingApproved:false,cuttingAuthorized:false})
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000
// Detached, bounded input traversal. Reject accessor properties before reading
// authored contents; prevent cycles, hostile prototypes and huge source graphs.
function snapshot(root){
 const seen=new Set(),budget={nodes:0,fields:0}
 function visit(v,d=0){
  if(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))return v
  if(!v||typeof v!=='object')throw Error('UNSAFE_SOURCE_VALUE')
  if(++budget.nodes>10000||d>30||seen.has(v))throw Error('SOURCE_COMPLEXITY_BUDGET')
  const proto=Object.getPrototypeOf(v)
  if(!Array.isArray(v)&&proto!==Object.prototype&&proto!==null)throw Error('UNSAFE_SOURCE_PROTOTYPE')
  if(Array.isArray(v)&&Object.getOwnPropertyDescriptor(v,'length').value>2048)throw Error('SOURCE_COMPLEXITY_BUDGET')
  seen.add(v)
  const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(descriptors)
  if((budget.fields+=keys.length)>40000)throw Error('SOURCE_COMPLEXITY_BUDGET')
  const result=Array.isArray(v)?[]:{}
  for(const k of keys){
   if(typeof k!=='string'||['__proto__','constructor','prototype'].includes(k))throw Error('UNSAFE_SOURCE_KEY')
   const desc=descriptors[k]
   if(!Object.hasOwn(desc,'value'))throw Error('UNSAFE_SOURCE_ACCESSOR')
   if(Array.isArray(v)&&k==='length'){result.length=desc.value;continue}
   if(!desc.enumerable)throw Error('UNSAFE_SOURCE_FIELD')
   result[k]=visit(desc.value,d+1)
  }
  if(Array.isArray(v)&&Object.keys(result).length!==result.length)throw Error('UNSAFE_SPARSE_ARRAY')
  seen.delete(v);return result
 }
 return visit(root)
}
const key=p=>`${p.pieceId}\0${p.instance}`
/**
 * Atomic group placement operation, centimeters throughout.
 * spec: {kind:'group.slide'|'group.step'|'group.align',members:[{pieceId,instance},...],
 *   dxCm,dyCm, axis:'x'|'y', fabricWidthCm,gapCm,maxLengthCm}.
 * slide translates every selected instance equally (retains pairwise vectors);
 * step translates member i by i*[dxCm,dyCm] (first remains fixed);
 * align snaps selected bounding-box origins to the first member's x or y.
 * Requires all instances present and a fully physically valid source marker.
 */
export function applyAccuMarkMarkerGroupPlacement20261024(project,nest,spec){
 try{
  ;[project,nest,spec]=[snapshot(project),snapshot(nest),snapshot(spec)]
  if(!project||!Array.isArray(project.pieces)||!nest?.ok||!Array.isArray(nest.placements)||
   nest.unplaced?.length||nest.errors?.length||nest.placements.length<2||nest.placements.length>512)
   return fail('INVALID_MARKER_SOURCE')
  if(!finite(spec?.fabricWidthCm)||spec.fabricWidthCm<=0||spec.fabricWidthCm>1000||
    !finite(spec.maxLengthCm)||spec.maxLengthCm<=0||spec.maxLengthCm>100000||
    !finite(spec.gapCm)||spec.gapCm<0||spec.gapCm>50)return fail('INVALID_PHYSICAL_LIMITS')
  if(!Array.isArray(spec.members)||spec.members.length<2||spec.members.length>nest.placements.length)return fail('INVALID_GROUP')
  const chosen=new Set()
  for(const member of spec.members){
   if(typeof member?.pieceId!=='string'||!Number.isSafeInteger(member.instance)||member.instance<0||chosen.has(key(member)))return fail('INVALID_GROUP_MEMBER')
   chosen.add(key(member))
  }
  if(nest.placements.filter(p=>chosen.has(key(p))).length!==chosen.size)return fail('GROUP_MEMBER_MISSING')
  if(project.pieces.length>128||project.pieces.reduce((n,p)=>n+(p.points?.length||0),0)>4096)return fail('SOURCE_COMPLEXITY_BUDGET')
  // Unmodelled fabric relationships can invalidate an otherwise clear nest.
  for(const p of project.pieces){
   if(p.marker?.shade||p.marker?.motif||p.marker?.repeat||p.marker?.stripe||p.marker?.plaid||
      p.shade||p.motif||p.patternRepeat||p.holes?.length||p.internalCutouts?.length||
      p.fold||p.cutOnFold||p.marker?.fold||p.marker?.onFold)return fail('UNSUPPORTED_FABRIC_CONSTRAINT')
  }
  const index=new Map(nest.placements.map((p,i)=>[key(p),i]))
  if(index.size!==nest.placements.length)return fail('DUPLICATE_INSTANCE')
  const picked=spec.members.map(m=>nest.placements[index.get(key(m))])
  let dx=spec.dxCm,dy=spec.dyCm
  if(spec.kind==='group.slide'||spec.kind==='group.step'){
   if(!finite(dx)||!finite(dy))return fail('INVALID_MOVEMENT_CM')
  }else if(spec.kind==='group.align'){
   if(!['x','y'].includes(spec.axis))return fail('INVALID_ALIGNMENT_AXIS')
  }else return fail('UNSUPPORTED_GROUP_ACTION')
  const next=nest.placements.map(p=>({...p}))
  for(let i=0;i<picked.length;i++){
   const p=picked[i],target=next[index.get(key(p))]
   if(!finite(p.x)||!finite(p.y)||!finite(p.rotationDeg))return fail('INVALID_SOURCE_PLACEMENT')
   if(spec.kind==='group.align'){
    target[spec.axis]=picked[0][spec.axis]
   }else{
    const factor=spec.kind==='group.slide'?1:i
    target.x+=dx*factor;target.y+=dy*factor
   }
  }
  // Existing single-placement validator checks *every* requested instance,
  // source grain and nap, seam-allowance CUT outlines, gap, fabric and length.
  // Target a non-moving first instance; all candidate edits already exist in next.
  const marker={...nest,placements:next}
  const anchor=next[0]
  const validated=adjustAccuMarkManualMarker20261024(project,marker,{
   pieceId:anchor.pieceId,instance:anchor.instance,x:anchor.x,y:anchor.y,
   rotationDeg:anchor.rotationDeg,fabricWidthCm:spec.fabricWidthCm,
   gapCm:spec.gapCm,maxLengthCm:spec.maxLengthCm,
  })
  if(!validated.ok)return fail(validated.code,validated.reason)
  return {...validated,groupEdit:{kind:spec.kind,members:spec.members,
    ...(spec.kind==='group.align'?{axis:spec.axis}:{dxCm:dx,dyCm:dy})},
    provenance:{sourceRevision:project.revision??null,sourcePieceIds:project.pieces.map(p=>p.id),
      sourceInstanceCount:nest.placements.length},manufacturingApproved:false,cuttingAuthorized:false}
 }catch(error){return fail('SOURCE_REFUSED',error.message)}
}
