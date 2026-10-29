// Independent metamorphic regression for the research-only cloth-thickness
// distance oracle. No live garment or installed application is touched.
import assert from 'node:assert/strict'
import test from 'node:test'
import {measureNativeTriangleDistanceM} from '../src/core/backends/nativeTriangleDistanceResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'

// Two disjoint skew triangles with an interior/interior closest-edge pair.
// The old absolute 1e-20 segment determinant threshold inflated their gap
// by 5.95% when uniformly scaled to a tiny but nondegenerate fabric feature.
const a=[[.39,-.69,-.89],[.70,.27,.57],[-.12,.71,-.15]]
const b=[[.19,.02,.09],[-.48,.02,.78],[-.41,.69,-.17]]
const scaled=(triangle,factor)=>triangle.map(p=>p.map(x=>x*factor))
const almost=(actual,expected,tolerance=1e-12)=>
  assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`)
const fixture=(factor=1e-5)=>({
  particles:[...a,...b].map(p=>({position:p.map(x=>x*factor)})),
  pieces:[{id:'tiny-material',particleIndices:[0,1,2,3,4,5],
    faces:[[0,1,2],[3,4,5]]}],
})

test('skew-edge triangle distance is invariant under uniform metric scaling',()=>{
  const original=JSON.stringify([a,b])
  const baseline=measureNativeTriangleDistanceM(a,b)
  almost(baseline,.218385191216793,1e-12)
  for(const factor of [1e-2,1e-4,1e-5,1e-6]){
    const distance=measureNativeTriangleDistanceM(scaled(a,factor),scaled(b,factor))
    almost(distance/factor,baseline,1e-10)
  }
  assert.equal(JSON.stringify([a,b]),original)
})

test('tiny skew-edge clearance fails closed at a threshold between true and inflated gap',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const result=inspectNativeIntrapanelStaticContact(source,{clearanceM:2.25e-6})
  assert.equal(result.checkedTotalPairs,1)
  assert.equal(result.intersectingTrianglePairs,0)
  assert.equal(result.nonadjacentNearClearancePairs,1)
  assert.equal(result.staticDisjointThicknessScreenClear,false)
  almost(result.minimumNearClearanceMm,.00218385191216793,1e-11)
  assert.equal(result.clothThicknessClearanceCertified,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('distance is symmetric under triangle swapping and vertex reordering',()=>{
  const factor=1e-5,smallA=scaled(a,factor),smallB=scaled(b,factor)
  const expected=measureNativeTriangleDistanceM(smallA,smallB)
  for(const perm of [[0,1,2],[1,2,0],[2,0,1],[2,1,0]]){
    const rotated=perm.map(i=>smallA[i])
    almost(measureNativeTriangleDistanceM(rotated,smallB),expected,1e-14)
    almost(measureNativeTriangleDistanceM(smallB,rotated),expected,1e-14)
  }
})

test('small triangles outside the requested clearance are not falsely vetoed',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const result=inspectNativeIntrapanelStaticContact(source,{clearanceM:2e-6})
  assert.equal(result.intersectingTrianglePairs,0)
  assert.equal(result.nonadjacentNearClearancePairs,0)
  assert.equal(result.staticDisjointThicknessScreenClear,true)
  assert.equal(result.fitCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})
