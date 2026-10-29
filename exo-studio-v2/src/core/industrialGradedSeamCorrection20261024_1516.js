import {gradeProject} from './grading.js'
import {edgeLength,edgeRangeLength,edgePointAt} from './project.js'
import {quadraticAtLengthFraction} from './draftingPrecision.js'
import {inspectGradedNotchSeamIntervals} from './gradedNotchIntervalAudit.js'
import {validateIndustrialGradeRule} from './industrialGradeRules.js'

const finite = x => typeof x === 'number' && Number.isFinite(x)
const identifier = x => typeof x === 'string' && x.length > 0 && x.length < 129 && x.trim() === x && !['__proto__','constructor','prototype'].includes(x)
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k)
const allowedNotch = new Set(['id','type','edgeIndex','t','depthCm','widthCm','lengthCm','matchGroupId','matchedSeamId','x','y','angleDeg','label','name','direction','count','style','gradeArcStation'])
const allowedSide = new Set(['pieceId','edgeIndex','startT','endT'])
const schemas={
 project:new Set(['id','name','revision','updatedAt','pieces','seams','grading','metadata']),
 grading:new Set(['sizes','baseSize','widthPerSizeCm','lengthPerSizeCm']),
 piece:new Set(['id','name','points','curves','notches','internalLines','color','fabricId','quantity','cutQty','cutQuantity','material','notes','label','type','category','description','rotation','locked','visible','position']),
 point:new Set(['id','x','y','gradeRule','industrialGradeRule']),
 legacyRule:new Set(['enabled','dxPerSize','dyPerSize']),
 industrialRule:new Set(['mode','sizes','baseSize','steps','up','down']),
 seam:new Set(['id','name','type','a','b','reverseB']),
 curve:new Set(['cx','cy']),
}
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype
function checked(obj,keys,code){if(!plain(obj)||Object.keys(obj).some(k=>!keys.has(k)))throw Error(code)}
function inspectSource(p){
 checked(p,schemas.project,'UNSUPPORTED_PROJECT_METADATA')
 checked(p.grading,schemas.grading,'UNSUPPORTED_GRADING_METADATA')
 if(!Array.isArray(p.pieces)||!Array.isArray(p.seams))throw Error('INVALID_PROJECT')
 for(const piece of p.pieces){
  checked(piece,schemas.piece,'UNSUPPORTED_PIECE_METADATA')
  if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>512)throw Error('INVALID_PIECE_POINTS')
  for(const point of piece.points){
   checked(point,schemas.point,'UNSUPPORTED_POINT_METADATA')
   if(!finite(point.x)||!finite(point.y))throw Error('INVALID_POINT')
   if(point.gradeRule!==undefined){
    checked(point.gradeRule,schemas.legacyRule,'UNSUPPORTED_GRADE_RULE')
    if(typeof point.gradeRule.enabled!=='boolean'||!finite(point.gradeRule.dxPerSize)||!finite(point.gradeRule.dyPerSize)||Math.abs(point.gradeRule.dxPerSize)>10000||Math.abs(point.gradeRule.dyPerSize)>10000)throw Error('INVALID_GRADE_RULE')
    if(point.gradeRule.enabled!==true)throw Error('INACTIVE_GRADE_RULE_UNVERIFIED')
   }
   if(point.industrialGradeRule!==undefined){
    checked(point.industrialGradeRule,schemas.industrialRule,'UNSUPPORTED_INDUSTRIAL_GRADE_RULE')
    if(point.gradeRule!==undefined)throw Error('AMBIGUOUS_GRADE_RULE')
    if(JSON.stringify(point.industrialGradeRule.sizes)!==JSON.stringify(p.grading.sizes)||point.industrialGradeRule.baseSize!==p.grading.baseSize)throw Error('STALE_GRADE_RULE')
    if(!['small-large-incremental','base-up-down-incremental','base-up-down-cumulative'].includes(point.industrialGradeRule.mode))throw Error('INVALID_INDUSTRIAL_RULE')
    const r=point.industrialGradeRule
    const steps=r.mode==='small-large-incremental'?r.steps:[...(r.up||[]),...(r.down||[])]
    if(!Array.isArray(steps)||steps.some(step=>!plain(step)||Object.keys(step).some(k=>!['dx','dy'].includes(k))||!finite(step.dx)||!finite(step.dy)))throw Error('INVALID_INDUSTRIAL_RULE_STEPS')
    try{validateIndustrialGradeRule(r)}catch{throw Error('INVALID_INDUSTRIAL_RULE_STRUCTURE')}
   }
  }
  if(piece.curves!==undefined){checked(piece.curves,new Set(Object.keys(piece.curves)),'UNSAFE_CURVE_MAP');for(const [key,c] of Object.entries(piece.curves)){
   if(!/^(0|[1-9]\d*)$/.test(key)||+key>=piece.points.length)throw Error('INVALID_CURVE_INDEX')
   checked(c,schemas.curve,'UNSAFE_CURVE_METADATA');if(!finite(c.cx)||!finite(c.cy))throw Error('INVALID_CURVE_CONTROL')
  }}
  if(piece.notches!==undefined){
   if(!Array.isArray(piece.notches))throw Error('INVALID_NOTCHES')
   const ids=new Set()
   for(const notch of piece.notches){
    checked(notch,allowedNotch,'UNSAFE_NOTCH_METADATA')
    if(!identifier(notch.id)||ids.has(notch.id)||!Number.isInteger(notch.edgeIndex)||notch.edgeIndex<0||notch.edgeIndex>=piece.points.length||!finite(notch.t)||notch.t<0||notch.t>1)throw Error('INVALID_NOTCH')
    ids.add(notch.id)
    if(own(notch,'x')!==own(notch,'y'))throw Error('STALE_NOTCH_COORDINATES')
    if(own(notch,'x')){const point=edgePointAt(piece,notch.edgeIndex,notch.t)?.point;if(!point||!finite(notch.x)||!finite(notch.y)||Math.hypot(notch.x-point.x,notch.y-point.y)>0.005)throw Error('STALE_NOTCH_COORDINATES')}
    if(notch.gradeArcStation!==undefined)throw Error('EXISTING_STATION_RULE')
   }
  }
  // Internal construction anchors and auxiliary collections are outside this
  // narrow station-edit transaction until their whole-size semantics are proven.
  if(piece.internalLines!==undefined)throw Error('UNVERIFIED_INTERNAL_CONSTRUCTION')
 }
 for(const seam of p.seams){
  checked(seam,schemas.seam,'UNSUPPORTED_SEAM_SEMANTICS')
  if(!identifier(seam.id)||typeof seam.reverseB!=='boolean')throw Error('INVALID_SEAM')
  for(const side of [seam.a,seam.b]){
   checked(side,allowedSide,'UNSUPPORTED_SEAM_SIDE')
   if(!identifier(side.pieceId)||!Number.isInteger(side.edgeIndex))throw Error('INVALID_SEAM_SIDE')
   const piece=p.pieces.find(x=>x.id===side.pieceId)
   if(!piece||side.edgeIndex<0||side.edgeIndex>=piece.points.length)throw Error('INVALID_SEAM_EDGE')
   const start=side.startT??0,end=side.endT??1
   if(!finite(start)||!finite(end)||start<0||end>1||end-start<1e-6)throw Error('INVALID_SEAM_INTERVAL')
  }
 }
}
function safeClone(value){
 const seen=new Set();let count=0
 function copy(v,depth){
  if(v===null||typeof v==='string'||typeof v==='boolean')return v
  if(finite(v))return v
  if(typeof v!=='object'||depth>32||++count>25000||seen.has(v))throw Error('UNSAFE_SOURCE')
  const array=Array.isArray(v),p=Object.getPrototypeOf(v)
  if(p!==(array?Array.prototype:Object.prototype)&&!(p===null&&!array))throw Error('UNSAFE_SOURCE_PROTOTYPE')
  const d=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(d)
  if(keys.length>10000||keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype','toJSON'].includes(k)))throw Error('UNSAFE_SOURCE_KEYS')
  if(array&&v.length>10000)throw Error('UNSAFE_ARRAY')
  seen.add(v);const o=array?[]:{}
  for(const k of keys){
   if(array&&k==='length')continue
   if(!d[k].enumerable||!own(d[k],'value')||(array&&(!/^(0|[1-9]\d*)$/.test(k)||+k>=v.length)))throw Error('UNSAFE_SOURCE_DESCRIPTOR')
   Object.defineProperty(o,k,{value:copy(d[k].value,depth+1),enumerable:true,writable:true,configurable:true})
  }
  if(array&&(o.length!==v.length||Object.keys(o).length!==v.length))throw Error('SPARSE_SOURCE_ARRAY')
  seen.delete(v);return o
 }
 return copy(value,0)
}
const locate=(project,side,notchId)=>{
 const found=project.pieces.filter(p=>p.id===side.pieceId)
 if(found.length!==1)throw Error('AMBIGUOUS_PIECE')
 const piece=found[0]
 if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>512||!Number.isInteger(side.edgeIndex)||side.edgeIndex<0||side.edgeIndex>=piece.points.length)throw Error('INVALID_EDGE')
 if(piece.points.some(p=>!finite(p?.x)||!finite(p?.y)))throw Error('INVALID_COORDINATES')
 if(piece.curves && (typeof piece.curves!=='object'||Array.isArray(piece.curves)||Object.entries(piece.curves).some(([k,v])=> !/^(0|[1-9]\d*)$/.test(k)||+k>=piece.points.length||!finite(v?.cx)||!finite(v?.cy)||Object.keys(v).some(key=>!['cx','cy'].includes(key)))))throw Error('UNSAFE_CURVES')
 if(!Array.isArray(piece.notches))throw Error('INVALID_NOTCHES')
 if(piece.notches.some(n=>!identifier(n?.id)||!Number.isInteger(n.edgeIndex)||n.edgeIndex<0||n.edgeIndex>=piece.points.length||!finite(n.t)||n.t<0||n.t>1||Object.keys(n).some(k=>!allowedNotch.has(k))))throw Error('UNSAFE_NOTCH_METADATA')
 if(new Set(piece.notches.map(n=>n.id)).size!==piece.notches.length)throw Error('DUPLICATE_NOTCH')
 const notches=piece.notches.filter(n=>n.id===notchId)
 if(notches.length!==1||notches[0].edgeIndex!==side.edgeIndex)throw Error('NOTCH_TOPOLOGY')
 const notch=notches[0]
 if(notch.gradeArcStation!==undefined)throw Error('EXISTING_STATION_RULE')
 if(own(notch,'x')!==own(notch,'y'))throw Error('STALE_NOTCH_COORDINATES')
 if(own(notch,'x')){
  const p=edgePointAt(piece,side.edgeIndex,notch.t,64)?.point
  if(!p||!finite(notch.x)||!finite(notch.y)||Math.hypot(notch.x-p.x,notch.y-p.y)>0.005)throw Error('STALE_NOTCH_COORDINATES')
 }
 return {piece,notch}
}
function range(piece,side){
 if(Object.keys(side).some(k=>!allowedSide.has(k)))throw Error('UNSUPPORTED_SEAM_SIDE')
 const start=side.startT===undefined?0:side.startT,end=side.endT===undefined?1:side.endT
 if(!finite(start)||!finite(end)||start<0||end>1||end-start<1e-6)throw Error('INVALID_INTERVAL')
 const length=edgeRangeLength(piece,side.edgeIndex,start,end)
 const total=edgeLength(piece,side.edgeIndex)
 if(!finite(total)||!finite(length)||length<0.01||total>100000)throw Error('INVALID_SEAM_LENGTH')
 const prefix=edgeRangeLength(piece,side.edgeIndex,0,start),suffix=edgeRangeLength(piece,side.edgeIndex,end,1)
 return {start,end,length,total,prefix,suffix}
}
function stationFraction(piece,side,cm,reverse){
 const r=range(piece,side)
 if(!(cm>0.005&&cm<r.length-0.005))throw Error('NOTCH_OUTSIDE_SEWN_INTERVAL')
 const physical=reverse?r.prefix+r.length-cm:r.prefix+cm
 const t=physical/r.total
 if(!(t>0&&t<1))throw Error('INVALID_STATION')
 const curve=piece.curves?.[side.edgeIndex]
 const parameter=curve?quadraticAtLengthFraction(piece.points[side.edgeIndex],{x:curve.cx,y:curve.cy},piece.points[(side.edgeIndex+1)%piece.points.length],t).parameter:t
 if(parameter<r.start-1e-7||parameter>r.end+1e-7)throw Error('STATION_OUTSIDE_INTERVAL')
 return {t,distanceCm:physical,parameter}
}
/**
 * Safe, atomic grade-arc-station transaction on an authored pair of sewn notches.
 * Identical physical sewn-station distance in every graded size is required.
 * This does not alter stitchline geometry or claim physical fit/factory approval.
 */
