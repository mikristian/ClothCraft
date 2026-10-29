// Disposable native UI audit of all observed 3D reference controls.
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
const output=mkdtempSync(path.join(tmpdir(),'exo-all-70-next-pass-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Build native exo-session before browser QA')
const basePort=17100+Math.floor(Math.random()*800)
const native=`http://127.0.0.1:${basePort}`,ui=`http://127.0.0.1:${basePort+200}`
const children=[]
function launch(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(200)}throw Error(`Fixture unavailable: ${url}`)}
const slots=[...CLO7_3D_A,...CLO7_3D_B].map(slot=>({slot,dimension:'3d'})).concat([...CLO7_2D_A,...CLO7_2D_B].map(slot=>({slot,dimension:'2d'})))
assert.equal(slots.length,70)
const inspectorKeys=new Set(['B07','B08','B09','B10','B11','B13','B14','B15','B16','B17'])
const findings=[],errors=[],requests=[]
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:String(basePort),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(basePort+200),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1680,height:1100}})
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(r.url().endsWith('/workspace')&&r.method()==='POST')requests.push(r.postData())})
 await page.route('**/workspace',async route=>{const headers={...route.request().headers()};delete headers.origin;const response=await route.fetch({url:native+'/workspace',headers});await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})})
 await page.goto(`${ui}/?desktop=1&engine=clothcraft`,{waitUntil:'domcontentloaded'})
 await page.locator('[data-clo-slot="3d:A01"]').waitFor({state:'attached',timeout:16000})
 assert.equal(await page.locator('[data-clo-slot]').count(),70)
 for(const {slot,dimension} of slots){
  const key=`${dimension}:${slot.id}`,button=page.locator(`[data-clo-slot="${key}"]`),cap=getClo7NativeCapability(dimension,slot.id)
  assert.equal(await button.count(),1,key)
  assert.equal(await button.isEnabled(),true,key)
  assert.equal(await button.getAttribute('aria-label'),slot.label,key)
  assert.equal(await button.getAttribute('data-clo-implementation'),cap.mode,key)
  const beforeRequests=requests.length
  await button.evaluate(el=>el.click())
  await page.waitForTimeout(110)
  const card=page.locator('[data-clo-detail]')
  const popup=await card.count()>0
  // Once the reference toolbar becomes a direct control surface no informational
  // overlay should intercept native commands, inspector links or unavailable slots.
  const expectedPopup=false
  const pressed=await button.getAttribute('aria-pressed')
  const operational=await button.getAttribute('data-clo-operational')
  const extra={key,label:slot.label,mode:cap.mode,action:cap.nativeAction||cap.inspectionAction||null,popup,expectedPopup,pressed,operational,nativeCalls:requests.length-beforeRequests}
  if(dimension==='3d'&&inspectorKeys.has(slot.id)){
   extra.inspectorRoute=cap.inspectionAction||null
   extra.inspectorAccessible=Boolean(cap.inspectionAction)
  }
  if(dimension==='3d'&&cap.mode==='native'&&['A02','A03','A05','A06','A07','A19','A20'].includes(slot.id))extra.activationPressed=pressed==='true'
  extra.passPopup=popup===expectedPopup
  findings.push(extra)
  if(popup){const close=page.getByRole('button',{name:'Close tool information'});if(await close.count())await close.click();else await page.keyboard.press('Escape')}
 }
 const measureChecks=[]
 const activationChecks=[]
 for(const [id,attr,value] of [['A03','meshBrushActive','true'],['A17','avatarMeasureMode','avatar-measure-edit'],['A18','avatarMeasureMode','avatar-measure'],['A19','garmentMeasureMode','garment-measure-edit'],['A20','garmentMeasureMode','garment-measure']]){
  await page.locator(`[data-clo-slot="3d:${id}"]`).evaluate(el=>el.click())
  await page.waitForTimeout(180)
  const canvas=page.locator('.cc-scene canvas').first()
  const actual=await canvas.getAttribute('data-'+attr.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()))
  const pressed=await page.locator(`[data-clo-slot="3d:${id}"]`).getAttribute('aria-pressed')
  activationChecks.push({id,attr,expected:value,actual,pressed,pass:actual===value&&pressed==='true'})
 }
 const b03=page.locator('[data-clo-slot="3d:B03"]')
 await b03.evaluate(el=>el.click())
 await page.waitForTimeout(120)
 const sceneCanvas=page.locator('.cc-scene canvas').first()
 const bounds=await sceneCanvas.boundingBox()
 const lineHits=[]
 if(bounds){for(let row=2;row<=16&&lineHits.length<2;row++)for(let col=2;col<=16&&lineHits.length<2;col++){
   const x=bounds.x+bounds.width*col/18,y=bounds.y+bounds.height*row/18
   await page.mouse.click(x,y)
   const n=Number(await sceneCanvas.getAttribute('data-internal-line3d-points')||0)
   if(n>lineHits.length)lineHits.push({x,y,n})
 }}
 await page.waitForTimeout(600)
 const lineCommands=requests.flatMap(raw=>{try{const r=JSON.parse(raw);return r?.op==='edit'?[r.command]:[]}catch{return []}}).filter(c=>c?.kind==='InternalLine')
 assert.equal(lineHits.length,2,'B03 requires two actual garment ray hits')
 assert(lineCommands.length>=1,'B03 must send Rust InternalLine authoring command')
 const rpc=async op=>{const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(op)});const json=await response.json();assert(json.ok,JSON.stringify(json.error));return json.data}
 let rust=await rpc({op:'snapshot'})
 const lineCommand=lineCommands.at(-1)
 const panelLines=state=>(state.template.panels.find(p=>p.id===lineCommand.panel)?.polygon?.lines||[]).length
 const authoredLines=panelLines(rust)
 assert(authoredLines>0,'B03 3D drawn line absent from Rust template')
 const afterAdd=authoredLines
 rust=await rpc({op:'undo',revision:rust.revision})
 assert.equal(panelLines(rust),afterAdd-1,'Native Undo did not remove 3D line')
 rust=await rpc({op:'redo',revision:rust.revision})
 assert.equal(panelLines(rust),afterAdd,'Native Redo did not restore 3D line')
 const saved=await rpc({op:'save'})
 rust=await rpc({op:'open',project:saved.project})
 assert.equal(panelLines(rust),afterAdd,'Native save/reopen lost 3D line')
 const linePersistence={panel:lineCommand.panel,afterAdd,undo:true,redo:true,reopen:true}
 const b03Evidence={hitCount:lineHits.length,commands:lineCommands.length,implementation:await b03.getAttribute('data-clo-implementation'),pressed:await b03.getAttribute('aria-pressed'),sceneMode:await page.locator('.cc-scene canvas').first().getAttribute('data-internal-line3d-mode'),nativeCalls:requests.length,detailCards:await page.locator('[data-clo-detail]').count()}

 for(const [id,mode] of [['A19','garment-measure-edit'],['A20','garment-measure']]){
  await page.locator(`[data-clo-slot="3d:${id}"]`).evaluate(el=>el.click())
  await page.waitForTimeout(170)
  const evidence=await page.evaluate(()=>{
   const canvas=[...document.querySelectorAll('canvas')].find(x=>x.dataset.garmentMeasureMode&&x.dataset.garmentMeasureMode!=='off')
   const overlay=document.querySelector('[data-garment-measure-overlay]')
   return {mode:canvas?.dataset.garmentMeasureMode||null,points:canvas?.dataset.garmentMeasurePoints||null,distance:canvas?.dataset.garmentMeasureMm||'',overlayVisible:overlay?getComputedStyle(overlay).display!=='none':false,overlayText:overlay?.textContent||''}
  })
  measureChecks.push({id,...evidence,pass:evidence.mode===mode&&evidence.overlayVisible})
  if(await page.locator('[data-clo-detail]').count())throw Error(`${id} unexpectedly opened information popup`)
 }
 const failed=findings.filter(f=>!f.passPopup||f.activationPressed===false||f.operational!==String(f.mode==='native'))
 assert(requests.length>0,'Native workspace never connected')
 console.log(JSON.stringify({pass:failed.length===0&&errors.length===0&&measureChecks.every(x=>x.pass)&&activationChecks.every(x=>x.pass),slots:findings.length,byMode:Object.fromEntries(['native','inspect','unavailable'].map(m=>[m,findings.filter(x=>x.mode===m).length])),failures:failed,inspectorFindings:findings.filter(f=>f.key.startsWith('3d:')&&inspectorKeys.has(f.key.slice(3))),measureChecks,activationChecks,b03Evidence,lineHits,lineCommands,linePersistence,nativeRequests:requests.length,pageErrors:errors,fixture:output},null,2))
 if(failed.length||errors.length||measureChecks.some(x=>!x.pass)||activationChecks.some(x=>!x.pass))process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
