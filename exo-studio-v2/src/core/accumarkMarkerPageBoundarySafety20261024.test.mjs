import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectMarkerPageBoundarySafety20261024 as inspect } from './accumarkMarkerPageBoundarySafety20261024.mjs'
import { planCalibratedMarkerPdfPages20261024 as plan } from './accumarkMarkerCalibrationPagination20261024.mjs'
import { markerToSvg, markerToPdf } from './markerArtifacts.js'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'
import { planSafeMarkerPdfPages20261024 } from './accumarkMarkerSafePageBreaks20261024.mjs'

const rectangle = (y, height, x = 2) => ({
  x, y, width: 5, height, name: 'Panel', instance: 0,
  outline: [{ x, y }, { x: x + 5, y }, { x: x + 5, y: y + height }, { x, y: y + height }],
})
const marker = (...placements) => ({ width: 50, length: 401, fabricId: 'main', unusedPieces: 0, placements })
const pages = () => plan(401, 400, { calibration: true })

test('calibrated multi-page PDF preserves safe contours on either side of its 398 cm break', () => {
  const m = marker(rectangle(395, 2.9), rectangle(398.1, 2))
  const before = structuredClone(m)
  const result = inspect(m, pages())
  assert.deepEqual(result, { ok: true, issues: [], checkedBoundaries: 1, physicalRegistrationVerified: false })
  const svg = markerToSvg(m, { calibration: true })
  const pdf = markerToPdf(m, { calibration: true })
  const audit = auditMarkerPlotParity20261024(m, { svg, pdf })
  assert.equal(audit.ok, true, JSON.stringify(audit.issues))
  assert.equal(audit.physicalRegistrationVerified, false)
  assert.deepEqual(m, before)
})

test('rejects the unsafe fixed break but moves the calibrated break to an empty gap', () => {
  const m = marker(rectangle(397, 2))
  const result = inspect(m, pages())
  assert.equal(result.ok, false)
  assert.equal(result.issues[0].code, 'CUT_CONTOUR_SPLIT_ACROSS_PAGES')
  assert.equal(result.issues[0].boundaryCm, 398)
  const safePages = planSafeMarkerPdfPages20261024(m, 400, { calibration: true })
  assert.equal(inspect(m, safePages).ok, true)
  const safePdf = markerToPdf(m, { calibration: true })
  assert.equal(auditMarkerPlotParity20261024(m, {
    svg: markerToSvg(m, { calibration: true }), pdf: safePdf,
  }).ok, true)
  // Legacy non-calibrated PDF remains available for internal preview; the
  // manufacturing parity gate independently rejects that unsafe cut split.
  const legacyPdf = markerToPdf(m, { calibration: false })
  const qa = auditMarkerPlotParity20261024(m, { svg: markerToSvg(m, { calibration: true }), pdf: legacyPdf })
  assert.ok(qa.issues.some(issue => issue.code === 'PDF_PARITY'), JSON.stringify(qa.issues))
})

test('fixed boundaries reject touching and near-edge contours while safe planner relocates', () => {
  for (const [y, height] of [[397, 1], [398, 2], [397.94, 0.03], [398.02, 0.02]]) {
    const m = marker(rectangle(y, height))
    const result = inspect(m, pages())
    assert.equal(result.ok, false, `${y} ${height}`)
    assert.equal(result.issues[0].code, 'CUT_CONTOUR_AT_PAGE_EDGE')
    const safePages = planSafeMarkerPdfPages20261024(m, 400, { calibration: true })
    assert.equal(inspect(m, safePages).ok, true)
    assert.doesNotThrow(() => markerToPdf(m, { calibration: true }))
  }
})

test('respects narrow-marker page boundaries and custom page lengths', () => {
  const narrow = { ...marker(rectangle(399.8, 0.5)), width: 10 }
  const narrowPages = plan(401, 400, { calibration: false })
  assert.equal(narrowPages[0].endCm, 400)
  assert.equal(inspect(narrow, narrowPages).issues[0].code, 'CUT_CONTOUR_SPLIT_ACROSS_PAGES')
  const safeNarrowPages = planSafeMarkerPdfPages20261024(narrow, 400, { calibration: false })
  assert.equal(inspect(narrow, safeNarrowPages).ok, true)
  assert.doesNotThrow(() => markerToPdf(narrow, { calibration: true }))
  const shortPages = plan(401, 200, { calibration: true })
  assert.deepEqual(shortPages.map(p => p.endCm), [200, 398, 401])
  assert.equal(inspect(marker(rectangle(199.5, 1)), shortPages).issues[0].boundaryCm, 200)
})

test('invalid page plans and nonfinite contour stations fail closed', () => {
  const valid = marker(rectangle(5, 3))
  for (const invalidPages of [
    [null],
    [{ startCm: 0, endCm: 401, heightCm: NaN }],
    [{ startCm: 0, endCm: 401, heightCm: 400 }],
    [{ startCm: 0, endCm: 200, heightCm: 200 }, { startCm: 199, endCm: 401, heightCm: 202 }],
  ]) {
    assert.equal(inspect(valid, invalidPages).issues[0].code, 'INVALID_PAGE_PLAN')
  }
  const invalid = marker(rectangle(5, 3))
  invalid.placements[0].outline[2].y = NaN
  assert.equal(inspect(invalid, pages()).issues[0].code, 'INVALID_CUT_CONTOUR')
})
