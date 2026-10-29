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

test('source snapshot template getter is rejected without execution',()=>{
  const {snapshot,ruleSet}=fixture()
  let calls=0
  const untrusted={}
  Object.defineProperty(untrusted,'template',{enumerable:true,get(){calls++;return snapshot.template}})
  const result=encode(untrusted,ruleSet)
  assert.equal(result.ok,false)
  assert.equal(calls,0)
})

test('sidecar import rejects accessor-backed source before running getters',()=>{
  const {snapshot,ruleSet}=fixture()
  const packed=encode(snapshot,ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  let calls=0
  const untrusted={}
  Object.defineProperty(untrusted,'template',{enumerable:true,get(){calls++;return snapshot.template}})
  const restored=decode(untrusted,packed.json)
  assert.equal(restored.ok,false)
  assert.equal(calls,0)
})

test('source template panels getter is rejected without execution',()=>{
  const {snapshot,ruleSet}=fixture()
  let calls=0
  const untrusted={template:{...snapshot.template}}
  Object.defineProperty(untrusted.template,'panels',{enumerable:true,get(){calls++;return snapshot.template.panels}})
  const result=encode(untrusted,ruleSet)
  assert.equal(result.ok,false)
  assert.equal(calls,0)
})

test('inherited snapshot template getter is never invoked',()=>{
  const {snapshot,ruleSet}=fixture()
  let calls=0
  const untrusted=Object.create({get template(){calls++;return snapshot.template}})
  const result=encode(untrusted,ruleSet)
  assert.equal(result.ok,false)
  assert.equal(calls,0)
})

test('ordinary native source still round-trips with schema metadata',()=>{
  const {snapshot,ruleSet}=fixture()
  const packed=encode(snapshot,ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  assert.equal(decode(snapshot,packed.json).ok,true)
})
