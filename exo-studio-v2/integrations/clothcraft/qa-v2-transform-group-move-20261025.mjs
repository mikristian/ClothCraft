// Native 2D multi-selection browser acceptance; all native writes use throwaway test output.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const out=mkdtempSync(path.join(tmpdir(),'exo-group-transform-'))
mkdirSync(path.join(out,'workspace'),{recursive:true})
const api='http://127.0.0.1:5421',ui='http://127.0.0.1:5284'
const children=[]
const run=(cmd,args,env={})=>{const p=spawn(cmd,args,{cwd:root,env:{...process.env,...env},stdio:'ignore',detached:true});children.push(p);return p}
async function ready(url){for(let i=0;i<80;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(1200)});if(r.ok)return}catch{}await sleep(250)}throw Error('Service unavailable '+url)}
async function request(body){const response=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const answer=await response.json();assert(answer.ok,JSON.stringify(answer.error));return answer.data}
const origin=panel=>panel.layout_2d??panel.layout
let browser
try{
 run(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:'5421',EXO_CLOTHCRAFT_OUTPUT_DIR:out,EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_GPU:'0'})
 run(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5284','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([ready(api+'/health'),ready(ui)])
 await request({op:'open',preset:'tshirt'})
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']})
 const page=await browser.newPage({viewport:{width:1728,height:1040}})
 const errors=[],ops=[],gesture=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',line=>{if(line.type()==='error')console.log('PAGE ERROR',line.text())})
 page.on('request',req=>{if(req.url().endsWith('/workspace')&&req.method()==='POST')try{ops.push(req.postDataJSON())}catch{}})
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 const board=page.locator('.cc-board').first(),svg=board.locator('svg[aria-label="Metric 2D pattern board with linked sewing and measurements"]')
 await svg.waitFor({timeout:35000})
 const before=await request({op:'snapshot'}),ids=before.template.panels.filter(p=>p.polygon).slice(0,2).map(p=>p.id)
 assert.equal(ids.length,2,'Need two selectable native panels')
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
 await page.locator(`[data-2d-pattern-piece="${ids[0]}"] [data-pattern-surface="drafting-paper"]`).first().click({force:true})
 await page.locator(`[data-2d-pattern-piece="${ids[1]}"] [data-pattern-surface="drafting-paper"]`).first().click({force:true,modifiers:['Shift']})
 await page.waitForTimeout(200)
 for(let id of ids)assert.equal(await board.locator(`[data-2d-pattern-piece="${id}"]`).getAttribute('data-2d-pattern-selected'),'true',id+' not selected')
 const hit=await page.evaluate(ids=>{const board=document.querySelector('.cc-board');const path=board.querySelector(`[data-2d-pattern-piece="${ids[0]}"] [data-pattern-surface="drafting-paper"]`);const box=path.getBoundingClientRect();for(let a of [.35,.5,.65,.25,.75])for(let b of [.3,.45,.6,.7]){const x=box.left+box.width*a,y=box.top+box.height*b;const element=document.elementFromPoint(x,y);if(element?.closest?.(`[data-2d-pattern-piece="${ids[0]}"]`))return {x,y,target:element.getAttribute('data-pattern-surface')||element.tagName}}return null},ids)
 assert(hit,'Cannot find drag pixel on first selected panel');console.log('TARGET',JSON.stringify(await page.evaluate(([x,y])=>{let el=document.elementFromPoint(x,y);return {outer:el?.outerHTML.slice(0,260),path:el?.closest('svg')?.getAttribute('aria-label'),chain:[el,el?.parentElement,el?.parentElement?.parentElement].map(n=>[n?.tagName,n?.getAttribute('data-2d-pattern-piece'),n?.getAttribute('class')])}},[hit.x,hit.y])))
 console.log('BEFORE DRAG',JSON.stringify({hit,selected:await Promise.all(ids.map(id=>board.locator(`[data-2d-pattern-piece=\"${id}\"]`).getAttribute('data-2d-pattern-selected')))}));await page.evaluate(()=>{window.__exoTrace=[];const board=document.querySelector('svg[aria-label="Metric 2D pattern board with linked sewing and measurements"]');for(const type of ['pointerdown','pointermove','pointerup','mousedown','mousemove','mouseup','lostpointercapture','click']){for(const element of [window,document,board])element.addEventListener(type,e=>window.__exoTrace.push({listen:element===window?'window':element===document?'document':'svg',type,target:e.target?.getAttribute?.('data-pattern-surface')||e.target?.getAttribute?.('data-panel')||e.target?.tagName,phase:e.eventPhase}),true)}});console.log('BEFORE BOARD',JSON.stringify(await page.evaluate(()=>({tool:document.querySelector('svg[aria-label="Metric 2D pattern board with linked sewing and measurements"]')?.getAttribute('data-native-tool'),mode:document.querySelector('.cc-board')?.getAttribute('data-2d-editor-mode'),busy:document.querySelector('.cc-board')?.getAttribute('aria-busy'),svg:document.querySelector('svg[aria-label="Metric 2D pattern board with linked sewing and measurements"]')?.getBoundingClientRect().toJSON()}))));await page.mouse.move(hit.x,hit.y);await page.mouse.down();await page.mouse.move(hit.x+68,hit.y+32,{steps:8});await page.mouse.up();console.log('GESTURE TRACE',JSON.stringify(await page.evaluate(()=>window.__exoTrace)));console.log('AFTER ELEMENT',JSON.stringify(await page.evaluate(([x,y])=>{const n=document.elementFromPoint(x,y);return [n?.tagName,n?.getAttribute('data-panel'),n?.getAttribute('data-pattern-surface')]},[hit.x,hit.y])));console.log('AFTER SELECTION',JSON.stringify(await Promise.all(ids.map(id=>board.locator(`[data-2d-pattern-piece=\"${id}\"]`).getAttribute('data-2d-pattern-selected')))))
 await page.waitForTimeout(400)
 const after=await request({op:'snapshot'}),batch=ops.filter(v=>v.op==='edit-batch')
 assert.equal(batch.length,1,'One atomic group edit expected; ops='+JSON.stringify(ops.map(v=>v.op)))
 assert.deepEqual(batch[0].commands.map(c=>c.panel).sort(),ids.slice().sort())
 const deltas=ids.map(id=>{const a=before.template.panels.find(p=>p.id===id),b=after.template.panels.find(p=>p.id===id);return origin(b).map((v,j)=>v-origin(a)[j])})
 assert(Math.hypot(...deltas[0])>.01,'Group must actually move')
 assert(Math.hypot(deltas[0][0]-deltas[1][0],deltas[0][1]-deltas[1][1])<1e-8,'Selected panels must move identically')
 for(let id of ids)assert.equal(await board.locator(`[data-2d-pattern-piece="${id}"]`).getAttribute('data-2d-pattern-selected'),'true','selection should persist '+id)
 await request({op:'undo'});const undone=await request({op:'snapshot'});for(let id of ids)assert.deepEqual(origin(undone.template.panels.find(p=>p.id===id)),origin(before.template.panels.find(p=>p.id===id)))
 assert.equal(errors.length,0,JSON.stringify(errors))
 console.log(JSON.stringify({passed:true,ids,hit,delta:deltas[0],batchCommands:batch[0].commands.length,undo:true,pageErrors:errors.length,output:out},null,2))
}finally{await browser?.close();for(let p of children)if(p.pid){try{process.kill(-p.pid,'SIGTERM')}catch{try{p.kill('SIGTERM')}catch{}}}}
