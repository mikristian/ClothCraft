import assert from 'node:assert/strict'
import { test } from 'node:test'
import { patternPrintReference } from './patternPrintReference.js'
import { patternTiledPrint } from './patternTiledPrint.js'

const denseBoundary = () => [Array.from({ length: 170_000 }, (_, index) => [index % 100, index % 50])]

test('large finite 2D drafting boundary exports a measured SVG without argument-stack overflow', () => {
  const lines = denseBoundary()
  const first = [...lines[0][0]]
  const last = [...lines[0].at(-1)]
  const reference = patternPrintReference(lines)
  assert.equal(reference.widthMm, 120)
  assert.equal(reference.heightMm, 199)
  assert.match(reference.svg, /viewBox="-10 -10 120 199"/)
  assert.match(reference.svg, /data-print-calibration="100mm"/)
  assert.deepEqual(lines[0][0], first)
  assert.deepEqual(lines[0].at(-1), last)
})

test('same large drafting boundary paginates into calibrated A4 reference tiles', () => {
  const result = patternTiledPrint(denseBoundary(), { format: 'A4', revision: 24 })
  assert.equal(result.rows, 1)
  assert.equal(result.columns, 1)
  assert.equal(result.tiles[0].x, -10)
  assert.equal(result.tiles[0].y, -10)
  assert.equal(result.pageCount, 2)
  assert.match(result.html, /100 × 100 mm/)
})

test('invalid or oversized drafting boundaries remain rejected', () => {
  assert.throws(() => patternPrintReference([[[0, 0], [Infinity, 1]]]), /finite millimetre/)
  assert.throws(() => patternTiledPrint([[[0, 0], [30_000, 1]]]), /20 m/)
})
