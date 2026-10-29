import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateCoupledSeamBendContactMeritResearch20261026 as evaluate} from
  '../src/core/backends/nativeCoupledSeamBendContactMeritResearch20261026.js'

const fixture = () => ({
  positions: [[0, 0, 0], [3, 0, 0], [5, 1, 0]],
  seams: [[0, 1]], bends: [[0, 2, 5]], contacts: [[1, 2, 3]],
  seamWeight: 2, bendWeight: 0.7, contactWeight: 4,
})

test('independent central differences verify shared-vertex coupled gradient', () => {
  const source = fixture()
  const before = JSON.stringify(source)
  const measured = evaluate(source)
  assert.ok(measured.terms.seam > 0)
  assert.ok(measured.terms.bend > 0)
  assert.ok(measured.terms.contact > 0)
  const h = 1e-5
  for (let i = 0; i < source.positions.length; i++) for (let axis = 0; axis < 3; axis++) {
    const plus = structuredClone(source), minus = structuredClone(source)
    plus.positions[i][axis] += h
    minus.positions[i][axis] -= h
    const numeric = (evaluate(plus).totalEnergy - evaluate(minus).totalEnergy) / (2*h)
    assert.ok(Math.abs(numeric - measured.gradient[i][axis]) < 1e-7,
      `gradient mismatch at vertex ${i} axis ${axis}: ${numeric}`)
  }
  for (let axis = 0; axis < 3; axis++)
    assert.ok(Math.abs(measured.gradient.reduce((sum, g) => sum + g[axis], 0)) < 1e-12)
  assert.equal(JSON.stringify(source), before)
  assert.equal(measured.pointPairContactValid, false)
  assert.equal(measured.physicalAcceptance, false)
  assert.equal(measured.deformableCCDCertified, false)
})

test('one bounded detached gradient step reduces the combined merit, not certified fit', () => {
  const source = fixture()
  const original = evaluate(source)
  const trial = structuredClone(source)
  for (let i = 0; i < trial.positions.length; i++)
    for (let k = 0; k < 3; k++)
      trial.positions[i][k] -= 0.01 * original.gradient[i][k]
  const after = evaluate(trial)
  assert.ok(after.totalEnergy < original.totalEnergy)
  assert.deepEqual(source, fixture())
  assert.equal(after.safeToAutoApply, false)
  assert.equal(after.triangleContactCertified, false)
})

test('zero-distance contact is unresolved rather than silently accepted', () => {
  const input = fixture()
  input.positions[2] = [...input.positions[1]]
  assert.throws(() => evaluate(input), /unresolved coincident pair/i)
})

test('independent two-point equilibrium proves soft contact penalty is not clearance', () => {
  // Exact one-dimensional stationary point: minimize d² + 2(3-d)².
  // d=2 has zero combined gradient, yet violates 3 mm clearance by 1 mm.
  const result = evaluate({positions: [[0, 0, 0], [2, 0, 0]],
    seams: [[0, 1]], contacts: [[0, 1, 3]],
    seamWeight: 2, contactWeight: 4})
  assert.equal(result.totalEnergy, 6)
  assert.deepEqual(result.gradient, [[0, 0, 0], [0, 0, 0]])
  assert.equal(result.minimumContactMarginMm, -1)
  assert.equal(result.contactViolations, 1)
  assert.equal(result.pointPairContactValid, false)
  assert.equal(result.physicalAcceptance, false)
})

test('bounded malformed pairs and nonfinite material inputs fail closed', () => {
  for (const mutation of [
    x => { x.positions[0][1] = NaN },
    x => { delete x.positions[1][1] },
    x => { x.seams[0] = [0, 99] },
    x => { x.bends[0] = [1, 1, 2] },
    x => { x.contacts[0] = [1, 2, -1] },
    x => { x.contactWeight = Infinity },
  ]) {
    const input = fixture()
    mutation(input)
    assert.throws(() => evaluate(input), /invalid/i)
  }
})
