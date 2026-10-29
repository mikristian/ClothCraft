import assert from 'node:assert/strict'
import {test} from 'node:test'
import {sampleGuideHalfCurve} from './patternGuideHalfCurves.js'

test('finite large equal endpoints retain a finite construction guide',()=>{
  const start=[1e308,0],end=[1e308,0],offset=[0,0]
  const original=structuredClone({start,end,offset})
  const guide=sampleGuideHalfCurve(start,end,offset,0,4)
  assert.ok(guide,'finite input should produce a guide')
  assert.deepEqual(guide.middle,[1e308,0])
  assert.deepEqual(guide.points[0],start)
  assert.deepEqual(guide.points.at(-1),end)
  assert.ok([guide.control,guide.middle,...guide.points].every(p=>p.every(Number.isFinite)))
  assert.deepEqual({start,end,offset},original,'source drafting data must remain unchanged')
})

test('finite opposite large endpoints do not overflow the guide midpoint',()=>{
  const guide=sampleGuideHalfCurve([-1e308,0],[1e308,0],[0,0],0,4)
  assert.ok(guide)
  assert.deepEqual(guide.middle,[0,0])
  assert.ok([guide.control,guide.middle,...guide.points].every(p=>p.every(Number.isFinite)))
})

test('finite inputs whose rotated control overflows are rejected without mutation',()=>{
  const start=[1e308,0],end=[1e308,0],offset=[1e308,0]
  const original=structuredClone({start,end,offset})
  assert.equal(sampleGuideHalfCurve(start,end,offset,0,4),null)
  assert.deepEqual({start,end,offset},original)
})

test('ordinary guide shape and endpoint stations remain unchanged',()=>{
  const guide=sampleGuideHalfCurve([0,0],[1,0],[0,.2],0,2)
  assert.deepEqual(guide,{control:[.5,.2],middle:[.5,0],points:[[0,0],[.5,.1],[1,0]]})
})
