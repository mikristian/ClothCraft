import {adjustAccuMarkManualMarker20261024 as validate} from './accumarkManualMarker20261024.js'

const fail=(code,detail=code)=>({ok:false,code,detail,manufacturingApproved:false,cuttingAuthorized:false})
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const key=p=>p.pieceId+'\u0000'+p.instance
// Own-data snapshot: neither getters nor inherited toJSON can execute.
function snapshot(root){
 const active=new Set();let nodes=0,fields=0
 function copy(v,d=0){
  // Grading emits enumerable optional fields such as curves: undefined.
  // Preserve their own-data shape without evaluating accessors or toJSON.
  if(v===undefined||v===null||typeof v==='string'||typeof v==='boolean'||(finite(v)))return v
  if(!v||typeof v!=='object'||d>25||++nodes>8000||active.has(v))throw Error('UNSAFE_SOURCE')
  const proto=Object.getPrototypeOf(v)
  if(Array.isArray(v)?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)throw Error('UNSAFE_PROTOTYPE')
  active.add(v)
  const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(descriptors)
  if((fields+=keys.length)>30000)throw Error('SOURCE_BUDGET')
  const result=Array.isArray(v)?[]:Object.create(null)
  if(Array.isArray(v)&&descriptors.length.value>512)throw Error('SOURCE_BUDGET')
  for(const k of keys){
   if(typeof k!=='string'||['__proto__','prototype','constructor','toJSON'].includes(k))throw Error('UNSAFE_KEY')
   const descriptor=descriptors[k]
   if(!Object.hasOwn(descriptor,'value')||(k!=='length'&&!descriptor.enumerable))throw Error('UNSAFE_DESCRIPTOR')
   if(k==='length'&&Array.isArray(v)){result.length=descriptor.value;continue}
   result[k]=copy(descriptor.value,d+1)
  }
  if(Array.isArray(v)&&Object.keys(result).length!==result.length)throw Error('SPARSE_ARRAY')
  active.delete(v);return result
 }
 return copy(root)
}
const unsupported=p=>p.fold||p.cutOnFold||p.holes?.length||p.cutHoles?.length||p.internalCutouts?.length||
 p.marker?.fold||p.marker?.onFold||p.marker?.shade||p.marker?.motif||p.marker?.repeat||
 p.marker?.stripe||p.marker?.plaid||p.shade||p.motif||p.patternRepeat||
 p.grading||p.gradeRules||p.curves||p.curveSegments||p.notches?.length||p.edgeAllowance
const round=x=>Math.round(x*1e6)/1e6

/** Finite local improvement of a COMPLETE source-verified polygon marker.
 * Coordinates, width, spacing and length are centimeters. Search changes only x/y.
 * All feasible steps are revalidated from physical source geometry.
 */
