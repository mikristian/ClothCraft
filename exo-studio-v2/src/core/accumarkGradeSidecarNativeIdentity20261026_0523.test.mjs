import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

function fixture(){
  const snapshot={template:{format:'marvelous-cloth-template',version:2,
    name:'Jacket A',fabrics:[],seams:[],panels:[{id:'front',polygon:{
      points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d'],
    }}]}}
  const created=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(created.ok,true,created.reason)
  const packed=encode(snapshot,created.ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  return {snapshot,ruleSet:created.ruleSet,packed}
}

test('native Rust garment identity rename invalidates stale grading sidecar',()=>{
  const {snapshot,packed}=fixture()
  const renamed=structuredClone(snapshot)
  renamed.template.name='Jacket B'
  const result=decode(renamed,packed.json)
  assert.equal(result.ok,false,'a different native garment identity must not reuse the source-bound sidecar')
  assert.match(result.reason,/source geometry|source provenance/i)
})

test('adding or removing authored native garment identity invalidates a sidecar',()=>{
  const {snapshot,ruleSet,packed}=fixture()
  const withoutName=structuredClone(snapshot)
  delete withoutName.template.name
  assert.equal(decode(withoutName,packed.json).ok,false)
  const legacy=encode(withoutName,ruleSet)
  assert.equal(legacy.ok,true,legacy.reason)
  assert.equal(decode(snapshot,legacy.json).ok,false)
})

test('native garment identity rejects accessor, hidden and malformed values without getter execution',()=>{
  const {snapshot,ruleSet}=fixture()
  let calls=0
  for(const mutate of [
    s=>Object.defineProperty(s.template,'name',{enumerable:true,get(){calls++;return 'Jacket A'}}),
    s=>Object.defineProperty(s.template,'name',{value:'Jacket A',enumerable:false}),
    s=>{s.template.name=123},
  ]){
    const altered=structuredClone(snapshot)
    mutate(altered)
    const result=encode(altered,ruleSet)
    assert.equal(result.ok,false,JSON.stringify(result))
  }
  assert.equal(calls,0)
})

test('unchanged native garment identity retains exact round-trip and ignores view-only changes',()=>{
  const {snapshot,ruleSet,packed}=fixture()
  snapshot.revision=99
  snapshot.view={zoom:3}
  assert.equal(decode(snapshot,packed.json).ok,true)
  assert.equal(encode(snapshot,ruleSet).json,packed.json)
})
