import {gradeProject} from './grading.js'
import {inspectIndustrialPatterns} from './industrialPatternQA.js'
import {validateIndustrialGradeRule,INDUSTRIAL_GRADE_MODES} from './industrialGradeRules.js'

// A source-preserving, all-or-nothing grade-rule editor for explicitly
// unattached legacy EXO contour vertices. An authored industrial size rule is
// committed, NOT a display-only offset or an exported vendor Gerber table.
const fail=(code)=>{const e=new Error('EXO atomic grading refused: '+code);e.code=code;throw e}
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1e6
const safeId=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=128&&!['__proto__','constructor','prototype'].includes(s)
function safeClone(input){
 // Legacy downstream CAD measurement code may allocate ordinary objects.
 // Fail closed before an inherited malicious serializer could be invoked.
 if(Object.getOwnPropertyDescriptor(Object.prototype,'toJSON')||
   Object.getOwnPropertyDescriptor(Array.prototype,'toJSON'))
   fail('POLLUTED_SERIALIZER_PROTOTYPE')
 const active=new Set(),budget={nodes:0,fields:0}
 function visit(value,depth){
  if(value===undefined||value===null||typeof value==='boolean'||typeof value==='string')return value
  if(finite(value))return value
  if(typeof value!=='object'||depth>32||active.has(value)||++budget.nodes>9000)fail('SOURCE_COMPLEXITY_OR_CYCLE')
  const proto=Object.getPrototypeOf(value)
  if(Array.isArray(value)?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)
    fail('UNSAFE_SOURCE_PROTOTYPE')
  active.add(value)
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors)
  if((budget.fields+=keys.length)>60000||keys.some(k=>typeof k!=='string'||['__proto__','prototype','constructor','toJSON'].includes(k)))fail('UNSAFE_SOURCE_FIELDS')
  const array=Array.isArray(value),out=array?[]:Object.create(null)
  if(array&&value.length>6000)fail('SOURCE_ARRAY_BUDGET')
  for(const key of keys){
   if(array&&key==='length'){out.length=descriptors.length.value;continue}
   if(!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable)fail('SOURCE_ACCESSOR_OR_HIDDEN_FIELD')
   if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))fail('UNSAFE_ARRAY_INDEX')
   Object.defineProperty(out,key,{value:visit(descriptors[key].value,depth+1),enumerable:true,writable:true,configurable:true})
  }
  if(array&&Object.keys(out).length!==out.length)fail('SPARSE_ARRAY')
  active.delete(value)
  return out
 }
 return visit(input,0)
}
function inspectProject(project){
 if(!project||!Array.isArray(project.pieces)||project.pieces.length<1||project.pieces.length>32)fail('PROJECT_PIECE_BUDGET')
 if(!project.grading||!Array.isArray(project.grading.sizes)||project.grading.sizes.length<2||project.grading.sizes.length>16||
   !project.grading.sizes.every(safeId)||new Set(project.grading.sizes.map(s=>s.toLowerCase())).size!==project.grading.sizes.length||
   !project.grading.sizes.includes(project.grading.baseSize))fail('INVALID_SIZE_RUN')
 if(project.productionSpec?.gradingModel==='seam-locked-affine-v1')fail('SPECIAL_GRADING_GRAPH_REQUIRES_AUTHORED_TRANSFORM')
 // The downstream joined-notch QA expects an explicit seam collection;
 // a missing property is not proof there are no manufacturing relationships.
 if(!Array.isArray(project.seams))fail('EXPLICIT_SEAM_SOURCE_REQUIRED')
 if(project.seams.length>0||(project.customMeasurements||[]).length>0)
   fail('SEWN_OR_MEASUREMENT_DEPENDENCY_REQUIRES_COEDIT')
 const ids=project.pieces.map(p=>p?.id)
 if(!ids.every(safeId)||new Set(ids).size!==ids.length)fail('DUPLICATE_PIECE_ID')
 let total=0
 for(const piece of project.pieces){
  if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>160||
     piece.points.some(p=>!finite(p?.x)||!finite(p?.y))||(total+=piece.points.length)>1024)
    fail('INVALID_OR_OVERSIZED_PIECE')
 }
}
const stepPair=(current,prior)=>({dx:current.dxCm-prior.dxCm,dy:current.dyCm-prior.dyCm})
const eq=(a,b)=>Math.abs(a-b)<=1e-8

/**
 * Atomically author a complete industrial grade rule table on one or more
 * detached, straight EXO piece vertices. edits=[{
 * pieceId,pointIndex,offsetsCm:[{size,dxCm,dyCm}, ...all sizes]
 * }]. Base-relative centimeters, sizes strictly ordered as project.grading.
 * All source pieces and grade sizes must pass the independent physical
 * industrialPatternQA both before and after commit; no partial successful
 * result or fake factory certification.
 */
