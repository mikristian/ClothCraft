/**
 * Independent negative-path evidence for EXO2D-065 and EXO2D-095.
 * Regression for the previously identified manufacturing-readiness blind spot.
 * It does not approve any factory output or change the original project.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../src/data/templates.js'
import {projectToDxf} from '../src/core/dxf.js'
import {inspectManufacturingReleaseReadiness} from '../src/core/manufacturingReleaseReadiness.js'
import {buildFactoryPackageFiles} from '../src/core/factoryPackage.js'

function specimen(t) {
  const project = createTeeTemplate()
  for (const piece of project.pieces) piece.notches = []
  const piece = project.pieces[0]
  piece.notches.push({id:'qa-double-endpoint', edgeIndex:0, t, type:'double', depthCm:0.3})
  return project
}

test('release readiness identifies endpoint-unsafe double notches before DXF rejects every size', () => {
  for (const t of [0.001, 0.999]) {
    const project = specimen(t)
    const before = structuredClone(project)
    const result = inspectManufacturingReleaseReadiness(project)
    assert.equal(result.digitalCounts.standalonePhysicalNotchBlockers, 0)
    assert.equal(result.blockers.some(row => /DOUBLE_NOTCH_ENDPOINT_CLIPPING/.test(`${row.code} ${row.reason}`)), true)
    assert.equal(result.engineeringGeometryPass, false)
    assert.equal(result.status, 'BLOCKED_NOT_APPROVED')
    for (const size of project.grading.sizes) {
      assert.throws(() => projectToDxf(project,size,{cutlineMode:'manufacturing'}),
        /Unsafe manufacturing double-notch endpoint clearance/, `size ${size} must reject endpoint-unsafe notch`)
    }
    assert.equal(result.factoryCertified,false)
    assert.equal(result.factoryCuttingAuthorized,false)
    assert.deepEqual(project,before)
  }
})

test('a centered double notch is not rejected by the endpoint guard across all six sizes', () => {
  const project = specimen(0.5)
  const before = structuredClone(project)
  for (const size of project.grading.sizes) {
    const dxf = projectToDxf(project,size,{cutlineMode:'manufacturing'})
    assert.match(dxf,/NOTCH_/)
    assert.match(dxf,/CUT_/)
  }
  assert.deepEqual(project,before)
})

test('factory ZIP aborts before returning a package for endpoint-unsafe double-notch geometry', () => {
  const project=specimen(0.001)
  const before=structuredClone(project)
  assert.throws(()=>buildFactoryPackageFiles(project),/Unsafe manufacturing double-notch endpoint clearance/)
  assert.deepEqual(project,before)
})
