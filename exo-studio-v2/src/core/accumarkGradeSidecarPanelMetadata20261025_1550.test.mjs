import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

function fixture(){
  const source={template:{panels:[{id:'front',polygon:{
    points:[[0,0],[0.2,0],[0.2,0.3],[0,0.3]],edges:['a','b','c','d'],
  }}]}}
  const created=createAccuMarkNativeRuleSet(source)
  assert.equal(created.ok,true,created.reason)
  return {source,ruleSet:created.ruleSet,panel:source.template.panels[0]}
}

test('changing panel-level fabric, cut count or nested grain instruction invalidates an encoded grade sidecar',()=>{
  const {source,ruleSet,panel}=fixture()
  panel.fabricId='shell'
  panel.cutCount=2
  panel.grainInstruction={axis:'length',angleDegrees:0}
  const encoded=encode(source,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  assert.equal(decode(source,encoded.json).ok,true)
  for(const change of [
    p=>{p.fabricId='interfacing'},
    p=>{p.cutCount=4},
    p=>{p.grainInstruction.angleDegrees=90},
  ]){
    const changed=structuredClone(source)
    change(changed.template.panels[0])
    const result=decode(changed,encoded.json)
    assert.equal(result.ok,false)
    assert.match(result.reason,/source geometry or curve has changed/i)
  }
})

test('adding or removing panel-level construction metadata invalidates source provenance',()=>{
  const {source,ruleSet,panel}=fixture()
  const original=encode(source,ruleSet)
  assert.equal(original.ok,true,original.reason)
  panel.foldInstruction={edge:'a'}
  assert.equal(decode(source,original.json).ok,false)
  const withFold=encode(source,ruleSet)
  assert.equal(withFold.ok,true,withFold.reason)
  delete panel.foldInstruction
  assert.equal(decode(source,withFold.json).ok,false)
  assert.equal(decode(source,original.json).ok,true)
})

test('panel metadata key ordering is canonical and unchanged panels preserve byte-stable sidecars',()=>{
  const {source,ruleSet,panel}=fixture()
  const legacy=encode(source,ruleSet)
  assert.equal(legacy.ok,true,legacy.reason)
  assert.equal(decode(source,legacy.json).canonicalJson,legacy.json)
  panel.cutCount=2
  panel.grainInstruction={angleDegrees:0,axis:'y'}
  const encoded=encode(source,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  delete panel.cutCount
  delete panel.grainInstruction
  panel.grainInstruction={axis:'y',angleDegrees:0}
  panel.cutCount=2
  assert.equal(decode(source,encoded.json).ok,true)
  assert.equal(encode(source,ruleSet).json,encoded.json)
})

test('panel-level non-JSON metadata cannot silently disappear or run accessors',()=>{
  for(const mutate of [
    p=>{p.grainInstruction={angleDegrees:Infinity}},
    p=>{p[Symbol('construction')]='hidden'},
    p=>{Object.defineProperty(p,'cutCount',{value:2})},
    p=>{Object.defineProperty(p,'cutCount',{enumerable:true,get(){throw Error('getter ran')}})},
  ]){
    const {source,ruleSet,panel}=fixture()
    mutate(panel)
    const result=encode(source,ruleSet)
    assert.equal(result.ok,false)
    assert.doesNotMatch(result.reason,/getter ran/)
  }
})
