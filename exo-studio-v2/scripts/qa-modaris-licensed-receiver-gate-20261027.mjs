#!/usr/bin/env node
/**
 * Evidence admission for an EXTERNAL licensed Modaris Expert interchange run.
 * This program does NOT control Lectra software or validate its licensing.
 * It verifies complete six-size receiving documentation, measured fields,
 * explicit artifact SHA-256 bytes and defensive manifest structure. Even a
 * perfectly complete manifest is only READY_FOR_INDEPENDENT_REVIEW.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {fileURLToPath} from 'node:url'

const SIZES=Object.freeze(['XS','S','M','L','XL','XXL'])
const DIRECTIONS=Object.freeze(['EXO_TO_MODARIS','MODARIS_TO_EXO'])
const HASH=/^[a-f0-9]{64}$/
const token=v=>typeof v==='string'&&v.length>0&&v.length<=160&&v.trim()===v&& !/[\x00-\x1f]/.test(v)
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype
const keys=(v,required,optional=[])=>plain(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k))
const bounded=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e7
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex')
const fail=(issues,code,detail)=>issues.push(Object.freeze({code,detail:String(detail).slice(0,180)}))
const validName=v=>token(v)&&/^[a-zA-Z0-9_\-.]+$/.test(v)&&v!=='.'&&v!=='..'

function artifact(root,entry,issues){
  if(!keys(entry,['file','sha256','bytes','role'])||!validName(entry.file)||
     !HASH.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<1||entry.bytes>64e6||
     !['MODEL','RECEIVER_REPORT','PLOT_MEASUREMENT'].includes(entry.role)){
    fail(issues,'ARTIFACT_SCHEMA','Invalid artifact ID, size, SHA-256, or role');return null
  }
  const full=path.resolve(root,entry.file)
  if(path.dirname(full)!==path.resolve(root)){fail(issues,'ARTIFACT_TRAVERSAL',entry.file);return null}
  try{
    const stat=fs.lstatSync(full)
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==entry.bytes||stat.size>64e6){
      fail(issues,'ARTIFACT_SIZE_OR_LINK',entry.file);return null
    }
    const actual=hash(fs.readFileSync(full))
    if(actual!==entry.sha256){fail(issues,'ARTIFACT_HASH',entry.file);return null}
    return {file:entry.file,sha256:actual,bytes:stat.size,role:entry.role}
  }catch(error){fail(issues,'ARTIFACT_UNAVAILABLE',`${entry.file}: ${error.code||error.message}`);return null}
}

/**
 * Artifacts are a prerequisite, not a proof of the observed licensed software.
 * An external technical-patternmaker must independently review the evidence.
 */
