import test from 'node:test'
import assert from 'node:assert/strict'
import { markerToPdf, markerToSvg } from './markerArtifacts.js'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'
import { planSafeMarkerPdfPages20261024 } from './accumarkMarkerSafePageBreaks20261024.mjs'
import { inspectMarkerPageBoundarySafety20261024 } from './accumarkMarkerPageBoundarySafety20261024.mjs'

function marker(length, y, height, width = 50) {
  const x = 2, pieceWidth = 8
  return {
    width, length, fabricId: 'main', unusedPieces: 0,
    placements: [{
      pieceId: 'panel', name: 'Panel', instance: 0, x, y,
      width: pieceWidth, height,
      outline: [
        { x, y }, { x: x + pieceWidth, y },
        { x: x + pieceWidth, y: y + height }, { x, y: y + height },
      ],
    }],
  }
}

const pdfText = bytes => new TextDecoder().decode(bytes)
const pageHeights = bytes => [...pdfText(bytes).matchAll(/\/MediaBox \[0 0 [\d.]+ ([\d.]+)\]/g)].map(match => Number(match[1]))

test('factory plot relocates a 401cm page break into empty cutting space and audits the exact PDF', () => {
  const source = marker(401, 396, 5)
  const before = structuredClone(source)
  const pages = planSafeMarkerPdfPages20261024(source, 400, { calibration: true })
  assert.equal(pages.length, 2)
  assert.ok(pages[0].endCm < 395.95, JSON.stringify(pages))
  assert.equal(inspectMarkerPageBoundarySafety20261024(source, pages).ok, true)
  const pdf = markerToPdf(source, { calibration: true })
  assert.equal(pageHeights(pdf).length, 2)
  assert.equal((pdfText(pdf).match(/\bh S\b/g) || []).length, 1, 'cut contour is rendered on one page only')
  const audit = auditMarkerPlotParity20261024(source, { svg: markerToSvg(source, { calibration: true }), pdf })
  assert.equal(audit.ok, true, JSON.stringify(audit.issues))
  assert.equal(audit.physicalRegistrationVerified, false)
  assert.deepEqual(source, before)
})

test('already safe 401cm marker keeps the established 398/3cm page plan', () => {
  const source = marker(401, 398.1, 2.9)
  const pages = planSafeMarkerPdfPages20261024(source, 400, { calibration: true })
  assert.deepEqual(pages.map(page => page.endCm), [398, 401])
  const pdf = markerToPdf(source, { calibration: true })
  assert.equal(auditMarkerPlotParity20261024(source, { svg: markerToSvg(source, { calibration: true }), pdf }).ok, true)
})

test('no empty page-break gap fails closed rather than clipping a full-length cut', () => {
  const source = marker(401, 0, 401)
  assert.throws(() => planSafeMarkerPdfPages20261024(source, 400, { calibration: true }))
  assert.throws(() => markerToPdf(source, { calibration: true }))
  const legacy = markerToPdf(source, { calibration: false })
  const audit = auditMarkerPlotParity20261024(source, { svg: markerToSvg(source, { calibration: true }), pdf: legacy })
  assert.equal(audit.ok, false)
  assert.ok(audit.issues.some(issue => issue.code === 'PAGE_REGISTRATION' || issue.code === 'PDF_PARITY'))
})
