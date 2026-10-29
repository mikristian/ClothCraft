import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'
import {preflightPhysicalCutOverlap20261023_2000} from './physicalCutOverlapPreflight20261023_2000.mjs'

function overlappingRectangleProject() {
  const base = createTeeTemplate()
  const rectangle = (id, name) => ({
    ...structuredClone(base.pieces[0]), id, name,
    points: [{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],
    curves: {}, seamAllowance: 6, edgeSeamAllowances: {},
    notches: [], internalLines: [], buttonholes: [],
  })
  return {...base, productionSpec: undefined, pieces:[rectangle('packing-a','Packing A'),rectangle('packing-b','Packing B')], seams:[]}
}

test('factory files fail closed on physical CUT overlap, consistent with independent DXF preflight', () => {
  const project = overlappingRectangleProject()
  const before = structuredClone(project)
  assert.throws(() => buildFactoryPackageFiles(project),
    /Factory package refused: unsafe physical CUT contours.*PHYSICAL_CUT_INTERIOR_OVERLAP/,
    'unsafe factory files must not be returned at any size')
  const observations = project.grading.sizes.map(size => ({size,
    audit:preflightPhysicalCutOverlap20261023_2000(projectToDxf(gradeProject(project,size),size,
      {cutlineMode:'manufacturing',requireGradedGeometry:true}))}))
  for (const {size,audit} of observations) {
    assert.equal(audit.contourCount, 2, size)
    assert.equal(audit.ok, false, `${size}: independent CUT overlap oracle must also reject`)
    assert.equal(audit.overlaps.length, 1, size)
    assert.equal(audit.manufacturingApproved, false, size)
  }
  const directReadiness = inspectManufacturingReleaseReadiness(project)
  assert.equal(directReadiness.factoryCertified, false)
  assert.equal(directReadiness.factoryCuttingAuthorized, false)
  assert.equal(directReadiness.bulkProductionAuthorized, false)
  assert.deepEqual(project, before, 'audit and package must not mutate the source project')
  // Independent diagnosis remains available, but unsafe bytes cannot leave the builder.
  assert.ok(observations.every(({audit})=>audit.overlaps.length===1))
})
