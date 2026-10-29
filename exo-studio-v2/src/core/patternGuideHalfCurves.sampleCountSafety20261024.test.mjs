import assert from 'node:assert/strict'
import {test} from 'node:test'
import {sampleGuideHalfCurve} from './patternGuideHalfCurves.js'

const start=[0,0],end=[1,0],offset=[0,.2]

test('invalid half-curve sample counts fail closed without fabricated guide points',()=>{
  for(const steps of [0,-1,2.5,NaN,Infinity,-Infinity,null,'28',4097]){
    assert.equal(sampleGuideHalfCurve(start,end,offset,0,steps),null,
      `invalid sample count ${String(steps)} must be rejected`)
  }
})

test('valid sample counts retain exact guide endpoints and finite sampled coordinates',()=>{
  for(const steps of [1,2,28,4096]){
    const guide=sampleGuideHalfCurve(start,end,offset,0,steps)
    assert.equal(guide.points.length,steps+1)
    assert.deepEqual(guide.points[0],start)
    assert.deepEqual(guide.points.at(-1),end)
    assert.ok(guide.points.every(point=>point.every(Number.isFinite)))
  }
})

test('invalid sample count does not mutate caller-owned construction geometry',()=>{
  const before={start:[...start],end:[...end],offset:[...offset]}
  assert.equal(sampleGuideHalfCurve(start,end,offset,0,Infinity),null)
  assert.deepEqual({start,end,offset},before)
})
