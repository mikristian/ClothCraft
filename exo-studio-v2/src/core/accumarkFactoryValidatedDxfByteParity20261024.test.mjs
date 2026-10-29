import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { strFromU8, unzipSync } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { projectToDxf } from './dxf.js'
import { buildFactoryPackageFiles, buildFactoryPackageZip } from './factoryPackage.js'
import { preflightPhysicalCutOverlap20261023_2000 } from './physicalCutOverlapPreflight20261023_2000.mjs'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')

for (const oneSize of [false, true]) {
  const label = oneSize ? 'single-size' : 'six-size'
  test(`${label}: shipped DXF bytes match separately audited reference, manifest, and ZIP`, () => {
    const project = createTeeTemplate()
    if (oneSize) project.grading.sizes = [project.grading.baseSize]
    const original = structuredClone(project)
    const reference = new Map()
    for (const size of project.grading.sizes) {
      const dxf = projectToDxf(gradeProject(project, size), size,
        {cutlineMode: 'manufacturing', requireGradedGeometry: true})
      const audit = preflightPhysicalCutOverlap20261023_2000(dxf)
      assert.equal(audit.ok, true, `${size}: independent physical CUT audit`)
      assert.equal(audit.contourCount, project.pieces.length, `${size}: every contour audited`)
      reference.set(size, dxf)
    }

    const files = buildFactoryPackageFiles(project)
    const manifest = JSON.parse(strFromU8(files['manifest.json']))
    const receiverPlan = JSON.parse(strFromU8(files['recipient-cad-acceptance-plan.json']))
    const extracted = unzipSync(buildFactoryPackageZip(project))
    const shipped = Object.keys(files).filter(name => name.startsWith('patterns/') && name.endsWith('.dxf'))
    assert.equal(shipped.length, reference.size)
    assert.equal(Object.keys(extracted).filter(name => name.startsWith('patterns/') && name.endsWith('.dxf')).length, reference.size)
    for (const [size, text] of reference) {
      const path = `patterns/${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${size.toLowerCase()}.dxf`
      assert.ok(files[path], `${size}: missing package DXF`)
      assert.ok(extracted[path], `${size}: missing ZIP DXF`)
      assert.equal(strFromU8(files[path]), text, `${size}: package matches independent audited DXF text`)
      assert.equal(strFromU8(extracted[path]), text, `${size}: ZIP matches independent audited DXF text`)
      assert.deepEqual(extracted[path], files[path], `${size}: ZIP bytes equal package bytes`)
      assert.equal(manifest.sha256[path], digest(files[path]), `${size}: manifest SHA-256 matches exact DXF bytes`)
      assert.equal(manifest.sha256[path], digest(extracted[path]), `${size}: manifest SHA-256 matches extracted ZIP bytes`)
      const recipientEntry = receiverPlan.sizes.find(row => row.size === size)
      assert.ok(recipientEntry, `${size}: missing recipient CAD exchange entry`)
      assert.equal(recipientEntry.outboundGenericDXF.sha256, manifest.sha256[path],
        `${size}: independently generated receiving-CAD digest matches packaged DXF`)
    }
    const readiness = JSON.parse(strFromU8(files['manufacturing-release-readiness.json']))
    assert.equal(readiness.factoryCertified, false)
    assert.equal(readiness.factoryCuttingAuthorized, false)
    assert.equal(readiness.bulkProductionAuthorized, false)
    assert.deepEqual(project, original, 'package generation preserves authored project')
  })
}

test('unsafe physical CUT overlap refuses files and ZIP before returning bytes', () => {
  const project = createTeeTemplate()
  const rectangle = id => ({...structuredClone(project.pieces[0]), id, name: id,
    points: [{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}], curves: {},
    seamAllowance: 6, edgeSeamAllowances: {}, notches: [], internalLines: [], buttonholes: []})
  project.pieces = [rectangle('overlap-a'), rectangle('overlap-b')]
  project.seams = []
  const before = structuredClone(project)
  for (const build of [buildFactoryPackageFiles, buildFactoryPackageZip]) {
    assert.throws(() => build(project), /Factory package refused: unsafe physical CUT contours.*PHYSICAL_CUT_INTERIOR_OVERLAP/)
  }
  assert.deepEqual(project, before)
})

test('invalid sewing reference refuses files and ZIP before returning bytes', () => {
  const project = createTeeTemplate()
  project.seams[0].a.edgeIndex = 999
  const before = structuredClone(project)
  for (const build of [buildFactoryPackageFiles, buildFactoryPackageZip]) {
    assert.throws(() => build(project), /Factory package refused: invalid a sewing reference/)
  }
  assert.deepEqual(project, before)
})
