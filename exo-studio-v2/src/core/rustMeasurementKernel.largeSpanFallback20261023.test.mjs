import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { measureHorizontalSpans, initializeRustMeasurementKernel } from './rustMeasurementKernel.js'

test('JavaScript measurement fallback handles 180,000 boundary points without argument-stack overflow', () => {
  const points = Array.from({ length: 180_000 }, (_, i) => ({ x: i / 1000, y: i % 2 ? -1 : 1 }))
  const originalFirst = { ...points[0] }, originalLast = { ...points.at(-1) }
  const result = measureHorizontalSpans([{ points, levels: [0] }])
  assert.equal(result.length, 1)
  assert.equal(result[0].length, 1)
  assert.ok(Math.abs(result[0][0] - 179.998) < 1e-10, `Expected 179.998 cm, got ${result[0][0]}`)
  assert.deepEqual(points[0], originalFirst)
  assert.deepEqual(points.at(-1), originalLast)
})

test('JavaScript measurement fallback preserves horizontal edges and non-crossing levels', () => {
  const rectangle = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
  const triangle = [{ x: 0, y: -1 }, { x: 10, y: 1 }, { x: 20, y: -1 }]
  const input = [{ points: rectangle, levels: [5, 0, 10, 15] }, { points: triangle, levels: [0] }]
  const before = JSON.stringify(input)
  assert.deepEqual(measureHorizontalSpans(input), [[10, 10, 10, 0], [10]])
  assert.equal(JSON.stringify(input), before, 'Measurement must not modify authored geometry')
})

test('streamed extrema match the original small-boundary intersection algorithm in 400 deterministic cases', () => {
  const reference = (points, y) => {
    const intersections = []
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length]
      if (Math.abs(a.y - b.y) < 1e-6) {
        if (Math.abs(y - a.y) < 0.2) intersections.push(a.x, b.x)
        continue
      }
      if (y < Math.min(a.y, b.y) || y > Math.max(a.y, b.y)) continue
      const t = (y - a.y) / (b.y - a.y)
      intersections.push(a.x + (b.x - a.x) * t)
    }
    return intersections.length < 2 ? 0 : Math.max(...intersections) - Math.min(...intersections)
  }
  let seed = 0x12345678
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
  const batches = Array.from({ length: 400 }, () => {
    const points = Array.from({ length: 3 + Math.floor(random() * 17) }, () => ({
      x: (random() - 0.5) * 200, y: (random() - 0.5) * 200,
    }))
    if (random() < 0.25) points[1].y = points[0].y
    return { points, levels: [points[0].y, 0, 200] }
  })
  assert.deepEqual(measureHorizontalSpans(batches), batches.map(({ points, levels }) => levels.map(y => reference(points, y))))
})

test('compiled Rust measurement kernel agrees with fallback on ordinary annotated pattern spans', async () => {
  const batches = [{
    points: [{ x: -4, y: -2 }, { x: 6, y: -2 }, { x: 6, y: 8 }, { x: -4, y: 8 }],
    levels: [0, 3, 5],
  }]
  const expected = measureHorizontalSpans(batches)
  const bytes = readFileSync(new URL('../../public/wasm/exo_measurement_kernel.wasm', import.meta.url))
  assert.equal(await initializeRustMeasurementKernel({ bytes }), true)
  assert.deepEqual(measureHorizontalSpans(batches), expected)
})
