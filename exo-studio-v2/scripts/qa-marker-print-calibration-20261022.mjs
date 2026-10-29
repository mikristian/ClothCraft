import assert from 'node:assert/strict'
import { markerToPdf, markerToSvg } from '../src/core/markerArtifacts.js'

const marker = { width: 80, length: 50, unusedPieces: 0, placements: [] }
const options = { size: 'M', calibration: true }
const svg = markerToSvg(marker, options)
assert.match(svg, /id="print-scale-check"/)
assert.match(svg, /x1="0.5" y1="2" x2="10.5" y2="2"/)
assert.match(svg, /100 mm SCALE CHECK/)
assert.doesNotMatch(markerToSvg(marker), /print-scale-check/)

const pdf = new TextDecoder().decode(markerToPdf(marker, options))
assert.match(pdf, /100 mm SCALE CHECK - VERIFY WITH RULER/)
// Check the exact 10 cm physical calibration distance in PDF points.
const expectedPt = 10 * 72 / 2.54
assert.match(pdf, /100 mm SCALE CHECK/)
assert.doesNotMatch(new TextDecoder().decode(markerToPdf(marker)), /SCALE CHECK/)
const segments = [...pdf.matchAll(/([\d.]+) ([\d.]+) m ([\d.]+) \2 l S/g)]
assert.ok(segments.some(([, a,, b]) => Math.abs((Number(b) - Number(a)) - expectedPt) < 0.001), 'PDF calibration ruler must measure 100 mm')

// Multi-page marker rulers must stay inside *every* PDF page, including
// pages after the 400 cm cut. Source-local y values must include page offset.
const multi = new TextDecoder().decode(markerToPdf({ ...marker, length: 805 }, { ...options, pageLengthCm: 400 }))
const pages = [...multi.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)]
assert.equal(pages.length, 3)
const streams = [...multi.matchAll(/stream\n([\s\S]*?)endstream/g)].map(item => item[1])
assert.equal(streams.length, 3)
for (const [index, stream] of streams.entries()) {
  const match = stream.match(/([\d.]+) ([\d.]+) m ([\d.]+) \2 l S/)
  assert.ok(match, `Missing 100 mm calibration line on page ${index + 1}`)
  const y = Number(match[2])
  assert.ok(y >= 0 && y <= Number(pages[index][2]), `Calibration ruler off page ${index + 1}: y=${y}`)
}

const small = { ...marker, width: 8 }
assert.doesNotMatch(markerToSvg(small, options), /print-scale-check/)
assert.doesNotMatch(new TextDecoder().decode(markerToPdf(small, options)), /SCALE CHECK/)
console.log(JSON.stringify({ pass: true, svgRulerMm: 100, pdfRulerMm: 100, multiPageRulers: 3, smallSheetSafeguard: true, baselineUnaffected: true }))
