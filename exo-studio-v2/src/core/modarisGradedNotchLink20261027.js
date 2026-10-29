import {gradeProject} from './grading.js'
import {edgeLength} from './project.js'

const fail=code=>{throw Error('MODARIS_GRADED_NOTCH_LINK_'+code)}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const forbidden=['seams','productionSpec','cutlines','cutline','holes','markers','marker','industrialAllowanceGraph','modarisSizeLinkedGrade']
const pieceForbidden=['holes','cutlines','cutline','sewingPairs','edgeBindings','darts','pleats','buttonholes','pins','internalLines','seamAllowance']
function copy(o,depth=0,active=new Set()){
 if(o===null||typeof o==='string'||typeof o==='boolean')return o
 if(typeof o==='number'&&Number.isFinite(o))return o
 if(typeof o!=='object'||depth>30||active.has(o))fail('UNSAFE_INPUT')
 const array=Array.isArray(o)
 if(Object.getPrototypeOf(o)!==(array?Array.prototype:Object.prototype))fail('UNSAFE_PROTOTYPE')
 const desc=Object.getOwnPropertyDescriptors(o),keys=Reflect.ownKeys(desc)
 if(keys.length>15000||keys.some(k=>typeof k!=='string'||['toJSON','__proto__','constructor','prototype'].includes(k)))fail('UNSAFE_PROPERTY')
 active.add(o);const result=array?[]:{}
 for(const k of keys){
  if(array&&k==='length')continue
  const d=desc[k]
  if(!('value'in d)||!d.enumerable||array&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=o.length))fail('UNSAFE_ACCESSOR')
  result[k]=copy(d.value,depth+1,active)
 }
 active.delete(o)
 if(array&&result.length!==o.length)fail('SPARSE_INPUT')
 return result
}
function validate(p){
 if(!p||!Number.isSafeInteger(p.revision)||p.revision<0||p.units!=='cm'||!Array.isArray(p.pieces)||p.pieces.length<2||p.pieces.length>32)fail('PROJECT')
 if(forbidden.some(k=>Object.hasOwn(p,k)&&!(k==='seams'&&Array.isArray(p.seams)&&p.seams.length===0)))fail('ATTACHED_PRODUCTION')
 const sizes=p.grading?.sizes,baseSize=p.grading?.baseSize
 if(!Array.isArray(sizes)||sizes.length<2||sizes.length>12||sizes.some(s=>typeof s!=='string'||!s)||new Set(sizes).size!==sizes.length||!sizes.includes(baseSize))fail('SIZES')
 const ids=new Set()
 for(const piece of p.pieces){
  if(!piece||typeof piece.id!=='string'||!piece.id||ids.has(piece.id))fail('PIECE_ID')
  ids.add(piece.id)
  if(pieceForbidden.some(k=>Object.hasOwn(piece,k))||piece.locked===true)fail('PIECE_ATTACHMENTS')
  if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>64||piece.points.some(pt=>!finite(pt?.x)||!finite(pt?.y)))fail('TOPOLOGY')
  if(piece.edgeNames!==undefined&&(!Array.isArray(piece.edgeNames)||piece.edgeNames.length!==piece.points.length||piece.edgeNames.some(n=>typeof n!=='string')))fail('EDGE_IDENTITY')
  if(!Array.isArray(piece.notches)||piece.notches.length>64||new Set(piece.notches.map(n=>n?.id)).size!==piece.notches.length)fail('NOTCH_IDS')
  for(const notch of piece.notches){
   if(!notch||Object.keys(notch).sort().join(',')!=='edgeIndex,id,t'||typeof notch.id!=='string'||!notch.id||!Number.isInteger(notch.edgeIndex)||notch.edgeIndex<0||notch.edgeIndex>=piece.points.length||!finite(notch.t)||notch.t<=0||notch.t>=1)fail('NOTCH_TYPE')
  }
 }
 return {sizes,baseSize}
}
function resolve(p,ref){
 if(!ref||Object.keys(ref).sort().join(',')!=='notchId,pieceId'||typeof ref.pieceId!=='string'||typeof ref.notchId!=='string')fail('REFERENCE')
 const piece=p.pieces.find(piece=>piece.id===ref.pieceId)
 const notch=piece?.notches?.find(n=>n.id===ref.notchId)
 if(!notch)fail('NOTCH_MISSING')
 if(piece.curves?.[notch.edgeIndex]||Object.keys(piece.curves??{}).length)fail('CURVED_EDGE_UNSUPPORTED')
 return {piece,notch}
}
const identity=({piece,notch})=>({pieceId:piece.id,notchId:notch.id,edgeIndex:notch.edgeIndex,pointIds:piece.points.map(p=>p.id??null),edgeNames:piece.edgeNames??null,curveKeys:Object.keys(piece.curves??{}).sort(),pointCount:piece.points.length})
/** Snapshot of all saved geometry and grading except the explicitly editable source station. */
export function modarisGradedNotchProvenance20261027(project,source){
 const p=copy(project)
 delete p.modarisGradedNotchLink
 delete p.revision
 const notch=p.pieces?.find(piece=>piece.id===source.pieceId)?.notches?.find(n=>n.id===source.notchId)
 if(!notch)fail('PROVENANCE_SOURCE')
 notch.t=null
 return JSON.stringify(p)
}
function run(p,source,target,sizes){
 const proofs=[]
 for(const size of sizes){
  const graded=gradeProject(p,size)
  const a=resolve(graded,source),b=resolve(graded,target)
  if(a.notch.edgeIndex!==resolve(p,source).notch.edgeIndex||b.notch.edgeIndex!==resolve(p,target).notch.edgeIndex||
   a.piece.points.length!==resolve(p,source).piece.points.length||b.piece.points.length!==resolve(p,target).piece.points.length)fail('SIZE_TOPOLOGY_DRIFT')
  const aLength=edgeLength(a.piece,a.notch.edgeIndex),bLength=edgeLength(b.piece,b.notch.edgeIndex)
  if(!finite(aLength)||!finite(bLength)||aLength<0.01||bLength<0.01||!finite(a.notch.t)||!finite(b.notch.t)||
   Math.abs(a.notch.t-resolve(p,source).notch.t)>1e-9||Math.abs(b.notch.t-resolve(p,target).notch.t)>1e-9)fail('SIZE_FRACTION_DRIFT')
  proofs.push({size,sourceEdgeCm:aLength,targetEdgeCm:bLength,sourceArcCm:aLength*a.notch.t,targetArcCm:bLength*b.notch.t,sourceFraction:a.notch.t,targetFraction:b.notch.t,fractionResidual:Math.abs(a.notch.t-b.notch.t),precisionCm:Math.max(aLength,bLength)*Math.abs(a.notch.t-b.notch.t)})
 }
 if(proofs.some(x=>x.fractionResidual>1e-10))fail('NOTCH_PRECISION')
 return proofs
}
function apply(input,source,target){
 const p=copy(input),a=resolve(p,source),b=resolve(p,target)
 if(a.piece===b.piece)fail('SAME_PIECE')
 b.notch.t=a.notch.t
 const proof=run(p,source,target,p.grading.sizes)
 return {p,proof}
}
/** Creates one deterministic, versioned, persisted dependency for straight graded edges. */
export function createModarisGradedNotchLink20261027(input,{source,target,expectedRevision}={}){
 const project=copy(input),{sizes,baseSize}=validate(project)
 if(project.modarisGradedNotchLink!==undefined)fail('GRAPH_EXISTS')
 if(expectedRevision!==project.revision)fail('STALE_REVISION')
 const a=resolve(project,source),b=resolve(project,target)
 if(a.piece===b.piece)fail('SAME_PIECE')
 const applied=apply(project,source,target)
 const graph={version:1,units:'cm',sizes:[...sizes],baseSize,source:copy(source),target:copy(target),
  sourceIdentity:identity(a),targetIdentity:identity(b),targetBefore:copy(b.notch),lastSourceFraction:a.notch.t,lastTargetFraction:a.notch.t,
  appliedRevision:project.revision+1,rootProvenance:modarisGradedNotchProvenance20261027(applied.p,source)}
 applied.p.modarisGradedNotchLink=graph
 applied.p.revision++
 return {project:applied.p,proof:applied.proof,manufacturingApproved:false}
}
/** Reapply only when target still equals last linked state and topology is unchanged. */
export function reapplyModarisGradedNotchLink20261027(input,{expectedRevision}={}){
 const project=copy(input),{sizes,baseSize}=validate(project),g=project.modarisGradedNotchLink
 if(expectedRevision!==project.revision)fail('STALE_REVISION')
 if(!g||g.version!==1||g.units!=='cm'||!same(g.sizes,sizes)||g.baseSize!==baseSize)fail('GRAPH_VERSION_OR_SIZE')
 const a=resolve(project,g.source),b=resolve(project,g.target)
 if(!same(identity(a),g.sourceIdentity)||!same(identity(b),g.targetIdentity))fail('TOPOLOGY_CHANGED')
 if(b.notch.t!==g.lastTargetFraction)fail('TARGET_EDITED')
 if(g.appliedRevision!==project.revision||g.rootProvenance!==modarisGradedNotchProvenance20261027(project,g.source))fail('OUT_OF_BAND_ROOT_EDIT')
 const applied=apply(project,g.source,g.target)
 applied.p.modarisGradedNotchLink.lastSourceFraction=a.notch.t
 applied.p.modarisGradedNotchLink.lastTargetFraction=a.notch.t
 applied.p.modarisGradedNotchLink.appliedRevision=project.revision+1
 applied.p.modarisGradedNotchLink.rootProvenance=modarisGradedNotchProvenance20261027(applied.p,g.source)
 applied.p.revision++
 return {project:applied.p,proof:applied.proof,manufacturingApproved:false}
}
