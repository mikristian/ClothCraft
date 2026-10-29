/**
 * Independently signed factory review records. Public keys must be provisioned by
 * the caller from an external trust process; this module ships no trust anchors.
 * An authentic signature authenticates an attestation, not the physical specimen.
 */
export const NATIVE_GRADE_REVIEW_SIZES_20261027=Object.freeze(['XS','S','M','L','XL','XXL'])
export const NATIVE_GRADE_REVIEW_ROLES_20261027=Object.freeze(['cut','receiving-cad','sewn-samples'])
const SCHEMA='exo.native-grade-independent-review-evidence.v1'
const SIZES=NATIVE_GRADE_REVIEW_SIZES_20261027
const ROLES=NATIVE_GRADE_REVIEW_ROLES_20261027
const ident=value=>typeof value==='string'&&value.length>=1&&value.length<=240&&value.trim()===value&&/^[\x21-\x7e]+$/.test(value)
const sha=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value)
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const nonnegative=value=>finite(value)&&value>=0
const positive=value=>finite(value)&&value>0
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
const exactKeys=(value,keys)=>isRecord(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key))
const exactSizes=value=>Array.isArray(value)&&value.length===SIZES.length&&SIZES.every((size,i)=>value[i]===size)
const reportFail=(code,detail)=>({ok:false,code,detail,releaseReadyForIndependentAudit:false,
 independentlySignedEvidenceVerified:false,physicalTruthVerified:false,factoryApproved:false,
 manufacturingApproved:false,cuttingAuthorized:false,verifiedRoles:[],verifiedSizes:[]})

/** Canonical JSON requires ordinary data (no undefined, NaN, accessors or cycles). */
export function canonicalNativeGradeReviewJson20261027(value){
 const ancestors=new Set()
 function visit(item){
  if(item===null||typeof item==='string'||typeof item==='boolean')return item
  if(finite(item))return item
  if(Array.isArray(item)){
   if(ancestors.has(item))throw Error('Cyclic array')
   ancestors.add(item)
   const result=Array.from({length:item.length},(_,i)=>{
    if(!Object.hasOwn(item,i))throw Error('Sparse array')
    return visit(item[i])
   })
   ancestors.delete(item)
   return result
  }
  if(!isRecord(item)||ancestors.has(item))throw Error('Unsupported or cyclic JSON object')
  ancestors.add(item)
  const result={}
  for(const key of Reflect.ownKeys(item).sort()){
   if(typeof key!=='string'||key==='__proto__')throw Error('Unsafe canonical JSON property')
   const descriptor=Object.getOwnPropertyDescriptor(item,key)
   if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw Error('Accessors or hidden properties are not signed JSON data')
   Object.defineProperty(result,key,{value:visit(descriptor.value),enumerable:true,writable:true,configurable:true})
  }
  ancestors.delete(item)
  return result
 }
 const result=JSON.stringify(visit(value))
 if(typeof result!=='string')throw Error('Invalid canonical JSON')
 return result
}

