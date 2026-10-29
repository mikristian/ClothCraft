import {verifyNativeGradeCatalog20261025} from './nativeGradeCatalogBridge20261025.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {verifyNativeGradePomAuditWitness20261028} from './nativeGradePomAuditWitness20261028.js'

const same=(a,b)=>Object.is(a,b)||Boolean(a&&b&&typeof a==='object'&&
  typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&
  Object.keys(a).length===Object.keys(b).length&&
  Object.keys(a).every(key=>Object.hasOwn(b,key)&&same(a[key],b[key])))
const fail=(reason,{dispatched=false,committed=false}={})=>({
  ok:false,reason,nativeCommitted:committed,needsNativeRecovery:dispatched,
  manufacturingApproved:false,factoryApproved:false,
})
// Rust serde omits only these two empty optional schema-v2 fields.
const normalized=run=>run&&typeof run==='object'&&!Array.isArray(run)?{
  ...run,
  sizeCorrespondence:Object.hasOwn(run,'sizeCorrespondence')?run.sizeCorrespondence:{},
  pomSpecs:Object.hasOwn(run,'pomSpecs')?run.pomSpecs:[],
}:run
const station=definition=>{
  const copy={...definition}
  delete copy.targetsMm
  return copy
}

/**
 * Persist edited named-size POM targets in ONE Rust grade-run CAS without
 * changing the saved canonical sizes, grading geometry, correspondences or
 * authored measurement stations. CSV import remains a separately validated
 * draft operation. A missing receipt is an unknown outcome, never a rollback.
 *
 * This deliberately refuses station additions/deletions: those need their own
 * explicit authoring transaction and native receiving acceptance.
 */
export async function commitNativeGradeNamedSizePom20261028({
  snapshot,expectedRevision,ruleSet,definitions,request,
}={}){
  let dispatched=false,committed=false
  try{
    // Capture a transaction-owned source before the first asynchronous native
    // read. React/editor drafts may be edited while the Rust preflight awaits;
    // neither the packet nor the physical acceptance witness may follow those
    // mutable references after the revision CAS has been prepared.
    const source=structuredClone({snapshot,ruleSet,definitions})
    const live={snapshot,ruleSet,definitions}
    ;({snapshot,ruleSet,definitions}=source)
    if(typeof request!=='function'||!Number.isSafeInteger(expectedRevision)||
      expectedRevision<0||snapshot?.revision!==expectedRevision||
      snapshot?.gradeRunPersisted!==true||snapshot?.activeGradedSize||
      !Array.isArray(ruleSet?.sizes)||ruleSet.sizes.length<2||
      ruleSet.sizes.length>24||!Array.isArray(definitions)||
      !definitions.length||definitions.length>64)
      return fail('A current inactive persisted named-size Rust source and authored POM inventory are required')

    const status=await request({op:'grade-run-status',revision:expectedRevision})
    if(status?.revision!==expectedRevision||status.persistedInProject!==true||
      status.sizeActivated!==false||status.catalog?.schemaVersion!==2||
      !same(status.catalog.sizes,ruleSet.sizes)||
      !same(status.catalog.baseTemplate,snapshot.template))
      return fail('Rust schema-v2 catalog is stale, activated or source-mismatched')
    const saved=await request({op:'save',revision:expectedRevision})
    if(snapshot.revision!==expectedRevision||!saved?.project||
      !same(saved.project.template,snapshot.template)||
      !same(normalized(saved.project.grade_run),normalized(status.catalog)))
      return fail('Rust saved project and grade status disagree before POM commit')

    const verified=verifyNativeGradeCatalog20261025(snapshot,ruleSet,status,{
      durablySaved:true,
    })
    if(!verified.ok)return fail('Unsaved or altered grading geometry: '+verified.reason)

    const previous=status.catalog.pomSpecs??[]
    if(previous.length!==definitions.length||!previous.length||
      previous.some((old,index)=>!same(station(old),station(definitions[index]))))
      return fail('POM station identity, order, metadata or tolerance changed; target-only editing is supported')
    const sizes=status.catalog.sizes
    if(definitions.some(def=>!def?.targetsMm||
      Object.keys(def.targetsMm).length!==sizes.length||
      sizes.some(size=>typeof def.targetsMm[size]!=='number'||
        !Number.isFinite(def.targetsMm[size])||def.targetsMm[size]<=0||
        def.targetsMm[size]>10000)))
      return fail('All canonical sizes require explicitly authored finite positive physical targets')
    const measured=inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions,{
      allowNamedSizes:true,
    })
    if(measured.reason||measured.rows.length!==sizes.length*definitions.length)
      return fail('Physical POM source validation rejected: '+(measured.reason||'incomplete rows'))
    if(same(previous,definitions))return fail('No changed POM targets to commit')
    if(!same(live.snapshot,snapshot)||!same(live.ruleSet,ruleSet)||
      !same(live.definitions,definitions))
      return fail('Source, grading rules or POM targets changed during native preflight; retry with a fresh revision')

    const gradeRun=structuredClone({...status.catalog,pomSpecs:definitions})
    dispatched=true
    // Give the RPC transport a separate copy: a transport that mutates its
    // request packet must not alter the intended durable receipt comparison.
    const receipt=await request({op:'grade-run-commit',revision:expectedRevision,
      gradeRun:structuredClone(gradeRun)})
    if(receipt?.revision!==expectedRevision+1||
      !(receipt.gradeRunCommitted===true||receipt.gradeCatalogResult?.persisted===true))
      return fail('Rust commit acknowledgment is missing; inspect native history before retrying',{dispatched})
    committed=true
    const after=await request({op:'snapshot',revision:expectedRevision+1})
    const finalStatus=await request({op:'grade-run-status',revision:expectedRevision+1})
    const durable=await request({op:'save',revision:expectedRevision+1})
    if(after?.revision!==expectedRevision+1||after.gradeRunPersisted!==true||
      after.activeGradedSize||!same(after.template,snapshot.template)||
      finalStatus?.revision!==expectedRevision+1||
      finalStatus.persistedInProject!==true||
      !same(normalized(finalStatus.catalog),normalized(gradeRun))||
      !same(normalized(durable?.project?.grade_run),normalized(gradeRun))||
      !same(durable?.project?.template,snapshot.template))
      return fail('Postcommit Rust geometry, grade catalog or durable save differs; inspect history',
        {dispatched,committed})
    const audit=await request({op:'grade-run-pom-audit',revision:expectedRevision+1})
    const witness=verifyNativeGradePomAuditWitness20261028({
      snapshot:after,ruleSet,status:finalStatus,audit,definitions,
    })
    if(!witness.ok)return fail('Postcommit native physical POM witness rejected: '+witness.reason,
      {dispatched,committed})
    return {ok:true,nativeCommitted:true,needsNativeRecovery:false,
      manufacturingApproved:false,factoryApproved:false,
      revision:after.revision,snapshot:after,status:finalStatus,
      project:durable.project,definitions,witness,
      nativeNumericalAccepted:witness.nativeNumericalAccepted}
  }catch(error){
    return fail('Native named-size POM transaction failed: '+String(error?.message||error),
      {dispatched,committed})
  }
}
