import { chromium } from 'playwright-core'
import { stat } from 'node:fs/promises'
import assert from 'node:assert/strict'

const ids = ['EXO01','R02','R03','S01','S10']
const reports = []
for (const id of ids) {
  const file = await stat(`public/stage-posters/${id}.png`)
  assert.ok(file.size > 8000, `${id}: empty poster`)
  reports.push({ id, posterBytes: file.size })
}
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal'] })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`${process.env.EXO_QA_URL || 'http://127.0.0.1:5188'}/?desktop=1&testSession=stage-poster-qa`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name:'Stage', exact:true }).click()
  const catalog=page.locator('.exo-stage-catalog').first()
  await catalog.waitFor({ timeout:12000 })
  const cards=catalog.locator('.exo-stage-card:has([data-stage-id])')
  assert.equal(await cards.count(), ids.length)
  const actualIds=await cards.evaluateAll(nodes=>nodes.map(node=>node.querySelector('[data-stage-id]')?.dataset.stageId))
  assert.deepEqual(actualIds,ids)
  assert.equal(await cards.locator('canvas').count(),0,'cards unexpectedly create WebGL canvases')
  for(const entry of reports){
    const tile=catalog.locator(`[data-stage-id="${entry.id}"]`)
    await tile.scrollIntoViewIfNeeded()
    await tile.locator('img').evaluate(async img=>{ if(!img.complete) await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})}) })
    assert.equal(await tile.locator('img').evaluate(el=>el.naturalWidth>0),true,`${entry.id}: poster missing`)
  }
  const selected=catalog.locator('[data-stage-id="EXO01"]').locator('..')
  await selected.hover({ force:true })
  const popup=page.locator('[data-library-preview="stage:EXO01"]')
  await popup.waitFor({timeout:5000})
  const canvas=popup.locator('canvas')
  await canvas.waitFor({timeout:5000})
  await page.waitForFunction(()=>document.querySelector('[data-library-preview="stage:EXO01"] canvas')?.dataset.stageStatus==='ready',null,{timeout:15000})
  const meshes=Number(await canvas.getAttribute('data-preview-mesh-count'))
  assert.equal(meshes,25,'hover must load the 23 approved Stage 01 meshes plus the real ClothCraft 3D emblem and wordmark')
  assert.equal(await cards.locator('canvas').count(),0,'hover should not mount canvases inside cards')
  await selected.click({force:true})
  console.log(JSON.stringify({ width:390,ids,cardCanvases:0,hoverMeshes:meshes,posters:reports },null,2))
} finally { await browser.close() }