const encoder=new TextEncoder()
const cryptoApi=()=>globalThis.crypto?.subtle
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')
export async function sha256NativeGradeReview20261027(value){
 const subtle=cryptoApi()
 if(!subtle)throw Error('WebCrypto SHA-256 is unavailable')
 return hex(await subtle.digest('SHA-256',encoder.encode(canonicalNativeGradeReviewJson20261027(value))))
}
const signatureData=report=>{
 const {signatureBase64,...unsigned}=report
 return encoder.encode(canonicalNativeGradeReviewJson20261027(unsigned))
}
const base64Bytes=value=>{
 if(typeof value!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(value))throw Error('Expected canonical Ed25519 signature base64')
 const decode=typeof atob==='function'?atob:null
 if(!decode)throw Error('Base64 decoding is unavailable')
 const decoded=decode(value)
 if(decoded.length!==64)throw Error('Invalid Ed25519 signature length')
 return Uint8Array.from(decoded,char=>char.charCodeAt(0))
}
function completeInventory(rows,key){
 return Array.isArray(rows)&&rows.length===6&&exactSizes(rows.map(row=>row?.[key]))
}
function sourceCutInventory(template){
 const panels=template.panels
 if(!Array.isArray(panels)||!panels.length)return null
 const edges=new Set(),notches=new Set()
 for(const panel of panels){
  if(!ident(panel?.id)||!Array.isArray(panel.polygon?.edges)||!panel.polygon.edges.length)return null
  for(const edge of panel.polygon.edges){
   if(!ident(edge)||edges.has(`${panel.id}\u0000${edge}`))return null
   edges.add(`${panel.id}\u0000${edge}`)
  }
  for(const [edge,items] of Object.entries(panel.polygon.notches||{})){
   if(!panel.polygon.edges.includes(edge)||!Array.isArray(items))return null
   for(let i=0;i<items.length;i++){
    const notch=items[i]
    if(!notch||!nonnegative(notch.t)||notch.t>1)return null
    const notchId=ident(notch.id)?notch.id:`${edge}:${i}`
    const key=`${panel.id}\u0000${notchId}`
    if(notches.has(key))return null
    notches.add(key)
   }
  }
 }
 return {edges,notches}
}
function checkCut(report,template){
 if(!completeInventory(report.sizeReports,'size'))return 'CUT must report all six sizes in order'
 const inventory=sourceCutInventory(template)
 if(!inventory)return 'CUT source panels, edges and notch inventory invalid'
 const calibrations=new Set()
 for(const row of report.sizeReports){
  const c=row.calibration
  if(!ident(row.cutJobId)||!ident(row.materialLotId)||!isRecord(c)||!ident(c.equipmentId)||
   !ident(c.calibrationCertificateId)||!ident(c.calibratedAt)||!ident(c.expiresAt)||
   !finite(c.measuredErrorMm)||c.measuredErrorMm<0||!positive(c.maxErrorMm)||
   c.measuredErrorMm>c.maxErrorMm||!Array.isArray(row.allowanceReports)||
   row.allowanceReports.length!==inventory.edges.size||!Array.isArray(row.notchReports)||
   row.notchReports.length!==inventory.notches.size)return `CUT ${row.size}: calibration, allowance or notch evidence incomplete`
  const from=Date.parse(c.calibratedAt),until=Date.parse(c.expiresAt),at=Date.parse(report.recordedAt)
  if(!Number.isFinite(from)||!Number.isFinite(until)||from>at||until<at||from>=until)return `CUT ${row.size}: calibration expired or undated`
  calibrations.add(c.calibrationCertificateId)
  const allowanceIds=new Set(),notchIds=new Set()
  for(const a of row.allowanceReports){
   if(!ident(a.panelId)||!ident(a.edgeId)||!inventory.edges.has(`${a.panelId}\u0000${a.edgeId}`)||
    !nonnegative(a.requiredMm)||!nonnegative(a.measuredMm)||
    !nonnegative(a.toleranceMm)||Math.abs(a.measuredMm-a.requiredMm)>a.toleranceMm||
    allowanceIds.has(`${a.panelId}\u0000${a.edgeId}`))return `CUT ${row.size}: invalid allowance measurement`
   const panel=template.panels.find(item=>item.id===a.panelId)
   const authored=panel.polygon.seam_allowances?.[a.edgeId]??0
   if(!nonnegative(authored)||Math.abs(a.requiredMm-authored*1000)>1e-6)
    return `CUT ${row.size}: allowance target differs from native source`
   allowanceIds.add(`${a.panelId}\u0000${a.edgeId}`)
  }
  for(const n of row.notchReports){
   if(!ident(n.panelId)||!ident(n.notchId)||!inventory.notches.has(`${n.panelId}\u0000${n.notchId}`)||
    !nonnegative(n.expectedPositionMm)||!nonnegative(n.measuredPositionMm)||
    !nonnegative(n.toleranceMm)||Math.abs(n.expectedPositionMm-n.measuredPositionMm)>n.toleranceMm||
    notchIds.has(`${n.panelId}\u0000${n.notchId}`))return `CUT ${row.size}: invalid notch measurement`
   notchIds.add(`${n.panelId}\u0000${n.notchId}`)
  }
  if(allowanceIds.size!==inventory.edges.size||notchIds.size!==inventory.notches.size)
   return `CUT ${row.size}: source geometry measurement coverage incomplete`
 }
 if(!calibrations.size)return 'Missing cutter calibration certificates'
 return null
}
function checkCad(report){
 if(!ident(report.receivingCadApplication)||!ident(report.receivingCadVersion)||
  !completeInventory(report.sizeReports,'size'))return 'Receiving CAD identity and all six sizes required'
 const returned=new Set()
 for(const row of report.sizeReports){
  if(!ident(row.returnedFileName)||!sha(row.returnedFileSha256)||!sha(row.receivedFileSha256)||
   !ident(row.receiptId)||row.geometryParityPassed!==true||row.allowancesPreserved!==true||
   row.notchesPreserved!==true||returned.has(row.receiptId))return `CAD ${row.size}: missing distinct returned-file proof`
  returned.add(row.receiptId)
 }
 return null
}
function checkSamples(report,pomDefinitions){
 if(!completeInventory(report.sizeReports,'size'))return 'All six sewn specimen sizes required'
 if(!Array.isArray(pomDefinitions)||pomDefinitions.length===0||pomDefinitions.some(row=>!ident(row?.id)))
  return 'Explicit named POM definitions required'
 const required=new Set(pomDefinitions.map(row=>row.id))
 if(required.size!==pomDefinitions.length)return 'Duplicate POM source definitions'
 const specimens=new Set()
 for(const row of report.sizeReports){
  if(!ident(row.specimenId)||!ident(row.sewingBatchId)||specimens.has(row.specimenId)||
   !Array.isArray(row.pomMeasurements)||row.pomMeasurements.length!==required.size)
   return `SEWN ${row.size}: specimen identity or POM inventory invalid`
  specimens.add(row.specimenId)
  const seen=new Set()
  for(const measurement of row.pomMeasurements){
   if(!required.has(measurement?.pomId)||seen.has(measurement.pomId)||
    !nonnegative(measurement.targetMm)||!nonnegative(measurement.actualMm)||!nonnegative(measurement.toleranceMm)||
    Math.abs(measurement.actualMm-measurement.targetMm)>measurement.toleranceMm||
    !ident(measurement.instrumentId))return `SEWN ${row.size}: POM measurement failed`
   seen.add(measurement.pomId)
  }
  for(const pomId of required){
   const source=pomDefinitions.find(pom=>pom.id===pomId)
   const expected=source.targetsMm?.[row.size],tolerance=source.toleranceMm
   const measured=row.pomMeasurements.find(pom=>pom.pomId===pomId)
   if(!nonnegative(expected)||!nonnegative(tolerance)||measured.targetMm!==expected||
    measured.toleranceMm!==tolerance)return `SEWN ${row.size}: POM target does not match source`
  }
 }
 return null
}

