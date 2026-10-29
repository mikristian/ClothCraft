import test from 'node:test'
import assert from 'node:assert/strict'
import {curveDraftDimensions} from './patternCurveDrafting.js'

const fixture=()=>({
  edges:['side','hem','top'],
  points:[[0,0],[0,1],[1,1]],
  curves:{side:[[.2,.25],[.2,.75]]},
})

test('fractional sample counts cannot silently under-measure a drafted curve',()=>{
  const source=fixture()
  const baseline=curveDraftDimensions(source,{samples:64})
  assert.equal(baseline.length,3)
  assert.deepEqual(curveDraftDimensions(source,{samples:1.5}),[])
  assert.deepEqual(source,fixture())
})

test('nonfinite, coerced and excessive sample counts are rejected without allocation',()=>{
  const source=fixture()
  for(const samples of [Infinity,-Infinity,NaN,'64',4097,1e9,0,-1]){
    assert.deepEqual(curveDraftDimensions(source,{samples}),[],`samples=${String(samples)}`)
  }
  assert.deepEqual(source,fixture())
})

test('valid sample counts preserve endpoints and curved physical lengths',()=>{
  const source=fixture()
  for(const samples of [1,2,64,128]){
    const side=curveDraftDimensions(source,{samples}).find(row=>row.edge==='side')
    assert(side,`samples=${samples}`)
    assert.deepEqual(side.from,[0,0])
    assert.deepEqual(side.to,[0,1])
    assert(Number.isFinite(side.length)&&side.length>=1)
  }
  assert.deepEqual(source,fixture())
})
