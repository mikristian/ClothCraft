// Engineering reference extraction. This outline is never a sewn or factory CUT piece.
const fail=code=>{throw new Error('REFERENCE_EXTRACT_'+code)}
function safeClone(root){
 const seen=new Set();let nodes=0
 function copy(v,depth=0){
  if(v===null||typeof v==='boolean'||typeof v==='string')return v
  if(typeof v==='number'){if(!Number.isFinite(v))fail('NONFINITE');return v}
  if(!v||typeof v!=='object')fail('UNSAFE_VALUE')
  if(seen.has(v))fail('CYCLE_OR_ALIAS');seen.add(v)
  if(++nodes>12000||depth>40||Object.getPrototypeOf(v)!==(Array.isArray(v)?Array.prototype:Object.prototype))fail('COMPLEXITY')
  const array=Array.isArray(v),descs=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(descs)
  if(keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype','toJSON'].includes(k)))fail('UNSAFE_KEY')
  const out=array?[]:{}
  if(array&&v.length>12000)fail('COMPLEXITY')
  for(const k of keys){
   if(array&&k==='length')continue
   const d=descs[k]
   if(!Object.hasOwn(d,'value')||!d.enumerable)fail('ACCESSOR_OR_HIDDEN')
   if(array&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=v.length))fail('ARRAY_KEY')
   Object.defineProperty(out,k,{value:copy(d.value,depth+1),enumerable:true,writable:true,configurable:true})
  }
  if(array&&(out.length!==v.length||Object.keys(out).length!==v.length))fail('SPARSE_ARRAY')
  return out
 }
 return copy(root)
}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
function intersects(a,b,c,d){
 const e=1e-9,ab=cross(a,b,c),ad=cross(a,b,d),ca=cross(c,d,a),cb=cross(c,d,b)
 const on=(p,q,r)=>r.x>=Math.min(p.x,q.x)-e&&r.x<=Math.max(p.x,q.x)+e&&r.y>=Math.min(p.y,q.y)-e&&r.y<=Math.max(p.y,q.y)+e
 return ((ab>e&&ad< -e||ab< -e&&ad>e)&&(ca>e&&cb< -e||ca< -e&&cb>e))||Math.abs(ab)<=e&&on(a,b,c)||Math.abs(ad)<=e&&on(a,b,d)||Math.abs(ca)<=e&&on(c,d,a)||Math.abs(cb)<=e&&on(c,d,b)
}
function validate(points){
 if(!Array.isArray(points)||points.length<3||points.length>128)fail('POINTS')
 for(const p of points)if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>1e5||Math.abs(p.y)>1e5||Object.keys(p).some(k=>!['x','y'].includes(k)))fail('POINT_METADATA_OR_COORDINATE')
 let a=0
 for(let i=0;i<points.length;i++){
  const p=points[i],q=points[(i+1)%points.length];a+=p.x*q.y-q.x*p.y
  if(Math.hypot(q.x-p.x,q.y-p.y)<1e-7)fail('DEGENERATE_EDGE')
  for(let j=i+1;j<points.length;j++)if(j!==i+1&&!(i===0&&j===points.length-1)&&intersects(p,q,points[j],points[(j+1)%points.length]))fail('SELF_INTERSECTION')
 }
 if(!Number.isFinite(a)||Math.abs(a)<1e-7)fail('DEGENERATE_AREA')
}
function validatedCurves(curves,points){
 if(curves===undefined)return undefined
 if(!curves||Array.isArray(curves)||typeof curves!=='object')fail('CURVE_MAP')
 const out={}
 for(const [edge,c] of Object.entries(curves)){
  if(!/^(0|[1-9]\d*)$/.test(edge)||+edge>=points.length||!c||Array.isArray(c)||Object.keys(c).sort().join(',')!=='cx,cy'||!Number.isFinite(c.cx)||!Number.isFinite(c.cy)||Math.abs(c.cx)>1e5||Math.abs(c.cy)>1e5)fail('CURVE_CONTROL')
  out[edge]={cx:c.cx,cy:c.cy}
 }
 return out
}
function validateCurvedContour(points,curves){
 const sampled=[]
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],c=curves?.[i]
  for(let j=0;j<(c?24:1);j++){
   const t=j/(c?24:1),u=1-t
   sampled.push(c?{x:u*u*a.x+2*u*t*c.cx+t*t*b.x,y:u*u*a.y+2*u*t*c.cy+t*t*b.y}:a)
  }
 }
 if(sampled.length>3072)fail('SAMPLE_BUDGET')
 validateSampled(sampled)
}
function validateSampled(points){
 let area=0
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length]
  if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||Math.hypot(a.x-b.x,a.y-b.y)<1e-7)fail('CURVE_CUSP_OR_ZERO_SEGMENT')
  area+=a.x*b.y-a.y*b.x
  for(let j=i+2;j<points.length;j++)if(!(i===0&&j===points.length-1)&&intersects(a,b,points[j],points[(j+1)%points.length]))fail('CURVED_SELF_INTERSECTION')
 }
 if(!Number.isFinite(area)||Math.abs(area)<1e-7)fail('CURVED_DEGENERATE_AREA')
}
function hashGeometry(points){
 const content=points.map(p=>`${Object.is(p.x,-0)?0:p.x},${Object.is(p.y,-0)?0:p.y}`).join(';')
 let h=0xcbf29ce484222325n
 for(let i=0;i<content.length;i++){h^=BigInt(content.charCodeAt(i));h=(h*0x100000001b3n)&0xffffffffffffffffn}
 return 'fnv1a64:'+h.toString(16).padStart(16,'0')
}
function hashSource(points,curves){
 const tokens=[...points.map(p=>`${Object.is(p.x,-0)?0:p.x},${Object.is(p.y,-0)?0:p.y}`),...Object.entries(curves||{}).sort(([a],[b])=>+a- +b).map(([edge,c])=>`q${edge}:${Object.is(c.cx,-0)?0:c.cx},${Object.is(c.cy,-0)?0:c.cy}`)]
 return 'fnv1a64:'+hashText(tokens.join('|'))
}
function hashText(content){let h=0xcbf29ce484222325n;for(let i=0;i<content.length;i++){h^=BigInt(content.charCodeAt(i));h=h*0x100000001b3n&0xffffffffffffffffn}return h.toString(16).padStart(16,'0')}