export function applyAccuMarkAtomicGradeRun20261024(project,{edits}={}){
 const source=safeClone(project),input=safeClone({edits})
 inspectProject(source)
 if(!Array.isArray(input.edits)||input.edits.length<1||input.edits.length>120)fail('INVALID_GRADE_EDIT_COUNT')
 const {sizes,baseSize}=source.grading,baseIndex=sizes.indexOf(baseSize)
 const before=inspectIndustrialPatterns(source,{sizes})
 if(before.status!=='pass')fail('SOURCE_INDUSTRIAL_QA_BLOCKED:'+before.issues[0]?.code)
 const unique=new Set(),normalized=[]
 for(const [editIndex,edit]of input.edits.entries()){
  if(!edit||!safeId(edit.pieceId)||!Number.isSafeInteger(edit.pointIndex)||edit.pointIndex<0)
    fail('INVALID_POINT_REFERENCE')
  const piece=source.pieces.find(p=>p.id===edit.pieceId)
  if(!piece||edit.pointIndex>=piece.points.length)fail('MISSING_GRADE_POINT')
  const selected=piece.points[edit.pointIndex],token=edit.pieceId+'\0'+edit.pointIndex
  // Unknown per-point attachments can encode absolute anchors, tangents,
  // authored cut marks or alternate grade dependencies. Never move a point's
  // graded position without either transporting that metadata or blocking it.
  if(Object.keys(selected).some(key=>!['id','x','y','industrialGradeRule'].includes(key)))
    fail('UNKNOWN_POINT_ATTACHMENT_REQUIRES_COEDIT')
  if(unique.has(token))fail('DUPLICATE_TARGET_POINT')
  unique.add(token)
  if(piece.curves&&Object.keys(piece.curves).length||piece.internalLines?.length||piece.notches?.length||
     piece.holes?.length||piece.cutHoles?.length||piece.internalCutouts?.length||
     piece.fold||piece.cutOnFold||piece.marker?.fold||piece.marker?.onFold)
    fail('ATTACHED_CURVE_OR_PRODUCTION_MARK')
  if(selected.namedGradeRuleRef||selected.gradeRule?.enabled||selected.aAnchor||selected.bAnchor)
    fail('EXISTING_NAMED_OR_ANCHORED_GRADE_DEPENDENCY')
  if(!Array.isArray(edit.offsetsCm)||edit.offsetsCm.length!==sizes.length)fail('INCOMPLETE_SIZE_OFFSETS')
  if(edit.offsetsCm.some((row,i)=>row?.size!==sizes[i]||!finite(row?.dxCm)||!finite(row?.dyCm)||
    Math.abs(row.dxCm)>80||Math.abs(row.dyCm)>80))fail('NONFINITE_OR_STALE_SIZE_OFFSET')
  if(!eq(edit.offsetsCm[baseIndex].dxCm,0)||!eq(edit.offsetsCm[baseIndex].dyCm,0))
    fail('BASE_SIZE_MUST_BE_ZERO')
  const steps=edit.offsetsCm.slice(1).map((row,i)=>stepPair(row,edit.offsetsCm[i]))
  if(steps.some(step=>!finite(step.dx)||!finite(step.dy)||Math.abs(step.dx)>30||Math.abs(step.dy)>30))
    fail('GRADE_BREAK_EXCEEDS_LIMIT')
  normalized.push({editIndex,pieceId:edit.pieceId,pointIndex:edit.pointIndex,
    rule:validateIndustrialGradeRule({mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,
      sizes:[...sizes],baseSize,steps})})
 }
 // The only edit to the snapshot is the explicitly requested industrial rule;
 // all other pattern/source entities must retain their original geometry.
 for(const x of normalized){
  source.pieces.find(p=>p.id===x.pieceId).points[x.pointIndex].industrialGradeRule=x.rule
 }
 const qa=inspectIndustrialPatterns(source,{sizes})
 if(qa.status!=='pass')fail('POST_EDIT_INDUSTRIAL_QA_BLOCKED:'+qa.issues[0]?.code)
 const preview=sizes.map(size=>{
  const graded=gradeProject(source,size)
  const rows=normalized.map(edit=>{
   const p=graded.pieces.find(p=>p.id===edit.pieceId).points[edit.pointIndex]
   return {pieceId:edit.pieceId,pointIndex:edit.pointIndex,size,xCm:p.x,yCm:p.y}
  })
  return {size,rows,passedPieceCount:qa.sizeReports.find(r=>r.size===size)?.passingPieces??null}
 })
 return {ok:true,project:source,preview,validation:{status:'GEOMETRY_GRADE_QA_PASSED',
   sizeCount:sizes.length,editedPointCount:normalized.length,piecesReviewed:source.pieces.length,
   stitchGeometryChangedOnlyThroughAuthoredGradeRules:true,sourceUnchanged:true,
   seamDependencyAllowed:false,dimensionsUnit:'cm',
   manufacturingApproved:false,cuttingAuthorized:false,factoryCertified:false},
   manufacturingApproved:false,cuttingAuthorized:false,factoryApproved:false}
}
