// Read-only installed V2 acceptance; uses its actual built-in Library hover.
// Never clicks a garment tile or posts a Rust workspace operation.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5386'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
const report={origin,checks:[],errors:[]}
try {
  const page=await browser.newPage({viewport:{width:1510,height:960}})
  page.on('pageerror',error=>report.errors.push(error.message))
  await page.goto(origin+'/?desktop=1&engine=clothcraft&qa=installed-clo-source-theme-20261017',{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:45000})
  const nav=page.getByRole('navigation',{name:'Library categories'})
  await nav.getByRole('button',{name:'Garment',exact:true}).click()
  const tile=page.locator('[data-library-hover-id="Garment:clo-male-tshirt"]')
  await tile.scrollIntoViewIfNeeded()
  await tile.hover()
  const preview=page.locator('[data-library-preview="Garment:clo-male-tshirt"]')
  await preview.waitFor({state:'visible',timeout:20000})
  await page.waitForFunction(()=>document.querySelector('[data-library-preview="Garment:clo-male-tshirt"] canvas')?.dataset.previewStatus==='ready',null,{timeout:30000})
  const attrs=await preview.locator('canvas').evaluate(c=>({...c.dataset}))
  assert.equal(attrs.previewRenderMode,'clo-source-single-garment')
  assert.equal(attrs.previewSourcePanelCount,'7')
  assert.equal(attrs.previewMeshCount,'7')
  assert.equal(attrs.previewCloneCount,'0')
  assert.equal(attrs.previewSourceVertexCount,'3661')
  assert.equal(attrs.previewTriangleCount,'6876')
  assert.equal(attrs.previewViewCount,'3')
  assert.equal(attrs.previewViews,'front,side,back')
  assert.equal(attrs.previewArrangement,'assembled')
  assert.equal(attrs.previewCloSewingPaths,'46')
  report.checks.push({name:'Installed CLO Male T-shirt',views:attrs.previewViews,meshCount:attrs.previewMeshCount,sourceVertices:attrs.previewSourceVertexCount,triangles:attrs.previewTriangleCount,sewingPaths:attrs.previewCloSewingPaths})
  await page.mouse.move(825,55)
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  await page.getByTestId('settings-tab-theme').click()
  await page.getByRole('button',{name:'Sapphire Studio theme'}).click()
  const themed=await page.evaluate(()=>({
    theme:document.querySelector('.app-shell')?.dataset.studioTheme,
    panels:['.asset-browser','.clo-inspector','.clo-pe-content'].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor),
    mask:getComputedStyle(document.querySelector('.clo-left-3d-column .cad-tool-icon-mask')).display,
  }))
  assert.equal(themed.theme,'sapphire')
  assert.equal(new Set(themed.panels).size,1,'Nested inspector not using theme surface')
  assert.notEqual(themed.mask,'none')
  await page.getByRole('checkbox',{name:'Enable Liquid Glass'}).check()
  const glass=await page.evaluate(()=>getComputedStyle(document.querySelector('.asset-browser')).backdropFilter)
  assert(glass.includes('blur('))
  report.checks.push({name:'Installed Sapphire theme and Liquid Glass',theme:themed.theme,panelColor:themed.panels[0],filter:glass,iconsTinted:true})
  assert.deepEqual(report.errors,[])
  report.pass=true
} catch (error) {
  report.pass=false
  report.error=error.stack||String(error)
  process.exitCode=1
} finally {await browser.close()}
console.log(JSON.stringify(report,null,2))
