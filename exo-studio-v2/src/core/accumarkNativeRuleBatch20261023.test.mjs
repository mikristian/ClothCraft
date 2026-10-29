import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {copyAccuMarkNativePointRules20261023 as copy} from './accumarkNativeRuleBatch20261023.js'

const fixture=()=>({template:{panels:[
 {id:'front',polygon:{points:[[0,0],[.25,0],[.25,.4],[0,.4]],edges:['a','b','c','d']}},
 {id:'back',polygon:{points:[[.1,0],[.35,0],[.35,.4],[.1,.4]],edges:['a','b','c','d']}},
]}})
test('copy Y-only native signed rule across panels preserves destination X and base',()=>{
 const source=fixture()
 const initialized=createAccuMarkNativeRuleSet(source)
 const authored=editAccuMarkNativePointRule(source,initialized.ruleSet,{
  panelId:'front',pointIndex:0,size:'XL',dxMm:17,dyMm:-8,
 })
 assert.equal(authored.ok,true,authored.reason)
 const unchanged=structuredClone(authored.ruleSet)
 const result=copy(source,authored.ruleSet,{
  source:{panelId:'front',pointIndex:0},
  targets:[{panelId:'back',pointIndex:1},{panelId:'back',pointIndex:2}],axis:'y',
 })
 assert.equal(result.ok,true,result.reason)
 for(const index of [1,2]){
  assert.deepEqual(result.ruleSet.panels.back.pointOffsetsMm.XL[index],[0,-8])
  assert.deepEqual(result.ruleSet.panels.back.pointOffsetsMm.M[index],[0,0])
 }
 assert.deepEqual(authored.ruleSet,unchanged)
 assert.equal(result.validation.manufacturingApproved,false)
})
test('rejects self, duplicate, missing and unsafe axis instead of partial commits',()=>{
 const source=fixture(),ruleSet=createAccuMarkNativeRuleSet(source).ruleSet
 const spec={source:{panelId:'front',pointIndex:1},targets:[{panelId:'back',pointIndex:0}]}
 assert.equal(copy(source,ruleSet,{...spec,axis:'flip'}).ok,false)
 assert.equal(copy(source,ruleSet,{...spec,targets:[spec.source]}).ok,false)
 assert.equal(copy(source,ruleSet,{...spec,targets:[spec.targets[0],spec.targets[0]]}).ok,false)
 assert.equal(copy(source,ruleSet,{...spec,targets:[{panelId:'missing',pointIndex:0}]}).ok,false)
})