export function assessModarisLicensedReceiver20261027(manifest,{root}={}){
  const issues=[],observed=[]
  if(!root||typeof root!=='string')fail(issues,'ROOT','An explicit read-only evidence directory is required')
  if(!keys(manifest,['schema','project','receiver','sizes','directions','fixtures','artifacts'])||manifest.schema!==1)
    fail(issues,'MANIFEST_SCHEMA','Schema 1 and exactly the documented fields are required')
  const project=manifest?.project
  if(!keys(project,['id','sourceRevision','sourceSha256'])||!token(project.id)||
     !Number.isSafeInteger(project.sourceRevision)||project.sourceRevision<0||!HASH.test(project.sourceSha256))
    fail(issues,'SOURCE_IDENTITY','Exact EXO project revision and SHA-256 source are required')
  const receiver=manifest?.receiver
  if(!keys(receiver,['product','version','operator','sessionId','observedAt','evidenceOrigin'])||
     receiver.product!=='Lectra Modaris Expert'||!token(receiver.version)||!token(receiver.operator)||
     !token(receiver.sessionId)||!Number.isFinite(Date.parse(receiver.observedAt))||
     receiver.evidenceOrigin!=='EXTERNAL_LICENSED_APPLICATION')
    fail(issues,'LICENSED_RECEIVER_EVIDENCE','Licensed reference metadata missing or unsupported; cannot infer a license')
  if(!Array.isArray(manifest?.sizes)||JSON.stringify(manifest.sizes)!==JSON.stringify(SIZES))
    fail(issues,'SIZE_RUN','Exactly XS, S, M, L, XL, XXL in canonical order required')
  if(!Array.isArray(manifest?.directions)||JSON.stringify(manifest.directions)!==JSON.stringify(DIRECTIONS))
    fail(issues,'DIRECTIONS','Both ordered receiving directions required')
  const all=manifest?.fixtures
  if(!Array.isArray(all)||all.length!==12)fail(issues,'FIXTURE_COUNT','Twelve independent size/direction receiver records required')
  const seen=new Set(),files=new Set()
  for(const row of Array.isArray(all)?all.slice(0,100):[]){
    if(!keys(row,['size','direction','pieces','cutContours','stitchContours','notches','grainlines',
      'curves','maxDeviationMm','plotScaleErrorPct','pieceIdsPreserved','layersPreserved','file','receiverReport','plotReport'])||
       !SIZES.includes(row.size)||!DIRECTIONS.includes(row.direction)||
       !['pieces','cutContours','stitchContours','notches','grainlines','curves'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0&&row[k]<10000)||
       !bounded(row.maxDeviationMm)||row.maxDeviationMm>.1||
       !bounded(row.plotScaleErrorPct)||row.plotScaleErrorPct>.05||
       row.pieceIdsPreserved!==true||row.layersPreserved!==true){
      fail(issues,'RECEIVER_MEASUREMENT','Invalid, missing or over-tolerance size/direction receiver measurement');continue
    }
    if(row.pieces<1||row.cutContours<row.pieces||row.stitchContours<row.pieces||
       row.grainlines<row.pieces){fail(issues,'INDUSTRIAL_INVENTORY',`${row.direction}/${row.size}`)}
    const id=`${row.direction}:${row.size}`
    if(seen.has(id))fail(issues,'DUPLICATE_FIXTURE',id)
    seen.add(id)
    for(const field of ['file','receiverReport','plotReport']){
      if(!validName(row[field]))fail(issues,'FIXTURE_FILE',`${id}/${field}`)
      else files.add(row[field])
    }
    observed.push({direction:row.direction,size:row.size,pieces:row.pieces,notches:row.notches,
      curves:row.curves,maxDeviationMm:row.maxDeviationMm,plotScaleErrorPct:row.plotScaleErrorPct})
  }
  for(const direction of DIRECTIONS)for(const size of SIZES){
    if(!seen.has(`${direction}:${size}`))fail(issues,'MISSING_FIXTURE',`${direction}:${size}`)
  }
  const specs=manifest?.artifacts
  if(!Array.isArray(specs)||specs.length<3||specs.length>48)
    fail(issues,'ARTIFACT_COUNT','Three or more uniquely pinned evidence artifacts required')
  const approved=[]
  const declared=new Set()
  for(const entry of Array.isArray(specs)?specs.slice(0,48):[]){
    if(declared.has(entry?.file))fail(issues,'DUPLICATE_ARTIFACT',entry?.file)
    declared.add(entry?.file)
    if(root){const valid=artifact(root,entry,issues);if(valid)approved.push(valid)}
  }
  for(const file of files)if(!declared.has(file))fail(issues,'UNPINNED_REFERENCE',file)
  for(const role of ['MODEL','RECEIVER_REPORT','PLOT_MEASUREMENT'])
    if(!approved.some(entry=>entry.role===role))fail(issues,'MISSING_EVIDENCE_ROLE',role)
  const structurallyComplete=issues.length===0
  return Object.freeze({schema:1,
    status:structurallyComplete?'EVIDENCE_INTEGRITY_READY_FOR_INDEPENDENT_REVIEW':'BLOCKED',
    evidenceComplete:structurallyComplete,independentlyVendorAccepted:false,
    productionApproved:false,parity100Achieved:false,
    verifiedArtifactCount:approved.length,requiredFixtureCount:12,observedFixtureCount:observed.length,
    measured:observed,issues,
    limitation:'EXO validates file bytes and documented numeric tolerances, not an actual Lectra session or physical cutter. Even complete self-supplied data require authorized independent receiver, reviewer identity and signed external attestation before parity acceptance.'})
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const arg=process.argv.slice(2)
  const at=arg.indexOf('--manifest'),location=at>=0?arg[at+1]:null
  const rootArg=arg.indexOf('--root'),root=rootArg>=0?arg[rootArg+1]:null
  let output
  try{
    if(!location||!root)throw Error('Usage: node qa-modaris-licensed-receiver-gate-20261027.mjs --manifest path/to/external-manifest.json --root path/to/external-evidence-dir')
    const file=fs.readFileSync(location)
    if(file.length>512000)throw Error('Oversized external receiver manifest')
    output=assessModarisLicensedReceiver20261027(JSON.parse(file.toString('utf8')),{root})
  }catch(error){output={status:'BLOCKED',independentlyVendorAccepted:false,
    parity100Achieved:false,issues:[{code:'EXTERNAL_REFERENCE_MISSING_OR_INVALID',detail:error.message}]}}
  process.stdout.write(JSON.stringify(output,null,2)+'\n')
  if(output.status==='BLOCKED')process.exitCode=2
}
