// Real promotional interaction QA for EXO01. All native workspace requests
// remain on the disposable Rust instance. Production backend is forbidden.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import path from 'node:path'
import {createHash} from 'node:crypto'

const UI=process.env.EXO_STAGE_QA_UI||'http://127.0.0.1:5386'
const PRIVATE='http://127.0.0.1:5689'
const uiHealth=await fetch(UI).catch(()=>null)
assert(uiHealth?.ok,`Vite UI not available at ${UI}`)
const server=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
 cwd:process.cwd(),stdio:'ignore',env:{...process.env,EXO_CLOTHCRAFT_PORT:'5689',
 EXO_CLOTHCRAFT_OUTPUT_DIR:'/tmp/clothcraft-film-stage-qa-20261020',
 EXO_CLOTHCRAFT_REPO:path.join(process.cwd(),'research/oss/clothcraft'),
 EXO_CLOTHCRAFT_SESSION_BIN:path.join(process.cwd(),'research/oss/clothcraft/target/debug/exo-session'),EXO_CLOTHCRAFT_GPU:'0'}})
let privateHealth=null
for(let i=0;i<40;i++){
 privateHealth=await fetch(PRIVATE+'/health').catch(()=>null)
 if(privateHealth?.ok)break
 await new Promise(resolve=>setTimeout(resolve,250))
}
assert(privateHealth?.ok,`Disposable Rust backend at ${PRIVATE} failed to start`)
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
const evidence={ui:UI,backend:PRIVATE,blockedProduction:0,privateRequests:0,steps:[]}
try {
 const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1})
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.port==='5385'){evidence.blockedProduction++;return route.abort('blockedbyclient')}
  if(url.pathname==='/workspace' && url.origin!==PRIVATE){
   evidence.privateRequests++
   return route.continue({url:PRIVATE+url.pathname+url.search()})
  }
  return route.continue()
 })
 const page=await context.newPage()
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(UI+'/?desktop=1&engine=clothcraft&testSession=stage-film-20261020',{waitUntil:'domcontentloaded'})
 const canvas=page.locator('.cc-viewport-3d canvas[data-stage-id]').first()
 await canvas.waitFor({state:'visible',timeout:45000})
 await canvas.click({button:'right',position:{x:125,y:125}})
 assert.equal(await page.getByRole('menuitem',{name:'Remove Stage'}).count(),0,'No stage: removal must not appear')
 evidence.steps.push('Empty 3D canvas right click has no Remove Stage')
 await page.getByRole('button',{name:'Stage',exact:true}).click()
 const card=page.locator('.exo-stage-catalog .exo-stage-card:has([data-stage-id="EXO01"])').first()
 await card.waitFor({state:'visible',timeout:15000})
 await card.hover()
 const hover=page.locator('[data-library-preview="stage:EXO01"]')
 await hover.waitFor({state:'visible',timeout:6000})
 assert.equal(await hover.getAttribute('role'),'dialog')
 evidence.steps.push('Mouse hover EXO01 reveals real Stage enlarged 3D preview dialog')
 await card.click()
 await page.waitForFunction(()=>{
  const c=document.querySelector('.cc-viewport-3d canvas[data-stage-id]')
  return c?.dataset.stageId==='EXO01'&&c.dataset.stageStatus==='ready'&&Number(c.dataset.stageMeshCount)>0
 },null,{timeout:45000})
 const before=await canvas.evaluate(el=>({id:el.dataset.stageId,meshes:+el.dataset.stageMeshCount,viewport:el.getBoundingClientRect().toJSON()}))
 const stagePixels=createHash('sha256').update(await canvas.screenshot()).digest('hex')
 assert.equal(await card.getAttribute('aria-pressed'),'true')
 evidence.steps.push({added:before})
 const rect=await canvas.boundingBox()
 const cx=rect.x+rect.width*.55,cy=rect.y+rect.height*.52
 await page.mouse.move(cx,cy)
 await page.mouse.wheel(0,450)
 await page.waitForTimeout(200)
 await page.mouse.move(cx-100,cy-40)
 await page.mouse.down()
 await page.mouse.move(cx+135,cy+45,{steps:14})
 await page.mouse.up()
 await page.waitForTimeout(300)
 evidence.steps.push('Mouse wheel zoom-out then left-drag orbital camera; stage stays loaded')
 assert.equal(await canvas.getAttribute('data-stage-id'),'EXO01')
 await canvas.click({button:'right',position:{x:Math.round(rect.width*.58),y:Math.round(rect.height*.55)}})
 const remove=page.getByRole('menuitem',{name:'Remove Stage'})
 await remove.waitFor({state:'visible',timeout:5000})
 evidence.steps.push('Real Chromium right-click displays Remove Stage menuitem')
 await remove.click()
 await page.waitForFunction(()=>{
  const c=document.querySelector('.cc-viewport-3d canvas[data-stage-id]')
  return c?.dataset.stageId==='none'&&c.dataset.stageStatus==='none'&&Number(c.dataset.stageMeshCount||0)===0
 },null,{timeout:15000})
 assert.equal(await card.getAttribute('aria-pressed'),'false')
 const emptyPixels=createHash('sha256').update(await canvas.screenshot()).digest('hex')
 assert.notEqual(stagePixels,emptyPixels,'3D canvas image must visibly change when stage disappears')
 evidence.steps.push({removed:{id:await canvas.getAttribute('data-stage-id'),meshes:+await canvas.getAttribute('data-stage-mesh-count')}})
 evidence.visualComparison={stageSha256:stagePixels,emptySha256:emptyPixels,changed:true}
 assert.deepEqual(errors,[],'Client page errors')
 console.log(JSON.stringify({pass:true,...evidence},null,2))
 await context.close()
} finally {await browser.close();server.kill('SIGTERM')}
