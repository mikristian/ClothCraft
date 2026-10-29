import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from '../../music-empire-game/node_modules/playwright-core/index.mjs'
import { samplePieceBoundary } from '../src/core/project.js'
import { inwardOffsetEdge } from '../src/core/garmentPreviewGeometry.js'
import { initializeRustPreviewOffsetKernel, rustPreviewOffsetStatus } from '../src/core/rustPreviewOffsetKernel.js'
import { createTeeTemplate, createHoodieTemplate, createPantsTemplate } from '../src/data/templates.js'

const original = (piece, index, offset) => {
  const { points, edgePaths } = samplePieceBoundary(piece, 9)
  const edge = edgePaths[index] || []
  if (edge.length < 2) return []
  const area = points.reduce((sum, p, i) => { const next = points[(i + 1) % points.length]; return sum + p.x * next.y - p.y * next.x }, 0)
  const sign = area >= 0 ? 1 : -1
  return edge.map((point, i) => {
    const a = edge[Math.max(0, i - 1)], b = edge[Math.min(edge.length - 1, i + 1)]
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1
    return { x: point.x - sign * (b.y - a.y) / length * offset, y: point.y + sign * (b.x - a.x) / length * offset }
  })
}
let seed = 0x5162026
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296 }
const fixtures = []
for (const factory of [createTeeTemplate, createHoodieTemplate, createPantsTemplate]) {
  const project = factory()
  for (const piece of project.pieces.slice(0, 4)) fixtures.push(piece)
}
for (let i = 0; i < 400; i++) {
  const n = 3 + Math.floor(random() * 6)
  const points = Array.from({ length: n }, (_, k) => {
    const angle = 2 * Math.PI * k / n
    const radius = 1 + random() * 22
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
  if (i % 2) points.reverse()
  if (i % 11 === 0) points[1] = { ...points[0] }
  if (i % 17 === 0) points[2] = { ...points[1] }
  fixtures.push({ id: 'qa-' + i, name: 'Disposable', points, curves: {} })
}
const cases = []
for (const piece of fixtures) for (const offset of [0, .75, -1.25, 3.1]) {
  for (let index = 0; index < Math.min(piece.points.length + 1, 5); index++) cases.push([piece, index, offset])
}
function compare(stage) {
  let coordinates = 0, maxDifference = 0
  for (const [piece, index, offset] of cases) {
    const expected = original(piece, index, offset), actual = inwardOffsetEdge(piece, index, offset)
    assert.equal(actual.length, expected.length, stage + ': point count')
    for (let k = 0; k < expected.length; k++) for (const axis of ['x', 'y']) {
      const difference = Math.abs(actual[k][axis] - expected[k][axis])
      assert(Number.isFinite(actual[k][axis]) && difference <= 1e-9, `${stage} ${piece.id} edge ${index} point ${k} ${axis}: ${difference}`)
      maxDifference = Math.max(maxDifference, difference)
      coordinates++
    }
  }
  return { cases: cases.length, coordinates, maxDifference }
}
assert.equal(rustPreviewOffsetStatus().backend, 'javascript-fallback')
const fallback = compare('fallback')
const wasmPath = new URL('../public/wasm/exo_preview_offset_kernel.wasm', import.meta.url)
assert(existsSync(wasmPath), 'Worker-1 preview offset WASM has not been built')
assert.equal(await initializeRustPreviewOffsetKernel({ bytes: readFileSync(wasmPath) }), true)
assert.equal(rustPreviewOffsetStatus().backend, 'rust-wasm')
const native = compare('rust-wasm')
let browser
let vite
const browserChecks = []
try {
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5199', '--strictPort'], { stdio: 'ignore' })
  let ready = false
  for (let attempt = 0; attempt < 80; attempt++) {
    if (vite.exitCode !== null) throw Error('Vite exited early')
    try { const r = await fetch('http://127.0.0.1:5199/?desktop=1&testSession=tee'); if (r.ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert(ready, 'Vite 5199 failed to become ready')
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  for (const view of [{ mode: 'desktop', width: 1440, height: 900 }, { mode: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, isMobile: view.mode === 'mobile', hasTouch: view.mode === 'mobile' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const response = await page.goto('http://127.0.0.1:5199/?desktop=1&testSession=tee', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.locator('body').waitFor()
    await page.waitForTimeout(800)
    assert.equal(response.status(), 200)
    assert.deepEqual(errors, [], view.mode + ': browser errors')
    browserChecks.push({ mode: view.mode, status: response.status(), pageErrors: errors.length })
    await context.close()
  }
} finally {
  if (browser) await browser.close()
  if (vite) { vite.kill('SIGTERM'); await new Promise(resolve => vite.once('exit', resolve)) }
}
console.log(JSON.stringify({ pass: true, fallback, rust: native, browserChecks, sourcePortStopped: 5199 }))
