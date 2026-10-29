import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeGradedSewnSeamQA20261023 as audit} from './accumarkNativeGradedSewnSeamQA20261023.js'
import {proposeNativeGradedSeamMatch20261025 as propose} from './nativeGradedSeamMatchProposal20261025.js'

const polygon=()=>({points:[[0,0],[.2,0],[.2,.3],[0,.3]],
  edges:['top','right','bottom','left'],curves:{}})
const fixture=()=>({revision:12,template:{panels:[{id:'front',polygon:polygon()},
  {id:'back',polygon:polygon()}],seams:[{id:'join',
  a:{panel:'front',edge:'top',range:[0,1]},
  b:{panel:'back',edge:'top',range:[0,1]},reverse_b:true,allow_ease:false}]}})
const rules=source=>createAccuMarkNativeRuleSet(source).ruleSet

test('proposes measured XL seam repair without mutating native source or unrelated sizes',()=>{
  const source=fixture()
  const edited=editAccuMarkNativePointRule(source,rules(source),{
    panelId:'back',size:'XL',pointIndex:1,dxMm:20,dyMm:0,
  })
  assert(edited.ok,edited.reason)
  const original=structuredClone([source,edited.ruleSet])
  const before=audit(source,edited.ruleSet)
  assert.equal(before.rows.find(row=>row.size==='XL').pass,false)
  const result=propose(source,edited.ruleSet,{size:'XL',seamId:'join'})
  assert(result.ok,result.reason)
  assert(result.remainingMismatchMm<result.originalMismatchMm)
  assert.equal(result.selectedSeamWithinTolerance,true)
  assert.equal(result.allSizesSewnVerified,true)
  assert.equal(result.nativeCommitted,false)
  assert.equal(result.manufacturingApproved,false)
  assert.deepEqual([source,edited.ruleSet],original)
  assert.equal(result.ruleSet.panels.front.pointOffsetsMm.XL[0][0],0)
  assert.deepEqual(result.ruleSet.panels.back.pointOffsetsMm.M,edited.ruleSet.panels.back.pointOffsetsMm.M)
  assert(audit(source,result.ruleSet).ok)
})

test('refuses base size, already matched seams, stale source and incorrect limits',()=>{
  const source=fixture(),ruleSet=rules(source)
  for(const args of [{size:'M',seamId:'join'},{size:'XL',seamId:'join'},
    {size:'3XL',seamId:'join'},{size:'XL',seamId:'unknown'},
    {size:'XL',seamId:'join',maxPointMoveMm:Infinity}]){
    assert.equal(propose(source,ruleSet,args).ok,false)
  }
  const changed=editAccuMarkNativePointRule(source,ruleSet,{
    panelId:'back',size:'XL',pointIndex:1,dxMm:20,dyMm:0})
  source.template.panels[0].polygon.points[0][0]=.02
  assert.equal(propose(source,changed.ruleSet,{size:'XL',seamId:'join'}).ok,false)
})
