import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assessNamedSizeGoldenRun42,createGoldenDraftRun42,
} from './qa-g27-named-size-golden-run42-20261029.mjs'
import {compileAccuMarkNativeRuleSizeRun} from '../src/core/accumarkNativePointRuleSet20261023.js'
import {auditAccuMarkNativeRuleSizeQA20261023} from '../src/core/accumarkNativeRuleSizeQA20261023.js'
const clone=structuredClone
test('eight panel/name physical rows and 32 hand-authored point coordinates match to 0.01mm',()=>{
  const {compiled,audit}=createGoldenDraftRun42()
  const verdict=assessNamedSizeGoldenRun42(compiled,audit)
  assert.equal(verdict.pass,true,JSON.stringify(verdict.errors))
  assert.equal(verdict.rowsChecked,8)
  assert.equal(verdict.pointsChecked,32)
  assert.equal(verdict.g27Passed,false)
  assert.equal(verdict.rustPersistedGradeVerified,false)
})
test('golden detector refuses mm/metre drift, reordered sizes, swapped panels and missed POM',()=>{
  const {compiled,audit}=createGoldenDraftRun42()
  const bad=[
    (c,a)=>{c.byPanel.front.sizeRun.Tall.polygon.points[1][0]+=.001},
    (c,a)=>{c.byPanel.front.sizeRun.Petite.polygon.points[1][0]*=1000},
    (c,a)=>{c.byPanel.back.sizes.reverse()},
    (c,a)=>{const x=c.byPanel.front;c.byPanel.front=c.byPanel.back;c.byPanel.back=x},
    (c,a)=>{a.panels[0].widthMm+=2},
    (c,a)=>{a.panels.splice(0,1)},
    (c,a)=>{a.panels.push(a.panels[0])},
    (c,a)=>{a.blocks=true},
  ]
  for(const mutation of bad){
    const c=clone(compiled),a=clone(audit)
    mutation(c,a)
    assert.equal(assessNamedSizeGoldenRun42(c,a).pass,false)
  }
})
test('native draft rules reject stale source, missing sizes, forged base offsets and duplicate aliases',()=>{
  const {snapshot,rules}=createGoldenDraftRun42()
  const variants=[
    r=>{delete r.panels.front.pointOffsetsMm.Petite},
    r=>{r.sizes[0]='M'},
    r=>{r.panels.front.pointOffsetsMm.M[0]=[1,0]},
    r=>{r.templateFingerprint='fnv1a32:00000000:0'},
  ]
  for(const mutation of variants){
    const corrupted=clone(rules);mutation(corrupted)
    assert.equal(compileAccuMarkNativeRuleSizeRun(snapshot,corrupted).ok,false)
  }
  const stale=clone(snapshot)
  stale.template.panels[1].polygon.points[2][0]+=.003
  assert.equal(compileAccuMarkNativeRuleSizeRun(stale,rules).ok,false)
  const invalid=auditAccuMarkNativeRuleSizeQA20261023(stale,rules,{allowNamedSizes:true})
  assert.equal(invalid.ok,false)
  assert.equal(invalid.manufacturingApproved,false)
})
