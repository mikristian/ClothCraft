import test from 'node:test'
import assert from 'node:assert/strict'
import { planPrintedMarkerPageRegistration20261024 as plan, auditPrintedMarkerPageRegistration20261024 as audit } from './accumarkPrintedPageRegistration20261024.mjs'
import { auditMarkerRulerInkClearance20261024 } from './accumarkMarkerRulerInkClearance20261024.mjs'
import { makeMarkerCalibrationSheet20261024 } from './accumarkMarkerCalibrationSheet20261024.mjs'
import { markerToPdf, markerToSvg } from './markerArtifacts.js'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'

const marker = () => ({
  width: 24, length: 24, fabricId: 'main', unusedPieces: 0,
  placements: [{
    name: 'ruler collision', instance: 0, pieceId: 'cut-1',
    x: 1, y: 1.9, width: 2, height: 0.2,
    outline: [{ x: 1, y: 1.9 }, { x: 3, y: 1.9 }, { x: 3, y: 2.1 }, { x: 1, y: 2.1 }],
  }],
})
const pages = [{ startCm: 0, endCm: 12, heightCm: 12 }, { startCm: 12, endCm: 24, heightCm: 12 }]

test('registration planner reserves ruler ink only when ruler is actually printed', () => {
  const source = marker()
  const withRuler = plan(source, pages, { size: 'M', fabricId: 'main', includeRuler: true })
  const withoutRuler = plan(source, pages, { size: 'M', fabricId: 'main', includeRuler: false })
  assert.equal(withRuler.ok, true, JSON.stringify(withRuler.issues))
  assert.equal(withoutRuler.ok, true, JSON.stringify(withoutRuler.issues))
  assert.ok(withRuler.pages[0].targets[0].segments[0][0].x > 10.5)
  assert.equal(withoutRuler.pages[0].targets[0].segments[0][0].x, 0.59)
  assert.equal(audit(source, pages, withoutRuler, { size: 'M', fabricId: 'main', includeRuler: false }).ok, true)
  assert.equal(audit(source, pages, withoutRuler, { size: 'M', fabricId: 'main', includeRuler: true }).ok, false)
  const malformed = plan(source, pages, { size: 'M', fabricId: 'main', includeRuler: 'false' })
  assert.equal(malformed.ok, false)
  assert.equal(malformed.issues[0].code, 'INVALID_REGISTRATION_INPUT')
})

test('separate calibration sheet uses cut-free registration space without reserving an omitted ruler', () => {
  const source = marker()
  const clearance = auditMarkerRulerInkClearance20261024(source, { pageLengthCm: 12, size: 'M' })
  assert.equal(clearance.ok, false)
  assert.ok(clearance.issues.some(issue => issue.code === 'RULER_INK_OVER_CUT_PIECE'))
  const svg = markerToSvg(source, { size: 'M', fabricName: 'main', calibration: true, separateCalibrationSheet: true })
  const pdf = markerToPdf(source, { size: 'M', pageLengthCm: 12, calibration: true, requirePrintedRegistration: true, separateCalibrationSheet: true })
  const pdfText = new TextDecoder().decode(pdf)
  const first = pdfText.match(/% EXO_PRINTED_REGISTRATION_BEGIN P1\n[^\n]*\n([\d.]+) [\d.]+ m/)
  assert.ok(first, 'printed registration target must exist on page one')
  assert.equal(Number(first[1]), Number((0.59 * 72 / 2.54).toFixed(4)), 'the omitted ruler must not occupy free registration space')
  const result = auditMarkerPlotParity20261024(source, {
    svg, pdf, size: 'M', fabricName: 'main', pageLengthCm: 12,
    calibrationSheet: makeMarkerCalibrationSheet20261024({ size: 'M', fabricId: 'main' }),
    separateCalibrationSheet: true, requirePrintedRegistration: true, requireRulerInkClearance: true,
  })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.factoryApproved, false)
  assert.equal(result.physicalRegistrationVerified, false)
})
