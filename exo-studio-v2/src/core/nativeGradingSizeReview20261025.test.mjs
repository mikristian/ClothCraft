import test from 'node:test'
import assert from 'node:assert/strict'
import {summarizeNativeGradingSizes20261025 as summarize,NATIVE_GRADE_SIZES_20261025 as SIZES} from './nativeGradingSizeReview20261025.js'

const workflow=()=>({previewReady:true,panelCount:2,seamCount:1,
  geometry:{blocks:['front','back'].map(panelId=>({panelId,rows:SIZES.map(size=>({
    panelId,size,widthMm:300,heightMm:500,perimeterMm:1300,areaMm2:80000,blockers:[],
  }))}))},sewing:{rows:SIZES.map(size=>({size,seamId:'side',pass:true,mismatchMm:0.3}))}})
const poms=()=>({rows:SIZES.map(size=>({size,id:'chest',pass:true,actualMm:300}))})

test('reports exact per-size graded geometry, seam and POM coverage without approval',()=>{
  const rows=summarize(workflow(),poms(),1)
  assert.deepEqual(rows.map(row=>row.size),SIZES)
  assert(rows.every(row=>row.draftingChecksPass))
  assert(rows.every(row=>row.sewnChecked===1&&row.pomChecked===1))
  assert(rows.every(row=>row.manufacturingApproved===false&&row.nativeCommitted===false))
})

test('missing POM targets and missing seam sizes remain visible per selected size',()=>{
  const source=workflow(),measurement=poms()
  source.sewing.rows=source.sewing.rows.filter(row=>row.size!=='XL')
  measurement.rows.find(row=>row.size==='S').pass=false
  const rows=summarize(source,measurement,1)
  assert.equal(rows.find(row=>row.size==='XL').sewingPass,false)
  assert.equal(rows.find(row=>row.size==='XL').seamFailures,1)
  assert.equal(rows.find(row=>row.size==='S').pomPass,false)
  assert.equal(rows.find(row=>row.size==='S').pomFailures,1)
  assert.equal(rows.find(row=>row.size==='M').draftingChecksPass,true)
})

test('a no-seam or no-POM source cannot falsely pass drafting verification',()=>{
  const source=workflow()
  source.seamCount=0
  source.sewing.rows=[]
  const rows=summarize(source,{rows:[]},0)
  assert(rows.every(row=>!row.sewingPass&&!row.pomPass&&!row.draftingChecksPass))
  assert(rows.every(row=>row.seamFailures===0&&row.pomFailures===0))
})

test('source geometry failure blocks all-size readiness even with complete seam and POM rows',()=>{
  const source=workflow()
  source.previewReady=false
  assert(summarize(source,poms(),1).every(row=>!row.geometryPass))
  source.previewReady=true
  source.geometry.blocks[0].rows.pop()
  const last=summarize(source,poms(),1).find(row=>row.size==='XXL')
  assert.equal(last.geometryPass,false)
})
test('per-size contour diagnosis isolates a bad XXL while preserving all-size fail-closed gate',()=>{
  const source=workflow()
  source.previewReady=false
  source.geometry.blocks[0].rows.find(row=>row.size==='XXL').blockers=['Self-crossing sampled contour']
  const reviewed=summarize(source,poms(),1)
  assert.equal(reviewed.find(row=>row.size==='L').geometryDiagnosticPass,true)
  assert.equal(reviewed.find(row=>row.size==='L').geometryPass,false)
  assert(reviewed.find(row=>row.size==='L').findings.some(message=>message.includes('Other graded sizes')))
  assert.equal(reviewed.find(row=>row.size==='XXL').geometryDiagnosticPass,false)
  assert(reviewed.find(row=>row.size==='XXL').findings.some(message=>message.includes('Self-crossing')))
  assert.equal(reviewed.filter(row=>row.draftingChecksPass).length,0)
})
test('rejects duplicated panel IDs and reports a missing size-specific POM target',()=>{
  const source=workflow(),measures=poms()
  source.geometry.blocks[1].panelId='front'
  const invalid=summarize(source,measures,1)
  assert(invalid.every(row=>row.geometryPass===false))
  assert(invalid.every(row=>row.findings.some(message=>message.includes('duplicated'))))
  const valid=workflow()
  measures.rows.find(row=>row.size==='XL').targetMm=null
  measures.rows.find(row=>row.size==='XL').pass=false
  const report=summarize(valid,measures,1)
  assert(report.find(row=>row.size==='XL').findings.some(message=>message.includes('target not entered')))
  assert.equal(report.find(row=>row.size==='M').pomPass,true)
})
