import {prepareNativeGradeCatalog20261025,verifyNativeGradeCatalog20261025} from './nativeGradeCatalogBridge20261025.js'
import {migrateNativeGradeNamedSizePom20261028} from './nativeGradeNamedSizePomMigration20261028.js'

const fail=(reason,{dispatched=false,committed=false}={})=>({ok:false,reason,
 nativeCommitted:committed,needsNativeRecovery:dispatched,factoryApproved:false})
const equal=(a,b)=>{
 if(Object.is(a,b))return true
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false
 const keys=Object.keys(a)
 return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]))
}
// Rust omits empty optional schema-v2 fields during serde serialization.
// Normalize ONLY these documented empties; all authored sizes, templates,
// identities, physical measurements and nonempty fields remain exact.
const canonicalRun=run=>run&&typeof run==='object'&&!Array.isArray(run)?{
 ...run,sizeCorrespondence:Object.hasOwn(run,'sizeCorrespondence')?run.sizeCorrespondence:{},
 pomSpecs:Object.hasOwn(run,'pomSpecs')?run.pomSpecs:[],
}:run

// grade-run-commit replaces the saved grade catalog but does NOT regenerate
// source-bound point bindings, facing pieces, fabric-grade charts or variants.
// A separate qualified Rust dependency-regeneration transaction is required;
// silently retaining those records would make an F7 edit look atomic when it
// only updated the size catalog. Check both the viewport and durable project:
// an incomplete/forged browser snapshot must not bypass this boundary.
const dependentSourceFields=object=>[
 ['native point bindings',object?.nativePointBindings,object?.native_point_bindings],
 ['native facing dependency',object?.nativeFacingDependency,object?.native_facing_dependency],
 ['fabric grade envelope',object?.fabricGradeEnvelope,object?.fabric_grade_envelope],
 ['derived piece variant',object?.pieceVariant,object?.piece_variant],
].filter(([,camel,snake])=>camel!=null||snake!=null).map(([label])=>label)

/** Persist a complete independently authored canonical size run through one
 * authoritative Rust revision. This is NOT an alias edit or browser-side
 * persistence. The native engine owns final geometry, Undo and durable save.
 * A missing receipt after dispatch is an unknown outcome, never a rollback.
 */
