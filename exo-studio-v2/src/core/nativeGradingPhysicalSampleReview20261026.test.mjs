import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {createNativeGradingPOM20261025,inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {inspectNativeGradingPhysicalSampleReview20261026 as inspect,exportNativeGradingPhysicalSampleWorksheet20261026 as exportWorksheet,importNativeGradingPhysicalSampleWorksheet20261026 as importWorksheet} from './nativeGradingPhysicalSampleReview20261026.js'

const SIZES=['XS','S','M','L','XL','XXL']
const fixture=()=>{
 const snapshot={revision:7,template:{panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d']}}],seams:[],fabrics:[]}}
 const ruleSet=createAccuMarkNativeRuleSet(snapshot).ruleSet
 const made=createNativeGradingPOM20261025(snapshot,ruleSet,{panelId:'front',fromPoint:0,toPoint:1,label:'Front width',toleranceMm:2})
 assert(made.ok)
 const measurements=inspectNativeGradingPOM20261025(snapshot,ruleSet,[made.definition]).rows
 const definitions=[{...made.definition,targetsMm:Object.fromEntries(measurements.map(row=>[row.size,row.actualMm]))}]
 const observations={sourceRevision:snapshot.revision,sourceTemplate:structuredClone(snapshot.template),sourceRuleSet:structuredClone(ruleSet),
  templateFingerprint:ruleSet.templateFingerprint,pomDefinitions:structuredClone(definitions),
  samples:SIZES.map((size,i)=>({size,specimenId:`sewn-piece-${size}-${i}`,factory:'Sample Factory',operator:'Factory Inspector',
   measurementDate:'2026-10-26T10:00:00Z',calibrationId:'ruler-calibration-100mm',
   signedReportReference:`report-${size}.pdf`,measurements:[{pomId:definitions[0].id,actualMm:200}]}))}
 return {snapshot,ruleSet,definitions,observations}
}

test('complete physical-size observations are audit-ready but never auto-approved',()=>{
 const {snapshot,ruleSet,definitions,observations}=fixture()
 const result=inspect(snapshot,ruleSet,definitions,observations)
 assert.equal(result.complete,true,JSON.stringify(result.blockers))
 assert.equal(result.rows.length,6)
 assert.equal(result.readyForIndependentAudit,true)
 assert.equal(result.independentAuditVerified,false)
 assert.equal(result.physicalSampleApproved,false)
 assert.equal(result.cuttingAuthorized,false)
})

test('missing, stale, duplicate and out-of-tolerance measured samples fail closed',()=>{
 const {snapshot,ruleSet,definitions,observations}=fixture()
 const variants=[
  value=>{value.samples.pop()},
  value=>{value.samples[1].size='XS'},
  value=>{value.samples[1].specimenId=value.samples[0].specimenId},
  value=>{value.samples[0].measurements[0].actualMm=220},
  value=>{value.samples[0].measurements[0].actualMm=NaN},
  value=>{value.samples[0].calibrationId=''},
  value=>{value.sourceRuleSet.panels.front.pointOffsetsMm.L[1][0]+=20},
  value=>{value.sourceTemplate.panels[0].polygon.points[0][0]=1},
  value=>{value.pomDefinitions[0].toleranceMm=40},
  value=>{value.samples[0].measurements[0].pomId='forged'},
 ]
 for(const change of variants){
  const bad=structuredClone(observations);change(bad)
  const result=inspect(snapshot,ruleSet,definitions,bad)
  assert.equal(result.complete,false,JSON.stringify(result.rows))
  assert(result.blockers.length>0)
  assert.equal(result.physicalSampleApproved,false)
 }
})

test('editing an L point grade invalidates physical-sample provenance even when fingerprint/revision are unchanged',()=>{
 const {snapshot,ruleSet,definitions,observations}=fixture()
 const edited=editAccuMarkNativePointRule(snapshot,ruleSet,{panelId:'front',pointIndex:1,size:'L',dxMm:12,dyMm:0})
 assert(edited.ok,edited.reason)
 assert.equal(edited.ruleSet.templateFingerprint,ruleSet.templateFingerprint)
 const actual=inspect(snapshot,edited.ruleSet,definitions,observations)
 assert.equal(actual.complete,false)
 assert(actual.blockers.some(blocker=>blocker.code==='STALE_SAMPLE_SOURCE'))
})

test('sample worksheet contains all six unfilled physical measurements, immutable grade pins and no approval',()=>{
 const {snapshot,ruleSet,definitions}=fixture()
 const exported=exportWorksheet(snapshot,ruleSet,definitions)
 assert(exported.ok,exported.reason)
 assert.equal(exported.rows,6)
 assert.equal(exported.csv.trim().split('\n').length,7)
 assert.match(exported.csv,/"actualSampleMm"/)
 assert.match(exported.csv,/"XS"/)
 assert.match(exported.csv,/"XXL"/)
 assert.match(exported.sourceHash,/^[a-f0-9]{64}$/)
 assert.match(exported.ruleHash,/^[a-f0-9]{64}$/)
 assert(!exported.csv.includes('Sample Factory'))
 assert(!exported.csv.includes('Factory Inspector'))
 const modified=structuredClone(ruleSet)
 modified.panels.front.pointOffsetsMm.L[1][0]+=12
 assert.notEqual(exportWorksheet(snapshot,modified,definitions).ruleHash,exported.ruleHash)
 const noTargets=structuredClone(definitions)
 noTargets[0].targetsMm.XS=null
 assert.equal(exportWorksheet(snapshot,ruleSet,noTargets).ok,false)
})

test('worksheet escapes suspicious POM labels rather than executing formulas when opened in Excel',()=>{
 const {snapshot,ruleSet,definitions}=fixture()
 definitions[0].label='=HYPERLINK("https://invalid.test")'
 const exported=exportWorksheet(snapshot,ruleSet,definitions)
 assert(exported.ok,exported.reason)
 assert.match(exported.csv,/'=HYPERLINK\(""https:\/\/invalid\.test""\)/)
})

const filledWorksheet=({snapshot,ruleSet,definitions,notes='Factory sample, calibrated'}={})=>{
 const source=exportWorksheet(snapshot,ruleSet,definitions)
 assert(source.ok,source.reason)
 const rows=source.csv.trimEnd().split('\r\n').map(row=>row.match(/"(?:[^"]|"")*"/g).map(v=>v.slice(1,-1).replaceAll('""','"')))
 for(const row of rows.slice(1)){
  const size=row[4]
  row[9]=`specimen-${size}`
  row[10]='Sewn Factory'
  row[11]='Inspector A'
  row[12]='CAL-025'
  row[13]='2026-10-26T10:00:00Z'
  row[14]=`signed-${size}.pdf`
  row[15]='200'
  row[16]=notes
 }
 const serialize=value=>`"${String(value).replaceAll('"','""')}"`
 return {rows,serialize:()=>rows.map(row=>row.map(serialize).join(',')).join('\r\n')+'\r\n'}
}

test('CSV import reads quoted factory provenance, complete six-size samples and never grants factory approval',()=>{
 const data=fixture(),worksheet=filledWorksheet(data)
 worksheet.rows[1][10]='Factory, Inc. "Needles"'
 worksheet.rows[1][16]='Measured at seam, double-stitched\nphotographed'
 const imported=importWorksheet(data.snapshot,data.ruleSet,data.definitions,worksheet.serialize())
 assert.equal(imported.ok,true,imported.reason)
 assert.equal(imported.observations.samples.length,6)
 assert.equal(imported.observations.samples[0].factory,'Factory, Inc. "Needles"')
 assert.equal(imported.review.complete,true,JSON.stringify(imported.review.blockers))
 assert.equal(imported.review.readyForIndependentAudit,true)
 for(const flag of ['independentAuditVerified','physicalSampleApproved','manufacturingApproved','cuttingAuthorized']){
  assert.equal(imported[flag],false)
  assert.equal(imported.review[flag],false)
 }
})

test('atomic importer rejects stale, duplicate, incomplete, inconsistent and adversarial worksheets',()=>{
 const data=fixture()
 const variants=[
  {code:'STALE_SOURCE',change:w=>{w.rows[1][0]='8'}},
  {code:'STALE_SOURCE',change:w=>{w.rows[1][1]='0'.repeat(64)}},
  {code:'STALE_SOURCE',change:w=>{w.rows[1][2]='0'.repeat(64)}},
  {code:'STALE_SOURCE',change:w=>{w.rows[1][3]='0'.repeat(64)}},
  {code:'TAMPERED_TARGET',change:w=>{w.rows[1][7]='900'}},
  {code:'TAMPERED_TARGET',change:w=>{w.rows[1][8]='200'}},
  {code:'TAMPERED_TARGET',change:w=>{w.rows[1][6]='Another POM'}},
  {code:'DUPLICATE_OR_UNKNOWN_POM',change:w=>{w.rows[2][4]='XS'}},
  {code:'INCOMPLETE_COVERAGE',change:w=>{w.rows.pop()}},
  {code:'INCOMPLETE_COVERAGE',change:w=>{w.rows.push([...w.rows[1]])}},
  {code:'DUPLICATE_SPECIMEN',change:w=>{w.rows[2][9]='specimen-XS'}},
  {code:'INVALID_PROVENANCE',change:w=>{w.rows[1][10]='=IMPORTXML("https://bad.test","//x")'}},
  {code:'INVALID_PROVENANCE',change:w=>{w.rows[1][11]="'=HYPERLINK(\"https://bad.test\")"}},
  {code:'INVALID_PROVENANCE',change:w=>{w.rows[1][14]='+cmd|\'/C calc\'!A0'}},
  {code:'UNSAFE_NOTES',change:w=>{w.rows[1][16]='@SUM(1+1)'}},
  {code:'INVALID_MEASUREMENT',change:w=>{w.rows[1][15]='NaN'}},
  {code:'INVALID_MEASUREMENT',change:w=>{w.rows[1][15]='Infinity'}},
  {code:'INVALID_MEASUREMENT',change:w=>{w.rows[1][15]='2e999'}},
  {code:'INVALID_MEASUREMENT',change:w=>{w.rows[1][15]='-200'}},
  {code:'INVALID_MEASUREMENT',change:w=>{w.rows[1][15]='=200'}},
  {code:'INVALID_MEASUREMENT',change:w=>{w.rows[1][15]='0'}},
  {code:'INVALID_DATE',change:w=>{w.rows[1][13]='2026-02-30'}},
  {code:'INVALID_CSV',change:w=>{w.serialize=()=>'"broken'}},
  {code:'INVALID_CSV',change:w=>{w.serialize=()=>w.serializeOriginal().replace('"sourceRevision",','"sourceRevision"X,')}},
  {code:'INVALID_HEADER',change:w=>{w.rows[0][0]='revision'}},
 ]
 for(const [index,variant] of variants.entries()){
  const worksheet=filledWorksheet(data)
  worksheet.serializeOriginal=worksheet.serialize
  variant.change(worksheet)
  const output=importWorksheet(data.snapshot,data.ruleSet,data.definitions,worksheet.serialize())
  assert.equal(output.ok,false,`case ${index}: ${JSON.stringify(output)}`)
  assert.equal(output.code,variant.code,`case ${index}`)
  assert.equal(output.observations,null,`case ${index} partial observations leaked`)
 }
})

test('sample review reveals out-of-tolerance measurements after accepted import, without granting approval',()=>{
 const data=fixture(),worksheet=filledWorksheet(data)
 worksheet.rows[1][15]='240'
 const result=importWorksheet(data.snapshot,data.ruleSet,data.definitions,worksheet.serialize())
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.review.complete,false)
 assert(result.review.blockers.some(blocker=>blocker.code==='SEWN_SAMPLE_OUT_OF_TOLERANCE'))
 assert.equal(result.cuttingAuthorized,false)
})

test('same-size POM rows require identical full provenance',()=>{
 const data=fixture()
 const secondPOM=createNativeGradingPOM20261025(data.snapshot,data.ruleSet,{
  panelId:'front',fromPoint:1,toPoint:2,label:'Side height',toleranceMm:3})
 assert(secondPOM.ok,secondPOM.reason)
 const poms=[...data.definitions,{...secondPOM.definition,targetsMm:Object.fromEntries(
   inspectNativeGradingPOM20261025(data.snapshot,data.ruleSet,[secondPOM.definition]).rows
     .map(row=>[row.size,row.actualMm]))}]
 const worksheet=filledWorksheet({...data,definitions:poms})
 for(const row of worksheet.rows.slice(1))row[15]=row[7]
 const success=importWorksheet(data.snapshot,data.ruleSet,poms,worksheet.serialize())
 assert.equal(success.ok,true,success.reason)
 const copy=filledWorksheet({...data,definitions:poms})
 for(const row of copy.rows.slice(1))row[15]=row[7]
 const repeated=copy.rows.slice(1).filter(row=>row[4]==='XS')
 assert.equal(repeated.length,2)
 repeated[1][12]='CAL-OTHER'
 const failed=importWorksheet(data.snapshot,data.ruleSet,poms,copy.serialize())
 assert.equal(failed.ok,false)
 assert.equal(failed.code,'INCONSISTENT_SPECIMEN')
 assert.equal(failed.observations,null)
})
