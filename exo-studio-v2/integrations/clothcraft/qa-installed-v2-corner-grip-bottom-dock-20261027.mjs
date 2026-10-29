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
const nativePort=5907,uiPort=5386
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-installed-handle-drag-'))
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
 await Promise.all([ready(native+'/health'),ready(ui)])
 assert((await fetch(ui).then(response=>response.text())).includes('assets/index-B7Ckyvev.js'),'Installed desktop EXO must serve the revised dotted-handle build')
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
 const appUrl=`${ui}/?desktop=1&engine=clothcraft&testSession=installed-dots-in-out-20261027`
 stage='native editor initial load'
 await page.goto(appUrl,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})
 const full2d=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full2d.count())await full2d.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 stage='2D workspace has compact permanent bar without automatic tables'
 const root2d=page.locator('.cc-embedded-root.cc-embedded-2d')
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
 stage='drag floating dots onto highlighted bottom rail'
 async function pointerDrag(from,to){
   await page.mouse.move(from.x,from.y)
   await page.mouse.down()
   await page.mouse.move(to.x,to.y,{steps:18})
   await page.mouse.up()
 }
 const grip=values.locator('[data-exo-widget-grip="true"]')
 const bounds=await grip.boundingBox()
 const rootBounds=await root2d.boundingBox()
 const onRail={x:rootBounds.x+rootBounds.width*.43,y:rootBounds.y+rootBounds.height-15}
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2)
 await page.mouse.down()
 await page.mouse.move(onRail.x,onRail.y,{steps:16})
 assert.equal(await host.getAttribute('data-exo-grade-dock-drag-hover'),'true')
 const preview=await host.evaluate(element=>({
    ghost:getComputedStyle(element,'::before').height,
    line:getComputedStyle(element,'::after').height,
 }))
 assert(parseFloat(preview.ghost)>=140&&preview.line==='6px')
 await page.mouse.up()
 assert.equal(await values.getAttribute('data-docked'),'true')
 assert.equal(await host.locator('[data-exo-grade-bottom-widget="values"]').count(),1)
 stage='use SAME dotted grip to drag embedded table BACK OUT onto canvas'
 const dockGrip=values.locator('[data-exo-widget-grip="true"]')
 const dockRect=await dockGrip.boundingBox()
 await pointerDrag({x:dockRect.x+dockRect.width/2,y:dockRect.y+dockRect.height/2},
  {x:rootBounds.x+rootBounds.width*.6,y:rootBounds.y+rootBounds.height*.42})
 assert.equal(await values.getAttribute('data-docked'),'false')
 assert.equal(await host.locator('[data-exo-grade-bottom-widget="values"]').count(),0)
 stage='second Compare Length table defaults to FLOATING'
 await rail.getByRole('button',{name:'Compare Length'}).click()
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await compare.waitFor({state:'visible'})
 assert.equal(await compare.getAttribute('data-docked'),'false')
 stage='dock compare table with its dotted corner, and dock grading again'
 const compGrip=await compare.locator('[data-exo-widget-grip="true"]').boundingBox()
 await pointerDrag({x:compGrip.x+compGrip.width/2,y:compGrip.y+compGrip.height/2},
   {x:onRail.x+60,y:onRail.y})
 assert.equal(await compare.getAttribute('data-docked'),'true')
 const secondGrip=await values.locator('[data-exo-widget-grip="true"]').boundingBox()
 await pointerDrag({x:secondGrip.x+secondGrip.width/2,y:secondGrip.y+secondGrip.height/2},onRail)
 assert.equal(await values.getAttribute('data-docked'),'true')
 assert.equal(await host.locator('.exo-grade-bottom-widget--docked').count(),2)
 stage='all shared tool widgets open FLOATING and use corner grip'
 await root2d.getByRole('button',{name:'Numeric point editor'}).click()
 const generic=page.locator('[data-clo-floating-widget="numerical-construction"]')
 await generic.waitFor({state:'visible',timeout:10000})
 assert.equal(await generic.getAttribute('data-docked'),'false')
 const genGrip=await generic.locator('[data-exo-widget-grip="true"]').boundingBox()
 await pointerDrag({x:genGrip.x+genGrip.width/2,y:genGrip.y+genGrip.height/2},
  {x:onRail.x+100,y:onRail.y})
 assert.equal(await generic.getAttribute('data-docked'),'true')
 stage='generic tool can be dragged OUT by its dotted corner'
 const embGrip=await generic.locator('[data-exo-widget-grip="true"]').boundingBox()
 console.log(JSON.stringify({stage:'generic docked grip geometry',embGrip,underPointer:await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return {tag:e?.tagName,cls:e?.className,label:e?.getAttribute('aria-label'),parent:e?.parentElement?.className}}, {x:embGrip.x+embGrip.width/2,y:embGrip.y+embGrip.height/2})}))
 await pointerDrag({x:embGrip.x+embGrip.width/2,y:embGrip.y+embGrip.height/2},
  {x:rootBounds.x+rootBounds.width*.56,y:rootBounds.y+rootBounds.height*.42})
 assert.equal(await generic.getAttribute('data-docked'),'false')
 assert.equal(await host.locator('.exo-grade-bottom-widget--docked').count(),2)
 assert.deepEqual(errors,[],'Browser page errors')
 console.log(JSON.stringify({passed:true,realChrome:true,realNativeRust:true,
  installedDesktopBundle:true,defaultFloating:true,visibleCornerGrips:true,dragInGrading:true,dragOutGrading:true,
  dragInCompare:true,sharedToolDragIn:true,sharedToolDragOut:true,
  bluePreview:preview,embeddedTables:2,noBrowserErrors:true,
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
