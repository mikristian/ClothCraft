import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectDraftTopology } from './draftingTopology.js'

const rectangle = () => ({ points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }], curves: {} })

test('topology rejects accessor coordinates without running foreign code', () => {
  const piece = rectangle()
  let reads = 0
  Object.defineProperty(piece.points[1], 'x', { get() { reads++; throw Error('unsafe getter') } })
  assert.equal(inspectDraftTopology(piece).valid, false)
  assert.equal(reads, 0)
})

test('topology rejects inherited and accessor curve controls before sampling', () => {
  const inherited = rectangle()
  inherited.curves = Object.create({ 0: { cx: 10, cy: -10 } })
  assert.match(inspectDraftTopology(inherited).errors.join(' '), /Curve control/)
  const getter = rectangle()
  let reads = 0
  Object.defineProperty(getter.curves, '0', { get() { reads++; throw Error('unsafe curve') } })
  assert.match(inspectDraftTopology(getter).errors.join(' '), /Curve control/)
  assert.equal(reads, 0)
  const handleGetter = rectangle()
  let handleReads = 0
  handleGetter.curves[0] = { cx: 10 }
  Object.defineProperty(handleGetter.curves[0], 'cy', { get() { handleReads++; throw Error('unsafe handle') } })
  assert.match(inspectDraftTopology(handleGetter).errors.join(' '), /Curve control/)
  assert.equal(handleReads, 0)
})

test('valid straight and curved contours retain measured area without mutating inputs', () => {
  const straight = rectangle()
  const curved = rectangle()
  curved.curves[0] = { cx: 10, cy: -2 }
  const snapshot = structuredClone(curved)
  assert.equal(inspectDraftTopology(straight).valid, true)
  assert.equal(inspectDraftTopology(straight).areaCm2, 200)
  assert.equal(inspectDraftTopology(curved).valid, true)
  assert.ok(inspectDraftTopology(curved).areaCm2 > 200)
  assert.deepEqual(curved, snapshot)
})
