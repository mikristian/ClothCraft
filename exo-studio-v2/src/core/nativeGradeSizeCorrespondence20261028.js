// Native grade catalog v2 correspondence authoring. This module prepares a
// complete immutable Rust grade-run-commit; Rust remains the authority for
// topology, persistence, grade compilation and Undo/Redo.
const fail=reason=>({ok:false,reason,nativeCommitted:false,factoryApproved:false})
const safeLabel=value=>typeof value==='string'&&value.length>0&&value.length<=24&&
 /^[A-Za-z0-9-]+$/.test(value)
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key)
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
const same=(a,b)=>{
 if(Object.is(a,b))return true
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false
 const keys=Object.keys(a)
 return keys.length===Object.keys(b).length&&keys.every(key=>own(b,key)&&same(a[key],b[key]))
}
// The native transport owns its request payload. It must never share mutable
// catalog objects with the independent postcommit witness: a serializer or
// RPC adapter may mutate its input before Rust receives it.
const freezeTree=(value,seen=new WeakSet())=>{
 if(value&&typeof value==='object'&&!seen.has(value)){
  seen.add(value)
  Object.values(value).forEach(child=>freezeTree(child,seen))
  Object.freeze(value)
 }
 return value
}

export function planNativeGradeSizeCorrespondence20261028(snapshot,status,aliases){
 try{
  if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0||
   !snapshot?.template||!status||status.revision!==snapshot.revision||
   status.persistedInProject!==true||status.sizeActivated!==false||
   !plain(status.catalog)||!plain(aliases))
   return fail('A matching inactive, persisted native grade catalog and explicit alias map are required')
  const run=status.catalog
  if(![1,2].includes(run.schemaVersion)||!Array.isArray(run.sizes)||
   run.sizes.length<2||run.sizes.length>24||
   !run.sizes.every(safeLabel)||new Set(run.sizes).size!==run.sizes.length||
   !run.sizes.includes(run.baseSize)||
   !Array.isArray(run.gradedTemplates)||run.gradedTemplates.length!==run.sizes.length||
   !same(run.baseTemplate,snapshot.template))
   return fail('Native catalog sizes, graded geometry or source identity are invalid')
  const entries=Object.entries(aliases)
  if(run.schemaVersion===1&&entries.length===0)
   return fail('Legacy catalog has no external aliases to author; schema migration alone is not a size operation')
  if(entries.length>96||entries.some(([alias,canonical])=>
   !safeLabel(alias)||run.sizes.includes(alias)||!safeLabel(canonical)||
   !run.sizes.includes(canonical)||['__proto__','constructor','prototype'].includes(alias)))
   return fail('Alias must be a unique safe external label resolving to an authored native size')
  const normalized=Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b,'en')))
  // Every prior authored external label remains an identity, even when a
  // canonical-size rule table changes separately. Never let a partial alias
  // submission silently discard durable size correspondence.
  const persisted=run.sizeCorrespondence??{}
  if(!plain(persisted)||Object.entries(persisted).some(([alias,canonical])=>
   !safeLabel(alias)||run.sizes.includes(alias)||!safeLabel(canonical)||
   !run.sizes.includes(canonical)||['__proto__','constructor','prototype'].includes(alias)))
   return fail('Persisted size correspondence is invalid')
  if(Object.keys(persisted).some(alias=>!own(normalized,alias)))
   return fail('Existing native size aliases cannot be silently removed')
  if(Object.entries(persisted).some(([alias,canonical])=>normalized[alias]!==canonical))
   return fail('Existing native size aliases cannot be silently redirected')
  if(run.schemaVersion===2&&same(run.sizeCorrespondence||{},normalized))
   return fail('Correspondence is unchanged; no native transaction is necessary')
  const candidate=structuredClone(run)
  candidate.schemaVersion=2
  candidate.sizeCorrespondence=normalized
  const expectedCatalog=freezeTree(structuredClone(candidate))
  return Object.freeze({ok:true,nativeCommitted:false,factoryApproved:false,
   request:Object.freeze({op:'grade-run-commit',revision:snapshot.revision,
    gradeRun:structuredClone(candidate)}),
   expectedRevision:snapshot.revision+1,
   expectedCatalog,
   note:'Only external alias metadata changes. This does not create new graded sizes or certify industrial correspondence.'})
 }catch(error){return fail(String(error?.message||error))}
}

export function verifyNativeGradeSizeCorrespondence20261028(before,plan,status,saved){
 if(!plan?.ok||!Number.isSafeInteger(before?.revision)||
  status?.revision!==plan.expectedRevision||
  status?.persistedInProject!==true||status?.sizeActivated!==false||
  !same(status.catalog,plan.expectedCatalog)||
  !same(saved?.grade_run,plan.expectedCatalog)||
  !same(saved?.template,before.template))
  return fail('Native revision, exact catalog, source geometry or durable project witness differs')
 return {ok:true,nativeCommitted:true,factoryApproved:false,
  revision:status.revision,aliases:Object.keys(plan.expectedCatalog.sizeCorrespondence).length,
  authoredSizes:plan.expectedCatalog.sizes.length}
}
