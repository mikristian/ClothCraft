import test from 'node:test'
import assert from 'node:assert/strict'
import { strFromU8 } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { markerToPdf, markerToSvg } from './markerArtifacts.js'
import { makeMarkerCalibrationSheet20261024 } from './accumarkMarkerCalibrationSheet20261024.mjs'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'
import { auditMarkerRulerInkClearance20261024 } from './accumarkMarkerRulerInkClearance20261024.mjs'
import { sha256Bytes } from './sha256Bytes.js'

const rect = (x, y, width, height) => ({
  x, y, width, height, name: 'Panel', instance: 0,
  outline: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }],
})
const marker = placement => ({ width: 30, length: 30, fabricId: 'main', unusedPieces: 0, placements: [placement] })
const plot = (source, separateCalibrationSheet) => ({
  svg: markerToSvg(source, { calibration: true, separateCalibrationSheet }),
  pdf: markerToPdf(source, { calibration: true, separateCalibrationSheet, requirePrintedRegistration: true }),
})

test('unsafe ruler ink is replaced with a separate verified sheet without changing cutting paths', () => {
  const source = marker(rect(.4, 1.7, 10.3, .6))
  const before = structuredClone(source)
  assert.equal(auditMarkerRulerInkClearance20261024(source).ok, false)
  const { svg, pdf } = plot(source, true)
  const sheet = makeMarkerCalibrationSheet20261024({ fabricId: 'main' })
  const result = auditMarkerPlotParity20261024(source, {
    svg, pdf, calibrationSheet: sheet, separateCalibrationSheet: true,
    requirePrintedRegistration: true, requireRulerInkClearance: true,
  })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.calibrationMode, 'separate-sheet')
  assert.equal(result.separateCalibrationSheetVerified, true)
  assert.equal(result.rulerInkClearanceVerified, false)
  assert.equal(result.factoryApproved, false)
  assert.doesNotMatch(svg, /id="print-scale-check"/)
  assert.doesNotMatch(new TextDecoder().decode(pdf), /100 mm SCALE CHECK/)
  assert.equal((svg.match(/<polygon /g) || []).length, 1)
  assert.deepEqual(source, before)
})

test('fallback refuses missing, altered or mismatched separate calibration evidence', () => {
  const source = marker(rect(.4, 1.7, 10.3, .6))
  const { svg, pdf } = plot(source, true)
  const sheet = makeMarkerCalibrationSheet20261024({ fabricId: 'main' })
  for (const calibrationSheet of [null, { ...sheet, svg: sheet.svg.replace('x2="11"', 'x2="10"') },
    makeMarkerCalibrationSheet20261024({ fabricId: 'other' })]) {
    const result = auditMarkerPlotParity20261024(source, {
      svg, pdf, calibrationSheet, separateCalibrationSheet: true, requireRulerInkClearance: true,
    })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some(issue => issue.code === 'MISSING_CALIBRATION'))
  }
  const unexpectedRuler = markerToSvg(source, { calibration: true })
  const result = auditMarkerPlotParity20261024(source, {
    svg: unexpectedRuler, pdf, calibrationSheet: sheet, separateCalibrationSheet: true,
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.some(issue => issue.code === 'SVG_PARITY'))
})

test('safe on-page ruler still passes strict digital ink clearance', () => {
  const source = marker(rect(18, 12, 3, 4))
  const { svg, pdf } = plot(source, false)
  const result = auditMarkerPlotParity20261024(source, {
    svg, pdf, requireRulerInkClearance: true, requirePrintedRegistration: true,
  })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.calibrationMode, 'on-page')
  assert.equal(result.rulerInkClearanceVerified, true)
  assert.equal(result.separateCalibrationSheetVerified, false)
})

test('second-page ruler collision uses one consistent sheet mode across every PDF page and SVG', () => {
  const source = { width: 30, length: 800, fabricId: 'main', unusedPieces: 0,
    placements: [rect(18, 12, 3, 4), rect(.4, 401.7, 10.3, .6)] }
  const clearance = auditMarkerRulerInkClearance20261024(source)
  assert.equal(clearance.ok, false)
  assert.ok(clearance.issues.some(issue => issue.code === 'RULER_INK_OVER_CUT_PIECE' && issue.pageIndex === 2))
  const sheet = makeMarkerCalibrationSheet20261024({ fabricId: 'main' })
  const { svg, pdf } = plot(source, true)
  const result = auditMarkerPlotParity20261024(source, {
    svg, pdf, calibrationSheet: sheet, separateCalibrationSheet: true,
    requirePrintedRegistration: true, requireRulerInkClearance: true,
  })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.digitalPageIdentityVerified, true)
  assert.doesNotMatch(new TextDecoder().decode(pdf), /100 mm SCALE CHECK/)
  const crossFormat = auditMarkerPlotParity20261024(source, {
    svg: markerToSvg(source, { calibration: true }), pdf, calibrationSheet: sheet,
    separateCalibrationSheet: true, requirePrintedRegistration: true,
  })
  assert.equal(crossFormat.ok, false)
  assert.ok(crossFormat.issues.some(issue => issue.code === 'SVG_PARITY'))
})

test('all six Foundation Tee factory markers use exact checked separate sheets when ruler ink collides', () => {
  const project = createTeeTemplate()
  const before = structuredClone(project)
  const files = buildFactoryPackageFiles(project)
  const report = JSON.parse(strFromU8(files['marker-plot-geometry-qa.json']))
  const manifest = JSON.parse(strFromU8(files['manifest.json']))
  assert.equal(report.factoryApproved, false)
  assert.deepEqual(new Set(report.rows.map(row => row.size)), new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']))
  for (const row of report.rows) {
    assert.equal(row.ok, true)
    assert.equal(row.calibrationMode, 'separate-sheet')
    assert.equal(row.separateCalibrationSheetVerified, true)
    assert.ok(row.separateSheetReasonCodes.includes('RULER_INK_OVER_CUT_PIECE'))
    const prefix = `foundation-tee-first-fit-test-main-${row.size.toLowerCase()}`
    const markerSvg = `markers/${prefix}.svg`
    const markerPdf = `markers/${prefix}.pdf`
    assert.doesNotMatch(strFromU8(files[markerSvg]), /id="print-scale-check"/)
    assert.doesNotMatch(strFromU8(files[markerPdf]), /100 mm SCALE CHECK/)
    for (const path of [markerSvg, markerPdf, `print-calibration/${prefix}.svg`, `print-calibration/${prefix}.pdf`]) {
      assert.ok(files[path], `missing ${path}`)
      assert.equal(manifest.sha256[path], sha256Bytes(files[path]))
    }
  }
  assert.deepEqual(project, before)
})
