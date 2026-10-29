import test from 'node:test'
import assert from 'node:assert/strict'
import {patternGuideLocalFrame} from './patternGuideTracks.js'

test('finite authored points whose origin subtraction overflows do not create infinite guides',()=>{
  const points=[[1e308,0],[1.2e308,.5]]
  const before=structuredClone(points)
  const frame=patternGuideLocalFrame(points,[-1e308,0],0)
  assert.equal(frame.local[0],null)
  assert.deepEqual(frame.local[1],null)
  assert.deepEqual(points,before)
})

test('rotation overflow is excluded even when each source coordinate is finite',()=>{
  const frame=patternGuideLocalFrame([[1.5e308,1.5e308],[.2,.4]],[0,0],Math.PI/4)
  assert.equal(frame.local[0],null)
  assert.ok(frame.local[1].every(Number.isFinite))
})

test('inverse guide transform rejects overflow and malformed coordinates',()=>{
  const frame=patternGuideLocalFrame([], [1e308,0],0)
  assert.throws(()=>frame.toWorld([1e308,0]),RangeError)
  assert.throws(()=>frame.toWorld([NaN,.5]),RangeError)
  assert.throws(()=>frame.toWorld([1]),RangeError)
})

test('ordinary rotated local-to-world guide positions remain unchanged',()=>{
  const points=[[3,4],[5,7]]
  const origin=[2,3],angle=Math.PI/6
  const before=structuredClone({points,origin})
  const frame=patternGuideLocalFrame(points,origin,angle)
  for(let i=0;i<points.length;i++){
    const actual=frame.toWorld(frame.local[i])
    assert.ok(actual.every((value,j)=>Math.abs(value-points[i][j])<1e-12))
  }
  assert.deepEqual({points,origin},before)
})
