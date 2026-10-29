// Read-only installed EXO V2 acceptance for the user's three complete
// mannequin-positioned CLO Male T-shirt front/side/back preview.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5386'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const screenshots=path.join(root,'research/screenshots/clo-garment-three-view-20261017')
mkdirSync(screenshots,{recursive:true})
const browser=await chromium.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal'],
})
const report={origin,checks:[],errors:[]}
try {
  const page=await browser.newPage({viewport:{width:1510,height:960}})
  page.on('pageerror',error=>report.errors.push(error.message))
  await page.goto(origin+'/?desktop=1&engine=clothcraft&qa=three-shirt-views-readonly',{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:45000})
  await page.getByRole('navigation',{name:'Library categories'}).getByRole('button',{name:'Garment',exact:true}).click()
  const tile=page.locator('[data-library-hover-id="Garment:clo-male-tshirt"]')
  await tile.scrollIntoViewIfNeeded()
  await tile.hover()
  const preview=page.locator('[data-library-preview="Garment:clo-male-tshirt"]')
  await preview.waitFor({state:'visible',timeout:22000})
  await page.waitForFunction(()=>document.querySelector('[data-library-preview="Garment:clo-male-tshirt"] canvas')?.dataset.previewStatus==='ready',null,{timeout:30000})
  const canvas=preview.locator('canvas')
  const attrs=await canvas.evaluate(node=>({...node.dataset}))
  assert.equal(attrs.previewRenderMode,'clo-source-three-instances')
  assert.equal(attrs.previewSourcePanelCount,'7')
  assert.equal(attrs.previewSourceVertexCount,'3661')
  assert.equal(attrs.previewSourceTriangleCount,'6876')
  assert.equal(attrs.previewCloneCount,'2')
  assert.equal(attrs.previewMeshCount,'21')
  assert.equal(attrs.previewRenderedPanelCount,'21')
  assert.equal(attrs.previewViews,'front,side,back')
  assert.equal(attrs.previewCameraAngles,'0,1.570796,3.141593')
  assert.equal(attrs.previewArrangement,'assembled')
  assert.equal(attrs.previewFitCertified,'false')
  report.checks.push({
    name:'Three fixed anatomical views from seven authentic CLO panels',
    renderedMeshes:attrs.previewMeshCount,sourceMeshes:attrs.previewSourcePanelCount,
    cameraAngles:attrs.previewCameraAngles,sourceTriangles:attrs.previewSourceTriangleCount,
    sourceVertices:attrs.previewSourceVertexCount,
  })
  await preview.screenshot({path:path.join(screenshots,'installed-v2-front-side-back-three-shirts.png')})
  await preview.getByRole('button',{name:/Separated 7 pieces/}).click()
  assert.equal(await canvas.getAttribute('data-preview-arrangement'),'separated')
  await preview.getByRole('button',{name:/Three shirts|Assembled/}).first().click()
  assert.equal(await canvas.getAttribute('data-preview-arrangement'),'assembled')
  assert.deepEqual(report.errors,[])
  report.pass=true
} catch(error){
  report.pass=false
  report.error=error.stack||String(error)
  process.exitCode=1
} finally {
  await browser.close()
}
console.log(JSON.stringify(report,null,2))
