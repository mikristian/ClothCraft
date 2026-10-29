import test from 'node:test'
import assert from 'node:assert/strict'
import {strFromU8} from 'fflate'
import {createTemplateProject} from '../src/data/templates.js'
import {inspectManufacturingReleaseReadiness} from '../src/core/manufacturingReleaseReadiness.js'
import {buildFactoryPackageFiles} from '../src/core/factoryPackage.js'

const parseRelease = files => JSON.parse(strFromU8(files['manufacturing-release-readiness.json']))

test('factory package release manifest agrees with the live notch-aware readiness report', () => {
  const project = createTemplateProject('tee')
  const original = structuredClone(project)
  const release = inspectManufacturingReleaseReadiness(project)
  const files = buildFactoryPackageFiles(project)
  const saved = parseRelease(files)
  assert.deepEqual(saved, release, 'ZIP must not contain a stale or divergent release assessment')
  assert.equal(saved.factoryCertified, false)
  assert.equal(saved.factoryCuttingAuthorized, false)
  assert.equal(saved.bulkProductionAuthorized, false)
  assert.equal(saved.status, 'BLOCKED_NOT_APPROVED')
  assert.deepEqual(project, original, 'Generating release evidence cannot change authored pattern data')
})

test('factory package refuses an invalid standalone notch without mutating source', () => {
  const project = createTemplateProject('tee')
  for (const piece of project.pieces) piece.notches = []
  project.pieces[0].notches = [{id:'production-invalid-edge', edgeIndex:999, t:0.5, depthCm:0.3}]
  const original = structuredClone(project)
  const release = inspectManufacturingReleaseReadiness(project)
  assert.equal(release.factoryCertified, false)
  assert.equal(release.factoryCuttingAuthorized, false)
  assert.equal(release.engineeringGeometryPass, false, 'Readiness must reject malformed unpaired notches before DXF')
  assert(release.blockers.some(issue => issue.code === 'STANDALONE_PHYSICAL_NOTCH_QA' &&
    issue.reason.includes('INVALID_STANDALONE_NOTCH_EDGE') &&
    issue.reason.includes('production-invalid-edge')),
    'Report must expose the precise physical standalone notch and failing edge')
  assert.throws(() => buildFactoryPackageFiles(project), /notch|edge|physical|invalid/i)
  assert.deepEqual(project, original)
})

test('known 501 and imported CLO garments remain blocked from factory authorization', () => {
  for (const id of ['jeans-501','clo-male-tshirt']) {
    const project = createTemplateProject(id)
    const original = structuredClone(project)
    const release = inspectManufacturingReleaseReadiness(project)
    assert.equal(release.status, 'BLOCKED_NOT_APPROVED', id)
    assert.equal(release.factoryCertified, false, id)
    assert.equal(release.factoryCuttingAuthorized, false, id)
    assert.equal(release.bulkProductionAuthorized, false, id)
    assert(release.digitalCounts.industrialPatternBlockers > 0, id)
    assert.deepEqual(project, original, id)
  }
})
