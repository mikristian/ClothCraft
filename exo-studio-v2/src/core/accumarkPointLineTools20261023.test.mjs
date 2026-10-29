import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkPointLineOperation as apply,measureAccuMarkBoundaryEdge as measure} from './accumarkPointLineTools20261023.js'

const fixture=()=>({grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{id:'front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]}]})

test('set and delta move change precise authored vertex, retain original and other vertices',()=>{
  const original=fixture(),before=structuredClone(original)
  const set=apply(original,{kind:'point.set',pieceId:'front',pointIndex:2,xCm:12,yCm:9})
  assert.deepEqual(set.project.pieces[0].points[2],{x:12,y:9})
  assert.deepEqual(set.project.pieces[0].points[0],original.pieces[0].points[0])
  const moved=apply(set.project,{kind:'point.move',pieceId:'front',pointIndex:2,dxCm:-1,dyCm:-2})
  assert.deepEqual(moved.project.pieces[0].points[2],{x:11,y:7})
  assert.deepEqual(original,before)
  assert.deepEqual(moved.validation.gradedSizes,['S','M','L'])
})

test('angle and distance follow mathematical CCW degrees',()=>{
  const moved=apply(fixture(),{kind:'point.move',pieceId:'front',pointIndex:1,distanceCm:2,angleDeg:90})
  assert.ok(Math.abs(moved.project.pieces[0].points[1].x-10)<1e-10)
  assert.ok(Math.abs(moved.project.pieces[0].points[1].y-2)<1e-10)
})

test('split across closing edge inserts at the right index and preserves measure',()=>{
  const original=fixture()
  const output=apply(original,{kind:'edge.split',pieceId:'front',edgeIndex:3,t:0.25})
  assert.deepEqual(output.project.pieces[0].points[4],{x:0,y:6})
  assert.equal(output.project.pieces[0].points.length,5)
  assert.equal(measure(original,{pieceId:'front',edgeIndex:3}).lengthCm,8)
  assert.equal(measure(output.project,{pieceId:'front',edgeIndex:3}).lengthCm,2)
  assert.equal(apply(original,{kind:'edge.measure',pieceId:'front',edgeIndex:0}).measurement.lengthCm,10)
  assert.equal(original.pieces[0].points.length,4)
})

test('topology corruption, invalid numbers and invalid indices fail atomically',()=>{
  const original=fixture(),before=structuredClone(original)
  for(const spec of [
    {kind:'point.set',pointIndex:1,xCm:0,yCm:0},
    {kind:'point.set',pointIndex:1,xCm:NaN,yCm:2},
    {kind:'point.move',pointIndex:12,dxCm:1,dyCm:1},
    {kind:'point.move',pointIndex:1,dxCm:0,dyCm:20},
    {kind:'edge.split',edgeIndex:0,t:0},
    {kind:'edge.split',edgeIndex:0,t:1},
    {kind:'edge.split',edgeIndex:0,t:NaN},
  ])assert.throws(()=>apply(original,{...spec,pieceId:'front'}))
  assert.deepEqual(original,before)
})

test('rejects all attached geometry for changes; curves reject straight measurement only on curved edge',()=>{
  for(const add of [{curves:{0:{cx:5,cy:1}}},{notches:[{edgeIndex:0,t:0.5}]},{seams:[{edgeIndex:1}]},{internalLines:[{a:{x:1,y:1},b:{x:2,y:2}}]},{seamAllowanceCm:1},{points:[{x:0,y:0,gradeRule:{enabled:true}},{x:10,y:0},{x:10,y:8},{x:0,y:8}]}]){
    const f=fixture();Object.assign(f.pieces[0],add)
    assert.throws(()=>apply(f,{kind:'edge.split',pieceId:'front',edgeIndex:2,t:0.5}),/UNSUPPORTED/)
  }
  const f=fixture();f.pieces[0].curves={0:{cx:5,cy:1}}
  assert.throws(()=>measure(f,{pieceId:'front',edgeIndex:0}),/CURVED_EDGE/)
  assert.equal(measure(f,{pieceId:'front',edgeIndex:1}).lengthCm,8)
})