/** Return {project,study,piece,provenance}; detached sidecar never enters CUT inventory. */
export function extractAccuMarkReferencePiece20261024_1341(project,options={}){
 const opts=safeClone(options),source=safeClone(project)
 if(!opts||Object.keys(opts).some(k=>!['sourcePieceId','referenceId','referenceName'].includes(k)))fail('OPTIONS')
 if(!source||!Array.isArray(source.pieces)||source.pieces.length<1||source.pieces.length>=128)fail('PIECE_BUDGET')
 if(typeof opts.sourcePieceId!=='string'||typeof opts.referenceId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(opts.referenceId))fail('IDENTITY')
 if(source.pieces.some(p=>!p||typeof p.id!=='string')||new Set(source.pieces.map(p=>p.id)).size!==source.pieces.length||source.pieces.some(p=>p.id===opts.referenceId))fail('DUPLICATE_ID')
 const original=source.pieces.find(p=>p.id===opts.sourcePieceId)
 if(!original)fail('SOURCE_NOT_FOUND')
 if(original.points?.some(p=>p.gradeRule||p.industrialGradeRule)||original.grading||original.gradeRules)fail('GRADE_RULE_UNSUPPORTED')
 validate(original.points)
 const curves=validatedCurves(original.curves,original.points)
 if(Object.keys(curves||{}).length)validateCurvedContour(original.points,curves)
 const name=opts.referenceName??`${original.name||original.id} (detached reference)`
 if(typeof name!=='string'||!name.trim()||name.length>140)fail('NAME')
 const geometryHash=hashSource(original.points,curves)
 const provenance={sourcePieceId:original.id,sourceGeometryHash:geometryHash,geometryUnit:'cm',referenceOnly:true,detached:true,approved:false,factoryApproved:false,sewingAndGradingRulesImported:false,gradedSizesProductionSafe:false,sourceRevision:source.revision??null}
 const piece={id:opts.referenceId,name,points:original.points.map(p=>({x:p.x,y:p.y})),
   locked:true,patternImportProvenance:provenance}
 if(Object.keys(curves||{}).length)piece.curves=curves
 if(typeof original.fabricId==='string')piece.fabricId=original.fabricId
 // This sidecar is not a production piece and has no cut quantity or seam allowance.
 // The returned project is an exact safe snapshot of the original, including its revision.
 const study={kind:'DETACHED_REFERENCE_OUTLINE_STUDY',referenceOnly:true,factoryApproved:false,unit:'cm',piece,provenance,
   grading:{mode:'FROZEN_SOURCE_CONTOUR',sizeVariantsProductionSafe:false,sourceBaseGeometryOnly:true}}
 return {project:source,study,piece,provenance,unit:'cm',engineeringOnly:true,warnings:['Detached sidecar only; not part of project CUT inventory. Sewing, cutting and graded-size equivalence are unverified.']}
}
/** Refresh a detached reference only when its source identity is still present. */
export function regenerateAccuMarkReferencePiece20261027(project,previous){
 if(!previous||typeof previous!=='object'||Array.isArray(previous))fail('INVALID_LINK')
 const former=safeClone({kind:previous.kind,referenceOnly:previous.referenceOnly,factoryApproved:previous.factoryApproved,piece:{id:previous.piece?.id,name:previous.piece?.name,locked:previous.piece?.locked,patternImportProvenance:previous.piece?.patternImportProvenance},provenance:{sourcePieceId:previous.provenance?.sourcePieceId,sourceGeometryHash:previous.provenance?.sourceGeometryHash,referenceOnly:previous.provenance?.referenceOnly,detached:previous.provenance?.detached}})
 if(!former||former.kind!=='DETACHED_REFERENCE_OUTLINE_STUDY'||former.referenceOnly!==true||former.factoryApproved!==false||!former.piece||former.piece.locked!==true||former.piece.patternImportProvenance?.sourceGeometryHash!==former.provenance?.sourceGeometryHash||former.piece.patternImportProvenance?.sourcePieceId!==former.provenance?.sourcePieceId||former.provenance?.referenceOnly!==true||former.provenance?.detached!==true||former.piece.patternImportProvenance?.referenceOnly!==true||former.piece.patternImportProvenance?.detached!==true)fail('INVALID_LINK')
 const regenerated=extractAccuMarkReferencePiece20261024_1341(project,{sourcePieceId:former.provenance.sourcePieceId,referenceId:former.piece.id,referenceName:former.piece.name})
 const stale=regenerated.provenance.sourceGeometryHash!==former.provenance.sourceGeometryHash
 return {...regenerated,sourceChanged:stale,previousSourceGeometryHash:former.provenance.sourceGeometryHash,regenerated:true}
}
