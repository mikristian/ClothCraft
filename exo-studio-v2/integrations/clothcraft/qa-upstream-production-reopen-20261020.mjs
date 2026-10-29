// Read-only smoke of the installed isolated QA app after prime approves a refresh.
// No workspace POSTs, editing clicks, or garment changes.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const ui = 'http://127.0.0.1:5386'
const backend = 'http://127.0.0.1:5385'
const output = path.resolve('docs/qa/upstream-solver-production-reopen-20261020')
await fs.mkdir(output, { recursive: true })
const health = await fetch(`${backend}/health`, { signal: AbortSignal.timeout(10000) }).then(r => r.json())
assert.equal(health.ok, true)
assert.equal(health.nativeReady, true)
const homepage = await fetch(ui, { signal: AbortSignal.timeout(10000) })
assert.equal(homepage.status, 200)
const html = await homepage.text()
const assets = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map(m => m[1])
assert.ok(assets.length, 'QA HTML must load JS assets')
const bundles = await Promise.all(assets.map(async asset => {
  const url = new URL(asset, ui)
  return fetch(url).then(r => r.text())
}))
const marker = { dartCommand: bundles.some(s => s.includes('DartCutSew')), dartLabel: bundles.some(s => s.includes('Physical Dart (Cut + Sew)')), dartFitInspector: bundles.some(s => s.includes('data-dart-fit-inspector')), nativeDartCount: bundles.some(s => s.includes('nativeDartCount')) }
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const report = { timestamp: new Date().toISOString(), ui, backend, health, marker, screenshots: [], pageErrors: [] }
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/workspace')) { let op; try { op = request.postDataJSON()?.op } catch {} if (op !== 'snapshot') report.pageErrors.push(`Unexpected workspace operation: ${op || 'unknown'}`) } })
  await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=qa-dart-reopen-readonly`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.locator('[data-native-clothcraft="true"]').waitFor({ state: 'attached', timeout: 30000 })
  const threeD = page.locator('.cc-viewport-3d canvas').first()
  const twoD = page.locator('.cc-viewport-2d').first()
  await threeD.waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.cc-viewport-2d').waitFor({ state: 'attached', timeout: 30000 })
  report.nativeSnapshotReady = await page.waitForFunction(() => Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.native3dMeshTriangles)>0, null, { timeout: 25000 }).then(() => true).catch(() => false)
  const splitButton = page.getByRole('button', { name: /^(split|3d\s*\+\s*2d|side by side)$/i }).first()
  if (await splitButton.count()) await splitButton.click()
  report.viewports = { threeD: await threeD.boundingBox(), twoD: await twoD.boundingBox(), twoDPresent: await twoD.count(), twoDVisible: await twoD.isVisible(), twoDSvgCount: await twoD.locator('svg').count(), twoDCanvasCount: await twoD.locator('canvas').count(), twoDChildren: await twoD.locator('*').count(), existingDarts: await page.locator('[data-physical-dart]').count(), physicalDartControlsVisible: await page.getByText('Physical Dart (Cut + Sew)', { exact: true }).count(), dartFitInspector: await page.locator('[data-dart-fit-inspector]').count() }
  report.canvasMesh = { revision: await threeD.getAttribute('data-native3d-mesh-revision'), triangles: Number(await threeD.getAttribute('data-native3d-mesh-triangles')), vertices: Number(await threeD.getAttribute('data-native3d-mesh-vertices')) }
  const screenshot = path.join(output, 'qa-installed-2d-3d.png')
  await page.screenshot({ path: screenshot, fullPage: false })
  report.screenshots.push(screenshot)
  const fitNav = page.getByRole('button', { name: 'Fit', exact: true }).first()
  if (await fitNav.count()) await fitNav.click()
  const fitSelect = page.getByRole('combobox', { name: 'EXO workspace section' })
  if (await fitSelect.count()) await fitSelect.selectOption('Fit')
  report.fitInspector = { count: await page.locator('[data-dart-fit-inspector="true"]').count(), visible: await page.locator('[data-dart-fit-inspector="true"]').first().isVisible().catch(() => false), text: (await page.locator('[data-dart-fit-inspector="true"]').first().textContent().catch(() => ''))?.slice(0, 700) }
  const fitScreenshot = path.join(output, 'qa-installed-fit-inspector.png')
  await page.screenshot({ path: fitScreenshot, fullPage: false })
  report.screenshots.push(fitScreenshot)
  report.browserErrorCount = report.pageErrors.length
  await page.close()
} finally { await browser.close() }
report.pass = Boolean(report.viewports.threeD && report.viewports.twoDVisible && (report.viewports.twoDSvgCount || report.viewports.twoDCanvasCount) && report.nativeSnapshotReady && report.canvasMesh.triangles > 0 && report.canvasMesh.vertices > 0 && !report.browserErrorCount)
await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
assert.ok(report.pass, 'Regular app must render real 2D paper and 3D native cloth with no browser errors')