export function correctIndustrialGradedSeamNotches20261024(source,{seamId,matchGroupId,stationCm,toleranceCm=0.02,seamToleranceCm=0.05}={}){
 try{
  const p=safeClone(source)
  inspectSource(p)
  if(!identifier(seamId)||!identifier(matchGroupId)||!finite(stationCm)||!(stationCm>0)||!finite(toleranceCm)||toleranceCm<0||toleranceCm>0.02||!finite(seamToleranceCm)||seamToleranceCm<0||seamToleranceCm>0.05)throw Error('INVALID_OPTIONS')
  const sizes=p.grading?.sizes
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||sizes.some(s=>!identifier(s))||new Set(sizes).size!==sizes.length||!sizes.includes(p.grading.baseSize))throw Error('INVALID_SIZE_RUN')
  if(!Array.isArray(p.pieces)||!Array.isArray(p.seams)||p.pieces.length<2||p.pieces.length>128||p.seams.length<1||p.seams.length>512)throw Error('INVALID_PROJECT')
  if(p.pieces.some(x=>!identifier(x?.id))||new Set(p.pieces.map(x=>x.id)).size!==p.pieces.length||p.seams.some(x=>!identifier(x?.id))||new Set(p.seams.map(x=>x.id)).size!==p.seams.length)throw Error('DUPLICATE_SOURCE_ID')
  const seams=p.seams.filter(s=>s.id===seamId)
  if(seams.length!==1)throw Error('AMBIGUOUS_SEAM')
  const seam=seams[0]
  if(Object.keys(seam).some(k=>!['id','name','type','a','b','reverseB'].includes(k))||seam.reverseB!==undefined&&typeof seam.reverseB!=='boolean'||seam.a?.pieceId===seam.b?.pieceId)throw Error('UNSUPPORTED_SEAM_SEMANTICS')
  if(!seam.a||!seam.b||!identifier(seam.a.pieceId)||!identifier(seam.b.pieceId))throw Error('INVALID_SEAM_SIDE')
  if(p.seams.some(s=>s!==seam&&[s.a,s.b].some(v=>v&&([seam.a,seam.b].some(w=>w.pieceId===v.pieceId&&w.edgeIndex===v.edgeIndex)))))throw Error('SHARED_EDGE_UNVERIFIED')
  const matches=[]
  for(const piece of p.pieces)for(const notch of Array.isArray(piece.notches)?piece.notches:[]){if(notch?.matchGroupId===matchGroupId)matches.push({piece,notch})}
  if(matches.length!==2||matches.some(x=>x.notch.matchedSeamId!==seamId))throw Error('INVALID_MATCHED_NOTCH_PAIR')
  const pair=[seam.a,seam.b].map(side=>{
   const ms=matches.filter(x=>x.piece.id===side.pieceId&&x.notch.edgeIndex===side.edgeIndex)
   if(ms.length!==1)throw Error('NOTCH_WRONG_SEAM_EDGE')
   return {side,notchId:ms[0].notch.id}
  })
  for(const {side,notchId} of pair){const {piece}=locate(p,side,notchId);range(piece,side)}
  const rows=[]
  for(const size of sizes){
   const graded=gradeProject(p,size)
   const [first,second]=pair.map(({side,notchId})=>{
    const {piece}=locate(graded,side,notchId)
    return {piece,...stationFraction(piece,side,stationCm,side===seam.b&&seam.reverseB===true),side}
   })
   const a=range(first.piece,seam.a),b=range(second.piece,seam.b)
   if(Math.abs(a.length-b.length)>seamToleranceCm)throw Error(`SEAM_LENGTH_MISMATCH:${size}`)
   rows.push({size,seamLengthAcm:a.length,seamLengthBcm:b.length,stationAcm:stationCm,stationBcm:stationCm,
    tA:first.t,tB:second.t,distanceAcm:first.distanceCm,distanceBcm:second.distanceCm})
  }
  const base=rows.find(x=>x.size===p.grading.baseSize)
  for(const [i,{side,notchId}] of pair.entries()){
   const {piece,notch}=locate(p,side,notchId)
   const field=i===0?'distanceAcm':'distanceBcm'
   const all=rows.map(x=>x[field])
   if(all.some(x=>Math.abs(x-all[0])>1e-5))throw Error(`SIZE_DEPENDENT_ARC_RULE_UNSUPPORTED:${side.pieceId}`)
   notch.gradeArcStation={distanceCm:all[0],from:'start',version:1}
   notch.t=i===0?base.tA:base.tB
   if(own(notch,'x')){const xy=edgePointAt(piece,side.edgeIndex,notch.t,64)?.point;notch.x=xy.x;notch.y=xy.y}
  }
  const verified=inspectGradedNotchSeamIntervals(p,{sizes,toleranceCm})
  if(verified.status!=='pass'||verified.checks.length<sizes.length||verified.checks.some(x=>x.group===matchGroupId&&!x.pass))throw Error('SIZE_RUN_NOTCH_AUDIT_FAILED')
  for(const row of rows){
   const graded=gradeProject(p,row.size)
   for(const [i,{side,notchId}] of pair.entries()){
    const piece=graded.pieces.find(x=>x.id===side.pieceId)
    const notch=piece.notches.find(x=>x.id===notchId)
    const wanted=i===0?row.tA:row.tB
    if(Math.abs(notch.t-wanted)>1e-7)throw Error('GRADE_RULE_STATION_DRIFT')
   }
  }
  return {ok:true,project:p,validation:{status:'measurement_only',checkedSizes:[...sizes],rows,notchAudit:verified,
   manufacturingApproved:false,physicalFitApproved:false,simulationVerified:false}}
 }catch(error){return {ok:false,code:String(error?.message||error),project:null,manufacturingApproved:false}}
}
