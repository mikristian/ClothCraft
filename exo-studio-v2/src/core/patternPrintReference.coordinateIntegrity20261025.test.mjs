import test from 'node:test'
import assert from 'node:assert/strict'
import {patternPrintReference} from './patternPrintReference.js'
import {patternTiledPrint} from './patternTiledPrint.js'

const invalidCoordinates = () => [
  [, 5],
  [5, ,],
  [, ,],
  Object.assign([Infinity, 5], {every: () => true}),
]

test('print reference rejects sparse or validation-spoofed coordinate arrays', () => {
  for (const point of invalidCoordinates()) {
    assert.throws(() => patternPrintReference([[[0, 0], point]]),
      /finite millimetre coordinates/, `Should reject ${String(point)}`)
  }
})

test('tiled reference also rejects sparse coordinate arrays before pagination', () => {
  assert.throws(() => patternTiledPrint([[[0, 0], [, 5]]]), /finite millimetre coordinates/)
})

test('ordinary finite boundaries produce finite SVG dimensions and a 100 mm reference', () => {
  const lines = [[[0, 0], [100, 0], [100, 50], [0, 50]]]
  const original = structuredClone(lines)
  const reference = patternPrintReference(lines)
  assert.equal(reference.widthMm, 120)
  assert.equal(reference.heightMm, 200)
  assert.equal(reference.calibrationMm, 100)
  assert.doesNotMatch(reference.svg, /(?:NaN|Infinity)/)
  assert.match(reference.svg, /data-print-calibration="100mm"/)
  assert.deepEqual(lines, original)
})

test('valid tiled reference retains source coordinates and emits page geometry', () => {
  const lines = [[[0, 0], [100, 0], [100, 50]]]
  const original = structuredClone(lines)
  const tiled = patternTiledPrint(lines)
  assert.ok(tiled.pageCount >= 2)
  assert.ok(tiled.tiles.every(tile => Number.isFinite(tile.x) && Number.isFinite(tile.y)))
  assert.doesNotMatch(tiled.html, /(?:NaN|Infinity)/)
  assert.deepEqual(lines, original)
})
