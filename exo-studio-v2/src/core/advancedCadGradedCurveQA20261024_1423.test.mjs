import test from 'node:test'
import assert from 'node:assert/strict'
import { preflightAdvancedCadGradedCurves as check } from './advancedCadGradedCurveQA20261024_1423.js'

function fixture() {
  return { grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:1,lengthPerSizeCm:1},
    pieces:[{id:'front',points:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],
      curves:{1:{cx:24,cy:10}},notches:[{edgeIndex:1,t:0.4,depthCm:.3}],
      seamAllowance:1,edgeSeamAllowances:{1:1.5},
      internalLines:[{a:{x:0,y:0},b:{x:20,y:0},aAnchor:{vertexIndex:0},bAnchor:{edgeIndex:0,t:.75}}]}] }
}
const codes = result => result.diagnostics.map(d => d.code)
test('valid quadratic graded run checks every size without factory approval or mutation',()=>{
  const p=fixture(), prior=JSON.stringify(p), r=check(p)
  assert.equal(r.ok,true,JSON.stringify(r.diagnostics))
  assert.deepEqual(r.checkedSizes,['S','M','L'])
  assert.equal(r.manufacturingApproved,false)
  assert.equal(JSON.stringify(p),prior)
})
test('stale edge control index fails before grading',()=>{
  const p=fixture();p.pieces[0].curves[9]={cx:5,cy:5}
  assert.ok(codes(check(p)).includes('CURVE_EDGE'))
})
test('nonfinite curve control blocked',()=>{
  const p=fixture();p.pieces[0].curves[1].cy=Infinity
  assert.ok(codes(check(p)).includes('CURVE_CONTROL'))
})
test('stale edge allowance and negative values rejected',()=>{
  const p=fixture();p.pieces[0].edgeSeamAllowances[17]=1;p.pieces[0].edgeSeamAllowances[0]=-1
  assert.equal(codes(check(p)).filter(c=>c==='EDGE_ALLOWANCE').length,2)
})
test('invalid notch arc station fails',()=>{
  const p=fixture();p.pieces[0].notches[0].t=1.1
  assert.ok(codes(check(p)).includes('NOTCH_ANCHOR'))
})
test('invalid line edge reference fails',()=>{
  const p=fixture();p.pieces[0].internalLines[0].bAnchor.edgeIndex=80
  assert.ok(codes(check(p)).includes('EDGE_REFERENCE'))
})
test('cutline bowtie intersection rejected',()=>{
  const p=fixture();p.pieces[0].curves={};p.pieces[0].points=[{x:0,y:0},{x:20,y:20},{x:0,y:20},{x:20,y:0}]
  assert.ok(codes(check(p)).includes('SELF_INTERSECTION') || codes(check(p)).includes('ZERO_AREA'))
})
test('graded explicit notch coordinate drift is diagnosed per nonbase size',()=>{
  const p=fixture();p.pieces[0].internalLines=[];p.pieces[0].notches[0].x=23;p.pieces[0].notches[0].y=10
  const r=check(p)
  assert.ok(r.diagnostics.some(d=>d.code==='NOTCH_GRADE_DRIFT'&&d.size==='S'))
})
test('malicious inherited JSON serializer is never run',()=>{
  const p=fixture();let invoked=false
  const original=Object.prototype.toJSON
  try {
    Object.prototype.toJSON=function(){invoked=true;throw Error('unexpected')}
    assert.equal(check(p).ok,true)
    assert.equal(invoked,false)
  } finally { if(original===undefined)delete Object.prototype.toJSON;else Object.prototype.toJSON=original }
})
test('accessor and cyclic source inputs fail closed',()=>{
  const p=fixture();Object.defineProperty(p.pieces[0].points[0],'x',{get(){throw Error('must not run')},enumerable:true})
  assert.ok(codes(check(p)).includes('UNSAFE_SOURCE'))
  const q=fixture();q.loop=q
  assert.ok(codes(check(q)).includes('UNSAFE_SOURCE'))
})
test('adversarial oversized topology is bounded',()=>{
  const p=fixture();p.pieces[0].points=Array.from({length:129},(_,i)=>({x:i,y:i*i}))
  assert.ok(codes(check(p)).includes('POINT_COUNT'))
})
