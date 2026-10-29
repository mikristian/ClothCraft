// Disposable Rust and Vite integration proof; never touches installed projects.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import {mkdtempSync,mkdirSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Compiled native Rust session is required')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-precision-dart-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const freePort=()=>new Promise((resolve,reject)=>{
 const server=createServer();server.once('error',reject)
 server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})
})
const children=[]
const spawnIsolated=(exe,args,env={})=>{
 const child=spawn(exe,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
 return child
}
async function waitReady(url){
 for(let i=0;i<110;i++){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(1500)});if(response.ok){
   if(url.endsWith('/health')){const health=await response.json();if(health.nativeReady===false){await sleep(250);continue}}
   return
  }}catch{}
  await sleep(250)
 }
 throw Error(`Isolated QA service unavailable: ${url}`)
}
let browser
try{
 const [nativePort,uiPort]=await Promise.all([freePort(),freePort()])
 assert.notEqual(nativePort,uiPort,'QA backend and UI require independent ports')
 const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
 const rpc=async body=>{
  const response=await fetch(`${native}/workspace`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)})
  const result=await response.json()
  assert(result.ok,`Native ${body.op} failed: ${result.error||JSON.stringify(result)}`)
  return result.data
 }
 spawnIsolated(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
 })
 spawnIsolated(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:native,
 })
 await Promise.all([waitReady(native+'/health'),waitReady(ui)])
 const opened=await rpc({op:'open',preset:'tshirt'})
 const fabric=opened.template?.fabrics?.[0]?.id
 assert(fabric,'Disposable T-shirt preset must supply a fabric')
 const baseline=await rpc({op:'edit',revision:opened.revision,command:{kind:'Primitive',shape:'rectangle',size:[.4,.3],origin:[0,0],fabric}})
 const rectangle=baseline.template.panels.at(-1)
 assert(rectangle?.polygon?.points?.length===4,'Disposable rectangle did not create four points')
 const originalPoints=structuredClone(rectangle.polygon.points)
 const originalSeams=structuredClone(baseline.template.seams)
 const edge=rectangle.polygon.edges[0]
 assert(!originalSeams.some(seam=>[seam.a,seam.b].some(side=>side?.panel===rectangle.id&&side?.edge===edge)),
  'Selected rectangle edge must be unsewn')

 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1580,height:1000}})
 const pageErrors=[],requests=[]
 page.on('pageerror',error=>pageErrors.push(error.message))
 page.on('request',request=>{
  if(request.url().endsWith('/workspace')&&request.method()==='POST'){
   try{requests.push(request.postDataJSON())}catch{}
  }
 })
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=native-dart-precision-qa-20261023`,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'dart-precision'}})))
 const modal=page.locator('[data-native-dart-precision="true"]')
 await modal.waitFor({state:'visible',timeout:10000})
 await modal.getByRole('combobox',{name:'Precision dart pattern'}).selectOption(rectangle.id)
 await modal.getByRole('combobox',{name:'Precision dart boundary'}).selectOption(edge)
 await modal.getByRole('spinbutton',{name:'Precision dart centre station'}).fill('50')
 await modal.getByRole('spinbutton',{name:'Precision dart intake'}).fill('40')
 await modal.getByRole('spinbutton',{name:'Precision dart depth'}).fill('60')
 await modal.locator('[data-native-dart-status="ready"]').waitFor({state:'visible',timeout:12000})
 const preview=page.locator(`[data-native-dart-precision-preview="${rectangle.id}"]`)
 await preview.waitFor({state:'attached',timeout:12000})
 assert.equal(await preview.locator('path').count(),1,'Live preview must include precisely one V-shaped SVG path')
 assert.equal(await preview.locator('circle').count(),3,'Live preview must include two shoulders and an apex')
 const draft=await rpc({op:'snapshot'})
 assert.equal(draft.revision,baseline.revision,'Live preview must not commit a backend revision')
 assert.deepEqual(draft.template.panels.find(panel=>panel.id===rectangle.id).polygon.points,originalPoints,
  'Live SVG preview must not mutate native source contour')
 assert.deepEqual(draft.template.seams,originalSeams,'Live preview must not create a seam')

 await modal.getByRole('button',{name:'Create physical dart · native Undo'}).click()
 await page.waitForFunction(()=>document.querySelector('[data-native-dart-precision="true"] .exo-construction-message')?.textContent?.includes('Created physical V-cut'),null,{timeout:15000})
 let committed
 for(let i=0;i<60;i++){
  committed=await rpc({op:'snapshot'})
  if(committed.revision>baseline.revision)break
  await sleep(100)
 }
 assert.equal(committed.revision,baseline.revision+1,'Real DartCutSew must commit exactly one native revision')
 const updated=committed.template.panels.find(panel=>panel.id===rectangle.id)
 assert.equal(updated.polygon.points.length,originalPoints.length+3,'Native dart must add exactly three contour points')
 assert.equal(committed.template.seams.length,originalSeams.length+1,'Native dart must create exactly one seam')
 const seam=committed.template.seams.find(item=>!originalSeams.some(previous=>previous.id===item.id))
 assert(seam?.id?.startsWith('dart_')&&seam.a.panel===rectangle.id&&seam.b.panel===rectangle.id,
  'New native sewn dart seam must pair two edges of the same detached rectangle')
 const issued=requests.filter(body=>body.op==='edit'&&body.command?.kind==='DartCutSew')
 assert.equal(issued.length,1,'UI must send exactly one DartCutSew Rust command')
 const nativeCommand=issued[0]
 assert.equal(nativeCommand.command.panel,rectangle.id)
 assert.equal(nativeCommand.command.edge,edge)
 const nearly=(a,b,tolerance=1e-6)=>Math.abs(a-b)<=tolerance
 assert(nearly(nativeCommand.command.left_t,.45)&&nearly(nativeCommand.command.right_t,.55),
  `40 mm on 400 mm edge at centre must produce 0.45/0.55 stations: ${JSON.stringify(nativeCommand.command)}`)
 assert(nearly(Math.hypot(nativeCommand.command.apex[0]-.2,nativeCommand.command.apex[1]),.06),
  'Apex must lie 60 mm from the centre of the selected hem')

 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
 let undone
 for(let i=0;i<70;i++){
  await sleep(100)
  undone=await rpc({op:'snapshot'})
  if(undone.revision>committed.revision)break
 }
 assert(undone.revision>committed.revision,'Native Undo must create a newer backend revision')
 const restored=undone.template.panels.find(panel=>panel.id===rectangle.id)
 assert(restored,'Native Undo must preserve disposable rectangle panel identity')
 assert.deepEqual(restored.polygon.points,originalPoints,'Native Undo must restore all source points')
 assert.deepEqual(undone.template.seams,originalSeams,'Native Undo must remove the created dart seam')
 assert.equal(undone.template.panels.length,baseline.template.panels.length,'Native Undo must preserve all fixture panels')
 assert.equal((await modal.isVisible()),true,'Precision dart pane must survive native Undo')
 assert.deepEqual(pageErrors,[],'Browser encountered uncaught errors')
 console.log(JSON.stringify({ok:true,fixture:'isolated tshirt plus detached rectangular Primitive',panel:rectangle.id,edge,
  intakeMm:40,depthMm:60,centrePercent:50,previewRendered:true,previewMutated:false,
  rustCommand:nativeCommand.command.kind,pointsBefore:originalPoints.length,pointsAfter:updated.polygon.points.length,
  nativeSamePanelSeam:seam.id,undoRestoresGeometry:true,undoRemovesSeam:true,undoRetainsPane:true,
  revisions:{original:baseline.revision,committed:committed.revision,undone:undone.revision},pageErrors},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
 rmSync(output,{recursive:true,force:true})
}
