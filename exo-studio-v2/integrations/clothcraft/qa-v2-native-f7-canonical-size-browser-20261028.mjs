/** Real disposable Chrome F7 canonical-size authoring → Rust persistence. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {createServer} from 'node:net'
import {chromium} from 'playwright-core'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const freePort=async()=>{
 const server=createServer()
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
 const value=server.address().port
 await new Promise(resolve=>server.close(resolve))
 return value
}
const nativePort=await freePort();let uiPort=await freePort()
while(uiPort===nativePort)uiPort=await freePort()
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-native-f7-canonical-browser-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Compiled native Rust session required')
const children=[],pageErrors=[],ops=[],responses=[]
let browser,page,current,stage='startup'
const start=(cmd,args,env={})=>{
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child);return child
}
async function ready(url,child){
 for(let i=0;i<120;i++){
  if(child.exitCode!==null||child.signalCode!==null)throw Error('Disposable server exited')
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  await sleep(250)
 }
 throw Error('Disposable server not ready: '+url)
}
const request=async payload=>{
 const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({revision:current?.revision,...payload})})
 const body=await response.json()
 assert.equal(body.ok,true,`${payload.op}: ${body.error||'Rust rejected request'}`)
 if(body.data?.template)current=body.data
 return body.data
}
const saved=async()=>(await request({op:'save'})).project
try{
 const server=start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'})
 const vite=start(path.join(root,'node_modules/.bin/vite'),
  ['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health',server),ready(ui,vite)])
 stage='seed real Rust three-piece sewn garment with four named canonical sizes'
 await request({op:'open',preset:'tshirt'})
 const old=new Set(current.template.panels.map(p=>p.id))
 await request({op:'edit',command:{kind:'Polygon',fabric:current.template.fabrics[0].id,
  points:[[.55,.1],[.83,.1],[.88,.34],[.52,.34]]}})
 const extra=current.template.panels.find(p=>!old.has(p.id))
 assert(extra)
 let rules=createAccuMarkNativeRuleSet(current,{sizes:['2','4','6','8'],baseSize:'6'})
 assert(rules.ok,rules.reason)
 for(const [size,dx] of [['2',-3],['4',-1],['8',4]]){
  const next=editAccuMarkNativePointRule(current,rules.ruleSet,{panelId:extra.id,
   pointIndex:1,size,dxMm:dx,dyMm:0})
  assert(next.ok,next.reason);rules=next
 }
 const prepared=prepareNativeGradeCatalog20261025(current,await saved(),rules.ruleSet)
 assert(prepared.ok,prepared.reason)
 await request({op:'grade-run-commit',gradeRun:prepared.gradeRun})
 await request({op:'snapshot'})
 const before=current,initial=await saved()
 stage='Chrome open native grading workspace and recover Rust F7 draft'
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1700,height:1050}})
 page.on('pageerror',error=>pageErrors.push(error.message))
 page.on('request',req=>{if(req.url().endsWith('/workspace')&&req.method()==='POST'){
  try{ops.push(req.postDataJSON()?.op)}catch{}
 }})
 page.on('response',async response=>{
  if(!response.url().endsWith('/workspace')||response.request().method()!=='POST')return
  try{const body=await response.json();responses.push({op:response.request().postDataJSON()?.op,
   ok:body.ok,error:body.error,revision:body.data?.revision})}catch{}
 })
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=native-f7-canonical-20261028',
  {waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',
  {detail:{nativeAction:'pattern2d.editGrading'}})))
 const grading=page.locator('[data-native-grade-pattern="true"]')
 await grading.waitFor({state:'visible',timeout:15000})
 await grading.getByRole('tab',{name:'Export'}).click()
 await grading.getByRole('button',{name:'Recover sizes from native project'}).click()
 await grading.getByText(/Recovered 4 editable point-rule tables/).waitFor({timeout:15000})
 stage='pointer stage fifth canonical size and commit native Rust'
 await grading.getByRole('tab',{name:'F7 Sizes'}).click()
 const f7=page.locator('[data-exo-f7-size-management="true"]')
 await f7.getByRole('combobox',{name:'F7 operation'}).selectOption('add-size-to-product')
 await f7.getByRole('textbox',{name:'New size name'}).fill('10')
 await f7.getByRole('button',{name:'Apply validated F7 operation'}).click()
 await f7.getByText(/Validated size authoring draft: 2 · 4 · 6 · 8 · 10/).waitFor({timeout:15000})
 await f7.locator('[data-native-f7-canonical-commit="true"]').click()
 await f7.getByText(/Rust committed 5 canonical graded sizes/).waitFor({timeout:25000}).catch(async error=>{
  const notice=await f7.locator('[role="status"]').first().innerText().catch(()=>'<no status>')
  throw Error(`${error.message}; F7 notice: ${notice}; native responses: ${JSON.stringify(responses)}`)
 })
 await request({op:'snapshot'})
 const after=await saved()
 assert.equal(current.revision,before.revision+1)
 assert.deepEqual(after.grade_run.sizes,['2','4','6','8','10'])
 assert.deepEqual(after.template,initial.template)
 const base=after.template.panels.find(p=>p.id===extra.id).polygon.points[1][0]
 const last=after.grade_run.gradedTemplates[4].panels.find(p=>p.id===extra.id).polygon.points[1][0]
 assert(Math.abs((last-base)*1000-8)<1e-7)
 assert(ops.includes('grade-run-commit'))
 stage='native size activation, Undo/Redo and save/reopen'
 await request({op:'grade-run-activate',size:'10'})
 assert.equal(current.activeGradedSize,'10')
 await request({op:'grade-run-restore'})
 await request({op:'undo'})
 assert.deepEqual((await saved()).grade_run,initial.grade_run)
 await request({op:'redo'})
 assert.deepEqual((await saved()).grade_run,after.grade_run)
 await request({op:'open',project:after})
 assert.deepEqual((await saved()).grade_run,after.grade_run)
 assert.deepEqual(pageErrors,[])
 console.log(JSON.stringify({passed:true,realChrome:true,realRust:true,
  pointerAuthored:true,canonicalSizes:5,sourcePanels:3,pointGrowthMm:8,
  undoRedoSaveReopen:true,pageErrors:0,externalReceivingCadAccepted:false,factoryApproved:false}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:String(error?.message||error),
  pageErrors,ops,responses,stack:error?.stack}))
 process.exitCode=1
}finally{
 if(browser)await Promise.race([browser.close().catch(()=>{}),sleep(4000)])
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
 rmSync(output,{recursive:true,force:true})
}
process.exit(process.exitCode??0)
