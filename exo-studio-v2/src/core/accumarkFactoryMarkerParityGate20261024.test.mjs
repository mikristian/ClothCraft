import test from 'node:test'
import assert from 'node:assert/strict'
import { strFromU8, unzipSync } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { projectToDxf } from './dxf.js'
import { buildFactoryPackageFiles, buildFactoryPackageZip } from './factoryPackage.js'

const exactDxf = (project, size) => projectToDxf(gradeProject(project, size), size,
  { cutlineMode: 'manufacturing', requireGradedGeometry: true })

for (const single of [false, true]) {
  test(`${single ? 'legacy single-size' : 'six-size Foundation Tee'} package gates actual markers against exact shipped DXF bytes`, () => {
    const project = createTeeTemplate()
    if (single) project.grading.sizes = [project.grading.baseSize]
    const before = structuredClone(project)
    const files = buildFactoryPackageFiles(project)
    const zipFiles = unzipSync(buildFactoryPackageZip(project))
    const qa = JSON.parse(strFromU8(files['marker-dxf-geometry-qa.json']))
    const qaZip = JSON.parse(strFromU8(zipFiles['marker-dxf-geometry-qa.json']))
    assert.equal(qa.ok, true, JSON.stringify(qa.issues))
    assert.equal(qa.factoryApproved, false)
    assert.equal(qa.sizes.length, project.grading.sizes.length)
    assert.equal(qa.checkedPlacements, project.grading.sizes.length * 4)
    assert.ok(qa.measurements.every(m => Number.isFinite(m.hausdorffCm) && m.hausdorffCm <= qa.toleranceCm))
    assert.deepEqual(qaZip, qa)
    const patternPaths = Object.keys(files).filter(p => p.startsWith('patterns/') && p.endsWith('.dxf'))
    assert.equal(patternPaths.length, project.grading.sizes.length)
    for (const size of project.grading.sizes) {
      const nameSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'
      const path = `patterns/${nameSlug}-${size.toLowerCase()}.dxf`
      assert.ok(files[path], `${size} DXF included`)
      assert.equal(strFromU8(files[path]), exactDxf(project, size), `${size} unchanged validated DXF text`)
      assert.deepEqual(zipFiles[path], files[path], `${size} ZIP has the same audited bytes`)
    }
    assert.deepEqual(project, before, 'files and ZIP export never mutate source')
  })
}

test('actual marker parity discrepancy refuses both package APIs before returning bytes', () => {
  const project = createTeeTemplate()
  project.pieces[0].cutQuantity = 0
  const before = structuredClone(project)
  for (const build of [buildFactoryPackageFiles, buildFactoryPackageZip]) {
    assert.throws(() => build(project), error => {
      assert.match(error.message, /^Factory package refused: marker\/DXF physical CUT parity failed:/)
      assert.match(error.message, /INVALID_CUT_QUANTITY/)
      return true
    })
  }
  assert.deepEqual(project, before, 'refusal does not mutate source')
})
