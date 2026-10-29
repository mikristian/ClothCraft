// Disposable native Rust + Vite + Chrome audit for both CLO-inspired corner rails.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync,writeFileSync,copyFileSync} from 'node:fs'
import path from 'node:path'
import {tmpdir,homedir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-clo-corner-hover-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const fixture=path.join(homedir(),'Library/Application Support/EXO-ClothCraft-Studio/Snapshots/V1-20261016')
for(const filename of ['fitting-project.json','fitting-project.json.native']) {
 const file=path.join(fixture,filename)
 if(existsSync(file))copyFileSync(file,path.join(output,'workspace',filename))
}
const rust=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(rust),'Missing disposable Rust session binary')
// The bridge deliberately permits only known localhost UI origins.
const port=5521,webPort=5284,api=`http://127.0.0.1:${port}`,ui=`http://127.0.0.1:${webPort}`
const processes=[],results=[],errors=[]
function start(binary,args,env={}) {
 const proc=spawn(binary,args,{cwd:root,env:{...process.env,...env},stdio:'ignore',detached:true})
 processes.push(proc)
 return proc
}
async function ready(url) {
 for(let i=0;i<120;i++) {
  try {if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return} catch {}
  if(processes.some(p=>p.exitCode!==null))throw Error('Disposable server exited')
  await sleep(250)
 }
 throw Error('Server timed out: '+url)
}
function check(label,fn) {return fn().then(()=>results.push({label,ok:true}),error=>{results.push({label,ok:false,error:error.message});console.error('FAIL',label,error.message)})}
let browser
try {
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:rust,EXO_CLOTHCRAFT_GPU:'0'})
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(webPort),'--strictPort'],
  {VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([ready(api+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const context=await browser.newContext({viewport:{width:1728,height:1040},serviceWorkers:'block'})
 const page=await context.newPage()
 await page.route('**/*',route=>route.continue({headers:{...route.request().headers(),'cache-control':'no-cache','pragma':'no-cache'}}))
 const assets=[]
 page.on('response',r=>{if(r.url().startsWith(ui+'/'))assets.push({url:r.url(),status:r.status(),type:r.headers()['content-type']})})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(ui+'/?desktop=1&engine=clothcraft&qaFresh='+Date.now(),{waitUntil:'domcontentloaded'})
 const pageHTML=await page.content()
 assert(pageHTML.includes('/@vite/client'),'Expected live Vite development entry /@vite/client, received a static or stale HTML frontend')
 const viteClient=await page.request.get(ui+'/@vite/client')
 assert(viteClient.ok()&&(await viteClient.text()).includes('vite'),'Vite client script missing from test origin')
 await page.screenshot({path:path.join(output,'startup-debug.png')})
 console.log('Startup',output,(await page.locator('body').innerText()).slice(0,800))
 try {await page.getByRole('toolbar',{name:'2D viewport quick tools'}).waitFor({timeout:12000})}
 catch(error){
  const evidence={output,stage:'startup',error:error.message,body:(await page.locator('body').innerText()).slice(0,1700),pageErrors:errors,assets:assets.slice(0,35),selectors:await page.evaluate(()=>Object.fromEntries(['.cc-board','.cc-scene','.cc-corner-tool-host','.clo-corner-toolkit','[role="toolbar"]'].map(selector=>[selector,[...document.querySelectorAll(selector)].map(el=>({html:el.outerHTML.slice(0,300),visible:!!el.getClientRects().length}))])))}
  writeFileSync(path.join(output,'results.json'),JSON.stringify(evidence,null,2))
  console.error('BLOCKED: native startup did not render corner controls',JSON.stringify(evidence))
  throw error
 }
 const detail=[]
 for(const {dimension,hostSelector,count,family,alternative,expectedMode} of [
  {dimension:'2D',hostSelector:'.cc-board',count:8,family:'Draw New Polygon Pattern',alternative:'Internal Line / Dart',expectedMode:'line'},
  {dimension:'3D',hostSelector:'.cc-scene',count:5,family:'Select / Move',alternative:'Rotate',expectedMode:'rotate3d'},
 ]) {
  const host=page.locator(hostSelector),rail=host.getByRole('toolbar',{name:`${dimension} viewport quick tools`})
  await check(`${dimension} corner vertical rail and ${count} groups`,async()=>{
   assert.equal(await rail.count(),1)
   assert.equal(await rail.locator('.clo-corner-tool-group > button').count(),count)
   const layout=await rail.evaluate(el=>{
    const rect=el.getBoundingClientRect(),parent=el.closest('.cc-board,.cc-scene').getBoundingClientRect()
    return {x:rect.x-parent.x,y:rect.y-parent.y,flex:getComputedStyle(el).flexDirection,width:rect.width,height:rect.height}
   })
   detail.push({dimension,layout})
   assert.equal(layout.flex,'column')
   assert(layout.x>=0&&layout.x<30&&layout.y>=0&&layout.y<30,JSON.stringify(layout))
   assert(layout.height>layout.width*2)
   for(const box of await rail.locator('.clo-corner-tool-group > button').evaluateAll(els=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))))
    assert(Math.abs(box.w-30)<1&&Math.abs(box.h-30)<1,JSON.stringify(box))
  })
  const group=rail.locator(`.clo-corner-tool-group[data-tool-family="${dimension==='2D'?'polygon':'transform'}"]`)
  const trigger=group.locator('> button').first(),flyout=group.getByRole('group',{name:`${family} alternatives`})
  await check(`${dimension} right-facing horizontal hover and 30px alternatives`,async()=>{
   assert.equal(await flyout.isVisible(),false)
   await trigger.hover()
   assert.equal(await flyout.isVisible(),true)
   const g=await flyout.evaluate(el=>{
    const r=el.getBoundingClientRect(),button=el.parentElement.firstElementChild.getBoundingClientRect()
    return {left:r.left-button.right,top:r.top-button.top,flex:getComputedStyle(el).flexDirection,options:[...el.children].map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}))}
   })
   detail.push({dimension,flyout:g})
   assert(g.left>=-3&&g.left<8&&Math.abs(g.top)<12,JSON.stringify(g))
   assert.equal(g.flex,'row')
   assert(g.options.length>=2)
   assert(g.options.every(x=>Math.abs(x.w-30)<1&&Math.abs(x.h-30)<1))
   await page.screenshot({path:path.join(output,`clo-corner-${dimension.toLowerCase()}-hover.png`)})
  })
  await check(`${dimension} pointer traverses into flyout and chooses alternative`,async()=>{
   await trigger.hover()
   const alt=flyout.getByRole('button',{name:alternative,exact:true})
   assert.equal(await alt.isVisible(),true)
   await alt.hover()
   assert.equal(await flyout.isVisible(),true)
   await alt.click()
   assert.equal(await group.getAttribute('data-current-tool'),dimension==='2D'?'internal':'rotate')
   assert(await group.locator('> button .cad-tool-icon').count()>=1,'Chosen option should display a family icon')
   assert((await trigger.getAttribute('title')).includes(alternative))
   const selected=await group.getAttribute('data-current-tool')
   const activeControl=await group.locator('> button').first().getAttribute('aria-pressed')
   assert.equal(activeControl,'true',`Selected ${expectedMode} mode did not become active`)
   detail.push({dimension,selected,expectedMode,activeControl})
  })
  await check(`${dimension} keyboard ArrowRight, option cycling and Escape`,async()=>{
   await trigger.focus()
   await page.keyboard.press('ArrowRight')
   assert.equal(await flyout.isVisible(),true)
   await flyout.locator('button:focus').waitFor({state:'attached',timeout:3000})
   await page.keyboard.press('ArrowRight')
   await flyout.locator('button:focus').waitFor({state:'attached',timeout:3000})
   await page.keyboard.press('Escape')
   assert.equal(await flyout.locator('button:focus').count(),0)
   await page.mouse.move(800,400)
   const state=await group.evaluate(el=>({hover:el.matches(':hover'),focusWithin:el.matches(':focus-within'),dismissed:el.dataset.dismissed,display:getComputedStyle(el.querySelector('.clo-corner-tool-options')).display,active:document.activeElement?.outerHTML.slice(0,160),pointer:document.elementFromPoint(800,400)?.outerHTML.slice(0,140),touchOpen:el.dataset.touchOpen}))
   detail.push({dimension,escapeState:state})
   assert.equal(await flyout.isVisible(),false,'Flyout should collapse after Escape and pointer exit')
  })
  await check(`${dimension} click avoids bottom overlay and Property Editor takeover`,async()=>{
   const before=await page.locator('.clo-property-editor,.cc-property-editor,[aria-label="Property Editor"]').allTextContents()
   const bottomBefore=await page.locator('.cc-embedded-bottom').count()
   await trigger.click()
   assert.equal(await page.locator('[data-clo-floating-widget]:visible,.clo-floating-tool:visible').count(),0)
   assert.equal(await page.locator('.cc-embedded-bottom').count(),bottomBefore)
   const after=await page.locator('.clo-property-editor,.cc-property-editor,[aria-label="Property Editor"]').allTextContents()
   assert.deepEqual(after,before)
  })
 }
 assert.equal(errors.length,0,'Browser errors: '+errors.join('; '))
 writeFileSync(path.join(output,'results.json'),JSON.stringify({output,results,errors,detail},null,2))
 console.log(JSON.stringify({output,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results,detail,errors},null,2))
 if(results.some(r=>!r.ok))process.exitCode=1
} finally {
 await browser?.close()
 for(const proc of processes)if(proc.pid)try{process.kill(-proc.pid,'SIGTERM')}catch{}
}
