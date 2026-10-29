import test from 'node:test'
import assert from 'node:assert/strict'
import { makeMarkerCalibrationSheet20261024, auditMarkerCalibrationSheet20261024 } from './accumarkMarkerCalibrationSheet20261024.mjs'
import { markerToPdf, markerToSvg } from './markerArtifacts.js'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles, buildFactoryPackageZip } from './factoryPackage.js'
import { strFromU8, unzipSync } from 'fflate'
import { sha256Bytes } from './sha256Bytes.js'

const asText = bytes => new TextDecoder().decode(bytes)
const marker = (width, length) => ({
  fabricId: 'rib', width, length, unusedPieces: 0,
  placements: [{ pieceId: 'binding', name: 'Binding', instance: 0,
    x: 0.5, y: 0.5, width: Math.min(2, width - 1), height: Math.min(1, length - 0.5),
    outline: [
      { x: 0.5, y: 0.5 }, { x: 0.5 + Math.min(2, width - 1), y: 0.5 },
      { x: 0.5 + Math.min(2, width - 1), y: 0.5 + Math.min(1, length - 0.5) },
      { x: 0.5, y: 0.5 + Math.min(1, length - 0.5) },
    ],
  }],
})

test('standalone sheet has 12cm true-size media, independent 100mm X/Y axes, no cutter contours, and no physical approval', () => {
  const sheet = makeMarkerCalibrationSheet20261024({ size: 'XS', fabricId: 'rib' })
  const pdf = asText(sheet.pdf)
  assert.match(sheet.svg, /width="12cm" height="12cm" viewBox="0 0 12 12"/)
  assert.match(sheet.svg, /id="ruler-x" x1="1" y1="11" x2="11" y2="11"/)
  assert.match(sheet.svg, /id="ruler-y" x1="1" y1="11" x2="1" y2="1"/)
  assert.doesNotMatch(sheet.svg, /id="cut-lines"|<polygon\b/)
  assert.match(pdf, /\/MediaBox \[0 0 340\.1575 340\.1575\]/)
  assert.match(pdf, /NOT CUT DATA/)
  assert.doesNotMatch(pdf, /\bh S\b/)
  const result = auditMarkerCalibrationSheet20261024(sheet, { size: 'XS', fabricId: 'rib' })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.physicalScaleVerified, false)
  assert.equal(result.factoryApproved, false)
})

test('narrow marker retains original cutting dimensions and requires separately audited two-axis sheet', () => {
  const input = marker(8, 401)
  const before = structuredClone(input)
  const svg = markerToSvg(input, { size: 'XS', calibration: true })
  const pdf = markerToPdf(input, { size: 'XS', calibration: true })
  const sheet = makeMarkerCalibrationSheet20261024({ size: 'XS', fabricId: 'rib' })
  assert.match(svg, /width="8cm" height="401cm"/)
  assert.doesNotMatch(svg, /print-scale-check/)
  assert.equal((asText(pdf).match(/100 mm SCALE CHECK/g) || []).length, 0)
  assert.equal((asText(pdf).match(/\/Type \/Page \/Parent/g) || []).length, 2)
  const missing = auditMarkerPlotParity20261024(input, { svg, pdf, size: 'XS' })
  assert.equal(missing.ok, false)
  assert.ok(missing.issues.some(issue => issue.code === 'MISSING_CALIBRATION'))
  const result = auditMarkerPlotParity20261024(input, { svg, pdf, size: 'XS', calibrationSheet: sheet })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.calibrationMode, 'separate-sheet')
  assert.equal(result.factoryApproved, false)
  assert.deepEqual(input, before)
})

test('short marker below 3cm uses an unmodified one-page plot plus the separate scale sheet', () => {
  const input = marker(8, 1.5)
  const sheet = makeMarkerCalibrationSheet20261024({ size: 'BASE', fabricId: 'rib' })
  const svg = markerToSvg(input, { calibration: true })
  const pdf = markerToPdf(input, { calibration: true })
  const result = auditMarkerPlotParity20261024(input, { svg, pdf, calibrationSheet: sheet })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.match(asText(pdf), /\/Count 1 >>/)
})

