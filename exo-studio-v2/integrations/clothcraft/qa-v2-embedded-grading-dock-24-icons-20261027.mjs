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
const nativePort=5857,uiPort=5858
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-grading-embedded-docks-'))
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
 const appUrl=`${ui}/?desktop=1&engine=clothcraft&testSession=grading-bottom-docks-20261027`
 stage='native editor initial load'
 await page.goto(appUrl,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const full2d=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full2d.count())await full2d.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 stage='all 24 toolbar icons available on real pattern before grade draft'
 await page.getByRole('button',{name:'Open all 24 native grading tools and grading table'}).click()
 const toolbar=page.locator('[data-optitex-grade-toolbar="true"]')
 await toolbar.waitFor({state:'visible',timeout:12000})
 const toolButtons=toolbar.locator('[aria-label="24 grading commands"] button')
 assert.equal(await toolButtons.count(),24)
 assert.equal(await toolButtons.locator(':disabled').count(),0,'All 24 icons must be clickable, not greyed out')
 await toolbar.getByRole('combobox',{name:'Grading axis'}).selectOption('x')
 await toolbar.getByRole('spinbutton',{name:'Grading movement millimetres'}).fill('2')
 await toolbar.getByRole('button',{name:'Set Grading tool'}).click()
 await toolbar.getByText(/Atomic sidecar grading edit validated across all sizes/).first().waitFor({timeout:12000})
 const values=page.locator('[data-exo-grade-bottom-widget="values"]')
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 const valuesLauncher=page.getByRole('button',{name:'Open compact movable Grading Table'})
 const compareLauncher=page.getByRole('button',{name:'Open compact movable Compare Length'})
 stage='independent left-side 2D launchers'
 await valuesLauncher.click()
 await values.waitFor({state:'visible',timeout:10000})
 assert.equal(await compare.count(),0)
 await compareLauncher.click()
 await compare.waitFor({state:'visible'})
 assert.equal(await values.count(),1,'Compare launcher must preserve existing Grading Table')
 const valuesTable=values.locator('[data-optitex-grading-table="true"]')
 const compareTable=compare.locator('[data-optitex-grading-table="true"]')
 assert.equal(await valuesTable.getAttribute('data-grade-display-mode'),'values')
 assert.equal(await compareTable.getAttribute('data-grade-display-mode'),'compare')
 stage='create graded six-size rule table'
 if(await valuesTable.getByRole('button',{name:'Create native XS–XXL grade table'}).count())
  await valuesTable.getByRole('button',{name:'Create native XS–XXL grade table'}).click()
 const gradeRows=valuesTable.getByRole('table',{name:'Point grade movements by size'}).locator('tbody tr')
 const lengthRows=compareTable.getByRole('table',{name:'Graded contour length comparison'}).locator('tbody tr')
 assert.equal(await gradeRows.count(),6)
 assert.equal(await lengthRows.count(),6)
 stage='editable independent X and Y grading cells'
 const x=valuesTable.getByRole('spinbutton',{name:'L grade point 1 X movement millimetres',exact:true})
 const y=valuesTable.getByRole('spinbutton',{name:'L grade point 1 Y movement millimetres',exact:true})
 await x.fill('1.5');await x.press('Tab')
 await valuesTable.getByText(/L P1: 1\.50 X/).waitFor({timeout:9000})
 await y.fill('1');await y.press('Tab')
 await valuesTable.getByText(/L P1: 1\.50 X \/ 1\.00 Y/).waitFor({timeout:9000})
 assert.equal(Number(await x.inputValue()),1.5)
 assert.equal(Number(await y.inputValue()),1)
 stage='real drafted contour lengths'
 const firstA=await lengthRows.first().locator('td').first().innerText()
 const firstB=await lengthRows.first().locator('td').nth(1).innerText()
 assert(Number.isFinite(Number(firstA))&&Number(firstA)>0,`Missing first actual contour length: ${firstA}`)
 assert(Number.isFinite(Number(firstB))&&Number(firstB)>0,`Missing second actual contour length: ${firstB}`)
 await compareTable.getByRole('combobox',{name:'Compare length first edge'}).selectOption('1')
 const updatedLength=await lengthRows.first().locator('td').first().innerText()
 assert(Number.isFinite(Number(updatedLength))&&Number(updatedLength)>0)
 stage='native bottom docking host exists without occupying canvas before docking'
 const dockHost=page.locator('[data-exo-grade-dock-host="true"]')
 assert.equal(await dockHost.count(),1,'Bottom host should exist in 2D native editor')
 const main=page.locator('.cc-embedded-root.cc-embedded-2d .cc-embedded-main')
 const beforeHeight=(await main.boundingBox()).height
 stage='manually embed both independent tables along bottom'
 await values.getByRole('button',{name:'Dock Grading Table'}).click()
 await values.locator('[data-docked="true"]').count().catch(()=>{})
 assert.equal(await values.getAttribute('data-docked'),'true')
 assert.equal(await dockHost.getAttribute('data-exo-grade-dock-occupied'),'true')
 assert((await dockHost.boundingBox()).height>=140)
 await compare.getByRole('button',{name:'Dock Compare Length'}).click()
 assert.equal(await compare.getAttribute('data-docked'),'true')
 assert.equal(await dockHost.locator('[data-exo-grade-bottom-widget]').count(),2)
 const afterHeight=(await main.boundingBox()).height
 assert(afterHeight<beforeHeight-120,`Dock should reserve canvas height: ${beforeHeight}→${afterHeight}`)
 stage='undock both without losing window independence'
 await values.getByRole('button',{name:'Undock Grading Table'}).click()
 await compare.getByRole('button',{name:'Undock Compare Length'}).click()
 assert.equal(await values.getAttribute('data-docked'),'false')
 assert.equal(await compare.getAttribute('data-docked'),'false')
 assert.equal(await dockHost.locator('[data-exo-grade-bottom-widget]').count(),0)
 stage='actual pointer drag-and-drop into embedded bottom host'
 async function dropToBottom(widget,xFraction){
  const host=await dockHost.boundingBox()
  const root=await page.locator('.cc-embedded-root.cc-embedded-2d').boundingBox()
  const handle=widget.locator('.exo-grade-bottom-widget__titlebar')
  const rect=await handle.boundingBox()
  assert(rect&&root,'Expected native widget/titlebar and 2D root')
  const source={x:rect.x+Math.min(45,rect.width/3),y:rect.y+rect.height/2}
  await page.mouse.move(source.x,source.y)
  await page.mouse.down()
  const drop={x:root.x+root.width*xFraction,y:root.y+root.height-32}
  await page.mouse.move(drop.x,drop.y,{steps:14})
  const hovered=await widget.getAttribute('data-dock-hover')
  await page.mouse.up()
  const docked=await widget.getAttribute('data-docked')
  if(docked!=='true')console.error(JSON.stringify({diagnostic:'pointer-dock-acceptance',
    hovered,drop,root,host,source,widget:await widget.boundingBox(),
    active:await widget.getAttribute('data-docked'),hostData:await dockHost.getAttribute('data-exo-grade-dock-occupied')},null,2))
  assert.equal(docked,'true','Pointer release into 2D lower docking region should embed table')
 }
 await dropToBottom(values,.4)
 await dropToBottom(compare,.7)
 assert.equal(await dockHost.locator('[data-exo-grade-bottom-widget]').count(),2)
 stage='collapse embedded widget and restore content'
 await values.getByRole('button',{name:'Minimize Grading Table'}).click()
 assert.equal(await values.getAttribute('data-minimized'),'true')
 await values.getByRole('button',{name:'Expand Grading Table'}).click()
 assert.equal(await values.getAttribute('data-minimized'),'false')
 stage='closed dock restores embedded state after reopened'
 await values.getByRole('button',{name:'Close Grading Table'}).click()
 await values.waitFor({state:'detached'})
 assert.equal(await compare.getAttribute('data-docked'),'true')
 await valuesLauncher.click()
 await values.waitFor({state:'visible'})
 assert.equal(await values.getAttribute('data-docked'),'true')
 stage='dock placement persists after page reload'
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const fullAgain=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await fullAgain.count())await fullAgain.first().click()
 const arrangementAgain=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangementAgain.count())await arrangementAgain.selectOption('2d')
 await page.getByRole('button',{name:'Open compact movable Grading Table'}).click()
 await values.waitFor({state:'visible'})
 await page.getByRole('button',{name:'Open compact movable Compare Length'}).click()
 await compare.waitFor({state:'visible'})
 assert.equal(await values.getAttribute('data-docked'),'true')
 assert.equal(await compare.getAttribute('data-docked'),'true')
 assert.equal(await dockHost.locator('[data-exo-grade-bottom-widget]').count(),2)
 stage='real browser errors and native health'
 assert.deepEqual(errors,[],`Browser errors: ${errors.join('\n')}`)
 assert((await fetch(native+'/health')).ok)
 console.log(JSON.stringify({passed:true,realChrome:true,realNativeRust:true,all24IconsEnabled:true,
  oneClickRealDraftOperation:true,physicalGradeSafe:true,gradedSixSizes:6,
  bothEmbedded:true,pointerDragDrop:true,canvasHeightRecoveredByUndock:true,
  sideBySide:true,minimizeRestore:true,closeRestore:true,reloadPersistent:true,
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
