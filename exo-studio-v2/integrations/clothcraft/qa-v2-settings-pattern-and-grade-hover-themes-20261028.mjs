/** Real Chrome + native Rust acceptance: hover restores, clicks persist;
 * Pattern UI / Grading Table / Compare Length colors never mutate CAD. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=6053,uiPort=6054
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-settings-color-themes-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Native test session binary is required')
const services=[]
const launch=(command,args,env={})=>{const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});services.push(child)}
async function ready(url){for(let n=0;n<95;n++){try{if((await fetch(url,{signal:AbortSignal.timeout(1300)})).ok)return}catch{}await sleep(220)}throw Error('Server unavailable: '+url)}
let browser,page,stage='boot'
const pageErrors=[]
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0',
 })
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:native,
 })
 await Promise.all([ready(native+'/health'),ready(ui)])
 assert((await (await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({op:'open',preset:'tshirt'})})).json()).ok,'Rust preset open failed')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1660,height:1060}})
 page.on('pageerror',error=>pageErrors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=settings-color-preview-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:25000})
 const layout=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await layout.count())await layout.selectOption('2d')
 stage='open native floating grading widgets'
 await page.getByRole('button',{name:'Open compact movable Grading Table'}).click()
 await page.getByRole('button',{name:'Open compact movable Compare Length'}).click()
 const values=page.locator('[data-exo-grade-bottom-widget="values"]')
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await values.waitFor({state:'visible'})
 await compare.waitFor({state:'visible'})
 const readPrefs=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1'))?.preferences)
 const color=async widget=>widget.locator('.optitex-grading-table table').first().evaluate(el=>getComputedStyle(el).backgroundColor)
 stage='settings section label and pattern preview'
 await page.getByRole('button',{name:'Open Studio Settings'}).click()
 const dialog=page.getByTestId('studio-settings-dialog')
 await dialog.waitFor({state:'visible'})
 assert.equal(await page.getByTestId('settings-tab-workspace').innerText(),'2D Workspace')
 assert(await dialog.getByRole('heading',{name:'2D Workspace',exact:true}).count()>=1)
 stage='Canvas Markers then Pattern UI then Pattern UI outline color palettes'
 const sectionOrder=await page.getByTestId('settings-2d-appearance').evaluate(section=>{
  const markers=section.querySelector('.studio-2d-marker-options')
  const pattern=section.querySelector('.studio-pattern-display-colors')
  const themes=pattern?.querySelector('.studio-area-preset-chooser')
  const outlines=pattern?.querySelector('.studio-pattern-outline-palettes')
  return {markersImmediatelyBeforePattern:markers?.nextElementSibling===pattern,
    themesImmediatelyBeforeOutlines:themes?.nextElementSibling===outlines,
    outlineCount:outlines?.querySelectorAll('button[data-pattern-outline-color]').length,
    themeCount:themes?.querySelectorAll('button[data-area-theme="Pattern UI"]').length,
    themePreviewIconCount:themes?.querySelectorAll('.studio-pattern-theme-cover svg').length,
    themeColorChipCount:themes?.querySelectorAll('.studio-pattern-theme-cover__palette i').length}
 })
 assert.deepEqual(sectionOrder,{markersImmediatelyBeforePattern:true,themesImmediatelyBeforeOutlines:true,
  outlineCount:17,themeCount:44,themePreviewIconCount:44,themeColorChipCount:220})
 const forest=page.locator('[data-area-theme="Pattern UI"][data-area-theme-id="forest"]')
 await forest.scrollIntoViewIfNeeded()
 const originalPattern=await page.locator('.app-shell').evaluate(el=>getComputedStyle(el).getPropertyValue('--exo-2d-pattern-color').trim())
 await forest.hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.style.getPropertyValue('--exo-2d-pattern-color')==='#1f4339')
 assert.equal((await readPrefs()).twoDPatternColor,'auto','Hover must not persist pattern theme')
 await dialog.getByRole('heading',{name:'2D Workspace',exact:true}).first().hover()
 await page.waitForFunction(original=>getComputedStyle(document.querySelector('.app-shell')).getPropertyValue('--exo-2d-pattern-color').trim()===original,originalPattern)
 await forest.click()
 assert.equal((await readPrefs()).twoDPatternUiTheme,'forest')
 assert.equal((await readPrefs()).twoDPatternColor,'#1f4339')
 stage='Grading Table hover and commit independently'
 const night=page.locator('[data-area-theme="Grading Table"][data-area-theme-id="night"]')
 await night.scrollIntoViewIfNeeded()
 const initialValues=await color(values)
 await night.hover()
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="values"]')?.dataset.exoMeasureTheme==='night')
 assert.equal(await values.getAttribute('data-exo-measure-theme'),'night')
 assert.notEqual(await color(values),initialValues,'Floating Grading Table must visibly change on hover')
 assert.equal((await readPrefs()).gradeTableColorTheme,'paper','Hover must not save table theme')
 await dialog.getByRole('heading',{name:'2D Workspace',exact:true}).first().hover()
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="values"]')?.dataset.exoMeasureTheme==='paper')
 assert.equal(await color(values),initialValues,'Leaving must restore original grading table background')
 const navy=page.locator('[data-area-theme="Grading Table"][data-area-theme-id="navy"]')
 await navy.click()
 assert.equal((await readPrefs()).gradeTableColorTheme,'navy')
 stage='Compare Length hover + persistent independent choice'
 const rose=page.locator('[data-area-theme="Compare Length"][data-area-theme-id="rose"]')
 await rose.scrollIntoViewIfNeeded()
 const initialCompare=await color(compare)
 await rose.hover()
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="compare"]')?.dataset.exoMeasureTheme==='rose')
 assert.notEqual(await color(compare),initialCompare,'Compare Length must preview while floating')
 assert.equal(await values.getAttribute('data-exo-measure-theme'),'navy','Compare Length cannot recolor Grading Table')
 assert.equal((await readPrefs()).compareLengthColorTheme,'paper','Compare hover must not save')
 await rose.click()
 assert.equal((await readPrefs()).compareLengthColorTheme,'rose')
 assert.equal(await values.getAttribute('data-exo-measure-theme'),'navy')
 await page.getByTestId('studio-settings-apply').click()
 await page.getByRole('button',{name:'Open Studio Settings'}).click()
 assert(await page.locator('[data-area-theme="Grading Table"][data-area-theme-id="navy"]').getAttribute('aria-pressed')==='true')
 assert(await page.locator('[data-area-theme="Compare Length"][data-area-theme-id="rose"]').getAttribute('aria-pressed')==='true')
 assert(await page.locator('[data-area-theme="Pattern UI"][data-area-theme-id="forest"]').getAttribute('aria-pressed')==='true')
 stage='Outline palette live-hover changes only edge appearance'
 const visibleOutline=()=>page.evaluate(()=>{
  const board=document.querySelector('.cc-board')
  const edge=board?.querySelector('[data-2d-pattern-piece][data-2d-pattern-selected="false"] polyline[data-active-curve-edge="false"][data-cutline-hover-blue="false"]:not([data-2d-edge-hit])')
  return {adaptiveEdge:board?getComputedStyle(board).getPropertyValue('--cad-adaptive-edge').trim():null,
   visibleStroke:edge?getComputedStyle(edge).stroke:null}
 })
 const outlineBefore=await visibleOutline()
 const edgeBefore=await page.locator('.app-shell').evaluate(el=>getComputedStyle(el).getPropertyValue('--exo-2d-edge-color').trim())
 const paperBefore=await page.locator('.app-shell').evaluate(el=>el.style.getPropertyValue('--exo-2d-pattern-color').trim())
 const prefsBefore=await readPrefs()
 const redOutline=page.locator('[data-pattern-outline-color="red"]')
 await redOutline.scrollIntoViewIfNeeded()
 await redOutline.hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.style.getPropertyValue('--exo-2d-edge-color')==='#d95360')
 const outlineDuring=await visibleOutline()
 assert(outlineDuring.adaptiveEdge&&outlineDuring.adaptiveEdge!==outlineBefore.adaptiveEdge,
  'Hover must recolor the actual native 2D drafting outline, not just the settings swatch: '+JSON.stringify({outlineBefore,outlineDuring}))
 assert.equal(await page.locator('.app-shell').evaluate(el=>el.getAttribute('data-2d-edge-custom')),'true')
 assert.equal(await page.locator('.app-shell').evaluate(el=>el.style.getPropertyValue('--exo-2d-pattern-color').trim()),paperBefore,'Outline hover must not change selected pattern paper CSS')
 assert.deepEqual(await readPrefs(),prefsBefore,'Hover cannot modify any persisted pattern or chart preference')
 await dialog.getByRole('heading',{name:'2D Workspace',exact:true}).first().hover()
 await page.waitForFunction(old=>getComputedStyle(document.querySelector('.app-shell')).getPropertyValue('--exo-2d-edge-color').trim()===old,edgeBefore)
 assert.equal((await visibleOutline()).adaptiveEdge,outlineBefore.adaptiveEdge,
  'Native 2D outline must restore after leaving swatch')
 assert.deepEqual(await readPrefs(),prefsBefore,'Leaving the palette must not save an outline color')
 const royal=page.locator('[data-pattern-outline-color="royal"]')
 await royal.click()
 const prefsAfter=await readPrefs()
 assert.equal(prefsAfter.twoDEdgeColor,'#4169df')
 assert.equal(prefsAfter.twoDPatternUiTheme,'custom')
 for(const key of ['twoDPatternColor','twoDPointColor','twoDSelectionColor','twoDNotchColor'])
  assert.equal(prefsAfter[key],prefsBefore[key],`Outline choice must preserve ${key}`)
 assert.equal(await royal.getAttribute('aria-pressed'),'true')
 const automaticOutline=page.locator('[data-pattern-outline-color="auto"]')
 await automaticOutline.hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset['2dEdgeCustom']==='false')
 assert.equal((await readPrefs()).twoDEdgeColor,'#4169df','Automatic hover must not overwrite chosen Royal Blue')
 await dialog.getByRole('heading',{name:'2D Workspace',exact:true}).first().hover()
 await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset['2dEdgeCustom']==='true')
 stage='Theme tab uses the same hover preview contract'
 await page.getByTestId('settings-tab-theme').click()
 assert.equal(await page.locator('[data-area-theme="Pattern UI"]').count(),44)
 assert.equal(await page.locator('[data-pattern-outline-color]').count(),17)
 assert.equal(await page.locator('[data-area-theme="Grading Table"]').count(),80)
 assert.equal(await page.locator('[data-area-theme="Compare Length"]').count(),80)
 const graphite=page.locator('[data-area-theme="Compare Length"][data-area-theme-id="graphite"]')
 await graphite.scrollIntoViewIfNeeded()
 await graphite.hover()
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="compare"]')?.dataset.exoMeasureTheme==='graphite')
 assert.equal((await readPrefs()).compareLengthColorTheme,'rose','Theme-tab hover cannot overwrite the saved selection')
 await page.getByTestId('settings-tab-workspace').click()
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="compare"]')?.dataset.exoMeasureTheme==='rose')
 stage='docked and floating measurement widgets use the identical chosen colors'
 await page.getByTestId('studio-settings-apply').click()
 await values.getByRole('combobox',{name:'Grading Table placement'}).selectOption('inner-bottom')
 await compare.getByRole('combobox',{name:'Compare Length placement'}).selectOption('bottom')
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="values"]')?.dataset.docked==='true'
   &&document.querySelector('[data-exo-grade-bottom-widget="compare"]')?.dataset.docked==='true')
 assert.equal(await values.getAttribute('data-exo-measure-theme'),'navy')
 assert.equal(await compare.getAttribute('data-exo-measure-theme'),'rose')
 assert.notEqual(await color(values),await color(compare),'Independent themes must survive docking')
 stage='44 Pattern UI presets, native glass and transparent outline hover preview'
 await page.getByRole('button',{name:'Open Studio Settings'}).click()
 await page.getByTestId('settings-tab-workspace').click()
 const board=page.locator('.cc-board')
 const surface=board.locator('[data-pattern-surface="drafting-paper"][data-pattern-outline-valid="true"]').first()
 await surface.waitFor({state:'attached'})
 const initialRevision=await board.getAttribute('data-document-revision')
 const previousTheme=await readPrefs()
 const filter=async name=>page.locator(`[data-pattern-theme-filter="${name}"]`).first().click()
 const mode=()=>board.getAttribute('data-pattern-surface-style')
 await filter('glass')
 assert.equal(await page.locator('[data-area-theme="Pattern UI"]').count(),6)
 const iceGlass=page.locator('[data-area-theme-id="glass-ice"]')
 await iceGlass.hover()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.patternSurfaceStyle==='glass')
 assert.equal(await mode(),'glass')
 assert.equal(await board.locator('[data-pattern-surface-glass="true"]').count()>0,true,'Native glass highlight must actually render on the garment pattern')
 const glassFill=await surface.evaluate(el=>getComputedStyle(el).fill)
 assert(/color\(|rgba\(/.test(glassFill),`Glass pattern paper must be rendered as a translucent paint: ${glassFill}`)
 assert.equal((await readPrefs()).twoDPatternSurfaceStyle,previousTheme.twoDPatternSurfaceStyle,'Glass hover cannot persist')
 await page.getByTestId('settings-tab-theme').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.patternSurfaceStyle==='solid')
 assert.equal(await board.getAttribute('data-document-revision'),initialRevision,'Glass preview must not edit native CAD')
 await page.getByTestId('settings-tab-workspace').click()
 await filter('outline')
 assert.equal(await page.locator('[data-area-theme="Pattern UI"]').count(),8)
 const violetOutline=page.locator('[data-area-theme-id="outline-purple"]')
 await violetOutline.hover()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.patternSurfaceStyle==='outline')
 const outlinedPaper=await surface.evaluate(el=>({fill:getComputedStyle(el).fill,opacity:getComputedStyle(el).fillOpacity,pointer:getComputedStyle(el).pointerEvents}))
 assert.equal(Number(outlinedPaper.opacity),0,'Outlines Only must remove visible pattern fill: '+JSON.stringify(outlinedPaper))
 assert.equal(outlinedPaper.pointer.toLowerCase(),'visiblefill','Outlines Only must retain authored pattern hit targets')
 assert.equal(await board.locator('[data-pattern-surface-glass]').count(),0,'Outlines Only must not render glass overlays')
 assert.equal((await readPrefs()).twoDPatternSurfaceStyle,previousTheme.twoDPatternSurfaceStyle,'Outline hover cannot persist')
 await violetOutline.click()
 assert.equal((await readPrefs()).twoDPatternUiTheme,'outline-purple')
 assert.equal((await readPrefs()).twoDPatternSurfaceStyle,'outline')
 assert.equal(await board.getAttribute('data-document-revision'),initialRevision,'Selecting a view theme cannot edit geometry')
 await filter('glass')
 await page.locator('[data-area-theme-id="glass-frost"]').click()
 assert.equal((await readPrefs()).twoDPatternUiTheme,'glass-frost')
 assert.equal((await readPrefs()).twoDPatternSurfaceStyle,'glass')
 assert.equal(await mode(),'glass')
 await page.getByTestId('studio-settings-apply').click()
 await page.getByRole('button',{name:'Open Studio Settings'}).click()
 await page.getByTestId('settings-tab-workspace').click()
 await filter('glass')
 assert.equal(await page.locator('[data-area-theme-id="glass-frost"]').getAttribute('aria-pressed'),'true')
 assert.equal(await board.getAttribute('data-document-revision'),initialRevision)
 stage='80 independent grading and length chart palettes, filter, hover, apply'
 assert.equal(await page.locator('[data-area-theme="Grading Table"]').count(),80)
 assert.equal(await page.locator('[data-area-theme="Compare Length"]').count(),80)
 await page.locator('[data-chart-theme-filter="Grading Table-night"]').click()
 assert.equal(await page.locator('[data-area-theme="Grading Table"]').count(),18)
 const newTable=page.locator('[data-area-theme="Grading Table"][data-area-theme-id="sapphire-night"]')
 await newTable.scrollIntoViewIfNeeded()
 const tablePreviousColor=await color(values)
 await newTable.hover()
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="values"]')?.dataset.exoMeasureTheme==='sapphire-night')
 assert.notEqual(await color(values),tablePreviousColor,'Generated night palette must affect the real Grading Table')
 assert.equal((await readPrefs()).gradeTableColorTheme,'navy','Hover cannot commit a chart palette')
 await newTable.click()
 assert.equal((await readPrefs()).gradeTableColorTheme,'sapphire-night')
 assert.equal(await compare.getAttribute('data-exo-measure-theme'),'rose','Grading Table themes must not change Compare Length')
 await page.locator('[data-chart-theme-filter="Compare Length-soft"]').click()
 assert.equal(await page.locator('[data-area-theme="Compare Length"]').count(),18)
 const newLength=page.locator('[data-area-theme="Compare Length"][data-area-theme-id="fuchsia-soft"]')
 await newLength.scrollIntoViewIfNeeded()
 const lengthPreviousColor=await color(compare)
 await newLength.hover()
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="compare"]')?.dataset.exoMeasureTheme==='fuchsia-soft')
 assert.notEqual(await color(compare),lengthPreviousColor,'Generated soft palette must affect the real Compare Length chart')
 assert.equal((await readPrefs()).compareLengthColorTheme,'rose','Hover cannot commit Compare Length palette')
 await newLength.click()
 assert.equal((await readPrefs()).compareLengthColorTheme,'fuchsia-soft')
 assert.equal(await values.getAttribute('data-exo-measure-theme'),'sapphire-night')
 await page.getByTestId('studio-settings-apply').click()
 await page.getByRole('button',{name:'Open Studio Settings'}).click()
 assert.equal((await readPrefs()).gradeTableColorTheme,'sapphire-night')
 assert.equal((await readPrefs()).compareLengthColorTheme,'fuchsia-soft')
 assert.deepEqual(pageErrors,[],'No JS page errors')
 console.log(JSON.stringify({passed:true,realChrome:true,realRust:true,workspaceLabel:'2D Workspace',
  patternHoverRestored:true,chartHoverRestored:true,independentChartThemes:true,
  savedPattern:'forest',savedGradeTable:'navy',savedCompare:'rose',
  floatingTablesRecolored:true,dockedTablesRecolored:true,themeTabHover:true,
  immediateCanvasPatternOutlineOrdering:true,patternThemeIconCards:8,outlinePaletteOptions:17,
  outlineHoverRestoresWithoutSave:true,outlineClickPersists:'royal',otherPatternColorsPreserved:true,
  patternThemeCount:44,solidThemes:30,glassThemes:6,outlineThemes:8,liveGlassOverlay:true,
  liveOutlineTransparent:true,previewDoesNotChangeCadRevision:true,glassSelectionPersists:true,
  gradeTablePaletteCount:80,compareLengthPaletteCount:80,chartThemeFiltering:true,
  generatedChartPreviewsAndIndependentPersistence:true,pageErrors:0}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack,pageErrors}))
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of services)try{process.kill(-child.pid,'SIGTERM')}catch{}
 await sleep(250)
 for(const child of services)try{process.kill(-child.pid,'SIGKILL')}catch{}
 rmSync(output,{recursive:true,force:true})
}
