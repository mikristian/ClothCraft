import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleGuideHalfCurve } from './patternGuideHalfCurves.js'

const inheritedSparse = () => {
  const coordinates = [, 0]
  Object.setPrototypeOf(coordinates, Object.create(Array.prototype, {
    0: { value: 0, enumerable: true, configurable: true },
  }))
  assert.equal(Object.hasOwn(coordinates, 0), false)
  assert.equal(coordinates[0], 0)
  return coordinates
}

for (const position of ['start', 'end', 'offset']) {
  test(`half-curve rejects inherited coordinate hidden behind a sparse ${position} array`, () => {
    const source = { start: [0, 0], end: [1, 0], offset: [0, .2] }
    source[position] = inheritedSparse()
    const before = [source.start, source.end, source.offset].map(p => [p[0], p[1]])
    assert.equal(sampleGuideHalfCurve(source.start, source.end, source.offset, 0, 2), null)
    assert.deepEqual([source.start, source.end, source.offset].map(p => [p[0], p[1]]), before)
    assert.equal(Object.hasOwn(source[position], 0), false)
  })
}

test('fully owned finite construction coordinates retain exact guide samples', () => {
  assert.deepEqual(sampleGuideHalfCurve([0, 0], [1, 0], [0, .2], 0, 2), {
    control: [.5, .2], middle: [.5, 0], points: [[0, 0], [.5, .1], [1, 0]],
  })
})
