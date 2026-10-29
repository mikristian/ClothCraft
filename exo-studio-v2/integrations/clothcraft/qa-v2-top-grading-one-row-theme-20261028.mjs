/** Isolated native/Chrome acceptance for one-row theme-aware top grading bar. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5983,uiPort=5984
const native='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort
const output=mkdtempSync(path.join(tmpdir(),'exo-one-row-top-grading-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Existing Rust session binary required')
const services=[]
function launch(cmd,args,env={}){
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 services.push(child)
}
async function ready(url){
 for(let i=0;i<85;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  await sleep(220)
 }
 throw Error('Test service unavailable: '+url)
}
let browser,page,stage='startup'
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
 const opened=await (await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({op:'open',preset:'tshirt'})})).json()
 assert(opened.ok,'Isolated native T-shirt open failed')
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1660,height:1050}})
 page.on('pageerror',error=>pageErrors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 stage='enter native 2D'
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=top-grading-one-row-20261028',
  {waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const full=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full.count())await full.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 const host=page.locator('.exo-grade-workspace-dock-host--top[data-exo-dock-edge="top"]')
 const rail=host.locator('[data-exo-grade-top-command-rail="true"]')
 await rail.waitFor({state:'visible',timeout:12000})
 assert.equal(await page.locator('[data-modaris-2d-status-strip="true"]').count(),0,
  'Legacy Modaris status strip must not consume a separate row')
 const names=['Grading Toolbar','Numeric Point Editor','Grading Rules','Pattern QA']
 for(const name of names)assert.equal(await rail.getByRole('button',{name,exact:true}).count(),1,
  name+' must be in the shared top command rail')
 const initialHeight=(await host.boundingBox()).height
 assert(initialHeight<=35,'Undocked top controls must occupy one compact row, got '+initialHeight)
 stage='dock real quick grading tools on top'
 await rail.getByRole('button',{name:'Grading Toolbar'}).click()
 const quick=page.locator('[data-clo-floating-widget="grading-quick-toolbar"]')
 await quick.waitFor({state:'visible'})
 await quick.getByRole('combobox',{name:'Grading toolbar placement'}).selectOption('top')
 await page.waitForFunction(()=>document.querySelector('[data-clo-floating-widget="grading-quick-toolbar"]')?.dataset.exoDockedEdge==='top')
 await page.waitForTimeout(120)
 const result=await page.evaluate(()=>{
  const host=document.querySelector('.exo-grade-workspace-dock-host--top')
  const rail=host.querySelector('[data-exo-grade-top-command-rail]')
  const quick=host.querySelector('[data-clo-floating-widget="grading-quick-toolbar"]')
  const rect=node=>{const a=node.getBoundingClientRect();return {x:a.x,y:a.y,width:a.width,height:a.height,right:a.right,bottom:a.bottom}}
  const buttons=[...rail.querySelectorAll(':scope > button')]
  return {host:rect(host),rail:rect(rail),quick:rect(quick),
   hasStatusStrip:document.querySelectorAll('[data-modaris-2d-status-strip]').length,
   commandNames:buttons.map(button=>button.textContent.trim()),
   commandsAligned:buttons.every(button=>Math.abs(button.getBoundingClientRect().y-rail.getBoundingClientRect().y)<10),
   visibleCommandCount:quick.querySelectorAll('.exo-quick-grade__grid button').length,
   hostBg:getComputedStyle(host).backgroundColor,
   railBg:getComputedStyle(rail).backgroundColor,
   quickBg:getComputedStyle(quick).backgroundColor,
   railDisplay:getComputedStyle(rail).display}
 })
 assert(result.host.height<=38,'Top toolbar still stacked: '+JSON.stringify(result))
 assert(Math.abs(result.rail.y-result.quick.y)<=5,'Quick toolbar must share the rail row: '+JSON.stringify(result))
 assert.equal(result.visibleCommandCount,12,'All native quick grading commands must remain mounted')
 assert(result.commandsAligned,'Top command buttons must align within one row')
 assert.equal(result.railBg,result.hostBg,'Top command rail must inherit top theme surface')
 assert.equal(result.quickBg,result.hostBg,'Embedded toolbar must inherit top theme surface')
 stage='inspect collapsed Object Browser'
 assert(await page.getByRole('button',{name:'Expand Object Browser and Property Editor panel'}).isVisible(),
  'Top grading work must leave the native 2D inspector collapsed')
 assert.deepEqual(pageErrors,[],'Browser reported runtime errors')
 console.log(JSON.stringify({passed:true,realChrome:true,realRust:true,
  initialRowHeightPx:initialHeight,dockedRowHeightPx:result.host.height,
  sameRow:true,themeSurfacesMatch:true,quickCommands:12,controls:result.commandNames,
  collapsedInspector:true}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,pageErrors,stack:error.stack}))
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of services)try{process.kill(-child.pid,'SIGTERM')}catch{}
 await sleep(250)
 for(const child of services)try{process.kill(-child.pid,'SIGKILL')}catch{}
 rmSync(output,{recursive:true,force:true})
}
