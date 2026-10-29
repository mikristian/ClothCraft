import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildFactoryPackageFiles} from '../src/core/factoryPackage.js'
import {inspectManufacturingReleaseReadiness} from '../src/core/manufacturingReleaseReadiness.js'

function caseProject(){
  const project=createTemplateProject('tee')
  const piece=project.pieces.find(p=>Array.isArray(p.points)&&p.points.length>=3)
  assert.ok(piece,'tee template must have a polygon piece')
  piece.notches=[{id:'boundary-invalid-edge',edgeIndex:piece.points.length+17,t:0.5,type:'single',depthCm:0.2}]
  return {project,piece}
}

test('unpaired invalid edgeIndex fails to appear as a sewing-notch readiness blocker',()=>{
  const {project,piece}=caseProject()
  const withInvalid=inspectManufacturingReleaseReadiness(project)
  piece.notches=[]
  const without=inspectManufacturingReleaseReadiness(project)
  assert.equal(withInvalid.digitalCounts.pairedNotchBlockers,without.digitalCounts.pairedNotchBlockers)
  assert.equal(withInvalid.blockers.some(row=>row.code==='SEWING_NOTCH_QA'),without.blockers.some(row=>row.code==='SEWING_NOTCH_QA'))
  assert.equal(withInvalid.factoryCuttingAuthorized,false)
  assert.equal(withInvalid.bulkProductionAuthorized,false)
})

test('factory ZIP aborts on invalid standalone edgeIndex despite the readiness QA blind spot',()=>{
  const {project,piece}=caseProject()
  assert.throws(()=>buildFactoryPackageFiles(project),/Invalid manufacturing DXF notch edgeIndex/)
  piece.notches=[]
  const without=buildFactoryPackageFiles(project)
  const dxfFiles=Object.keys(without).filter(name=>name.startsWith('patterns/')&&name.endsWith('.dxf'))
  assert.ok(dxfFiles.length,'the package must contain actual graded DXF outputs')
  assert.ok(piece.notches.length===0)
})

test('paired invalid edgeIndex is caught by notch QA gate',()=>{
  const {project,piece}=caseProject()
  const seam=project.seams[0]
  assert.ok(seam,'tee template must provide a sewn seam')
  const other=project.pieces.find(p=>p.id===seam.b.pieceId)
  assert.ok(other)
  piece.notches=[{id:'invalid-paired-a',edgeIndex:piece.points.length+17,t:0.5,type:'single',depthCm:0.2,matchGroupId:'qa-bad-edge',matchedSeamId:seam.id}]
  other.notches=[...(other.notches||[]),{id:'invalid-paired-b',edgeIndex:seam.b.edgeIndex,t:0.5,type:'single',depthCm:0.2,matchGroupId:'qa-bad-edge',matchedSeamId:seam.id}]
  const readiness=inspectManufacturingReleaseReadiness(project)
  assert.ok(readiness.digitalCounts.pairedNotchBlockers>0)
  assert.ok(readiness.blockers.some(row=>row.code==='SEWING_NOTCH_QA'))
})
