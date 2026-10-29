import test from 'node:test'
import assert from 'node:assert/strict'
import {create501JeansTemplate} from '../data/jeans501.js'
import {createTeeTemplate} from '../data/templates.js'
import {studyGradedJunctionCorrections} from './gradedJunctionConstraintStudy.js'

test('read-only 501 yoke station displacement study identifies true residuals without modifying original or claiming approval',()=>{
 const project=create501JeansTemplate(),before=structuredClone(project)
 const report=studyGradedJunctionCorrections(project)
 assert.equal(report.status,'blocked')
 assert.equal(report.audit.blockers,10)
 assert.equal(report.proposals.length,12)
 assert.equal(report.factoryCertified,false)
 assert.equal(report.proposalOnly,true)
 for(const p of report.proposals){
  assert.equal(p.applied,false)
  assert.equal(p.requiresPatternmakerReview,true)
  assert.equal(p.displacements.length,2)
  const expected=Math.abs(['W28','W30','W32','W34','W36','W38'].indexOf(p.size)-2)*0.5715
  assert.ok(Math.abs(p.maximumGapCm-expected)<1e-8)
 }
 assert.deepEqual(project,before)
})

test('no authored tee junction yields no synthetic fixes or factory certification',()=>{
 const result=studyGradedJunctionCorrections(createTeeTemplate())
 assert.equal(result.status,'not_configured')
 assert.deepEqual(result.proposals,[])
 assert.equal(result.factoryCertified,false)
})

test('unverified base stations block displacement proposals',()=>{
 const p=create501JeansTemplate()
 p.pieces.find(piece=>piece.id==='left-back-yoke').points[2].x+=1
 const result=studyGradedJunctionCorrections(p)
 assert.equal(result.status,'blocked')
 assert.equal(result.proposals.length,0)
 assert.match(result.note,/incomplete/i)
})
