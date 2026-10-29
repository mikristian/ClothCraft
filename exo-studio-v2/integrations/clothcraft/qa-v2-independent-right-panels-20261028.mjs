/** Real Chrome interaction: 2D toolbar and inspector are independently collapsible. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const errors=[]
let browser,page,stage='launch'
const snapshot=()=>page.locator('.main-layout').evaluate(root=>{
 const inspector=root.querySelector(':scope>.clo-inspector')
 const toolbar=inspector?.querySelector('.clo-right-tool-palette')
 const content=inspector?.querySelector('.clo-inspector-content')
 const visible=el=>Boolean(el&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>1&&el.getBoundingClientRect().height>1)
 return {
  inspectorVisible:root.dataset.inspectorVisible,
  toolsCollapsed:root.dataset.rightToolsCollapsed,
  universalCollapsed:root.dataset.exoInspectorCollapsed,
  panelWidth:inspector?.getBoundingClientRect().width||0,
  paletteWidth:toolbar?.getBoundingClientRect().width||0,
  effectiveWidth:parseFloat(getComputedStyle(root).getPropertyValue('--effective-inspector-width')),
  toolbarVisible:visible(toolbar),contentVisible:visible(content),
  objectVisible:visible(content?.querySelector('.clo-object-browser')),
  toolbarToggle:visible(root.querySelector(':scope>.exo-right-independent-tools-arrow')),
  inspectorRestore:visible(root.querySelector(':scope>.exo-reopen-inspector-arrow')),
  toolbarToggleRect:(()=>{const r=root.querySelector(':scope>.exo-right-independent-tools-arrow')?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null})(),
  inspectorRestoreRect:(()=>{const r=root.querySelector(':scope>.exo-reopen-inspector-arrow')?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null})(),
 }
})
try{
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1680,height:1000}})
 page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 stage='open installed EXO'
 await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&testSession=independent-right-panels-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.main-layout .clo-inspector').waitFor({state:'attached',timeout:20000})
 const right=page.getByRole('button',{name:/^(Collapse|Expand) right tools toolbar$/})
 const reopen=page.getByRole('button',{name:'Expand Object Browser and Property Editor panel'}).first()
 for(const mode of ['split','2d']){
  stage='switch to '+mode
  const combo=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
  if(await combo.count())await combo.selectOption(mode)
  await page.waitForTimeout(250)
  // Ensure a predictable start with the inspector open and toolbar visible.
  if((await snapshot()).toolsCollapsed==='true')await right.click()
  if((await snapshot()).inspectorVisible==='false')await reopen.click()
  let state=await snapshot()
  assert.equal(state.inspectorVisible,'true',JSON.stringify({stage,state}))
  assert.equal(state.toolsCollapsed,'false',JSON.stringify({stage,state}))
  assert(state.toolbarVisible&&state.contentVisible,JSON.stringify({stage,state}))

  stage=mode+': collapse browser/property only'
  await page.getByRole('button',{name:'Collapse Object Browser and Property Editor panel'}).first().click()
  state=await snapshot()
  assert.equal(state.inspectorVisible,'false')
  assert.equal(state.toolsCollapsed,'false')
  assert(state.toolbarVisible,'Closing browser hid 2D tools: '+JSON.stringify(state))
  assert(!state.contentVisible,'Inspector still visible after collapse')
  assert(state.panelWidth>=65&&state.panelWidth<=100,'Inspector track not narrow: '+JSON.stringify(state))
  assert(state.toolbarToggle&&state.inspectorRestore,'Missing independent arrows: '+JSON.stringify(state))

  stage=mode+': collapse tools after browser'
  await page.getByRole('button',{name:'Collapse right tools toolbar'}).click()
  state=await snapshot()
  assert.equal(state.inspectorVisible,'false')
  assert.equal(state.toolsCollapsed,'true')
  assert(!state.toolbarVisible)
  assert(state.panelWidth<3,'Fully collapsed inspector still wastes width: '+JSON.stringify(state))

  stage=mode+': reopen ONLY tools'
  console.log(JSON.stringify({stage,beforeReopen:await snapshot()}))
  await page.getByRole('button',{name:'Expand right tools toolbar'}).click()
  state=await snapshot()
  assert.equal(state.inspectorVisible,'false','Reopening 2D tools reopened Object Browser')
  assert(state.toolbarVisible&&!state.contentVisible,'Tools failed to reopen alone: '+JSON.stringify(state))
  assert(state.panelWidth>=65,'Reopened tools remain clipped: '+JSON.stringify(state))

  stage=mode+': reopen browser then collapse ONLY tools'
  await reopen.click()
  await page.getByRole('button',{name:'Collapse right tools toolbar'}).click()
  state=await snapshot()
  assert.equal(state.inspectorVisible,'true')
  assert.equal(state.toolsCollapsed,'true')
  assert(state.contentVisible,'Collapsing tools also hid inspector: '+JSON.stringify(state))
  assert(!state.toolbarVisible)
  await page.getByRole('button',{name:'Expand right tools toolbar'}).click()
  state=await snapshot()
  assert(state.contentVisible&&state.toolbarVisible,'Two areas cannot reopen independently: '+JSON.stringify(state))
  console.log(JSON.stringify({mode,pass:true,independentArrows:true,reopenToolsOnly:true,expandEverything:true}))
 }
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,realInstalledApp:true,
  modes:['split','2d'],independentCollapse:true,collapseAll:true,
  reopenOnly2dTools:true,reopenOnlyInspector:true,pageErrors:0}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,errors,stack:error.stack}))
 process.exitCode=1
}finally{await browser?.close().catch(()=>{})}
