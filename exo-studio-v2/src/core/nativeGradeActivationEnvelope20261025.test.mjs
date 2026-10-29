import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectNativeGradeActivationEnvelope20261025 as inspect} from './nativeGradeActivationEnvelope20261025.js'
import {prepareNativeGradeCatalog20261025 as prepare} from './nativeGradeCatalogBridge20261025.js'

const source=()=>({revision:4,template:{panels:[{id:'front',
  pattern:{width:.2,height:.3,nx:1,ny:1},polygon:{
    points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['top','right','hem','left']}}],
  seams:[],fabrics:[]}})
const rules=s=>createAccuMarkNativeRuleSet(s).ruleSet
test('unchanged native six-size source fits declared pattern envelope without manufacturing approval',()=>{
  const s=source(),r=rules(s),report=inspect(s,r)
  assert(report.ok,report.reason)
  assert.equal(report.checkedSizes,6)
  assert.equal(report.nativeActivationReady,true)
  assert.equal(report.manufacturingApproved,false)
})
test('positive outward size grading uses a temporary native compile envelope while source metadata is unchanged',()=>{
  const s=source()
  const original=structuredClone(s)
  const changed=editAccuMarkNativePointRule(s,rules(s),
    {panelId:'front',size:'XL',pointIndex:1,dxMm:15,dyMm:0})
  assert(changed.ok,changed.reason)
  const result=inspect(s,changed.ruleSet)
  assert.equal(result.nativeActivationReady,true)
  assert.equal(result.temporaryEnvelopeOnly,true)
  assert.deepEqual(result.issues,[])
  assert.deepEqual(result.panelRequirements[0].declaredBoundsMm,[200,300])
  assert(Math.abs(result.panelRequirements[0].minimumSourceBoundsMm[0]-215)<1e-7)
  assert(Math.abs(result.panelRequirements[0].temporaryCompileBoundsMm[0]-215)<1e-7)
  assert.equal(result.panelRequirements[0].canExpandSourceEnvelope,true)
  assert.equal(result.panelRequirements[0].requiresSourceRepositioning,false)
  const catalog=prepare(s,{template:structuredClone(s.template)},changed.ruleSet)
  assert.equal(catalog.ok,true,catalog.reason)
  assert.deepEqual(JSON.parse(JSON.stringify(catalog.gradeRun.baseTemplate)),s.template)
  assert(catalog.gradeRun.gradedTemplates.every(template=>template.panels[0].pattern.width===.2))
  assert.deepEqual(s,original,'temporary fitting bounds must never rewrite authored source')
})
test('negative and malformed coordinates fail closed; absent native envelopes are not treated as proof',()=>{
  const s=source()
  const changed=editAccuMarkNativePointRule(s,rules(s),
    {panelId:'front',size:'XS',pointIndex:0,dxMm:-1,dyMm:0})
  assert(changed.ok)
  const negative=inspect(s,changed.ruleSet)
  assert.equal(negative.ok,false)
  assert.equal(negative.panelRequirements[0].requiresSourceRepositioning,true)
  assert.equal(negative.panelRequirements[0].canExpandSourceEnvelope,false)
  const unverified=source()
  delete unverified.template.panels[0].pattern
  const result=inspect(unverified,rules(unverified))
  assert.equal(result.ok,false)
  assert.equal(result.issues[0].code,'GRADE_NATIVE_ENVELOPE_UNVERIFIED')
  const invalid=source()
  invalid.template.panels[0].pattern.width=Infinity
  assert.equal(inspect(invalid,rules(invalid)).ok,false)
  const oversized=source()
  const r=rules(oversized)
  const excessive=editAccuMarkNativePointRule(oversized,r,
    {panelId:'front',size:'XXL',pointIndex:1,dxMm:9900,dyMm:0})
  assert(excessive.ok,excessive.reason)
  const rejected=inspect(oversized,excessive.ruleSet)
  assert.equal(rejected.ok,false)
  assert(rejected.issues.some(issue=>issue.code==='GRADE_UNSUPPORTED_NATIVE_POINT'))
})
