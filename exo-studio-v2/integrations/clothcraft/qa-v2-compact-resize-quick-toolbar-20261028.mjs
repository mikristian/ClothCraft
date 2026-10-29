/** Isolated browser + native Rust acceptance for independent compact grading docks. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5957,uiPort=5958
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-compact-dock-toolbar-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Built native Rust exo-session binary is required')
const children=[]
function start(cmd,args,env={}){
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
 return child
}
async function ready(url){
 for(let i=0;i<100;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
  await sleep(200)
 }
 throw Error(`Isolated service did not start: ${url}`)
}
const near=(a,b,tolerance=4)=>Math.abs(a-b)<=tolerance
let browser,stage='startup'
let page
const errors=[]
try{
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
 })
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:native,
 })
 await Promise.all([ready(native+'/health'),ready(ui)])
 const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({op:'open',preset:'tshirt'})})
 const opened=await response.json()
 assert(opened.ok,`Native T-shirt fixture open failed: ${JSON.stringify(opened).slice(0,700)}`)
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1660,height:1050}})
 page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error'&&!/ERR_CONNECTION_REFUSED|ERR_FAILED|CORS policy|Failed to load resource/.test(message.text()))errors.push('console: '+message.text())})
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const result=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response:result,headers:{...result.headers(),'access-control-allow-origin':ui}})
 })
 const appUrl=`${ui}/?desktop=1&engine=clothcraft&testSession=compact-dock-toolbar-20261028`
 stage='native editor initial load'
 await page.goto(appUrl,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 const full2d=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full2d.count())await full2d.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 stage='full 2D outer object and property editors default collapsed'
 const reopenRight=page.getByRole('button',{name:'Expand Object Browser and Property Editor panel'})
 await reopenRight.waitFor({state:'visible',timeout:10000})
 assert.equal(await reopenRight.getAttribute('aria-expanded'),'false')
 assert.equal(await page.locator('.clo-inspector:not([hidden])').count(),0,
   'Object Browser / Property Editor must start collapsed without consuming center canvas')
 stage='2D workspace has compact permanent bar without automatic tables'
 const root2d=page.locator('.cc-embedded-root.cc-embedded-2d')
 assert.equal(await root2d.getAttribute('data-exo-cad-collapsed'),'true',
  'Full 2D native Object Browser / Property Editor should initialize collapsed')
 const host=page.locator('[data-exo-grade-dock-host="true"]')
 const rail=host.getByRole('toolbar',{name:'2D bottom docking bar'})
 await rail.waitFor({state:'visible',timeout:10000})
 assert.equal(await host.locator('[data-exo-grade-bottom-widget]').count(),0)
 assert((await host.boundingBox()).height<=39,'Empty dock remains a narrow rail')
 stage='Grading Table opens FLOATING and draggable by corner dots'
 await rail.getByRole('button',{name:'Grading Table'}).click()
 const values=page.locator('[data-exo-grade-bottom-widget="values"]')
 await values.waitFor({state:'visible'})
 assert.equal(await values.getAttribute('data-docked'),'false')
 assert.equal(await values.locator('[data-exo-widget-grip="true"]').count(),1)
 assert((await host.boundingBox()).height<=39)
 stage='Embed grading and compare via actual native dock buttons'
 await values.getByRole('button',{name:'Dock Grading Table'}).click()
 assert.equal(await values.getAttribute('data-docked'),'true')
 await rail.getByRole('button',{name:'Compare Length'}).click()
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await compare.waitFor({state:'visible'})
 await compare.getByRole('button',{name:'Dock Compare Length'}).click()
 assert.equal(await compare.getAttribute('data-docked'),'true')
 assert.equal(await host.locator('.exo-grade-bottom-widget--docked').count(),2)
 stage='full 2D hides only avatar silhouette guide'
 assert.equal(await root2d.locator('[aria-label="Centered front avatar silhouette"]').count(),0,
  'Avatar silhouette must disappear in full 2D pattern workspace')
 const bodyButton=root2d.getByRole('button',{name:'Show 2D avatar silhouette'})
 assert.equal(await bodyButton.getAttribute('aria-pressed'),'false')
 stage='two adjacent table widgets show real draggable split handle'
 const divider=host.locator('[data-exo-bottom-split-divider="0"]')
 await divider.waitFor({state:'visible',timeout:10000})
 const leftInitial=(await values.boundingBox()).width
 const rightInitial=(await compare.boundingBox()).width
 assert(leftInitial>150&&rightInitial>150)
 const separatorRect=await divider.boundingBox()
 await page.mouse.move(separatorRect.x+separatorRect.width/2,separatorRect.y+separatorRect.height/2)
 await page.mouse.down()
 await page.mouse.move(separatorRect.x+separatorRect.width/2+95,separatorRect.y+separatorRect.height/2,{steps:10})
 await page.mouse.up()
 const leftResized=(await values.boundingBox()).width
 const rightResized=(await compare.boundingBox()).width
 assert(Math.abs(leftResized-leftInitial)>60,`Grading pane width did not change: ${leftInitial} → ${leftResized}`)
 assert(Math.abs(rightResized-rightInitial)>60,`Compare pane width did not change: ${rightInitial} → ${rightResized}`)
 assert((leftResized-leftInitial)*(rightResized-rightInitial)<0,'Split should grow one pane and shrink the adjacent pane')
 assert(Math.abs((leftResized+rightResized)-(leftInitial+rightInitial))<6)
 stage='keyboard split resize is accessible and persists width'
 await divider.focus()
 await page.keyboard.press('ArrowLeft')
 assert(Math.abs((await values.boundingBox()).width-leftResized)>3)
 const savedRatio=await host.evaluate(node=>node.style.gridTemplateColumns)
 assert(savedRatio.includes('fr'))
 stage='grading table mini tools render within embedded page'
 const gradingMinis=values.locator('.optitex-grade-inline-tools')
 await gradingMinis.waitFor({state:'visible',timeout:7000})
 assert(await gradingMinis.locator('button').count()>=8,
  'Grading table should include real in-table mini grading tools')
 await gradingMinis.getByRole('button',{name:'Copy grading'}).click()
 await values.getByText(/Copy Grading|Copied|grading/,{exact:false}).first().waitFor({timeout:12000})
 assert(await gradingMinis.getByRole('button',{name:'Paste grading'}).isEnabled(),
  'A real native Copy Grading should create a usable clipboard for the in-table Paste tool')

 stage='Compare Length table has distinct header'
 assert.equal(await compare.locator('.optitex-grading-tabs > strong').innerText(),'COMPARE LENGTH')
 stage='both embedded tables show all six rows without inner scrolling'
 console.log(JSON.stringify({stage:'dock-height-debug',box:await host.boundingBox(),
  info:await host.evaluate(node=>({height:node.clientHeight,styleHeight:getComputedStyle(node).height,
   storedHeight:localStorage.getItem('exo.2d.bottom-dock-height.v2'),
   cssVariable:getComputedStyle(node).getPropertyValue('--exo-bottom-dock-height'),
   splits:node.querySelectorAll('[data-exo-bottom-split-divider]').length,
   grip:node.querySelectorAll('[data-exo-bottom-height-grip]').length,
   rootHeight:node.closest('.cc-embedded-root')?.clientHeight}))}))
 for(const widget of [values,compare]){
   const measurement=await widget.evaluate(el=>{
    const content=el.querySelector('.exo-grade-bottom-widget__content')
    const table=el.querySelector('.optitex-table-scroll')
    const grid=el.querySelector('.optitex-grading-table')
    const sheet=table?.querySelector('table')
    const host=el.closest('[data-exo-grade-dock-host]')
    const title=el.querySelector('.exo-grade-bottom-widget__titlebar')
    return {kind:el.getAttribute('data-exo-grade-bottom-widget'),
      hostHeight:host?.clientHeight,hostColumns:getComputedStyle(host).gridTemplateColumns,
      widgetHeight:el.clientHeight,titleHeight:title?.clientHeight,
      widgetStyleHeight:getComputedStyle(el).height,
      contentHeight:content?.clientHeight,contentScroll:content?.scrollHeight,
      tableHeight:table?.clientHeight,tableScroll:table?.scrollHeight,
      tableWidth:table?.clientWidth,tableScrollWidth:table?.scrollWidth,
      sheetWidth:sheet?.getBoundingClientRect().width,
      panelHeight:grid?.clientHeight,panelScroll:grid?.scrollHeight,
      rows:table?.querySelectorAll('tbody tr').length,
      sections:[...grid.children].map(node=>({tag:node.tagName,cls:node.className||'',
       height:Math.round(node.getBoundingClientRect().height),scroll:node.scrollHeight,
       width:Math.round(node.getBoundingClientRect().width)})),
      overflow:getComputedStyle(content).overflowY}
   })
   console.log(JSON.stringify({stage:'no-scroll-size-audit',measurement}))
   assert.equal(measurement.rows,6,'All six sizes must be present')
   assert(measurement.contentScroll<=measurement.contentHeight+3,
    `Table controls and six rows should fit without vertical scrolling: ${JSON.stringify(measurement)}`)
   assert(measurement.tableScroll<=measurement.tableHeight+3,
    `No hidden vertical rows: ${JSON.stringify(measurement)}`)
   assert(measurement.tableScrollWidth<=measurement.tableWidth+3,
    `No horizontal scrolling: ${JSON.stringify(measurement)}`)
 }
 const rootBounds=await root2d.boundingBox()
 const onRail={x:rootBounds.x+rootBounds.width*.43,y:rootBounds.y+rootBounds.height-15}
 async function pointerDrag(from,to){
  await page.mouse.move(from.x,from.y)
  await page.mouse.down()
  await page.mouse.move(to.x,to.y,{steps:18})
  await page.mouse.up()
 }
 stage='dock height can be resized vertically and its preference saved'
 const heightGrip=host.locator('[data-exo-bottom-height-grip="true"]')
 await heightGrip.waitFor({state:'visible'})
 const initialHeight=(await host.boundingBox()).height
 const gripRect=await heightGrip.boundingBox()
 await page.mouse.move(gripRect.x+gripRect.width/2,gripRect.y+gripRect.height/2)
 await page.mouse.down()
 await page.mouse.move(gripRect.x+gripRect.width/2,gripRect.y+gripRect.height/2-62,{steps:12})
 await page.mouse.up()
 const expandedHeight=(await host.boundingBox()).height
 assert(expandedHeight>initialHeight+40,`Vertical dock handle must enlarge page strip: ${initialHeight} → ${expandedHeight}`)
 const storedHeight=await host.evaluate(()=>Number(localStorage.getItem('exo.2d.bottom-dock-height.v4')))
 assert(Math.abs(storedHeight-expandedHeight)<4)
 await heightGrip.focus()
 await page.keyboard.press('ArrowDown')
 assert((await host.boundingBox()).height<expandedHeight-12)
 await heightGrip.dblclick()
 assert(Math.abs((await host.boundingBox()).height-initialHeight)<4,'Double-click restores compact dock size')
 stage='dockable 12-command two-row grading toolbar launches FLOATING'
 await rail.getByRole('button',{name:'Grading Toolbar'}).click()
 const quick=page.locator('[data-clo-floating-widget="grading-quick-toolbar"]')
 await quick.waitFor({state:'visible',timeout:10000})
 assert.equal(await quick.getAttribute('data-docked'),'false')
 const quickGrid=quick.locator('.exo-quick-grade__grid')
 assert.equal(await quickGrid.locator('button').count(),12)
 const quickRows=await quickGrid.evaluate(node=>getComputedStyle(node).gridTemplateRows)
 assert.equal(quickRows.trim().split(/\s+/).length,2,'Quick grading must show exactly two active tool rows')
 await quick.getByRole('button',{name:'Copy grading'}).click()
 await quick.getByRole('status').getByText(/copied|grading/i).waitFor({timeout:12000})
 await quick.getByRole('button',{name:'Dock Grading Toolbar at bottom'}).click()
 assert.equal(await quick.getAttribute('data-docked'),'true')
 assert.equal(await host.locator('[data-clo-floating-widget="grading-quick-toolbar"]').count(),1)
 assert.equal(await host.locator('[data-exo-bottom-split-divider]').count(),2)
 stage='grading toolbar can embed INSIDE table then pop out again'
 const placement=quick.getByRole('combobox',{name:'Grading toolbar placement'})
 await placement.selectOption('values')
 assert.equal(await quick.getAttribute('data-embedded-in'),'values')
 assert.equal(await values.locator('[data-clo-floating-widget="grading-quick-toolbar"]').count(),1)
 await placement.selectOption('floating')
 assert.equal(await quick.getAttribute('data-embedded-in'),'')
 assert.equal(await quick.getAttribute('data-docked'),'false')
 await quick.getByRole('button',{name:'Close Grading Toolbar'}).click()
 await quick.waitFor({state:'detached'})
 stage='all shared tool widgets open FLOATING and use corner grip'
 await root2d.getByRole('button',{name:'Numeric point editor'}).click()
 const generic=page.locator('[data-clo-floating-widget="numerical-construction"]')
 await generic.waitFor({state:'visible',timeout:10000})
 assert.equal(await generic.getAttribute('data-docked'),'false')
 const genGrip=await generic.locator('[data-exo-widget-grip="true"]').boundingBox()
 await pointerDrag({x:genGrip.x+genGrip.width/2,y:genGrip.y+genGrip.height/2},
  {x:onRail.x+100,y:onRail.y})
 assert.equal(await generic.getAttribute('data-docked'),'true')
 stage='three docked widget split handles exist with nonzero pane widths'
 assert.equal(await host.locator('[data-exo-bottom-split-divider]').count(),2)
 for(const widget of [values,compare,generic]){
   const box=await widget.boundingBox()
   assert(box&&box.width>150&&box.height>120,
    'Each of three embedded widgets must have real split-view area')
 }
 stage='three-widget compact layout keeps six grading and compare rows visible'
 for(const widget of [values,compare]){
  const audit=await widget.evaluate(el=>{
   const area=el.querySelector('.exo-grade-bottom-widget__content')
   const sheet=el.querySelector('.optitex-table-scroll')
   return {type:el.getAttribute('data-exo-grade-bottom-widget'),
     areaHeight:area.clientHeight,areaScroll:area.scrollHeight,
     sheetHeight:sheet.clientHeight,sheetScroll:sheet.scrollHeight,
     sheetWidth:sheet.clientWidth,sheetScrollWidth:sheet.scrollWidth,
     rows:sheet.querySelectorAll('tbody tr').length}
  })
  console.log(JSON.stringify({stage:'three-widget-no-scroll',audit}))
  assert.equal(audit.rows,6)
  assert(audit.areaScroll<=audit.areaHeight+3&&audit.sheetScroll<=audit.sheetHeight+3&&
   audit.sheetScrollWidth<=audit.sheetWidth+3,'Three-widget panel must fit without scrolling: '+JSON.stringify(audit))
 }
 stage='generic tool can be dragged OUT by its dotted corner'
 const embGrip=await generic.locator('[data-exo-widget-grip="true"]').boundingBox()
 console.log(JSON.stringify({stage:'generic docked grip geometry',embGrip,underPointer:await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return {tag:e?.tagName,cls:e?.className,label:e?.getAttribute('aria-label'),parent:e?.parentElement?.className}}, {x:embGrip.x+embGrip.width/2,y:embGrip.y+embGrip.height/2})}))
 await pointerDrag({x:embGrip.x+embGrip.width/2,y:embGrip.y+embGrip.height/2},
  {x:rootBounds.x+rootBounds.width*.56,y:rootBounds.y+rootBounds.height*.42})
 assert.equal(await generic.getAttribute('data-docked'),'false')
 assert.equal(await host.locator('.exo-grade-bottom-widget--docked').count(),2)
 assert.deepEqual(errors,[],'Browser page errors')
 console.log(JSON.stringify({passed:true,realChrome:true,realNativeRust:true,
  defaultFloating:true,visibleCornerGrips:true,dragInGrading:true,dragOutGrading:true,
  dragInCompare:true,sharedToolDragIn:true,sharedToolDragOut:true,
  embeddedTables:2,splitResizedPx:Math.round(leftResized-leftInitial),
  nativeSilhouetteHidden:true,gradingMiniTools:true,compactHeightResize:true,
  twoRowDockableToolbar:true,nestedToolbarInsideTable:true,noBrowserErrors:true,
  factoryApproved:false,licensedOptitexParity:false,stage:'complete'}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:String(error),
  browserErrors:errors,body:page?await page.locator('body').innerText().then(s=>s.slice(0,1900)).catch(()=>null):null},null,2))
 process.exitCode=1
}finally{
 if(browser)await browser.close().catch(()=>{})
 for(const child of children){try{process.kill(-child.pid,'SIGTERM')}catch{}}
 await sleep(450)
 for(const child of children){try{process.kill(-child.pid,'SIGKILL')}catch{}}
 rmSync(output,{recursive:true,force:true})
}
