import assert from 'node:assert/strict'
import { chromium } from '../../music-empire-game/node_modules/playwright-core/index.mjs'

// Disposable Chrome context and isolated testSession tee project only.
const URL = 'http://127.0.0.1:5188/?desktop=1&testSession=tee'
const KEY = 'garment-studio-tee-first-fit-project-v2'
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=metal'] })
try {
  const page = await browser.newPage({ viewport: { width: 1650, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  const front = page.locator('.pattern-piece[data-piece-id="front"]')
  await front.waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForFunction(key => Boolean(localStorage.getItem(key)), KEY)
  await page.evaluate(key => {
    const project = JSON.parse(localStorage.getItem(key))
    const piece = project.pieces.find(item => item.id === 'front')
    piece.points = [{ x: -10, y: 0, id: 'a' }, { x: 0, y: 0, id: 'b' }, { x: 10, y: 0, id: 'c' }, { x: 10, y: 20, id: 'd' }, { x: -10, y: 20, id: 'e' }]
    piece.curves = {}
    piece.notches = []
    piece.locked = false
    piece.zippers = [{ id: 'qa-z', edgeIndex: 3 }]
    piece.bindings = [{ id: 'qa-b', edgeIndex: 3 }]
    piece.topstitches = [{ id: 'qa-t', edgeIndex: 3 }]
    project.seams = []
    localStorage.setItem(key, JSON.stringify(project))
  }, KEY)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await front.waitFor({ state: 'visible', timeout: 20000 })
  const snapshot = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).pieces.find(piece => piece.id === 'front'), KEY)
  const check = async (pointCount, edgeIndex, stage) => {
    await page.waitForFunction(({ key, pointCount, edgeIndex }) => {
      const piece = JSON.parse(localStorage.getItem(key)).pieces.find(item => item.id === 'front')
      return piece.points.length === pointCount && ['zippers', 'bindings', 'topstitches'].every(type => piece[type]?.[0]?.edgeIndex === edgeIndex)
    }, { key: KEY, pointCount, edgeIndex }, { timeout: 8000 })
    const piece = await snapshot()
    assert.equal(piece.points.length, pointCount, `${stage}: point count`)
    for (const type of ['zippers', 'bindings', 'topstitches']) assert.equal(piece[type][0].edgeIndex, edgeIndex, `${stage}: ${type} edge remap`)
  }
  await check(5, 3, 'seed')
  await page.getByRole('button', { name: 'Edit Pattern Points', exact: true }).first().click()
  await front.locator('.pattern-node').nth(1).click({ force: true, modifiers: ['Alt'] })
  await check(4, 2, 'delete')
  await page.keyboard.press('Meta+z')
  await check(5, 3, 'keyboard undo')
  await page.keyboard.press('Meta+Shift+z')
  await check(4, 2, 'keyboard redo')
  assert.deepEqual(errors, [], 'No uncaught browser errors')
  console.log(JSON.stringify({ pass: true, source: URL, stages: { delete: { points: 4, attachments: 2 }, undo: { points: 5, attachments: 3 }, redo: { points: 4, attachments: 2 } }, browserErrors: errors }, null, 2))
} finally {
  await browser.close()
}
