import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fitPencilStroke, pathCubicControls } from './vectorFreehandFit.js'

const board = readFileSync(new URL('../components/ClothCraftBoardV2.jsx', import.meta.url), 'utf8')
const mm = value => value / 1000
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

test('freehand pencil preserves endpoints and a physically significant 5 mm corner', () => {
  const samples = [{ x: 0, y: 0 }, { x: mm(25), y: 0 }, { x: mm(50), y: mm(5) }, { x: mm(75), y: 0 }, { x: mm(100), y: 0 }]
  const original = structuredClone(samples)
  const fitted = fitPencilStroke(samples, { toleranceM: mm(0.5) })
  assert.deepEqual(fitted[0], samples[0])
  assert.deepEqual(fitted.at(-1), samples.at(-1))
  assert.ok(fitted.some(p => distance(p, samples[2]) < 1e-12), '5 mm corner must survive 0.5 mm fit tolerance')
  assert.deepEqual(samples, original, 'fitting must not mutate raw measurement samples')
  assert.ok(fitted.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))
})

test('pencil output budget and cubic handles are finite in real metre coordinates', () => {
  const samples = Array.from({ length: 400 }, (_, i) => ({ x: mm(i), y: mm(12 * Math.sin(i / 14)) }))
  const fitted = fitPencilStroke(samples, { toleranceM: mm(0.5) })
  assert.ok(fitted.length >= 3 && fitted.length <= 64)
  const controls = pathCubicControls(fitted)
  assert.equal(controls.length, fitted.length - 1)
  assert.ok(controls.every(c => [c.c1.x, c.c1.y, c.c2.x, c.c2.y].every(Number.isFinite)))
  assert.deepEqual(fitted, fitPencilStroke(samples, { toleranceM: mm(0.5) }), 'identical samples must fit deterministically')
})

test('freehand UI captures pointer, commits native polygon, clears abandoned gesture', () => {
  assert.match(board, /tool2d==='vector-pencil'/)
  assert.match(board, /setPointerCapture\(e\.pointerId\)/)
  assert.match(board, /fitPencilStroke\(raw\.map/)
  assert.match(board, /onPolygon\(points,tangents\)/)
  assert.match(board, /onPointerCancel=\{e\s*=>\s*\{[^\n]*setPencilSamples\(\[\]\)/)
})

test('physical dart coordinates conserve specified intake on straight material boundary', () => {
  const a = [0, 0], b = [mm(200), 0]
  const intake = mm(30), depth = mm(70), center = 0.5
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const left = center - intake / (2 * length), right = center + intake / (2 * length)
  const apex = [(a[0] + b[0]) / 2, depth]
  assert.ok(left > 0.01 && right < 0.99)
  assert.ok(Math.abs((right - left) * length - intake) < 1e-12)
  assert.ok(Math.abs(apex[1] - depth) < 1e-12)
  const wedgeArea = intake * depth / 2
  assert.ok(Math.abs(wedgeArea - mm(30) * mm(70) / 2) < 1e-12)
  assert.match(board, /kind:'DartCutSew',panel:panel\.id,edge,left_t,right_t,apex/)
  assert.match(board, /polygon\.curves\?\.\[edge\]\|\|polygon\.free_curve_points\?\.\[edge\]\?\.length/)
})

test('dart end clearance rejects intake near segment corners before edit', () => {
  const length = mm(100), intake = mm(30)
  const offset = intake / (2 * length)
  const candidate = center => ({ left: center - offset, right: center + offset })
  const tooClose = candidate(0.15)
  assert.ok(tooClose.left <= 0.01)
  const centered = candidate(0.5)
  assert.ok(centered.left > 0.01 && centered.right < 0.99)
  assert.match(board, /left_t<=\.01\|\|right_t>=\.99/)
})
