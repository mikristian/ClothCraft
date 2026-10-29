import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023 as encode,decodeAccuMarkNativeGradeSidecar20261023 as decode} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

const fixture=()=>({template:{panels:[
 {id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d']}},
 {id:'back',polygon:{points:[[.1,0],[.32,0],[.32,.35],[.1,.35]],edges:['a','b','c','d'],curves:{a:[[.15,-.05],[.27,-.05]]},free_curve_points:{b:[{t:.5,position:[.35,.17],derivative:[0,.3]}]}}},
]}})
function authored(snapshot){
 let rules=createAccuMarkNativeRuleSet(snapshot).ruleSet
 for(const edit of [
  {panelId:'front',pointIndex:0,size:'XS',dxMm:-12,dyMm:-5},
  {panelId:'front',pointIndex:2,size:'XXL',dxMm:26,dyMm:18},
  {panelId:'back',pointIndex:1,size:'L',dxMm:9,dyMm:3},
  {panelId:'back',pointIndex:3,size:'XL',dxMm:-1,dyMm:24},
 ]){
  const result=editAccuMarkNativePointRule(snapshot,rules,edit)
  assert.equal(result.ok,true,result.reason)
  rules=result.ruleSet
 }
 return rules
}

test('versioned lossless two-panel six-size sidecar, byte-stable and immutable',()=>{
 const source=fixture(),before=structuredClone(source),rules=authored(source)
 const original=structuredClone(rules)
 const first=encode(source,rules)
 assert.equal(first.ok,true,first.reason)
 assert(first.byteLength<2*1024*1024)
 const restored=decode(source,first.json)
 assert.equal(restored.ok,true,restored.reason)
 assert.deepEqual(restored.ruleSet,rules)
 assert.equal(restored.manufacturingApproved,false)
 assert.equal(restored.canonicalJson,first.json)
 assert.equal(encode(source,restored.ruleSet).json,first.json)
 assert.deepEqual(source,before)
 assert.deepEqual(rules,original)
})

test('changed source vertex, cubic controls, free knot, topology and panel identity invalidate imports',()=>{
 const source=fixture(),rules=authored(source),packed=encode(source,rules)
 assert.equal(packed.ok,true,packed.reason)
 for(const change of [
  s=>{s.template.panels[0].polygon.points[1][0]+=.001},
  s=>{s.template.panels[1].polygon.curves.a[0][1]+=.002},
  s=>{s.template.panels[1].polygon.free_curve_points.b[0].derivative[0]+=.1},
  s=>{s.template.panels[0].polygon.edges[0]='renamed'},
  s=>{s.template.panels[1].id='renamed'},
 ]){
  const changed=structuredClone(source)
  change(changed)
  assert.equal(decode(changed,packed.json).ok,false)
 }
 assert.equal(decode(source,packed.json).ok,true)
})

test('bad JSON, unsupported version, corruption, duplicate panel and sizes fail closed',()=>{
 const source=fixture(),rules=authored(source),packed=encode(source,rules)
 assert.equal(decode(source,'{invalid').ok,false)
 assert.equal(decode(source,' '.repeat(2*1024*1024)).ok,false)
 assert.match(decode(source,packed.json.replace('"version":1','"version":1,"version":1')).reason,/Duplicate/)
 assert.match(decode(source,packed.json.replace('"front":{','"front":{},"front":{')).reason,/Duplicate/)
 const altered=JSON.parse(packed.json)
 altered.version=2
 assert.equal(decode(source,JSON.stringify(altered)).ok,false)
 altered.version=1
 altered.ruleSet.panels.front.pointOffsetsMm.L[0]=[null,3]
 assert.equal(decode(source,JSON.stringify(altered)).ok,false)
 const invalidSize=structuredClone(rules)
 invalidSize.sizes[1]=invalidSize.sizes[0]
 assert.equal(encode(source,invalidSize).ok,false)
 const badPanels=structuredClone(rules)
 badPanels.panels.extra=structuredClone(badPanels.panels.front)
 assert.equal(encode(source,badPanels).ok,false)
 const missing=structuredClone(rules)
 delete missing.panels.back.pointOffsetsMm.XXL
 assert.equal(encode(source,missing).ok,false)
})

test('source and rules with nonfinite or unrepresentable values never serialize silently',()=>{
 const source=fixture(),rules=authored(source)
 const invalid=structuredClone(rules)
 invalid.panels.front.pointOffsetsMm.XL[0][0]=Infinity
 assert.match(encode(source,invalid).reason,/Nonfinite/)
 const undef=structuredClone(rules)
 undef.panels.front.pointOffsetsMm.L[1][0]=undefined
 assert.equal(encode(source,undef).ok,false)
 const changed=structuredClone(source)
 changed.template.panels[1].polygon.curves.a[0][0]=NaN
 assert.equal(encode(changed,rules).ok,false)
 assert.equal(encode(source,rules).ok,true)
})
