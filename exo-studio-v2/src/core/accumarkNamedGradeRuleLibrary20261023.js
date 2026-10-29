import {cloneProject} from './project.js'
import {validateIndustrialGradeRule} from './industrialGradeRules.js'

export const NAMED_GRADE_LIBRARY_SCHEMA='exo.named-industrial-grade-rules.v1'
const idPattern=/^[a-z][a-z0-9._-]{1,79}$/
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k)
const assert=(ok,msg)=>{if(!ok)throw new Error('Named grade rule library: '+msg)}
const copy=value=>structuredClone(value)
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
function text(value,name,max=120){assert(typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=max&& !/[\u0000-\u001f]/.test(value),`invalid ${name}`);return value}
function validateEntry(entry){
 assert(entry&&typeof entry==='object'&&!Array.isArray(entry),'invalid entry')
 assert(same(Object.keys(entry).sort(),['id','name','provenance','rule','units','version'].sort()),'unexpected entry fields')
 assert(idPattern.test(entry.id),'invalid id')
 text(entry.name,'name')
 assert(entry.units==='cm','units must be centimeters')
 assert(Number.isSafeInteger(entry.version)&&entry.version>=1,'invalid version')
 assert(entry.provenance&&typeof entry.provenance==='object'&&!Array.isArray(entry.provenance),'invalid provenance')
 assert(same(Object.keys(entry.provenance).sort(),['pieceId','pointId','source'].sort()),'invalid provenance keys')
 text(entry.provenance.source,'provenance source')
 text(entry.provenance.pieceId,'provenance pieceId')
 text(entry.provenance.pointId,'provenance pointId')
 const rule=validateIndustrialGradeRule(entry.rule)
 assert(same(entry.rule,rule),'noncanonical rule payload')
 return {id:entry.id,name:entry.name,version:entry.version,units:'cm',provenance:copy(entry.provenance),rule}
}
function digest(input){
 // Deterministic accidental-modification checksum, not a cryptographic signature.
 const string=JSON.stringify(input);let h=2166136261
 for(let i=0;i<string.length;i++){h=Math.imul(h^string.charCodeAt(i),16777619)}
 return (h>>>0).toString(16).padStart(8,'0')
}
function payload(entries){return {schema:NAMED_GRADE_LIBRARY_SCHEMA,entries}}
function sealed(entries){const data=payload(entries);return freeze({...data,checksum:digest(data)})}
export function validateNamedGradeRuleLibrary(library){
 assert(library&&typeof library==='object'&&!Array.isArray(library),'invalid library')
 assert(same(Object.keys(library).sort(),['schema','entries','checksum'].sort()),'invalid library fields')
 assert(library.schema===NAMED_GRADE_LIBRARY_SCHEMA,'unsupported schema')
 assert(Array.isArray(library.entries),'entries must be array')
 const entries=library.entries.map(validateEntry)
 const seen=new Set()
 for(const entry of entries){const key=entry.id+'@'+entry.version;assert(!seen.has(key),'duplicate id/version');seen.add(key)}
 for(const id of new Set(entries.map(e=>e.id))){
  const versions=entries.filter(e=>e.id===id).map(e=>e.version).sort((a,b)=>a-b)
  assert(versions.every((v,i)=>v===i+1),'version history must be contiguous')
  const named=entries.filter(e=>e.id===id)
  assert(named.every(e=>e.name===named[0].name),'name changes across versions')
 }
 assert(library.checksum===digest(payload(library.entries)),'checksum mismatch or tampered library')
 return sealed(entries)
}
export function createNamedGradeRuleLibrary(){return sealed([])}
function target(project,pieceId,pointIndex){
 const piece=project?.pieces?.find(piece=>piece.id===pieceId)
 assert(piece,'missing piece')
 assert(Number.isInteger(pointIndex)&&pointIndex>=0&&pointIndex<piece.points?.length,'invalid point index')
 const point=piece.points[pointIndex]
 assert(point&&Number.isFinite(point.x)&&Number.isFinite(point.y),'invalid target point')
 return {piece,point,pointId:String(point.id??`index:${pointIndex}`)}
}
function checkedRun(project,rule){
 const grading=project?.grading
 assert(Array.isArray(grading?.sizes)&&same(grading.sizes,rule.sizes)&&grading.baseSize===rule.baseSize,'grading size set/base mismatch')
}
function entryFor(library,id,version){
 const valid=validateNamedGradeRuleLibrary(library)
 assert(idPattern.test(id||''),'invalid rule id')
 const matching=valid.entries.filter(entry=>entry.id===id)
 assert(matching.length>0,'missing named rule reference')
 const found=version===undefined?matching[matching.length-1]:matching.find(e=>e.version===version)
 assert(found,'missing named rule version')
 return found
}
/** Capture an existing explicit industrial rule on a selected project point. */
export function captureNamedGradeRule(library,project,{id,name,pieceId,pointIndex,source='exo-project'}){
 const valid=validateNamedGradeRuleLibrary(library)
 assert(idPattern.test(id||''),'invalid rule id')
 text(name,'name');text(source,'source')
 assert(!valid.entries.some(e=>e.id===id),'named rule id already exists')
 const {point,pointId}=target(project,pieceId,pointIndex)
 assert(point.industrialGradeRule,'source point has no industrial grade rule')
 const rule=validateIndustrialGradeRule(point.industrialGradeRule)
 checkedRun(project,rule)
 const entry=validateEntry({id,name,version:1,units:'cm',provenance:{source,pieceId,pointId},rule})
 return sealed([...valid.entries,entry])
}
/** New version preserves identity/history; assignments remain pinned until reassigned. */
export function updateNamedGradeRule(library,{id,rule,source}){
 const valid=validateNamedGradeRuleLibrary(library)
 const previous=entryFor(valid,id)
 const checked=validateIndustrialGradeRule(rule)
 assert(same(checked.sizes,previous.rule.sizes)&&checked.baseSize===previous.rule.baseSize,'rule size set/base mismatch')
 const next=validateEntry({...previous,version:previous.version+1,provenance:{...previous.provenance,source:source===undefined?previous.provenance.source:text(source,'source')},rule:checked})
 return sealed([...valid.entries,next])
}
/** Attach a snapshot of the selected version; later library edits cannot mutate assigned geometry. */
export function assignNamedGradeRule(project,library,{id,version,pieceId,pointIndex}){
 const entry=entryFor(library,id,version)
 checkedRun(project,entry.rule)
 const {point}=target(project,pieceId,pointIndex)
 assert(!point.gradeRule?.enabled,'conflicting legacy point grade rule')
 const next=cloneProject(project)
 const selected=target(next,pieceId,pointIndex).point
 selected.industrialGradeRule=copy(entry.rule)
 selected.namedGradeRuleRef={id:entry.id,version:entry.version,units:entry.units}
 return next
}
/** Remove the named link; retain or drop the existing independent point rule. */
export function detachNamedGradeRule(project,{pieceId,pointIndex,keepRule=true}){
 const {point}=target(project,pieceId,pointIndex)
 assert(point.namedGradeRuleRef,'point has no named grade rule reference')
 const next=cloneProject(project),selected=target(next,pieceId,pointIndex).point
 delete selected.namedGradeRuleRef
 if(!keepRule)delete selected.industrialGradeRule
 return next
}
/** Detect deleted versions and edits to assigned point snapshots. */
export function inspectNamedGradeRuleReferences(project,library){
 const valid=validateNamedGradeRuleLibrary(library)
 const issues=[]
 for(const piece of project?.pieces||[])for(let i=0;i<(piece.points||[]).length;i++){
  const point=piece.points[i],ref=point.namedGradeRuleRef
  if(!ref)continue
  const entry=valid.entries.find(e=>e.id===ref.id&&e.version===ref.version)
  if(!entry)issues.push({pieceId:piece.id,pointIndex:i,code:'MISSING_REFERENCE'})
  else if(ref.units!=='cm'||!same(point.industrialGradeRule,entry.rule))issues.push({pieceId:piece.id,pointIndex:i,code:'RULE_SNAPSHOT_MISMATCH'})
  else if(!same(project.grading?.sizes,entry.rule.sizes)||project.grading?.baseSize!==entry.rule.baseSize)issues.push({pieceId:piece.id,pointIndex:i,code:'SIZE_RUN_MISMATCH'})
 }
 return issues
}
export function serializeNamedGradeRuleLibrary(library){return JSON.stringify(validateNamedGradeRuleLibrary(library))}
export function deserializeNamedGradeRuleLibrary(json){
 assert(typeof json==='string','serialized input must be string')
 let parsed
 try{parsed=JSON.parse(json)}catch{throw new Error('Named grade rule library: invalid JSON')}
 return validateNamedGradeRuleLibrary(parsed)
}
