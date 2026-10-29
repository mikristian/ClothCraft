import test from 'node:test'
import assert from 'node:assert/strict'
import { applyAdvancedCadCurveHandle20261024_1423 as edit } from './advancedCadCurveHandle20261024_1423.js'

const source = () => ({
  revision: 1,
  pieces: [{
    id: 'front',
    points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
    curves: { 0: { cx: 5, cy: -2 } },
  }],
})

test('move rejects absolute-control fields rather than silently ignoring them', () => {
  const project = source()
  const before = structuredClone(project)
  assert.throws(() => edit(project, {
    kind: 'curve.control.move', pieceId: 'front', edgeIndex: 0,
    dxCm: 0, dyCm: -1, cxCm: 999,
  }), /ADVANCED_CURVE_SPEC/)
  assert.deepEqual(project, before)
})

test('set rejects relative-control fields rather than silently ignoring them', () => {
  const project = source()
  const before = structuredClone(project)
  assert.throws(() => edit(project, {
    kind: 'curve.control.set', pieceId: 'front', edgeIndex: 0,
    cxCm: 5, cyCm: -3, dyCm: 999,
  }), /ADVANCED_CURVE_SPEC/)
  assert.deepEqual(project, before)
})

test('even zero-valued opposite-kind fields are rejected as ambiguous', () => {
  assert.throws(() => edit(source(), {
    kind: 'curve.control.move', pieceId: 'front', edgeIndex: 0,
    dxCm: 0, dyCm: -1, cyCm: 0,
  }), /ADVANCED_CURVE_SPEC/)
})

test('unambiguous set and move preserve existing edit behavior', () => {
  const original = source()
  const moved = edit(original, {
    kind: 'curve.control.move', pieceId: 'front', edgeIndex: 0,
    dxCm: 0, dyCm: -1,
  })
  const set = edit(original, {
    kind: 'curve.control.set', pieceId: 'front', edgeIndex: 0,
    cxCm: 5, cyCm: -3,
  })
  assert.deepEqual(moved.detail.newControl, { cx: 5, cy: -3 })
  assert.deepEqual(set.detail.newControl, { cx: 5, cy: -3 })
  assert.equal(moved.manufacturingApproved, false)
  assert.deepEqual(original, source())
})
