import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {
  encodeAccuMarkNativeGradeSidecar20261023 as encode,
  decodeAccuMarkNativeGradeSidecar20261023 as decode,
} from './accumarkNativeGradeSidecarRoundTrip20261023.js'

const fixture=()=>({template:{panels:[{
  id:'front',polygon:{points:[[0,0],[.2,0],[0,.2]],edges:['a','b','c']},
}]}})

test('valid panel collection preserves the canonical native grading sidecar round-trip',()=>{
  const snapshot=fixture(),rules=createAccuMarkNativeRuleSet(snapshot).ruleSet
  const packed=encode(snapshot,rules)
  assert.equal(packed.ok,true,packed.reason)
  const restored=decode(snapshot,packed.json)
  assert.equal(restored.ok,true,restored.reason)
  assert.equal(restored.canonicalJson,packed.json)
  assert.equal(restored.manufacturingApproved,false)
})

test('named and hidden panel-array metadata cannot silently disappear from source provenance',()=>{
  for(const decorate of [
    panels=>{panels.cuttingInstruction='CUT_ON_FOLD'},
    panels=>Object.defineProperty(panels,'cuttingInstruction',{value:'CUT_ON_FOLD'}),
    panels=>{panels[Symbol('cuttingInstruction')]='CUT_ON_FOLD'},
  ]){
    const snapshot=fixture(),rules=createAccuMarkNativeRuleSet(snapshot).ruleSet
    const original=encode(snapshot,rules)
    assert.equal(original.ok,true,original.reason)
    decorate(snapshot.template.panels)
    const encoded=encode(snapshot,rules)
    const decoded=decode(snapshot,original.json)
    assert.equal(encoded.ok,false,'array metadata must fail closed on encode')
    assert.equal(decoded.ok,false,'stale sidecar must fail closed on decode')
    assert.equal(encoded.manufacturingApproved,false)
    assert.equal(decoded.manufacturingApproved,false)
  }
})

test('panel-array accessors are rejected without executing getter side effects',()=>{
  const snapshot=fixture(),rules=createAccuMarkNativeRuleSet(snapshot).ruleSet
  const original=encode(snapshot,rules)
  let getterCalls=0
  Object.defineProperty(snapshot.template.panels,'cuttingInstruction',{
    enumerable:true,get(){getterCalls++;return 'CUT_ON_FOLD'},
  })
  assert.equal(encode(snapshot,rules).ok,false)
  assert.equal(decode(snapshot,original.json).ok,false)
  assert.equal(getterCalls,0)
})

test('sparse native panel arrays fail closed before provenance or grading compilation',()=>{
  const snapshot=fixture(),rules=createAccuMarkNativeRuleSet(snapshot).ruleSet
  const original=encode(snapshot,rules)
  snapshot.template.panels.length=2
  assert.equal(encode(snapshot,rules).ok,false)
  assert.equal(decode(snapshot,original.json).ok,false)
})
