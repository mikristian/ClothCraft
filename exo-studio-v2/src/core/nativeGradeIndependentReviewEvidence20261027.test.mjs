import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {
 canonicalNativeGradeReviewJson20261027 as canonical,
 sha256NativeGradeReview20261027 as digest,
 verifyNativeGradeIndependentReviewEvidence20261027 as verify,
} from './nativeGradeIndependentReviewEvidence20261027.js'

if(!globalThis.crypto)globalThis.crypto=webcrypto
const SIZES=['XS','S','M','L','XL','XXL']
const ROLES=['cut','receiving-cad','sewn-samples']
const now=Date.parse('2026-10-27T03:00:00Z')
const clone=value=>structuredClone(value)
const hash='b'.repeat(64)
async function makeFixture(){
 const sourceTemplate={panels:[{id:'front',polygon:{points:[[0,0],[1,0]],edges:['edge-1'],seam_allowances:{'edge-1':0.01},notches:{'edge-1':[{id:'n-1',t:0.5}]}}}],name:'A'}
 const fullRuleSet={sizes:SIZES,panels:{front:{points:{XS:1}}}}
 const pomDefinitions=[{id:'chest',targetsMm:Object.fromEntries(SIZES.map((size,i)=>[size,500+i*20])),toleranceMm:5}]
 const pins={sourceTemplateSha256:await digest(sourceTemplate),fullRuleSetSha256:await digest(fullRuleSet),pomSha256:await digest(pomDefinitions)}
 const keys={},trustedPublicKeys={}
 const reports=[]
 for(const role of ROLES){
  const reviewerId=`reviewer-${role}`
  keys[reviewerId]=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
  trustedPublicKeys[reviewerId]={role,publicKey:keys[reviewerId].publicKey}
  const sizeReports=SIZES.map((size,index)=>{
   if(role==='cut')return {size,cutJobId:`cut-${size}`,materialLotId:'lot-1',
    calibration:{equipmentId:'cutter-1',calibrationCertificateId:'cal-1',calibratedAt:'2026-10-01T00:00:00Z',expiresAt:'2026-11-01T00:00:00Z',measuredErrorMm:0.1,maxErrorMm:0.2},
    allowanceReports:[{panelId:'front',edgeId:'edge-1',requiredMm:10,measuredMm:10.1,toleranceMm:0.2}],
    notchReports:[{panelId:'front',notchId:'n-1',expectedPositionMm:100,measuredPositionMm:100,toleranceMm:0.5}]}
   if(role==='receiving-cad')return {size,returnedFileName:`${size}.dxf`,returnedFileSha256:hash,receivedFileSha256:hash,
    receiptId:`receipt-${size}`,geometryParityPassed:true,allowancesPreserved:true,notchesPreserved:true}
   return {size,specimenId:`specimen-${size}`,sewingBatchId:'batch-1',
    pomMeasurements:[{pomId:'chest',actualMm:500+index*20,targetMm:500+index*20,toleranceMm:5,instrumentId:'caliper-1'}]}
  })
  reports.push({role,evidenceId:`evidence-${role}`,reviewerId,recordedAt:'2026-10-27T02:00:00Z',
   sourceRevision:12,...pins,sizes:[...SIZES],factoryApproved:false,cuttingAuthorized:false,
   ...(role==='receiving-cad'?{receivingCadApplication:'AccuMark',receivingCadVersion:'v1'}:{}),
   sizeReports})
 }
 const evidence={schema:'exo.native-grade-independent-review-evidence.v1',sourceRevision:12,...pins,sizes:[...SIZES],reports}
 const sign=async()=>{
  for(const report of evidence.reports){
   const {signatureBase64,...body}=report
   const signed=await webcrypto.subtle.sign('Ed25519',keys[report.reviewerId].privateKey,new TextEncoder().encode(canonical(body)))
   report.signatureBase64=Buffer.from(signed).toString('base64')
  }
 }
 await sign()
 return {sourceRevision:12,sourceTemplate,fullRuleSet,pomDefinitions,evidence,trustedPublicKeys,now,sign,keys}
}

test('verified distinct Ed25519 role attestations reach review-ready but never factory-approved',async()=>{
 const fixture=await makeFixture()
 const result=await verify(fixture)
 assert.equal(result.ok,true,JSON.stringify(result))
 assert.equal(result.releaseReadyForIndependentAudit,true)
 assert.deepEqual(result.verifiedRoles,ROLES)
 assert.deepEqual(result.verifiedSizes,SIZES)
 for(const k of ['factoryApproved','manufacturingApproved','cuttingAuthorized','physicalTruthVerified'])assert.equal(result[k],false)
})

test('mutated signed bytes, wrong reviewer keys, cross-role signatures and replay are rejected',async()=>{
 for(const variant of [
  f=>{f.evidence.reports[0].sizeReports[0].calibration.measuredErrorMm=0.3},
  f=>{f.trustedPublicKeys['reviewer-cut'].publicKey=f.keys['reviewer-receiving-cad'].publicKey},
  f=>{f.evidence.reports[1].signatureBase64=f.evidence.reports[0].signatureBase64},
  f=>{f.trustedPublicKeys['reviewer-cut'].role='receiving-cad'},
 ]){
  const f=await makeFixture();variant(f)
  const result=await verify(f)
  assert.equal(result.ok,false,JSON.stringify(result))
  assert.equal(result.factoryApproved,false)
 }
})