export function optimizeAccuMarkMarkerProduction20261024(project,marker,{
 fabricWidthCm,gapCm=1,maxLengthCm=1000,maxEvaluations=320
}={}){
 try{
  ;[project,marker]=[snapshot(project),snapshot(marker)]
  if(!finite(fabricWidthCm)||fabricWidthCm<=0||fabricWidthCm>1000||
    !finite(gapCm)||gapCm<0||gapCm>50||!finite(maxLengthCm)||maxLengthCm<=0||maxLengthCm>100000||
    !Number.isSafeInteger(maxEvaluations)||maxEvaluations<1||maxEvaluations>2000)return fail('INVALID_LIMITS')
  if(!Array.isArray(project?.pieces)||!project.pieces.length||project.pieces.length>80||
    project.pieces.reduce((sum,p)=>sum+(p.points?.length||0),0)>2048||
    !Array.isArray(marker?.placements)||marker.placements.length<2||marker.placements.length>96||
    !marker.ok||marker.errors?.length||marker.unplaced?.length)return fail('SOURCE_BUDGET_OR_INCOMPLETE')
  // gradeProject returns a size-specific geometry snapshot with previewSize and
  // piece.gradeSize. A still-multi-size grading specification is NOT one marker.
  if(project.pieces.some(unsupported)||project.grading?.sizes?.length>1)return fail('UNSUPPORTED_PRODUCTION_CONSTRAINT')
  const anchor=marker.placements[0]
  let current=validate(project,marker,{pieceId:anchor.pieceId,instance:anchor.instance,x:anchor.x,
   y:anchor.y,rotationDeg:anchor.rotationDeg,fabricWidthCm,gapCm,maxLengthCm})
  if(!current.ok)return fail('SOURCE_MARKER_UNVERIFIED',current.code)
  const beforeCm=current.metrics.length;let checks=0,accepted=0
  // Put tallest pieces first when choosing a single movement; deterministic stable order.
  const sequence=[...current.placements].sort((a,b)=>(b.y+b.height)-(a.y+a.height)||key(a).localeCompare(key(b)))
  for(const original of sequence){
   if(checks>=maxEvaluations)break
   const row=current.placements.find(p=>key(p)===key(original))
   const xs=new Set([0]),ys=new Set([0])
   for(const other of current.placements){
    if(key(other)===key(row))continue
    xs.add(round(other.x+other.width+gapCm))
    ys.add(round(other.y+other.height+gapCm))
   }
   let best=current
   const candidates=[...ys].flatMap(y=>[...xs].map(x=>({x,y}))).filter(c=>c.x>=0&&c.y>=0)
    .sort((a,b)=>a.y-b.y||a.x-b.x)
   for(const c of candidates){
    if(checks>=maxEvaluations)break
    if(Math.abs(c.x-row.x)<1e-8&&Math.abs(c.y-row.y)<1e-8)continue
    if(c.x+row.width>fabricWidthCm+1e-7||c.y+row.height>maxLengthCm+1e-7)continue
    checks++
    const result=validate(project,current,{pieceId:row.pieceId,instance:row.instance,
     x:c.x,y:c.y,rotationDeg:row.rotationDeg,fabricWidthCm,gapCm,maxLengthCm})
    if(result.ok&&(result.metrics.length<best.metrics.length-1e-6||
      (Math.abs(result.metrics.length-best.metrics.length)<=1e-6&&
       (result.placements.find(p=>key(p)===key(row)).y<best.placements.find(p=>key(p)===key(row)).y-1e-6))))
      best=result
   }
   if(best!==current){current=best;accepted++}
  }
  const final=validate(project,current,{pieceId:anchor.pieceId,instance:anchor.instance,
   x:current.placements.find(p=>key(p)===key(anchor)).x,
   y:current.placements.find(p=>key(p)===key(anchor)).y,
   rotationDeg:anchor.rotationDeg,fabricWidthCm,gapCm,maxLengthCm})
  if(!final.ok||final.metrics.length>beforeCm+1e-6)return fail('FINAL_VALIDATION_FAILED',final.code)
  return {...final,optimization:{beforeLengthCm:round(beforeCm),afterLengthCm:round(final.metrics.length),
   savedLengthCm:round(beforeCm-final.metrics.length),evaluations:checks,acceptedMoves:accepted,
   reachedBudget:checks>=maxEvaluations,units:'cm',sourceRevision:project.revision??null},
   manufacturingApproved:false,cuttingAuthorized:false}
 }catch(error){return fail('SOURCE_REFUSED',error.message)}
}

/** Compare material consumption for an existing and optimized complete marker.
 * Each ply consumes one full marker length from one contiguous roll.
 */
export function compareAccuMarkMarkerRollDemand20261024(project,before,after,{
 fabricWidthCm,gapCm=1,maxLengthCm=1000,plyCount,rolls
}={}){
 try{
  ;[project,before,after,rolls]=[snapshot(project),snapshot(before),snapshot(after),snapshot(rolls)]
  if(!Number.isSafeInteger(plyCount)||plyCount<1||plyCount>10000||
   !Array.isArray(rolls)||!rolls.length||rolls.length>64||
   rolls.some(r=>typeof r.rollId!=='string'||!r.rollId||!finite(r.usableLengthCm)||r.usableLengthCm<=0||r.usableLengthCm>1e7)||
   new Set(rolls.map(r=>r.rollId)).size!==rolls.length)return fail('INVALID_ROLL_PLAN')
  const options={fabricWidthCm,gapCm,maxLengthCm,maxEvaluations:1}
  const check=(nest)=>optimizeAccuMarkMarkerProduction20261024(project,nest,options)
  const a=check(before),b=check(after)
  if(!a.ok||!b.ok)return fail('MARKER_UNVERIFIED',a.ok?b.code:a.code)
  // Read original verified length, which is invariant under harmless proof attempts.
  const beforeCm=a.optimization.beforeLengthCm,afterCm=b.optimization.beforeLengthCm
  function allocate(lengthCm){
   const available=rolls.map(r=>({rollId:r.rollId,remainingCm:r.usableLengthCm,plies:0}))
   let left=plyCount
   for(const r of available){
    const count=Math.min(left,Math.floor((r.remainingCm+1e-8)/lengthCm))
    r.plies=count;r.remainingCm=round(r.remainingCm-count*lengthCm);left-=count
   }
   return {feasible:left===0,unallocatedPlies:left,requiredCm:round(plyCount*lengthCm),
    allocations:available,rollsUsed:available.filter(r=>r.plies>0).length}
  }
  return {ok:true,before:{lengthCm:beforeCm,...allocate(beforeCm)},
   after:{lengthCm:afterCm,...allocate(afterCm)},
   materialSavedCm:round(plyCount*(beforeCm-afterCm)),units:'cm',
   manufacturingApproved:false,cuttingAuthorized:false}
 }catch(error){return fail('SOURCE_REFUSED',error.message)}
}
