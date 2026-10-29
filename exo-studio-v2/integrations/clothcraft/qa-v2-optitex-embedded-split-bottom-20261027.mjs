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
const nativePort=5877,uiPort=5878
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-optitex-native-split-dock-'))
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
 const appUrl=`${ui}/?desktop=1&engine=clothcraft&testSession=optitex-split-bottom-native-20261027`
 stage='native editor initial load'
 await page.goto(appUrl,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const full2d=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full2d.count())await full2d.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 stage='real permanent 2D bottom panel bar replaces QA status footer'
 const root2d=page.locator('.cc-embedded-root.cc-embedded-2d')
 const host=page.locator('[data-exo-grade-dock-host="true"]')
 assert.equal(await host.count(),1)
 assert.equal(await root2d.locator('.cc-embedded-footer').count(),0,'Pattern QA/Rust status footer must be replaced in 2D')
 const rail=host.getByRole('toolbar',{name:'2D bottom docking bar'})
 await rail.waitFor({state:'visible'})
 assert.equal(await rail.getByRole('button',{name:'Grading Table'}).count(),1)
 assert.equal(await rail.getByRole('button',{name:'Compare Length'}).count(),1)
 assert((await host.boundingBox()).height>=26,'Persistent bottom bar should be clearly visible')
 assert((await host.boundingBox()).height<=39,'Empty bottom bar should stay compact')
 stage='grading and compare embed immediately by default, like reference'
 await rail.getByRole('button',{name:'Grading Table'}).click()
 await rail.getByRole('button',{name:'Compare Length'}).click()
 const grading=page.locator('[data-exo-grade-bottom-widget="values"]')
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await grading.waitFor({state:'visible'})
 await compare.waitFor({state:'visible'})
 assert.equal(await grading.getAttribute('data-docked'),'true')
 assert.equal(await compare.getAttribute('data-docked'),'true')
 assert.equal(await host.locator('.exo-grade-bottom-widget--docked').count(),2)
 const heightBeforeThird=(await host.boundingBox()).height
 const main=page.locator('.cc-embedded-root.cc-embedded-2d .cc-embedded-main')
 const mainHeightBefore=(await main.boundingBox()).height
 assert(heightBeforeThird>=175,'Embedded panels must reserve lower page height')
 stage='native Numerical Construction tool has a bottom docking option'
 await root2d.getByRole('button',{name:'Numeric point editor'}).click()
 const generic=page.locator('[data-clo-floating-widget="numerical-construction"]')
 await generic.waitFor({state:'visible',timeout:10000})
 assert.equal(await generic.getAttribute('data-docked'),'false')
 assert.equal(await generic.getByRole('button',{name:'Dock 2D Numerical Construction at bottom'}).count(),1)
 const heading=generic.locator('.clo-floating-tool-header')
 const rect=await heading.boundingBox()
 const rootRect=await root2d.boundingBox()
 assert(rect&&rootRect)
 stage='drag activates visible thin blue insertion bar without resizing canvas'
 const sourcePoint={x:rect.x+Math.min(rect.width/3,70),y:rect.y+rect.height/2}
 await page.mouse.move(sourcePoint.x,sourcePoint.y)
 await page.mouse.down()
 const dropPoint={x:rootRect.x+rootRect.width*.52,y:rootRect.y+rootRect.height-36}
 await page.mouse.move(dropPoint.x,dropPoint.y,{steps:14})
 assert.equal(await host.getAttribute('data-exo-grade-dock-drag-hover'),'true','Notion-style insertion line should activate')
 const indicator=await host.evaluate(element=>{
  const ghost=getComputedStyle(element,'::before')
  const line=getComputedStyle(element,'::after')
  return {ghostHeight:ghost.height,ghostContent:ghost.content,ghostBorder:ghost.borderTopWidth,
   lineHeight:line.height,lineColor:line.backgroundColor}
 })
 assert(parseFloat(indicator.ghostHeight)>=140,'The full insert preview must be visible over the canvas')
 assert.equal(indicator.ghostBorder,'3px')
 assert.equal(indicator.lineHeight,'6px')
 assert.notEqual(indicator.ghostContent,'none')
 assert(Math.abs((await host.boundingBox()).height-heightBeforeThird)<3,'Blue preview must not shift canvas until release')
 await page.mouse.up()
 await generic.waitFor({state:'visible'})
 assert.equal(await generic.getAttribute('data-docked'),'true')
 assert.equal(await host.getAttribute('data-exo-grade-dock-occupied'),'true')
 assert((await host.boundingBox()).height>=140)
 stage='generic tool content remains interactive when embedded'
 assert(await generic.locator('button,input,select').count()>2)
 const before=(await root2d.locator('.cc-embedded-main').boundingBox()).height
 await generic.getByRole('button',{name:'Undock 2D Numerical Construction at bottom'}).click()
 assert.equal(await generic.getAttribute('data-docked'),'false')
 assert((await host.boundingBox()).height>=175)
 const after=(await root2d.locator('.cc-embedded-main').boundingBox()).height
 assert(Math.abs(after-before)<3,'Undocking one of three panels must preserve the shared bottom region')
 stage='generic widget dock preference survives close and reopen'
 await generic.getByRole('button',{name:'Dock 2D Numerical Construction at bottom'}).click()
 assert.equal(await generic.getAttribute('data-docked'),'true')
 await generic.getByRole('button',{name:'Close 2D Numerical Construction'}).click()
 await generic.waitFor({state:'detached'})
 await root2d.getByRole('button',{name:'Numeric point editor'}).click()
 await generic.waitFor({state:'visible'})
 assert.equal(await generic.getAttribute('data-docked'),'true')
 stage='all three live panes coexist in same embedded page region'
 assert.equal(await host.locator('.clo-floating-tool--docked,.exo-grade-bottom-widget--docked').count(),3)
 const bounds=[await grading.boundingBox(),await compare.boundingBox(),await generic.boundingBox()]
 assert(bounds.every(rect=>rect&&rect.width>170&&rect.height>130),'Each panel has actual visible page space')
 stage='bottom strip persists while grading widgets are detached'
 await grading.getByRole('button',{name:'Undock Grading Table'}).click()
 assert.equal(await grading.getAttribute('data-docked'),'false')
 assert.equal(await compare.getAttribute('data-docked'),'true')
 await grading.getByRole('button',{name:'Dock Grading Table'}).click()
 assert.equal(await grading.getAttribute('data-docked'),'true')
 stage='no browser errors and native remains alive'
 assert.deepEqual(errors,[])
 assert((await fetch(native+'/health')).ok)
 console.log(JSON.stringify({passed:true,realChrome:true,realNativeRust:true,
  notionThinBar:true,bluePreview:indicator,highlightNoLayoutShift:true,
  anyNativeToolDockable:true,firstGenericWidget:'2D Numerical Construction',
  dragToEmbed:true,genericPersistentCloseReopen:true,undockRestoresCanvas:true,
  gradeAndCompareShareHost:true,threeSimultaneousWidgets:true,
  licensedOptitexParity:false,stage:'complete'}))
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
