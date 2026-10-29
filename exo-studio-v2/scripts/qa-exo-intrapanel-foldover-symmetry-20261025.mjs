import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'

// Two material-edge neighbors share the X axis. The narrow triangle is only
// 0.1 mm high; the broad one is 20 mm high and folded back over the same side.
// Plane distance is directional, so an index-ordered, one-sided check misses
// this sub-thickness foldover when the narrow triangle is listed first.
const theta = .1
const narrowHeight = .0001, broadHeight = .02, clearanceM = .001
const folded = [[0, 0, 0], [1, 0, 0], [.5, narrowHeight, 0],
  [.5, broadHeight * Math.cos(theta), broadHeight * Math.sin(theta)]]
const audit = (positions, faces, thickness = clearanceM) =>
  inspectNativeIntrapanelStaticContact({
    particles: positions.map(position => ({position})),
    pieces: [{id: 'hinge', particleIndices: [0, 1, 2, 3], faces}],
  }, {clearanceM: thickness})

test('independent plane-distance oracle demonstrates directional asymmetry', () => {
  const broadToNarrow = broadHeight * Math.sin(theta)
  const narrowToBroad = narrowHeight * Math.sin(theta)
  assert.ok(broadToNarrow > clearanceM)
  assert.ok(narrowToBroad < clearanceM)
  assert.ok(narrowToBroad > 0)
})

test('both material face orders reject the same asymmetric near-foldover', () => {
  const orderA = [[0, 1, 2], [1, 0, 3]]
  const orderB = [[1, 0, 3], [0, 1, 2]]
  const before = JSON.stringify({folded, orderA, orderB})
  for (const faces of [orderA, orderB]) {
    const result = audit(folded, faces)
    assert.equal(result.intersectingTrianglePairs, 0)
    assert.equal(result.edgeNeighborNearFoldoverPairs, 1)
    assert.equal(result.staticDisjointThicknessScreenClear, false)
    assert.equal(result.clothThicknessClearanceCertified, false)
    assert.equal(result.sweptCollisionCertified, false)
  }
  assert.equal(JSON.stringify({folded, orderA, orderB}), before)
})

test('true hinge opening and reduced thickness avoid false warnings', () => {
  const faces = [[0, 1, 2], [1, 0, 3]]
  const opened = folded.map(p => [...p])
  opened[3][1] *= -1
  for (const positions of [opened]) {
    const result = audit(positions, faces)
    assert.equal(result.edgeNeighborNearFoldoverPairs, 0)
  }
  // At 1 micrometre, neither face's opposite vertex is within the declared
  // clearance. This does not certify any other cloth-contact property.
  assert.equal(audit(folded, faces, 1e-6).edgeNeighborNearFoldoverPairs, 0)
})
