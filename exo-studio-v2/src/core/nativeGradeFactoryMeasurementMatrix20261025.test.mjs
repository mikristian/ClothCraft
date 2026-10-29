import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectNativeGradeMeasurementMatrix20261025 as inspect,
  exportNativeGradeMeasurementCsv20261025 as csv} from './nativeGradeFactoryMeasurementMatrix20261025.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

const box=(x=0)=>({points:[[x,0],[x+.2,0],[x+.2,.3],[x,.3]],edges:['top','right','bottom','left']})
const fixture=()=>({revision:22,template:{panels:[
  {id:'front',polygon:box()},{id:'back',polygon:{...box(.4),curves:{top:[[.45,-.06],[.55,-.06]]}}},
],seams:[]}})
const init=s=>createAccuMarkNativeRuleSet(s).ruleSet

test('full physical edge grade matrix has exact ordered XS–XXL coverage and base deltas',()=>{
  const source=fixture(),copy=structuredClone(source)
  let rules=init(source)
  const edited=editAccuMarkNativePointRule(source,rules,{panelId:'front',pointIndex:0,size:'L',dxMm:14,dyMm:-6})
  assert.equal(edited.ok,true,edited.reason)
  rules=edited.ruleSet
  const report=inspect(source,rules)
  assert.equal(report.ok,true,report.reason)
  assert.equal(report.reviewReady,true)
  assert.equal(report.sewingReady,false)
  assert.equal(report.pomReady,false)
  assert.equal(report.edgeCount,8)
  assert.equal(report.edgeRows.length,48)
  assert.equal(report.cutPreflight.rows.length,48)
  assert.equal(report.cutPreflight.cutEvidenceReady,false)
  assert(report.cutPreflight.issues.some(x=>x.code==='MISSING_ALLOWANCE'&&x.size==='XXL'))
  assert(report.cutPreflight.issues.some(x=>x.code==='NOTCH_INVENTORY_MISSING'))
  assert(report.cutPreflight.issues.some(x=>x.code==='RECEIVING_CAD_UNVERIFIED'))
  assert.deepEqual(report.sizes,['XS','S','M','L','XL','XXL'])
  assert.deepEqual(report.edgeRows.filter(row=>row.panelId==='front'&&row.id==='top').map(row=>row.size),report.sizes)
  const base=report.edgeRows.find(row=>row.panelId==='front'&&row.id==='top'&&row.size==='M')
  const large=report.edgeRows.find(row=>row.panelId==='front'&&row.id==='top'&&row.size==='L')
  assert.equal(base.actualMm,200)
  assert.equal(base.baseDeltaMm,0)
  assert(Math.abs(large.actualMm-186)<0.3)
  assert.equal(large.precedingSize,'M')
  assert.equal(large.adjacentGrowthMm,large.actualMm-base.actualMm)
  const curved=report.edgeRows.find(row=>row.panelId==='back'&&row.id==='top'&&row.size==='M')
  assert(Math.abs(curved.actualMm-nativeRustEdgeLength20261023(source.template.panels[1].polygon,'top').totalLengthM*1000)<1e-8)
  assert.equal(report.manufacturingApproved,false)
  assert.equal(report.factoryCertified,false)
  assert.deepEqual(source,copy)
})

test('physical seam mismatch, missing POM targets and unsown catalogs are never factory approved',()=>{
  const source=fixture(),rules=init(source)
  source.template.seams=[{id:'joined',a:{panel:'front',edge:'right',range:[0,1]},
    b:{panel:'back',edge:'right',range:[0,1]},reverse_b:true,allow_ease:false}]
  const run=inspect(source,rules)
  assert.equal(run.ok,true)
  assert.equal(run.sewingReady,true)
  assert(run.cutPreflight.issues.some(x=>x.code==='SEWN_CUTLINE_PROOF_REQUIRED'))
  assert.equal(run.seamRows.length,6)
  assert.equal(run.manufacturingApproved,false)
  assert.equal(run.cuttingsAuthorized,undefined)
  const moved=editAccuMarkNativePointRule(source,rules,{panelId:'back',pointIndex:2,size:'XL',dxMm:10,dyMm:18})
  assert(moved.ok)
  const broken=inspect(source,moved.ruleSet)
  assert.equal(broken.ok,true)
  assert.equal(broken.sewingReady,false)
  assert(broken.seamRows.some(row=>row.size==='XL'&&row.status==='SEAM_MISMATCH'))
  assert.equal(broken.manufacturingApproved,false)
})

test('CSV includes material units and source-only warning; sanitizes adversarial spreadsheet formulas',()=>{
  const source=fixture()
  source.template.panels[0].id='=HYPERLINK(1)'
  const result=inspect(source,init(source))
  assert(result.ok,result.reason)
  const body=csv(result)
  assert.match(body,/SOURCE-ONLY GRADE METROLOGY/)
  assert.match(body,/"units","mm"/)
  assert.match(body,/"manufacturingApproved","false"/)
  assert.match(body,/"'=HYPERLINK\(1\)"/)
  assert.match(body,/"edge","'=HYPERLINK\(1\)"/)
  assert.throws(()=>csv({ok:false,rows:[]}),/complete six-size measurement matrix/)
})

test('rejects source/size drift instead of emitting partial manufacturing matrix',()=>{
  const source=fixture(),rules=init(source)
  source.template.panels[0].polygon.points[1][0]+=.01
  assert.equal(inspect(source,rules).ok,false)
  const changed=fixture(),bad=init(changed)
  bad.sizes.reverse()
  assert.equal(inspect(changed,bad).ok,false)
})
