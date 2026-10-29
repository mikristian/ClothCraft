import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cutlinePoints, projectFreeSewingPoint, freeSewingRangePoints,
  freeSewingPointAtFraction,
} from './freeSewingGeometry.js'

test('free sewing rejects finite vertices whose segment length overflows', () => {
  const vertices = [[-1e308, 0], [1e308, 0]]
  const indices = [0, 1]
  assert.deepEqual(cutlinePoints(indices, vertices), [])
  assert.equal(projectFreeSewingPoint(indices, vertices, [0, 0]), null)
  assert.deepEqual(freeSewingRangePoints(indices, vertices, 0, 1), [])
  assert.equal(freeSewingPointAtFraction(indices, vertices, .5), null)
})

test('free sewing rejects accumulated arclength overflow across finite segments', () => {
  const vertices = [[0, 0], [1e308, 0], [0, 0], [1e308, 0]]
  assert.deepEqual(cutlinePoints([0, 1, 2, 3], vertices), [])
})

test('free sewing preserves ordinary material cutlines', () => {
  const vertices = [[0, 0], [.1, 0], [.1, .1]]
  assert.deepEqual(cutlinePoints([0, 1, 2], vertices), vertices)
  assert.ok(Math.abs(projectFreeSewingPoint([0, 1, 2], vertices, [.11, .05]).fraction - .75) < 1e-10)
})
