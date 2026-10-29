// Independent negative control for research-only cloth thickness distances.
// A transverse edge can pierce a triangle face without touching ANY edge or
// vertex; endpoint/edge-only distance estimates then incorrectly report >0.
import assert from 'node:assert/strict'
import test from 'node:test'
import {measureNativeTriangleDistanceM} from '../src/core/backends/nativeTriangleDistanceResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'

const sheet=[[-1,-1,0],[1,-1,0],[0,1,0]]
const piercing=[[0,-.5,-1],[0,-.5,1],[0,.5,.5]]
const scaled=(face,s)=>face.map(p=>p.map(x=>x*s))
const fixture=(a,b)=>({particles:[...a,...b].map(p=>({position:[...p]})),
  pieces:[{id:'research',particleIndices:[0,1,2,3,4,5],
    faces:[[0,1,2],[3,4,5]]}]})

test('transverse face-interior piercing has zero distance despite clear vertex/edge witnesses',()=>{
  const frozen=JSON.stringify([sheet,piercing])
  for(const factor of [1,1e-2,1e-4,1e-5]){
    const a=scaled(sheet,factor),b=scaled(piercing,factor)
    for(const perm of [[0,1,2],[1,2,0],[2,1,0]]){
      const rotated=perm.map(i=>b[i])
      assert.equal(measureNativeTriangleDistanceM(a,rotated),0)
      assert.equal(measureNativeTriangleDistanceM(rotated,a),0)
    }
  }
  assert.equal(JSON.stringify([sheet,piercing]),frozen)
})

test('offset nonintersecting triangles retain strictly positive distance',()=>{
  const disjoint=piercing.map(([x,y,z])=>[x,y+3,z])
  const frozen=JSON.stringify([sheet,disjoint])
  const gap=measureNativeTriangleDistanceM(sheet,disjoint)
  assert.ok(gap>0.1,`Expected separated triangles, got ${gap}`)
  assert.ok(Math.abs(measureNativeTriangleDistanceM(disjoint,sheet)-gap)<1e-12)
  for(const factor of [1e-2,1e-4,1e-5])
    assert.ok(Math.abs(measureNativeTriangleDistanceM(scaled(sheet,factor),
      scaled(disjoint,factor))/factor-gap)<1e-9)
  assert.equal(JSON.stringify([sheet,disjoint]),frozen)
})

test('actual static contact screen still rejects a pierced same-panel pair without mutation',()=>{
  const input=fixture(sheet,piercing),frozen=JSON.stringify(input)
  const out=inspectNativeIntrapanelStaticContact(input,{clearanceM:.001})
  assert.equal(out.intersectingTrianglePairs,1)
  assert.equal(out.staticDisjointThicknessScreenClear,false)
  assert.equal(out.fitCertified,false)
  assert.equal(out.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(input),frozen)
})
