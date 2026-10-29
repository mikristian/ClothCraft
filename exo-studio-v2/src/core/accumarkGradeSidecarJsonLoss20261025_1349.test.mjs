import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

const source=()=>({template:{panels:[{id:'front',polygon:{
  points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d'],
}}]}})
const fixture=()=>{
  const snapshot=source()
  const result=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(result.ok,true,result.reason)
  return {snapshot,ruleSet:result.ruleSet}
}

test('rejects named array properties rather than silently discarding authored grade metadata',()=>{
  const {snapshot,ruleSet}=fixture()
  ruleSet.panels.front.pointOffsetsMm.L.requiredFactoryConstraint='DO_NOT_DISCARD'
  const result=encode(snapshot,ruleSet)
  assert.equal(result.ok,false)
  assert.match(result.reason,/array contains unsupported own property/)
  assert.equal(result.manufacturingApproved,false)
})

test('rejects extra mandatory coordinate fields on a two-axis grade vector',()=>{
  const {snapshot,ruleSet}=fixture()
  ruleSet.panels.front.pointOffsetsMm.L[0].mandatoryCoordinateZmm=37
  const result=encode(snapshot,ruleSet)
  assert.equal(result.ok,false)
  assert.match(result.reason,/array contains unsupported own property/)
})

test('rejects symbol and non-enumerable array properties that JSON would discard',()=>{
  for(const mutate of [
    array=>{array[Symbol('mandatory')]='unrepresented'},
    array=>Object.defineProperty(array,'mandatory',{value:'unrepresented'}),
  ]){
    const {snapshot,ruleSet}=fixture()
    mutate(ruleSet.panels.front.pointOffsetsMm.L)
    assert.equal(encode(snapshot,ruleSet).ok,false)
  }
})

test('rejects hidden, symbolic and accessor object properties without invoking getters',()=>{
  for(const mutate of [
    object=>{object[Symbol('mandatory')]='unrepresented'},
    object=>Object.defineProperty(object,'mandatory',{value:'unrepresented'}),
    object=>Object.defineProperty(object,'mandatory',{enumerable:true,get(){throw Error('getter invoked')}}),
  ]){
    const {snapshot,ruleSet}=fixture()
    mutate(ruleSet.panels.front)
    const result=encode(snapshot,ruleSet)
    assert.equal(result.ok,false)
    assert.doesNotMatch(result.reason,/getter invoked/)
  }
})

test('ordinary grade sidecar still encodes, decodes and remains byte stable',()=>{
  const {snapshot,ruleSet}=fixture()
  const packed=encode(snapshot,ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  const restored=decode(snapshot,packed.json)
  assert.equal(restored.ok,true,restored.reason)
  assert.equal(restored.canonicalJson,packed.json)
  assert.equal(restored.manufacturingApproved,false)
})
