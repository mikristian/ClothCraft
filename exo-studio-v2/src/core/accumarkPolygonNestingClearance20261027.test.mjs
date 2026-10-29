import test from 'node:test'
import assert from 'node:assert/strict'
import { polygonConflict, nestPolygons } from './accumarkPolygonNesting20261024.js'

const vertices = coordinates => coordinates.map(([x, y]) => ({ x, y }))

test('clearance checks the second endpoint of a long edge against each opposing segment', () => {
  const a = vertices([[0, 0], [10, 0], [10, 1], [0, 1]])
  const b = vertices([[10.4, 0.4], [12, 0.4], [12, 0.8], [10.4, 0.8]])
  assert.equal(polygonConflict(a, b, 0), false)
  assert.equal(polygonConflict(a, b, 0.5), true)
  assert.equal(polygonConflict(a, b, 0.3), false)
  assert.equal(polygonConflict(b, a, 0.5), true)
})

test('nested layout respects minimum clearance on mixed-length piece edges', () => {
  const outlines = [
    [[0,0],[10,0],[10,1],[0,1]],
    [[0,0],[1.6,0],[1.6,0.4],[0,0.4]],
  ]
  const pieces = outlines.map((coordinates, i) => ({
    id: `piece-${i}`, name: `piece-${i}`, cutQuantity: 1, grainAngleDeg: 0,
    marker: { nap: 'one-way' }, seamAllowance: 0,
    points: vertices(coordinates),
  }))
  const result = nestPolygons({ pieces }, { fabricWidth: 12, gap: 0.5, maxLength: 10 })
  assert.equal(result.ok, true)
  assert.equal(result.placements.length, 2)
  assert.equal(polygonConflict(result.placements[0].outline, result.placements[1].outline, 0.5), false)
})
