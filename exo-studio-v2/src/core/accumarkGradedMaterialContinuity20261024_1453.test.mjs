import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectAccuMarkGradedMaterialContinuity20261024 as audit} from './accumarkGradedMaterialContinuity20261024_1453.js'
import {createTeeTemplate} from '../data/templates.js'

const rectangle=(id,length=10)=>({id,points:[{id:`${id}-0`,x:0,y:0},{id:`${id}-1`,x:length,y:0},
  {id:`${id}-2`,x:length,y:10},{id:`${id}-3`,x:0,y:10}]})
const fixture=()=>({revision:7,pieces:[rectangle('a'),rectangle('b')],
  seams:[{id:'join',a:{pieceId:'a',edgeIndex:0},b:{pieceId:'b',edgeIndex:0},reverseB:true}],
  grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0}})

test('stable multi-size physical seam lengths and caller revision are preserved',()=>{
  const source=fixture(),before=structuredClone(source),result=audit(source)
  assert.equal(result.status,'measurement_only',JSON.stringify(result.issues))
  assert.equal(result.seamRows.length,3)
  assert(result.seamRows.every(row=>row.differenceCm<1e-8))
  assert.equal(result.manufacturingApproved,false)
  assert.deepEqual(source,before)
})

test('rejects percent-only seam loophole where absolute length exceeds physical budget',()=>{
  const source=fixture()
  source.pieces[0]=rectangle('a',100)
  source.pieces[1]=rectangle('b',100.8)
  const result=audit(source)
  assert.equal(result.status,'blocked')
  assert(result.issues.some(row=>row.code==='PHYSICAL_SEAM_LENGTH_MISMATCH'))
  assert(result.seamRows.some(row=>row.differenceCm>.79))
})

test('grade break causing mismatch in a single size is identified',()=>{
  const source=fixture()
  source.pieces[0].points[1].gradeRule={enabled:true,dxPerSize:2,dyPerSize:0}
  const result=audit(source)
  assert.equal(result.status,'blocked')
  assert(result.seamRows.find(row=>row.size==='M').pass)
  assert(result.seamRows.find(row=>row.size==='L').differenceCm>1)
})

test('paired curves are evaluated by physical Bezier arclength',()=>{
  const source=fixture()
  for(const piece of source.pieces)piece.curves={0:{cx:5,cy:-6}}
  const result=audit(source)
  assert.equal(result.status,'blocked',JSON.stringify(result.issues))
  assert.equal(result.curveRows.length,6)
  assert(result.seamRows.every(row=>row.lengthAcm>10))
})

test('unpaired graded curve control changes length and fails seam tolerance',()=>{
  const source=fixture()
  source.pieces[0].curves={0:{cx:5,cy:-6}}
  assert(audit(source).issues.some(row=>row.code==='PHYSICAL_SEAM_LENGTH_MISMATCH'))
})

test('notch source ID and curve-relative attachment survive all graded sizes',()=>{
  const source=fixture()
  for(const piece of source.pieces){piece.curves={0:{cx:5,cy:-3}};piece.notches=[{id:`${piece.id}-N`,edgeIndex:0,t:.3}]}
  const result=audit(source)
  assert.equal(result.status,'blocked',JSON.stringify(result.issues))
  assert.equal(result.notchRows.length,6)
  assert(result.notchRows.every(row=>row.stationCm>0))
})

test('stale notch cached x and y are refused',()=>{
  const source=fixture()
  source.pieces[0].notches=[{id:'N',edgeIndex:0,t:.5,x:999,y:999}]
  assert(audit(source).issues.some(row=>row.code==='GRADED_NOTCH_POSITION_DRIFT'))
})

test('invalid edge attachment and duplicate notch IDs block a complete run',()=>{
  const source=fixture()
  source.pieces[0].notches=[{id:'N',edgeIndex:12,t:.5}]
  assert(audit(source).issues.some(row=>row.code==='INVALID_BASE_NOTCH'))
  source.pieces[0].notches=[{id:'N',edgeIndex:0,t:.5},{id:'N',edgeIndex:1,t:.5}]
  assert(audit(source).issues.some(row=>row.code==='INVALID_SOURCE_PATTERN'))
})

test('invalid grading dimensions or duplicated seam identities fail before comparisons',()=>{
  const source=fixture()
  source.seams.push(structuredClone(source.seams[0]))
  assert(audit(source).issues.some(row=>row.code==='INVALID_SIZE_RUN_OR_SOURCE_IDENTITIES'))
  assert(audit(fixture(),{seamToleranceCm:Infinity}).issues.some(row=>row.code==='INVALID_PHYSICAL_TOLERANCE'))
})

