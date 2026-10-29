/** Real Chrome + native Rust regression: the grading tool must not disappear. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const installed=process.env.EXO_GRADE_TEST_INSTALLED==='1'
const nativePort=5993,uiPort=installed?5386:5994
const native='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort
const scratch=mkdtempSync(path.join(tmpdir(),'exo-restore-grade-ui-'))
mkdirSync(path.join(scratch,'workspace'),{recursive:true})
const processes=[]
function launch(cmd,args,env={}){
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',
  env:{...process.env,...env}})
 processes.push(child)
}
async function ready(url){
 for(let i=0;i<110;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  await sleep(160)
 }
 throw Error('Cannot connect to '+url)
}
let stage='start',browser,page
const errors=[]
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),
  EXO_CLOTHCRAFT_OUTPUT_DIR:scratch,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  EXO_CLOTHCRAFT_GPU:'0',
 })
 if(!installed)launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:native,
 })
 await Promise.all([ready(native+'/health'),ready(ui)])
 if(installed){
  const actual=await (await fetch(ui)).text()
  const expected=await (await import('node:fs/promises')).readFile(path.join(root,'dist/index.html'),'utf8')
  const entry=expected.match(/assets\/index-[\w-]+\.js/)?.[0]
  assert(entry&&actual.includes(entry),'Installed EXO must serve the exact production build being tested')
 }
 const opened=await (await fetch(native+'/workspace',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',preset:'tshirt'})})).json()
 assert(opened.ok,'Real native pattern failed to open')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1660,height:1000}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const result=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response:result,headers:{...result.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=restore-quick-grade-widget-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:25000})
 const full=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full.count())await full.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 const toolbar=page.locator('[data-clo-floating-widget="grading-quick-toolbar"]')
 stage='automatic restoration on first 2D entry'
 await toolbar.waitFor({state:'visible',timeout:14000})
 assert.equal(await toolbar.getAttribute('data-docked'),'false')
 assert.equal(await toolbar.locator('.exo-quick-grade__grid button').count(),12)
 stage='close and explicit top launcher restore'
 await toolbar.getByRole('button',{name:'Close Grading Toolbar'}).click()
 await toolbar.waitFor({state:'detached'})
 const launcher=page.locator('.exo-grade-top-launcher')
 await launcher.waitFor({state:'visible',timeout:5000})
 await launcher.click()
 await toolbar.waitFor({state:'visible'})
 assert.equal(await toolbar.getAttribute('data-docked'),'false')
 stage='dock then recover as a floating widget'
 const placement=toolbar.getByRole('combobox',{name:'Grading toolbar placement'})
 await placement.selectOption('top')
 await page.waitForFunction(()=>document.querySelector('[data-clo-floating-widget="grading-quick-toolbar"]')?.dataset.docked==='true')
 await launcher.click()
 await page.waitForFunction(()=>{
  const el=document.querySelector('[data-clo-floating-widget="grading-quick-toolbar"]')
  return el?.dataset.docked==='false'&&!el.dataset.embeddedIn
 })
 assert(await toolbar.isVisible())
 stage='embed into grading table and detach with restore'
 await page.getByRole('button',{name:'Open compact movable Grading Table'}).click()
 const values=page.locator('[data-exo-grade-bottom-widget="values"]')
 await values.waitFor({state:'visible'})
 await values.getByRole('button',{name:'Embed Grading Toolbar in Grading Table'}).click()
 await page.waitForFunction(()=>document.querySelector('[data-clo-floating-widget="grading-quick-toolbar"]')?.dataset.embeddedIn==='values')
 assert.equal(await values.locator('.clo-floating-tool--nested[data-clo-floating-widget="grading-quick-toolbar"]').count(),1)
 await launcher.click()
 await page.waitForFunction(()=>document.querySelector('[data-clo-floating-widget="grading-quick-toolbar"]')?.dataset.embeddedIn==='')
 assert.equal(await toolbar.getAttribute('data-docked'),'false')
 assert.equal(await toolbar.locator('.exo-quick-grade__grid button').count(),12)
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,realChrome:true,realNativeRust:true,installedDesktopBundle:installed,
  restoredOn2DEntry:true,closeAndRestore:true,
  recoverFromTopDock:true,recoverFromInsideTable:true,commands:12,
  runtimeErrors:0}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,pageErrors:errors,
  stack:error.stack}))
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of processes)try{process.kill(-child.pid,'SIGTERM')}catch{}
 await sleep(300)
 for(const child of processes)try{process.kill(-child.pid,'SIGKILL')}catch{}
 rmSync(scratch,{recursive:true,force:true})
}
