import test from 'node:test'
import assert from 'node:assert/strict'
import {createRecipientCadExchangeProtocol,inspectRecipientCadExchangeEvidence} from './recipientCadExchangeProtocol.js'
import {createFactorySampleWorksheet,inspectFactorySampleEvidence} from './factorySampleApproval.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'
import {createTeeTemplate} from '../data/templates.js'

const receiverRecord=protocol=>({projectId:protocol.projectId,sourceRevision:protocol.sourceRevision,
 sizes:protocol.sizes.map(row=>({size:row.size,sourceDXFSha256:row.outboundGenericDXF.sha256,
 destinationEvidence:{vendor:'TEST ONLY (unverified)',product:'TEST RECEIVER',version:'0.0-test',
 operator:'TEST PERSON',importedAt:'2026-10-23T17:00:00Z',actualDXFOrNativeFile:'unverified.native',
 lossReport:'unverified-loss.json',returnedGradingRuleFile:'unverified.rul',
 sourceIdsMatched:true,sizeIdentityPreserved:true,allNotchesChecked:true,
 allInternalMarksChecked:true,grainDirectionChecked:true,
 actualFactoryCADImportPass:true,actualFactoryCADExportPass:true,
 gradeRulePointMappingVerified:true,measuredPhysicalDimensionParity:true}}))})

const codes=review=>review.blockers.map(row=>row.code)

test('reported receiver observations never authorize manufacturing even if all required booleans are true',()=>{
 const project=createTeeTemplate(),source=structuredClone(project)
 const protocol=createRecipientCadExchangeProtocol(project),returned=receiverRecord(protocol)
 const report=inspectRecipientCadExchangeEvidence(protocol,returned)
 assert.equal(report.blockerCount,0)
 assert.equal(report.factoryCertified,false)
 assert.equal(report.factoryCuttingAuthorized,false)
 assert.equal(report.status,'EXTERNAL_RECEIVER_EVIDENCE_RECORDED_REQUIRES_INDEPENDENT_AUDIT')
 assert.deepEqual(project,source)
})

test('receiver omits one size, swaps size identity or claims stale project/revision/hash: fail closed',()=>{
 const project=createTeeTemplate(),protocol=createRecipientCadExchangeProtocol(project)
 const make=()=>receiverRecord(protocol)
 const missing=make();missing.sizes.pop()
 assert(codes(inspectRecipientCadExchangeEvidence(protocol,missing)).includes('STALE_OR_MISSING_RECIPIENT_RESULTS'))
 const reordered=make();[reordered.sizes[0],reordered.sizes[1]]=[reordered.sizes[1],reordered.sizes[0]]
 assert(codes(inspectRecipientCadExchangeEvidence(protocol,reordered)).includes('RECEIVER_SOURCE_FILE_MISMATCH'))
 const stale=make();stale.sourceRevision=String(protocol.sourceRevision)+'-stale'
 assert(codes(inspectRecipientCadExchangeEvidence(protocol,stale)).includes('STALE_OR_MISSING_RECIPIENT_RESULTS'))
 const wrongFile=make();wrongFile.sizes[0].sourceDXFSha256='0'.repeat(64)
 assert(codes(inspectRecipientCadExchangeEvidence(protocol,wrongFile)).includes('RECEIVER_SOURCE_FILE_MISMATCH'))
})

test('missing/outdated vendor identification and signed-return attachments are not treated as receiver proof',()=>{
 const protocol=createRecipientCadExchangeProtocol(createTeeTemplate())
 for(const missing of ['vendor','product','version','operator','importedAt','actualDXFOrNativeFile','lossReport','returnedGradingRuleFile']){
  const record=receiverRecord(protocol)
  record.sizes[0].destinationEvidence[missing]=null
  assert(codes(inspectRecipientCadExchangeEvidence(protocol,record)).includes('REAL_CAD_RECEIVER_EVIDENCE_MISSING'),missing)
 }
 const impossible=receiverRecord(protocol)
 impossible.sizes[0].destinationEvidence.importedAt='not-a-date'
 assert(codes(inspectRecipientCadExchangeEvidence(protocol,impossible)).includes('REAL_CAD_RECEIVER_EVIDENCE_MISSING'))
 // The existing inspector only validates date *parsing*, not recency/chronology.
 const old=receiverRecord(protocol)
 old.sizes[0].destinationEvidence.importedAt='1990-01-01T00:00:00Z'
 assert.equal(inspectRecipientCadExchangeEvidence(protocol,old).factoryCertified,false)
})

test('missing per-size feature-loss disclosure is rejected rather than silently accepted',()=>{
 const protocol=createRecipientCadExchangeProtocol(createTeeTemplate())
 for(const field of ['sourceIdsMatched','sizeIdentityPreserved','allNotchesChecked',
  'allInternalMarksChecked','grainDirectionChecked','actualFactoryCADImportPass',
  'actualFactoryCADExportPass','gradeRulePointMappingVerified','measuredPhysicalDimensionParity']){
  const returned=receiverRecord(protocol)
  returned.sizes[0].destinationEvidence[field]=false
  assert(codes(inspectRecipientCadExchangeEvidence(protocol,returned)).includes(`UNVERIFIED_${field.toUpperCase()}`),field)
 }
})

test('missing physical samples and unsigned factory worksheet cannot pass or self-certify',()=>{
 const project=createTeeTemplate(),sheet=createFactorySampleWorksheet(project)
 const original=structuredClone(sheet)
 const empty=inspectFactorySampleEvidence(project,sheet)
 assert.equal(empty.status,'blocked')
 assert.equal(empty.factoryCertified,false)
 assert(empty.blockerCount>0)
 const lost=structuredClone(sheet)
 lost.samples.pop()
 assert(codes(inspectFactorySampleEvidence(project,lost)).includes('MISSING_OR_STALE_EVIDENCE'))
 const stale=structuredClone(sheet)
 stale.sourceRevision='stale'
 assert(codes(inspectFactorySampleEvidence(project,stale)).includes('MISSING_OR_STALE_EVIDENCE'))
 const unsigned=structuredClone(sheet)
 unsigned.samples[0].sampleId='test-physical-1'
 unsigned.samples[0].approvedBy=null
 unsigned.samples[0].approvedAt=null
 const review=inspectFactorySampleEvidence(project,unsigned)
 assert(codes(review).includes('MISSING_APPROVAL_PROVENANCE'))
 assert(codes(review).includes('INVALID_APPROVAL_TIME'))
 assert(codes(review).includes('FIT_SAMPLE_NOT_PROVEN'))
 assert.deepEqual(sheet,original)
})

test('release status remains false even if caller injects green software and sample-completeness summaries',()=>{
 const project=createTeeTemplate(),green={blockers:0}
 const release=inspectManufacturingReleaseReadiness(project,{checks:{production:green,
  industrial:green,cutlines:green,gradedTopology:{issues:[]},notches:green,
  junctions:{status:'not_configured'},sample:{blockerCount:0}}})
 assert.equal(release.factoryCertified,false)
 assert.equal(release.factoryCuttingAuthorized,false)
 assert.equal(release.bulkProductionAuthorized,false)
 assert.notEqual(release.status,'FACTORY_ACCEPTED')
})
