import test from 'node:test'
import assert from 'node:assert/strict'
import {mirrorHalfPencilDraft} from './mirroredPencilDraft.js'

test('rejects sparse 2D point coordinates instead of returning NaN contour', () => {
  for (const middle of [Array(2), [, 0.5], [0.25, ,]]) {
    assert.equal(mirrorHalfPencilDraft([[0, 0], middle, [0, 1]]), null)
  }
})

test('rejects missing point in the half-contour array', () => {
  const points = [[0, 0], [0.2, 0.4], [0, 1]]
  delete points[1]
  assert.equal(mirrorHalfPencilDraft(points), null)
})

test('rejects finite source coordinates whose reflection or fold arithmetic overflows', () => {
  for (const points of [
    [[1e308, 0], [1e308, 1], [1e308, 2]],
    [[-1e308, 0], [0, 1], [1e308, 2]],
    [[0, 0], [1e308, 1e308], [0, 1e308]],
  ]) assert.equal(mirrorHalfPencilDraft(points), null)
})

test('invalid sparse tangents never create sparse or nonfinite output vectors', () => {
  const tangents = [[0, 0], [0.1, ,], [0, 0]]
  const output = mirrorHalfPencilDraft([[0, 0], [0.2, 0.5], [0, 1]], tangents)
  assert.ok(output)
  assert.equal(output.tangents.length, output.points.length)
  assert.ok(output.tangents.every(t => Array.isArray(t) && t.length === 2 && t.every(Number.isFinite)))
})

test('valid symmetric drafting remains finite and source arrays unchanged', () => {
  const points = [[0, 0], [0.2, 0.4], [0, 1]]
  const original = structuredClone(points)
  const output = mirrorHalfPencilDraft(points)
  assert.ok(output)
  assert.ok(Number.isFinite(output.area))
  assert.ok(output.points.every(p => p.every(Number.isFinite)))
  assert.deepEqual(points, original)
})