export async function commitNativeGradeCanonicalSizeTransaction20261028({
 snapshot,expectedRevision,ruleSet,request,pomDefinitions,
}={}){
 let dispatched=false,committed=false
 try{
  if(typeof request!=='function'||!Number.isSafeInteger(expectedRevision)||
   expectedRevision<0||snapshot?.revision!==expectedRevision||
   snapshot?.gradeRunPersisted!==true||snapshot?.activeGradedSize||
   !Array.isArray(ruleSet?.sizes)||ruleSet.sizes.length<4||ruleSet.sizes.length>24||
   !ruleSet.sizes.includes(ruleSet.baseSize))
   return fail('Four or more canonical sizes require an inactive saved Rust grading source')
  const dependentSnapshotFields=dependentSourceFields(snapshot)
  if(dependentSnapshotFields.length)return fail('F7 canonical size edit requires qualified atomic Rust dependency regeneration for '+dependentSnapshotFields.join(', '))
  // Capture independent, immutable-in-practice transaction evidence BEFORE
  // any asynchronous native preflight. The editor's rule table and POM input
  // may change while Rust is reading its saved catalog. Never allow a later
  // mutation (including by the request transport) to rewrite our witness.
  const source=structuredClone(snapshot)
  const authoredRules=structuredClone(ruleSet)
  const authoredPom=pomDefinitions===undefined?undefined:structuredClone(pomDefinitions)
  const inputsUnchanged=()=>equal(snapshot,source)&&equal(ruleSet,authoredRules)&&
   (authoredPom===undefined?pomDefinitions===undefined:equal(pomDefinitions,authoredPom))
  const status=await request({op:'grade-run-status',revision:expectedRevision})
  const originalStatus=structuredClone(status)
  if(!inputsUnchanged())return fail('Canonical grading inputs changed during native preflight')
  if(originalStatus?.revision!==expectedRevision||originalStatus?.persistedInProject!==true||
   originalStatus?.sizeActivated!==false||!originalStatus.catalog||
   !equal(originalStatus.catalog.baseTemplate,source.template))
   return fail('Saved Rust grading catalog does not match the inactive source')
  const saved=await request({op:'save',revision:expectedRevision})
  const originalSave=structuredClone(saved)
  if(!inputsUnchanged())return fail('Canonical grading inputs changed during native preflight')
  if(!originalSave?.project||!equal(originalSave.project.template,source.template)||
   !equal(originalSave.project.grade_run,originalStatus.catalog)||source.revision!==expectedRevision)
   return fail('Rust source, saved project or catalog changed during preflight')
  const dependentProjectFields=dependentSourceFields(originalSave.project)
  if(dependentProjectFields.length)return fail('Saved Rust project requires qualified atomic dependency regeneration for '+dependentProjectFields.join(', '))
  // Existing target measurements are independent authored specifications.
  // Every appended canonical size needs an explicit target; neither a point
  // offset nor a measured pattern distance can silently invent that target.
  const migrated=migrateNativeGradeNamedSizePom20261028({
   savedDefinitions:originalStatus.catalog.pomSpecs??[],
   nextDefinitions:authoredPom??originalStatus.catalog.pomSpecs??[],
   oldSizes:originalStatus.catalog.sizes,newSizes:authoredRules.sizes,
  })
  if(!migrated.ok)return fail('Named-size physical POM migration rejected: '+migrated.reason)
  const definitions=migrated.definitions
  const prepared=prepareNativeGradeCatalog20261025(source,originalSave.project,authoredRules,
   {pomDefinitions:definitions})
  if(!prepared.ok||prepared.gradeRun?.schemaVersion!==2)
   return fail('Canonical native grading preparation rejected: '+(prepared.reason||'schema-v2 required'))
  if(!equal(prepared.gradeRun.sizeCorrespondence??{},originalStatus.catalog.sizeCorrespondence??{}))
   return fail('Canonical size evolution cannot silently change saved external correspondences; edit aliases separately')
  if(equal(canonicalRun(prepared.gradeRun),canonicalRun(originalStatus.catalog)))
   return fail('No changed canonical grading to commit')
  if(!inputsUnchanged())return fail('Canonical grading inputs changed before native dispatch')
  // The transport owns a separate request payload. A malicious or buggy
  // adapter cannot mutate the expected catalog to manufacture a passing QA.
  const expectedCatalog=structuredClone(prepared.gradeRun)
  dispatched=true
  const receipt=await request({op:'grade-run-commit',revision:expectedRevision,gradeRun:structuredClone(expectedCatalog)})
  if(receipt?.revision!==expectedRevision+1||
   !(receipt?.gradeRunCommitted===true||receipt?.gradeCatalogResult?.persisted===true))
   return fail('Native commit receipt missing or revision mismatched; inspect history',{dispatched})
  committed=true
  const after=await request({op:'snapshot',revision:expectedRevision+1})
  const finalStatus=await request({op:'grade-run-status',revision:expectedRevision+1})
  const durable=await request({op:'save',revision:expectedRevision+1})
  const postcommitChecks={
   revision:after?.revision===expectedRevision+1,
   inactive:!after?.activeGradedSize,
   persisted:after?.gradeRunPersisted===true,
   source:equal(after?.template,source.template),
   statusCatalog:equal(canonicalRun(finalStatus?.catalog),canonicalRun(expectedCatalog)),
   durableCatalog:equal(canonicalRun(durable?.project?.grade_run),canonicalRun(expectedCatalog)),
   durableSource:equal(durable?.project?.template,source.template),
  }
  const failed=Object.entries(postcommitChecks).filter(([,valid])=>!valid).map(([name])=>name)
  if(failed.length)return fail('Committed Rust witness differs ('+failed.join(', ')+'); inspect native history',
    {dispatched,committed})
  const witness=verifyNativeGradeCatalog20261025(after,authoredRules,finalStatus,
   {durablySaved:true,pomDefinitions:definitions})
  if(!witness.ok)return fail('Native canonical size geometry witness rejected: '+witness.reason,
   {dispatched,committed})
  return {ok:true,nativeCommitted:true,needsNativeRecovery:false,factoryApproved:false,
   revision:after.revision,sizes:[...expectedCatalog.sizes],
   pomDefinitions:definitions,snapshot:after,status:finalStatus,project:durable.project,witness}
 }catch(error){return fail('Native canonical size transaction failed: '+String(error?.message||error),
  {dispatched,committed})}
}
