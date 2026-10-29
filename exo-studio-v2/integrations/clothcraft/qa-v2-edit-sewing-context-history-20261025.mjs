// Disposable real-Chrome regression for Edit Sewing right-click actions and Rust history.
// Existing native binary only: no cargo, package install or saved project mutation.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {spawn} from 'node:child_process'
import {mkdtempSync, openSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import net from 'node:net'
import {setTimeout as sleep} from 'node:timers/promises'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const dir=mkdtempSync(path.join(os.tmpdir(),'exo-edit-seam-context-'))
const children=[]
const pageErrors=[]
const requests=[]
const server=async()=>new Promise((resolve,reject)=>{
 const sock=net.createServer()
 sock.once('error',reject)
 sock.listen(0,'127.0.0.1',()=>{
  const port=sock.address().port
  sock.close(()=>resolve(port))
 })
})
const nativePort=await server()
// Bridge accepts the existing QA origin (5188); ensure no other process owns it.
const uiPort=5188
const api=`http://127.0.0.1:${nativePort}`
const ui=`http://127.0.0.1:${uiPort}`
async function assertPortFree(port){return new Promise((resolve,reject)=>{
 const sock=net.createServer()
 sock.once('error',error=>reject(new Error(`UI port ${port} occupied; refusing to test against another session: ${error.code}`)))
 sock.listen(port,'127.0.0.1',()=>sock.close(resolve))
})}
function launch(executable,args,env,log){
 const fd=openSync(path.join(dir,log),'a')
 const child=spawn(executable,args,{cwd:root,env:{...process.env,...env},stdio:['ignore',fd,fd]})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<100;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(700)})).ok)return}catch{}
  await sleep(200)
 }
 throw new Error(`Fixture not ready: ${url}; logs: ${dir}`)
}
async function readSnapshot(){
 const response=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})
 const payload=await response.json()
 assert(payload.ok,payload.error||'Native snapshot failed')
 return payload.data
}
async function untilSeam(id,predicate,label){
 for(let i=0;i<70;i++){
  const state=await readSnapshot()
  const seam=state.template?.seams?.find(row=>row.id===id)
  if(predicate(seam,state))return {seam,state}
  await sleep(150)
 }
 throw new Error(`Native seam failed to reach ${label}; ${id}; log ${dir}`)
}
let browser
try{
 await assertPortFree(uiPort)
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:dir,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')
 },'native.log')
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:api
 },'ui.log')
 await Promise.all([ready(api+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']})
 const page=await browser.newPage({viewport:{width:1690,height:1050}})
 page.setDefaultTimeout(15000)
 page.on('pageerror',error=>pageErrors.push(error.message))
 // Intercept the live browser endpoint so the UI always edits this fixture.
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const request=route.request().postDataJSON()
  requests.push(request)
  const response=await route.fetch({url:api+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=edit-seam-context',{waitUntil:'domcontentloaded'})
 const board=page.locator('.cc-board').first()
 await board.locator('[data-panel="front"]').waitFor({timeout:45000})
 await page.locator('[data-clo-slot="2d:B01"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.editSewing==='true')
 const guides=board.locator('[data-edit-seam-guide]')
 await guides.first().waitFor({state:'attached',timeout:30000})
 const seamId=await guides.first().getAttribute('data-edit-seam-guide')
 const before=await readSnapshot()
 const original=before.template.seams.find(seam=>seam.id===seamId)
 assert(original,`Guide ${seamId} must resolve to actual Rust seam`)
 assert((await guides.count())>0,'Native sewing guides must render in Edit Sewing')
 const guide=board.locator('[data-edit-seam-guide]').first()
 // Dispatch on the real SVG target; unlike coordinate clicks this is insensitive
 // to preview intersections while exercising the actual right-click handler.
 await guide.dispatchEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:740,clientY:380})
 const menu=page.getByRole('menu',{name:'2D pattern context actions'})
 await menu.waitFor({state:'visible'})
 assert.match(await menu.innerText(),new RegExp(`Edit Sewing · ${seamId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`))
 await menu.getByRole('menuitem',{name:original.reverse_b?'Unreverse second edge':'Reverse second edge'}).click()
 const flipped=await untilSeam(seamId,seam=>seam?.reverse_b===!original.reverse_b,'native orientation flip')
 assert.deepEqual(flipped.seam.a,original.a)
 assert.deepEqual(flipped.seam.b,original.b)
 assert(requests.some(request=>request.op==='edit-seam'&&request.seam===seamId),'Context edit must send Rust edit-seam')
 // Use the context-menu action for removal; native Undo/Redo act on the same disposable session.
 await page.waitForFunction(id=>{
  const board=document.querySelector('.cc-board')
  return board?.dataset.editSewing==='true'&&board.querySelector(`[data-edit-seam-guide="${id}"]`)
 },seamId)
 await board.locator(`[data-edit-seam-guide="${seamId}"]`).first().dispatchEvent('contextmenu',{
  bubbles:true,cancelable:true,button:2,clientX:740,clientY:380
 })
 await menu.waitFor({state:'visible'})
 page.once('dialog',dialog=>dialog.accept())
 await menu.getByRole('menuitem',{name:'Remove selected sewing relationship'}).click()
 const removed=await untilSeam(seamId,seam=>!seam,'remove')
 assert.equal(removed.state.template.seams.length,flipped.state.template.seams.length-1)
 assert(requests.some(request=>request.command?.kind==='RemoveSeam'&&request.command.seam===seamId),
  'Context removal must send native Rust RemoveSeam')
 async function history(op){
  const state=await readSnapshot()
  const response=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({op,revision:state.revision})})
  const result=await response.json()
  assert(result.ok,`Rust ${op} failed: ${result.error}`)
  return result.data
 }
 const undoRemoval=await history('undo')
 assert.deepEqual(undoRemoval.template.seams.find(seam=>seam.id===seamId),flipped.seam)
 const undoEdit=await history('undo')
 assert.deepEqual(undoEdit.template.seams.find(seam=>seam.id===seamId),original)
 const redoEdit=await history('redo')
 assert.deepEqual(redoEdit.template.seams.find(seam=>seam.id===seamId),flipped.seam)
 const redoRemoval=await history('redo')
 assert.equal(redoRemoval.template.seams.some(seam=>seam.id===seamId),false)
 assert.deepEqual(pageErrors,[])
 console.log(JSON.stringify({pass:true,guide:seamId,initialSeams:before.template.seams.length,
  rightClick:true,nativeEdit:true,nativeRemove:true,undoEdit:true,undoRemove:true,redoEdit:true,redoRemove:true,
  pageErrors,logDirectory:dir}))
}catch(error){
 console.error('FAIL Edit Sewing context and history:',error.stack,'\nFixture logs:',dir)
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)child.kill('SIGTERM')
}
