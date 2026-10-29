import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

function fixture(){
  const snapshot={template:{format:'marvelous-cloth-template',version:1,
    panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],
      edges:['a','b','c','d']}}]}}
  const created=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(created.ok,true,created.reason)
  return {snapshot,ruleSet:created.ruleSet}
}

test('native template format and schema version changes invalidate an exported grade sidecar',()=>{
  const {snapshot,ruleSet}=fixture()
  const packed=encode(snapshot,ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  assert.equal(decode(snapshot,packed.json).ok,true)
  for(const mutate of [
    s=>{s.template.version=2},
    s=>{s.template.format='different-template-format'},
    s=>{delete s.template.version},
    s=>{delete s.template.format},
  ]){
    const changed=structuredClone(snapshot)
    mutate(changed)
    const restored=decode(changed,packed.json)
    assert.equal(restored.ok,false,'stale schema declaration must be rejected')
    assert.match(restored.reason,/source geometry|source provenance/i)
  }
})

test('adding native schema declarations invalidates a sidecar exported before declarations existed',()=>{
  const {snapshot,ruleSet}=fixture()
  delete snapshot.template.format
  delete snapshot.template.version
  const packed=encode(snapshot,ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  assert.equal(decode(snapshot,packed.json).ok,true)
  snapshot.template.version=1
  assert.equal(decode(snapshot,packed.json).ok,false)
})

test('template schema fields reject hidden/accessor and non-JSON declarations without executing getters',()=>{
  for(const mutate of [
    s=>{Object.defineProperty(s.template,'version',{value:1,enumerable:false})},
    s=>{Object.defineProperty(s.template,'format',{enumerable:true,get(){throw Error('schema getter executed')}})},
    s=>{s.template.version=Infinity},
  ]){
    const {snapshot,ruleSet}=fixture()
    mutate(snapshot)
    const packed=encode(snapshot,ruleSet)
    assert.equal(packed.ok,false)
    assert.doesNotMatch(packed.reason,/schema getter executed/)
  }
})

test('template schema binding does not fingerprint UI-only snapshot changes',()=>{
  const {snapshot,ruleSet}=fixture()
  const packed=encode(snapshot,ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  snapshot.revision=72
  snapshot.view={camera:{zoom:1.5}}
  snapshot.selectedPanelId='front'
  assert.equal(decode(snapshot,packed.json).ok,true)
  assert.equal(encode(snapshot,ruleSet).json,packed.json)
})