/**
 * Verify three independently signed role attestations. Each trustedPublicKeys
 * entry is {role,publicKey:CryptoKey}, provisioned through an external reviewer
 * trust policy. Reports MUST contain all pinned fields; no caller flag can approve.
 */
export async function verifyNativeGradeIndependentReviewEvidence20261027({
 sourceRevision,sourceTemplate,fullRuleSet,pomDefinitions,evidence,trustedPublicKeys,
 now=Date.now(),maxAgeMs=90*24*60*60*1000
}={}){
 try{
  const subtle=cryptoApi()
  if(!subtle)return reportFail('CRYPTO_UNAVAILABLE','WebCrypto is required to authenticate Ed25519 signatures')
  if(!Number.isSafeInteger(sourceRevision)||sourceRevision<0||!isRecord(sourceTemplate)||
   !isRecord(fullRuleSet)||!Array.isArray(pomDefinitions)||!exactSizes(fullRuleSet.sizes))
   return reportFail('INVALID_SOURCE','Expected revision, source template, full rules and POMs with XS through XXL')
  if(!Number.isFinite(now)||!positive(maxAgeMs))return reportFail('INVALID_CLOCK','Invalid current time or maximum evidence age')
  const pins={sourceTemplateSha256:await sha256NativeGradeReview20261027(sourceTemplate),
   fullRuleSetSha256:await sha256NativeGradeReview20261027(fullRuleSet),
   pomSha256:await sha256NativeGradeReview20261027(pomDefinitions)}
  if(!exactKeys(evidence,['schema','sourceRevision','sourceTemplateSha256','fullRuleSetSha256','pomSha256','sizes','reports'])||
   evidence.schema!==SCHEMA||evidence.sourceRevision!==sourceRevision||
   Object.entries(pins).some(([name,value])=>evidence[name]!==value)||!exactSizes(evidence.sizes))
   return reportFail('STALE_SOURCE','Evidence must pin exact source revision, template, complete rules, POM definitions and size order')
  if(!Array.isArray(evidence.reports)||evidence.reports.length!==3||!isRecord(trustedPublicKeys))
   return reportFail('REVIEW_COVERAGE','Three designated role reports and external trusted reviewer public keys required')
  const seenRoles=new Set(),seenReviewers=new Set(),seenIds=new Set(),seenSignatures=new Set()
  for(const report of evidence.reports){
   if(!isRecord(report)||!ROLES.includes(report.role)||seenRoles.has(report.role)||
    !ident(report.reviewerId)||seenReviewers.has(report.reviewerId)||
    !ident(report.evidenceId)||seenIds.has(report.evidenceId)||
    !ident(report.recordedAt)||!Number.isFinite(Date.parse(report.recordedAt))||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(report.recordedAt)||
    now-Date.parse(report.recordedAt)>maxAgeMs||Date.parse(report.recordedAt)>now||
    report.sourceRevision!==sourceRevision||Object.entries(pins).some(([name,value])=>report[name]!==value)||
    !exactSizes(report.sizes)||report.factoryApproved!==false||report.cuttingAuthorized!==false)
    return reportFail('INVALID_REPORT','Reviewer identities, fresh timestamps, exact source pins, disavowed approvals and distinct evidence IDs required')
   seenRoles.add(report.role);seenReviewers.add(report.reviewerId);seenIds.add(report.evidenceId)
   const trusted=Object.getOwnPropertyDescriptor(trustedPublicKeys,report.reviewerId)
   if(!trusted||!Object.hasOwn(trusted,'value')||!isRecord(trusted.value)||
    trusted.value.role!==report.role||trusted.value.publicKey?.type!=='public'||
    trusted.value.publicKey.algorithm?.name!=='Ed25519'||
    !trusted.value.publicKey.usages?.includes('verify'))
    return reportFail('UNTRUSTED_REVIEWER','Reviewer has no externally trusted Ed25519 verification key for designated role')
   let sig
   try{sig=base64Bytes(report.signatureBase64)}catch{return reportFail('INVALID_SIGNATURE','Canonical 64-byte Ed25519 signature required')}
   if(seenSignatures.has(report.signatureBase64))return reportFail('REPLAYED_SIGNATURE','Repeated signature across independent reports')
   seenSignatures.add(report.signatureBase64)
   let authentic=false
   try{authentic=await subtle.verify('Ed25519',trusted.value.publicKey,sig,signatureData(report))}catch{
    return reportFail('CRYPTO_UNAVAILABLE','Ed25519 verification is unsupported by this WebCrypto implementation')
   }
   if(!authentic)return reportFail('INVALID_SIGNATURE','Report signature does not verify with designated reviewer public key')
   const error=report.role==='cut'?checkCut(report,sourceTemplate):report.role==='receiving-cad'?checkCad(report):checkSamples(report,pomDefinitions)
   if(error)return reportFail('INVALID_PHYSICAL_REPORT',error)
  }
  if(ROLES.some(role=>!seenRoles.has(role)))return reportFail('REVIEW_COVERAGE','Distinct CUT, receiving CAD, sewn samples roles required')
  return {ok:true,code:'INDEPENDENT_SIGNATURES_VERIFIED',sourceRevision,
   ...pins,releaseReadyForIndependentAudit:true,independentlySignedEvidenceVerified:true,
   verifiedRoles:[...ROLES],verifiedSizes:[...SIZES],physicalTruthVerified:false,
   factoryApproved:false,manufacturingApproved:false,cuttingAuthorized:false,
   note:'Authentic reviewer attestations verified. Physical samples, measurements and actual CAD operation cannot be proven by signatures alone.'}
 }catch(error){return reportFail('INVALID_EVIDENCE',String(error?.message||error))}
}
