import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

const snapshot=()=>({template:{panels:[{id:'front',polygon:{
  points:[[0,0],[0.2,0],[0.2,0.3],[0,0.3]],edges:['a','b','c','d'],
}}]}})
const fixture=()=>{
  const source=snapshot()
  const created=createAccuMarkNativeRuleSet(source)
  assert.equal(created.ok,true,created.reason)
  return {source,ruleSet:created.ruleSet}
}

test('authored notch and grainline changes invalidate a previously encoded sidecar',()=>{
  const {source,ruleSet}=fixture()
  const polygon=source.template.panels[0].polygon
  polygon.notches=[{edge:'a',t:0.5}]
  polygon.grainline={angleDegrees:0}
  const original=structuredClone(source)
  const encoded=encode(source,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  assert.equal(decode(source,encoded.json).ok,true)
  assert.deepEqual(source,original)
  polygon.notches[0].t=0.9
  assert.match(decode(source,encoded.json).reason,/source geometry or curve has changed/i)
  polygon.notches[0].t=0.5
  polygon.grainline.angleDegrees=90
  assert.match(decode(source,encoded.json).reason,/source geometry or curve has changed/i)
})

test('adding or removing source construction metadata invalidates a sidecar',()=>{
  const {source,ruleSet}=fixture()
  const polygon=source.template.panels[0].polygon
  const encoded=encode(source,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  polygon.cutline={offsetMm:10}
  assert.equal(decode(source,encoded.json).ok,false)
  delete polygon.cutline
  assert.equal(decode(source,encoded.json).ok,true)
  polygon.cutline={offsetMm:10}
  const withCutline=encode(source,ruleSet)
  assert.equal(withCutline.ok,true,withCutline.reason)
  delete polygon.cutline
  assert.equal(decode(source,withCutline.json).ok,false)
})

test('metadata key order does not affect sidecar source digest',()=>{
  const {source,ruleSet}=fixture()
  const polygon=source.template.panels[0].polygon
  polygon.grainline={angleDegrees:0,axis:'y'}
  polygon.notches=[{edge:'a',t:0.5}]
  const encoded=encode(source,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  delete polygon.grainline
  polygon.grainline={axis:'y',angleDegrees:0}
  assert.equal(decode(source,encoded.json).ok,true)
})

test('non-JSON source metadata is rejected instead of omitted from the fingerprint',()=>{
  for(const mutate of [
    poly=>{poly.grainline={angleDegrees:NaN}},
    poly=>{poly[Symbol('authored')]='untracked'},
    poly=>{Object.defineProperty(poly,'authored',{value:'hidden'})},
    poly=>{Object.defineProperty(poly,'authored',{enumerable:true,get(){throw Error('getter ran')}})},
  ]){
    const {source,ruleSet}=fixture()
    mutate(source.template.panels[0].polygon)
    const result=encode(source,ruleSet)
    assert.equal(result.ok,false)
    assert.doesNotMatch(result.reason,/getter ran/)
  }
})

test('explicit malformed optional source fields cannot impersonate absent metadata',()=>{
  for(const [field,invalid] of [
    ['curves',null],['curves',false],['free_curve_points',0],
    ['holes',null],['lines',false],
  ]){
    const {source,ruleSet}=fixture()
    const original=encode(source,ruleSet)
    assert.equal(original.ok,true,original.reason)
    source.template.panels[0].polygon[field]=invalid
    const imported=decode(source,original.json)
    assert.equal(imported.ok,false,`${field}=${String(invalid)} must reject import`)
    assert.match(imported.reason,/Malformed native source/)
    assert.equal(encode(source,ruleSet).ok,false)
  }
})

test('ordinary metadata-free sidecars remain deterministic and round-trip',()=>{
  const {source,ruleSet}=fixture()
  const encoded=encode(source,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  const decoded=decode(source,encoded.json)
  assert.equal(decoded.ok,true,decoded.reason)
  assert.equal(decoded.canonicalJson,encoded.json)
  assert.equal(decoded.manufacturingApproved,false)
})
