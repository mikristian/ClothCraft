import assert from 'node:assert/strict'
import { edgeLength } from '../src/core/project.js'
import { draftingSplitFractions, splitParameterAtArcFraction } from '../src/core/draftingSplit.js'
import { quadraticArcLength } from '../src/core/draftingPrecision.js'

const rectangle = {
  id: 'p', points: [{ x:0,y:0 },{ x:20,y:0 },{ x:20,y:12 },{ x:0,y:12 }],
  curves: {},
}
assert.deepEqual(draftingSplitFractions(rectangle, 0, { method:'uniform',count:4 }), [.25,.5,.75])
assert.deepEqual(draftingSplitFractions(rectangle, 0, { method:'length',lengthCm:5 }), [.25])
assert.deepEqual(draftingSplitFractions(rectangle, 0, { method:'ratio',ratioPercent:30 }), [.3])
assert.equal(splitParameterAtArcFraction(rectangle, 0, .3), .3)
assert.throws(() => draftingSplitFractions(rectangle, 0, { method:'uniform',count:13 }), /2 to 12/)
assert.throws(() => draftingSplitFractions(rectangle, 0, { method:'length',lengthCm:25 }), /5%/)
assert.throws(() => draftingSplitFractions(rectangle, 0, { method:'ratio',ratioPercent:0 }), /5%/)
assert.throws(() => draftingSplitFractions(rectangle, 0, { method:'length',lengthCm:'' }), /finite/)
assert.throws(() => draftingSplitFractions(rectangle, 0, { method:'length',lengthCm:'five' }), /finite/)
assert.throws(() => draftingSplitFractions(rectangle, 0, { method:'unknown' }), /Unknown/)
// A malformed edge must never return a plausible split parameter that could
// subsequently be written into a manufacturing pattern.
assert.throws(() => splitParameterAtArcFraction(rectangle, .5, .5), /Invalid split edge/)
assert.throws(() => splitParameterAtArcFraction(rectangle, 4, .5), /Invalid split edge/)
assert.throws(() => splitParameterAtArcFraction({ ...rectangle, points:[{x:0,y:0},{x:0,y:0}] }, 0, .5), /positive measurable length/)
assert.throws(() => splitParameterAtArcFraction({ ...rectangle, points:[{x:NaN,y:0}, ...rectangle.points.slice(1)] }, 0, .5), /coordinates must be finite/)
assert.throws(() => splitParameterAtArcFraction({ ...rectangle, curves:{0:{cx:Infinity,cy:2}} }, 0, .5), /handle coordinates must be finite/)
// Coincident endpoints do not imply a degenerate quadratic: a control point
// away from the endpoints can form a legitimate measurable curved loop.
const curvedLoop = { points:[{x:0,y:0},{x:0,y:0},{x:0,y:10}], curves:{0:{cx:4,cy:0}} }
assert.ok(Math.abs(splitParameterAtArcFraction(curvedLoop, 0, .5) - .5) < 1e-6)

const curved = {
  ...rectangle,
  curves: { 0: { cx: 18, cy: 20 } },
}
const a = curved.points[0], c = { x:18,y:20 }, b = curved.points[1]
const total = edgeLength(curved, 0)
assert.ok(total > 20)
const t = splitParameterAtArcFraction(curved, 0, .25)
assert.ok(t > 0 && t < 1)
const length = quadraticArcLength(a, c, b, 0, t)
assert.ok(Math.abs(length - total * .25) < .0001, 'Split must use true curved arc length')
console.log('2D precise splitting: uniform, length, ratio, exact Bézier arc fraction and invalid lengths: PASS')
