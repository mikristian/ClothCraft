/** Installed EXO: Canvas markers immediately after Midnight and before Canvas tint. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
let browser,page,stage='launch'
const errors=[]
try{
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1650,height:1020}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&testSession=marker-position-20261028',{waitUntil:'domcontentloaded'})
 stage='open 2D appearance'
 await page.getByRole('button',{name:'Open Studio Settings'}).click({timeout:25000})
 await page.getByTestId('settings-tab-theme').click()
 await page.locator('[data-testid="settings-2d-appearance"] .studio-2d-marker-options').waitFor({timeout:12000})
 stage='verify exact order'
 const arrangement=await page.locator('[data-testid="settings-2d-appearance"]').evaluate(section=>{
  const cards=section.querySelector('.studio-2d-theme-options')
  const markers=section.querySelector('.studio-2d-marker-options')
  const tint=[...section.querySelectorAll('*')].find(el=>el.textContent?.trim()==='Canvas tint')
  const nodes=[...section.children]
  return {
    lastCanvasTheme:cards?.lastElementChild?.getAttribute('data-2d-palette-id'),
    markerCount:section.querySelectorAll('.studio-2d-marker-options').length,
    markersFollowCards:markers?.previousElementSibling===cards,
    immediatelyBeforeTint:markers?.nextElementSibling?.contains(tint),
    order:nodes.map(el=>el.className||el.tagName).slice(0,7),
  }
 })
 assert.equal(arrangement.lastCanvasTheme,'midnight')
 assert.equal(arrangement.markerCount,1)
 assert(arrangement.markersFollowCards&&arrangement.immediatelyBeforeTint,'2D markers are misplaced: '+JSON.stringify(arrangement))
 stage='hover preview temporarily changes 2D style'
 const buttons=page.locator('.studio-2d-marker-choices button')
 assert.deepEqual((await buttons.allTextContents()).map(x=>x.trim()),['Dots','Grid lines','None'])
 const before=await page.evaluate(()=>localStorage.getItem('exo.studioCustomization.v1'))
 await buttons.filter({hasText:'None'}).hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset['2dPalettePreview']==='true')
 assert.equal(await page.locator('[data-testid="settings-2d-appearance"]').count(),1)
 const after=await page.evaluate(()=>localStorage.getItem('exo.studioCustomization.v1'))
 assert.equal(after,before,'Hover wrote to the persisted settings')
 await page.getByRole('heading',{name:'Theme & Color Palettes'}).hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset['2dPalettePreview']==='false')
 stage='click saves marker selection'
 await buttons.filter({hasText:'Dots'}).click()
 const applied=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')))
 assert.equal(applied.preferences.twoDGridStyle,'dots')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,realInstalledUI:true,lastTheme:'Midnight',position:'directly above Canvas tint',
  choices:['Dots','Grid lines','None'],hoverDoesNotSave:true,clickDoesSave:true,pageErrors:0}))
}catch(error){console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack,errors}));process.exitCode=1}
finally{await browser?.close().catch(()=>{})}
