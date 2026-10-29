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
const nativePort=5847,uiPort=5848
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-grading-bottom-docks-'))
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
 stage='drag, clamp, independent movement'
 async function drag(widget,dx,dy){
  const handle=widget.locator('.exo-grade-bottom-widget__titlebar')
  const bounds=await handle.boundingBox()
  assert(bounds,'Floating widget drag handle must be visible')
  const start={x:bounds.x+Math.min(55,bounds.width/2),y:bounds.y+bounds.height/2}
  await page.mouse.move(start.x,start.y)
  await page.mouse.down()
  await page.mouse.move(start.x+dx,start.y+dy,{steps:9})
  await page.mouse.up()
 }
 const beforeValues=await values.boundingBox()
 const beforeCompare=await compare.boundingBox()
 await drag(values,-110,-84)
 const moved=await values.boundingBox()
 assert(moved.x<beforeValues.x-50&&moved.y<beforeValues.y-45,`Drag failed: ${JSON.stringify({beforeValues,moved})}`)
 const compareUnchanged=await compare.boundingBox()
 assert(near(compareUnchanged.x,beforeCompare.x)&&near(compareUnchanged.y,beforeCompare.y),'Dragging values must not move Compare Length')
 await drag(values,-6000,-6000)
 const clamped=await values.boundingBox()
 assert(near(clamped.x,8)&&near(clamped.y,48),`Top-left drag did not clamp: ${JSON.stringify(clamped)}`)
 await drag(values,6000,6000)
 const rightBottom=await values.boundingBox()
 assert(near(rightBottom.x,1660-420-8)&&near(rightBottom.y,1050-308-8),
  `Bottom-right drag did not clamp: ${JSON.stringify(rightBottom)}`)
 stage='close and reopen dock positions'
 await values.getByRole('button',{name:'Close Grading Table'}).click()
 await values.waitFor({state:'detached'})
 assert.equal(await compare.count(),1,'Closing Grading Table must leave Compare Length open')
 await valuesLauncher.click()
 await values.waitFor({state:'visible'})
 const restored=await values.boundingBox()
 assert(near(restored.x,rightBottom.x)&&near(restored.y,rightBottom.y),'Grading Table position must persist after reopen')
 // Temporarily close the foreground widget to access the overlapped
 // Compare Length close control, then reopen it for independent persistence.
 await values.getByRole('button',{name:'Close Grading Table'}).click()
 await compare.getByRole('button',{name:'Close Compare Length'}).click()
 await compare.waitFor({state:'detached'})
 await compareLauncher.click()
 await compare.waitFor({state:'visible'})
 const reopenedCompare=await compare.boundingBox()
 assert(near(reopenedCompare.x,beforeCompare.x)&&near(reopenedCompare.y,beforeCompare.y))
 await valuesLauncher.click()
 await values.waitFor({state:'visible'})
 stage='persist drag position after page reload'
 await drag(compare,-135,-105)
 const savedCompare=await compare.boundingBox()
 const storage=await page.evaluate(()=>({
  values:JSON.parse(localStorage.getItem('exo.grade.bottom-widget.values.v1')),
  compare:JSON.parse(localStorage.getItem('exo.grade.bottom-widget.compare.v1')),
 }))
 assert(storage.values&&storage.compare,'Each dock must persist its own drag coordinates')
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const reload2d=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await reload2d.count())await reload2d.first().click()
 const reloadArrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await reloadArrangement.count())await reloadArrangement.selectOption('2d')
 await page.getByRole('button',{name:'Open compact movable Grading Table'}).click()
 await values.waitFor({state:'visible'})
 const reloadedValues=await values.boundingBox()
 assert(near(reloadedValues.x,rightBottom.x)&&near(reloadedValues.y,rightBottom.y),'Values dock position lost on reload')
 await page.getByRole('button',{name:'Open compact movable Compare Length'}).click()
 await compare.waitFor({state:'visible'})
 const reloadedCompare=await compare.boundingBox()
 assert(near(reloadedCompare.x,savedCompare.x)&&near(reloadedCompare.y,savedCompare.y),'Compare dock position lost on reload')
 stage='clean browser console and native health'
 assert.deepEqual(errors,[],`Browser errors: ${errors.join('\n')}`)
 assert((await fetch(native+'/health')).ok,'Real native Rust session must remain healthy')
 console.log(JSON.stringify({passed:true,realChrome:true,realNativeRust:true,
  sixGradeSizes:6,editableAxes:['X','Y'],nativeContourLengthsMm:[firstA,firstB],
  independentTwoDLaunchers:true,independentDocks:true,dragged:true,clamped:true,
  closeReopenPersistence:true,reloadPositionPersistence:true,
  cleanBrowserErrors:true,stage:'complete',vendorParityCertified:false}))
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
