// Regression: tool selection never spawns a second bottom widget or replaces
// the Property Editor. Native pattern deletion and keyboard history also work.
// Runs against a disposable Rust workspace and an independent Vite origin.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-tool-ui-undo-delete-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Native Rust session binary missing')
const native='http://127.0.0.1:6891',ui='http://127.0.0.1:6892'
const children=[],requests=[],errors=[],checks=[]
const check=(name,ok)=>{assert(ok,name);checks.push(name)}
const start=(command,args,env={})=>{
  const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url) {
  for(let i=0;i<110;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}
    await sleep(200)
  }
  throw Error('Timed out waiting for '+url)
}
let browser
try {
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'6891',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','6892','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([ready(native+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1630,height:1010}})
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(request.url().endsWith('/workspace')&&request.method()==='POST'){try{requests.push(request.postDataJSON())}catch{}}})
  page.on('dialog',dialog=>dialog.accept())
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=tool-ui-undo-delete',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board path[data-panel]').first().waitFor({timeout:40000})
  const property=page.locator('.clo-pe-list')
  await property.waitFor()
  await sleep(600)
  const inspectorBefore=await property.innerText()
  const badWidgets=async()=>page.locator('[data-native-sewing-panel],.exo-clo-tool-card,#cc-native-tool-properties,.clo-tool-action-panel').filter({visible:true}).count()
  const intact=async name=>{
    check(name+': no bottom/legacy widget',await badWidgets()===0)
    const after=await property.innerText()
    if(after!==inspectorBefore){
      console.error('PROPERTY_EDITOR_CHANGE',JSON.stringify({name,before:inspectorBefore.slice(0,1300),after:after.slice(0,1300)}))
    }
    check(name+': Property Editor unchanged',after===inspectorBefore)
  }

  const free=page.locator('[data-clo-slot="2d:B03"]')
  await free.click()
  await page.locator('[data-clo-floating-widget="free-sewing"]').waitFor({state:'visible',timeout:6000})
  await intact('Free Sewing open')
  await page.getByRole('button',{name:'Close Free Sewing'}).click()
  check('Free Sewing dialog closes',await page.locator('[data-clo-floating-widget="free-sewing"]').count()===0)
  await intact('Free Sewing close')

  const steam=page.locator('[data-clo-slot="2d:B05"]')
  await steam.click()
  await page.locator('[data-clo-floating-widget="steam"]').waitFor({state:'visible',timeout:6000})
  await intact('Steam open')
  await page.getByRole('button',{name:'Close Steam Brush'}).click()
  await intact('Steam close')
  await page.locator('[data-clo-slot="2d:B13"]').click()
  await intact('Segment Puckering select')
  // Sweep other independent tool families to detect an inspector takeover or
  // residual bottom form left by switching away from a floating widget.
  for(const [slot,name] of [
    ['B04','Sewing Length'],['B02','Segment Sewing'],['B12','Edit Puckering'],
    ['A05','Internal Line'],['A10','Walk Pattern'],['B15','Fabric Fill'],
    ['A01','Select Pattern'],
  ]){
    const button=page.locator(`[data-clo-slot="2d:${slot}"]`)
    if(await button.isDisabled())continue
    await button.click()
    await sleep(80)
    await intact(name)
  }

  // Context delete is performed on the actual cut panel under the pointer.
  const panel=page.locator('.cc-board path[data-panel]').first()
  const before=await page.locator('.cc-board path[data-panel]').count()
  await panel.click({button:'right',force:true})
  const menu=page.getByRole('menu',{name:'2D pattern context actions'})
  await menu.waitFor({state:'visible'})
  const remove=menu.getByRole('menuitem',{name:'Delete pattern'})
  check('Right-click exposes Delete pattern',await remove.isEnabled())
  await remove.click()
  await page.waitForFunction(count=>document.querySelectorAll('.cc-board path[data-panel]').length<count,before,{timeout:15000})
  check('Context Delete uses native RemovePanel',requests.some(r=>r.op==='edit'&&r.command?.kind==='RemovePanel'))

  // Canvas remains the keyboard focus after the native edit. Undo and redo
  // must mutate compiled Rust history, not just repaint the selected shape.
  await page.locator('.cc-board svg').first().click({position:{x:100,y:100}})
  await page.keyboard.press('Meta+z')
  await page.waitForFunction(count=>document.querySelectorAll('.cc-board path[data-panel]').length===count,before,{timeout:15000})
  check('Command-Z invokes native undo',requests.some(r=>r.op==='undo'))
  await page.keyboard.press('Meta+Shift+z')
  await page.waitForFunction(count=>document.querySelectorAll('.cc-board path[data-panel]').length===count-1,before,{timeout:15000})
  check('Command-Shift-Z invokes native redo',requests.some(r=>r.op==='redo'))
  check('No browser exceptions',errors.length===0)
  console.log(JSON.stringify({pass:true,checks,requests:requests.map(r=>r.op),errors,output},null,2))
} catch(error) {
  console.error(JSON.stringify({pass:false,error:error.stack||String(error),checks,requests:requests.map(r=>r.op),errors,output},null,2))
  process.exitCode=1
} finally {
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
