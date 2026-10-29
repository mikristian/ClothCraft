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
const nativePort=5987,uiPort=5386
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
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=installed-compact-resize-and-insert-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const full=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full.count())await full.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 const inspector=page.getByRole('button',{name:'Expand Object Browser and Property Editor panel'})
 await inspector.waitFor({state:'visible',timeout:10000})
 stage='dock tables side by side'
 const host=page.locator('[data-exo-grade-dock-host="true"]')
 const rail=host.getByRole('toolbar',{name:'2D bottom docking bar'})
 await rail.waitFor({state:'visible'})
 await rail.getByRole('button',{name:'Grading Table'}).click()
 const values=page.locator('[data-exo-grade-bottom-widget="values"]')
 await values.getByRole('button',{name:'Dock Grading Table'}).click()
 await rail.getByRole('button',{name:'Compare Length'}).click()
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await compare.getByRole('button',{name:'Dock Compare Length'}).click()
 assert.equal(await host.locator('.exo-grade-bottom-widget--docked').count(),2)
 const compactHeight=(await host.boundingBox()).height
 assert(compactHeight>=145&&compactHeight<=220,`Default dock should be compact: ${compactHeight}`)
 stage='height handle expands and saves dock footprint'
 const grip=host.locator('[data-exo-bottom-height-grip="true"]')
 await grip.waitFor({state:'visible'})
 const rect=await grip.boundingBox()
 const source={x:rect.x+rect.width/2,y:rect.y+rect.height/2}
 await page.mouse.move(source.x,source.y)
 await page.mouse.down()
 await page.mouse.move(source.x,source.y-45,{steps:3})
 await page.mouse.up()
 const expanded=(await host.boundingBox()).height
 assert(expanded>compactHeight+22,`Vertical drag failed to enlarge dock: ${compactHeight} -> ${expanded}`)
 const saved=await host.evaluate(()=>Number(localStorage.getItem('exo.2d.bottom-dock-height.v5')))
 assert(Math.abs(saved-expanded)<4,`Dock height should persist ${saved} vs ${expanded}`)
 await grip.focus()
 await page.keyboard.press('ArrowDown')
 const shrunk=(await host.boundingBox()).height
 assert(shrunk<expanded-12,`ArrowDown should reduce height: ${expanded} -> ${shrunk}`)
 await grip.dblclick()
 assert(Math.abs((await host.boundingBox()).height-compactHeight)<4)
 stage='blue insertion previews left of an existing widget'
 await page.getByRole('button',{name:'Numeric point editor'}).click()
 const tool=page.locator('[data-clo-floating-widget="numerical-construction"]')
 await tool.waitFor({state:'visible'})
 const title=await tool.locator('.clo-floating-tool-header').boundingBox()
 const tableBox=await values.boundingBox()
 const dockBox=await host.boundingBox()
 const grab={x:title.x+Math.min(80,title.width/3),y:title.y+title.height/2}
 const target={x:tableBox.x+Math.min(26,tableBox.width/5),y:dockBox.y+dockBox.height*.7}
 await page.mouse.move(grab.x,grab.y)
 await page.mouse.down()
 await page.mouse.move(target.x,target.y,{steps:4})
 await page.waitForTimeout(110)
 const blue=await host.evaluate(el=>{
   const marker=el.querySelector('.exo-bottom-dock-live-insert')
   return {hover:el.dataset.exoGradeDockDragHover,marker:!!marker,
      markerIndex:marker?.getAttribute('data-exo-bottom-insert-index'),
      color:marker?getComputedStyle(marker).borderTopColor:null}
 })
 assert.equal(blue.hover,'true','Bottom target should highlight blue while dragging')
 assert.equal(blue.marker,true,'Real insertion slot ghost must render alongside widgets')
 await page.mouse.up()
 assert.equal(await tool.getAttribute('data-docked'),'true','Dropped numeric tool should be embedded')
 assert.equal(await host.locator('.clo-floating-tool--docked').count(),1)
 const toolPos=await tool.boundingBox(),valuesPos=await values.boundingBox()
 assert(toolPos.x<=valuesPos.x+3,'Drop near first panel should insert ahead of it')
 assert.equal(await host.locator('.exo-grade-bottom-widget--docked').count(),2)
 assert.deepEqual(pageErrors,[],'Unexpected runtime errors')
 console.log(JSON.stringify({passed:true,installedDesktopBundle:true,realChrome:true,realRust:true,
  defaultDockPx:compactHeight,expandedDockPx:expanded,keyboardReducedPx:shrunk,
  heightSaved:true,accurateBlueSlotPreview:blue,toolDockedAheadOfTable:true,
  twoExistingTablesPreserved:true,pageErrors:0}))
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
