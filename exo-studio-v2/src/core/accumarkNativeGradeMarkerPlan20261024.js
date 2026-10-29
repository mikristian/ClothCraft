import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {optimizeAccuMarkMarkerProduction20261024,compareAccuMarkMarkerRollDemand20261024} from './accumarkMarkerProductionOptimization20261024.js'

const fail=(code,detail=code)=>({ok:false,code,detail,manufacturingApproved:false,cuttingAuthorized:false,factoryApproved:false})
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const safeName=s=>typeof s==='string'&&s.length>0&&s.length<=256&&!['__proto__','prototype','constructor','toJSON'].includes(s)
// Clone ordinary own data only. Never read a getter, invoke toJSON, or accept hidden metadata.
function snapshot(source){
 const active=new Set();let nodes=0,fields=0
 function visit(value,depth=0){
  if(value===null||value===undefined||typeof value==='string'||typeof value==='boolean'||finite(value))return value
  if(typeof value!=='object'||depth>26||++nodes>9000||active.has(value))throw Error('UNSAFE_SOURCE')
  const proto=Object.getPrototypeOf(value),array=Array.isArray(value)
  if(array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)throw Error('UNSAFE_PROTOTYPE')
  active.add(value)
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors)
  if((fields+=keys.length)>35000)throw Error('SOURCE_BUDGET')
  if(array&&descriptors.length.value>512)throw Error('SOURCE_BUDGET')
  const result=array?[]:Object.create(null)
  for(const key of keys){
   if(typeof key!=='string'||['__proto__','prototype','constructor','toJSON'].includes(key))throw Error('UNSAFE_KEY')
   const desc=descriptors[key]
   if(!Object.hasOwn(desc,'value')||(key!=='length'&&!desc.enumerable))throw Error('UNSAFE_DESCRIPTOR')
   if(array&&key==='length'){result.length=desc.value;continue}
   result[key]=visit(desc.value,depth+1)
  }
  if(array&&Object.keys(result).length!==result.length)throw Error('SPARSE_ARRAY')
  active.delete(value);return result
 }
 return visit(source)
}
function canonical(value){
 if(value===undefined)return 'undefined'
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']'
 if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'
 return JSON.stringify(value)
}
function fingerprint(value){
 const data=canonical(value);let hash=2166136261
 for(let i=0;i<data.length;i++){hash^=data.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return `fnv1a32:${(hash>>>0).toString(16).padStart(8,'0')}:${data.length}`
}
function area(points){return points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p.x*q.y-q.x*p.y},0)/2}
function validBoundary(points){
 return Array.isArray(points)&&points.length>=3&&points.length<=128&&
  points.every(p=>Array.isArray(p)&&p.length===2&&p.every(x=>finite(x)&&Math.abs(x)<1000))&&
  points.every((p,i)=>{const q=points[(i+1)%points.length];return Math.hypot(p[0]-q[0],p[1]-q[1])>1e-8})&&
  Math.abs(area(points.map(([x,y])=>({x,y}))))>1e-10
}
/** Preview-only independent point-rule grading against a verified native source snapshot.
 * Metres in Rust polygon geometry become centimetres in physical marker geometry.
 * Source polygon points can be treated as CUT only if ALL authored edge allowances are 0.
 */
