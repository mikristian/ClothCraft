// Playwright regression: the approved EXO01 scene is the only selectable stage.
// Uses the already running V2 app; does not mutate source or saved projects.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const base = process.env.EXO_QA_URL || 'http://127.0.0.1:5386'
const uiOnly = process.env.EXO_QA_UI_ONLY === '1' // source preview without native Rust bridge
const output = mkdtempSync(path.join(tmpdir(), 'exo-only-stage01-'))
const checks = []
const record = (name, extra = {}) => { checks.push({ name, ...extra }); console.log(`PASS ${name}`, JSON.stringify(extra)) }
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=metal'] })
let failure = null
try {
  for (const mode of ['desktop', 'mobile']) {
    const mobile = mode === 'mobile'
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1512, height: 950 }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile })
    const page = await context.newPage()
    const failures = []
    const assets = new Map()
    page.on('pageerror', error => failures.push(error.message))
    page.on('response', response => {
      if (/\/stage-(?:scenes|posters)\//.test(response.url())) assets.set(new URL(response.url()).pathname, response.status())
    })
    try {
      await page.goto(`${base}/?desktop=1&engine=clothcraft&testSession=stage01-only-${mode}-20261017`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      const stageButton = page.getByRole('button', { name: 'Stage', exact: true })
      await stageButton.waitFor({ timeout: 45000 })
      await stageButton.click()
      const catalog = page.locator('.exo-stage-catalog').first()
      await catalog.waitFor({ state: 'visible', timeout: 15000 })
      const ids = await catalog.locator('.exo-stage-card [data-stage-id]').evaluateAll(elements => elements.map(element => element.dataset.stageId))
      assert.deepEqual(ids, ['EXO01'], `${mode}: stage catalog must contain exactly EXO01; saw ${ids.join(', ')}`)
      assert.equal(await catalog.locator('.exo-stage-card').count(), 2, `${mode}: should show one real stage card and one clear action`)
      assert.equal(await catalog.locator('.exo-stage-clear-card, .exo-stage-empty').count(), 1, `${mode}: Empty studio clear action missing`)
      assert.equal(await catalog.getByText(/cathedral/i).count(), 0, `${mode}: cathedral still exposed`)
      record(`${mode}: catalog offers only EXO01 and neutral Empty studio`, { ids })

      const stageCard = catalog.locator('.exo-stage-card:has([data-stage-id="EXO01"])').first()
      const poster = stageCard.locator('img.exo-stage-poster')
      await poster.waitFor({ state: 'attached', timeout: 12000 })
      const posterResult = await poster.evaluate(async image => {
        await image.decode().catch(() => {})
        return { src: new URL(image.currentSrc || image.src).pathname, width: image.naturalWidth, height: image.naturalHeight }
      })
      assert.equal(posterResult.src, '/stage-posters/EXO01.png', `${mode}: wrong stage poster`)
      assert(posterResult.width > 128 && posterResult.height > 128, `${mode}: poster failed to decode`)
      record(`${mode}: authentic EXO01 poster decoded`, posterResult)

      // Hover is meaningful on desktop; mobile may expose preview on a touch label.
      if (!mobile) {
        await stageCard.hover()
        const hover = page.locator('[data-library-preview="stage:EXO01"]')
        await hover.waitFor({ state: 'visible', timeout: 12000 })
        const preview = hover.locator('canvas[data-preview-stage-id="EXO01"]')
        const ready = await preview.waitFor({ state: 'attached', timeout: 12000 }).then(() => true).catch(() => false)
        if (ready) {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-library-preview="stage:EXO01"] canvas[data-preview-stage-id="EXO01"]')
            return el?.dataset.stageStatus === 'ready' && Number(el.dataset.previewMeshCount) === 23
          }, null, { timeout: 30000 })
          record('desktop: hovered GLB preview loads all 23 actual EXO01 meshes')
        } else {
          const hoverPoster = hover.locator('img[src="/stage-posters/EXO01.png"]')
          await hoverPoster.waitFor({ state: 'visible', timeout: 12000 })
          assert(await hoverPoster.evaluate(async el => { await el.decode().catch(() => {}); return el.naturalWidth > 128 }), 'static preview poster did not decode')
          record('desktop: hovered preview renders actual EXO01 poster')
        }
      }

      await stageCard.click()
      const canvas = page.locator('.cc-viewport-3d .cc-scene canvas[data-stage-id]').first()
      await canvas.waitFor({ state: 'attached', timeout: 45000 })
      await page.waitForFunction(() => {
        const el = document.querySelector('.cc-viewport-3d .cc-scene canvas[data-stage-id]')
        return el?.dataset.stageId === 'EXO01' && el.dataset.stageStatus === 'ready' && Number(el.dataset.stageMeshCount) === 23
      }, null, { timeout: 40000 })
      const state = await canvas.evaluate(el => ({ stageId: el.dataset.stageId, stageStatus: el.dataset.stageStatus, meshes: Number(el.dataset.stageMeshCount), garmentMeshes: Number(el.dataset.native3dPanelMeshCount), avatar: el.dataset.avatarVisible }))
      assert.equal(await stageCard.getAttribute('aria-pressed'), 'true', `${mode}: EXO01 card is not selected`)
      if (!uiOnly) {
        assert(state.garmentMeshes > 0, `${mode}: native garment disappeared`)
        assert.equal(state.avatar, 'true', `${mode}: avatar disappeared`)
      }
      record(`${mode}: selected stage renders 23 GLB meshes${uiOnly ? ' (source UI only)' : ' with garment and avatar'}`, state)
      const screenshot = path.join(output, `${mode}-exo01-stage.png`)
      await page.screenshot({ path: screenshot, fullPage: false })
      record(`${mode}: screenshot`, { screenshot })

      const glb = await page.request.get(`${base}/stage-scenes/EXO01.glb`)
      const png = await page.request.get(`${base}/stage-posters/EXO01.png`)
      assert.equal(glb.status(), 200, `${mode}: GLB request failed`)
      assert.equal(png.status(), 200, `${mode}: poster request failed`)
      assert((await glb.body()).byteLength > 100_000, `${mode}: scene GLB suspiciously small`)
      assert((await png.body()).byteLength > 10_000, `${mode}: poster suspiciously small`)
      assert.equal(assets.get('/stage-scenes/EXO01.glb'), 200, `${mode}: renderer did not fetch GLB successfully`)
      assert.equal(assets.get('/stage-posters/EXO01.png'), 200, `${mode}: UI did not fetch poster successfully`)
      record(`${mode}: browser fetched EXO01 model and poster successfully`)
      assert.deepEqual(failures, [], `${mode}: uncaught page errors: ${failures.join(' | ')}`)
    } finally { await context.close() }
  }
} catch (error) {
  failure = String(error.stack || error)
  process.exitCode = 1
} finally {
  await browser.close()
  console.log(JSON.stringify({ passed: failure === null, checks, output, ...(failure ? { failure } : {}) }, null, 2))
}
