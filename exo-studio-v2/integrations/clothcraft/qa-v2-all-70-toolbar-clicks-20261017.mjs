// Isolated Rust/Vite/Chrome acceptance of every observed CLO7 reference control.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {CLO7_3D_A,CLO7_3D_B,CLO7_2D_A,CLO7_2D_B} from '../../src/data/clo7ToolbarOrder.js'
import {getClo7NativeCapability} from '../../src/core/clo7NativeToolCapabilities.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-all-70-toolbar-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Build research/oss/clothcraft/target/debug/exo-session first')
const basePort=5900+Math.floor(Math.random()*150)
const nativePort=String(basePort),uiPort=String(basePort+300)
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const children=[]
function launch(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}await sleep(200)}
 throw Error(`Fixture unavailable: ${url}`)
}
const sections=[['3d',CLO7_3D_A],['3d',CLO7_3D_B],['2d',CLO7_2D_A],['2d',CLO7_2D_B]]
const slots=sections.flatMap(([dimension,list])=>list.map(slot=>({dimension,slot})))
assert.equal(slots.length,70,'Expected 70 CLO toolbar slots')
const selectedIds=['3d:A05','3d:A06','3d:A07','2d:B01','2d:B02','2d:B03']
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:nativePort,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'
 })
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',uiPort,'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1680,height:1100}})
 const errors=[],nativeRequests=[]
 page.on('pageerror',error=>errors.push(error.message))
 page.on('request',request=>{if(request.url().endsWith('/workspace')&&request.method()==='POST')nativeRequests.push(request.postData())})
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft`,{waitUntil:'domcontentloaded'})
 try{await page.locator('[data-clo-slot="3d:A01"]').waitFor({state:'attached',timeout:12000})}
 catch(error){throw new Error(`EXO toolbar failed to render: ${JSON.stringify({url:page.url(),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,1200),errors,nativeRequests:nativeRequests.length})}`,{cause:error})}
 assert.equal(await page.locator('[data-clo-slot]').count(),70,'All 70 reference buttons must exist')
 const inspected=[],iconMarkup={}
 for(const {dimension,slot} of slots){
  const key=`${dimension}:${slot.id}`
  const button=page.locator(`[data-clo-slot="${key}"]`)
  const expectedMode=getClo7NativeCapability(dimension,slot.id)?.mode||'unavailable'
  assert.equal(await button.count(),1,`${key} unique`)
  assert.equal(await button.isEnabled(),true,`${key} must accept pointer and keyboard activation`)
  assert.equal(await button.getAttribute('aria-label'),slot.label,`${key} exact CLO accessible name`)
  assert((await button.getAttribute('title'))?.includes(slot.label),`${key} tooltip`)
  assert.equal(await button.getAttribute('data-clo-implementation'),expectedMode,`${key} truthful mode`)
  assert.equal(await button.getAttribute('data-clo-operational'),String(expectedMode==='native'),`${key} native capability status`)
  assert.equal(await button.evaluate(el=>el.tabIndex>=0),true,`${key} keyboard focusable`)
  const icon=button.locator('.cad-tool-icon')
  assert.equal(await icon.count(),1,`${key} must render a CAD icon`)
  const markup=await icon.evaluate(el=>el.outerHTML)
  assert(markup.includes('<svg')||markup.includes('<img'),`${key} icon contains actual graphic`)
  if(selectedIds.includes(key))iconMarkup[key]=markup
  await button.evaluate(el=>el.click())
  const card=page.locator(`[data-clo-detail="${key}"]`)
  await card.waitFor({state:'visible',timeout:3500})
  assert.equal(await card.locator('.exo-clo-tool-name').innerText(),slot.label,`${key} information name`)
  assert.equal(await card.getAttribute('aria-label'),`${slot.label} tool information`)
  assert.equal(await card.locator('.exo-clo-tool-workspace').count(),1,`${key} related workspace CTA`)
  assert.match(await card.locator('.exo-clo-tool-workspace').innerText(),/^Open EXO .+ workspace/)
  const runCount=await card.locator('.exo-clo-tool-run').filter({hasText:/^Run /}).count()
  assert(runCount<=1,`${key} duplicate Run CTA`)
  if(expectedMode!=='native')assert.equal(runCount,0,`${key} must not offer fake Run`)
  if(expectedMode==='unavailable')assert.match(await card.locator('.exo-clo-tool-state').innerText(),/Requires additional native implementation/)
  inspected.push({key,name:slot.label,mode:expectedMode})
  await card.getByRole('button',{name:'Close tool information'}).click()
  assert.equal(await page.locator('[data-clo-detail]').count(),0,`${key} card closes`)
 }
 for(const key of selectedIds){
  const icon=iconMarkup[key]
  assert(icon&&icon.length>30,`${key} named icon drawn`)
 }
 for(const dimension of ['3d','2d']){
  const keys=dimension==='3d'?selectedIds.slice(0,3):selectedIds.slice(3)
  const representations=keys.map(key=>iconMarkup[key])
  assert.equal(new Set(representations).size,3,`${dimension} sewing tools must show three distinct exact manifest icons`)
  for(const key of keys){
   const slot=slots.find(s=>`${s.dimension}:${s.slot.id}`===key).slot
   assert(['seam-links','segment-sew','free-sew'].includes(slot.icon),`${key} sewing icon manifest`)
   await page.locator(`[data-clo-slot="${key}"]`).evaluate(el=>el.click())
   assert.equal(await page.locator(`[data-clo-detail="${key}"]`).count(),1)
   if(getClo7NativeCapability(dimension,slot.id)?.mode==='native'){
    assert.equal(await page.locator(`[data-clo-slot="${key}"]`).getAttribute('aria-pressed'),'true',`${key} selected`)
   }
   await page.getByRole('button',{name:'Close tool information'}).click()
  }
 }
 assert(nativeRequests.length>0,'Native Rust fixture must receive workspace requests')
 assert.deepEqual(errors,[],'No browser page errors')
 console.log(JSON.stringify({pass:true,fixture:output,total:inspected.length,counts:{
  '3d':inspected.filter(t=>t.key.startsWith('3d:')).length,'2d':inspected.filter(t=>t.key.startsWith('2d:')).length},
  modes:inspected.reduce((a,t)=>(a[t.mode]=(a[t.mode]||0)+1,a),{}),
  sewingIcons:selectedIds.map(key=>({key,distinct:true})),nativeRequests:nativeRequests.length,pageErrors:errors},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
