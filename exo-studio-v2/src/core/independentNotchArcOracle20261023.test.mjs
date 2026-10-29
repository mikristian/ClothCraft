import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNotchArcPrecision} from './independentNotchArcOracle20261023.js'

const base=(curve, fractions=[0,.05,.2,.5,.8,.95,1])=>({
  id:'notch-precision-fixture',
  points:[{x:0,y:0},{x:12,y:0},{x:12,y:10},{x:0,y:10}],
  ...(curve?{curves:{0:{cx:curve[0],cy:curve[1]}}}:{}),
  notches:fractions.map((t,i)=>({id:`n${i}`,edgeIndex:0,t}))
})

test('independent high-resolution arclength oracle agrees with production for straight and strongly asymmetric quadratic curves',()=>{
  for(const curve of [null,[2,-6],[-12,18],[35,-40],[1,-.1]]){
    const fixture=base(curve), before=structuredClone(fixture)
    const report=inspectNotchArcPrecision(fixture)
    assert.equal(report.status,'pass',JSON.stringify({curve,report}))
    assert.equal(report.checks.length,7)
    assert(report.maxDeviationCm<0.001,JSON.stringify({curve,report}))
    assert.equal(report.factoryCertified,false)
    assert.deepEqual(fixture,before)
  }
})

test('100 deterministic asymmetric quadratic fixtures retain physical notch station within 0.01 mm',()=>{
  let state=123456789
  const rand=()=>((state=(1664525*state+1013904223)>>>0)/2**32)
  let maxDeviationCm=0
  for(let i=0;i<100;i++){
    const p=base([(rand()-.5)*80,(rand()-.5)*100],[.01+rand()*.98])
    const report=inspectNotchArcPrecision(p)
    assert.equal(report.status,'pass',`seed 123456789, sample ${i}: ${JSON.stringify(report.issues)}`)
    maxDeviationCm=Math.max(maxDeviationCm,report.maxDeviationCm)
  }
  assert(maxDeviationCm<0.001)
})

test('rejects degenerate edge and nonfinite control even if the production evaluator might return a point',()=>{
  const zero=base(null,[.5]);zero.points[1]={...zero.points[0]}
  assert.equal(inspectNotchArcPrecision(zero).issues[0].code,'INVALID_NOTCH_ARCLENGTH_INPUT')
  const broken=base([2,NaN],[.5])
  assert.equal(inspectNotchArcPrecision(broken).status,'blocked')
})

test('notch metadata ambiguity, invalid fractions and absence of configured notches never certify manufacturing',()=>{
  const bad=base(null,[.5,.5]);bad.notches[1].id=bad.notches[0].id
  assert.equal(inspectNotchArcPrecision(bad).issues[0].code,'AMBIGUOUS_NOTCH_ID')
  bad.notches[1].id='other';bad.notches[1].t=Infinity
  assert.equal(inspectNotchArcPrecision(bad).issues[0].code,'INVALID_NOTCH_ARCLENGTH_INPUT')
  assert.equal(inspectNotchArcPrecision({id:'empty',points:base().points}).status,'not_configured')
  assert.throws(()=>inspectNotchArcPrecision(base(),{subdivisions:5}),/subdivisions/)
})
