import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspect} from './industrialMarkerCutWorkflow20261028.mjs'
const source=()=>{const p=createTeeTemplate();for(const piece of p.pieces){piece.notches=[];piece.internalLines=[];piece.buttonholes=[];piece.marker={nap:'one-way',allowCrossGrain:false};piece.grainAngleDeg=0}return p}
test('six graded sizes generate dimensioned marker/CUT studies and a cross-check without mutating the user document',()=>{
 const project=source(),before=JSON.stringify(project),result=inspect(project,{maxCandidates:50000,fabricWidthCm:150})
 assert.equal(result.ok,true,JSON.stringify(result.issues).slice(0,700))
 assert.equal(result.markerCount,6)
 assert(result.rows.every(r=>r.cutterStudy?.ok&&r.marker?.metrics?.length>0&&r.cutterStudy.records.length===4))
 assert(result.checkedDxFPlacements>=24)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(JSON.stringify(project),before)
})
test('drill and fold features are blocked, not silently stripped out of cutter study',()=>{
 for(const change of [p=>p.pieces[0].drills=[{x:2,y:2}],p=>p.pieces[0].fold=true]){
  const p=source();change(p);const result=inspect(p)
  assert.equal(result.ok,false)
  assert(result.issues.some(i=>['UNTRANSFERRED_MANUFACTURING_FEATURE','MARKER_CUT_WORKFLOW_REFUSED','FOLD_LAYOUT_UNVERIFIED'].includes(i.code)))
 }
})
test('invalid fabric widths and grading-size identity are blocked',()=>{
 const p=source();assert.equal(inspect(p,{fabricWidthCm:0}).ok,false)
 assert.equal(inspect(p,{fabricWidthCm:10}).ok,false)
 p.grading.sizes=['M','M'];assert.equal(inspect(p).ok,false)
})
test('honors per-fabric usable widths instead of pretending all fabrics share a roll',()=>{
 const p=source();p.markerSettings.fabricWidthsCm={main:20}
 const result=inspect(p,{fabricWidthCm:150,maxCandidates:200})
 assert.equal(result.ok,false)
 assert(result.issues.some(i=>i.code==='NEST_INCOMPLETE'||i.code==='DXF_MARKER_UNUSED_MARKER_PIECES'))
})
test('receiver fixture missing a graded size must never be replaced by locally regenerated DXF',()=>{
 const p=source();const result=inspect(p,{dxfBySize:{},maxCandidates:100})
 assert.equal(result.ok,false)
 assert(result.issues.some(i=>i.code==='DXF_MARKER_MISSING_EXACT_DXF'))
})

test('authored notches are retained as independent geometrical marks on the nested graded cutter inspection',()=>{
 const p=source();p.pieces[0].notches=[{id:'n',edgeIndex:0,t:.5,depthCm:.2,type:'single'}]
 const result=inspect(p,{maxCandidates:50000})
 assert.equal(result.ok,true,JSON.stringify(result.issues).slice(0,600))
 assert(result.rows.every(row=>row.markTransfer?.ok&&row.markTransfer.notchCount===1))
 assert(result.rows.every(row=>row.markTransfer.cuttingAuthorized===false))
})
