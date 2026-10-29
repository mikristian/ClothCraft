import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { auditMarkerRulerInkClearance20261024 as audit } from './accumarkMarkerRulerInkClearance20261024.mjs'

const rect = (x, y, width, height) => ({
  x, y, width, height, name: 'Panel', instance: 0,
  outline: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }],
})
const marker = (placements, width = 30, length = 30) => ({
  width, length, fabricId: 'main', unusedPieces: 0, placements,
})

test('clear in-page SVG and PDF ruler ink is diagnosed without claiming physical verification', () => {
  const source = marker([rect(18, 12, 3, 4)])
  const before = structuredClone(source)
  const result = audit(source)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.checkedPages, 1)
  assert.equal(result.digitalInkClearanceVerified, true)
  assert.equal(result.physicalScaleVerified, false)
  assert.equal(result.factoryApproved, false)
  assert.deepEqual(source, before)
})

test('existing canonical ruler can overlap a valid cut polygon despite valid output bytes', () => {
  const source = marker([rect(.4, 1.7, 10.3, .6)])
  const result = audit(source)
  assert.equal(result.ok, false)
  assert.ok(result.issues.some(i => i.code === 'RULER_INK_OVER_CUT_PIECE' && i.detail.includes('RULER_STROKES')))
  assert.equal(result.factoryApproved, false)
})

test('cut piece entirely enclosing ruler is rejected, even without any contour crossing', () => {
  const result = audit(marker([rect(0, 0, 20, 5)], 30, 30))
  assert.equal(result.ok, false)
  assert.ok(result.issues.some(i => i.code === 'RULER_INK_OVER_CUT_PIECE'))
})

test('second PDF page local ruler is checked at its absolute station', () => {
  const source = marker([rect(18, 12, 3, 4), rect(1, 402, 3, 1)], 30, 800)
  const result = audit(source)
  assert.equal(result.ok, false)
  assert.ok(result.issues.some(i => i.code === 'RULER_INK_OVER_CUT_PIECE' && i.pageIndex === 2))
})

test('label ink and too-narrow label area are reported separately from ruler strokes', () => {
  const collision = audit(marker([rect(8, 1.1, 2, .25)]))
  assert.equal(collision.ok, false)
  assert.ok(collision.issues.some(i => i.detail.includes('RULER_TEXT_ESTIMATE')))
  const overflow = audit(marker([rect(7, 12, 2, 3)], 11, 30))
  assert.equal(overflow.ok, false)
  assert.ok(overflow.issues.some(i => i.code === 'RULER_INK_OUT_OF_BOUNDS'))
})

test('piece text label ink crossing the ruler is rejected even when its cut polygon is clear', () => {
  const piece = { ...rect(.4, .3, 1, .6), name: 'A very long piece label that crosses the ruler baseline' }
  const result = audit(marker([piece]))
  assert.equal(result.ok, false)
  assert.ok(result.issues.some(i => i.code === 'RULER_OVERLAPS_PIECE_LABEL'), JSON.stringify(result.issues))
})

test('narrow markers defer to separate calibration sheet rather than claiming in-page ruler clearance', () => {
  const result = audit(marker([rect(0, 0, 8, 5)], 8, 30))
  assert.equal(result.ok, true)
  assert.equal(result.calibrationMode, 'separate-sheet')
  assert.equal(result.digitalInkClearanceVerified, false)
})

test('invalid geometry and unreasonable comparison budgets fail closed', () => {
  for (const source of [
    marker([rect(18, 12, 3, 4)], NaN),
    marker([{ ...rect(18, 12, 3, 4), outline: [{ x: NaN, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }] }]),
    marker([rect(18, 12, 3, 4)]),
    marker([rect(-4, 18, 1, 1)]),
    marker([{ ...rect(18, 12, 3, 4), width: 8 }]),
  ]) {
    const options = source.width === 30 && source.placements[0].outline[0].x === 18 ? { clearanceCm: -1 } : {}
    const result = audit(source, options)
    assert.equal(result.ok, false)
    assert.ok(result.issues.some(i => i.code === 'INVALID_RULER_SOURCE'))
  }
  const oversized = marker(Array.from({ length: 10001 }, () => rect(18, 12, 3, 4)))
  const rejected = audit(oversized)
  assert.equal(rejected.ok, false)
  assert.ok(rejected.issues.some(i => i.code === 'INVALID_RULER_SOURCE' && /budget/.test(i.detail)))
})

test('Foundation Tee all-size fixture exposes the existing hard-coded ruler risk without modifying it', () => {
  for (const size of ['XS', 'S', 'M', 'L', 'XL', 'XXL']) {
    const project = gradeProject(createTeeTemplate(), size)
    const source = Object.values(buildFabricMarkers(project))[0]
    const before = structuredClone(source)
    const result = audit(source)
    assert.equal(result.ok, false, `${size}: expected the known unprotected fixed ruler region to be unsafe`)
    assert.ok(result.issues.some(i => i.code === 'RULER_INK_OVER_CUT_PIECE'), `${size}: ${JSON.stringify(result.issues)}`)
    assert.deepEqual(source, before)
  }
})
