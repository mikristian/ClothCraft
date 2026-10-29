import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&qa=anatomical-pants-preview',{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:45000})
  await page.getByRole('navigation',{name:'Library categories'}).getByRole('button',{name:'Garment',exact:true}).click()
  const tile=page.locator('[data-library-hover-id="Garment:pants"]')
  await tile.waitFor({state:'attached',timeout:25000})
  await tile.scrollIntoViewIfNeeded()
  await tile.hover()
  const preview=page.locator('[data-library-preview="Garment:pants"]')
  await preview.waitFor({state:'visible',timeout:25000})
  await page.waitForFunction(()=>document.querySelector('[data-library-preview="Garment:pants"] canvas')?.dataset.previewStatus==='ready',{timeout:25000})
  const d=await preview.locator('canvas').evaluate(node=>({...node.dataset}))
  assert.equal(d.previewSourcePieceCount,'4')
  assert.equal(d.previewDisplayedPieceCount,'4')
  assert.equal(d.previewFabricIds,'main')
  assert.ok(Number(d.previewTriangleCount)>2000)
  assert.deepEqual(errors,[])
  const screenshot='screenshots/qa-installed-v2-pants-anatomical-preview-20261018.png'
  await preview.screenshot({path:screenshot})
  console.log(JSON.stringify({pass:true,panels:d.previewSourcePieceCount,triangles:d.previewTriangleCount,fabrics:d.previewFabricIds,screenshot}))
}finally{await browser.close()}
