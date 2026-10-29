import assert from 'node:assert/strict'
import {test} from 'node:test'
import {nearestOnDraftSegment,snapDraftPattern} from './draftingSnapping.js'

test('finite segment endpoints with overflowing delta never return NaN projection',()=>{
  const point={x:0,y:0},a={x:-1e308,y:0},b={x:1e308,y:0}
  const before=structuredClone({point,a,b})
  assert.throws(()=>nearestOnDraftSegment(point,a,b),/Invalid drafting segment result/)
  assert.deepEqual({point,a,b},before)
})

test('overflow in projection math is rejected even when input coordinates are finite',()=>{
  const point={x:-1e308,y:0},a={x:1e308,y:0},b={x:1e308-1e292,y:0}
  assert.throws(()=>nearestOnDraftSegment(point,a,b),/Invalid drafting segment result/)
})

test('live pattern snapping skips unprojectable imported edges without crashing',()=>{
  const extreme={id:'extreme',layout2d:{x:0,y:0},points:[
    {x:-1e308,y:0},{x:1e308,y:0},{x:1e308,y:1},{x:-1e308,y:1}],curves:{}}
  const ordinary={id:'ordinary',layout2d:{x:0,y:0},points:[
    {x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}],curves:{}}
  const before=structuredClone({extreme,ordinary})
  const snap=snapDraftPattern({x:.1,y:.1},[extreme,ordinary],{toleranceCm:.5})
  assert.equal(snap?.pieceId,'ordinary')
  assert.equal(snap?.kind,'vertex')
  assert.ok(Number.isFinite(snap.x)&&Number.isFinite(snap.y))
  assert.deepEqual({extreme,ordinary},before)
})

test('ordinary projection and endpoint clamping preserve existing geometry',()=>{
  assert.deepEqual(nearestOnDraftSegment({x:7,y:4},{x:0,y:0},{x:10,y:0}),{x:7,y:0,t:.7})
  assert.deepEqual(nearestOnDraftSegment({x:12,y:4},{x:0,y:0},{x:10,y:0}),{x:10,y:0,t:1})
})
