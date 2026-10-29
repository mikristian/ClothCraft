import test from 'node:test'
import assert from 'node:assert/strict'
import { strFromU8, unzipSync } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { buildFactoryPackageFiles, buildFactoryPackageZip } from './factoryPackage.js'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'
import { auditMarkerRulerInkClearance20261024 } from './accumarkMarkerRulerInkClearance20261024.mjs'

const slug = value => String(value || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'

test('shared factory package ships the exact audited SVG/PDF bytes and unapproved plot QA evidence', () => {
  const project = createTeeTemplate()
  project.grading.sizes = [project.grading.baseSize]
  const before = structuredClone(project)
  const files = buildFactoryPackageFiles(project)
  const zipped = unzipSync(buildFactoryPackageZip(project))
  const report = JSON.parse(strFromU8(files['marker-plot-geometry-qa.json']))
  assert.equal(report.ok, true)
  assert.equal(report.factoryApproved, false)
  assert.equal(report.schema, 'exo.accumark.marker-plot-geometry-qa.v1')
  const size = project.grading.baseSize
  const graded = gradeProject(project, size)
  const markers = buildFabricMarkers(graded, project.markerSettings?.fabricWidthCm ?? 150, project.markerSettings?.gapCm ?? 1.5)
  assert.equal(report.rows.length, Object.keys(markers).length)
  for (const [fabricId, marker] of Object.entries(markers)) {
    const filename = `markers/${slug(project.name)}-${slug(fabricId)}-${slug(size)}`
    const calibrationFilename = `print-calibration/${slug(project.name)}-${slug(fabricId)}-${slug(size)}`
    const svg = strFromU8(files[`${filename}.svg`])
    const pdf = marker.placements.length ? files[`${filename}.pdf`] : null
    const row = report.rows.find(row => row.size === size && row.fabricId === fabricId)
    const separateCalibrationSheet = row.calibrationMode === 'separate-sheet'
    const calibrationSheet = separateCalibrationSheet
      ? { svg: strFromU8(files[`${calibrationFilename}.svg`]), pdf: files[`${calibrationFilename}.pdf`] } : null
    const qa = auditMarkerPlotParity20261024(marker, {
      svg, pdf, size, fabricName: project.fabrics?.[fabricId]?.name || fabricId, project: graded,
      calibrationSheet, separateCalibrationSheet, requirePrintedRegistration: true, requireRulerInkClearance: true,
    })
    assert.equal(qa.ok, true, JSON.stringify(qa.issues))
    const rulerAudit = auditMarkerRulerInkClearance20261024(marker, { size })
    assert.deepEqual(row, { size, fabricId, ...qa, onPageRulerInkAudit: rulerAudit,
      separateSheetReasonCodes: separateCalibrationSheet && !rulerAudit.ok ? rulerAudit.issues.map(issue => issue.code) : [] })
    assert.deepEqual(zipped[`${filename}.svg`], files[`${filename}.svg`])
    if (pdf) assert.deepEqual(zipped[`${filename}.pdf`], pdf)
    if (calibrationSheet) {
      assert.deepEqual(zipped[`${calibrationFilename}.svg`], files[`${calibrationFilename}.svg`])
      assert.deepEqual(zipped[`${calibrationFilename}.pdf`], files[`${calibrationFilename}.pdf`])
    }
  }
  assert.deepEqual(zipped['marker-plot-geometry-qa.json'], files['marker-plot-geometry-qa.json'])
  assert.deepEqual(project, before, 'plot gate does not mutate the authored garment')
})
