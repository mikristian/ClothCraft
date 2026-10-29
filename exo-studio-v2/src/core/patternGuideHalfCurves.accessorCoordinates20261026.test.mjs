import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleGuideHalfCurve } from './patternGuideHalfCurves.js'

for (const position of ['start', 'end', 'offset']) {
  for (const coordinateIndex of [0, 1]) {
    test(`construction half-curve rejects ${position}[${coordinateIndex}] accessor without invoking it`, () => {
      const coordinates = { start: [0, 0], end: [2, 0], offset: [0, 1] }
      let getterCalls = 0
      Object.defineProperty(coordinates[position], coordinateIndex, {
        configurable: true,
        enumerable: true,
        get() { getterCalls++; throw new Error('untrusted coordinate getter executed') },
      })
      assert.equal(sampleGuideHalfCurve(coordinates.start, coordinates.end, coordinates.offset, 0, 2), null)
      assert.equal(getterCalls, 0)
      assert.equal(Object.getOwnPropertyDescriptor(coordinates[position], coordinateIndex).get instanceof Function, true)
    })
  }
}

test('ordinary frozen data-coordinate arrays still produce the same sampled guide', () => {
  const start = Object.freeze([0, 0])
  const end = Object.freeze([2, 0])
  const offset = Object.freeze([0, 1])
  assert.deepEqual(sampleGuideHalfCurve(start, end, offset, 0, 2), {
    middle: [1, 0], control: [1, 1], points: [[0, 0], [1, .5], [2, 0]],
  })
})
