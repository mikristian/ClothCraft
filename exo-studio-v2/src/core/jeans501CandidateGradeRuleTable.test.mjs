import test from 'node:test'
import assert from 'node:assert/strict'
import {create501JeansTemplate} from '../data/jeans501.js'
import {gradeProject} from './grading.js'
import {buildFactoryPackageZip} from './factoryPackage.js'
import {evaluateIndustrialGradeRule} from './industrialGradeRules.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from './gradedSeamJunctionQA.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'
import {createJeans501ProvisionalIndustrialRuleTable} from './jeans501CandidateGradeRuleTable.js'

test('coordinated yoke/waist grade candidate becomes persistent explicit six-size point rules with exact grading QA',()=>{
 const source=create501JeansTemplate(),original=structuredClone(source)
 const result=createJeans501ProvisionalIndustrialRuleTable(source)
 assert.deepEqual(source,original)
 assert.equal(result.sourcePreserved,true)
 assert.equal(result.modifiedPoints.length,24)
 assert.deepEqual(result.numerical,{sewingBlockers:0,cutlineBlockers:0,junctionBlockers:0})
 assert.equal(result.factoryCuttingAuthorized,false)
 assert.equal(result.project.gradeProvenance.status,'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED')
 assert.equal(result.project.patternSource.referenceOnly,true)
 for(const piece of result.project.pieces){
  const industrial=piece.points.map(point=>point.industrialGradeRule).filter(Boolean)
  if(result.project.gradeProvenance.changedPieces.includes(piece.id)){
   assert.equal(industrial.length,4,`${piece.id} must carry four explicit source-linked rules`)
   for(const [index,rule] of industrial.entries()){
    assert.equal(rule.steps.length,5)
    assert.deepEqual(evaluateIndustrialGradeRule(rule,'W32'),{dx:0,dy:0})
    assert.deepEqual(rule.sizes,result.sizes)
    assert.equal(rule.baseSize,'W32')
   }
  }else assert.equal(industrial.length,0,`${piece.id} must retain original authored grading`)
 }
 assert.deepEqual(gradeProject(result.project,'W32').pieces.map(piece=>piece.points.map(({x,y})=>[x,y])),
   gradeProject(source,'W32').pieces.map(piece=>piece.points.map(({x,y})=>[x,y])))
 assert.equal(inspectGradedSeamJunctions(result.project,{junctions:JEANS501_YOKE_JUNCTIONS}).blockers,0)
 const status=inspectManufacturingReleaseReadiness(result.project)
 assert.equal(status.factoryCertified,false)
 assert.equal(status.factoryCuttingAuthorized,false)
 assert(status.blockers.some(row=>row.code==='UNAPPROVED_GRADE_TABLE'))
 assert(status.blockers.some(row=>row.code==='REFERENCE_ONLY_PATTERN'))
 assert.throws(()=>buildFactoryPackageZip(result.project),/refused/i)
})

test('changing an authored sewn-edge reference refuses engineering-grade derivation without mutation',()=>{
 const source=create501JeansTemplate()
 source.seams.find(seam=>seam.id==='left-yoke-join').b.edgeIndex=1
 const before=structuredClone(source)
 assert.throws(()=>createJeans501ProvisionalIndustrialRuleTable(source),/Missing or altered sewing references/)
 assert.deepEqual(source,before)
})
