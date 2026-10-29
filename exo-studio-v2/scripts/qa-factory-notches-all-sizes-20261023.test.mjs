import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {gradeProject} from '../src/core/grading.js'
import {inspectGradedNotchPairs} from '../src/core/industrialNotchQA.js'
import {inspectManufacturingReleaseReadiness} from '../src/core/manufacturingReleaseReadiness.js'
import {buildFactoryPackageZip} from '../src/core/factoryPackage.js'

// Separate source-to-size-run preflight: standalone notches have no pair-group QA.
function auditStandaloneNotches(project, expected) {
  const issues = []
  for (const size of project.grading.sizes) {
    const graded = gradeProject(project, size)
    for (const item of expected) {
      const piece = graded.pieces.find(row => row.id === item.pieceId)
      const notch = piece?.notches?.find(row => row.id === item.notchId)
      const scope = {size, pieceId:item.pieceId, notchId:item.notchId}
      if (!notch) { issues.push({id:`MISSING_STANDALONE_NOTCH:${size}:${item.pieceId}:${item.notchId}`, code:'MISSING_STANDALONE_NOTCH', ...scope}); continue }
      if (!Number.isInteger(notch.edgeIndex) || notch.edgeIndex < 0 || notch.edgeIndex >= piece.points.length) {
        issues.push({id:`INVALID_STANDALONE_NOTCH_EDGE:${size}:${item.pieceId}:${item.notchId}`,code:'INVALID_STANDALONE_NOTCH_EDGE',...scope,edgeIndex:notch.edgeIndex})
      }
      if (!Number.isFinite(notch.t) || notch.t < 0 || notch.t > 1) {
        issues.push({id:`INVALID_STANDALONE_NOTCH_FRACTION:${size}:${item.pieceId}:${item.notchId}`,code:'INVALID_STANDALONE_NOTCH_FRACTION',...scope,t:notch.t})
      }
    }
  }
  return issues
}

function fixture() {
  const project = createTemplateProject('tee')
  const piece = project.pieces.find(row=>Array.isArray(row.points)&&row.points.length >= 3)
  assert.ok(piece)
  assert.ok(project.grading.sizes.length > 1)
  const notch = {id:'standalone-factory-probe',edgeIndex:0,t:0.37,type:'single',depthCm:0.2}
  piece.notches = [...(piece.notches||[]), notch]
  return {project,piece,notch,expected:[{pieceId:piece.id,notchId:notch.id}]}
}

test('standalone notch survives each configured graded size with complete provenance',()=>{
  const {project,expected}=fixture()
  assert.deepEqual(auditStandaloneNotches(project,expected),[])
  const qa=inspectGradedNotchPairs(project)
  assert.equal(qa.checkedSizes.length,project.grading.sizes.length)
})

test('missing standalone notch is reported at every size, with unique size/piece/notch IDs',()=>{
  const {project,piece,notch,expected}=fixture()
  piece.notches=piece.notches.filter(row=>row.id!==notch.id)
  const issues=auditStandaloneNotches(project,expected)
  assert.deepEqual(issues.map(row=>row.size),project.grading.sizes)
  assert.equal(new Set(issues.map(row=>row.id)).size,issues.length)
  assert.ok(issues.every(row=>row.code==='MISSING_STANDALONE_NOTCH' && row.pieceId===piece.id && row.notchId===notch.id))
})

test('standalone invalid edge is visible to independent all-size audit and factory ZIP aborts',()=>{
  const {project,piece,notch,expected}=fixture()
  notch.edgeIndex=piece.points.length+17
  const issues=auditStandaloneNotches(project,expected)
  assert.equal(issues.length,project.grading.sizes.length)
  assert.ok(issues.every(row=>row.code==='INVALID_STANDALONE_NOTCH_EDGE' && row.edgeIndex===notch.edgeIndex))
  const pairedQa=inspectGradedNotchPairs(project)
  const readiness=inspectManufacturingReleaseReadiness(project)
  assert.equal(readiness.digitalCounts.pairedNotchBlockers,pairedQa.blockers)
  assert.throws(()=>buildFactoryPackageZip(project),/Invalid manufacturing DXF notch edgeIndex/)
})

test('standalone invalid fraction fails independently and refuses factory ZIP',()=>{
  const {project,notch,expected}=fixture()
  notch.t=Number.NaN
  const issues=auditStandaloneNotches(project,expected)
  assert.equal(issues.length,project.grading.sizes.length)
  assert.ok(issues.every(row=>row.code==='INVALID_STANDALONE_NOTCH_FRACTION'))
  assert.throws(()=>buildFactoryPackageZip(project),/Invalid manufacturing DXF notch fraction/)
})
