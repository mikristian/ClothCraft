/** Real native desktop/browser UI regression for the Library-themed EXO CAD rail. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5781,uiPort=5782
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-cad-library-collapse-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Native exo-session required')
const children=[]
function start(cmd,args,env={}){
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<100;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}
  await sleep(250)
 }
 throw Error('Service unavailable: '+url)
}
let browser
try {
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
 })
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:native,
 })
 await Promise.all([ready(native+'/health'),ready(ui)])
 const opened=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({op:'open',preset:'tshirt'})}).then(response=>response.json())
 assert(opened.ok,'Failed to open a disposable native garment')
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const page=await browser.newPage({viewport:{width:1580,height:1020}})
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=exo-cad-library-collapse-20261027`,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 const layout=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 await layout.selectOption('2d')
 const panel=page.locator('[data-modaris-professional-panels="20261027"]')
 await panel.waitFor({state:'visible',timeout:15000})
 const root2d=page.locator('.cc-embedded-root.cc-embedded-2d')
 const margin=()=>root2d.locator('.cc-embedded-main').evaluate(node=>parseFloat(getComputedStyle(node).marginLeft))
 const expanded=await panel.boundingBox()
 const expandedMargin=await margin()
 assert(expanded.width>=200,'Expanded CAD panel should remain usable')
 assert(expandedMargin>=200,'Expanded CAD panel should reserve canvas width')
 assert.equal(await panel.getByRole('button',{name:'Collapse EXO CAD panel'}).count(),1)
 const tab=panel.getByRole('tab',{name:'Grade'})
 await tab.click()
 assert.equal(await tab.getAttribute('aria-selected'),'true')
 await panel.getByRole('button',{name:'Collapse EXO CAD panel'}).click()
 assert.equal(await root2d.getAttribute('data-exo-cad-collapsed'),'true')
 const collapsed=await panel.boundingBox()
 const collapsedMargin=await margin()
 assert(collapsed.width<=48,`Collapsed CAD width was ${collapsed.width}`)
 assert(collapsedMargin<=48,`Collapsed canvas margin was ${collapsedMargin}`)
 assert.equal(await page.getByRole('navigation',{name:'2D CAD navigator tabs'}).count(),0)
 assert.equal(await panel.getByRole('button',{name:'Expand EXO CAD panel'}).count(),1)
 assert.equal(await page.evaluate(()=>localStorage.getItem('exo.nativeCadInspectorCollapsed.v1')),'true')
 await panel.getByRole('button',{name:'Expand EXO CAD panel'}).click()
 assert.equal(await root2d.getAttribute('data-exo-cad-collapsed'),'false')
 assert((await panel.boundingBox()).width>=200)
 assert((await margin())>=200)
 assert.equal(await panel.getByRole('tab',{name:'Grade'}).getAttribute('aria-selected'),'true',
  'Active inspector section must survive collapse/expand')
 assert.equal(await page.evaluate(()=>localStorage.getItem('exo.nativeCadInspectorCollapsed.v1')),'false')
 const sectionViews=[
  {label:'Geometry tree',selector:'[data-modaris-geometry-navigator="20261027"]'},
  {label:'Hotkeys',selector:'.exo-cad-hotkeys'},
  {label:'Precision',selector:'[data-modaris-precision-inspector="20261027"]'},
 ]
 for(const {label,selector} of sectionViews){
  const nav=page.getByRole('navigation',{name:'2D CAD navigator tabs'})
  await nav.getByRole('button',{name:label,exact:true}).click()
  const section=page.locator(selector)
  await section.waitFor({state:'visible',timeout:10000})
  assert.equal(await nav.getByRole('button',{name:label,exact:true}).getAttribute('aria-pressed'),'true')
  const ink=await section.evaluate(node=>{
   const background=getComputedStyle(node).backgroundColor
   const rgb=background.match(/[\d.]+/g)?.slice(0,3).map(Number)||[]
   return {background,dark:rgb.length===3&&Math.max(...rgb)<110}
  })
  assert(ink.dark,`${label} did not adopt the Library's dark-neutral theme: ${ink.background}`)
  await nav.getByRole('button',{name:'Collapse EXO CAD panel'}).click()
  assert.equal(await root2d.getAttribute('data-exo-cad-collapsed'),'true')
  const mini=page.locator('[data-exo-cad-mini-rail="true"]')
  await mini.getByRole('button',{name:'Expand EXO CAD panel'}).waitFor({state:'visible'})
  assert((await mini.boundingBox()).width<=48,`${label} mini rail is too wide`)
  assert((await margin())<=48,`${label} collapse did not return canvas width`)
  assert.equal(await section.count(),0,`${label} body must be hidden when collapsed`)
  await mini.getByRole('button',{name:'Expand EXO CAD panel'}).click()
  await section.waitFor({state:'visible'})
  assert((await margin())>=200,`${label} expansion did not restore the canvas inset`)
  assert.equal(await page.getByRole('navigation',{name:'2D CAD navigator tabs'})
   .getByRole('button',{name:label,exact:true}).getAttribute('aria-pressed'),'true',
   `${label} tab was not restored`)
 }
 // Preference survives an app reload. The navigation defaults to Properties,
 // but the CAD rail still respects the previously requested collapsed state.
 await page.getByRole('navigation',{name:'2D CAD navigator tabs'})
  .getByRole('button',{name:'Collapse EXO CAD panel'}).click()
 assert.equal(await page.evaluate(()=>localStorage.getItem('exo.nativeCadInspectorCollapsed.v1')),'true')
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 await page.getByRole('combobox',{name:'3D and 2D window arrangement'}).selectOption('2d')
 const restored=page.locator('[data-modaris-professional-panels="20261027"]')
 await restored.getByRole('button',{name:'Expand EXO CAD panel'}).waitFor({state:'visible',timeout:15000})
 assert.equal(await root2d.getAttribute('data-exo-cad-collapsed'),'true')
 await restored.getByRole('button',{name:'Expand EXO CAD panel'}).click()
 assert((await margin())>=200)
 assert.deepEqual(errors,[],'Browser should not throw while collapsing CAD')
 console.log(JSON.stringify({passed:true,nativeRust:true,libraryTheme:true,
  collapsedWidthPx:collapsed.width,expandedWidthPx:expanded.width,
  returnedCanvasWidthPx:Math.round(expandedMargin-collapsedMargin),
  restoresSelectedTab:true,allFourTabsCollapsible:true,
  themedTabs:sectionViews.map(view=>view.label),persistedPreferenceAcrossReload:true,pageErrors:0}))
} finally {
 if(browser)await browser.close()
 for(const child of children){try{process.kill(-child.pid,'SIGTERM')}catch{}}
 await sleep(250)
 rmSync(output,{recursive:true,force:true})
}
