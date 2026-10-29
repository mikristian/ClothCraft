import test from 'node:test'
import assert from 'node:assert/strict'
import { resizeTechPackAnnotation } from './techPackAnnotationTransform.js'

const arrow = () => ({ type: 'arrow', points: [[100, 100], [200, 150]] })

test('nonfinite resize deltas never corrupt arrow coordinates', () => {
  for (const delta of [[NaN, 0], [0, Infinity], [-Infinity, 0]]) {
    const source = arrow()
    assert.strictEqual(resizeTechPackAnnotation(source, 'se', null, delta), source)
    assert.deepEqual(source.points, [[100, 100], [200, 150]])
  }
})

test('missing, sparse, and malformed resize deltas are rejected without throwing', () => {
  for (const delta of [undefined, null, [], [5], [, 2], [2, ,], ['2', 0]]) {
    const source = arrow()
    assert.strictEqual(resizeTechPackAnnotation(source, 'se', null, delta), source)
  }
})

test('finite resize deltas that overflow scaled geometry fail closed', () => {
  const source = { type: 'arrow', points: [[-1e308, 0], [1e308, 10]] }
  assert.strictEqual(resizeTechPackAnnotation(source, 'se', null, [1, 1]), source)
  assert.deepEqual(source.points, [[-1e308, 0], [1e308, 10]])
})

test('Bezier resize rejects nonfinite deltas without altering handles', () => {
  const source = { type: 'bezier', anchors: [
    { point: [0, 0], in: [0, 0], out: [25, 25] },
    { point: [100, 100], in: [75, 75], out: [100, 100] },
  ] }
  assert.strictEqual(resizeTechPackAnnotation(source, 'se', null, [0, NaN]), source)
  assert.deepEqual(source.anchors[0].out, [25, 25])
})

test('ordinary valid resize still scales all coordinates and preserves source', () => {
  const source = arrow()
  const result = resizeTechPackAnnotation(source, 'se', null, [100, 50])
  assert.deepEqual(result.points, [[100, 100], [300, 200]])
  assert.deepEqual(source.points, [[100, 100], [200, 150]])
})
