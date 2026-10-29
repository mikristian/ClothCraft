import test from 'node:test'
import assert from 'node:assert/strict'
import { planSafeMarkerPdfPages20261024 as plan } from './accumarkMarkerSafePageBreaks20261024.mjs'
import { planCalibratedMarkerPdfPages20261024 as baseline } from './accumarkMarkerCalibrationPagination20261024.mjs'
import { inspectMarkerPageBoundarySafety20261024 as inspect } from './accumarkMarkerPageBoundarySafety20261024.mjs'

const rect = (y, h) => ({ outline: [{ x: 0, y }, { x: 1, y }, { x: 1, y: y + h }, { x: 0, y: y + h }] })
const marker = (length, ...placements) => ({ length, width: 10, placements })
const verified = (m, pages, opts = {}) => {
  assert.equal(pages[0].startCm, 0)
  assert.equal(pages.at(-1).endCm, m.length)
  for (let i = 0; i < pages.length; i++) {
    assert.equal(pages[i].heightCm, pages[i].endCm - pages[i].startCm)
    if (i) assert.equal(pages[i].startCm, pages[i - 1].endCm)
    assert.ok(pages[i].heightCm <= Math.max(10, Math.min(400, opts.pageLengthCm ?? 400)) + 1e-9)
    if (opts.calibration) assert.ok(pages[i].heightCm >= 3)
  }
  assert.equal(inspect(m, pages, { clearanceCm: opts.clearanceCm ?? 0.05 }).ok, true)
}

test('retains baseline exactly when safe, without modifying marker', () => {
  const m = marker(401, rect(20, 4))
  const original = structuredClone(m)
  assert.deepEqual(plan(m, 400, { calibration: true }), baseline(401, 400, { calibration: true }))
  assert.deepEqual(m, original)
})

test('relocates calibrated 401 cm boundary away from split contour', () => {
  const m = marker(401, rect(397, 2))
  const pages = plan(m, 400, { calibration: true })
  verified(m, pages, { calibration: true })
  assert.ok(pages[0].endCm < 396.95)
})

test('handles 800.5 cm, fractional stations, custom page length and narrow markers', () => {
  for (const [length, size, outlines, calibration] of [
    [800.5, 400, [rect(399.999, 0.2), rect(797, 0.7)], true],
    [401, 200, [rect(199.9999, 0.1)], true],
    [401, 400, [rect(399.99, 0.1)], false],
  ]) {
    const m = marker(length, ...outlines)
    const copy = structuredClone(m)
    const pages = plan(m, size, { calibration })
    verified(m, pages, { calibration, pageLengthCm: size })
    assert.deepEqual(m, copy)
  }
})

test('fails closed without suitable empty gap or valid outline', () => {
  assert.throws(() => plan(marker(401, rect(0, 401)), 400, { calibration: true }), /No safe empty/)
  assert.throws(() => plan(marker(401, { outline: [{ x: 0, y: NaN }] })), /Invalid cutting outline/)
  assert.throws(() => plan(marker(401, rect(398, 1)), 400, { clearanceCm: Infinity }), /Invalid safe marker/)
  assert.throws(() => plan(marker(401, rect(398, 1)), 400, { calibration: 'yes' }), /Invalid safe marker/)
  assert.throws(() => plan(marker(401, rect(398, 1)), NaN), /Invalid safe marker/)
  assert.throws(() => plan(marker(1e12), 400), /page limit exceeded/)
})
