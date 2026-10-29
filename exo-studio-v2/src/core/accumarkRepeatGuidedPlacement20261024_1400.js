import {validateAccuMarkMaterialRepeatQA} from './accumarkMaterialRepeatQA20261024.js'
import {polygonConflict} from './accumarkPolygonNesting20261024.js'

// Bounded, explicitly non-factory alignment of one physically placed polygon
// against an independently verified matching source motif anchor.
const reject=(code,detail=code)=>({ok:false,code,detail,manufacturingApproved:false,cuttingAuthorized:false})
function snapshot(value){
 const seen=new Set(),counts={nodes:0,fields:0}
 function copy(v,depth){
  if(v===null||typeof v==='string'||typeof v==='boolean')return v
  if(typeof v==='number'&&Number.isFinite(v))return v
  if(!v||typeof v!=='object'||depth>25||seen.has(v)||++counts.nodes>1200)throw Error('SOURCE_COMPLEXITY_BUDGET')
  if(Object.getPrototypeOf(v)!==(Array.isArray(v)?Array.prototype:Object.prototype))throw Error('UNSAFE_PROTOTYPE')
  const desc=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(desc)
  if((counts.fields+=keys.length)>10000||keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype','toJSON'].includes(k)))
    throw Error('SOURCE_COMPLEXITY_BUDGET')
  seen.add(v)
  const arr=Array.isArray(v),out=arr?[]:{}
  if(arr&&v.length>1600)throw Error('SOURCE_COMPLEXITY_BUDGET')
  for(const key of keys){
   if(arr&&key==='length'){out.length=desc.length.value;continue}
   const d=desc[key]
   if(!Object.hasOwn(d,'value')||!d.enumerable)throw Error('UNSAFE_ACCESSOR')
   if(arr&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=v.length))throw Error('UNSAFE_ARRAY')
   Object.defineProperty(out,key,{value:copy(d.value,depth+1),enumerable:true,writable:true,configurable:true})
  }
  if(arr&&Object.keys(out).length!==out.length)throw Error('SPARSE_ARRAY')
  seen.delete(v)
  return out
 }
 return copy(value,0)
}
const same=(a,b)=>a.pieceId===b.pieceId&&a.size===b.size&&a.instance===b.instance
const extent=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=10000
const normalOffset=(delta,r)=>delta-Math.round(delta/r)*r
function preflight(args,opt){
 const n=args?.nesting?.placements,projectPieces=args?.project?.pieces,r=args?.repeatCm
 if(!Array.isArray(n)||n.length<2||n.length>12||!Array.isArray(projectPieces)||projectPieces.length>12)
  throw Error('PLACEMENT_WORK_BUDGET')
 if(n.some(p=>!Array.isArray(p.outline)||p.outline.length<3||p.outline.length>48||
  p.outline.some(q=>!Number.isFinite(q.x)||!Number.isFinite(q.y))))throw Error('POLYGON_WORK_BUDGET')
 if(!extent(args.fabricWidthCm)||!extent(opt.maxLengthCm)||!extent(r?.x)||!extent(r?.y)||
  !Number.isFinite(opt.gapCm)||opt.gapCm<0||opt.gapCm>50||
  !Number.isFinite(args.toleranceCm??.01)||(args.toleranceCm??.01)<0||(args.toleranceCm??.01)>.1)
  throw Error('INVALID_MATERIAL_LIMITS')
 if(!opt.target||typeof opt.target.pieceId!=='string'||typeof opt.target.size!=='string'||
   !Number.isSafeInteger(opt.target.instance)||opt.target.instance<0)throw Error('INVALID_TARGET')
 if(opt.maxCandidates!==undefined&&(!Number.isSafeInteger(opt.maxCandidates)||opt.maxCandidates<1||opt.maxCandidates>49))
  throw Error('INVALID_CANDIDATE_LIMIT')
 const total=n.reduce((sum,p)=>sum+p.outline.length,0)
 if(n.length*n.length*total*total>1_000_000)throw Error('REGISTRATION_WORK_BUDGET')
}

/**
 * args are exactly the verified input for validateAccuMarkMaterialRepeatQA.
 * options={target:{pieceId,size,instance},maxLengthCm,gapCm,maxCandidates?:49}.
 * A full registration QA, including source CUT congruence, nap, shade zones,
 * all cut quantities and overlaps, is mandatory both before and after editing.
 * Never accepts an unrelated failing initial QA for repair.
 */
