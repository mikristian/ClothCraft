import test from 'node:test'
import assert from 'node:assert/strict'
import { boundaryLength, measureNativeSelection } from './clothcraftSelectionMetrics.js'

const snapshot = (uv, positions, boundaries = { edge: [0, 1] }) => ({
  revision: 1,
  uv,
  positions,
  panels: [{ id: 'panel', boundaries }],
  template: {
    panels: [{ id: 'panel', name: 'Test panel' }],
    seams: [{ id: 'seam', a: { panel: 'panel', edge: 'edge' }, b: { panel: 'panel', edge: 'edge' } }],
  },
})

test('boundary annotation rejects metre-to-centimetre overflow', () => {
  assert.equal(boundaryLength([0, 1], [[0, 0], [1e308, 0]], 2), null)
  assert.equal(boundaryLength([0, 1], [[0, 0], [0.25, 0]], 2), 25)
})

test('seam annotation rejects flat length overflow without displaying Infinity', () => {
  const measured = measureNativeSelection(snapshot([[0, 0], [1e308, 0]], [[0, 0, 0], [1, 0, 0]]), { seamId: 'seam' })
  assert.equal(measured.first.length2DCm, null)
  assert.equal(measured.first.length3DCm, null)
})

test('seam annotation rejects draped length overflow without displaying Infinity', () => {
  const measured = measureNativeSelection(snapshot([[0, 0], [1, 0]], [[0, 0, 0], [1e308, 0, 0]]), { seamId: 'seam' })
  assert.equal(measured.first.length2DCm, null)
  assert.equal(measured.first.length3DCm, null)
})

test('whole-pattern annotation rejects overflow when individually valid edges are summed', () => {
  const measured = measureNativeSelection(snapshot(
    [[0, 0], [1e306, 0], [2e306, 0]],
    [[0, 0, 0], [1e306, 0, 0], [2e306, 0, 0]],
    { first: [0, 1], second: [1, 2] },
  ), { panel: 'panel' })
  assert.equal(measured.length2DCm, null)
  assert.equal(measured.length3DCm, null)
})

test('derived elongation annotation rejects an overflowing finite-length ratio', () => {
  const measured = measureNativeSelection(snapshot(
    [[0, 0], [1e-308, 0]],
    [[0, 0, 0], [1e306, 0, 0]],
  ), { panel: 'panel', edge: 'edge' })
  assert.ok(Number.isFinite(measured.length2DCm))
  assert.ok(Number.isFinite(measured.length3DCm))
  assert.equal(measured.elongationPercent, null)
})

test('ordinary partial sewing interval keeps exact centimetre lengths', () => {
  const s = snapshot([[0, 0], [1, 0]], [[0, 0, 0], [2, 0, 0]])
  s.template.seams[0].a.range = [0.25, 0.75]
  const measured = measureNativeSelection(s, { seamId: 'seam' })
  assert.deepEqual([measured.first.length2DCm, measured.first.length3DCm], [50, 100])
  assert.deepEqual([measured.second.length2DCm, measured.second.length3DCm], [100, 200])
})
