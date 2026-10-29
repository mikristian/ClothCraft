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


import {encodeAccuMarkNativeGradeSidecar20261023 as browserEncode,decodeAccuMarkNativeGradeSidecar20261023 as browserDecode} from './nativeGradeSidecarBrowser.js'
test('browser JSON codec preserves exact bytes and all six sizes',()=>{
 const snapshot=fixture(),rules=authored(snapshot),native=encode(snapshot,rules)
 const result=browserEncode(JSON.stringify(snapshot),JSON.stringify(rules))
 assert.deepEqual(result,native)
 assert.deepEqual(browserDecode(JSON.stringify(snapshot),result.json),decode(snapshot,result.json))
})
test('browser rejects object inputs without invoking proxy traps and rejects corrupt JSON',()=>{
 let reads=0;const proxy=new Proxy({},{get(){reads++;throw Error('trap')}})
 assert.equal(browserEncode(proxy,'{}').ok,false);assert.equal(reads,0)
 assert.equal(browserDecode('{}','{broken').ok,false)
})
