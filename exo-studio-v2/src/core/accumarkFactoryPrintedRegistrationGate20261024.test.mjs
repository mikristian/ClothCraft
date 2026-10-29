import test from 'node:test'
import assert from 'node:assert/strict'
import { markerToPdf, markerToSvg } from './markerArtifacts.js'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'
import { planSafeMarkerPdfPages20261024 } from './accumarkMarkerSafePageBreaks20261024.mjs'
import { planPrintedMarkerPageRegistration20261024 } from './accumarkPrintedPageRegistration20261024.mjs'

const decode = bytes => new TextDecoder().decode(bytes)
const rectangle = (name, x, y, width, height) => ({
  pieceId: name, name, instance: 0, x, y, width, height,
  outline: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }],
})
const marker = (placements, width = 50, length = 800) => ({
  width, length, fabricId: 'main', unusedPieces: 0, placements,
})

test('two-page factory PDF prints two verified open-ink registration targets and page/station labels on each page', () => {
  const source = marker([rectangle('Front', 15, 20, 8, 5), rectangle('Back', 15, 420, 8, 5)])
  const before = structuredClone(source)
  const pages = planSafeMarkerPdfPages20261024(source, 400, { calibration: true })
  const plan = planPrintedMarkerPageRegistration20261024(source, pages, { size: 'M', fabricId: 'main' })
  assert.equal(plan.ok, true, JSON.stringify(plan.issues))
  assert.deepEqual(plan.pages.map(p => p.targets.length), [2, 2])
  const pdf = decode(markerToPdf(source, { size: 'M', calibration: true }))
  assert.equal((pdf.match(/% EXO_PRINTED_REGISTRATION_BEGIN P\d/g) || []).length, 2)
  assert.equal((pdf.match(/% EXO_PRINTED_REGISTRATION_END P\d/g) || []).length, 2)
  assert.match(pdf, /\(P1\/2 A M main 0\.000-400\.000cm\) Tj ET/)
  assert.match(pdf, /\(P2\/2 B M main 400\.000-800\.000cm\) Tj ET/)
  const result = auditMarkerPlotParity20261024(source, {
    size: 'M', fabricName: 'main', svg: markerToSvg(source, { size: 'M', calibration: true }), pdf,
  })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.printableRegistrationTargetsVerified, true)
  assert.equal(result.physicalRegistrationVerified, false)
  assert.deepEqual(source, before)
})

test('altered or duplicated printable page targets and wrong visible stations fail the independent plot audit', () => {
  const source = marker([rectangle('Front', 15, 20, 8, 5), rectangle('Back', 15, 420, 8, 5)])
  const svg = markerToSvg(source, { size: 'M', calibration: true })
  const pdf = decode(markerToPdf(source, { size: 'M', calibration: true }))
  for (const mutated of [
    pdf.replace('0.2 G 0.35 w', '0.2 G 0.45 w'),
    pdf.replace('P2/2 B M main 400.000-800.000cm', 'P2/2 B M main 399.000-800.000cm'),
    pdf.replace('% EXO_PRINTED_REGISTRATION_END P2', '% EXO_PRINTED_REGISTRATION_END P1'),
    pdf.replace('% EXO_PRINTED_REGISTRATION_BEGIN P1', '% EXO_PRINTED_REGISTRATION_BEGIN P1\n% EXO_PRINTED_REGISTRATION_BEGIN P1'),
  ]) {
    assert.notEqual(mutated, pdf)
    const result = auditMarkerPlotParity20261024(source, { size: 'M', fabricName: 'main', svg, pdf: mutated })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some(issue => issue.code === 'PDF_PARITY'), JSON.stringify(result.issues))
  }
})

test('unsafe full-width multi-page cutting geometry refuses registration instead of silently printing marks on cuts', () => {
  const source = marker([
    rectangle('Full1', 0, 0, 50, 395),
    rectangle('Full2', 0, 405, 50, 395),
  ])
  const pages = planSafeMarkerPdfPages20261024(source, 400, { calibration: true })
  const plan = planPrintedMarkerPageRegistration20261024(source, pages)
  assert.equal(plan.ok, false)
  assert.ok(plan.issues.some(issue => ['NO_SAFE_REGISTRATION_POSITION', 'REGISTRATION_WORK_BUDGET'].includes(issue.code)))
  // Standalone drafting plots retain legacy preview behavior, but factory
  // packaging must never silently omit required multi-page registration ink.
  assert.doesNotThrow(() => markerToPdf(source, { calibration: true }))
  assert.throws(() => markerToPdf(source, { calibration: true, requirePrintedRegistration: true }), /Unsafe printable PDF registration/)
  const preview = markerToPdf(source, { calibration: true })
  const qa = auditMarkerPlotParity20261024(source, {
    svg: markerToSvg(source, { calibration: true }), pdf: preview,
  })
  assert.equal(qa.ok, true, JSON.stringify(qa.issues))
  assert.equal(qa.printableRegistrationTargetsVerified, false)
  const factoryQa = auditMarkerPlotParity20261024(source, {
    svg: markerToSvg(source, { calibration: true }), pdf: preview, requirePrintedRegistration: true,
  })
  assert.equal(factoryQa.ok, false)
})

test('single-page and Unicode provenance remain compatible, with no false physical registration claim', () => {
  const source = marker([rectangle('One', 15, 20, 8, 5)], 50, 100)
  source.fabricId = 'coté'
  const size = 'M 🌿'
  const pdf = decode(markerToPdf(source, { size, calibration: true }))
  assert.equal(pdf.includes('EXO_PRINTED_REGISTRATION_BEGIN'), false)
  const result = auditMarkerPlotParity20261024(source, {
    size, fabricName: source.fabricId, svg: markerToSvg(source, { size, calibration: true }), pdf,
  })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.physicalRegistrationVerified, false)
})
