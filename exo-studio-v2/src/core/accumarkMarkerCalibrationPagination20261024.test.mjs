import test from 'node:test'
import assert from 'node:assert/strict'
import { planCalibratedMarkerPdfPages20261024 as plan } from './accumarkMarkerCalibrationPagination20261024.mjs'

function verify(length, maximum, calibration = true) {
  const pages = plan(length, maximum, { calibration })
  const cap = Math.max(10, Math.min(400, maximum))
  assert.equal(pages.length, Math.ceil(length / cap))
  assert.equal(pages[0].startCm, 0)
  assert.equal(pages.at(-1).endCm, length)
  pages.forEach((page, i) => {
    assert.ok(page.heightCm >= (calibration ? 3 : 0), `page ${i} minimum`)
    assert.ok(page.heightCm <= cap + 1e-9, `page ${i} maximum`)
    assert.ok(Math.abs(page.endCm - page.startCm - page.heightCm) < 1e-9)
    if (i) assert.equal(page.startCm, pages[i - 1].endCm)
  })
  return pages
}

test('401 cm borrows 2 cm to preserve ruler on second page', () => {
  assert.deepEqual(verify(401, 400), [
    { startCm: 0, endCm: 398, heightCm: 398 },
    { startCm: 398, endCm: 401, heightCm: 3 },
  ])
})

test('800.5 cm shifts only penultimate page, retaining first page at maximum', () => {
  assert.deepEqual(verify(800.5, 400), [
    { startCm: 0, endCm: 400, heightCm: 400 },
    { startCm: 400, endCm: 797.5, heightCm: 397.5 },
    { startCm: 797.5, endCm: 800.5, heightCm: 3 },
  ])
})

test('ordinary page divisions remain unchanged for final remainder >= 3', () => {
  assert.deepEqual(verify(600, 400).map(page => page.heightCm), [400, 200])
  assert.deepEqual(verify(803.25, 400), [
    { startCm: 0, endCm: 400, heightCm: 400 },
    { startCm: 400, endCm: 800, heightCm: 400 },
    { startCm: 800, endCm: 803.25, heightCm: 3.25 },
  ])
  assert.deepEqual(verify(400, 400), [{ startCm: 0, endCm: 400, heightCm: 400 }])
})

test('fractional input and clamped requested page lengths preserve all marker material', () => {
  for (const [length, max] of [[3, 1], [10.125, 10], [1000.123, 200], [802.75, 999], [41.25, 0.5], [10001.75, 400]]) {
    verify(length, max)
  }
})

test('non-calibrated pages retain short final slices', () => {
  assert.deepEqual(verify(401, 400, false), [
    { startCm: 0, endCm: 400, heightCm: 400 },
    { startCm: 400, endCm: 401, heightCm: 1 },
  ])
})

test('invalid inputs fail closed', () => {
  for (const length of [undefined, null, '401', 0, -3, NaN, Infinity, -Infinity, 2.999]) {
    assert.throws(() => plan(length, 400, { calibration: true }), RangeError)
  }
  for (const cap of [0, -1, NaN, Infinity, '400', null]) {
    assert.throws(() => plan(401, cap, { calibration: true }), RangeError)
  }
  assert.throws(() => plan(401, 400, { calibration: 'yes' }), RangeError)
})
