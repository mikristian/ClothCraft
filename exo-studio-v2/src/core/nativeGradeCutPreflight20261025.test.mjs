import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNativeGradeCutPreflight20261025 as inspect} from './nativeGradeCutPreflight20261025.js'

const sizes=['XS','S','M','L','XL','XXL']
const source=()=>({revision:12,template:{seams:[],panels:[{id:'front',polygon:{edges:['a','b','c'],points:[[0,0],[.3,0],[.1,.3]],seam_allowances:{a:0,b:0,c:0},notches:{a:[],b:[],c:[]}}}]}})
const run=()=>({ok:true,byPanel:{front:{sizeRun:Object.fromEntries(sizes.map(size=>[size,
  {polygon:{edges:['a','b','c'],points:[[0,0],[.3,0],[.1,.3]],seam_allowances:{a:0,b:0,c:0},notches:{a:[],b:[],c:[]}}}]))}}})

test('six sizes have explicit empty notch inventory and zero allowance CUT interpretations, without factory authorization',()=>{
  const result=inspect(source(),run())
  assert.equal(result.ok,true)
  assert.equal(result.rows.length,18)
  assert(result.rows.every(row=>row.allowanceStatus==='EXPLICIT_ZERO'&&row.notchStatus==='EXPLICIT_NO_NOTCHES'))
  assert.deepEqual(result.issues.map(issue=>issue.code),['RECEIVING_CAD_UNVERIFIED'])
  assert.equal(result.cutEvidenceReady,false)
  assert.equal(result.gradedAnnotations.ok,true)
  assert.equal(result.cuttingAuthorized,false)
})

test('fail-closed diagnoses single-size allowance, notch, topology and seam source drift',()=>{
  const input=source(),compiled=run()
  compiled.byPanel.front.sizeRun.XL.polygon.seam_allowances.b=.012
  compiled.byPanel.front.sizeRun.XL.polygon.notches.a=[{t:0.5}]
  compiled.byPanel.front.sizeRun.XXL.polygon.edges.reverse()
  input.template.seams.push({id:'join'})
  const result=inspect(input,compiled)
  assert(result.issues.some(x=>x.code==='OFFSET_CUT_PROOF_REQUIRED'&&x.size==='XL'&&x.edgeId==='b'))
  assert(result.issues.some(x=>x.code==='NOTCH_PLACEMENT_PROOF_REQUIRED'&&x.size==='XL'&&x.edgeId==='a'))
  assert(result.issues.some(x=>x.code==='GRADED_CUT_TOPOLOGY'&&x.size==='XXL'))
  assert(result.issues.some(x=>x.code==='CUT_COVERAGE_INCOMPLETE'))
  assert(result.issues.some(x=>x.code==='SEWN_CUTLINE_PROOF_REQUIRED'))
  assert.equal(result.manufacturingApproved,false)
})

test('six-size stationed physical notches record edge length and catch size drift',()=>{
  const input=source(),compiled=run()
  input.template.panels[0].polygon.seam_allowances.a=.01
  input.template.panels[0].polygon.notches.a=[{t:.5,depth_m:.005}]
  for(const size of sizes){
    compiled.byPanel.front.sizeRun[size].polygon.seam_allowances.a=.01
    compiled.byPanel.front.sizeRun[size].polygon.notches.a=[{t:.5,depth_m:.005}]
  }
  const before=inspect(input,compiled)
  assert.equal(before.gradedAnnotations.ok,true)
  assert.equal(before.gradedAnnotations.stations.length,6)
  assert(Math.abs(before.gradedAnnotations.stations[0].distanceMm-150)<.001)
  assert(Math.abs(before.gradedAnnotations.stations[0].positionM[0]-.15)<1e-9)
  assert(Math.abs(before.gradedAnnotations.stations[0].positionM[1])<1e-9)
  compiled.byPanel.front.sizeRun.XXL.polygon.notches.a[0].t=.7
  compiled.byPanel.front.sizeRun.XL.polygon.seam_allowances.b=.015
  const after=inspect(input,compiled)
  assert(after.issues.some(issue=>issue.code==='GRADED_NOTCH_STATION_DRIFT'&&issue.size==='XXL'))
  assert(after.issues.some(issue=>issue.code==='GRADED_ALLOWANCE_DRIFT'&&issue.size==='XL'))
  assert.equal(after.manufacturingApproved,false)
})

test('invalid source notch metadata and missing explicit source allowances fail closed',()=>{
  const input=source(),compiled=run()
  delete input.template.panels[0].polygon.seam_allowances.c
  input.template.panels[0].polygon.notches.a=[{t:.5}]
  const result=inspect(input,compiled)
  assert(result.issues.some(issue=>issue.code==='SOURCE_EDGE_ALLOWANCE_MISSING'))
  assert(result.issues.some(issue=>issue.code==='SOURCE_NOTCH_INVALID'))
  assert.equal(result.gradedAnnotations.ok,false)
})

test('Rust cutline physical station, depth and sorted order constraints fail closed',()=>{
  for(const bad of [
    {marks:[{t:0,depth_m:.005}],allowance:.01},
    {marks:[{t:1,depth_m:.005}],allowance:.01},
    {marks:[{t:.5,depth_m:.011}],allowance:.01},
    {marks:[{t:.5,depth_m:.001}],allowance:0},
    {marks:[{t:.7,depth_m:.002},{t:.3,depth_m:.002}],allowance:.01},
    {marks:[{t:.5,depth_m:.002},{t:.5,depth_m:.002}],allowance:.01},
  ]){
    const input=source(),compiled=run()
    input.template.panels[0].polygon.notches.a=bad.marks
    input.template.panels[0].polygon.seam_allowances.a=bad.allowance
    for(const size of sizes){
      compiled.byPanel.front.sizeRun[size].polygon.notches.a=structuredClone(bad.marks)
      compiled.byPanel.front.sizeRun[size].polygon.seam_allowances.a=bad.allowance
    }
    const result=inspect(input,compiled)
    assert.equal(result.gradedAnnotations.ok,false,JSON.stringify(bad))
    assert(result.issues.some(issue=>issue.code==='SOURCE_NOTCH_INVALID'),JSON.stringify(bad))
    assert.equal(result.gradedAnnotations.stations.length,0,JSON.stringify(bad))
    assert.equal(result.manufacturingApproved,false)
  }
})
