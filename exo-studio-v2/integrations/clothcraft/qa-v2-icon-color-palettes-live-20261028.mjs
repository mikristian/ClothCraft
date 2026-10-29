/** Installed-EXO browser acceptance for compact palettes and per-icon inks. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const endpoint='http://127.0.0.1:5386'
const errors=[]
let browser,page,stage='start'
const fixture={version:1,appearance:{theme:'pure-white-light',panelFinish:'balanced'},workspace:{
 viewportLayout:'split',
 customToolbars:[{id:'test-custom-nest',name:'Nest Studio Custom',dock:'floating',
  visible:true,columns:1,orientation:'horizontal',finish:'glass',color:'#acbdca',
  savedSourceId:'saved-live-nest-test',tools:['exo:grade-nest-xs-xxl'],x:180,y:155}],
 savedToolbarLibrary:[{id:'saved-live-nest-test',name:'Test Saved Nest',visible:false,
  columns:1,orientation:'horizontal',dock:'floating',color:'#acbdca',finish:'glass',
  tools:['exo:grade-nest-xs-xxl']}],
}}
const peek=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')))
const computedIcon=async selector=>page.locator(selector).first().evaluate(element=>{
 const icon=element.querySelector('.cad-tool-icon-mask, svg')
 return icon?getComputedStyle(icon).color:null
})
try{
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1700,height:1060}})
 await context.addInitScript(value=>{
  if(location.host!=='127.0.0.1:5386'||sessionStorage.getItem('exo-icon-colors-seeded'))return
  localStorage.setItem('exo.studioCustomization.v1',JSON.stringify(value))
  sessionStorage.setItem('exo-icon-colors-seeded','yes')
 },fixture)
 page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 stage='load Settings Theme'
 await page.goto(endpoint+'/?desktop=1&engine=clothcraft&testSession=icon-color-palettes-20261028',{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Open Studio Settings'}).click({timeout:25000})
 await page.getByTestId('settings-tab-theme').click()
 await page.locator('[data-theme-id="pure-white-light"]').waitFor({timeout:10000})
 stage='compact palette gallery and light pink theme'
 assert.equal(await page.locator('.studio-theme-gallery [data-theme-id]').count(),170)
 const box=await page.locator('[data-theme-id="pure-white-light"]').boundingBox()
 assert(box.width<=145,'Palette thumbnails are still oversized: '+box.width)
 await page.locator('[data-theme-id="ballet-pink-light"]').click()
 assert.equal((await peek()).appearance.theme,'ballet-pink-light')
 stage='global icon color preview does not persist'
 const iconButton=page.getByRole('button',{name:'Preview and apply Pink icon color'})
 await iconButton.hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.iconColorPreview==='true')
 const hoverColor=await computedIcon('.tool-rail [data-clo-slot="3d:A01"]')
 assert.equal(hoverColor,'rgb(245, 139, 189)','3D toolbar did not preview Pink on hover')
 assert.equal((await peek()).appearance.globalToolbarIconColor,'auto','Hover incorrectly saved global color')
 await page.getByRole('button',{name:'Preview and apply Sky icon color'}).hover()
 assert.equal(await computedIcon('.tool-rail [data-clo-slot="3d:A01"]'),'rgb(106, 185, 250)')
 await iconButton.click()
 assert.equal((await peek()).appearance.globalToolbarIconColor,'#f58bbd')
 stage='custom palette creator and persistence'
 await page.getByRole('textbox',{name:'Custom color palette name'}).fill('Pink Studio QA')
 await page.getByRole('button',{name:'Save palette',exact:true}).click()
 assert((await page.locator('.studio-custom-palette-card').allTextContents()).some(s=>s.includes('Pink Studio QA')))
 await page.locator('.studio-custom-palette-card').filter({hasText:'Pink Studio QA'}).getByRole('button',{name:'Apply'}).click()
 const applied=await peek()
 assert.equal(applied.appearance.panelLibraryColor,'#f8e8ed')
 assert.equal(applied.appearance.globalToolbarIconColor,'#ad6b89')
 stage='live custom toolbar icon editor and catalog dropdown'
 await page.getByTestId('settings-tab-customToolbar').click()
 const builder=page.getByTestId('visual-toolbar-builder')
 const expand=builder.getByRole('button',{name:'Browse tools ▾'})
 await expand.waitFor({state:'visible'})
 assert.equal(await builder.locator('.exo-builder-tool-grid button').count(),0,'Tool catalog must start collapsed')
 await expand.click()
 assert.equal(await builder.locator('.exo-builder-tool-grid button').count(),24)
 await builder.getByRole('button',{name:/Show 24 more tools/}).click()
 assert.equal(await builder.locator('.exo-builder-tool-grid button').count(),48)
 await builder.getByRole('button',{name:'Collapse tool catalog'}).click()
 assert.equal(await builder.locator('.exo-builder-tool-grid button').count(),0)
 stage='native 3D individual button color'
 const native=builder.getByTestId('live-toolbar-icon-library')
 await native.locator('[data-live-tool-id="3d:A01"]').click()
 await native.getByRole('button',{name:'Set selected icon to Cobalt'}).click()
 assert.equal((await peek()).workspace.nativeToolIconColors['3d:A01'],'#487af5')
 assert.equal(await computedIcon('.tool-rail [data-clo-slot="3d:A01"]'),'rgb(72, 122, 245)')
 stage='native 2D and 2D workspace per icon color'
 await native.getByRole('button',{name:'2D tools · Right'}).click()
 await native.locator('[data-live-tool-id="2d:A01"]').click()
 await native.getByRole('button',{name:'Set selected icon to Rose'}).click()
 await native.getByRole('button',{name:'2D workspace · Pattern Design'}).click()
 await native.locator('[data-live-tool-id="pattern:select"]').click()
 await native.getByRole('button',{name:'Set selected icon to Mint'}).click()
 const nativeSaved=(await peek()).workspace.nativeToolIconColors
 assert.equal(nativeSaved['2d:A01'],'#e76d96')
 assert.equal(nativeSaved['pattern:select'],'#74d8ac')
 stage='saved toolbar icon editor propagates to active toolbar'
 const saved=builder.locator('[data-saved-toolbar="saved-live-nest-test"]')
 await saved.getByRole('button',{name:/Edit Test Saved Nest icon/}).click()
 await saved.getByRole('textbox',{name:'Test Saved Nest selected icon color'}).count().catch(()=>{}) 
 const colorInput=saved.locator('input[type="color"][aria-label="Test Saved Nest selected icon color"]')
 await colorInput.fill('#34b9e6')
 const savedState=await peek()
 assert.equal(savedState.workspace.savedToolbarLibrary.find(v=>v.id==='saved-live-nest-test').iconColors['exo:grade-nest-xs-xxl'],'#34b9e6')
 assert.equal(savedState.workspace.customToolbars.find(v=>v.id==='test-custom-nest').iconColors['exo:grade-nest-xs-xxl'],'#34b9e6')
 stage='reload persistence'
 await page.reload({waitUntil:'domcontentloaded'})
 const after=await peek()
 assert.equal(after.workspace.nativeToolIconColors['3d:A01'],'#487af5')
 assert.equal(after.workspace.nativeToolIconColors['pattern:select'],'#74d8ac')
 assert.equal(after.workspace.customToolbars[0].iconColors['exo:grade-nest-xs-xxl'],'#34b9e6')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,installedUI:true,paletteCount:170,thumbnailWidth:box.width,
  iconHoverTemporary:true,globalIconClick:true,pinkTheme:true,customPaletteSaved:true,
  toolCatalogProgressive:true,native3dAnd2dAndPatternColors:true,
  savedToolbarLiveColor:true,roundTrip:true,runtimeErrors:0}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,errors,stack:error.stack}))
 process.exitCode=1
}finally{await browser?.close().catch(()=>{})}
