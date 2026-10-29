/** Isolated native/Chrome acceptance for floating readability and nested grading toolbar. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5977,uiPort=5386
const native='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort
const output=mkdtempSync(path.join(tmpdir(),'exo-nested-grading-ui-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Existing Rust native session binary required')
const services=[]
function launch(cmd,args,env={}){
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 services.push(child)
}
async function ready(url){
 for(let i=0;i<100;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}
  await sleep(200)
 }
 throw Error('Test service unavailable: '+url)
}
let stage='start',browser,page
const pageErrors=[]
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0',
 })
 await Promise.all([ready(native+'/health'),ready(ui)])
 assert((await fetch(ui).then(r=>r.text())).includes('assets/index-DhaurwBJ.js'),'Actual installed EXO bundle required')
 const response=await (await fetch(native+'/workspace',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',preset:'tshirt'})})).json()
 assert(response.ok,'Native T-shirt preset failed')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1660,height:1050}})
 page.on('pageerror',error=>pageErrors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const result=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response:result,headers:{...result.headers(),'access-control-allow-origin':ui}})
 })
 stage='2D entry and native inspector collapsed'
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=installed-nested-grading-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const full=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full.count())await full.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 const inspector=page.getByRole('button',{name:'Expand Object Browser and Property Editor panel'})
 await inspector.waitFor({state:'visible',timeout:10000})
 stage='floating grading worksheets retain readable dimensions'
 await page.getByRole('button',{name:'Open compact movable Grading Table'}).click()
 await page.getByRole('button',{name:'Open compact movable Compare Length'}).click()
 const values=page.locator('[data-exo-grade-bottom-widget="values"]')
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await values.waitFor({state:'visible'})
 await compare.waitFor({state:'visible'})
 const valueSize=await values.boundingBox(),compareSize=await compare.boundingBox()
 assert(valueSize?.width>=500&&valueSize?.height>=300,'Floating Grading Table is still too small')
 assert(compareSize?.width>=570&&compareSize?.height>=300,'Floating Compare Length is still too small')
 const cellFont=await values.locator('table tbody td').first().evaluate(node=>parseFloat(getComputedStyle(node).fontSize))
 assert(cellFont>=12,'Floating grade table text is too small: '+cellFont)
 stage='toolbar nested inside Grading Table'
 await values.getByRole('button',{name:'Embed Grading Toolbar in Grading Table'}).click()
 const toolbar=page.locator('[data-clo-floating-widget="grading-quick-toolbar"]')
 await toolbar.waitFor({state:'visible'})
 const placement=toolbar.getByRole('combobox',{name:'Grading toolbar placement'})
 assert.equal(await toolbar.getAttribute('data-embedded-in'),'values')
 assert.equal(await values.locator('[data-exo-grade-toolbar-slot="true"] .clo-floating-tool--nested').count(),1)
 assert.equal(await toolbar.locator('.exo-quick-grade__grid button').count(),12)
 assert((await toolbar.boundingBox()).height<115,'Nested grading toolbar should be compact')
 stage='move toolbar directly into Compare Length'
 await placement.selectOption('compare')
 assert.equal(await toolbar.getAttribute('data-embedded-in'),'compare')
 assert.equal(await compare.locator('[data-exo-grade-toolbar-slot="true"] .clo-floating-tool--nested').count(),1)
 assert.equal(await values.locator('.clo-floating-tool--nested').count(),0)
 stage='detach and preserve inspector state'
 await placement.selectOption('floating')
 assert.equal(await toolbar.getAttribute('data-embedded-in'),'')
 assert((await toolbar.boundingBox()).width<=540,'Floating quick grading bar too wide')
 stage='repeat widget embed action after detaching'
 await values.getByRole('button',{name:'Embed Grading Toolbar in Grading Table'}).click()
 await page.waitForFunction(()=>document.querySelector('[data-clo-floating-widget="grading-quick-toolbar"]')?.dataset.embeddedIn==='values')
 await toolbar.getByRole('button',{name:'Prev point'}).click()
 assert(await inspector.isVisible(),'Grading palette interaction unexpectedly expanded Object Browser')
 assert.deepEqual(pageErrors,[],'Unexpected browser runtime errors')
 console.log(JSON.stringify({passed:true,realChrome:true,realRust:true,
  floatingWidths:[valueSize.width,compareSize.width],floatingCellFontPx:cellFont,
  nestedInBothWorksheets:true,repeatEmbedWorks:true,toolbarCommands:12,inspectorStayedCollapsed:true}))
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
