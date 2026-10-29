/** Real disposable Chrome → EXO F7 → Rust schema-v2 alias → save/Undo/Redo. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {createServer} from 'node:net'
import {chromium} from 'playwright-core'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const port=async()=>{
 const server=createServer()
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
 const n=server.address().port
 await new Promise(resolve=>server.close(resolve))
 return n
}
const nativePort=await port();let uiPort=await port()
while(uiPort===nativePort)uiPort=await port()
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-native-f7-browser-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'A compiled native Rust session is required; do not simulate persistence')
const children=[];let browser,page,stage='startup',current
const pageErrors=[],ops=[],responses=[]
function start(cmd,args,env={}){
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child);return child
}
async function ready(url,child){
 for(let i=0;i<120;i++){
  if(child.exitCode!==null||child.signalCode!==null)throw Error('Disposable service exited')
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  await sleep(250)
 }
 throw Error(`Service not ready: ${url}`)
}
async function request(payload){
 const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({revision:current?.revision,...payload})})
 const body=await response.json()
 assert.equal(body.ok,true,`${payload.op}: ${body.error||'Native rejected'}`)
 if(body.data?.template)current=body.data
 return body.data
}
const project=async()=>(await request({op:'save'})).project
try{
 const server=start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'})
 const vite=start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health',server),ready(ui,vite)])
 stage='seed isolated native garment and six-size catalog'
 await request({op:'open',preset:'tshirt'})
 const source=current
 const rules=createAccuMarkNativeRuleSet(source)
 assert(rules.ok,rules.reason)
 const prepared=prepareNativeGradeCatalog20261025(source,await project(),rules.ruleSet)
 assert(prepared.ok,prepared.reason)
 await request({op:'grade-run-commit',gradeRun:prepared.gradeRun})
 await request({op:'snapshot'})
 const initialRevision=current.revision,initial=await project()
 stage='Chrome navigation to F7 native correspondence'
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
   ok:body.ok,error:body.error,revision:body.data?.revision,gradeRunCommitted:body.data?.gradeRunCommitted})}catch{}
 })
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=native-f7-correspondence-20261028',
  {waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',
  {detail:{nativeAction:'pattern2d.editGrading'}})))
 const grading=page.locator('[data-native-grade-pattern="true"]')
 await grading.waitFor({state:'visible',timeout:15000})
 await grading.getByRole('tab',{name:'F7 Sizes'}).click()
 const studio=page.locator('[data-native-f7-correspondence="true"]')
 await studio.waitFor({state:'visible',timeout:15000})
 await studio.getByRole('button',{name:'Inspect saved native size catalog'}).click()
 await studio.getByText(`Verified 6 saved native sizes at revision ${initialRevision}`,{exact:false}).waitFor({timeout:15000})
 stage='pointer authoring and Rust commit'
 await studio.getByRole('textbox',{name:'Native external size alias'}).fill('US16')
 await studio.getByRole('combobox',{name:'Native alias target size'}).selectOption('XL')
 await studio.getByRole('button',{name:'Stage mapping'}).click()
 await studio.getByRole('table',{name:'Native external size correspondence draft'}).getByText('US16').waitFor()
 await studio.getByRole('button',{name:'Confirm native Rust correspondence commit'}).click()
 await studio.getByText(/Rust committed 1 correspondences across 6 authored sizes/).waitFor({timeout:25000}).catch(async error=>{
  const message=await studio.locator('[data-native-f7-status]').innerText().catch(()=>'<status unavailable>')
  throw Error(`${error.message}; F7 status: ${message}; native responses: ${JSON.stringify(responses)}`)
 })
 await request({op:'snapshot'})
 const committed=await project()
 assert.equal(current.revision,initialRevision+1)
 assert.deepEqual(committed.grade_run.sizeCorrespondence,{US16:'XL'})
 assert.deepEqual(committed.grade_run.gradedTemplates,initial.grade_run.gradedTemplates)
 assert.deepEqual(committed.template,initial.template)
 assert(ops.includes('grade-run-commit'),'F7 browser never submitted a Rust commit')
 stage='native alias activation, Undo/Redo and save/reopen'
 await request({op:'grade-run-activate',size:'US16'})
 assert.equal(current.activeGradedSize,'US16')
 assert.deepEqual(current.template,committed.grade_run.gradedTemplates[4])
 await request({op:'grade-run-restore'})
 await request({op:'undo'})
 assert.deepEqual((await project()).grade_run,initial.grade_run)
 await request({op:'redo'})
 assert.deepEqual((await project()).grade_run,committed.grade_run)
 await request({op:'open',project:committed})
 assert.deepEqual((await project()).grade_run,committed.grade_run)
 assert.deepEqual(pageErrors,[])
 console.log(JSON.stringify({passed:true,realChrome:true,realRust:true,pointerAuthored:true,
  authoredSizes:6,aliases:1,oneNativeRevision:true,exactGeometryPreserved:true,
  undoRedoSaveReopen:true,pageErrors:pageErrors.length,
  factoryApproved:false,externalReceivingCadAccepted:false}))
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
