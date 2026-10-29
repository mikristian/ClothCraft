import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectDraftTopology, isDraftEditValid } from './draftingTopology.js'

const rectangle = (control) => ({
  points: [
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 10 }, { x: 0, y: 10 },
  ],
  curves: control ? { 0: control } : {},
})

test('normal adjacent sampled chords and straight cutlines share harmless endpoints', () => {
  assert.equal(inspectDraftTopology(rectangle(), { curveSamples: 64 }).valid, true)
  assert.equal(inspectDraftTopology(rectangle({ cx: 5, cy: -2 }), { curveSamples: 64 }).valid, true)
})

test('collinear quadratic control beyond an endpoint cannot retrace its own cutline', () => {
  const invalid = inspectDraftTopology(rectangle({ cx: 20, cy: 0 }), { curveSamples: 64 })
  assert.equal(invalid.valid, false)
  assert.match(invalid.errors.join(' '), /crosses or overlaps itself/)
  assert.ok(invalid.intersections.some(hit => hit.edgeA === 0 && hit.edgeB === 0 && hit.kind === 'overlap'))
})

test('point and curve edit validation refuses a self-overlapping edge before committing', () => {
  const piece = rectangle({ cx: 5, cy: -2 })
  assert.equal(isDraftEditValid(piece, { edgeIndex: 0, curve: { cx: 20, cy: 0 } }, { curveSamples: 24 }), false)
  assert.equal(isDraftEditValid(piece, { edgeIndex: 0, curve: { cx: 5, cy: -3 } }, { curveSamples: 24 }), true)
  assert.deepEqual(piece.curves[0], { cx: 5, cy: -2 }, 'preflight must preserve authored source')
})
