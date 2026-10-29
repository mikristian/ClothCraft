import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {getEdgeSeamAllowance} from './project.js'
import {inspectIndustrialDoubleNotches20261023} from './industrialDoubleNotchPreflight20261023.js'

function fixture(type='double',t=.5) {
  const project=createTeeTemplate()
  for (const piece of project.pieces) piece.notches=[]
  const piece=project.pieces.find(p=>Object.keys(p.curves||{}).some(e=>getEdgeSeamAllowance(p,+e)>.6))
  assert.ok(piece)
  const edgeIndex=+Object.keys(piece.curves).find(e=>getEdgeSeamAllowance(piece,+e)>.6)
  piece.notches=[{id:'physical-test',edgeIndex,t,type,depthCm:.3}]
  return {project,piece,edgeIndex}
}

test('curved CUT boundary: single and double stations are mapped across every configured size without mutation',()=>{
  for (const type of ['single','double']) {
    const {project}=fixture(type,.5)
    const original=structuredClone(project)
    const report=inspectIndustrialDoubleNotches20261023(project)
    assert.equal(report.status,'pass',JSON.stringify(report.issues))
    assert.deepEqual(report.checkedSizes,project.grading.sizes)
    assert.equal(report.checks.length,project.grading.sizes.length)
    for (const check of report.checks) {
      assert.equal(check.marks.length,type==='double'?2:1)
      assert(check.marks.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))
      assert.equal(check.endpointClipped,false)
    }
    assert.deepEqual(project,original)
    assert.equal(report.factoryCertified,false)
    assert.equal(report.factoryCuttingAuthorized,false)
  }
})

for (const station of [0,1]) {
  test(`double notch endpoint ${station} reports draft clipping and prevents factory clearance`,()=>{
    const {project}=fixture('double',station)
    const original=structuredClone(project)
    const report=inspectIndustrialDoubleNotches20261023(project)
    assert.equal(report.status,'blocked')
    assert(report.issues.some(i=>i.code==='DOUBLE_NOTCH_ENDPOINT_CLIPPING'))
    for (const check of report.checks) {
      assert.equal(check.endpointClipped,true)
      assert(check.stationShiftCm.some(v=>Math.abs(v)>0))
      assert(check.emittedDraftFractions.every(v=>v>=.01&&v<=.99))
    }
    assert.deepEqual(project,original)
  })
}

test('single notch endpoints remain valid at t=0 and t=1',()=>{
  for (const t of [0,1]) {
    const {project}=fixture('single',t)
    const report=inspectIndustrialDoubleNotches20261023(project)
    assert.equal(report.status,'pass',JSON.stringify(report.issues))
    assert(report.checks.every(check=>!check.endpointClipped&&check.marks[0].fraction===t))
  }
})

test('invalid physical edge index fails closed for every graded size',()=>{
  const {project,piece}=fixture()
  piece.notches[0].edgeIndex=piece.points.length
  const report=inspectIndustrialDoubleNotches20261023(project)
  assert.equal(report.status,'blocked')
  assert.equal(report.issues.filter(i=>i.code==='INVALID_EDGE_INDEX').length,project.grading.sizes.length)
})
