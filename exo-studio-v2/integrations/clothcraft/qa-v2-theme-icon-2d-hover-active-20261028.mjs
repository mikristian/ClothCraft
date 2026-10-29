/** Real installed EXO: complete icon hover, 2D palette hover, editable active. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const source='http://127.0.0.1:5386'
const errors=[]
let browser,page,stage='launch'
const fixture={version:1,appearance:{theme:'pure-white-light',panelFinish:'balanced',
  globalToolbarIconColor:'auto'},workspace:{viewportLayout:'split',objectBrowserVisible:true},
 preferences:{twoDCanvasTheme:'classic',twoDCanvasColor:'#a1b2c3',twoDGridColor:'#c4b3a2',twoDGridStyle:'dots'}}
const saved=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')))
const preview=async()=>page.evaluate(()=>{
 const el=document.querySelector('.app-shell')
 const styles=getComputedStyle(el)
 return {
  icon:el.dataset.iconColorPreview,canvas:el.dataset['2dPalettePreview'],
  canvasCss:styles.getPropertyValue('--exo-2d-canvas-color').trim(),
  gridCss:styles.getPropertyValue('--exo-2d-grid-color').trim(),
 }
})
try{
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1770,height:1050}})
 await context.addInitScript(value=>{
  if(location.host!=='127.0.0.1:5386'||sessionStorage.getItem('exo-theme-hover-test'))return
  localStorage.setItem('exo.studioCustomization.v1',JSON.stringify(value))
  sessionStorage.setItem('exo-theme-hover-test','1')
 },fixture)
 page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 stage='open Theme settings'
 await page.goto(source+'/?desktop=1&engine=clothcraft&testSession=full-icon-2d-hover-20261028',{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Open Studio Settings'}).click({timeout:25000})
 await page.getByTestId('settings-tab-theme').click()
 await page.locator('.studio-active-palette-mini[data-active-palette-mini="true"]').waitFor({timeout:10000})
 const mini=page.locator('[data-active-palette-mini]')
 assert.match(await mini.innerText(),/Active/)
 assert.equal(await mini.locator('.studio-active-palette-mini-strips>i').count(),5)
 assert.equal(await mini.locator('.studio-active-palette-mini-status>i').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(51, 183, 107)')
 stage='all-icons globally preview Pink'
 const pink=page.getByRole('button',{name:'Preview and apply Pink icon color'})
 await pink.hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.iconColorPreview==='true')
 const coverage=await page.evaluate(()=>{
  const icons=Array.from(document.querySelectorAll('.app-shell button svg,.app-shell [role=button] svg,.app-shell button .cad-tool-icon-mask,.app-shell [role=button] .cad-tool-icon-mask'))
  const misses=icons.filter(el=>getComputedStyle(el).color!=='rgb(245, 139, 189)')
  return {icons:icons.length,covered:icons.length-misses.length,misses:misses.slice(0,12).map(el=>({
   icon:el.getAttribute('class'),color:getComputedStyle(el).color,
   parent:el.closest('button,[role=button]')?.getAttribute('aria-label')||
    el.closest('button,[role=button]')?.getAttribute('title')||
    el.parentElement?.className,
  }))}
 })
 console.log(JSON.stringify({stage:'hover-coverage',coverage}))
 assert(coverage.icons>30,'Not enough rendered UI icons for meaningful hover check')
 assert.equal(coverage.covered,coverage.icons,'Some interactive icons ignored global color hover')
 assert.equal((await saved()).appearance.globalToolbarIconColor,'auto','Hover persisted a global icon color')
 stage='all icon hover restores original theme'
 await page.getByRole('heading',{name:'Theme & Color Palettes'}).hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.iconColorPreview==='false')
 const afterRestore=await page.evaluate(()=>[...document.querySelectorAll('.app-shell button svg')].some(el=>getComputedStyle(el).color!=='rgb(245, 139, 189)'))
 assert(afterRestore,'Leaving icon hover failed to restore previous colors')
 stage='2D palette directly below icon colors'
 const sectionOrder=await page.locator('#studio-theme-custom-palettes,#studio-theme-presets,#studio-theme-icon-colors,#studio-theme-2d-pattern').evaluateAll(items=>items.map(el=>el.id))
 assert.deepEqual(sectionOrder,['studio-theme-custom-palettes','studio-theme-presets','studio-theme-icon-colors','studio-theme-2d-pattern'])
 stage='2D palette hover preview no persistence'
 await page.locator('[data-2d-palette-id="ochre"]').hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset['2dPalettePreview']==='true')
 const live2d=await preview()
 assert.equal(live2d.canvasCss,'#b48c43','2D canvas color not visually previewed')
 assert.equal(live2d.gridCss,'#f4dfaa','2D grid marker color not previewed')
 assert.equal((await saved()).preferences.twoDCanvasColor,'#a1b2c3','Hover changed saved 2D canvas color')
 assert.equal((await saved()).preferences.twoDGridColor,'#c4b3a2','Hover changed saved 2D grid color')
 stage='2D preview restores after pointer leaves'
 await page.getByRole('heading',{name:'Theme & Color Palettes'}).hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset['2dPalettePreview']==='false')
 const restored2d=await preview()
 assert.notEqual(restored2d.canvasCss,'#b48c43')
 assert.equal((await saved()).preferences.twoDCanvasColor,'#a1b2c3')
 stage='2D click commits color'
 await page.locator('[data-2d-palette-id="ochre"]').click()
 assert.equal((await saved()).preferences.twoDCanvasColor,'#b48c43')
 assert.equal((await saved()).preferences.twoDGridColor,'#f4dfaa')
 stage='active palette editing'
 await page.locator('input[type="color"][aria-label="Edit active sidebar color"]').fill('#f1c2e7')
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1'))?.appearance?.panelLibraryColor==='#f1c2e7')
 const applied=await saved()
 assert.equal(applied.appearance.leftRailColor,'#f1c2e7')
 assert.equal(applied.appearance.rightRailColor,'#f1c2e7')
 assert.equal(await page.locator('.studio-active-palette-edit-well').count(),5)
 const miniSwatch=await mini.locator('.studio-active-palette-mini-strips>i').first().evaluate(el=>getComputedStyle(el).backgroundColor)
 assert.equal(miniSwatch,'rgb(241, 194, 231)')
 stage='active palette edit survives reload'
 await page.reload({waitUntil:'domcontentloaded'})
 assert.equal((await saved()).appearance.panelLibraryColor,'#f1c2e7')
 assert.equal((await saved()).preferences.twoDCanvasColor,'#b48c43')
 stage='2D workspace all-icon hover coverage'
 await page.evaluate(()=>{
  const next=JSON.parse(localStorage.getItem('exo.studioCustomization.v1'))
  next.workspace.viewportLayout='2d'
  localStorage.setItem('exo.studioCustomization.v1',JSON.stringify(next))
 })
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Open Studio Settings'}).click({timeout:25000})
 await page.getByTestId('settings-tab-theme').click()
 await page.getByRole('button',{name:'Preview and apply Sky icon color'}).hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.iconColorPreview==='true')
 const twoDCoverage=await page.evaluate(()=>{
  const icons=[...document.querySelectorAll('.app-shell button svg,.app-shell button .cad-tool-icon-mask')]
  return {count:icons.length,covered:icons.filter(el=>getComputedStyle(el).color==='rgb(106, 185, 250)').length}
 })
 assert(twoDCoverage.count>20,'Missing 2D UI icons for second coverage check')
 assert.equal(twoDCoverage.covered,twoDCoverage.count,'2D workspace has icons outside global hover preview')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,installedUI:true,
  fullIconHoverCoverage:coverage.covered,iconCount:coverage.icons,
  twoDIconsCovered:twoDCoverage.covered,twoDIconCount:twoDCoverage.count,
  globalHoverRestored:true,orderedTwoDPalette:true,
  twoDHoverTemporary:true,twoDClickSaved:true,
  activePaletteEditable:true,miniActiveIndicator:true,
  reloadPersistence:true,pageErrors:0}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,pageErrors:errors,stack:error.stack}))
 process.exitCode=1
}finally{await browser?.close().catch(()=>{})}
