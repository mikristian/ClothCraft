import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectGeneralizedCurvedDraft20261024_1540 as inspect} from './generalizedCurvedDraftAcceptance20261024_1540.js'
import {edgeLength} from './project.js'

const rectangle=(x0,y0,x1,y1)=>({points:[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}],curves:{}})
const source=()=>({...rectangle(0,0,20,20),curves:{0:{cx:10,cy:-3}},holes:[rectangle(5,5,10,10)],seamAllowance:1})

test('actual quadratic and straight CAD core agree on curved edge lengths and tangent normal',()=>{
  const original=source(),copy=structuredClone(original),result=inspect(original,{offsetCm:.5,stations:40})
  assert.equal(result.ok,true)
  assert.equal(result.holeCount,1)
  assert.equal(result.offsetCertified,false)
  assert(Math.abs(result.edges[0].lengthCm-edgeLength(original,0))<1e-7)
  const station=result.edges[0].stations[20]
  assert(Math.abs(station.point.x-10)<1e-8)
  assert(Math.abs(station.point.y+1.5)<1e-8)
  assert(Math.abs(station.offset.x-station.point.x-station.normal.x*.5)<1e-8)
  assert(Math.abs(station.tangent.x*station.normal.x+station.tangent.y*station.normal.y)<1e-8)
  assert.deepEqual(original,copy)
})
test('holes outside, touching, overlapping and nested fail closed',()=>{
  for(const hole of [rectangle(18,18,22,22),rectangle(0,4,4,8),rectangle(7,7,12,12)]){
    const input=source();input.holes=[rectangle(5,5,10,10),hole]
    assert.equal(inspect(input).ok,false)
  }
  const input=source();input.holes=[rectangle(5,5,10,10),rectangle(6,6,8,8)]
  assert.equal(inspect(input).code,'HOLES_OVERLAP_OR_NEST')
})
test('rejects curved foldbacks and cutline crossovers',()=>{
  for(const curve of [{cx:30,cy:0},{cx:10,cy:50}]){
    const input=source();input.curves[0]=curve
    assert.equal(inspect(input).ok,false)
  }
})
test('unknown metadata, malformed inactive geometry, hostile getters and invalid options fail closed',()=>{
  for(const mutate of [
    p=>{p.mystery={edgeIndex:99}},p=>{p.holes[0].unrecognized=true},
    p=>{p.curves[99]={cx:2,cy:2}},p=>{p.points[0].gradeRule={edgeIndex:999}},
    p=>{p.holes[0].curves[0]={cx:NaN,cy:0}},p=>{p.seamAllowance=Infinity},
  ]){const p=source();mutate(p);assert.equal(inspect(p).ok,false)}
  let getterCalls=0;const p=source()
  Object.defineProperty(p.points[0],'x',{get(){getterCalls++;throw Error('getter invoked')}})
  assert.equal(inspect(p).ok,false)
  assert.equal(getterCalls,0)
  for(const opts of [{stations:Infinity},{stations:1},{stations:1.5},{offsetCm:-1},{offsetCm:NaN}])assert.equal(inspect(source(),opts).ok,false)
})
test('overlapping curved and straight holes fail closed even when their first vertices lie outside',()=>{
  const p=source()
  p.holes=[rectangle(4,4,10,10),rectangle(8,3,13,8)]
  assert.equal(inspect(p).code,'HOLES_OVERLAP_OR_NEST')
  p.holes[1]={...rectangle(8,3,13,8),curves:{0:{cx:10,cy:12}}}
  assert.equal(inspect(p).ok,false)
})
test('hole vertex on quadratic boundary is rejected at non-sampled parameter',()=>{
  const p=source(),t=0.137,u=1-t
  const x=u*u*0+2*u*t*10+t*t*20,y=2*u*t*(-3)
  p.holes=[rectangle(x,y,x+1,y+1)]
  assert.equal(inspect(p).ok,false)
})
test('open or invalid hole declarations, foldbacks and sparse source arrays are rejected',()=>{
  const variants=[
    p=>{p.holes=[{points:[{x:2,y:2},{x:5,y:2}],curves:{}}]},
    p=>{p.holes=[{points:[{x:2,y:2},{x:5,y:2},{x:5,y:2}],curves:{}}]},
    p=>{p.holes=[{points:[{x:2,y:2},{x:5,y:2},{x:4,y:4}],curves:{0:{cx:12,cy:2}}}]},
    p=>{p.holes=[{points:[{x:2,y:2},{x:5,y:2},{x:4,y:4}],curves:{0:{cx:8,cy:2}}}]},
    p=>{p.holes=Array(2);p.holes[0]=rectangle(5,5,10,10)},
    p=>{p.points=Array(4);p.points[0]={x:0,y:0};p.points[1]={x:20,y:0};p.points[3]={x:0,y:20}},
    p=>{p.holes[0].points=Array(4);p.holes[0].points[0]={x:5,y:5};p.holes[0].points[1]={x:10,y:5};p.holes[0].points[3]={x:5,y:10}},
  ]
  for(const mutate of variants){const p=source();mutate(p);assert.equal(inspect(p).ok,false)}
})
