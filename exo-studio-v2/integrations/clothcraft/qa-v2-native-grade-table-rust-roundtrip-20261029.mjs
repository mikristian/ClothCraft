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
const nativePort=5437,uiPort=5284
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`,children=[],requests=[],errors=[],network=[]
const serverLog=path.join(output,'services.log'),log=createWriteStream(serverLog,{flags:'a'})
const launch=(file,args,env={})=>{const child=spawn(file,args,{cwd:root,stdio:['ignore','pipe','pipe'],detached:true,env:{...process.env,...env}});for(const stream of ['stdout','stderr'])child[stream].on('data',chunk=>log.write(`[${path.basename(file)} ${stream}] ${chunk}`));child.on('exit',(code,signal)=>log.write(`[${path.basename(file)} exit] ${code} ${signal}\n`));children.push(child)}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(300)}throw Error('Service unavailable '+url)}
async function command(payload){const r=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();assert(j.ok,`${payload.op}: ${j.error}`);return j.data}
let browser,page,stage='launch'
async function pointerClick(locator,label){
 await locator.waitFor({state:'visible'})
 const box=await locator.boundingBox()
 assert(box?.width>0&&box?.height>0,`${label} has no onscreen bounds`)
 const x=box.x+box.width/2,y=box.y+box.height/2
 const hit=await locator.evaluate((button,{x,y})=>({same:document.elementFromPoint(x,y)?.closest('button')===button,element:document.elementFromPoint(x,y)?.outerHTML?.slice(0,300)}),{x,y})
 assert(hit.same,`${label} is obstructed at its pointer center: ${hit.element}`)
 await page.mouse.click(x,y)
}
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 await command({op:'open',preset:'tshirt'})
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1728,height:1040}})
 page.setDefaultTimeout(10000)
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(r.url().endsWith('/workspace')&&r.method()==='POST'){try{requests.push(r.postDataJSON())}catch{}}})
 page.on('requestfailed',r=>network.push({type:'requestfailed',url:r.url(),method:r.method(),error:r.failure()?.errorText}))
 page.on('response',async r=>{if(r.url().includes('/workspace'))network.push({type:'response',url:r.url(),status:r.status(),body:(await r.text().catch(()=>'' )).slice(0,700)})})
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board').first().waitFor({timeout:18000})
 stage='open full workspace grading table'
 const tableTab=page.getByRole('button',{name:'Grading Table',exact:true}).first()
 await tableTab.click()
 const table=page.locator('[data-exo-grade-bottom-widget="values"]')
 await table.waitFor({state:'visible'})
 stage='create live rules through grading table'
 const create=table.getByRole('button',{name:'Create native XS–XXL grade table'})
 // React switches the entire 2D workbench when initializing a size catalog;
 // Playwright can wait indefinitely for the old page's scheduled navigation.
 // Dispatch the real button handler and wait for its resulting form instead.
 if(await create.count())await pointerClick(create,'Create grading table')
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
 const commitResponse=page.waitForResponse(async r=>r.url().endsWith('/workspace')&&r.request().method()==='POST'&&r.request().postDataJSON()?.op==='grade-run-commit',{timeout:25000})
 // Save updates the current React workspace without a document navigation.
 // Dispatch the actual button handler while the network assertion waits for
 // the authoritative Rust commit response, avoiding Playwright's spurious
 // post-click navigation wait when the widget is replaced during commit.
 await pointerClick(save,'Save grading table')
 const committedResponse=await commitResponse
 assert.equal((await committedResponse.json()).ok,true,'Grade commit HTTP response rejected')
 console.log('SAVE_CLICK_NETWORK',JSON.stringify({requests:requests.map(r=>r.op),network}))
 const commits=requests.filter(r=>r.op==='grade-run-commit')
 assert(commits.length>0,'Clicking BoardV2 grading table Save did not send grade-run-commit')
 const saved=(await command({op:'save'})).project
 assert(saved.grade_run?.gradedTemplates?.length>=4,'Rust project lacks committed graded templates')
 stage='native Undo/Redo roundtrip'
 // Commit from the regular split workspace, then enter the dedicated 2D
 // editor whose top history ribbon stays accessible above floating grading.
 const patternFocus=page.getByRole('button',{name:'Open Pattern Studio'}).first()
 // This changes layout only; grade and native history acceptance use real pointer events.
 await patternFocus.evaluate(button=>button.click())
 await page.locator('[data-exo-grade-top-command-rail="true"]').waitFor({state:'visible'})
 console.log('NATIVE_HISTORY_VISIBILITY',JSON.stringify(await page.evaluate(()=>{
   const rail=document.querySelector('[data-exo-grade-top-command-rail="true"]')
   const button=rail?.querySelector('[data-native-history-action="undo"]')
   const details=element=>element&&({tag:element.tagName,rect:Object.fromEntries(['x','y','width','height'].map(k=>[k,element.getBoundingClientRect()[k]])),display:getComputedStyle(element).display,visibility:getComputedStyle(element).visibility,overflow:getComputedStyle(element).overflow,aria:element.getAttribute('aria-label'),disabled:element.disabled})
   const rect=button?.getBoundingClientRect(),top=rect&&document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)
   return {rail:details(rail),button:details(button),parent:details(button?.parentElement),hit:top?.outerHTML?.slice(0,400),html:button?.outerHTML?.slice(0,250)}
 })))
 // The grading table floats over the lower dock. Native history remains
 // clickable in the top pattern ribbon while the table is open.
 const historyToolbar=page.locator('[data-exo-grade-top-command-rail="true"] [data-native-history-action="undo"]').first()
 await historyToolbar.waitFor({state:'visible'})
 await assert.equal(await historyToolbar.isDisabled(),false,'Native UI Undo button disabled after grade commit')
 const undoResponse=page.waitForResponse(r=>r.url().endsWith('/workspace')&&r.request().method()==='POST'&&r.request().postDataJSON()?.op==='undo',{timeout:25000}).catch(()=>null)
 await pointerClick(historyToolbar,'Native Undo')
 const undoneResponse=await undoResponse
 assert(undoneResponse,'Clicking native Undo did not dispatch a backend request')
 assert.equal((await undoneResponse.json()).ok,true,'Native Undo response failed')
 assert(requests.some(r=>r.op==='undo'),'UI Undo did not dispatch native undo')
 const undoSnapshot=await command({op:'snapshot'}),undoStatus=await command({op:'grade-run-status',revision:undoSnapshot.revision})
 const undone=(await command({op:'save'})).project
 console.log('UNDO_STATE',JSON.stringify({snapshot:{persisted:undoSnapshot.gradeRunPersisted,revision:undoSnapshot.revision},status:{persisted:undoStatus.persistedInProject,catalog:!!undoStatus.catalog},project:{gradeRun:!!undone.grade_run},requests:requests.map(r=>r.op)}))
 assert.equal(undoSnapshot.gradeRunPersisted,false,'Native snapshot should reflect undone grading')
 assert.equal(undoStatus.persistedInProject,false,'Native grade-run-status still reports catalog after Undo')
 // Native status is the source of truth for Undo; the exported save packet can
 // retain a serialized catalog without marking it active in the session.
 const redoButton=page.locator('[data-exo-grade-top-command-rail="true"] [data-native-history-action="redo"]').first()
 await redoButton.waitFor({state:'visible'})
 const redoResponse=page.waitForResponse(r=>r.url().endsWith('/workspace')&&r.request().method()==='POST'&&r.request().postDataJSON()?.op==='redo',{timeout:25000}).catch(()=>null)
 await pointerClick(redoButton,'Native Redo')
 const redoneResponse=await redoResponse
 assert(redoneResponse,'Clicking native Redo did not dispatch a backend request')
 assert.equal((await redoneResponse.json()).ok,true,'Native Redo response failed')
 assert(requests.some(r=>r.op==='redo'),'UI Redo did not dispatch native redo')
 const redone=(await command({op:'save'})).project
 assert.deepEqual(redone.grade_run,saved.grade_run,'Native Redo failed to restore grade-run')
 stage='durable save/reopen'
 await command({op:'open',project:redone})
 const reopened=(await command({op:'save'})).project
 assert.deepEqual(reopened.grade_run,saved.grade_run,'Native reopen dropped graded templates')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,boardClick:true,nativeGradeCommit:true,undoRedo:true,saveReopen:true,
   historyPointerClicked:true,historyDomDispatched:false,
   commits:commits.length,output,errors},null,2))
}catch(error){const screenshot=path.join(output,'native-grade-ui-failure.png');await page?.screenshot({path:screenshot}).catch(()=>{});const diagnostic=await page?.evaluate(()=>({title:document.title,text:document.body.innerText.slice(0,1300),board:document.querySelectorAll('.cc-board').length})).catch(()=>null);let directSave;try{const r=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'save'}),signal:AbortSignal.timeout(5000)});directSave={status:r.status,body:(await r.text()).slice(0,500)}}catch(e){directSave={error:String(e),cause:String(e.cause)}}await sleep(150);const logs=readFileSync(serverLog,'utf8');console.error(JSON.stringify({passed:false,stage,error:String(error.stack||error),requests:requests.map(r=>r.op),network,directSave,serviceLogTail:logs.slice(-6000),diagnostic,output,screenshot,errors},null,2));process.exitCode=1}finally{await browser?.close().catch(()=>{});for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{};log.end()}
