import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule,compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {applyModarisF7SizeEvolution20261028 as change,copyModarisF7SizeTable20261028 as copy,MODARIS_F7_EXO_ACTIONS_20261028} from './modarisF7SizeEvolution20261028.js'

const source={template:{panels:[{id:'front',polygon:{
 points:[[0.1,0.1],[0.4,0.1],[0.4,0.5],[0.1,0.5]],
 edges:['top','right','bottom','left'],curves:{},notches:{},seam_allowances:{},
}}]}}
const newRules=()=>{
 const result=createAccuMarkNativeRuleSet(source)
 assert.equal(result.ok,true,result.reason)
 let rules=result.ruleSet
 for(const [size,dx] of [['XS',-20],['S',-10],['L',10],['XL',20],['XXL',30]]){
  const edited=editAccuMarkNativePointRule(source,rules,{panelId:'front',pointIndex:0,size,dxMm:dx,dyMm:0})
  assert.equal(edited.ok,true,edited.reason)
  rules=edited.ruleSet
 }
 return rules
}
const run=(rules,action,params={})=>change(source,rules,{action,...params})
test('all executable F7 actions form a deliberate, bounded working inventory',()=>{
 assert.equal(MODARIS_F7_EXO_ACTIONS_20261028.length,11)
 assert.equal(new Set(MODARIS_F7_EXO_ACTIONS_20261028).size,11)
})
test('intermediate and appended sizes interpolate all vertices, preserve base and validate source geometry',()=>{
 const first=newRules(),before=structuredClone(first)
 const midpoint=run(first,'add-intermediate-size',{name:'ML',leftSize:'M',rightSize:'L'})
 assert.equal(midpoint.ok,true,midpoint.reason)
 assert.deepEqual(first,before,'original grading rules must never mutate')
 assert.deepEqual(midpoint.ruleSet.panels.front.pointOffsetsMm.ML[0],[5,0])
 assert.equal(midpoint.ruleSet.sizes.indexOf('ML'),3)
 const extended=run(midpoint.ruleSet,'add-size-to-product',{name:'3XL'})
 assert.equal(extended.ok,true,extended.reason)
 assert.deepEqual(extended.ruleSet.panels.front.pointOffsetsMm['3XL'][0],[40,0])
 assert.equal(compileAccuMarkNativeRuleSizeRun(source,extended.ruleSet,{selectedSize:'3XL'}).ok,true)
 const removed=run(extended.ruleSet,'delete-size-from-product',{size:'3XL'})
 assert.equal(removed.ok,true,removed.reason)
 assert.equal(removed.ruleSet.sizes.includes('3XL'),false)
 assert.equal(run(midpoint.ruleSet,'delete-size-from-product',{size:'M'}).ok,false,'cannot delete native source size')
})
test('size aliases, grouping and breaking correspondences edit genuine stored draft state',()=>{
 let rules=newRules()
 const attach=run(rules,'add-size-correspondence',{size:'XL',alias:'US16'})
 assert.equal(attach.ok,true,attach.reason);rules=attach.ruleSet
 assert.equal(rules.sizeEvolution.correspondences.US16,'XL')
 assert.equal(run(rules,'add-size-correspondence',{size:'L',alias:'US16'}).ok,false)
 const group=run(rules,'size-grouping',{size:'XL',group:'Extended'})
 assert.equal(group.ok,true,group.reason);rules=group.ruleSet
 assert.equal(rules.sizeEvolution.groups.XL,'Extended')
 const broken=run(rules,'break-size',{size:'XL'})
 assert.equal(broken.ok,true,broken.reason)
 assert.deepEqual(broken.ruleSet.panels.front.pointOffsetsMm.XL,rules.panels.front.pointOffsetsMm.XL)
 assert.equal(broken.ruleSet.sizeEvolution.correspondences.US16,undefined)
 const added=run(rules,'delete-size-correspondence',{alias:'US16'})
 assert.equal(added.ok,true,added.reason)
 assert.equal(run(added.ruleSet,'delete-size-correspondence',{alias:'US16'}).ok,false)
 const cleared=run(group.ruleSet,'size-grouping',{size:'XL',group:''})
 assert.equal(cleared.ok,true,cleared.reason)
 assert.equal(cleared.ruleSet.sizeEvolution.groups.XL,undefined)
})
test('copy/load size tables require matching physical source identity and reject tampered measurements',()=>{
 const original=newRules(),published=copy(source,original)
 assert.equal(published.ok,true,published.reason)
 assert.deepEqual(published.table.sizes,original.sizes)
 const altered=run(original,'add-intermediate-size',{name:'ML',leftSize:'M',rightSize:'L'})
 assert.equal(altered.ok,true,altered.reason)
 const restored=run(altered.ruleSet,'load-size-table',{table:published.table})
 assert.equal(restored.ok,true,restored.reason)
 assert.deepEqual(restored.ruleSet.panels.front.pointOffsetsMm,original.panels.front.pointOffsetsMm)
 for(const mutate of [
  table=>table.templateFingerprint='tampered',
  table=>table.panels.front.XL[0][0]=Infinity,
  table=>table.panels.front.M[0][0]=1,
  table=>table.sizes.push('XL'),
  table=>delete table.panels.front.XS,
  table=>table.panels.front.L.pop(),
 ]){
  const corrupted=structuredClone(published.table);mutate(corrupted)
  const result=run(original,'load-size-table',{table:corrupted})
  assert.equal(result.ok,false,'corrupted table cannot be accepted')
 }
})
test('fail-closed interpolation rejects invalid names, stale native source, out-of-range vector and invalid brackets',()=>{
 const rules=newRules()
 for(const candidate of [
  {name:'M',leftSize:'M',rightSize:'L'},
  {name:'__proto__',leftSize:'M',rightSize:'L'},
  {name:'NEW',leftSize:'L',rightSize:'M'},
  {name:'NEW',leftSize:'M',rightSize:'L',fraction:1},
  {name:'NEW',leftSize:'M',rightSize:'L',fraction:-0.01},
 ])assert.equal(run(rules,'add-intermediate-size',candidate).ok,false)
 const stale=structuredClone(source);stale.template.panels[0].polygon.points[0][0]+=0.01
 assert.equal(change(stale,rules,{action:'add-size-to-product',name:'3XL'}).ok,false)
 const modified=structuredClone(rules);modified.panels.front.pointOffsetsMm.XXL[0][0]=1e6
 assert.equal(run(modified,'add-size-to-product',{name:'3XL'}).ok,false)
 for(const action of ['evolution-table','size-correspondence-management']){
  const viewed=run(rules,action)
  assert.equal(viewed.ok,true,viewed.reason)
  assert.equal(viewed.ruleSet,undefined,'view navigation must not pretend it changed the pattern')
 }
})
