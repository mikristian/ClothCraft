// Disposable real UI shift-click -> one Rust NotchPair -> two saved notches -> one undo.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {createServer} from 'node:net'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Missing disposable native exo-session')
const scratch=mkdtempSync(path.join(tmpdir(),'exo-notch-pair-ui-'))
mkdirSync(path.join(scratch,'workspace'))
async function freePort(){const socket=createServer();return new Promise((resolve,reject)=>{socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port))})})}
const nativePort=await freePort(),api=`http://127.0.0.1:${nativePort}`
const ui=process.env.EXO_NOTCH_PAIR_UI||'http://127.0.0.1:5386'
const processNative=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
 cwd:root,stdio:'ignore',env:{...process.env,EXO_CLOTHCRAFT_PORT:String(nativePort),
 EXO_CLOTHCRAFT_OUTPUT_DIR:scratch,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
 EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'}})
let browser,serverUi
const calls=[],errors=[],failed=[]
const rpc=async body=>{const response=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const result=await response.json();assert(result.ok,JSON.stringify({body,error:result.error}));return result.data}
const wait=async predicate=>{for(let i=0;i<100;i++){const state=await rpc({op:'snapshot'});if(predicate(state))return state;await sleep(125)}throw Error('Timed out waiting for native change')}
try{
 let ready=false
 for(let i=0;i<100;i++){try{const response=await fetch(api+'/health',{signal:AbortSignal.timeout(750)});if(response.ok&&(await response.json()).nativeReady){ready=true;break}}catch{}await sleep(150)}
 assert(ready,'Private Rust service not ready')
 // Clone UI route if no already running instance is supplied, but never run a second browser profile.
 try{const response=await fetch(ui,{signal:AbortSignal.timeout(1200)});if(!response.ok)throw Error('UI unavailable')}
 catch{
  const {execFile}=await import('node:child_process')
  const vite=path.join(root,'node_modules/.bin/vite')
  assert(existsSync(vite),'No Vite available for disposable UI')
  const uiPort=await freePort();serverUi=spawn(vite,['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{cwd:root,stdio:'ignore',env:{...process.env,VITE_CLOTHCRAFT_BRIDGE_URL:api}})
  for(let i=0;i<90;i++){try{if((await fetch(`http://127.0.0.1:${uiPort}`,{signal:AbortSignal.timeout(750)})).ok){process.env.EXO_NOTCH_PAIR_UI=`http://127.0.0.1:${uiPort}`;break}}catch{}await sleep(200)}
  assert(process.env.EXO_NOTCH_PAIR_UI,'Disposable UI failed startup')
 }
 const uiUrl=process.env.EXO_NOTCH_PAIR_UI||ui
 let state=await rpc({op:'open',preset:'tshirt'})
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.1],origin:[0,0],fabric:state.template.fabrics[0].id}})
 const rectangle=state.template.panels.at(-1),id=rectangle.id,edge=rectangle.polygon.edges[0]
 assert(Math.abs(Math.hypot(rectangle.polygon.points[1][0]-rectangle.polygon.points[0][0],rectangle.polygon.points[1][1]-rectangle.polygon.points[0][1])-.2)<1e-8,'First rectangle edge must be 200mm')
 const beforeRevision=state.revision
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const page=await browser.newPage({viewport:{width:1728,height:1040}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const request=route.request(),body=request.postDataJSON();calls.push(body)
  try{const response=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const text=await response.text();if(!response.ok)failed.push({kind:body.command?.kind,body,status:response.status,text:text.slice(0,450)});await route.fulfill({status:response.status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:text})}
  catch(error){await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:String(error)})})}
 })
 await page.goto(uiUrl+'/?desktop=1&engine=clothcraft&qa=notch-pair',{waitUntil:'domcontentloaded',timeout:30000})
 const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool]')}).first()
 await board.locator('[data-2d-edge-hit]').first().waitFor({timeout:45000})
 await page.getByLabel('3D and 2D window arrangement',{exact:true}).selectOption('2d').catch(()=>{})
 await board.getByRole('button',{name:'Frame all',exact:true}).click().catch(()=>{})
 // Native tool events may select the drawing tool only; the 2D corner
 // controls also need the corresponding real toolbar selection/mode.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('garment-studio-native-action',{detail:'2d.notch'})))
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'notch'}})))
 await board.locator('svg[data-native-tool="notch"]').waitFor({timeout:15000})
 // The values live inside the actual 2D Pattern Display corner flyout.
 await board.getByRole('button',{name:'2D Pattern Display'}).click()
 await board.getByRole('spinbutton',{name:'Notch depth in millimetres'}).waitFor({state:'visible',timeout:10000}).catch(async error=>{
  const debug=await page.evaluate(()=>({activeTool:document.querySelector('.cc-board svg')?.getAttribute('data-native-tool'),boardMode:document.querySelector('.cc-board')?.getAttribute('data-2d-editor-mode'),detail:[...document.querySelectorAll('.cc-2d-display-details')].map(x=>x.outerHTML.slice(0,1000)),menus:[...document.querySelectorAll('[data-tool-family="pattern-display"]')].map(x=>x.outerHTML.slice(0,2000)),inputs:[...document.querySelectorAll('input')].map(x=>({aria:x.getAttribute('aria-label'),value:x.value}))}));throw Error(String(error)+' '+JSON.stringify(debug))
 })
 await board.getByRole('spinbutton',{name:'Notch depth in millimetres'}).fill('4')
 await board.getByRole('spinbutton',{name:'Double notch spacing in millimetres'}).fill('6')
 assert.equal(await board.getByRole('spinbutton',{name:'Notch depth in millimetres'}).inputValue(),'4')
 assert.equal(await board.getByRole('spinbutton',{name:'Double notch spacing in millimetres'}).inputValue(),'6')
 // Dismiss the option flyout before targeting the real pattern cutline.
 await board.getByRole('button',{name:'2D Pattern Display'}).click()
 const target=board.locator(`[data-2d-edge-hit="${id}:${edge}"]`).first()
 await target.waitFor({state:'attached',timeout:15000})
 const point=await target.evaluate(node=>{const pts=(node.getAttribute('points')||'').trim().split(/\s+/).map(value=>value.split(',').map(Number));if(pts.length<2)throw Error('Missing edge polyline');const a=pts[0],b=pts.at(-1),m=node.getScreenCTM();const middle=new DOMPoint((a[0]+b[0])/2,(a[1]+b[1])/2).matrixTransform(m);return{x:middle.x,y:middle.y}})
 const hit=await page.evaluate(({x,y})=>{let el=document.elementFromPoint(x,y);return{outer:el?.outerHTML.slice(0,500),hit:el?.closest('[data-2d-edge-hit]')?.getAttribute('data-2d-edge-hit')}},point)
 assert.equal(hit.hit,`${id}:${edge}`,'Target edge occluded: '+JSON.stringify({point,hit}))
 await page.keyboard.down('Shift');try{await page.mouse.click(point.x,point.y)}finally{await page.keyboard.up('Shift')}
 state=await wait(current=>(current.template.panels.find(p=>p.id===id)?.polygon?.notches?.[edge]||[]).length===2)
 const pairCalls=calls.filter(call=>call.op==='edit'&&call.command?.kind==='NotchPair')
 assert.equal(pairCalls.length,1,'Expected exactly one NotchPair request')
 const params=pairCalls[0].command
 assert.equal(params.panel,id);assert.equal(params.edge,edge)
 assert(Math.abs(params.depth_m-.004)<1e-9)
 assert(Math.abs(params.spacing_m-.006)<1e-9)
 const marks=state.template.panels.find(p=>p.id===id).polygon.notches[edge]
 assert.equal(marks.length,2);marks.forEach(mark=>assert(Math.abs(mark.depth_m-.004)<1e-9))
 assert(Math.abs((marks[1].t-marks[0].t)*.2-.006)<0.0001,'Saved marks are not 6mm apart')
 assert.equal(state.revision,beforeRevision+1,'NotchPair should create one revision')
 const saved=await rpc({op:'save'})
 assert.equal(saved.project.template.panels.find(p=>p.id===id).polygon.notches[edge].length,2)
 const beforeUndo=calls.filter(call=>call.op==='undo').length
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('garment-studio-native-action',{detail:'edit.undo'})))
 const undone=await wait(current=>(current.template.panels.find(p=>p.id===id)?.polygon?.notches?.[edge]||[]).length===0)
 assert.equal(calls.filter(call=>call.op==='undo').length,beforeUndo+1,'One UI undo expected')
 assert.equal(undone.revision,state.revision+1)
 assert.equal(calls.filter(call=>call.command?.kind==='Notch').length,0,'Shift-click must not emit individual Notch edits')
 assert.deepEqual(errors,[])
 assert.deepEqual(failed,[])
 console.log(JSON.stringify({pass:true,script:'qa-manufacturing-notch-pair-ui-20261020.mjs',source:'real Playwright UI',privatePort:nativePort,rectangleMm:[200,100],panel:id,edge,NotchPairRequests:pairCalls.length,command:params,marks,save:true,oneUndoRemovedBoth:true,revisions:{before:beforeRevision,paired:state.revision,undone:undone.revision},pageErrors:errors},null,2))
}catch(error){console.error(JSON.stringify({pass:false,error:String(error.stack||error),nativePort,calls:calls.slice(-12),failed,errors},null,2));process.exitCode=1}
finally{await browser?.close().catch(()=>{});processNative.kill('SIGTERM');serverUi?.kill('SIGTERM')}
