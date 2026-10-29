import { gradeProject } from './grading.js'
import { edgePointAt, edgeLength } from './project.js'
import { inspectDraftTopology } from './draftingTopology.js'
import { validateIndustrialGradeRule } from './industrialGradeRules.js'

const allowed = {
  project: ['id','name','revision','updatedAt','pieces','grading'],
  grading: ['sizes','baseSize','widthPerSizeCm','lengthPerSizeCm'],
  piece: ['id','name','points','curves','notches','internalLines','color','fabricId','quantity'],
  point: ['id','x','y','industrialGradeRule'],
  curve: ['cx','cy'],
  notch: ['id','edgeIndex','t','x','y','depthCm','widthCm','matchGroupId','matchedSeamId'],
  line: ['id','type','a','b','aAnchor','bAnchor'],
  anchor: ['edgeIndex','vertexIndex','t'],
}
const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e5
const coordinate = p => p && finite(p.x) && finite(p.y)
const ident = s => typeof s === 'string' && s.length > 0 && s.length <= 100 && s.trim() === s && !['__proto__','constructor','prototype'].includes(s)
const plain = x => x && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype
const near = (a,b,tol=1e-4) => Math.hypot(a.x-b.x,a.y-b.y) <= tol
function fail(code) { const error = new Error('Attached CAD curve edit refused: '+code); error.code=code; throw error }
function copySafe(root) {
  const active=new Set();let nodes=0
  function visit(x,depth) {
    if(x===null||x===undefined||typeof x==='string'||typeof x==='boolean')return x
    if(typeof x==='number'){if(!Number.isFinite(x))fail('NONFINITE_SOURCE');return x}
    if(typeof x!=='object'||depth>32||++nodes>18000||active.has(x))fail('UNSAFE_SOURCE')
    if(Object.getPrototypeOf(x)!==(Array.isArray(x)?Array.prototype:Object.prototype))fail('UNSAFE_PROTOTYPE')
    const descriptors=Object.getOwnPropertyDescriptors(x),keys=Reflect.ownKeys(descriptors)
    if(keys.some(k=>typeof k!=='string'||['__proto__','prototype','constructor','toJSON'].includes(k)))fail('UNSAFE_PROPERTY')
    if(Array.isArray(x)&&x.length>8000)fail('ARRAY_LIMIT')
    const result=Array.isArray(x)?[]:{};active.add(x)
    for(const key of keys){
      if(Array.isArray(x)&&key==='length')continue
      const d=descriptors[key]
      if(!Object.hasOwn(d,'value')||!d.enumerable)fail('UNSAFE_DESCRIPTOR')
      if(Array.isArray(x)&&(!/^(0|[1-9]\d*)$/.test(key)||+key>=x.length))fail('ARRAY_METADATA')
      Object.defineProperty(result,key,{value:visit(d.value,depth+1),writable:true,enumerable:true,configurable:true})
    }
    if(Array.isArray(x)&&Object.keys(result).length!==x.length)fail('SPARSE_ARRAY')
    active.delete(x);return result
  }
  return visit(root,0)
}
function keys(x,type){if(!plain(x)||Object.keys(x).some(k=>!allowed[type].includes(k)))fail('UNSUPPORTED_'+type.toUpperCase()+'_METADATA')}
function strictGradeRule(rule){
 if(!plain(rule))fail('INVALID_GRADE_RULE')
 const common=['mode','sizes','baseSize']
 const variants={
  'small-large-incremental':['steps'],
  'base-up-down-incremental':['up','down'],
  'base-up-down-cumulative':['up','down'],
 }
 const fields=variants[rule.mode]
 if(!fields||Object.keys(rule).some(k=>![...common,...fields].includes(k)))fail('UNSUPPORTED_GRADE_RULE_METADATA')
 for(const field of fields){
  if(!Array.isArray(rule[field]))fail('INVALID_GRADE_RULE')
  for(const entry of rule[field]){
   if(!plain(entry)||Object.keys(entry).some(k=>!['dx','dy'].includes(k)))fail('UNSUPPORTED_GRADE_RULE_METADATA')
  }
 }
}
function validAnchor(anchor,count){
  keys(anchor,'anchor')
  if(Object.hasOwn(anchor,'vertexIndex')){
    if(Object.hasOwn(anchor,'edgeIndex')||Object.hasOwn(anchor,'t')||!Number.isInteger(anchor.vertexIndex)||anchor.vertexIndex<0||anchor.vertexIndex>=count)fail('INVALID_VERTEX_ANCHOR')
  }else if(!Number.isInteger(anchor.edgeIndex)||anchor.edgeIndex<0||anchor.edgeIndex>=count||!finite(anchor.t)||anchor.t<0||anchor.t>1)fail('INVALID_EDGE_ANCHOR')
}
function resolve(piece,anchor){return Object.hasOwn(anchor,'vertexIndex')?piece.points[anchor.vertexIndex]:edgePointAt(piece,anchor.edgeIndex,anchor.t)?.point}
function inspectPiece(p) {
  keys(p,'piece')
  if(!ident(p.id)||!Array.isArray(p.points)||p.points.length<3||p.points.length>=128)fail('INVALID_PIECE')
  const ids=new Set()
  for(const v of p.points){keys(v,'point');if(!ident(v.id)||ids.has(v.id)||!coordinate(v)||!v.industrialGradeRule)fail('POINT_OR_GRADE_RULE');ids.add(v.id)}
  if(p.curves!==undefined){if(!plain(p.curves))fail('CURVE_MAP');for(const [k,c] of Object.entries(p.curves)){
    if(!/^(0|[1-9]\d*)$/.test(k)||+k>=p.points.length)fail('CURVE_EDGE')
    keys(c,'curve');if(!finite(c.cx)||!finite(c.cy))fail('CURVE_CONTROL')
  }}
  if(p.notches!==undefined){if(!Array.isArray(p.notches)||p.notches.length>256)fail('NOTCH_LIST');const used=new Set();for(const n of p.notches){
    keys(n,'notch');if(!ident(n.id)||used.has(n.id)||!Number.isInteger(n.edgeIndex)||n.edgeIndex<0||n.edgeIndex>=p.points.length||!finite(n.t)||n.t<0||n.t>1)fail('NOTCH_ANCHOR');used.add(n.id)
    if(Object.hasOwn(n,'x')!==Object.hasOwn(n,'y'))fail('NOTCH_COORDINATES')
    if(Object.hasOwn(n,'x')&&(!coordinate(n)||!near(n,edgePointAt(p,n.edgeIndex,n.t)?.point)))fail('STALE_NOTCH_COORDINATES')
  }}
  if(p.internalLines!==undefined){if(!Array.isArray(p.internalLines)||p.internalLines.length>256)fail('LINE_LIST');const ids=new Set();for(const l of p.internalLines){
    keys(l,'line');if(!ident(l.id)||ids.has(l.id)||!coordinate(l.a)||!coordinate(l.b))fail('INVALID_LINE');ids.add(l.id)
    for(const side of ['a','b']){
      const anchor=l[side+'Anchor'];if(!anchor)fail('UNANCHORED_LINE');validAnchor(anchor,p.points.length)
      if(!near(l[side],resolve(p,anchor)))fail('STALE_LINE_ANCHOR')
    }
  }}
  if(!inspectDraftTopology(p,{curveSamples:20}).valid)fail('INVALID_TOPOLOGY')
}
const quad=(a,c,b,t)=>{const u=1-t;return {x:u*u*a.x+2*u*t*c.x+t*t*b.x,y:u*u*a.y+2*u*t*c.y+t*t*b.y}}
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})
const control=(p,i)=>({x:p.curves[i].cx,y:p.curves[i].cy})
// Parameter subdivision is exact by de Casteljau; edge attachments use physical arc fraction.
function splitGeometry(p,i,t,vertex){
  const a=p.points[i],b=p.points[(i+1)%p.points.length],c=control(p,i)
  const l=lerp(a,c,t),r=lerp(c,b,t),middle=lerp(l,r,t)
  const curves={};for(const [k,v] of Object.entries(p.curves||{}))curves[String(+k>i?+k+1:+k)]=v
  curves[i]={cx:l.x,cy:l.y};curves[i+1]={cx:r.x,cy:r.y}
  p.points.splice(i+1,0,{id:vertex,x:middle.x,y:middle.y})
  p.curves=curves
  return middle
}
function ruleForPositions(sizes,baseSize,positions){
  const base=positions[sizes.indexOf(baseSize)]
  const offsets=positions.map(p=>({dx:p.x-base.x,dy:p.y-base.y}))
  return validateIndustrialGradeRule({mode:'small-large-incremental',sizes:[...sizes],baseSize,steps:offsets.slice(1).map((x,i)=>({dx:x.dx-offsets[i].dx,dy:x.dy-offsets[i].dy}))})
}
function parameterForArcFraction(piece,index,fraction){
  if(fraction===0)return 0;if(fraction===1)return 1
  const c=control(piece,index),a=piece.points[index],b=piece.points[(index+1)%piece.points.length]
  const n=1024;let prev=a,total=0;const lengths=[0]
  for(let i=1;i<=n;i++){const next=quad(a,c,b,i/n);total+=Math.hypot(next.x-prev.x,next.y-prev.y);lengths.push(total);prev=next}
  const target=fraction*total;let lo=0,hi=n
  while(lo+1<hi){const mid=(lo+hi)>>1;if(lengths[mid]<target)lo=mid;else hi=mid}
  return (lo+(target-lengths[lo])/(lengths[hi]-lengths[lo]))/n
}
function locationAt(p,anchor){return resolve(p,anchor)}
function mappedAnchor(anchor,i,splitFraction,firstLengthRatio){
  const result={...anchor}
  if(Object.hasOwn(anchor,'vertexIndex')){if(result.vertexIndex>i)result.vertexIndex++;return result}
  if(result.edgeIndex>i){result.edgeIndex++;return result}
  if(result.edgeIndex<i)return result
  if(Math.abs(result.t-firstLengthRatio)<1e-8)return {edgeIndex:i,t:1}
  if(result.t<firstLengthRatio){result.edgeIndex=i;result.t=result.t/firstLengthRatio}
  else {result.edgeIndex=i+1;result.t=(result.t-firstLengthRatio)/(1-firstLengthRatio)}
  return result
}
/** Atomic proposal for a quadratic curved-edge subdivision on explicit industrial grade runs.
 * Requires arc-attached notch and internal line references with no opaque geometry metadata.
 * All size run geometry is verified before returning; no factory/fit approval is implied.
 */
