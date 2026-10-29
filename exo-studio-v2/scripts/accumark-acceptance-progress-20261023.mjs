// Evidence-gated AccuMark parity tracking: NEVER count a routed UI control or
// passing local unit test as factory approval.
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {resolve,dirname} from 'node:path'
import {types} from 'node:util'
import {createInitialLedger} from './accumark-parity-ledger-20261023.mjs'
import {verifySignedFactoryAcceptance20261024} from './accumark-signed-factory-acceptance-20261024.mjs'

const EXPECTED={A:12,G:18,C:12,I:14,M:10,R:10}
const RECOGNIZED=new Set([
  'UNASSESSED',
  'NOT_IMPLEMENTED',
  'IMPLEMENTED_UNVERIFIED',
  'INDEPENDENT_VERIFIED',
  'VERIFIED_AGAINST_INDEPENDENT_ORACLE',
  'FACTORY_ACCEPTED',
])
const valueIsSet=value=>typeof value==='string'&&value.trim()!==''
// Acceptance evidence is an editable claim, not a trusted object. Inherited
// values and accessors must not satisfy it (or execute during inspection).
const ownData=(owner,key)=>{
  if(!owner||typeof owner!=='object'||types.isProxy(owner)||Array.isArray(owner))return undefined
  const descriptor=Object.getOwnPropertyDescriptor(owner,key)
  return descriptor?.enumerable&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined
}
const ownNonblank=(owner,key)=>valueIsSet(ownData(owner,key))
const hasOwnIndependentEvidence=row=>{
  const evidence=ownData(row,'evidence')
  if(types.isProxy(evidence)||!Array.isArray(evidence))return false
  let found=false
  for(let i=0;i<evidence.length;i++){
    const descriptor=Object.getOwnPropertyDescriptor(evidence,String(i))
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))return false
    const item=descriptor.value
    if(ownNonblank(item,'artifact')&&ownNonblank(item,'independentOracle'))found=true
  }
  return found
}

// The signed verifier serializes the complete ledger. JSON.stringify would
// execute getters/toJSON hooks on arbitrary imported objects, even when the
// signature subsequently fails. Only hand it plain, descriptor-safe JSON.
const isPlainJsonDataTree=root=>{
  const seen=new Set()
  const pending=[root]
  while(pending.length){
    const value=pending.pop()
    if(value===null||typeof value==='string'||typeof value==='boolean')continue
    if(typeof value==='number'&&Number.isFinite(value))continue
    if(!value||typeof value!=='object'||types.isProxy(value)||seen.has(value))return false
    seen.add(value)
    const array=Array.isArray(value)
    const prototype=Object.getPrototypeOf(value)
    if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)return false
    if(array){
      for(let i=0;i<value.length;i++){
        const descriptor=Object.getOwnPropertyDescriptor(value,String(i))
        if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))return false
      }
    }
    for(const key of Reflect.ownKeys(value)){
      if(typeof key!=='string')return false
      if(array&&key==='length')continue
      const descriptor=Object.getOwnPropertyDescriptor(value,key)
      if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))return false
      pending.push(descriptor.value)
    }
  }
  return true
}
const signedOptionsAreOwnData=options=>{
  const release=ownData(options,'signedRelease')
  const receiverBytes=ownData(release,'receiverArtifactBytes')
  const sampleBytes=ownData(release,'physicalSampleArtifactBytes')
  return ownNonblank(options,'trustedPublicKeyPem')&&ownNonblank(release,'payloadUtf8')&&
    ownNonblank(release,'signatureBase64')&&
    !types.isProxy(receiverBytes)&&types.isUint8Array(receiverBytes)&&
    !types.isProxy(sampleBytes)&&types.isUint8Array(sampleBytes)
}

