import test from 'node:test'
import assert from 'node:assert/strict'
import {strFromU8,unzipSync} from 'fflate'
import {GARMENT_TEMPLATES,createTemplateProject} from '../data/templates.js'
import {auditGradedSizeRunGeometry} from './gradedSizeRunGeometryAudit.js'
import {buildFactoryPackageFiles,buildFactoryPackageZip} from './factoryPackage.js'
import {recoverFactorySourceFromZip} from './factorySourceRecovery.js'

test('catalog acceptance verifies all graded geometry without altering any authored garment',()=>{
 let sizes=0,pieces=0
 assert.equal(GARMENT_TEMPLATES.length,10)
 for(const definition of GARMENT_TEMPLATES){
  const project=createTemplateProject(definition.id)
  const snapshot=JSON.stringify(project)
  const report=auditGradedSizeRunGeometry(project)
  assert(report.pass,`${definition.id}: ${JSON.stringify(report.issues)}`)
  sizes+=report.inspectedSizes
  pieces+=report.inspectedPieces
  assert.equal(JSON.stringify(project),snapshot,`${definition.id}: geometry audit mutated author source`)
 }
 assert.equal(sizes,60)
 assert.equal(pieces,414)
})

test('Factory package and ZIP source restoration retain explicit read-only graded topology evidence',()=>{
 for(const templateId of ['tee','jeans-501']){
  const authored=createTemplateProject(templateId)
  const before=JSON.stringify(authored)
  const files=buildFactoryPackageFiles(authored)
  const report=JSON.parse(strFromU8(files['graded-geometry-qa.json']))
  assert.equal(report.pass,true)
  assert.equal(report.issues.length,0)
  assert.equal(report.factoryCertified,false)
  assert.equal(report.inspectedSizes,authored.grading.sizes.length)
  assert.equal(report.inspectedPieces,authored.grading.sizes.length*authored.pieces.length)
  const csv=strFromU8(files['graded-geometry-issues.csv'])
  assert.match(csv,/"code","size","piece_id","edge_index","base_area_cm2","graded_area_cm2"/)
  assert.equal(csv.trim().split('\n').length,1,'passing development grade has no hidden issue rows')
  assert.equal(recoverFactorySourceFromZip(buildFactoryPackageZip(authored)).verifiedFiles,Object.keys(files).length)
  const zipped=unzipSync(buildFactoryPackageZip(authored))
  assert.deepEqual(JSON.parse(strFromU8(zipped['graded-geometry-qa.json'])),report)
  assert.equal(JSON.stringify(authored),before,'package generation must preserve original pattern')
 }
})

test('strict grading topology still flags a deliberate narrow-trim inversion; thresholds unchanged',()=>{
 const rectangle={id:'unspecified-narrow-strip',points:[{x:0,y:9.4},{x:1.4,y:9.4},{x:1.4,y:0},{x:0,y:0}]}
 const garment={pieces:[rectangle],grading:{sizes:['W28','W30','W32','W34'],baseSize:'W32',widthPerSizeCm:2.54,lengthPerSizeCm:0}}
 const initial=JSON.stringify(garment)
 const result=auditGradedSizeRunGeometry(garment)
 assert.equal(result.pass,false)
 assert(result.issues.some(issue=>issue.code==='GRADED_WINDING_FLIP'))
 assert(result.issues.some(issue=>issue.code==='GRADED_EDGE_COLLAPSE'))
 assert.equal(JSON.stringify(garment),initial)
})
