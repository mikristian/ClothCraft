import test from 'node:test'
import assert from 'node:assert/strict'
import {seedAccuMarkNativeRulesFromAffine20261023 as seed} from './accumarkNativeRuleSeed20261023.js'
import {buildAccuMarkNativeMultiPanelNest20261023 as build} from './accumarkNativeMultiPanelNest20261023.js'
import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'

const snapshot=()=>({revision:3,template:{panels:[
 {id:'front',polygon:{points:[[0,0],[.3,0],[.3,.4],[0,.4]],edges:['a','b','c','d']}},
 {id:'back',polygon:{points:[[.1,0],[.4,0],[.4,.4],[.1,.4]],edges:['a','b','c','d']}},
],seams:[]},panels:[
 {id:'front',boundaries:{a:[0,1,2,3]},layout:[0,0]},
 {id:'back',boundaries:{a:[4,5,6,7]},layout:[.5,0]},
],uv:[[0,0],[.3,0],[.3,.4],[0,.4],[.1,0],[.4,0],[.4,.4],[.1,.4]]})

test('verified two-panel native affine grades convert to independent six-size source point rules',()=>{
 const source=snapshot(),unchanged=structuredClone(source)
 const affine=build(source,{widthStepMm:10,heightStepMm:5})
 assert.equal(affine.ok,true,affine.reason)
 const result=seed(source,affine)
 assert.equal(result.ok,true,result.reason)
 const compiled=compileAccuMarkNativeRuleSizeRun(source,result.ruleSet)
 assert.equal(compiled.ok,true,compiled.reason)
 assert.equal(Object.keys(compiled.byPanel).length,2)
 assert.equal(Object.keys(compiled.byPanel.front.sizeRun).length,6)
 assert.notDeepEqual(result.ruleSet.panels.front.pointOffsetsMm.XS,result.ruleSet.panels.front.pointOffsetsMm.XL)
 assert.deepEqual(source,unchanged)
})

test('rejects partial, stale and forged affine outlines instead of guessing',()=>{
 const source=snapshot(),affine=build(source,{widthStepMm:10,heightStepMm:5})
 assert.equal(seed(source,{...affine,source:'REUSED_OUTSIDE_VERIFIED_RUN'}).ok,false)
 const partial=structuredClone(affine)
 delete partial.byPanel.back
 assert.equal(seed(source,partial).ok,false)
 const corrupt=structuredClone(affine)
 corrupt.byPanel.front.sizeRun.XL.polygon.points[2][0]=NaN
 assert.equal(seed(source,corrupt).ok,false)
})