export function assessAccuMarkAcceptanceLedger(ledger, trustedExternalEvidence){
  // The ledger and its row identities/statuses are untrusted claims too. Read
  // own data descriptors rather than invoking inherited values or getters.
  const rows=ownData(ledger,'requirements')
  if(ownData(ledger,'schema')!=='exo.accumark.acceptance.v1'||types.isProxy(rows)||!Array.isArray(rows))
    throw Error('Missing or invalid acceptance ledger schema/requirements')
  const required=Object.entries(EXPECTED).flatMap(([prefix,n])=>Array.from({length:n},(_,i)=>prefix+String(i+1).padStart(2,'0')))
  if(rows.length!==required.length)
    throw Error('Ledger must contain exactly 76 unique expected AccuMark acceptance IDs')
  const entries=[]
  for(let i=0;i<rows.length;i++){
    const descriptor=Object.getOwnPropertyDescriptor(rows,String(i))
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))
      throw Error('Ledger must contain exactly 76 unique expected AccuMark acceptance IDs')
    const row=descriptor.value
    entries.push({row,id:ownData(row,'id')})
  }
  const ids=entries.map(({id})=>id)
  if(ids.length!==required.length||new Set(ids).size!==ids.length||
    required.some(id=>!ids.includes(id)))throw Error('Ledger must contain exactly 76 unique expected AccuMark acceptance IDs')
  const counts=Object.fromEntries([...RECOGNIZED].map(s=>[s,0]))
  const issues=[]
  const canonical=new Map(createInitialLedger().requirements.map(row=>[row.id,row]))
  for(const {row,id} of entries){
    const status=ownData(row,'status')
    if(!RECOGNIZED.has(status))throw Error('Unsupported acceptance status for '+id)
    counts[status]++
    if(ownData(row,'criterion')!==canonical.get(id).criterion||ownData(row,'lane')!==canonical.get(id).lane)
      issues.push({id,code:'CANONICAL_MATRIX_DRIFT'})
    if(status==='INDEPENDENT_VERIFIED'||status==='VERIFIED_AGAINST_INDEPENDENT_ORACLE'){
      if(!hasOwnIndependentEvidence(row))
        issues.push({id,code:'INDEPENDENT_STATUS_WITHOUT_INDEPENDENT_ORACLE'})
    }
    if(status==='FACTORY_ACCEPTED'){
      if(!hasOwnIndependentEvidence(row))
        issues.push({id,code:'FACTORY_ACCEPTANCE_WITHOUT_INDEPENDENT_ORACLE'})
      const approval=ownData(row,'approval')
      if(!ownNonblank(approval,'operator')||!ownNonblank(approval,'site')||
          !ownNonblank(approval,'date')||!ownNonblank(approval,'signedArtifact'))
        issues.push({id,code:'FACTORY_ACCEPTANCE_WITHOUT_SIGNED_APPROVAL'})
    }
  }
  const independentCount=counts.INDEPENDENT_VERIFIED+counts.VERIFIED_AGAINST_INDEPENDENT_ORACLE
  // These status strings and oracle filenames are editable ledger assertions.
  // No independently pinned oracle/witness verification is implemented here.
  // Keep the raw claim count separate from authenticated verification progress.
  const independentEvidenceAuthenticated=false
  if(independentCount>0&&!independentEvidenceAuthenticated)
    issues.push({code:'INDEPENDENT_STATUS_ATTESTATION_UNVERIFIED'})
  const factoryCount=counts.FACTORY_ACCEPTED
  const receiver=ownData(ledger,'industrialRoundTrip')
  const specimen=ownData(ledger,'physicalSample')
  // These editable ledger records describe claims, not witnessed CAD receiver
  // reimport or physically measured and signed factory samples. Even a signed
  // byte receipt cannot establish the external industrial semantics.
  const receiverStatusClaimed=ownData(receiver,'approved')===true&&ownNonblank(receiver,'receiver')&&ownNonblank(receiver,'artifact')
  const physicalStatusClaimed=ownData(specimen,'approved')===true&&ownNonblank(specimen,'site')&&ownNonblank(specimen,'operator')&&ownNonblank(specimen,'artifact')
  const receiverSemanticAuditVerified=false
  const physicalSemanticAuditVerified=false
  const receiverAccepted=receiverStatusClaimed&&receiverSemanticAuditVerified
  const physicalAccepted=physicalStatusClaimed&&physicalSemanticAuditVerified
  if(!receiverAccepted)issues.push({code:'CAD_RECEIVER_ROUNDTRIP_UNVERIFIED'})
  if(!physicalAccepted)issues.push({code:'PHYSICAL_SAMPLE_UNVERIFIED'})
  // The ledger alone cannot authenticate claimed CAD sessions or sewn samples.
  // No trusted key is configured in the CLI, so JSON edits can never turn it green.
  const signedExternalAcceptance=signedOptionsAreOwnData(trustedExternalEvidence)&&isPlainJsonDataTree(ledger)&&
    verifySignedFactoryAcceptance20261024(ledger,trustedExternalEvidence)
  if(factoryCount===76&&!signedExternalAcceptance)
    issues.push({code:'SIGNED_EXTERNAL_FACTORY_ATTESTATION_UNVERIFIED'})
  // A valid signature binds assertions and bytes; it does NOT independently
  // establish licensed CAD semantics, physical measurement or signer authority.
  // Until those external audits are implemented, the aggregate gate is closed.
  const externalSemanticAuditVerified=receiverSemanticAuditVerified&&physicalSemanticAuditVerified
  if(factoryCount===76)
    issues.push({code:'INDEPENDENT_CAD_AND_PHYSICAL_SEMANTIC_AUDIT_REQUIRED'})
  const fullyAccepted=rows.length===76&&factoryCount===76&&issues.length===0&&
    signedExternalAcceptance&&externalSemanticAuditVerified
  return Object.freeze({
    schema:'exo.accumark.acceptance-progress.v1',
    requirements:76,
    counts,
    assessed:76-counts.UNASSESSED,
    implementationCandidateCount:counts.IMPLEMENTED_UNVERIFIED+independentCount+factoryCount,
    independentStatusClaimCount:independentCount,
    independentlyVerified:independentEvidenceAuthenticated?independentCount:0,
    // FACTORY_ACCEPTED is an editable row status, not an authenticated result.
    // Keep its raw count available for migration/reporting, but do not expose
    // unverified assertions under the authoritative factoryAccepted name.
    factoryStatusClaimCount:factoryCount,
    factoryAccepted:fullyAccepted?factoryCount:0,
    factoryStatusClaimPercent:Number((factoryCount/76*100).toFixed(2)),
    factoryAcceptedPercent:fullyAccepted?100:0,
    receiverStatusClaimed,
    physicalStatusClaimed,
    receiverSemanticAuditVerified,
    physicalSemanticAuditVerified,
    receiverAccepted,
    physicalAccepted,
    signedExternalAcceptance,
    externalSemanticAuditVerified,
    completion100Percent:fullyAccepted,
    issues,
    note:'Independent and factory status claim counts, receiverStatusClaimed and physicalStatusClaimed are unverified ledger claims; factoryAccepted is evidence-gated. Neither named oracle files nor a signed receipt alone establish independent verification, licensed CAD round-trip or measured physical sample. Aggregate acceptance remains blocked pending independent semantic audit.',
  })
}

const invokedAsCLI=process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])
if(invokedAsCLI){
  const root=dirname(dirname(fileURLToPath(import.meta.url)))
  const path=process.argv[2]||resolve(root,'docs/research/swarm-20261023/parity-ledger.json')
  const ledger=JSON.parse(readFileSync(path,'utf8'))
  const result=assessAccuMarkAcceptanceLedger(ledger)
  process.stdout.write(JSON.stringify(result,null,2)+'\n')
}
