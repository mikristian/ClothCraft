/** Installed EXO production UI: real preset covers, saved palettes, HEX editor. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url='http://127.0.0.1:5386'
let browser,page,stage='start'
const errors=[]
try{
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1660,height:1020}})
 await context.addInitScript(()=>{
  if(location.host!=='127.0.0.1:5386'||sessionStorage.getItem('exo-palette-test'))return
  localStorage.setItem('exo.studioCustomization.v1',JSON.stringify({
   version:1,appearance:{theme:'cream-light',panelFinish:'balanced'},
   workspace:{viewportLayout:'split',objectBrowserVisible:true},
  }))
  sessionStorage.setItem('exo-palette-test','1')
 })
 page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 stage='open installed settings and theme library'
 await page.goto(url+'/?desktop=1&engine=clothcraft&testSession=palette-cover-20261028',
  {waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Open Studio Settings'}).click({timeout:25000})
 await page.getByTestId('settings-tab-theme').click()
 await page.locator('.studio-active-palette-colors').waitFor({timeout:10000})
 const covers=page.locator('.studio-theme-gallery [data-theme-palette-cover="true"]')
 assert.equal(await covers.count(),168)
 assert.equal(await page.locator('.studio-theme-gallery .studio-theme-preview-orb').count(),0)
 assert.equal(await page.locator('.studio-active-palette-color').count(),5)
 const creamCard=page.locator('.studio-theme-gallery button[data-theme-id="cream-light"]')
 assert.equal(await creamCard.locator('[data-palette-role]').count(),5)
 const cardWidth=(await creamCard.boundingBox())?.width||0
 assert(cardWidth>=200,'Palette cover cards remain too narrow for readable HEX labels: '+cardWidth)
 const hexClipping=await creamCard.locator('.studio-theme-palette-codes small').evaluateAll(nodes=>nodes.some(node=>node.scrollWidth>node.clientWidth+1))
 assert.equal(hexClipping,false,'HEX codes clip instead of fitting the palette cover')
 const actual=await creamCard.locator('[data-palette-role="panel"]').evaluate(el=>getComputedStyle(el).backgroundColor)
 assert(/^rgb\(255, 254, 247\)$/.test(actual),'Cream cover did not use real panel color '+actual)
 stage='search and choose palette'
 await page.getByRole('textbox',{name:'Search theme presets'}).fill('Vanilla Cream')
 assert.equal(await covers.count(),1)
 await page.locator('.studio-theme-gallery button[data-theme-id="vanilla-light"]').click()
 assert((await page.locator('.studio-active-palette-copy').innerText()).includes('Vanilla Cream'))
 assert.equal(await page.locator('.app-shell').getAttribute('data-studio-theme'),'vanilla-light')
 stage='color edit and live swatch'
 const hex=page.getByRole('textbox',{name:'Glass backdrop tint hexadecimal color'})
 await hex.fill('#d1f5e4')
 await hex.blur()
 const well=page.locator('.studio-color-well').filter({has:page.getByLabel('Glass backdrop tint color picker')})
 assert.equal(await well.count(),1)
 const wellBg=await well.evaluate(el=>getComputedStyle(el).backgroundColor)
 assert.equal(wellBg,'rgb(209, 245, 228)')
 const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')))
 assert.equal(current.appearance.glassBackdrop,'#d1f5e4')
 stage='save and preview custom palette'
 await page.getByRole('textbox',{name:'Custom theme name'}).fill('Cream Palette QA')
 await page.getByRole('button',{name:'Save theme preset'}).click()
 const saved=page.locator('.studio-saved-theme-item').filter({hasText:'Cream Palette QA'})
 await saved.waitFor({timeout:5000})
 assert.equal(await saved.locator('[data-theme-palette-cover="true"] [data-palette-role]').count(),5)
 assert.equal(await saved.locator('.studio-theme-palette-cover--compact').count(),1)
 stage='2D canvas palette preview'
 const canvasCovers=page.locator('.studio-2d-theme-options [data-2d-palette-cover="true"]')
 assert((await canvasCovers.count())>=25)
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,realInstalledMacUI:true,totalPresetCovers:168,
  cardWidthPx:cardWidth,unclippedHexCodes:true,
  selectedVanilla:true,coverSwatches:5,customHexPersisted:true,
  savedPaletteCover:true,twoDCanvasCovers:await canvasCovers.count(),pageErrors:0}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,errors,stack:error.stack}))
 process.exitCode=1
}finally{await browser?.close().catch(()=>{})}
