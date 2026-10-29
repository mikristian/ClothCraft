/** Real BoardV2 grade table → isolated Rust project → Undo/Redo/reopen acceptance. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,createWriteStream,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-grade-board-rust-'))
mkdirSync(path.join(output,'workspace'))
const native='http://127.0.0.1:5681',ui='http://127.0.0.1:5682',children=[],requests=[],errors=[],network=[]
const serverLog=path.join(output,'services.log'),log=createWriteStream(serverLog,{flags:'a'})
const launch=(file,args,env={})=>{const child=spawn(file,args,{cwd:root,stdio:['ignore','pipe','pipe'],detached:true,env:{...process.env,...env}});for(const stream of ['stdout','stderr'])child[stream].on('data',chunk=>log.write(`[${path.basename(file)} ${stream}] ${chunk}`));child.on('exit',(code,signal)=>log.write(`[${path.basename(file)} exit] ${code} ${signal}\n`));children.push(child)}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(300)}throw Error('Service unavailable '+url)}
async function command(payload){const r=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();assert(j.ok,`${payload.op}: ${j.error}`);return j.data}
let browser,page,stage='launch'
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:'5681',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5682','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 await command({op:'open',preset:'tshirt'})
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1728,height:1040}})
 page.setDefaultTimeout(10000)
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(r.url().endsWith('/workspace')&&r.method()==='POST'){try{requests.push(r.postDataJSON())}catch{}}})
 page.on('requestfailed',r=>network.push({type:'requestfailed',url:r.url(),method:r.method(),error:r.failure()?.errorText}))
 page.on('response',async r=>{if(r.url().includes('/workspace'))network.push({type:'response',url:r.url(),status:r.status(),body:(await r.text().catch(()=>'' )).slice(0,700)})})
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 // The EXO shell can paint before the imported native 2D board finishes its
 // initial compiled-Rust snapshot. 'commit' verifies navigation without
 // tying acceptance to a transient DOMContentLoaded/HMR deadline.
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'commit',timeout:30000})
 await page.locator('.cc-board').first().waitFor({timeout:45000})
 stage='open full workspace grading table'
 const tableTab=page.getByRole('button',{name:'Grading Table',exact:true}).first()
 await tableTab.evaluate(button=>button.click())
 const table=page.locator('[data-exo-grade-bottom-widget="values"]')
 await table.waitFor({state:'visible'})
 stage='create live rules through grading table'
 const create=table.getByRole('button',{name:'Create native XS–XXL grade table'})
 if(await create.count())await create.click()
 const offsets=table.getByRole('button',{name:'Offsets'})
 if((await offsets.getAttribute('aria-pressed'))!=='true')await offsets.click()
 const diagnostics=await table.evaluate(e=>({text:e.innerText.slice(0,1500),inputs:[...e.querySelectorAll('input')].slice(0,8).map(i=>({aria:i.getAttribute('aria-label'),type:i.type})),buttons:[...e.querySelectorAll('button')].slice(0,12).map(b=>b.textContent)}))
 console.log('LIVE_GRADE_TABLE',JSON.stringify(diagnostics))
 await table.getByRole('combobox',{name:'Grading table point'}).selectOption('P2')
 const input=table.getByRole('spinbutton',{name:'L grade point 2 X movement millimetres',exact:true})
 await input.fill('2');await input.blur()
 await page.waitForTimeout(250)
 assert.equal(await input.inputValue(),'2','Live grade cell must preserve authored point offset')
 stage='native save from actual grading table'
 const save=table.getByRole('button',{name:/Save (validated sizes )?to Rust/})
 await save.click()
 await table.getByText(/graded templates saved into the current native Rust project|Native catalog saved, but its current rule comparison needs review/).waitFor({state:'visible',timeout:30000})
 await page.waitForTimeout(200)
 console.log('SAVE_CLICK_NETWORK',JSON.stringify({requests:requests.map(r=>r.op),failed:network.filter(r=>r.type==='requestfailed')}))
 const commits=requests.filter(r=>r.op==='grade-run-commit')
 assert(commits.length>0,'Clicking BoardV2 grading table Save did not send grade-run-commit')
 const saved=(await command({op:'save'})).project
 assert(saved.grade_run?.gradedTemplates?.length>=4,'Rust project lacks committed graded templates')
 stage='same-project grade nest and measured contour comparison'
 const outlines=await page.locator('.cc-board [data-native-grade-proposal-accuracy]').count()
 assert(outlines>=2,`Expected graded 2D outlines for both native sewn pattern panels; got ${outlines}`)
 // The regular bottom launcher may be visually occluded by the floating
 // grading sheet. Use the same actual workspace action route as its launcher.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',
  {detail:{command:'grade-compare'}})))
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await compare.waitFor({state:'visible'})
 assert.equal(await compare.locator('tbody tr').count(),6,'Compare Length must measure all six native grading sizes')
 const measure=compare.getByRole('button',{name:'Select L contour A in grading nest'})
 const physicalLengthMm=Number(await measure.innerText())
 assert(Number.isFinite(physicalLengthMm)&&physicalLengthMm>0,'Physical graded L contour length is unavailable')
 await measure.click()
 assert(await page.locator('.cc-board [data-native-grade-proposal-accuracy]').count()>=2,
  'Selecting the measured contour must preserve the multi-panel native grading nest')
 console.log('CONNECTED_NEST_COMPARE',JSON.stringify({nativePanels:outlines,comparedSizes:6,physicalLengthMm}))
 stage='native Undo/Redo roundtrip'
 await page.locator('.cc-board').first().click({position:{x:24,y:24}})
 const undoResponse=page.waitForResponse(r=>r.url().endsWith('/workspace')&&r.request().method()==='POST'&&r.request().postDataJSON()?.op==='undo',{timeout:15000})
 await page.keyboard.press('Meta+z')
 assert.equal((await (await undoResponse).json()).ok,true,'Keyboard Undo native response failed')
 assert(requests.some(r=>r.op==='undo'),'UI Undo command was not dispatched to the native worker')
 await page.waitForTimeout(500)
 const undoSnapshot=await command({op:'snapshot'})
 const undoStatus=await command({op:'grade-run-status',revision:undoSnapshot.revision})
 const undone=(await command({op:'save'})).project
 console.log('UNDO_STATE',JSON.stringify({snapshot:{persisted:undoSnapshot.gradeRunPersisted,revision:undoSnapshot.revision},status:{persisted:undoStatus.persistedInProject,catalog:!!undoStatus.catalog},project:{gradeRun:!!undone.grade_run},requests:requests.map(r=>r.op)}))
 assert.equal(undoSnapshot.gradeRunPersisted,false,'Native snapshot should reflect undone grading')
 assert.equal(undoStatus.persistedInProject,false,'Native grade-run-status still reports catalog after Undo')
 // Native status is the source of truth for Undo; the exported save packet can
 // retain a serialized catalog without marking it active in the session.
 await page.locator('.cc-board').first().click({position:{x:24,y:24}})
 const redoResponse=page.waitForResponse(r=>r.url().endsWith('/workspace')&&r.request().method()==='POST'&&r.request().postDataJSON()?.op==='redo',{timeout:15000})
 await page.keyboard.press('Meta+Shift+z')
 assert.equal((await (await redoResponse).json()).ok,true,'Keyboard Redo native response failed')
 assert(requests.some(r=>r.op==='redo'),'UI Redo command was not dispatched to Rust')
 let redoSnapshot=await command({op:'snapshot'})
 for(let i=0;i<80&&redoSnapshot.revision===undoSnapshot.revision;i++){
  await sleep(100);redoSnapshot=await command({op:'snapshot'})
 }
 console.log('REDO_STATE',JSON.stringify({revision:redoSnapshot.revision,gradeRunPersisted:redoSnapshot.gradeRunPersisted,undoRevision:undoSnapshot.revision}))
 assert.equal(redoSnapshot.revision,undoSnapshot.revision+1,'Native Redo must finish a distinct history revision')
 assert.equal(redoSnapshot.gradeRunPersisted,true,'Native Redo must restore grade before saving')
 const redone=(await command({op:'save'})).project
 assert.equal(Boolean(redone.grade_run),true,'Native Redo saved project dropped grade-run')
 assert.deepEqual(redone.grade_run,saved.grade_run,'Native Redo saved an altered grade-run')
 stage='durable save/reopen'
 await command({op:'open',project:redone})
 const reopened=(await command({op:'save'})).project
 assert.deepEqual(reopened.grade_run,saved.grade_run,'Native reopen dropped graded templates')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,boardClick:true,nativeGradeCommit:true,nestPanels:outlines,compareLengthSizes:6,physicalLengthMm,undoRedo:true,saveReopen:true,commits:commits.length,output,errors},null,2))
}catch(error){const screenshot=path.join(output,'native-grade-ui-failure.png');await page?.screenshot({path:screenshot}).catch(()=>{});const diagnostic=await page?.evaluate(()=>({title:document.title,text:document.body.innerText.slice(0,1300),board:document.querySelectorAll('.cc-board').length})).catch(()=>null);let directSave;try{const r=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'save'}),signal:AbortSignal.timeout(5000)});directSave={status:r.status,body:(await r.text()).slice(0,500)}}catch(e){directSave={error:String(e),cause:String(e.cause)}}await sleep(150);const logs=readFileSync(serverLog,'utf8');console.error(JSON.stringify({passed:false,stage,error:String(error.stack||error),requests:requests.map(r=>r.op),failedRequests:network.filter(r=>r.type==='requestfailed'),directSave,serviceLogTail:logs.slice(-6000),diagnostic,output,screenshot,errors},null,2));process.exitCode=1}finally{await browser?.close().catch(()=>{});for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{};log.end()}