export function repairAccuMarkRepeatPlacement20261024_1400(args,options={}){
 try{
  const source=snapshot(args),opt=snapshot(options)
  preflight(source,opt)
  const candidatesTarget=source.nesting.placements.filter(p=>same(p,opt.target))
  if(candidatesTarget.length!==1)return reject('TARGET_NOT_UNIQUE')
  const target=candidatesTarget[0],initial=validateAccuMarkMaterialRepeatQA(source)
  if(initial.ok)return reject('REGISTRATION_ALREADY_VALID')
  if(initial.issues.some(i=>i.code!=='REPEAT_REGISTRATION_MISMATCH'))
    return reject('UNRELATED_QA_FAILURE','Physical QA has failures beyond repeat alignment')
  const record=initial.registration.find(p=>same(p,opt.target))
  if(!record)return reject('TARGET_REGISTRATION_NOT_VERIFIED')
  const refs=initial.registration.filter(p=>p.size===record.size&&p.group===record.group&&p.shade===record.shade&&!same(p,record))
  if(!refs.length)return reject('NO_INDEPENDENT_REFERENCE')
  const ref=refs[0]
  const dx0=normalOffset(ref.anchor.x-record.anchor.x,source.repeatCm.x)
  const dy0=normalOffset(ref.anchor.y-record.anchor.y,source.repeatCm.y)
  const shifts=[]
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){
   const dx=dx0+a*source.repeatCm.x,dy=dy0+b*source.repeatCm.y
   if(Math.hypot(dx,dy)<1e-8)continue
   const moved=target.outline.map(p=>({x:p.x+dx,y:p.y+dy}))
   if(moved.some(p=>p.x< -1e-6||p.x>source.fabricWidthCm+1e-6||p.y< -1e-6||p.y>opt.maxLengthCm+1e-6))
    continue
   const endY=Math.max(...source.nesting.placements.flatMap(p=>
     p.outline.map(q=>q.y+(same(p,target)?dy:0))))
   if(endY>opt.maxLengthCm+1e-6)continue
   shifts.push({dx,dy,markerLengthCm:endY,distanceCm:Math.hypot(dx,dy)})
  }
  shifts.sort((a,b)=>a.markerLengthCm-b.markerLengthCm||a.distanceCm-b.distanceCm||a.dx-b.dx||a.dy-b.dy)
  const maxCandidates=opt.maxCandidates??49
  let inspected=0
  for(const shift of shifts.slice(0,maxCandidates)){
   inspected++
   const nesting=snapshot(source.nesting)
   const placement=nesting.placements.find(p=>same(p,opt.target))
   placement.x+=shift.dx;placement.y+=shift.dy
   placement.outline=placement.outline.map(p=>({x:p.x+shift.dx,y:p.y+shift.dy}))
   if(nesting.placements.some((p,i)=>nesting.placements.some((q,j)=>
      j>i&&polygonConflict(p.outline,q.outline,opt.gapCm))))continue
   const qa=validateAccuMarkMaterialRepeatQA({...source,nesting})
   if(!qa.ok)continue
   // The repaired marker is usable by the existing visualization and CUT
   // research tools. Recalculate every metric dependent on placement instead
   // of accidentally carrying the old nest's length/utilization numbers.
   const markerLength=Math.max(...nesting.placements.flatMap(p=>p.outline.map(q=>q.y)))
   const occupiedArea=nesting.placements.reduce((sum,p)=>sum+Math.abs(
     p.outline.reduce((s,v,i)=>{const q=p.outline[(i+1)%p.outline.length];return s+v.x*q.y-q.x*v.y},0)
   )/2,0)
   if(!Number.isFinite(markerLength)||markerLength<=0||markerLength>opt.maxLengthCm+1e-6||
     !Number.isFinite(occupiedArea)||occupiedArea<=0)continue
   nesting.metrics={...(nesting.metrics||{}),fabricWidth:source.fabricWidthCm,
     length:markerLength,placed:nesting.placements.length,requested:nesting.placements.length,
     efficiency:occupiedArea/(source.fabricWidthCm*markerLength),
     candidateChecks:(Number.isSafeInteger(nesting.metrics?.candidateChecks)?nesting.metrics.candidateChecks:0)+inspected}
   nesting.manufacturingApproved=false
   nesting.cuttingAuthorized=false
   return {ok:true,nesting,qa,deltaCm:{x:shift.dx,y:shift.dy},consideredCandidates:inspected,
    originalQaIssues:initial.issues.map(i=>i.code),
    provenance:{sourcePieceId:target.pieceId,size:target.size,instance:target.instance,
      referencePieceId:ref.pieceId,referenceInstance:ref.instance,fabricRepeatCm:source.repeatCm},
    sourceUnchanged:true,method:'BOUNDED_SINGLE_PIECE_REPEAT_SEARCH',
    manufacturingApproved:false,cuttingAuthorized:false}
  }
  return reject('NO_SAFE_REPEAT_PLACEMENT','All '+inspected+' considered shifts failed material or collision QA')
 }catch(e){return reject('SOURCE_OR_BUDGET_REFUSED',String(e.message||e))}
}
