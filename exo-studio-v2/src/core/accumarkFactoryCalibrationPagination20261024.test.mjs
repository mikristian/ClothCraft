import test from 'node:test'
import assert from 'node:assert/strict'
import { markerToPdf, markerToSvg } from './markerArtifacts.js'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'

function markerWithCrossPageCut(length, y, height) {
  const x = 2, width = 10
  return {
    fabricId: 'main', width: 50, length, unusedPieces: 0,
    placements: [{
      pieceId: 'panel', name: 'Panel', instance: 0,
      x, y, width, height,
      outline: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }],
    }],
  }
}

const pdfText = bytes => new TextDecoder().decode(bytes)
const mediaBoxes = text => [...text.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)]
  .map(match => ({ widthPt: Number(match[1]), heightPt: Number(match[2]) }))

test('401cm factory plot moves a page break into empty space rather than splitting a cutting contour', () => {
  const crossing = markerWithCrossPageCut(401, 396, 5)
  const rescued = markerToPdf(crossing, { calibration: true })
  assert.equal(mediaBoxes(pdfText(rescued)).length, 2)
  assert.equal((pdfText(rescued).match(/h S\n/g) || []).length, 1)
  assert.equal(auditMarkerPlotParity20261024(crossing, {
    svg: markerToSvg(crossing, { calibration: true }), pdf: rescued,
  }).ok, true)
  const rejected = auditMarkerPlotParity20261024(crossing, {
    svg: markerToSvg(crossing, { calibration: true }),
    pdf: markerToPdf(crossing, { calibration: false }),
  })
  assert.ok(rejected.issues.some(issue => issue.code === 'PDF_PARITY'))
  const marker = markerWithCrossPageCut(401, 398.1, 2.9)
  const svg = markerToSvg(marker, { calibration: true })
  const pdf = markerToPdf(marker, { calibration: true })
  const text = pdfText(pdf)
  const pages = mediaBoxes(text)
  assert.equal(pages.length, 2)
  assert.ok(pages[0].heightPt < 400 * 72 / 2.54)
  assert.ok(pages[1].heightPt >= 3 * 72 / 2.54 - 0.0002)
  assert.equal((text.match(/100 mm SCALE CHECK - VERIFY WITH RULER/g) || []).length, 2)
  assert.equal((text.match(/h S\n/g) || []).length, 1, 'cut contour is never split across pages')
  const qa = auditMarkerPlotParity20261024(marker, { svg, pdf })
  assert.equal(qa.ok, true, JSON.stringify(qa.issues))
  assert.equal(qa.factoryApproved, false)
})

test('800.5cm three-page factory plot preserves every calibration ruler without a sub-3cm final page', () => {
  const marker = markerWithCrossPageCut(800.5, 797.6, 2.9)
  const svg = markerToSvg(marker, { calibration: true })
  const pdf = markerToPdf(marker, { calibration: true })
  const text = pdfText(pdf)
  const pages = mediaBoxes(text)
  assert.equal(pages.length, 3)
  assert.ok(pages.every(page => page.heightPt >= 3 * 72 / 2.54 - 0.0002))
  assert.equal((text.match(/100 mm SCALE CHECK - VERIFY WITH RULER/g) || []).length, 3)
  const qa = auditMarkerPlotParity20261024(marker, { svg, pdf })
  assert.equal(qa.ok, true, JSON.stringify(qa.issues))
})

test('ordinary calibrated PDF page boundaries remain stable and narrow plots remain rejected', () => {
  const marker = markerWithCrossPageCut(600, 595, 5)
  const svg = markerToSvg(marker, { calibration: true })
  const pdf = markerToPdf(marker, { calibration: true })
  const pages = mediaBoxes(pdfText(pdf))
  assert.equal(pages.length, 2)
  assert.ok(Math.abs(pages[0].heightPt - 400 * 72 / 2.54) < 0.0002)
  assert.ok(Math.abs(pages[1].heightPt - 200 * 72 / 2.54) < 0.0002)
  assert.equal(auditMarkerPlotParity20261024(marker, { svg, pdf }).ok, true)
  const narrow = markerWithCrossPageCut(401, 390, 5)
  narrow.width = 10
  narrow.placements[0].width = 6
  narrow.placements[0].outline[1].x = 8
  narrow.placements[0].outline[2].x = 8
  const result = auditMarkerPlotParity20261024(narrow, {
    svg: markerToSvg(narrow, { calibration: true }),
    pdf: markerToPdf(narrow, { calibration: true }),
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.some(issue => issue.code === 'MISSING_CALIBRATION'))
})

test('fractional page-boundary tails remain calibrated with default and custom page lengths', () => {
  for (const [length, pageLengthCm] of [
    [400.001, 400], [402.999, 400], [800.001, 400], [10.1, 10],
  ]) {
    const marker = markerWithCrossPageCut(length, length - 1.5, 1.5)
    const svg = markerToSvg(marker, { calibration: true })
    const pdf = markerToPdf(marker, { calibration: true, pageLengthCm })
    const pages = mediaBoxes(pdfText(pdf))
    assert.equal(pages.length, Math.ceil(length / pageLengthCm), `page count at ${length}`)
    assert.ok(pages.every(page => page.heightPt >= 3 * 72 / 2.54 - 0.0002), `ruler height at ${length}`)
    const result = auditMarkerPlotParity20261024(marker, { svg, pdf, pageLengthCm })
    assert.equal(result.ok, true, `${length}: ${JSON.stringify(result.issues)}`)
  }
})
