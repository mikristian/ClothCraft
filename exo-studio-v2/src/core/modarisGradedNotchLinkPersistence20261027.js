import {gradeProject} from './grading.js'
import {edgeLength} from './project.js'
import {modarisGradedNotchProvenance20261027} from './modarisGradedNotchLink20261027.js'

const fail=code=>{throw Error('MODARIS_GRADED_NOTCH_PERSISTENCE_'+code)}
const exact=(obj,keys)=>obj&&Object.keys(obj).sort().join('|')===[...keys].sort().join('|')
const finite=x=>typeof x==='number'&&Number.isFinite(x)
function safe(value,depth=0,active=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value
 if(typeof value==='number'&&Number.isFinite(value))return value
 if(typeof value!=='object'||depth>30||active.has(value))fail('UNSAFE_VALUE')
 const arr=Array.isArray(value)
 if(Object.getPrototypeOf(value)!==(arr?Array.prototype:Object.prototype))fail('PROTOTYPE')
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors)
 if(keys.length>15000||keys.some(k=>typeof k!=='string'||['__proto__','prototype','constructor','toJSON'].includes(k)))fail('UNSAFE_KEY')
 active.add(value)
 const result=arr?[]:{}
 for(const k of keys){
  if(arr&&k==='length')continue
  const d=descriptors[k]
  if(!('value'in d)||!d.enumerable||arr&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=value.length))fail('ACCESSOR')
  result[k]=safe(d.value,depth+1,active)
 }
 active.delete(value)
 if(arr&&result.length!==value.length)fail('SPARSE')
 return result
}
/** Read-only, fail-closed admission of persisted v1 straight-edge links.
 * Graphless legacy projects are backwards compatible.
 */