test('populated marker below 1cm refuses SVG/PDF length mismatch despite a valid separate sheet', () => {
  const input = marker(8, 0.8)
  const svg = markerToSvg(input, { calibration: true })
  const pdf = markerToPdf(input, { calibration: true })
  assert.match(svg, /height="1cm"/)
  assert.match(asText(pdf), /\/MediaBox \[0 0 226\.7717 22\.6772\]/)
  const result = auditMarkerPlotParity20261024(input, { svg, pdf,
    calibrationSheet: makeMarkerCalibrationSheet20261024({ fabricId: 'rib' }),
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.some(issue => issue.code === 'INVALID_MARKER'))
})

test('sheet rejects altered PDF axis, page scaling, missing bytes and changed provenance', () => {
  const sheet = makeMarkerCalibrationSheet20261024({ size: 'XS', fabricId: 'rib' })
  const pdf = asText(sheet.pdf)
  const changed = [
    { ...sheet, pdf: new TextEncoder().encode(pdf.replace('311.811 28.3465 l S', '310.811 28.3465 l S')) },
    { ...sheet, pdf: new TextEncoder().encode(pdf.replace('340.1575 340.1575', '340.1575 300.1575')) },
    { ...sheet, svg: sheet.svg.replace('x2="11" y2="11"', 'x2="10" y2="11"') },
    { ...sheet, svg: sheet.svg.replace('width="12cm"', 'width="11cm"') },
    { ...sheet, pdf: null },
  ]
  for (const candidate of changed) assert.equal(auditMarkerCalibrationSheet20261024(candidate, { size: 'XS', fabricId: 'rib' }).ok, false)
  assert.equal(auditMarkerCalibrationSheet20261024(sheet, { size: 'M', fabricId: 'rib' }).ok, false)
  const other = makeMarkerCalibrationSheet20261024({ size: 'XXL', fabricId: 'other' })
  assert.notDeepEqual(other.pdf, sheet.pdf, 'PDF bytes bind to exact size/fabric provenance')
  assert.equal(auditMarkerCalibrationSheet20261024({ svg: sheet.svg, pdf: other.pdf }, { size: 'XS', fabricId: 'rib' }).ok, false)
})

test('normal full-width markers reject extraneous sheet and preserve on-page ruler', () => {
  const input = marker(50, 20)
  const svg = markerToSvg(input, { calibration: true })
  const pdf = markerToPdf(input, { calibration: true })
  assert.equal(auditMarkerPlotParity20261024(input, { svg, pdf }).calibrationMode, 'on-page')
  const result = auditMarkerPlotParity20261024(input, { svg, pdf,
    calibrationSheet: makeMarkerCalibrationSheet20261024({ fabricId: 'rib' }),
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.some(issue => issue.code === 'MISSING_CALIBRATION'))
})

test('shared factory ZIP packages exact audited narrow marker and separate witness bytes with manifest digests', () => {
  // Scale an in-memory tee fixture only. No saved garment or installed app is touched.
  const project = createTeeTemplate()
  project.grading.sizes = [project.grading.baseSize]
  project.markerSettings.fabricWidthCm = 10
  project.markerSettings.gapCm = 0.25
  for (const piece of project.pieces) {
    for (const p of piece.points) { p.x *= 0.1; p.y *= 0.1 }
    for (const curve of Object.values(piece.curves || {})) {
      if ('cx' in curve) curve.cx *= 0.1
      if ('cy' in curve) curve.cy *= 0.1
    }
    piece.seamAllowance *= 0.1
    for (const edge of Object.keys(piece.edgeSeamAllowances || {})) piece.edgeSeamAllowances[edge] *= 0.1
    for (const notch of piece.notches || []) notch.depthCm *= 0.1
  }
  const before = structuredClone(project)
  const files = buildFactoryPackageFiles(project)
  const zipped = unzipSync(buildFactoryPackageZip(project))
  const report = JSON.parse(strFromU8(files['marker-plot-geometry-qa.json']))
  assert.equal(report.ok, true)
  assert.equal(report.factoryApproved, false)
  assert.equal(report.rows.length, 1)
  assert.equal(report.rows[0].calibrationMode, 'separate-sheet')
  const prefix = 'markers/foundation-tee-first-fit-test-main-m'
  const calibrationPrefix = 'print-calibration/foundation-tee-first-fit-test-main-m'
  const sheet = { svg: strFromU8(files[`${calibrationPrefix}.svg`]), pdf: files[`${calibrationPrefix}.pdf`] }
  assert.equal(auditMarkerCalibrationSheet20261024(sheet, { size: 'M', fabricId: 'main' }).ok, true)
  for (const name of [`${prefix}.svg`, `${prefix}.pdf`, `${calibrationPrefix}.svg`, `${calibrationPrefix}.pdf`]) {
    assert.ok(files[name], `${name} exists`)
    assert.deepEqual(zipped[name], files[name], `${name} exact ZIP bytes`)
    const manifest = JSON.parse(strFromU8(files['manifest.json']))
    assert.equal(manifest.sha256[name], sha256Bytes(files[name]), `${name} SHA-256`)
  }
  assert.deepEqual(project, before, 'in-memory fixture remains unchanged during export')
})
