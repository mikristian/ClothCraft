import test from 'node:test'
import assert from 'node:assert/strict'
import {armpitChestReference} from './patternGuideTracks.js'

const shape={
  edges:['neck','shoulder-right','side-right','hem','side-left','shoulder-left'],
  points:[[.42,0],[.56,.02],[.7,.29],[.76,.66],[.2,.66],[.26,.29]],
}

test('actual armpit vertices are the two chest endpoints and one real center point',()=>{
  const result=armpitChestReference(shape,.48)
  assert.deepEqual(result,{left:[.26,.29],center:[.48,.29],right:[.7,.29],y:.29})
  assert.equal(new Set([result.left[0],result.center[0],result.right[0]]).size,3)
  assert.equal(result.center[1],result.left[1])
  assert.equal(result.center[1],result.right[1])
})

test('side-edge winding can reverse without moving the armpit markers',()=>{
  const reversed={edges:['side-right','hem','side-left','neck','shoulder-left','shoulder-right'],
    points:[[.7,.29],[.76,.66],[.2,.66],[.26,.29],[.42,0],[.56,.02]]}
  assert.deepEqual(armpitChestReference(reversed,.48),armpitChestReference(shape,.48))
})

test('do not pretend asymmetric armpits form one horizontal physical chest line',()=>{
  const asymmetric=structuredClone(shape)
  asymmetric.points[5]=[.26,.306]
  assert.equal(armpitChestReference(asymmetric,.48),null)
  assert.equal(armpitChestReference({edges:[],points:[]}),null)
})
