import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

function fixture(){
  const snapshot={template:{panels:[{id:'front',polygon:{
    points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d'],
  }}]}}
  const created=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(created.ok,true,created.reason)
  return {snapshot,rules:created.ruleSet}
}

function attachInheritedIteratorGetter(array){
  let calls=0
  const prototype=Object.create(Array.prototype)
  Object.defineProperty(prototype,Symbol.iterator,{get(){
    calls++
    return Array.prototype[Symbol.iterator]
  }})
  Object.setPrototypeOf(array,prototype)
  return ()=>calls
}

for(const [name,select] of [
  ['source panel collection',({snapshot})=>snapshot.template.panels],
  ['source polygon points',({snapshot})=>snapshot.template.panels[0].polygon.points],
  ['grade size list',({rules})=>rules.sizes],
  ['grade offset list',({rules})=>rules.panels.front.pointOffsetsMm.XS],
]){
  test(`sidecar rejects nonstandard ${name} array prototype without inherited getter execution`,()=>{
    const input=fixture()
    const calls=attachInheritedIteratorGetter(select(input))
    const result=encode(input.snapshot,input.rules)
    assert.equal(result.ok,false,`${name} unexpectedly accepted`)
    assert.equal(result.manufacturingApproved,false)
    assert.equal(calls(),0,`${name} invoked inherited Symbol.iterator getter`)
  })
}

test('sidecar decode rejects nonstandard source array prototype without getter execution',()=>{
  const input=fixture()
  const packed=encode(input.snapshot,input.rules)
  assert.equal(packed.ok,true,packed.reason)
  const calls=attachInheritedIteratorGetter(input.snapshot.template.panels)
  const decoded=decode(input.snapshot,packed.json)
  assert.equal(decoded.ok,false)
  assert.equal(decoded.manufacturingApproved,false)
  assert.equal(calls(),0)
})

test('standard array prototype preserves valid encode/decode round-trip',()=>{
  const input=fixture()
  const packed=encode(input.snapshot,input.rules)
  assert.equal(packed.ok,true,packed.reason)
  const decoded=decode(input.snapshot,packed.json)
  assert.equal(decoded.ok,true,decoded.reason)
  assert.equal(decoded.manufacturingApproved,false)
})
