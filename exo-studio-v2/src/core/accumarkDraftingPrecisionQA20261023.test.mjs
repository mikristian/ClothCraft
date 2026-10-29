import test from 'node:test'
import assert from 'node:assert/strict'
import {edgeLength} from './project.js'
import {inspectAccuMarkDraftingPrecision20261023 as inspect} from './accumarkDraftingPrecisionQA20261023.js'

const rectangle=(id='front')=>({id,points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]})
const project=pieces=>({pieces})

test('true quadratic perimeter, signed curved area, stable IDs and source immutable',()=>{
  const p=project([rectangle('front'),rectangle('back')])
  p.pieces[0].curves={0:{cx:5,cy:-8}}
  const before=structuredClone(p)
  const audit=inspect(p)
  assert.equal(audit.ok,true)
  assert.equal(audit.manufacturingApproved,false)
  assert.equal(audit.summary.passingPieces,2)
  assert.deepEqual(audit.blocks.map(b=>b.pieceId),['front','back'])
  const a=audit.blocks[0]
  assert.equal(a.orientation,'CCW')
  assert.ok(a.perimeterCm>40)
  assert.ok(Math.abs(a.perimeterCm-(edgeLength(p.pieces[0],0)+30))<1e-8)
  assert.ok(a.signedAreaCm2>100)
  assert.ok(a.sampleCount<=256)
  assert.deepEqual(p,before)
})

test('self-crossing bowtie, zero edge and degenerate area block',()=>{
  const crossed=rectangle()
  crossed.points=[{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}]
  const crossing=inspect(project([crossed]))
  assert.equal(crossing.ok,false)
  assert.ok(crossing.issues.some(i=>i.code==='SELF_CROSSING'))
  const collapsed=rectangle()
  collapsed.points[1]={...collapsed.points[0]}
  assert.equal(inspect(project([collapsed])).ok,false)
  assert.ok(inspect(project([collapsed])).issues.some(i=>i.code==='ZERO_LENGTH_EDGE'))
})

test('fails closed on missing invalid and nonfinite quadratic controls',()=>{
  const variants=[
    {0:null},{0:{cx:5}},{0:{cx:5,cy:Infinity}},
    {999:{cx:5,cy:2}},{0:{cx:5,cy:2,weight:1}},
  ]
  for(const curves of variants){
    const piece=rectangle();piece.curves=curves
    const result=inspect(project([piece]))
    assert.equal(result.ok,false)
    assert.ok(result.issues.some(i=>i.code==='INVALID_QUADRATIC_CONTROL'))
  }
  const invalid=rectangle();invalid.points[0].x=NaN
  assert.ok(inspect(project([invalid])).issues.some(i=>i.code==='INVALID_POINTS'))
})

test('refuses unsafe complexity, duplicate and missing IDs and bad sampling',()=>{
  const large=rectangle()
  large.points=Array.from({length:257},(_,i)=>({x:10*Math.cos(i*2*Math.PI/257),y:10*Math.sin(i*2*Math.PI/257)}))
  assert.ok(inspect(project([large])).issues.some(i=>i.code==='INVALID_POINTS'))
  const many=rectangle()
  many.curves=Object.fromEntries([0,1,2,3].map(i=>[i,{cx:i+2,cy:2}]))
  assert.ok(inspect(project([many]),{segmentsPerCurve:80}).issues.some(i=>i.code==='TOO_COMPLEX'))
  assert.ok(inspect(project([rectangle('x'),rectangle('x')])).issues.some(i=>i.code==='DUPLICATE_OR_MISSING_PIECE_ID'))
  assert.ok(inspect(project([rectangle('')])).issues.some(i=>i.code==='DUPLICATE_OR_MISSING_PIECE_ID'))
  assert.ok(inspect(project([rectangle()]),{segmentsPerCurve:0}).issues.some(i=>i.code==='INVALID_SAMPLING'))
})