export function splitAttachedGradedCurve20261024(project,{pieceId,edgeIndex,fraction}={}){
  const source=copySafe(project);keys(source,'project');keys(source.grading,'grading')
  const sizes=source.grading.sizes,baseSize=source.grading.baseSize
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>12||!sizes.every(ident)||new Set(sizes).size!==sizes.length||!sizes.includes(baseSize))fail('INVALID_SIZES')
  if(!Array.isArray(source.pieces)||source.pieces.length<1||source.pieces.length>30||!ident(pieceId)||source.pieces.some(p=>!ident(p?.id))||new Set(source.pieces.map(p=>p.id)).size!==source.pieces.length)fail('INVALID_PROJECT')
  for(const p of source.pieces){inspectPiece(p);for(const v of p.points){strictGradeRule(v.industrialGradeRule);let normalized;try{normalized=validateIndustrialGradeRule(v.industrialGradeRule)}catch{fail('INVALID_GRADE_RULE')};if(JSON.stringify(normalized.sizes)!==JSON.stringify(sizes)||normalized.baseSize!==baseSize)fail('GRADE_SIZE_MISMATCH')}}
  const piece=source.pieces.find(p=>p.id===pieceId)
  if(!piece||!Number.isInteger(edgeIndex)||edgeIndex<0||edgeIndex>=piece.points.length||!piece.curves?.[edgeIndex])fail('CURVE_EDGE_REQUIRED')
  if(!finite(fraction)||fraction<0.05||fraction>0.95)fail('INVALID_FRACTION')
  const before=sizes.map(size=>{try{return gradeProject(source,size).pieces.find(p=>p.id===pieceId)}catch{fail('GRADE_EVALUATION')}})
  for(const graded of before){if(!graded||graded.points.length!==piece.points.length||!inspectDraftTopology(graded,{curveSamples:20}).valid)fail('GRADED_CONTOUR')}
  const params=before.map(p=>parameterForArcFraction(p,edgeIndex,fraction))
  // The editor stores controls only in base size and regrades them through its
  // vertex displacement field. Reject any split that the existing grader cannot reproduce.
  const baseIndex=sizes.indexOf(baseSize),t=params[baseIndex]
  const ids=new Set(source.pieces.flatMap(p=>p.points.map(q=>q.id)))
  const prefix=pieceId+':curve:'+edgeIndex+':'+fraction.toString(16).replace(/[^a-zA-Z0-9]/g,'_')
  let id=prefix,index=0;while(ids.has(id)){id=prefix+':'+(++index);if(index>10000)fail('ID_EXHAUSTED')}
  if(!ident(id))fail('INVALID_INSERTED_ID')
  const original=before.map((p,index)=>{const q=structuredClone(p);splitGeometry(q,edgeIndex,params[index],id);return q})
  const positions=original.map(p=>p.points[edgeIndex+1]);const newRule=ruleForPositions(sizes,baseSize,positions)
  const oldPiece=structuredClone(piece),oldLength=edgeLength(oldPiece,edgeIndex)
  const basePoint=splitGeometry(piece,edgeIndex,t,id);piece.points[edgeIndex+1].industrialGradeRule=newRule
  const first=edgeLength(piece,edgeIndex)/oldLength
  if(first<0.04||first>0.96||!finite(first))fail('DEGENERATE_SPLIT')
  const map=(anchor)=>mappedAnchor(anchor,edgeIndex,fraction,first)
  for(const n of piece.notches||[]){const old={edgeIndex:n.edgeIndex,t:n.t};Object.assign(n,map(old));if(Object.hasOwn(n,'x')){const loc=locationAt(piece,n);n.x=loc.x;n.y=loc.y}}
  for(const line of piece.internalLines||[])for(const side of ['a','b']){
    const updated=map(line[side+'Anchor']);line[side+'Anchor']=updated
    const p=locationAt(piece,updated);line[side]={x:p.x,y:p.y}
  }
  const report=[]
  for(let s=0;s<sizes.length;s++){
    const size=sizes[s],expected=original[s];let after
    try{after=gradeProject(source,size).pieces.find(p=>p.id===pieceId)}catch{fail('GRADED_SPLIT_ERROR')}
    if(!after||after.points.length!==expected.points.length||!inspectDraftTopology(after,{curveSamples:20}).valid)fail('GRADED_SPLIT_TOPOLOGY')
    if(after.points.some((p,i)=>!near(p,expected.points[i],1e-5)))fail('GRADED_VERTEX_DRIFT')
    for(const [key,c] of Object.entries(expected.curves))if(!after.curves[key]||!near({x:after.curves[key].cx,y:after.curves[key].cy},{x:c.cx,y:c.cy},1e-4))fail('GRADED_CONTROL_DRIFT')
    for(const n of piece.notches||[]){const old=before[s].notches?.find(x=>x.id===n.id);const revised=after.notches?.find(x=>x.id===n.id)
      if(!old||!revised||!near(edgePointAt(before[s],old.edgeIndex,old.t).point,edgePointAt(after,revised.edgeIndex,revised.t).point,1e-4))fail('GRADED_NOTCH_DRIFT')}
    for(const line of piece.internalLines||[]){const old=before[s].internalLines?.find(x=>x.id===line.id),revised=after.internalLines?.find(x=>x.id===line.id)
      if(!old||!revised)fail('GRADED_LINE_LOSS')
      for(const side of ['a','b'])if(!near(old[side],revised[side],1e-4))fail('GRADED_LINE_DRIFT')}
    report.push({size,contourValid:true,vertexCount:after.points.length})
  }
  if(!near(basePoint,positions[baseIndex],1e-6))fail('BASE_VERTEX_DRIFT')
  return {project:source,detail:{pieceId,edgeIndex,fraction,insertedIndex:edgeIndex+1,vertexId:id},validation:{status:'GRADED_GEOMETRY_VERIFIED',sizes:report,sourceUnchanged:true,manufacturingApproved:false,physicalFitApproved:false}}
}
