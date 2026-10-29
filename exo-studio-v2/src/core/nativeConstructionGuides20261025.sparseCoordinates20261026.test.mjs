import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clipNativeConstructionLine20261025 as clip,
  buildNativeConstructionGuides20261025 as build,
  nativePanelWorldToLocal20261025 as worldToLocal,
} from './nativeConstructionGuides20261025.js'

const contour = () => [[0, 0], [.2, 0], [.2, .2], [0, .2]]
const snapshot = points => ({
  revision: 5,
  template: { panels: [{ id: 'front', polygon: { points } }] },
})
const request = { panelId: 'front', start: [-.1, .1], end: [.3, .1] }

test('clipping rejects a sparse contour vertex rather than fabricating a guide', () => {
  const polygon = contour()
  polygon[1] = Array(2)
  assert.throws(() => clip(polygon, request.start, request.end), /Invalid panel contour or guide/)
})

test('clipping rejects a missing contour coordinate', () => {
  const polygon = contour()
  polygon[3] = [, .2]
  assert.throws(() => clip(polygon, request.start, request.end), /Invalid panel contour or guide/)
})

test('clipping rejects a missing polygon vertex slot', () => {
  const polygon = contour()
  delete polygon[1]
  assert.throws(() => clip(polygon, request.start, request.end), /Invalid panel contour or guide/)
})

test('native guide construction fails closed for sparse contour geometry', () => {
  const polygon = contour()
  polygon[1] = Array(2)
  const before = structuredClone(polygon)
  const result = build(snapshot(polygon), request)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(polygon, before)
})

test('sparse guide endpoints and layout coordinates are rejected', () => {
  assert.throws(() => clip(contour(), [, .1], [.3, .1]), /Invalid panel contour or guide/)
  assert.equal(build(snapshot(contour()), { ...request, end: Array(2) }).ok, false)
  assert.throws(() => worldToLocal({}, [, 2], [.03, .08]), /Invalid panel placement/)
})

test('accessor-backed coordinates do not execute getters during validation', () => {
  let getterCalls = 0
  const vertex = [.2, 0]
  Object.defineProperty(vertex, '0', { get() { getterCalls++; return .2 } })
  const polygon = contour()
  polygon[1] = vertex
  assert.throws(() => clip(polygon, request.start, request.end), /Invalid panel contour or guide/)
  assert.equal(getterCalls, 0)
})

test('accessor-backed polygon vertex slots do not execute getters', () => {
  let getterCalls = 0
  const polygon = contour()
  Object.defineProperty(polygon, '1', { get() { getterCalls++; return [.2, 0] } })
  assert.throws(() => clip(polygon, request.start, request.end), /Invalid panel contour or guide/)
  assert.equal(getterCalls, 0)
})

test('ordinary frozen dense geometry continues to clip without mutation', () => {
  const polygon = Object.freeze(contour().map(point => Object.freeze(point)))
  const segments = clip(polygon, request.start, request.end)
  assert.equal(segments.length, 1)
  assert.ok(Math.abs(segments[0][0][0]) < 1e-10)
  assert.ok(Math.abs(segments[0][1][0] - .2) < 1e-10)
})
