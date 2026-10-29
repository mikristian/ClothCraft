import {planNativeGradeSizeCorrespondence20261028,verifyNativeGradeSizeCorrespondence20261028} from './nativeGradeSizeCorrespondence20261028.js'

const fail=(reason,{nativeCommitted=false,needsNativeRecovery=nativeCommitted}={})=>({
  ok:false,reason,nativeCommitted,needsNativeRecovery,factoryApproved:false})
const equal=(a,b)=>{
  if(Object.is(a,b))return true
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false
  const keys=Object.keys(a)
  return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]))
}

/**
 * F7 browser → authoritative Rust transaction. Every read is tied to the
 * same source revision. A failed postcommit receipt is explicitly NOT a
 * rollback: operators must inspect native history instead of retrying.
 * The caller supplies the real native workspace request function, never a
 * browser-side mutation of saved grading geometry.
 */
export async function commitNativeGradeSizeCorrespondenceTransaction20261028({
  snapshot,expectedRevision,aliases,request,
}={}){
  let dispatched=false,committed=false
  try{
    if(typeof request!=='function'||!Number.isSafeInteger(snapshot?.revision)||
      snapshot.revision!==expectedRevision||snapshot?.activeGradedSize||
      snapshot?.gradeRunPersisted!==true)
      return fail('A matching, inactive, persisted Rust grading source is required')
    const status=await request({op:'grade-run-status',revision:expectedRevision})
    if(!status||status.revision!==expectedRevision)return fail('Native grade status was unavailable or stale')
    const beforeSave=await request({op:'save',revision:expectedRevision})
    if(!beforeSave?.project||!equal(beforeSave.project.template,snapshot.template)||
      !equal(beforeSave.project.grade_run,status.catalog))
      return fail('Native saved project and grade status did not match the source')
    const plan=planNativeGradeSizeCorrespondence20261028(snapshot,status,aliases)
    if(!plan.ok)return fail(plan.reason)
    dispatched=true
    const receipt=await request(plan.request)
    // The raw Rust session replies with gradeRunCommitted, while the real
    // workspace bridge publishes its normalized gradeCatalogResult receipt.
    if(!(receipt?.gradeRunCommitted===true||receipt?.gradeCatalogResult?.persisted===true)||
      receipt.revision!==plan.expectedRevision)
      return fail('Native grade commit was not acknowledged; inspect native history before retrying',
        {needsNativeRecovery:true})
    committed=true
    const after=await request({op:'snapshot',revision:plan.expectedRevision})
    if(!after||after.revision!==plan.expectedRevision||!equal(after.template,snapshot.template)||
      after.activeGradedSize||after.gradeRunPersisted!==true)
      return fail('Postcommit native snapshot was not source-identical',{nativeCommitted:true})
    const finalStatus=await request({op:'grade-run-status',revision:plan.expectedRevision})
    const finalSave=await request({op:'save',revision:plan.expectedRevision})
    const verified=verifyNativeGradeSizeCorrespondence20261028(snapshot,plan,
      finalStatus,finalSave?.project)
    if(!verified.ok)return fail('Durable native correspondence witness failed: '+verified.reason,
      {nativeCommitted:true})
    return {ok:true,nativeCommitted:true,needsNativeRecovery:false,factoryApproved:false,
      snapshot:after,status:finalStatus,project:finalSave.project,
      aliases:verified.aliases,authoredSizes:verified.authoredSizes,
      revision:verified.revision}
  }catch(error){return fail('Native correspondence transaction failed: '+String(error?.message||error),
    {nativeCommitted:committed,needsNativeRecovery:dispatched})}
}