export function assertFreshModarisGradedNotchLink20261027(input){
 const p=safe(input)
 if(!p||typeof p!=='object')fail('PROJECT')
 if(!Object.hasOwn(p,'modarisGradedNotchLink'))return {ok:true,linked:false,manufacturingApproved:false}
 const g=p.modarisGradedNotchLink
 if(!exact(g,['version','units','sizes','baseSize','source','target','sourceIdentity','targetIdentity','targetBefore','lastSourceFraction','lastTargetFraction','appliedRevision','rootProvenance']))fail('GRAPH_SCHEMA')
 if(g.version!==1||g.units!=='cm'||p.units!=='cm'||!Number.isSafeInteger(p.revision)||p.revision!==g.appliedRevision||typeof g.rootProvenance!=='string')fail('GRAPH_VERSION_REVISION')
 if(!Array.isArray(p.pieces)||p.pieces.length<2||p.pieces.length>32||!p.grading||!Array.isArray(p.grading.sizes)||p.grading.sizes.length<2||p.grading.sizes.length>12||
    new Set(p.grading.sizes).size!==p.grading.sizes.length||p.grading.sizes.some(s=>typeof s!=='string'||!s)||!p.grading.sizes.includes(p.grading.baseSize)||
    JSON.stringify(g.sizes)!==JSON.stringify(p.grading.sizes)||g.baseSize!==p.grading.baseSize)fail('SIZE_SCHEMA')
 if(!exact(g.source,['pieceId','notchId'])||!exact(g.target,['pieceId','notchId'])||
    typeof g.source.pieceId!=='string'||typeof g.target.pieceId!=='string'||typeof g.source.notchId!=='string'||typeof g.target.notchId!=='string'||g.source.pieceId===g.target.pieceId)fail('REF_SCHEMA')
 for(const value of [g.lastSourceFraction,g.lastTargetFraction])if(!finite(value)||value<=0||value>=1)fail('FRACTION_SCHEMA')
 const ids=new Set()
 for(const piece of p.pieces){
  if(typeof piece?.id!=='string'||!piece.id||ids.has(piece.id)||!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>64)fail('PIECE_TOPOLOGY')
  ids.add(piece.id)
  if(['seams','productionSpec','cutlines','holes','marker','markers','industrialAllowanceGraph','modarisSizeLinkedGrade'].some(key=>Object.hasOwn(p,key)&&!(key==='seams'&&Array.isArray(p.seams)&&p.seams.length===0))||
     ['holes','cutlines','sewingPairs','edgeBindings','internalLines','seamAllowance'].some(key=>Object.hasOwn(piece,key))||
     Object.keys(piece.curves??{}).length)fail('PRODUCTION_OR_CURVE')
  if(piece.points.some(pt=>!finite(pt?.x)||!finite(pt?.y)))fail('POINTS')
  if(!Array.isArray(piece.notches)||new Set(piece.notches.map(n=>n?.id)).size!==piece.notches.length||
    piece.notches.some(n=>!exact(n,['id','edgeIndex','t'])||typeof n.id!=='string'||!n.id||!Number.isInteger(n.edgeIndex)||n.edgeIndex<0||n.edgeIndex>=piece.points.length||!finite(n.t)||n.t<=0||n.t>=1))fail('NOTCHES')
 }
 const resolve=ref=>{
  const piece=p.pieces.find(x=>x.id===ref.pieceId)
  const notch=piece?.notches.find(n=>n.id===ref.notchId)
  if(!notch)fail('MISSING_NOTCH')
  return {piece,notch}
 }
 const a=resolve(g.source),b=resolve(g.target)
 const identity=({piece,notch})=>({pieceId:piece.id,notchId:notch.id,edgeIndex:notch.edgeIndex,pointIds:piece.points.map(pt=>pt.id??null),edgeNames:piece.edgeNames??null,curveKeys:Object.keys(piece.curves??{}).sort(),pointCount:piece.points.length})
 if(!exact(g.sourceIdentity,Object.keys(identity(a)))||!exact(g.targetIdentity,Object.keys(identity(b)))||
    JSON.stringify(g.sourceIdentity)!==JSON.stringify(identity(a))||JSON.stringify(g.targetIdentity)!==JSON.stringify(identity(b))||
    !exact(g.targetBefore,['id','edgeIndex','t'])||g.targetBefore.id!==b.notch.id||g.targetBefore.edgeIndex!==b.notch.edgeIndex)fail('IDENTITY')
 if(a.notch.t!==g.lastSourceFraction||b.notch.t!==g.lastTargetFraction||a.notch.t!==b.notch.t)fail('UNREAPPLIED_SOURCE_OR_TARGET')
 if(g.rootProvenance!==modarisGradedNotchProvenance20261027(p,g.source))fail('OUT_OF_BAND_ROOT_EDIT')
 const proof=[]
 for(const size of g.sizes){
  let graded
  try{graded=gradeProject(p,size)}catch{fail('GRADE_FAILED')}
  const ga=graded.pieces.find(piece=>piece.id===g.source.pieceId),gb=graded.pieces.find(piece=>piece.id===g.target.pieceId)
  if(!ga||!gb||ga.points.length!==a.piece.points.length||gb.points.length!==b.piece.points.length)fail('GRADE_TOPOLOGY')
  const na=ga.notches?.find(n=>n.id===g.source.notchId),nb=gb.notches?.find(n=>n.id===g.target.notchId)
  if(!na||!nb||na.edgeIndex!==a.notch.edgeIndex||nb.edgeIndex!==b.notch.edgeIndex||Math.abs(na.t-a.notch.t)>1e-10||Math.abs(nb.t-b.notch.t)>1e-10)fail('GRADE_NOTCH_DRIFT')
  const al=edgeLength(ga,na.edgeIndex),bl=edgeLength(gb,nb.edgeIndex)
  if(!finite(al)||!finite(bl)||al<0.01||bl<0.01||Math.abs(na.t-nb.t)>1e-10)fail('GRADE_ARCLENGTH')
  proof.push({size,sourceArcCm:al*na.t,targetArcCm:bl*nb.t,fractionResidual:Math.abs(na.t-nb.t),precisionCm:Math.max(al,bl)*Math.abs(na.t-nb.t)})
 }
 return {ok:true,linked:true,version:1,sizes:[...g.sizes],proof,manufacturingApproved:false}
}
