import test from 'node:test'
import assert from 'node:assert/strict'
import {gradePiece} from './grading.js'
import {edgePointAt} from './project.js'
import {createGradedNotchCanonicalView} from './gradedNotchCanonicalView20261023.js'

const grading={sizes:['M','L'],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1}
const piece=()=>({id:'front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],
  notches:[{id:'shoulder',edgeIndex:0,t:.35,x:3.5,y:0,type:'double',matchGroupId:'pair',depthCm:.4}]})

test('generic nonbase stale x/y repaired without mutating input or mark metadata',()=>{
  const graded=gradePiece(piece(),grading,'L'), before=structuredClone(graded)
  const result=createGradedNotchCanonicalView(graded)
  const notch=result.view.notches[0], expected=edgePointAt(graded,0,.35,64).point
  assert.notDeepEqual({x:graded.notches[0].x,y:graded.notches[0].y},expected)
  assert.deepEqual({x:notch.x,y:notch.y},expected)
  assert.deepEqual({id:notch.id,edgeIndex:notch.edgeIndex,t:notch.t,type:notch.type,matchGroupId:notch.matchGroupId,depthCm:notch.depthCm},
    {id:'shoulder',edgeIndex:0,t:.35,type:'double',matchGroupId:'pair',depthCm:.4})
  assert.deepEqual(graded,before)
  assert.equal(result.factoryCertified,false)
  assert.match(result.status,/DEVELOPMENT_ONLY/)
})

test('quadratic uses physical arclength rather than raw Bezier parameter',()=>{
  const p=piece();p.curves={0:{cx:1,cy:-5}}
  const expected=edgePointAt(p,0,.35,64).point
  const result=createGradedNotchCanonicalView(p)
  assert.deepEqual({x:result.view.notches[0].x,y:result.view.notches[0].y},expected)
  const raw={x:(1-.35)**2*0+2*(1-.35)*.35*1+.35**2*10,y:2*(1-.35)*.35*-5}
  assert(Math.hypot(expected.x-raw.x,expected.y-raw.y)>.01)
})

test('absent optional coordinate cache remains absent',()=>{
  const p=piece();delete p.notches[0].x;delete p.notches[0].y
  const result=createGradedNotchCanonicalView({pieces:[p],id:'graded'})
  assert.equal(Object.hasOwn(result.view.pieces[0].notches[0],'x'),false)
  assert.equal(Object.hasOwn(result.view.pieces[0].notches[0],'y'),false)
  assert.equal(result.factoryCertified,false)
})

test('rejects malformed stations, ambiguous identities and nonfinite or zero-length geometry',()=>{
  const assertReject=p=>assert.throws(()=>createGradedNotchCanonicalView(p))
  const invalid=piece();invalid.notches[0].t=1.1;assertReject(invalid)
  invalid.notches[0].t=.35;invalid.notches[0].edgeIndex=-1;assertReject(invalid)
  const duplicate=piece();duplicate.notches.push({...duplicate.notches[0]});assertReject(duplicate)
  assertReject({pieces:[piece(),piece()]})
  const zero=piece();zero.points[1]={...zero.points[0]};assertReject(zero)
  const nan=piece();nan.curves={0:{cx:Infinity,cy:0}};assertReject(nan)
  const bad=piece();bad.points[0].x=NaN;assertReject(bad)
})

test('partial and corrupted cached coordinate pairs reject without altering source',()=>{
  for (const field of ['x','y']) {
    const partial=piece();delete partial.notches[0][field]
    const original=structuredClone(partial)
    assert.throws(()=>createGradedNotchCanonicalView(partial),/INVALID_NOTCH_CACHED_COORDINATE/)
    assert.deepEqual(partial,original)
  }
  for (const value of [NaN,Infinity,-Infinity,undefined,null,'3.5']) {
    const corrupted=piece();corrupted.notches[0].x=value
    assert.throws(()=>createGradedNotchCanonicalView(corrupted),/INVALID_NOTCH_CACHED_COORDINATE/)
    assert.equal(corrupted.notches[0].x,value)
  }
})
