import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

function fixture(){
  const snapshot={template:{format:'marvelous-cloth-template',version:1,
    panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],
      edges:['a','b','c','d']}}]}}
  const result=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(result.ok,true,result.reason)
  return {snapshot,ruleSet:result.ruleSet}
}

function trapCounter(){
  let count=0
  const handler={
    getPrototypeOf(target){count++;return Reflect.getPrototypeOf(target)},
    getOwnPropertyDescriptor(target,key){count++;return Reflect.getOwnPropertyDescriptor(target,key)},
    ownKeys(target){count++;return Reflect.ownKeys(target)},
    get(target,key,receiver){count++;return Reflect.get(target,key,receiver)},
  }
  return {wrap:value=>new Proxy(value,handler),count:()=>count}
}

for(const path of ['snapshot','template','panels','panel','polygon','point','ruleSet','rulePanel']){
  test(`native grading rejects Proxy-backed ${path} without invoking traps`,()=>{
    const {snapshot,ruleSet}=fixture()
    const counter=trapCounter()
    let untrustedSnapshot=snapshot
    let untrustedRules=ruleSet
    if(path==='snapshot')untrustedSnapshot=counter.wrap(snapshot)
    if(path==='template')snapshot.template=counter.wrap(snapshot.template)
    if(path==='panels')snapshot.template.panels=counter.wrap(snapshot.template.panels)
    if(path==='panel')snapshot.template.panels[0]=counter.wrap(snapshot.template.panels[0])
    if(path==='polygon')snapshot.template.panels[0].polygon=counter.wrap(snapshot.template.panels[0].polygon)
    if(path==='point')snapshot.template.panels[0].polygon.points[0]=counter.wrap(snapshot.template.panels[0].polygon.points[0])
    if(path==='ruleSet')untrustedRules=counter.wrap(ruleSet)
    if(path==='rulePanel')ruleSet.panels.front=counter.wrap(ruleSet.panels.front)
    const result=encode(untrustedSnapshot,untrustedRules)
    assert.equal(result.ok,false,`${path} unexpectedly accepted`)
    assert.equal(result.manufacturingApproved,false)
    assert.equal(counter.count(),0,`${path} executed Proxy traps`)
  })
}

test('decode rejects Proxy-backed source before any traps',()=>{
  const {snapshot,ruleSet}=fixture()
  const packed=encode(snapshot,ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  const counter=trapCounter()
  snapshot.template.panels[0].polygon=counter.wrap(snapshot.template.panels[0].polygon)
  const restored=decode(snapshot,packed.json)
  assert.equal(restored.ok,false)
  assert.equal(restored.manufacturingApproved,false)
  assert.equal(counter.count(),0)
})

test('revoked Proxy input fails closed without an uncaught exception',()=>{
  const {snapshot,ruleSet}=fixture()
  const revoked=Proxy.revocable(snapshot.template,{})
  revoked.revoke()
  snapshot.template=revoked.proxy
  const result=encode(snapshot,ruleSet)
  assert.equal(result.ok,false)
  assert.equal(result.manufacturingApproved,false)
})

test('plain source and grade rule round-trip remains valid',()=>{
  const {snapshot,ruleSet}=fixture()
  const packed=encode(snapshot,ruleSet)
  assert.equal(packed.ok,true,packed.reason)
  const restored=decode(snapshot,packed.json)
  assert.equal(restored.ok,true,restored.reason)
  assert.equal(restored.manufacturingApproved,false)
})
