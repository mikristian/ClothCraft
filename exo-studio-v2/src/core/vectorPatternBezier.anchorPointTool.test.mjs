import test from 'node:test'
import assert from 'node:assert/strict'
import {dragPatternAnchorHandles} from './vectorPatternBezier.js'

const shape=()=>({points:[[0,0],[.4,0],[.4,.3],[0,.3]],
  edges:['bottom','right','top','left'],curves:{},free_curve_points:{}})

test('Anchor Point drag creates opposed tangent handles without relocating the anchor',()=>{
  const original=shape()
  const result=dragPatternAnchorHandles(original,1,[.05,.04])
  assert.deepEqual(result.points,original.points)
  assert.ok(Math.hypot(result.curves.right[0][0]-.45,result.curves.right[0][1]-.04)<1e-12)
  assert.ok(Math.hypot(result.curves.bottom[1][0]-.35,result.curves.bottom[1][1]+.04)<1e-12)
  assert.deepEqual(original.curves,{})
  assert.deepEqual(result.edges,original.edges)
})

test('Anchor Point drag preserves unrelated handles and supports 45 degree snapping',()=>{
  const original=shape()
  original.curves.bottom=[[.09,.08],[.28,.04]]
  const result=dragPatternAnchorHandles(original,1,[.05,.045],{snapAngle:true})
  assert.deepEqual(result.curves.bottom[0],[.09,.08])
  assert.ok(Math.abs(result.curves.right[0][0]-.4-result.curves.right[0][1])<1e-10)
  assert.ok(Math.abs(result.curves.bottom[1][0]-.4+result.curves.right[0][0]-.4)<1e-10)
})

test('Nonfinite and zero-length Anchor Point gestures leave material unmodified',()=>{
  for(const delta of [[0,0],[NaN,0],[Infinity,.01]])
    assert.equal(dragPatternAnchorHandles(shape(),1,delta),null)
  assert.equal(dragPatternAnchorHandles(shape(),12,[.04,.03]),null)
})
