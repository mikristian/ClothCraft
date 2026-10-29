import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNativeSeamTrueing20261023 as audit} from './nativeSeamTrueing20261023.js'

const rectangle=(id,curve=null)=>({id,polygon:{points:[[0,0],[.4,0],[.4,.2],[0,.2]],edges:['hem','side','top','other'],curves:curve?{hem:curve}:{}}})
const make=(a=rectangle('A'),b=rectangle('B'),seam={})=>({revision:5,template:{panels:[a,b],seams:[{id:'join',a:{panel:'A',edge:'hem',range:[0,1]},b:{panel:'B',edge:'hem',range:[0,1]},reverse_b:false,allow_ease:false,...seam}]}})

test('equal straight seams match at every physical station and do not change source',()=>{
  const source=make(),before=structuredClone(source)
  const r=audit(source,{seamId:'join',stations:11})
  assert.equal(r.ok,true,r.reason);assert.equal(r.referenceWithinTolerance,true)
  assert.equal(r.rows.length,11);assert(Math.abs(r.lengthMismatchMm)<1e-6)
  assert(Math.abs(r.maxShapeMm)<1e-6);assert(Math.abs(r.maxTangentDegrees)<1e-6)
  assert.equal(r.manufacturingApproved,false)
  assert.deepEqual(source,before)
})

test('sewn reverse-B correspondence correctly maps physically reversed edge',()=>{
  const a=rectangle('A')
  const b={id:'B',polygon:{points:[[.4,0],[0,0],[0,.2],[.4,.2]],edges:['hem','side','top','other'],curves:{}}}
  const reverse=make(a,b,{reverse_b:true})
  const r=audit(reverse,{seamId:'join'})
  assert.equal(r.ok,true,r.reason);assert.equal(r.referenceWithinTolerance,true)
  assert(r.rows.every(x=>Math.abs(x.normalMm)<1e-7));assert.equal(r.reversedSecond,true)
})

test('curved pair detects nontrivial physically sampled shape and tangent mismatch',()=>{
  const a=rectangle('A',[[.1,.07],[.28,.07]])
  const b=rectangle('B',[[.1,-.07],[.28,-.07]])
  const r=audit(make(a,b),{seamId:'join',shapeToleranceMm:3,tangentToleranceDegrees:4,stations:9})
  assert.equal(r.ok,true,r.reason);assert(r.maxShapeMm>20)
  assert(r.maxTangentDegrees>4)
  assert(r.issues.includes('SEAM_SHAPE_NORMAL_RESIDUAL'))
  assert(r.issues.includes('JOIN_TANGENT_DISCONTINUITY'))
  assert.equal(r.referenceWithinTolerance,false)
})

test('physical length mismatch reports and ease keeps approval blocked',()=>{
  const b=rectangle('B');b.polygon.points[1][0]=.43
  const r=audit(make(rectangle('A'),b,{allow_ease:true}),{seamId:'join'})
  assert.equal(r.ok,true,r.reason);assert(r.lengthMismatchMm>29)
  assert(r.issues.includes('SEAM_LENGTH_MISMATCH'))
  assert(r.issues.some(issue=>issue.startsWith('EASE_ENABLED')))
  assert.equal(r.manufacturingApproved,false)
})

test('malformed sources, partial seams and singular chord fail closed',()=>{
  const samples=[
    [make(),{seamId:'absent'}],
    [make(),{seamId:'join',stations:34}],
    [make(),{seamId:'join',lengthToleranceMm:-1}],
    [make(rectangle('A'),rectangle('B'),{a:{panel:'A',edge:'hem',range:[.25,.75]}}),{seamId:'join'}],
  ]
  for(const [s,o] of samples){const r=audit(s,o);assert.equal(r.ok,false,JSON.stringify(o));assert.equal(r.manufacturingApproved,false)}
  const x=make();x.template.panels[0].polygon.points[0][0]=Infinity
  assert.equal(audit(x,{seamId:'join'}).ok,false)
})