test('signed invalid reports fail closed, including physical failures, stale reports and source changes',async()=>{
 const scenarios=[
  f=>{f.evidence.reports[0].sizeReports[0].calibration.expiresAt='2026-10-02T00:00:00Z'},
  f=>{f.evidence.reports[0].sizeReports[0].notchReports[0].measuredPositionMm=120},
  f=>{f.evidence.reports[0].sizeReports[0].allowanceReports=[]},
  f=>{f.evidence.reports[0].sizeReports[0].allowanceReports[0].requiredMm=7},
  f=>{f.evidence.reports[0].sizeReports[0].notchReports[0].notchId='other-notch'},
  f=>{f.evidence.reports[1].sizeReports[4].returnedFileSha256='not-a-sha'},
  f=>{f.evidence.reports[2].sizeReports[4].pomMeasurements[0].actualMm=900},
  f=>{f.evidence.reports[2].sizeReports[5].specimenId='specimen-XS'},
  f=>{f.evidence.reports[1].sizeReports[2].size='XS'},
  f=>{f.evidence.reports[1].reviewerId='reviewer-cut'},
  f=>{f.evidence.reports[1].evidenceId='evidence-cut'},
  f=>{f.evidence.reports[0].recordedAt='2025-10-27T02:00:00Z'},
  f=>{f.evidence.reports[0].factoryApproved=true},
  f=>{f.evidence.sizes=[...SIZES].reverse()},
  f=>{f.evidence.reports[1].sizes=[...SIZES].reverse()},
  f=>{f.sourceRevision++},
  f=>{f.sourceTemplate.panels[0].polygon.points[0][0]=5},
  f=>{f.fullRuleSet.panels.front.points.XS=99},
  f=>{f.pomDefinitions[0].toleranceMm=99},
 ]
 for(let i=0;i<scenarios.length;i++){
  const f=await makeFixture();scenarios[i](f)
  if(i<12)await f.sign()
  const result=await verify(f)
  assert.equal(result.ok,false,`scenario ${i}: ${JSON.stringify(result)}`)
  assert.equal(result.releaseReadyForIndependentAudit,false)
 }
})

test('empty trust stores and malicious input cannot become approvals',async()=>{
 const fixture=await makeFixture()
 assert.equal((await verify({...fixture,trustedPublicKeys:{}})).ok,false)
 assert.equal((await verify({...fixture,evidence:clone({...fixture.evidence,reports:[]})})).ok,false)
 assert.equal((await verify({...fixture,evidence:{...fixture.evidence,cuttingAuthorized:true}})).ok,false)
 assert.throws(()=>canonical({invalid:undefined}),/Unsupported/)
 assert.equal(canonical({b:2,a:1}),'{"a":1,"b":2}')
})

test('native generated full rule set with null-prototype panels and point offsets is digestible',async()=>{
 const snapshot={revision:9,template:{name:'CUT',panels:[{id:'front',name:'Front',
  polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d'],
   seam_allowances:{a:.01,b:.01,c:.01,d:.01},notches:{a:[{t:.5,depth:.004}]}}}],
  seams:[],fabrics:[]}}
 const created=createAccuMarkNativeRuleSet(snapshot)
 assert.equal(created.ok,true,created.reason)
 assert.equal(Object.getPrototypeOf(created.ruleSet.panels),null)
 assert.equal(Object.getPrototypeOf(created.ruleSet.panels.front.pointOffsetsMm),null)
 const ruleHash=await digest(created.ruleSet)
 assert.match(ruleHash,/^[0-9a-f]{64}$/)
 assert.equal(ruleHash,await digest(JSON.parse(canonical(created.ruleSet))))
 const f=await makeFixture()
 f.fullRuleSet=created.ruleSet
 f.evidence.fullRuleSetSha256=ruleHash
 for(const report of f.evidence.reports)report.fullRuleSetSha256=ruleHash
 await f.sign()
 const result=await verify(f)
 assert.equal(result.ok,true,JSON.stringify(result))
 assert.equal(result.factoryApproved,false)
})

test('canonical JSON rejects accessors, __proto__ keys, hidden properties, symbols and cycles',()=>{
 const accessor=Object.create(null)
 Object.defineProperty(accessor,'x',{enumerable:true,get(){throw Error('getter executed')}})
 assert.throws(()=>canonical(accessor),/Accessors/)
 const poison=Object.create(null)
 Object.defineProperty(poison,'__proto__',{value:{factoryApproved:true},enumerable:true})
 assert.throws(()=>canonical(poison),/Unsafe/)
 const hidden=Object.create(null)
 Object.defineProperty(hidden,'private',{value:1,enumerable:false})
 assert.throws(()=>canonical(hidden),/hidden properties/)
 const symbolic=Object.create(null)
 symbolic[Symbol('secret')]=1
 assert.throws(()=>canonical(symbolic),/Unsafe/)
 const cycle=Object.create(null)
 cycle.self=cycle
 assert.throws(()=>canonical(cycle),/cyclic/)
 const safe=Object.assign(Object.create(null),{b:2,a:1})
 assert.equal(canonical(safe),'{"a":1,"b":2}')
})
