// Installed V2 web/native bridge smoke for the photo-overlay pointer path.
// Uses an isolated Chrome profile; no project or factory state is changed.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const root = process.env.EXO_INSTALLED_WEB_URL || 'http://127.0.0.1:5386'
const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9kK7oAAAAASUVORK5CYII=',
  'base64',
)
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
try {
  const context = await browser.newContext({viewport: {width: 1680, height: 1050}})
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${root}/?desktop=1&engine=clothcraft&testSession=installed-photo-anchor-pointer`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  })
  await page.locator('.cc-board svg[data-native-tool]').first()
    .waitFor({state: 'visible', timeout: 45000})

  // Physically click the installed Add Anchor button and verify tool routing.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent(
    'exo-clothcraft-select-2d-tool', {detail: {tool: 'anchor-point'}},
  )))
  await page.locator('.cc-board svg[data-native-tool="anchor-point"]').first().waitFor()
  const addAnchor = page.getByRole('button', {name: 'Add anchor point', exact: true}).first()
  await addAnchor.click()
  await page.locator('.cc-board svg[data-native-tool="split"]').first().waitFor()
  await page.evaluate(() => window.dispatchEvent(new CustomEvent(
    'exo-clothcraft-select-2d-tool', {detail: {tool: 'select'}},
  )))
  await page.locator('.cc-board svg[data-native-tool="select"]').first().waitFor()

  const picker = page.waitForEvent('filechooser', {timeout: 12000})
  await page.evaluate(() => window.dispatchEvent(new CustomEvent(
    'exo-open-2d-background-image', {detail: {editor: 'native', action: 'add'}},
  )))
  await (await picker).setFiles({name: 'native-photo-pointer-test.png', mimeType: 'image/png', buffer: image})
  const photo = page.locator('.cc-board [data-2d-reference-image]').first()
  const east = page.locator('.cc-board [data-reference-overlay="true"] [data-reference-resize-handle="e"]').first()
  await east.waitFor({state: 'visible', timeout: 20000})
  const handles = page.locator('.cc-board [data-reference-overlay="true"] [data-reference-resize-handle]')
  assert.equal(await handles.count(), 8)
  const handleBounds = await east.boundingBox()
  console.log('INSTALLED_HANDLE_BOUNDS', JSON.stringify(handleBounds))
  assert(handleBounds.width >= 8 && handleBounds.width <= 20 &&
    handleBounds.height >= 8 && handleBounds.height <= 20,
  'Installed photo handle should remain approximately screen-sized')
  const measure = () => photo.locator('image').evaluate(el => ({
    x: Number(el.getAttribute('x')),
    y: Number(el.getAttribute('y')),
    width: Number(el.getAttribute('width')),
  }))
  const before = await measure()
  const hx = handleBounds.x + handleBounds.width / 2
  const hy = handleBounds.y + handleBounds.height / 2
  assert(await east.evaluate(el => {
    const r = el.getBoundingClientRect()
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el
  }), 'Installed resize handle must accept a real pointer hit')
  await page.mouse.move(hx, hy)
  await page.mouse.down()
  await page.mouse.move(hx + 45, hy, {steps: 8})
  await page.mouse.up()
  const resized = await measure()
  assert(resized.width > before.width, 'Installed photo must resize from mouse input')

  const points = await photo.locator('[data-2d-reference-hit]').evaluate(el => {
    const r = el.getBoundingClientRect(), hits = []
    for (const u of [.1, .25, .5, .75, .9]) for (const v of [.1, .25, .5, .75, .9]) {
      const x = r.x + r.width * u, y = r.y + r.height * v
      if (document.elementFromPoint(x, y) === el) hits.push({x, y})
    }
    return hits
  })
  assert(points.length > 0, 'Photo must expose a direct move target')
  const point = points[0]
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + 32, point.y + 24, {steps: 9})
  await page.mouse.up()
  const moved = await measure()
  assert(moved.x > resized.x && moved.y > resized.y,
    `Native photo pointer move was stolen by the board: ${JSON.stringify({resized, moved})}`)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({pass: true, addAnchorSelection: true, photoImport: true,
    handles: 8, resized: {before: before.width, after: resized.width},
    moved: {before: [resized.x, resized.y], after: [moved.x, moved.y]}, pageErrors: 0}))
} finally {
  await browser.close()
}
