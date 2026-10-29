import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {create501JeansTemplate} from '../data/jeans501.js'
import {createRecipientCadExchangeProtocol,inspectRecipientCadExchangeEvidence} from './recipientCadExchangeProtocol.js'
import {buildFactoryPackageZip} from './factoryPackage.js'
import {unzipSync,strFromU8} from 'fflate'
import {recoverFactorySourceFromZip} from './factorySourceRecovery.js'

test('six-size tee/jeans CAD receiving manifests preserve source point identities and honest generic DXF status',()=>{
  for(const project of [createTeeTemplate(),create501JeansTemplate()]){
    const source=structuredClone(project)
    const protocol=createRecipientCadExchangeProtocol(project)
    assert.equal(protocol.schema,'exo-recipient-cad-exchange-protocol.v1')
    assert.equal(protocol.currentExportASTMOrAAMACertified,false)
    assert.equal(protocol.actualCADRoundTripPerformed,false)
    assert.equal(protocol.signedFactoryApproval,false)
    assert.equal(protocol.sizes.length,6)
    for(const row of protocol.sizes){
      assert.equal(row.outboundGenericDXF.headerVersion,'AC1009')
      assert.match(row.outboundGenericDXF.sha256,/^[0-9a-f]{64}$/)
      assert.equal(row.pieceCount,project.pieces.length)
      assert.deepEqual(row.expectedPieces.map(piece=>piece.sourceId),project.pieces.map(piece=>piece.id))
      assert(row.expectedPieces.every(piece=>piece.pointCoordinatesCm.every(coords=>coords.length===2&&coords.every(Number.isFinite))))
      assert.equal(row.destinationEvidence.actualFactoryCADImportPass,null)
      assert.equal(row.destinationEvidence.returnedGradingRuleFile,null)
    }
    assert.equal(inspectRecipientCadExchangeEvidence(protocol,null).blockerCount,1)
    assert.deepEqual(project,source)
  }
})

test('explicit reference-only patterns cannot claim native CAD recipient acceptance',()=>{
 const project=create501JeansTemplate()
 project.patternSource={referenceOnly:true}
 assert.throws(()=>createRecipientCadExchangeProtocol(project),/locked references are refused/)
})

test('partial, stale or mismatched CAD reports fail closed and never authorize production',()=>{
 const project=createTeeTemplate(),protocol=createRecipientCadExchangeProtocol(project)
 const empty={projectId:protocol.projectId,sourceRevision:protocol.sourceRevision,sizes:protocol.sizes.map(row=>({
   size:row.size,sourceDXFSha256:row.outboundGenericDXF.sha256,destinationEvidence:{},
 }))}
 const outcome=inspectRecipientCadExchangeEvidence(protocol,empty)
 assert.equal(outcome.status,'BLOCKED_OR_UNVERIFIED')
 assert(outcome.blockerCount>40)
 assert.equal(outcome.factoryCertified,false)
 assert.equal(outcome.factoryCuttingAuthorized,false)
 const tampered=structuredClone(empty)
 tampered.sizes[0].sourceDXFSha256='0'.repeat(64)
 assert(inspectRecipientCadExchangeEvidence(protocol,tampered).blockers.some(row=>row.code==='RECEIVER_SOURCE_FILE_MISMATCH'))
})

test('even complete self-reported receiver observations do not become vendor certification',()=>{
 const protocol=createRecipientCadExchangeProtocol(createTeeTemplate())
 const complete={projectId:protocol.projectId,sourceRevision:protocol.sourceRevision,sizes:protocol.sizes.map(row=>({
   size:row.size,sourceDXFSha256:row.outboundGenericDXF.sha256,
   destinationEvidence:{vendor:'reported vendor',product:'reported product',version:'reported version',
     operator:'reported engineer',importedAt:'2026-10-23T13:00:00Z',
     actualDXFOrNativeFile:'claimed-native-file',lossReport:'claimed-loss-report',returnedGradingRuleFile:'claimed-rule-file',
     sourceIdsMatched:true,sizeIdentityPreserved:true,allNotchesChecked:true,allInternalMarksChecked:true,
     grainDirectionChecked:true,actualFactoryCADImportPass:true,actualFactoryCADExportPass:true,
     gradeRulePointMappingVerified:true,measuredPhysicalDimensionParity:true},
 }))}
 const response=inspectRecipientCadExchangeEvidence(protocol,complete)
 assert.equal(response.blockerCount,0)
 assert.equal(response.status,'EXTERNAL_RECEIVER_EVIDENCE_RECORDED_REQUIRES_INDEPENDENT_AUDIT')
 assert.equal(response.factoryCertified,false)
 assert.equal(response.factoryCuttingAuthorized,false)
})

test('factory ZIP includes source-pinned six-size receiving-CAD protocol with unapproved status',()=>{
 const project=create501JeansTemplate()
 const zip=buildFactoryPackageZip(project)
 const restored=recoverFactorySourceFromZip(zip)
 assert.equal(restored.verifiedSizes.length,6)
 const files=unzipSync(zip)
 const protocol=JSON.parse(strFromU8(files['recipient-cad-acceptance-plan.json']))
 const readiness=JSON.parse(strFromU8(files['manufacturing-release-readiness.json']))
 assert.equal(protocol.sizes.length,6)
 assert.deepEqual(protocol.sizes.map(row=>row.size),project.grading.sizes)
 assert.equal(protocol.currentExportASTMOrAAMACertified,false)
 assert.equal(protocol.actualCADRoundTripPerformed,false)
 assert.equal(protocol.bulkCuttingAuthorized,false)
 assert.equal(readiness.factoryCuttingAuthorized,false)
 assert.equal(readiness.digitalCounts.industrialPatternBlockers,30)
 assert.equal(readiness.digitalCounts.sharedJunctionBlockers,10)
 assert.equal(protocol.sizes[0].expectedPieces.length,24)
})
