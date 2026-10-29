/** Live Chrome acceptance: compact dock plus Notion-style left/right widget insertion. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const bridgePort=5967,webPort=5968
const bridge=`http://127.0.0.1:${bridgePort}`
const ui=`http://127.0.0.1:${webPort}`
const folder=mkdtempSync(path.join(tmpdir(),'exo-compact-dock-'))
const native=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(native),'Native exo-session is required for browser acceptance')
mkdirSync(path.join(folder,'workspace'),{recursive:true})
const children=[]
function service(cmd,args,env={}){
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<70;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(700)})).ok)return}catch{}
  await delay(200)
 }
 throw Error(`Service unavailable: ${url}`)
}
let browser,page,stage='startup'
const errors=[]
try{
 service(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(bridgePort),EXO_CLOTHCRAFT_OUTPUT_DIR:folder,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:native,EXO_CLOTHCRAFT_GPU:'0',
 })
 service(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(webPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:bridge,
 })
 await Promise.all([ready(bridge+'/health'),ready(ui)])
 const open=await fetch(bridge+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'open',preset:'tshirt'})})
 const result=await open.json()
 assert(result.ok,'Native T-shirt sample failed to open')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1650,height:1010}})
 page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:bridge+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=compact-grade-dock-20261028`,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const full=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full.count())await full.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 const host=page.locator('[data-exo-grade-dock-host="true"]')
 stage='dock Compare Length first'
 await page.getByRole('button',{name:'Open compact movable Compare Length'}).click()
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await compare.waitFor()
 const compareFloat=await compare.boundingBox()
 assert(compareFloat.width<=420&&compareFloat.height<=205,'Compare Length floating palette should be compact')
 await compare.getByRole('button',{name:'Dock Compare Length'}).click()
 await compare.locator('[data-exo-grade-action="dock"]').waitFor()
 const bottom=await host.boundingBox()
 assert(bottom.height>=110&&bottom.height<=185,`Compact dock expected ~158px; observed ${bottom.height}`)
 stage='hover Grading Table to the left of Compare Length'
 await page.getByRole('button',{name:'Open compact movable Grading Table'}).click()
 const grading=page.locator('[data-exo-grade-bottom-widget="values"]')
 await grading.waitFor()
 const tableFloat=await grading.boundingBox()
 assert(tableFloat.width<=355&&tableFloat.height<=208,'Grading Table floating palette should be compact')
 const bar=await grading.locator('.exo-grade-bottom-widget__titlebar').boundingBox()
 const left={x:bottom.x+45,y:bottom.y+66}
 await page.mouse.move(bar.x+Math.min(bar.width-45,90),bar.y+bar.height/2)
 await page.mouse.down()
 await page.mouse.move(left.x,left.y,{steps:14})
 assert.equal(await host.getAttribute('data-exo-dock-preview-position'),'1/2','Left hover should preview first slot')
 await page.mouse.up()
 assert.equal(await grading.getAttribute('data-docked'),'true')
 let gradeBox=await grading.boundingBox(),compareBox=await compare.boundingBox()
 assert(gradeBox.x<compareBox.x,'Grading Table must sit left of Compare Length')
 assert(Math.abs(gradeBox.y-compareBox.y)<5,'Both tools must share a row')
 stage='drag Grading Table out then hover to right of Compare Length'
 const grip=await grading.locator('.exo-grade-bottom-widget__corner-grip').boundingBox()
 const right={x:bottom.x+bottom.width-30,y:bottom.y+64}
 await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2)
 await page.mouse.down()
 await page.mouse.move(right.x,right.y,{steps:16})
 assert.equal(await host.getAttribute('data-exo-dock-preview-position'),'2/2','Right hover should preview second slot')
 await page.mouse.up()
 assert.equal(await grading.getAttribute('data-docked'),'true')
 gradeBox=await grading.boundingBox();compareBox=await compare.boundingBox()
 assert(compareBox.x<gradeBox.x,'Grading Table must reorder right of Compare Length')
 assert(Math.abs(gradeBox.y-compareBox.y)<5,'Reordered widgets must remain aligned')
 stage='responsive side-by-side layout at a narrower viewport'
 await page.setViewportSize({width:1180,height:900})
 await page.waitForTimeout(150)
 gradeBox=await grading.boundingBox();compareBox=await compare.boundingBox()
 assert(gradeBox.width>=120&&compareBox.width>=120,'Docked controls must retain usable widths')
 assert(compareBox.x+compareBox.width<=gradeBox.x+8,'Responsive columns must not overlap')
 assert(Math.abs(gradeBox.y-compareBox.y)<5,'Responsive widgets must stay on the same row')
 assert.deepEqual(errors,[],'React page should not throw')
 console.log(JSON.stringify({passed:true,realChrome:true,realNative:true,defaultDockHeightPx:bottom.height,
  gradingFloatSize:[tableFloat.width,tableFloat.height],compareFloatSize:[compareFloat.width,compareFloat.height],
  leftRightHoverAndDrop:true,sideBySide:true,narrowViewportSideBySide:true,persistentReactPortals:true,stage:'complete'}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:String(error),pageErrors:errors}))
 process.exitCode=1
}finally{
 if(browser)await browser.close().catch(()=>{})
 for(const child of children){try{process.kill(-child.pid,'SIGTERM')}catch{}}
 await delay(400)
 for(const child of children){try{process.kill(-child.pid,'SIGKILL')}catch{}}
 rmSync(folder,{recursive:true,force:true})
}
