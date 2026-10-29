// Rust-backed disposable browser acceptance: avatar A18/A17 temporary surface tape.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-avatar-tape-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Rust exo-session binary must exist')
const nativePort=String(5900+Math.floor(Math.random()*150)),uiPort=String(Number(nativePort)+200)
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`,children=[]
function launch(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){for(let i=0;i<140;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}await sleep(200)}throw Error(`Fixture unavailable: ${url}`)}
let browser,closing=false
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:nativePort,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',uiPort,'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1600,height:1050}})
 const errors=[],requests=[]
 page.on('pageerror',error=>errors.push(error.message))
 page.on('request',request=>{if(request.url().includes('/workspace')&&request.method()==='POST'){try{requests.push(request.postDataJSON())}catch{}}})
 await page.route('**/workspace',async route=>{
  try{
   const headers={...route.request().headers()};delete headers.origin
   const response=await route.fetch({url:native+'/workspace',headers})
   if(!closing)await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  }catch(error){if(!closing)throw error}
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft`,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:45000})
 const canvas=page.locator('.cc-scene canvas').first()
 await canvas.waitFor()
 const a18=page.locator('[data-clo-slot="3d:A18"]'),a17=page.locator('[data-clo-slot="3d:A17"]')
 assert.equal(await a18.getAttribute('data-clo-implementation'),'native')
 assert.equal(await a17.getAttribute('data-clo-implementation'),'native')
 await a18.click()
 await page.waitForFunction(()=>document.querySelector('.cc-scene canvas')?.dataset.avatarMeasureMode==='avatar-measure')
 const box=await canvas.boundingBox()
 assert(box?.width>180&&box?.height>180,'Visible canvas bounds')
 const hits=[]
 // Mouse events are real canvas ray picks. Do not seed tape state through JS.
 for(let row=1;row<=17&&hits.length<2;row++)for(let col=1;col<=17&&hits.length<2;col++){
  const x=box.x+box.width*col/18,y=box.y+box.height*row/18
  await page.mouse.click(x,y)
  const n=Number(await canvas.getAttribute('data-avatar-measure-points')||0)
  if(n>hits.length)hits.push({x,y,n})
 }
 assert.equal(hits.length,2,'A18 requires two actual avatar surface click hits; avatar may be occluded')
 const mm=Number(await canvas.getAttribute('data-avatar-measure-mm'))
 assert(Number.isFinite(mm)&&mm>0,`A18 positive avatar distance required; mm=${mm}`)
 assert.match(await page.locator('[data-garment-measure-overlay]').innerText(),/Avatar.*mm/)
 await a17.click()
 await page.waitForFunction(()=>document.querySelector('.cc-scene canvas')?.dataset.avatarMeasureMode==='avatar-measure-edit')
 assert.equal(Number(await canvas.getAttribute('data-avatar-measure-points')),0,'Switch to edit resets tape')
 for(const {x,y} of hits)await page.mouse.click(x,y)
 assert.equal(Number(await canvas.getAttribute('data-avatar-measure-points')),2,'A17 can pick both avatar points')
 const before=Number(await canvas.getAttribute('data-avatar-measure-mm'))
 // Verify pointer drag interaction while pressed, dragging between two proven avatar hits.
 await page.mouse.move(hits[0].x,hits[0].y)
 await page.mouse.down()
 await page.mouse.move(hits[1].x,hits[1].y,{steps:6})
 await page.mouse.up()
 const after=Number(await canvas.getAttribute('data-avatar-measure-mm'))
 assert(Number.isFinite(after)&&after>=0,'A17 produces finite distance after drag')
 assert.notEqual(after,before,'A17 drag must actually update the endpoint distance')
 await page.keyboard.press('Escape')
 assert.equal(await canvas.getAttribute('data-avatar-measure-points'),'0','Escape clears avatar tape')
 await page.mouse.click(hits[0].x,hits[0].y)
 assert.equal(await canvas.getAttribute('data-avatar-measure-points'),'1')
 await page.locator('[data-clo-slot="3d:A02"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-scene canvas')?.dataset.avatarMeasureMode==='off')
 assert.equal(await canvas.getAttribute('data-avatar-measure-points'),'0','Switching tool clears avatar tape')
 assert(requests.some(request=>request.op==='snapshot'),'No Rust native session snapshot found')
 assert.deepEqual(errors,[],'Browser runtime errors')
 console.log('PASS native avatar A17/A18 temporary tape',JSON.stringify({hits,mm,before,after,errors,requests:requests.length,output}))
}finally{
 closing=true
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
