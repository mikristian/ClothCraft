// Read-only acceptance against the real, installed, signed EXO V2 app.
// Does not click Place, issue Rust mutations or alter saved garment documents.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const base='http://127.0.0.1:5386'
const native='http://127.0.0.1:5385'
const [health,manifestResponse]=await Promise.all([
  fetch(native+'/health',{signal:AbortSignal.timeout(6000)}).then(r=>r.json()),
  fetch(base+'/clo-hardware-converted/manifest.json',{signal:AbortSignal.timeout(6000)}),
])
assert(health.ok&&health.nativeReady,'Installed EXO native engine is not ready')
assert.equal(manifestResponse.status,200,'Installed CLO catalog is missing')
const manifest=await manifestResponse.json()
assert.equal(manifest.items.length,162,'Installed CLO hardware count mismatch')
assert.equal(manifest.items.filter(item=>item.glb).length,133,'Missing converted GLB models in installed catalog')
const ykk=manifest.items.filter(item=>/ykk/i.test(`${item.name} ${item.category} ${item.sourcePath}`))
assert.equal(ykk.length,21,'YKK hardware source count mismatch')
const sample=ykk.find(item=>item.glb)
assert(sample,'No YKK GLB model available')
const glbResponse=await fetch(base+sample.glb,{signal:AbortSignal.timeout(6000)})
assert.equal(glbResponse.status,200,'Installed YKK geometry cannot be fetched')
assert.equal(Buffer.from(await glbResponse.arrayBuffer()).toString('ascii',0,4),'glTF','Installed YKK GLB invalid')

const browser=await chromium.launch({
  headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal'],
})
try{
  const page=await browser.newPage({viewport:{width:1630,height:1040}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/?desktop=1&engine=clothcraft&testSession=installed-new-clo-hardware',
    {waitUntil:'domcontentloaded',timeout:25000})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:30000})
  await page.getByText('Hardware and Trims',{exact:true}).first().click()
  const header=page.locator('[data-clo-imported-library-toggle]')
  await header.waitFor({timeout:10000})
  assert.match(await header.innerText(),/New · CLO 3D Hardware & Trims/)
  await header.click()
  const cards=page.locator('.clo-imported-tile')
  await page.waitForFunction(()=>document.querySelectorAll('.clo-imported-tile').length===162)
  await page.locator('[data-clo-imported-new-3d]').click()
  assert.equal(await cards.count(),133,'New 3D filter must expose every converted hardware model')
  await page.locator('[data-clo-imported-references]').click()
  assert.equal(await cards.count(),29,'Source files filter must preserve all nonmesh hardware')
  await page.locator('.clo-imported-categories button').first().click()
  assert.equal(await cards.count(),162,'All hardware count differs after switching filters')
  await page.getByRole('textbox',{name:'Search imported hardware'}).fill('YKK')
  await page.waitForFunction(()=>document.querySelectorAll('.clo-imported-tile').length===21)
  await cards.first().click()
  const preview=page.getByRole('dialog',{name:/asset preview/})
  await preview.waitFor({timeout:15000})
  await preview.locator('.clo-imported-model canvas').waitFor({timeout:18000})
  await preview.locator('[data-clo-imported-place]').waitFor({timeout:15000})
  assert.deepEqual(errors,[],'Installed EXO imported library raised browser errors')
  console.log(JSON.stringify({pass:true,installed:true,signedNativeReady:true,
    indexed:162,new3D:133,sourceOnly:29,ykk:21,ykkGlbFetched:true,previewCanvas:true,
    placementActionPresent:true,readOnly:true,pageErrors:errors.length},null,2))
}finally{
  await browser.close()
}
