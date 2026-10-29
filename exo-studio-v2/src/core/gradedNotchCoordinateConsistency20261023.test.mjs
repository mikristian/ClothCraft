import test from 'node:test'
import assert from 'node:assert/strict'
import {edgePointAt} from './project.js'
import {gradePiece} from './grading.js'
import {createTemplateProject} from '../data/templates.js'
import {inspectNotchCoordinatesOnPiece,inspectGradedNotchCoordinateConsistency} from './gradedNotchCoordinateConsistency20261023.js'

const grading={sizes:['M','L'],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1}
const piece=()=>({id:'front',points:[{id:'a',x:0,y:0},{id:'b',x:10,y:0},{id:'c',x:10,y:10},{id:'d',x:0,y:10}],
  notches:[{id:'n1',edgeIndex:0,t:.5,x:5,y:0}]})
const project=()=>({id:'notch-qa',pieces:[piece()],seams:[],grading})

test('unattached cached notch x/y is stale in generic nonbase grading and audit identifies size',()=>{
  const source=project(),before=structuredClone(source)
  const result=inspectGradedNotchCoordinateConsistency(source)
  assert.equal(result.status,'blocked')
  assert.equal(result.blockers,1)
  assert.deepEqual(result.issues.map(x=>[x.code,x.size]),[['STALE_NOTCH_CACHED_COORDINATE','L']])
  assert.equal(result.checks.find(x=>x.size==='M').pass,true)
  assert.equal(result.factoryCertified,false)
  assert.deepEqual(source,before,'diagnostic must never mutate authored garment')
})

test('canonical edge/arclength station passes all sizes when graded coordinates are reattached',()=>{
  const source=piece()
  source.points[0].industrialGradeRule={mode:'small-large-incremental',sizes:['M','L'],baseSize:'M',steps:[{dx:-.2,dy:.1}]}
  source.points[1].industrialGradeRule={mode:'small-large-incremental',sizes:['M','L'],baseSize:'M',steps:[{dx:.2,dy:.1}]}
  const graded=gradePiece(source,grading,'L')
  const expected=edgePointAt(graded,0,.5,64).point
  assert(Math.hypot(graded.notches[0].x-expected.x,graded.notches[0].y-expected.y)<1e-9)
  const report=inspectGradedNotchCoordinateConsistency({pieces:[source],grading})
  assert.equal(report.status,'pass',JSON.stringify(report.issues))
  assert.equal(report.checks.length,2)
})

test('curved notch is checked against physical arclength fraction rather than raw Bezier parameter',()=>{
  const curved=piece()
  curved.curves={0:{cx:1,cy:-5}}
  const expected=edgePointAt(curved,0,.35,64).point
  curved.notches[0]={id:'n1',edgeIndex:0,t:.35,...expected}
  assert.equal(inspectNotchCoordinatesOnPiece(curved).blockers,0)
  curved.notches[0].x+=.02
  assert.equal(inspectNotchCoordinatesOnPiece(curved).issues[0].code,'STALE_NOTCH_CACHED_COORDINATE')
})

test('optional absent coordinates are not a false failure, but missing count is explicit',()=>{
  const p=piece();delete p.notches[0].x;delete p.notches[0].y
  const r=inspectNotchCoordinatesOnPiece(p)
  assert.equal(r.blockers,0)
  assert.equal(r.missingCoordinates,1)
  assert.equal(r.factoryCertified,false)
  const all=inspectGradedNotchCoordinateConsistency({pieces:[p],grading})
  assert.equal(all.status,'not_configured')
  assert.equal(all.missingCoordinates,2)
  assert.equal(all.factoryCertified,false)
})

test('invalid fractions, duplicate IDs and incomplete coordinates fail closed',()=>{
  const p=piece();p.notches[0].t=1.1
  assert.equal(inspectNotchCoordinatesOnPiece(p).issues[0].code,'INVALID_NOTCH_STATION')
  p.notches[0].t=.5;p.notches.push({...p.notches[0]})
  assert(inspectNotchCoordinatesOnPiece(p).issues.some(i=>i.code==='INVALID_NOTCH_ID'))
  p.notches.pop();delete p.notches[0].y
  assert.equal(inspectNotchCoordinatesOnPiece(p).issues[0].code,'INVALID_NOTCH_CACHED_COORDINATE')
  p.notches={invalid:true}
  assert.equal(inspectNotchCoordinatesOnPiece(p).issues[0].code,'INVALID_NOTCH_COLLECTION')
  assert.throws(()=>inspectNotchCoordinatesOnPiece(p,{toleranceCm:NaN}),/tolerance/)
  assert.throws(()=>inspectGradedNotchCoordinateConsistency(project(),{sizes:['M','M']}),/unique/)
})

test('real template notches with only edge+t report not configured, never a false coordinate pass',()=>{
  for(const template of ['tee','jeans-501','hoodie']) {
    const p=createTemplateProject(template)
    const result=inspectGradedNotchCoordinateConsistency(p)
    assert.equal(result.status,'not_configured',template)
    assert.equal(result.checks.length,0)
    assert(result.missingCoordinates>0,template)
    assert.equal(result.factoryCertified,false)
  }
})