export function planAccuMarkNativeGradeMarker20261024(nativeSnapshot,ruleSet,{
 selectedSize,fabricWidthCm,gapCm=1,maxLengthCm=1000,maxEvaluations=320,
 plyCount=1,rolls=[],nap='one-way',cutQuantities,
}={}){
 try{
  const source=snapshot(nativeSnapshot),rules=snapshot(ruleSet),quantities=snapshot(cutQuantities),stock=snapshot(rolls)
  if(!source||!Number.isSafeInteger(source.revision)||source.revision<0||
     !source.template||!Array.isArray(source.template.panels)||!source.template.panels.length||
     source.template.panels.length>80||!Array.isArray(source.template.seams)||
     !Array.isArray(rules?.sizes)||!rules.sizes.includes(selectedSize)||
     !finite(fabricWidthCm)||fabricWidthCm<=0||fabricWidthCm>1000||
     !finite(gapCm)||gapCm<0||gapCm>50||!finite(maxLengthCm)||maxLengthCm<=0||maxLengthCm>100000||
     !Number.isSafeInteger(maxEvaluations)||maxEvaluations<1||maxEvaluations>2000||
     !Number.isSafeInteger(plyCount)||plyCount<1||plyCount>10000||
     !['none','one-way'].includes(nap)||!Array.isArray(stock)||stock.length>64)
    return fail('INVALID_SOURCE_OR_LIMITS')
  // A sewn panel's CUT contour cannot be recovered from the sewn polygon unless
  // each edge has an explicit zero allowance. For now sewn relations require a
  // separate validated size-specific cutline/sewing proof.
  if(source.template.seams.length)return fail('SEWN_CUTLINE_PROOF_REQUIRED')
  if(!quantities||typeof quantities!=='object'||Array.isArray(quantities)||
    Object.keys(quantities).length!==source.template.panels.length)
    return fail('MISSING_PANEL_QUANTITIES')
  if(stock.some(r=>!safeName(r?.rollId)||!finite(r.usableLengthCm)||r.usableLengthCm<=0||r.usableLengthCm>1e7)||
     new Set(stock.map(r=>r.rollId)).size!==stock.length)return fail('INVALID_ROLLS')
  const ids=new Set(),pieces=[]
  for(const panel of source.template.panels){
   if(!safeName(panel?.id)||ids.has(panel.id)||!Object.hasOwn(quantities,panel.id))return fail('PANEL_INVENTORY')
   ids.add(panel.id)
   const q=quantities[panel.id],polygon=panel.polygon
   if(!Number.isSafeInteger(q)||q<1||q>99||!safeName(panel.fabric)||
      !finite(panel.grain_degrees)||!polygon||!validBoundary(polygon.points)||
      !Array.isArray(polygon.edges)||polygon.edges.length!==polygon.points.length||
      polygon.edges.some(e=>!safeName(e))||new Set(polygon.edges).size!==polygon.edges.length)
    return fail('INVALID_NATIVE_PANEL',panel.id)
   if(polygon.holes?.length||polygon.lines?.length||Object.keys(polygon.curves||{}).length||
      Object.values(polygon.free_curve_points||{}).some(v=>v?.length)||
      Object.values(polygon.notches||{}).some(v=>v?.length)||polygon.annotations?.length||
      panel.fold||panel.cut_on_fold||panel.marker?.fold||panel.marker?.motif||panel.marker?.stripe||
      panel.marker?.shade||panel.marker?.repeat||panel.nap||panel.marker?.nap)
    return fail('UNSUPPORTED_CUT_SEMANTICS',panel.id)
   const allowance=polygon.seam_allowances
   if(!allowance||Object.keys(allowance).length!==polygon.edges.length||
      polygon.edges.some(edge=>!Object.hasOwn(allowance,edge)||allowance[edge]!==0))
    return fail('PHYSICAL_CUTLINE_PROOF_REQUIRED',panel.id)
  }
  if(Object.keys(quantities).some(id=>!ids.has(id)))return fail('EXTRA_PANEL_QUANTITY')
  // The existing point-rule compiler stringifies its source fingerprint.
  // Give it a null-prototype object graph and own inert toJSON functions are
  // expressly forbidden in the source clone. An inherited Object.prototype
  // toJSON can still reach arrays, so refuse a polluted runtime deterministically.
  if(Object.getOwnPropertyDescriptor(Object.prototype,'toJSON'))return fail('UNSAFE_JSON_RUNTIME')
  const compiled=compileAccuMarkNativeRuleSizeRun(source,rules,{selectedSize})
  if(!compiled.ok)return fail('GRADE_RULES_REFUSED',compiled.reason)
  for(const panel of source.template.panels){
   const result=compiled.byPanel[panel.id],polygon=result?.sizeRun?.[selectedSize]?.polygon
   if(result?.accuracy!=='exact'||!validBoundary(polygon?.points)||polygon.edges.length!==polygon.points.length)
    return fail('UNVERIFIED_GRADED_CUT',panel.id)
   const points=polygon.points.map(([x,y])=>({x:x*100,y:y*100}))
   if(points.some(p=>!finite(p.x)||!finite(p.y)))return fail('INVALID_GRADED_COORDINATES')
   pieces.push({id:panel.id,name:panel.name||panel.id,points,grainAngleDeg:panel.grain_degrees,
    fabricId:panel.fabric,cutQuantity:quantities[panel.id],seamAllowance:0,
    marker:{nap},patternImportProvenance:{source:'rust-native-snapshot-independent-point-rule-preview',
      snapshotRevision:source.revision,factoryApproved:false}})
  }
  const fabricIds=new Set(pieces.map(p=>p.fabricId))
  if(fabricIds.size!==1)return fail('MULTI_FABRIC_REQUIRES_SEPARATE_PLANS')
  const project={revision:source.revision,previewSize:selectedSize,pieces,
   patternSource:{referenceOnly:true,manufacturingApproved:false}}
  const base=nestPolygons(project,{fabricWidth:fabricWidthCm,gap:gapCm,maxLength:maxLengthCm,
    maxCandidates:30000})
  if(!base.ok||base.errors.length||base.unplaced.length||base.placements.length!==pieces.reduce((n,p)=>n+p.cutQuantity,0))
   return fail('NEST_INCOMPLETE',base.errors.length?JSON.stringify(base.errors):JSON.stringify(base.unplaced))
  // The optimizer revalidates every CUT polygon using the source points and quantity.
  const optimized=base.placements.length>=2?
   optimizeAccuMarkMarkerProduction20261024(project,base,{fabricWidthCm,gapCm,maxLengthCm,maxEvaluations}):
   {ok:true,...base,optimization:{beforeLengthCm:base.metrics.length,afterLengthCm:base.metrics.length,
      savedLengthCm:0,evaluations:0,acceptedMoves:0,units:'cm'}}
  if(!optimized.ok)return fail('OPTIMIZATION_REFUSED',optimized.code)
  let material
  if(base.placements.length>=2&&stock.length){
   material=compareAccuMarkMarkerRollDemand20261024(project,base,optimized,
    {fabricWidthCm,gapCm,maxLengthCm,plyCount,rolls:stock})
   if(!material.ok)return fail('ROLL_PLAN_REFUSED',material.code)
  }else{
   const lengthCm=optimized.metrics.length,requiredCm=lengthCm*plyCount
   const allocations=stock.map(r=>({rollId:r.rollId,remainingCm:r.usableLengthCm,plies:0}))
   let remaining=plyCount
   for(const r of allocations){const count=Math.min(remaining,Math.floor((r.remainingCm+1e-8)/lengthCm));r.plies=count;r.remainingCm-=count*lengthCm;remaining-=count}
   material={ok:true,after:{lengthCm,requiredCm,feasible:remaining===0,unallocatedPlies:remaining,
      allocations},units:'cm',manufacturingApproved:false,cuttingAuthorized:false}
  }
  // An optimizer can fit the physical pattern while the requested roll stock
  // cannot supply all plies. A feasible nest is NOT a feasible cut plan.
  // In particular, the single-placement fallback previously returned ok:true
  // with material.after.feasible=false, enabling an invalid study download.
  if(material?.after?.feasible!==true||material.after.unallocatedPlies>0)
    return fail('ROLL_STOCK_INSUFFICIENT','Requested ply count cannot be allocated from the available usable roll lengths')
  const sourceFingerprint=fingerprint({revision:source.revision,template:source.template,ruleSet:rules,
    selectedSize,cutQuantities:quantities,nap})
  return {ok:true,project,marker:optimized,rollPlan:material,selectedSize,
   sourceRevision:source.revision,sourceFingerprint,sourceType:'native-rust-snapshot-independent-point-rules',
   authority:'read-only-grade-and-cut-preview',units:'cm',physicalCutContourBasis:'native-zero-allowance-only',
   manufacturingApproved:false,cuttingAuthorized:false,factoryApproved:false}
 }catch(e){return fail('SOURCE_REFUSED',e.message)}
}
