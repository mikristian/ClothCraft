import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule,compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {inspectNativeGradedNotchAllowance20261025 as inspect} from './nativeGradedNotchAllowance20261025.js'
import {prepareNativeGradeCatalog20261025 as prepare} from './nativeGradeCatalogBridge20261025.js'

const SIZES=['2','4','6','8','10']
function fixture(){
  const snapshot={revision:3,template:{seams:[],fabrics:[],panels:[{
    id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d'],
      seam_allowances:{a:.01,b:.01,c:.01,d:.01},
      notches:{a:[{t:.5,depth_m:.004}],b:[],c:[],d:[]}}
  }]}}
  const created=createAccuMarkNativeRuleSet(snapshot,{sizes:SIZES,baseSize:'6'})
  assert.equal(created.ok,true,created.reason)
  const changed=editAccuMarkNativePointRule(snapshot,created.ruleSet,
    {panelId:'front',pointIndex:1,size:'10',dxMm:8,dyMm:0})
  assert.equal(changed.ok,true,changed.reason)
  return {snapshot,rules:changed.ruleSet}
}

test('named canonical sizes measure every physical allowance and notch station',()=>{
  const {snapshot,rules}=fixture()
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,rules,{selectedSize:'6'})
  assert.equal(compiled.ok,true,compiled.reason)
  const report=inspect(snapshot,compiled,{namedSizes:SIZES})
  assert.equal(report.ok,true,JSON.stringify(report.issues))
  assert.equal(report.rows.length,20)
  assert.equal(report.stations.length,5)
  assert(Math.abs(report.rows.find(r=>r.size==='10'&&r.edgeId==='a').lengthMm-208)<1e-8)
  assert(Math.abs(report.stations.find(r=>r.size==='10').distanceMm-104)<1e-8)
  assert.equal(report.manufacturingApproved,false)
  const catalog=prepare(snapshot,{template:snapshot.template},rules)
  assert.equal(catalog.ok,true,catalog.reason)
  assert.equal(catalog.gradeRun.schemaVersion,2)
  assert.equal(catalog.gradeRun.gradedTemplates.length,5)
})

test('named-size catalog refuses invalid source notch depth before native dispatch',()=>{
  const {snapshot,rules}=fixture()
  snapshot.template.panels[0].polygon.notches.a[0].depth_m=.012
  const result=prepare(snapshot,{template:snapshot.template},rules)
  assert.equal(result.ok,false)
  assert.equal(result.nativeCommitted,false)
})

test('named-size catalog refuses missing physical allowance inventory',()=>{
  const {snapshot,rules}=fixture()
  delete snapshot.template.panels[0].polygon.seam_allowances.d
  const result=prepare(snapshot,{template:snapshot.template},rules)
  assert.equal(result.ok,false)
  assert.equal(result.nativeCommitted,false)
})

test('Rust omitted empty notch edge keys normalize, but a missing authored mark fails',()=>{
  const {snapshot,rules}=fixture()
  delete snapshot.template.panels[0].polygon.notches.d
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,rules,{selectedSize:'6'})
  assert.equal(inspect(snapshot,compiled,{namedSizes:SIZES}).ok,true)
  delete compiled.byPanel.front.sizeRun['10'].polygon.notches.a
  const result=inspect(snapshot,compiled,{namedSizes:SIZES})
  assert.equal(result.ok,false)
  assert(result.issues.some(x=>x.code==='GRADED_NOTCH_IDENTITY_DRIFT'))
})

test('annotation inspector rejects forged or missing canonical size inventory',()=>{
  const {snapshot,rules}=fixture()
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,rules,{selectedSize:'6'})
  assert.equal(inspect(snapshot,compiled,{namedSizes:['2','4','6','8','8']}).ok,false)
  assert.equal(inspect(snapshot,compiled,{namedSizes:['2','4','6','8','missing']}).ok,false)
})

test('annotation inspector detects per-size allowance and notch drift',()=>{
  const {snapshot,rules}=fixture()
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,rules,{selectedSize:'6'})
  compiled.byPanel.front.sizeRun['10'].polygon.notches.a[0].t=.6
  compiled.byPanel.front.sizeRun['8'].polygon.seam_allowances.a=.02
  const report=inspect(snapshot,compiled,{namedSizes:SIZES})
  assert.equal(report.ok,false)
  assert(report.issues.some(x=>x.code==='GRADED_NOTCH_STATION_DRIFT'&&x.size==='10'))
  assert(report.issues.some(x=>x.code==='GRADED_ALLOWANCE_DRIFT'&&x.size==='8'))
})
