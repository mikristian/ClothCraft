import assert from 'node:assert/strict'
import test from 'node:test'
import {armpitChestReference} from './patternGuideTracks.js'

const edges=['side-left','bottom','side-right','top']
const square=()=>[[0,0],[0,.8],[.4,.8],[.4,0]]

test('missing X on left armpit cannot generate a nonfinite chest guide',()=>{
  const points=square()
  points[0]=[,0]
  assert.equal(armpitChestReference({edges,points}),null)
})

test('missing X on right armpit cannot generate a nonfinite chest guide',()=>{
  const points=square()
  points[3]=[,0]
  assert.equal(armpitChestReference({edges,points}),null)
})

test('valid side-seam corners still produce the precise center chest guide',()=>{
  assert.deepEqual(armpitChestReference({edges,points:square()}),{
    left:[0,0],center:[.2,0],right:[.4,0],y:0,
  })
})

test('finite but overflowing center coordinates cannot become chest guides',()=>{
  const points=[[1e308,0],[1e308,.8],[1.7e308,.8],[1.7e308,0]]
  assert.equal(armpitChestReference({edges,points}),null)
})

test('finite endpoints with overflowing width cannot become chest guides',()=>{
  const points=[[-1e308,0],[-1e308,.8],[1e308,.8],[1e308,0]]
  assert.equal(armpitChestReference({edges,points}),null)
})

test('invalid-guide rejection never mutates the authored pattern',()=>{
  const points=square()
  points[0]=[,0]
  const polygon={edges:[...edges],points}
  const before=structuredClone(polygon)
  armpitChestReference(polygon)
  assert.deepEqual(polygon,before)
})
