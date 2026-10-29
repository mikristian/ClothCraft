import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyAccuMarkPointLineOperation as apply,
  measureAccuMarkBoundaryEdge as measure,
} from './accumarkPointLineTools20261023.js'

const square = (offset = 0, clockwise = false) => {
  const s = 0.001
  const points = [
    {x: offset, y: offset},
    {x: offset + s, y: offset},
    {x: offset + s, y: offset + s},
    {x: offset, y: offset + s},
  ]
  return {
    grading: {sizes: ['M'], baseSize: 'M', widthPerSizeCm: 0, lengthPerSizeCm: 0},
    pieces: [{id: 'front', points: clockwise ? points.reverse() : points}],
  }
}

test('translated small but nondegenerate contour remains measurable', () => {
  const project = square(9999998)
  const original = structuredClone(project)
  const measured = measure(project, {pieceId: 'front', edgeIndex: 0})
  assert.ok(Math.abs(measured.lengthCm - 0.001) < 1e-8)
  assert.deepEqual(project, original)
})

test('translated small contour splits and validates without changing original', () => {
  const project = square(9999998)
  const original = structuredClone(project)
  const result = apply(project, {kind: 'edge.split', pieceId: 'front', edgeIndex: 0, t: 0.5})
  assert.equal(result.validation.contours, 'valid')
  assert.equal(result.project.pieces[0].points.length, 5)
  assert.deepEqual(project, original)
})

test('clockwise translated contour retains winding on a valid split', () => {
  const project = square(9999998, true)
  const result = apply(project, {kind: 'edge.split', pieceId: 'front', edgeIndex: 0, t: 0.5})
  assert.equal(result.validation.contours, 'valid')
})

test('degenerate translated contour still fails closed', () => {
  const project = square(9999998)
  project.pieces[0].points[2] = {...project.pieces[0].points[1]}
  assert.throws(() => measure(project, {pieceId: 'front', edgeIndex: 0}), /DEGENERATE_EDGE/)
})