test('getters, hidden attachments and inherited serializers cannot alter source during audit',()=>{
  const source=fixture()
  Object.defineProperty(source,'secret',{value:'hidden',enumerable:false})
  assert(audit(source).issues.some(row=>row.code==='SOURCE_ACCESSOR_OR_HIDDEN_ATTACHMENT'))
  const another=fixture()
  Object.defineProperty(another.pieces[0].points[0],'x',{get(){throw Error('Executed getter')}})
  assert(audit(another).issues.some(row=>row.code==='SOURCE_ACCESSOR_OR_HIDDEN_ATTACHMENT'))
  const previous=Object.getOwnPropertyDescriptor(Object.prototype,'toJSON')
  try{
    Object.defineProperty(Object.prototype,'toJSON',{value(){throw Error('Inherited serializer invoked')},configurable:true})
    assert.equal(audit(fixture()).status,'measurement_only')
  }finally{
    if(previous)Object.defineProperty(Object.prototype,'toJSON',previous)
    else delete Object.prototype.toJSON
  }
})

test('real Foundation Tee six sizes produce complete graded seam rows',()=>{
  const source=createTeeTemplate(),report=audit(source)
  assert.equal(report.status,'blocked')
  assert(report.issues.some(i=>i.code==='UNVERIFIED_SEAM_DIRECTION'||i.code==='UNVERIFIED_PAIRED_NOTCH_STATIONS'))
  assert.equal(report.factoryCertified,false)
  assert(report.seamRows.every(row=>Number.isFinite(row.lengthAcm)&&Number.isFinite(row.lengthBcm)))
})

test('empty seam relations never emit pass',()=>{
 const source=fixture();source.seams=[]
 const out=audit(source)
 assert.equal(out.status,'blocked')
 assert(out.issues.some(i=>i.code==='NO_AUTHORED_SEAMS'))
})

test('ambiguous source vertex identities reject',()=>{
 const source=fixture();source.pieces[0].points[0].id='dup';source.pieces[0].points[1].id='dup'
 assert(audit(source).issues.some(i=>i.code==='AMBIGUOUS_POINT_ID'))
})

test('paired notches with unequal physical station are not certified',()=>{
 const source=fixture();source.pieces[0].notches=[{id:'a',edgeIndex:0,t:.1,matchGroupId:'grp',matchedSeamId:'join'}]
 source.pieces[1].notches=[{id:'b',edgeIndex:0,t:.8,matchGroupId:'grp',matchedSeamId:'join'}]
 assert(audit(source).issues.some(i=>i.code==='UNVERIFIED_PAIRED_NOTCH_STATIONS'))
})

test('sewing orientation must be explicit and cannot be inferred from equal lengths',()=>{
 const source=fixture();delete source.seams[0].reverseB
 assert(audit(source).issues.some(i=>i.code==='UNVERIFIED_SEAM_DIRECTION'))
 source.seams[0].reverseB=true
 assert.equal(audit(source).status,'measurement_only')
})

test('partial sewn intervals of equal length cannot pass without correspondence',()=>{
 const source=fixture();source.seams[0].reverseB=true
 source.seams[0].a.startT=.25;source.seams[0].a.endT=.75
 source.seams[0].b.startT=.1;source.seams[0].b.endT=.6
 assert(audit(source).issues.some(i=>i.code==='UNSUPPORTED_PARTIAL_SEAM_CORRESPONDENCE'))
})

test('same-piece sewing relationships require dedicated seam topology validation',()=>{
 const source=fixture();source.seams[0].b.pieceId='a';source.seams[0].reverseB=true
 assert(audit(source).issues.some(i=>i.code==='UNSUPPORTED_SELF_SEAM'))
})

test('ease requests fail closed even when lengths are nominally equal',()=>{
 const source=fixture();source.seams[0].reverseB=true;source.seams[0].allowEase=true
 assert(audit(source).issues.some(i=>i.code==='UNSUPPORTED_SEAM_SEMANTICS'))
})

test('external callers cannot relax seam length acceptance thresholds',()=>{
 const source=fixture();source.seams[0].reverseB=true
 source.pieces[1].points[1].x=13
 const out=audit(source,{seamToleranceCm:10})
 assert(out.issues.some(i=>i.code==='INVALID_PHYSICAL_TOLERANCE'))
})

test('curves require independent topology checks before obtaining any measurement-only status',()=>{
 const source=fixture();source.seams[0].reverseB=true
 source.pieces[0].curves={0:{cx:30,cy:30}}
 assert(audit(source).issues.some(i=>i.code==='CURVE_TOPOLOGY_NOT_VERIFIED'||i.code==='PHYSICAL_SEAM_LENGTH_MISMATCH'))
})
