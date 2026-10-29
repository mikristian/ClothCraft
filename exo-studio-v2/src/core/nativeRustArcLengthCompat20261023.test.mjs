import test from 'node:test'
import assert from 'node:assert/strict'
import {nativeRustArcLengthStation20261023,nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

const polygon=(curves={},free_curve_points={})=>({
  points:[[0,0],[.3,0],[.3,.2],[0,.2]],
  edges:['bottom','right','top','left'],curves,free_curve_points,
})
const near=(actual,expected,tolerance=1e-7)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`)

test('straight physical station matches Rust and never mutates the source',()=>{
  const source=polygon(),before=JSON.stringify(source)
  const result=nativeRustArcLengthStation20261023(source,'bottom',{distanceM:.12})
  assert.equal(result.ok,true)
  near(result.totalLengthM,.3);near(result.position[0],.12);near(result.position[1],0)
  near(result.canonicalDistanceM,.12);near(result.t,.4)
  assert.equal(result.accuracy,'MATCHES_NATIVE_CURVE_FLATTEN')
  assert.equal(JSON.stringify(source),before)
})
test('cubic overshoot is flattened by segment distance and correctly inverted',()=>{
  const curved=polygon({bottom:[[.35,.25],[-.05,.25]]})
  const full=nativeRustEdgeLength20261023(curved,'bottom')
  assert.equal(full.ok,true)
  assert.ok(full.totalLengthM>.3)
  const half=nativeRustArcLengthStation20261023(curved,'bottom',{distanceM:full.totalLengthM/2})
  assert.equal(half.ok,true)
  near(half.position[0],.15,5e-4)
  assert.ok(half.position[1]>.1)
  near(half.t,.5,.002)
})
test('Hermite free knot adds physical length, preserves knot station and refuses mirrored knots',()=>{
  const source=polygon({}, {bottom:[{t:.5,position:[.15,.08],derivative:[.3,0]}]})
  const full=nativeRustEdgeLength20261023(source,'bottom')
  assert.equal(full.ok,true)
  assert.ok(full.totalLengthM>.3)
  const half=nativeRustArcLengthStation20261023(source,'bottom',{distanceM:full.totalLengthM/2})
  assert.equal(half.ok,true)
  assert.equal(half.hasFreeKnots,true)
  assert.equal(half.snappedToFreeKnot,true)
  near(half.position[0],.15,5e-4)
  near(half.position[1],.08,5e-4)
  assert.equal(nativeRustArcLengthStation20261023(polygon({}, {bottom:[{t:.5,position:[.15,.08],mirror_group:'g'}]}),'bottom',{distanceM:.12}).ok,false)
})
test('within 0.5 mm of two free knots, canonical station snaps to the nearest knot',()=>{
  const source=polygon({}, {bottom:[
    {t:.4,position:[.1200,0],derivative:[.3,0]},
    {t:.402,position:[.1206,0],derivative:[.3,0]},
  ]})
  const requested=.12042
  const station=nativeRustArcLengthStation20261023(source,'bottom',{distanceM:requested})
  assert.equal(station.ok,true)
  assert.equal(station.snappedToFreeKnot,true)
  near(station.canonicalDistanceM,.1206,1e-8)
  near(station.position[0],.1206,1e-7)
  near(station.t,.402,1e-7)
})
test('invalid dimensions, duplicate edges and out of range distance fail closed',()=>{
  assert.equal(nativeRustArcLengthStation20261023(polygon(),'bottom',{distanceM:.3}).ok,false)
  assert.equal(nativeRustArcLengthStation20261023(polygon(),'missing',{distanceM:.1}).ok,false)
  assert.equal(nativeRustArcLengthStation20261023(polygon(),'bottom',{distanceM:NaN}).ok,false)
  const bad=polygon();bad.edges[1]='bottom'
  assert.equal(nativeRustEdgeLength20261023(bad,'bottom').ok,false)
  const malformed=polygon({}, {bottom:[{t:.4,position:[.1,.03]},{t:.4,position:[.2,.03]}]})
  assert.equal(nativeRustEdgeLength20261023(malformed,'bottom').ok,false)
})
