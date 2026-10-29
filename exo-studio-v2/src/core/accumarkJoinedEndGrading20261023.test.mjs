import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkJoinedEndGradeRule,inspectAccuMarkJoinedEnds} from './accumarkJoinedEndGrading20261023.js'
import {evaluateIndustrialGradeRule} from './industrialGradeRules.js'

const sizes=['XS','S','M','L','XL','XXL']
const steps=[{dx:.12,dy:-.13},{dx:-.31,dy:.25},{dx:.48,dy:-.2},{dx:.7,dy:.35},{dx:-.21,dy:.4}]
const rule={mode:'small-large-incremental',sizes,baseSize:'M',steps}
function makeProject(points=[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}]){
  return {grading:{sizes,baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{id:'panel',name:'Panel',points}]}
}
const apply=(project,options={})=>applyAccuMarkJoinedEndGradeRule(project,{pieceId:'panel',pointIndex:0,rule,...options})

test('six sizes preserve unequal signed breaks, base coordinates, and source/undo',()=>{
  const source=makeProject(),snapshot=structuredClone(source)
  const {project,validation}=apply(source)
  assert.equal(validation.appliedPointIndices.length,1)
  assert.equal(validation.pass,true)
  assert.deepEqual(source,snapshot)
  assert.notEqual(project,source)
  assert.equal(project.pieces[0].points[0].x,0)
  for(const size of sizes)assert.deepEqual(evaluateIndustrialGradeRule(project.pieces[0].points[0].industrialGradeRule,size),evaluateIndustrialGradeRule(rule,size))
  assert.notEqual(project.pieces[0].points[0].industrialGradeRule,rule)
})

test('one cyclic vertex is not fabricated into two ends',()=>{
  const project=makeProject(),inspection=inspectAccuMarkJoinedEnds(project,{pieceId:'panel',pointIndex:0})
  assert.deepEqual(inspection.candidates,[])
  assert.equal(inspection.singleBoundaryNode,true)
  assert.equal(inspection.policies['always-both'],false)
  assert.throws(()=>apply(project,{policy:'always-both'}),/pairedPointIndex/)
  assert.throws(()=>apply(project,{policy:'both-if-same',pairedPointIndex:1}),/not a coincident/)
})

test('two independent coincident IDs grade atomically with always-both',()=>{
  const source=makeProject([{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20},{x:0,y:0}])
  const options={policy:'always-both',pairedPointIndex:4}
  assert.equal(inspectAccuMarkJoinedEnds(source,{pieceId:'panel',pointIndex:0}).policies['always-both'],true)
  const {project,validation}=apply(source,options)
  assert.deepEqual(validation.appliedPointIndices,[0,4])
  assert.deepEqual(project.pieces[0].points[4].industrialGradeRule,rule)
  assert.equal(source.pieces[0].points[4].industrialGradeRule,undefined)
})

test('both-if-same rejects different current grading and preserves input',()=>{
  const source=makeProject([{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20},{x:0,y:0}])
  source.pieces[0].points[4].industrialGradeRule={...rule,steps:steps.map(step=>({dx:step.dx+.02,dy:step.dy}))}
  const original=structuredClone(source)
  assert.equal(inspectAccuMarkJoinedEnds(source,{pieceId:'panel',pointIndex:0}).policies['both-if-same'],false)
  assert.throws(()=>apply(source,{policy:'both-if-same',pairedPointIndex:4}),/existing graded rules differ/)
  assert.deepEqual(source,original)
})

test('stale grade assignments and named links fail closed',()=>{
  const source=makeProject()
  source.pieces[0].points[0].namedGradeRuleRef={id:'outdated',version:1,units:'cm'}
  assert.throws(()=>apply(source),/named grade rule reference/)
  delete source.pieces[0].points[0].namedGradeRuleRef
  source.pieces[0].points[0].industrialGradeRule={...rule,sizes:['1','2','3','4','5','6'],baseSize:'3'}
  assert.throws(()=>apply(source),/stale existing/)
  delete source.pieces[0].points[0].industrialGradeRule
  assert.throws(()=>apply(source,{rule:{...rule,sizes:['1','2','3','4','5','6'],baseSize:'3'}}),/does not match garment/)
})

test('invalid grade break rejected before editing',()=>{
  const source=makeProject(),snapshot=structuredClone(source)
  assert.throws(()=>apply(source,{rule:{...rule,steps:[{dx:101,dy:0},...steps.slice(1)]}}),/break exceeds/)
  assert.deepEqual(source,snapshot)
})
