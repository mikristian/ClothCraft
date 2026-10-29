import test from 'node:test'
import assert from 'node:assert/strict'
import { fitPencilStroke, pathCubicControls } from './vectorFreehandFit.js'

test('metre tolerance removes collinear samples, duplicate samples and nonfinite samples', () => {
  assert.deepEqual(fitPencilStroke([{x: 0, y: 0}, {x: 0, y: 0}, {x: .05, y: .0005}, {x: .1, y: 0}, {x: NaN, y: 1}]), [{x: 0, y: 0}, {x: .1, y: 0}])
})

test('corner beyond tolerance is preserved, and input objects are not modified', () => {
  const points = [{x: 0, y: 0}, {x: .05, y: .01}, {x: .1, y: 0}]
  assert.deepEqual(fitPencilStroke(points), points)
  assert.notStrictEqual(fitPencilStroke(points)[0], points[0])
})

test('budget and determinism for a detailed stroke', () => {
  const points = Array.from({length: 1000}, (_, i) => ({x: i / 1000, y: .05 * Math.sin(i)}))
  const a = fitPencilStroke(points, {toleranceM: 0})
  assert.ok(a.length <= 64)
  assert.deepEqual(a[0], points[0])
  assert.deepEqual(a.at(-1), points.at(-1))
  assert.deepEqual(a, fitPencilStroke(points, {toleranceM: 0}))
})

test('closed strokes remove terminal repeat and keep finite geometry', () => {
  const fitted = fitPencilStroke([{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 0}], {closed: true})
  assert.deepEqual(fitted, [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}])
  assert.deepEqual(fitPencilStroke([]), [])
  assert.throws(() => fitPencilStroke([], {toleranceM: -1}), RangeError)
})

test('closed Pencil smoothing cannot erase a real triangle corner', () => {
  const triangle = [{x:0,y:0},{x:1,y:0},{x:.5,y:1},{x:0,y:0}]
  const original = structuredClone(triangle)
  const fitted = fitPencilStroke(triangle,{closed:true,toleranceM:3})
  assert.equal(fitted.length,3,'A high smoothing tolerance must retain three valid corners')
  assert.ok(fitted.some(point=>point.x===.5&&point.y===1),'Keep the apex')
  assert.deepEqual(triangle,original,'Fitting cannot modify the authored samples')
  assert.deepEqual(fitPencilStroke(triangle,{closed:true,toleranceM:3}),fitted)
})

test('repeated closure samples are removed; collinear closed strokes fail closed', () => {
  const points=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:0},{x:0,y:0}]
  const fitted=fitPencilStroke(points,{closed:true})
  assert.equal(fitted.length,3)
  assert.notDeepEqual(fitted[0],fitted.at(-1))
  assert.deepEqual(fitPencilStroke([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:0}],{closed:true,toleranceM:5}),[])
  assert.deepEqual(fitPencilStroke([{x:0,y:0},{x:1,y:0},{x:2,y:0}],{closed:false,toleranceM:5}),[{x:0,y:0},{x:2,y:0}])
})

test('cubic controls preserve straight lines and interpolate a corner', () => {
  assert.deepEqual(pathCubicControls([{x: 0, y: 0}, {x: 6, y: 0}]), [{c1: {x: 1, y: 0}, c2: {x: 5, y: 0}}])
  const controls = pathCubicControls([{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}])
  assert.equal(controls.length, 2)
  assert.ok(controls.every(pair => Object.values(pair).every(p => Number.isFinite(p.x) && Number.isFinite(p.y))))
  assert.throws(() => pathCubicControls([{x: Infinity, y: 0}]), TypeError)
})
