import test from 'node:test'
import assert from 'node:assert/strict'
import {strFromU8,unzipSync} from 'fflate'
import {createDefaultProject} from '../data/defaultProject.js'
import {buildFactoryPackageZip} from './factoryPackage.js'
import {createFactorySampleWorksheet,inspectFactorySampleEvidence,factorySampleSourceDigest} from './factorySampleApproval.js'

const synthetic=()=>({id:'factory-demo',name:'Factory acceptance protocol demo',revision:2,units:'cm',
 pieces:[{id:'front',name:'Front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:20},{x:0,y:20}]}],
 seams:[],grading:{sizes:['M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
 customMeasurements:[{id:'length',pieceId:'front',a:{x:0,y:0},b:{x:0,y:20},toleranceCm:.5}],
})

const completed=(project)=>{
 const evidence=createFactorySampleWorksheet(project)
 for(const [index,sample] of evidence.samples.entries()){
  sample.sampleId=`sample-${index+1}`
  sample.manufacturerName='external_factory_placeholder'
  sample.materialLot='lot-with-real-invoice'
  sample.cutterOperator='cutting operator name'
  sample.sewnBy='sewing operator name'
  sample.fitReviewedBy='fit reviewer name'
  sample.approvedBy='external named signatory'
  sample.approvedAt='2026-10-22T12:00:00Z'
  Object.assign(sample.receiverCad,{product:'CAD receiver',version:'1.0',importedSourceId:`EXO-${sample.size}`,importPass:true,lossReport:'external independent record'})
  Object.assign(sample.printCalibration,{media:'A4',measuredXmm:100.1,measuredYmm:99.8,photoOrEvidence:'measured ruler evidence'})
  Object.assign(sample.cutInspection,{pieceCountObserved:project.pieces.length,notchAlignment:true,grainlinesVerified:true,cutlineToleranceMm:.4,photosOrEvidence:'physical cut piece evidence'})
  Object.assign(sample.assembly,{sewingPass:true,notchesWalked:true,gradedSeamEaseReviewed:true,constructionNotes:'independently inspected'})
  Object.assign(sample.fit,{sampleApproved:true,photoOrEvidence:'physical sample fit record'})
  for(const pom of sample.poms){pom.approvedTargetCm=pom.nominalDesignCm;pom.actualSampleCm=pom.nominalDesignCm;pom.toleranceCm=.5;pom.evidence='measured sample report'}
 }
 return evidence
}

test('factory worksheets remain pending and contain a sample for every graded size without invented signatures',()=>{
 const project=createDefaultProject()
 const before=structuredClone(project)
 const sheet=createFactorySampleWorksheet(project)
 assert.deepEqual(sheet.sizeRun,project.grading.sizes)
 assert.equal(sheet.samples.length,6)
 assert.equal(sheet.sourcePatternSha256,factorySampleSourceDigest(project))
 assert(sheet.samples.every(sample=>sample.approvedBy===null&&sample.fit.sampleApproved===null&&sample.poms.every(row=>row.actualSampleCm===null)))
 const report=inspectFactorySampleEvidence(project,sheet)
 assert.equal(report.status,'blocked')
 assert.equal(report.factoryCertified,false)
 assert(report.blockers.some(row=>row.code==='INDUSTRIAL_PATTERN_BLOCKERS'))
 assert.deepEqual(project,before)
})

test('physical factory signoff is invalidated by same-revision pattern, grading, material and seam drift',()=>{
 const project=synthetic(),evidence=completed(project)
 assert.equal(inspectFactorySampleEvidence(project,evidence).blockerCount,0)
 for(const mutate of [
  p=>{p.pieces[0].points[1].x+=.2},
  p=>{p.grading.widthPerSizeCm+=.5},
  p=>{p.materials=[{id:'shell',shrinkagePercent:3}]},
  p=>{p.seams=[{id:'seam-forged',a:'front',b:'front'}]},
  p=>{p.customMeasurements[0].toleranceCm+=.1},
  p=>{p.markerSettings={nap:true}},
  p=>{p.fasteners=[{id:'zipper',lengthCm:23}]},
 ]){
  const tampered=structuredClone(project)
  mutate(tampered)
  assert.equal(tampered.revision,project.revision)
  const review=inspectFactorySampleEvidence(tampered,evidence)
  assert(review.blockers.some(b=>b.code==='FACTORY_SAMPLE_SOURCE_DIGEST_DRIFT'),
    JSON.stringify(review))
  assert.equal(review.factoryCertified,false)
 }
 const lost=structuredClone(evidence);delete lost.sourcePatternSha256
 assert(inspectFactorySampleEvidence(project,lost).blockers.some(b=>b.code==='FACTORY_SAMPLE_SOURCE_DIGEST_DRIFT'))
 assert.equal(factorySampleSourceDigest(structuredClone(project)),factorySampleSourceDigest(project))
})

test('sample evidence must be externally recorded, current revision, calibrated, exact piece count and approved POMs',()=>{
 const project=synthetic()
 const completedEvidence=completed(project)
 const report=inspectFactorySampleEvidence(project,completedEvidence)
 assert.equal(report.status,'evidence_complete_requires_human_factory_release')
 assert.equal(report.factoryCertified,false)
 assert.equal(report.readyForHumanApproval,true)
 const stale=structuredClone(completedEvidence);stale.sourceRevision--
 assert(inspectFactorySampleEvidence(project,stale).blockers.some(x=>x.code==='MISSING_OR_STALE_EVIDENCE'))
 const scaled=structuredClone(completedEvidence);scaled.samples[0].printCalibration.measuredYmm=96
 assert(inspectFactorySampleEvidence(project,scaled).blockers.some(x=>x.code==='PRINT_SCALE_NOT_PROVEN'))
 const incomplete=structuredClone(completedEvidence);incomplete.samples[0].cutInspection.pieceCountExpected=0;incomplete.samples[0].cutInspection.pieceCountObserved=0
 assert(inspectFactorySampleEvidence(project,incomplete).blockers.some(x=>x.code==='CUT_INSPECTION_MISSING'))
 const pom=structuredClone(completedEvidence);pom.samples[1].poms[0].actualSampleCm+=3
 assert(inspectFactorySampleEvidence(project,pom).blockers.some(x=>x.code==='SAMPLE_POM_OUT_OF_TOLERANCE'))
 const cad=structuredClone(completedEvidence);cad.samples[0].receiverCad.importPass=null
 assert(inspectFactorySampleEvidence(project,cad).blockers.some(x=>x.code==='CAD_IMPORT_NOT_PROVEN'))
})

test('factory ZIP contains unapproved physically verifiable release worksheets and cannot claim approved samples',()=>{
 const project=createDefaultProject()
 const zip=unzipSync(buildFactoryPackageZip(project))
 const sheet=JSON.parse(strFromU8(zip['factory-sample-worksheet.json']))
 const review=JSON.parse(strFromU8(zip['factory-sample-approval-gate.json']))
 assert.equal(sheet.status,'awaiting_external_sampling')
 assert.equal(review.status,'blocked')
 assert.equal(review.factoryCertified,false)
 assert.equal(sheet.samples[0].cutInspection.pieceCountExpected,project.pieces.length)
 assert(zip['industrial-pattern-seam-walk.csv'])
})
