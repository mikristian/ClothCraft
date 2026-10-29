// Disposable native session + real Chromium: validates Edit Sewing uses the same
// mouse tool as Segment/Free and performs Rust-backed edits without bottom UI.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {spawn} from 'node:child_process'
import {mkdtempSync,openSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const root=process.cwd(),dir=mkdtempSync(path.join(os.tmpdir(),'exo-edit-sewing-'))
// The bridge allowlists the disposable QA UI on port 5188; keep the UI port
// fixed while isolating each native Rust fixture on an otherwise unused port.
const nativePort=5600+Math.floor(Math.random()*550),uiPort=5188
const api='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort
const children=[]
function launch(exe,args,env,logName){const fd=openSync(path.join(dir,logName),'a');const child=spawn(exe,args,{cwd:root,stdio:['ignore',fd,fd],env:{...process.env,...env}});children.push(child)}
async function ready(url){for(let i=0;i<110;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(800)})).ok)return}catch{}await new Promise(r=>setTimeout(r,200))}throw Error(`Fixture not ready: ${url}`)}
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  EXO_CLOTHCRAFT_OUTPUT_DIR:dir,EXO_CLOTHCRAFT_GPU:'0'},'backend.log')
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:api},'vite.log')
 await Promise.all([ready(api+'/health'),ready(ui+'/')])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']})
 const page=await browser.newPage({viewport:{width:1690,height:1050}});page.setDefaultTimeout(15000)
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=edit-sewing-qa',{waitUntil:'domcontentloaded'})
 const board=page.locator('.cc-board').first()
 await board.locator('[data-panel="front"]').waitFor({timeout:45000})
 const startResponse=await page.request.post(api+'/workspace',{data:{op:'snapshot'}})
 const startData=await startResponse.json()
 const first={ok:startData.ok,seams:startData.data?.template?.seams?.length||0,keys:Object.keys(startData)}
 console.log('Initial native seams',first)
 await page.locator('[data-clo-slot="2d:B01"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.editSewing==='true')
 assert.equal(await board.getAttribute('data-edit-sewing'),'true')
 const initialSelectedSeam=await board.getAttribute('data-selected-native-seam')
 assert(initialSelectedSeam&&initialSelectedSeam.length>0,
  'Edit Sewing must identify a real native pair on activation so 2D, 3D and Property Editor agree')
 assert.equal(await page.locator('[data-native-edit-seam]').getAttribute('data-native-edit-seam'),initialSelectedSeam)
 await page.waitForFunction(()=>{
  const canvas=document.querySelector('.cc-board svg[aria-label^="Metric 2D pattern board"]')
  return canvas&&getComputedStyle(canvas).cursor.includes('sewing-machine.svg')
 },null,{timeout:15000})
 assert.equal(await page.locator('[data-native-seam-editor]').count(),0,'No bottom seam editor in Edit Sewing')
 assert.equal(await page.locator('[data-native-free-sewing-settings]').count(),0)
 const canvas=page.locator('.cc-viewport-3d canvas').first()
 console.log('Edit cursor 3D',await canvas.evaluate(el=>el.dataset.activeToolCursor),'2D',await board.locator('svg[aria-label^="Metric 2D pattern board"]').evaluate(el=>getComputedStyle(el).cursor))
 const guides=board.locator('[data-edit-seam-guide]')
 const guideCount=await guides.count()
 console.log('Edit guide count',await guides.count(),'boundary seam-linked hits',await board.locator('[data-seam-link]').count())
 assert(guideCount>0,'Edit Sewing must display clickable correspondence guides for existing named native seams')
 if(await guides.count()){
  await guides.first().dispatchEvent('click',{bubbles:true})
  console.log('Selected seam after guide click',await page.evaluate(()=>document.querySelector('.cc-board [data-edit-seam-guide]')?.getAttribute('data-edit-seam-guide')))
  const guide=await guides.first().getAttribute('data-edit-seam-guide')
  assert.equal(await board.locator(`[data-edit-seam-guide="${guide}"]`).count()>0,true)
  const loadSeam=async id=>{
   const r=await page.request.post(api+'/workspace',{data:{op:'snapshot'},headers:{'Content-Type':'application/json'}})
   const v=await r.json()
   return v.data?.template?.seams?.find(seam=>seam.id===id)
  }
  const initialSeam=await loadSeam(guide)
  assert.ok(initialSeam,'Existing named native seam must be present')
  const reverse=page.getByRole('checkbox',{name:'Reverse selected sewing direction'})
  await reverse.waitFor({state:'visible'})
  await reverse.dispatchEvent('click',{bubbles:true})
  await page.waitForTimeout(900)
  console.log('Edit checkbox diagnostic',JSON.stringify({
   expected:!initialSeam.reverse_b,
   ui:await reverse.isChecked(),
   native:(await loadSeam(guide))?.reverse_b,
   errors:await page.locator('.cc-error,[role="alert"]').allTextContents(),
   statuses:(await page.locator('[role="status"]').allTextContents()).filter(Boolean).slice(-5),
   pageErrors:errors
  }))
  let editedSeam=null
  for(let i=0;i<50;i++){
   editedSeam=await loadSeam(guide)
   if(editedSeam?.reverse_b!==initialSeam.reverse_b)break
   await page.waitForTimeout(180)
  }
  assert.equal(editedSeam?.reverse_b,!initialSeam.reverse_b,
   'Edit Sewing must save actual native correspondence orientation')
  assert.equal(await page.locator('[data-native-seam-editor]').count(),0)
  console.log('PASS existing seam guide selection, native Edit Sewing orientation change, no bottom form')
 }
 await page.locator('[data-clo-slot="3d:A05"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.editSewing==='true')
 assert.equal(await canvas.evaluate(el=>el.dataset.activeToolCursor),'seam-edit')
 assert.equal(await page.locator('[data-native-seam-editor]').count(),0)
 console.log('PASS 3D Edit Sewing toolbar shares canvas cursor and does not open bottom form')
 await page.locator('[data-clo-slot="2d:B02"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='true')
 assert.equal(await board.getAttribute('data-edit-sewing'),'false')
 await page.waitForFunction(()=>{const board=document.querySelector('.cc-board')
   const canvas=board?.querySelector('svg[aria-label^="Metric 2D pattern board"]')
   return canvas&&board.getAttribute('aria-busy')==='false'&&getComputedStyle(canvas).cursor.includes('sewing-machine.svg')},null,{timeout:12000})
 await page.locator('[data-clo-slot="2d:B03"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewing==='true')
 await page.waitForFunction(()=>{const board=document.querySelector('.cc-board')
   const canvas=board?.querySelector('svg[aria-label^="Metric 2D pattern board"]')
   return canvas&&board.getAttribute('aria-busy')==='false'&&getComputedStyle(canvas).cursor.includes('sewing-machine.svg')},null,{timeout:12000})
 await page.locator('[data-clo-slot="2d:B01"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.editSewing==='true')
 await page.locator('[data-clo-slot="2d:A01"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.editSewing==='false')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,editSewingCursor:true,noBottomWidget:true,segmentAndFreeUnchanged:true,seamGuides:guideCount,pageErrors:errors.length}))
}catch(error){console.error('Edit Sewing QA failed:',error.stack,'\nLogs:',dir);process.exitCode=1}
finally{if(browser)await browser.close();for(const child of children)child.kill('SIGTERM')}
