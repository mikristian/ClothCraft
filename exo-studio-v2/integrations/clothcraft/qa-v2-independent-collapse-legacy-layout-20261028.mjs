/** Regression: actual legacy persisted universal-collapse + native App arrows.
 * One browser, isolated test contexts; never edits the user's own settings. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const APP='http://127.0.0.1:5386'
const cases=[
 {name:'legacy-right-collapsed',universal:true,inspectorSide:'right',librarySide:'left'},
 {name:'legacy-right-clean',universal:false,inspectorSide:'right',librarySide:'left'},
 {name:'legacy-right-shared-library',universal:true,inspectorSide:'right',librarySide:'right'},
]
const errors=[]
let browser,stage='launch'
const state=page=>page.locator('.main-layout').evaluate(root=>{
 const inspector=root.querySelector(':scope>.clo-inspector')
 const toolbar=inspector?.querySelector('.clo-right-tool-palette')
 const content=inspector?.querySelector('.clo-inspector-content')
 const canSee=el=>!!(el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>1&&el.getBoundingClientRect().height>1)
 const rightArrow=root.querySelector(':scope>.exo-right-independent-tools-arrow')
 const browserArrow=root.querySelector(':scope>.exo-reopen-inspector-arrow')
 const hit=el=>{
   if(!el||!canSee(el))return false
   const r=el.getBoundingClientRect(),other=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)
   return el===other||el.contains(other)
 }
 return {
  inspector:root.dataset.inspectorVisible,
  tools:root.dataset.rightToolsCollapsed,
  legacy:root.dataset.exoInspectorCollapsed,
  hidden:inspector?.hidden,
  inspectorWidth:inspector?.getBoundingClientRect().width||0,
  toolbarWidth:toolbar?.getBoundingClientRect().width||0,
  toolbarVisible:canSee(toolbar),contentVisible:canSee(content),
  arrowToolsHit:hit(rightArrow),arrowBrowserHit:hit(browserArrow),
  native2dCadCollapsed:root.querySelector('.cc-embedded-2d')?.dataset.exoCadCollapsed,
  restoredButtons:[...root.querySelectorAll('[aria-label="Expand Object Browser and Property Editor panel"]')].length,
 }
})
const assertState=(s,inspector,tools,stage)=>{
 assert.equal(s.inspector,inspector?'true':'false',stage+': Inspector flag mismatch '+JSON.stringify(s))
 assert.equal(s.tools,tools?'false':'true',stage+': Tools flag mismatch '+JSON.stringify(s))
 assert.equal(s.toolbarVisible,tools,stage+': Native tool palette visibility mismatch '+JSON.stringify(s))
 assert.equal(s.contentVisible,inspector,stage+': Browser+Property content visibility mismatch '+JSON.stringify(s))
 assert.equal(s.hidden,!inspector&&!tools,stage+': Shared panel hidden predicate wrong '+JSON.stringify(s))
 assert.equal(s.legacy,'false',stage+': Old universal collapse flag still active '+JSON.stringify(s))
 if(tools&&!inspector)assert(s.inspectorWidth>50,stage+': Visible toolbar was clipped '+JSON.stringify(s))
 if(!tools&&!inspector)assert(s.inspectorWidth<3,stage+': Both closed still reserve dead space '+JSON.stringify(s))
 assert(s.arrowToolsHit,stage+': Toolbar arrow does not receive actual pointer clicks '+JSON.stringify(s))
 if(!inspector)assert(s.arrowBrowserHit,stage+': Browser arrow does not receive actual pointer clicks '+JSON.stringify(s))
}
try{
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 for(const example of cases){
  const context=await browser.newContext({viewport:{width:1680,height:1010}})
  await context.addInitScript(s=>{
   if(location.host!=='127.0.0.1:5386'||sessionStorage.getItem('exo-collapse-test-seeded'))return
   localStorage.setItem('exo.universal-panel-floating.v8',JSON.stringify({
    layoutVersion:8,sidePanels:{library:s.librarySide,inspector:s.inspectorSide},
    sideCollapsed:{library:false,inspector:s.universal},
    horizontalRows:2,ribbonScope:'board',
   }))
   sessionStorage.setItem('exo-collapse-test-seeded','yes')
  },example)
  const page=await context.newPage()
  page.on('pageerror',e=>errors.push(example.name+': '+e.message))
  try{
   stage=example.name+': initial saved state'
   await page.goto(APP+'/?desktop=1&engine=clothcraft&testSession=collapse-'+example.name,{waitUntil:'domcontentloaded'})
   await page.locator('.main-layout .clo-inspector').waitFor({state:'attached',timeout:22000})
   await page.waitForFunction(()=>document.querySelector('.main-layout')?.dataset.exoInspectorCollapsed)
   let s=await state(page)
   assertState(s,true,true,stage)
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.universal-panel-floating.v8')))
   assert.equal(stored.sideCollapsed.inspector,false,example.name+': Legacy collapsed preference not migrated')
   const combo=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
   stage=example.name+': enter 2D'
   await combo.selectOption('2d')
   await page.waitForFunction(()=>document.querySelector('.main-layout')?.dataset.patternWorkspace==='true')
   await page.waitForTimeout(150)
   s=await state(page)
   assertState(s,false,true,stage)
   assert.equal(s.native2dCadCollapsed,'true','Native 2D CAD editor does not default collapsed')
   // Exercise the actual original App close/reopen arrows four times, never
   // force-click or trigger React events artificially.
   for(let n=0;n<4;n++){
    stage=example.name+': cycle '+n+' open browser'
    await page.getByRole('button',{name:'Expand Object Browser and Property Editor panel'}).first().click()
    assertState(await state(page),true,true,stage)
    stage=example.name+': cycle '+n+' collapse only browser'
    await page.getByRole('button',{name:'Collapse Object Browser and Property Editor panel'}).first().click()
    assertState(await state(page),false,true,stage)
    stage=example.name+': cycle '+n+' close tools too'
    await page.getByRole('button',{name:'Collapse right tools toolbar'}).click()
    assertState(await state(page),false,false,stage)
    stage=example.name+': cycle '+n+' reopen only tools'
    await page.getByRole('button',{name:'Expand right tools toolbar'}).click()
    assertState(await state(page),false,true,stage)
   }
   stage=example.name+': independent toolbar-only collapse'
   await page.getByRole('button',{name:'Expand Object Browser and Property Editor panel'}).first().click()
   await page.getByRole('button',{name:'Collapse right tools toolbar'}).click()
   assertState(await state(page),true,false,stage)
   stage=example.name+': independent toolbar reopen'
   await page.getByRole('button',{name:'Expand right tools toolbar'}).click()
   assertState(await state(page),true,true,stage)
   stage=example.name+': context-menu browser collapse (App state)'
   await page.locator('.clo-object-browser').first().click({button:'right',position:{x:20,y:30}})
   await page.getByRole('menuitem',{name:'Collapse panel'}).click()
   assertState(await state(page),false,true,stage)
   stage=example.name+': split->2D re-entry'
   await combo.selectOption('split')
   await combo.selectOption('2d')
   await page.waitForTimeout(120)
   assertState(await state(page),false,true,stage)
   console.log(JSON.stringify({scenario:example.name,passed:true,cycles:4,
    tested:['legacy-migration','enter2D','browser-collapse','close-all','restore-only-tools','native-editor-independent','universal-context-collapse','reenter2D']}))
  }finally{await context.close()}
 }
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,realInstalledEXO:true,
  scenarios:cases.length,collapseReopenCycles:cases.length*4,
  legacyPersistedFlagsMigrated:true,independentArrows:true,
  independentContextCollapse:true,entry2dResetsOnlyInspector:true,pageErrors:0}))
}catch(e){
 console.error(JSON.stringify({passed:false,stage,error:e.message,errors,stack:e.stack}))
 process.exitCode=1
}finally{await browser?.close().catch(()=>{})}
