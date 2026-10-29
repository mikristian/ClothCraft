import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

function fixture(){
  const snapshot={template:{panels:[{id:'front',polygon:{
    points:[[0,0],[0.2,0],[0.2,0.3],[0,0.3]],edges:['a','b','c','d'],
  }}]}}
  const created=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(created.ok,true,created.reason)
  return {snapshot,ruleSet:created.ruleSet}
}

test('template sewing and material/production declarations invalidate stale grade sidecars',()=>{
  const {snapshot,ruleSet}=fixture()
  snapshot.template.seams=[{id:'shoulder',a:{panel:'front',edge:'a'},b:{panel:'front',edge:'c'}}]
  snapshot.template.fabrics=[{id:'shell',shrinkagePercent:2}]
  snapshot.template.fabricId='shell'
  snapshot.template.productionSpec={cutOnFold:false}
  const encoded=encode(snapshot,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  assert.equal(decode(snapshot,encoded.json).ok,true)
  for(const change of [
    s=>{s.template.seams[0].a.edge='b'},
    s=>{s.template.fabrics[0].shrinkagePercent=5},
    s=>{s.template.fabricId='interfacing'},
    s=>{s.template.productionSpec.cutOnFold=true},
    s=>{delete s.template.seams},
  ]){
    const changed=structuredClone(snapshot)
    change(changed)
    const decoded=decode(changed,encoded.json)
    assert.equal(decoded.ok,false,JSON.stringify(change))
    assert.match(decoded.reason,/source geometry|source provenance/i)
  }
})

test('snapshot manufacturing settings invalidate stale grade sidecars',()=>{
  const {snapshot,ruleSet}=fixture()
  snapshot.fabricSettings={main:{shrinkagePercent:2}}
  snapshot.productionSpec={seamAllowanceMm:10}
  const encoded=encode(snapshot,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  for(const change of [
    s=>{s.fabricSettings.main.shrinkagePercent=5},
    s=>{s.productionSpec.seamAllowanceMm=12},
    s=>{delete s.productionSpec},
  ]){
    const changed=structuredClone(snapshot)
    change(changed)
    assert.equal(decode(changed,encoded.json).ok,false)
  }
})

test('runtime view/revision changes do not invalidate manufacturing provenance',()=>{
  const {snapshot,ruleSet}=fixture()
  const encoded=encode(snapshot,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  snapshot.revision=999
  snapshot.view={camera:{zoom:5}}
  snapshot.selectedPanelId='front'
  assert.equal(decode(snapshot,encoded.json).ok,true)
  assert.equal(encode(snapshot,ruleSet).json,encoded.json)
})

test('declared manufacturing metadata rejects hidden/accessor/non-JSON values',()=>{
  for(const mutate of [
    s=>{s.template.productionSpec={cutOnFold:Infinity}},
    s=>{s.fabricSettings={main:{shrinkagePercent:undefined}}},
    s=>{Object.defineProperty(s.template,'seams',{value:[]})},
    s=>{Object.defineProperty(s.template,'fabrics',{enumerable:true,get(){throw Error('getter executed')}})},
    s=>{Object.defineProperty(s,'productionSpec',{enumerable:true,get(){throw Error('getter executed')}})},
  ]){
    const {snapshot,ruleSet}=fixture()
    mutate(snapshot)
    const encoded=encode(snapshot,ruleSet)
    assert.equal(encoded.ok,false)
    assert.doesNotMatch(encoded.reason,/getter executed/)
  }
})

test('manufacturing metadata object key order remains byte stable',()=>{
  const {snapshot,ruleSet}=fixture()
  snapshot.productionSpec={seamAllowanceMm:10,cutOnFold:false}
  const encoded=encode(snapshot,ruleSet)
  assert.equal(encoded.ok,true,encoded.reason)
  const reordered=structuredClone(snapshot)
  reordered.productionSpec={cutOnFold:false,seamAllowanceMm:10}
  assert.equal(decode(reordered,encoded.json).ok,true)
  assert.equal(encode(reordered,ruleSet).json,encoded.json)
})
