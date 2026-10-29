// Reference: Screenshot 2026-10-17 at 5.16.21 PM.
// Disposable browser + Vite, no changes to the user's local garment project.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-draft-guide-'))
mkdirSync(output,{recursive:true})
const port=5968,url=`http://127.0.0.1:${port}`
const vite=spawn(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port),'--strictPort'],{
 cwd:root,detached:true,stdio:'ignore',env:{...process.env,VITE_CLOTHCRAFT_BRIDGE_URL:'http://127.0.0.1:65521'},
})
let browser
try{
 let ready=false
 for(let i=0;i<80;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok){ready=true;break}}catch{}
  await pause(200)
 }
 assert(ready,'Vite server not ready')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1710,height:1060},deviceScaleFactor:1})
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 // The explicit tee fixture selects Foundation Tee with actual matched notches
 // and double hem construction; its headless browser profile is disposable.
 await page.goto(url+'/?desktop=1&testSession=tee',{waitUntil:'domcontentloaded'})
 await page.locator('.pattern-piece[data-piece-id="front"]').waitFor({timeout:25000})
 await page.locator('.three-mount canvas').first().waitFor({timeout:25000})
 const torso=[]
 for(const id of ['front','back']){
  const group=page.locator(`[data-piece-id="${id}"]`)
  assert.equal(await group.locator(`[data-draft-center-guide="${id}"] .bodice-center-guide`).count(),1)
  for(const level of ['chest','stomach'])assert.equal(await group.locator(`[data-draft-measure-guide="${id}-${level}"] line`).count(),1)
  assert.equal(await group.locator('[data-draft-armhole-notch] line').count(),id==='front'?2:4)
  const hem=group.locator(`[data-draft-hem-stitch="${id}"]`)
  assert.equal(await hem.locator('polyline').count(),2,`${id} must have two stitch lines`)
  const color=await group.locator('.bodice-center-guide').evaluate(node=>getComputedStyle(node).stroke)
  assert.notEqual(color,'rgb(0, 0, 0)','Center guide must be visible')
  torso.push({id,center:true,chest:true,stomach:true,notches:id==='front'?2:4,hemRows:2,centerColor:color})
 }
 for(const id of ['sleeve-left','sleeve-right']){
  const group=page.locator(`[data-piece-id="${id}"]`)
  assert.equal(await group.locator('[data-draft-armhole-notch] line').count(),3)
  assert.equal(await group.locator(`[data-draft-hem-stitch="${id}"] polyline`).count(),2)
 }
 const canvas=page.locator('.three-mount canvas').first()
 await page.waitForFunction(()=>Number(document.querySelector('.three-mount canvas')?.dataset.preSimulationTorsoDepthMm)>30,null,{timeout:15000})
 const depth=Number(await canvas.getAttribute('data-pre-simulation-torso-depth-mm'))
 const curvedPanels=Number(await canvas.getAttribute('data-pre-simulation-curved-panel-count'))
 assert(depth>30,`Expected visible semi-curved reset torso, got ${depth}mm`)
 assert(curvedPanels>=2,`Expected curved torso panels, got ${curvedPanels}`)
 await page.locator('.pattern-canvas').screenshot({path:path.join(output,'pattern-guides.png')})
 await canvas.screenshot({path:path.join(output,'unsimulated-curved-tee.png')})
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,torso,sleeves:2,hemRows:2,resetTorsoDepthMm:depth,curvedPanels,pageErrors:0,output},null,2))
}finally{
 await browser?.close().catch(()=>{})
 try{process.kill(-vite.pid,'SIGTERM')}catch{}
}
