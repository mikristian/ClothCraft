// Real Chrome pointer QA of independent free-curve handles, isolated native project.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {createServer} from 'node:net'
import {freeTangentDragDelta} from '../../src/core/freeTangentDrag.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-independent-curve-qa-'))
mkdirSync(path.join(output,'workspace'))
let base,ui
const children=[],errors=[],failed=[],edits=[],pointerDiagnostics=[],childLogs=[]
const edge='neck-bottom',panelId='front'
let browser,page
async function reservePort(port=0){
  const server=createServer()
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})
  return {server,port:server.address().port}
}
async function release(reservation){await new Promise((resolve,reject)=>reservation.server.close(error=>error?reject(error):resolve()))}
async function selectPorts(){
  for(const port of [5284,5174,5189,5286,5416,5188,5173]){
    let browserPort
    try{browserPort=await reservePort(port)}catch(error){if(error.code==='EADDRINUSE')continue;throw error}
    const backendPort=await reservePort()
    const selected={uiPort:browserPort.port,backendPort:backendPort.port}
    await release(backendPort)
    await release(browserPort)
    return selected
  }
  throw Error('No free bridge-allowlisted Vite port; deferred physical QA without stopping other processes')
}
function launch(command,args,env={}){
  const processHandle=spawn(command,args,{cwd:root,stdio:['ignore','pipe','pipe'],detached:true,env:{...process.env,...env}})
  const log={command,args,stdout:'',stderr:'',exit:null}
  childLogs.push(log)
  processHandle.stdout.on('data',chunk=>{log.stdout=(log.stdout+chunk).slice(-3000)})
  processHandle.stderr.on('data',chunk=>{log.stderr=(log.stderr+chunk).slice(-6000)})
  processHandle.on('exit',(code,signal)=>{log.exit={code,signal}})
  children.push(processHandle)
}
async function ready(url){
  for(let i=0;i<140;i++){
    if(childLogs.some(log=>log.exit))throw Error('Owned service exited before ready: '+JSON.stringify(childLogs))
    try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error('Service unavailable '+url)
}
async function rpc(body){
  // The UI may still be persisting the preceding edit after its revision
  // appears in a snapshot. An intentional Undo/Redo/Open must wait for that
  // transaction to finish instead of racing an in-flight Save.
  for(let attempt=0;attempt<60;attempt++){
    const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    const json=await response.json()
    if(json.ok)return json.data
    if(!/Workspace busy; wait for the current operation/i.test(json.error||''))
      assert(json.ok,JSON.stringify({body,error:json.error}))
    await sleep(100)
  }
  throw Error('Native workspace did not become idle for '+body.op)
}
function mark(state,id){
  return state.template.panels.find(p=>p.id===panelId)?.polygon?.free_curve_points?.[edge]?.find(p=>p.id===id)
}
async function untilRevision(min){
  for(let i=0;i<70;i++){
    const state=await rpc({op:'snapshot'})
    if(state.revision>min)return state
    await sleep(150)
  }
  throw Error('Native revision did not advance beyond '+min)
}
async function drag(locator,dx,dy,modifiers=[]){
  await page.waitForFunction(()=>[...document.querySelectorAll('.cc-board')].every(n=>n.getAttribute('aria-busy')==='false'))
  await locator.waitFor({state:'visible',timeout:12000})
  const rect=await locator.boundingBox()
  assert(rect,'Missing pointer target')
  const start={x:rect.x+rect.width/2,y:rect.y+rect.height/2}
  const hit=await locator.evaluate((node,p)=>{const top=document.elementFromPoint(p.x,p.y);return {intended:node.getAttribute('data-free-curve-tangent-handle'),actual:top?.getAttribute('data-free-curve-tangent-handle'),html:top?.outerHTML?.slice(0,250),rect:node.getBoundingClientRect().toJSON()}},start)
  pointerDiagnostics.push({start,hit,delta:[dx,dy]})
  assert.equal(hit.actual,hit.intended,'Handle obscured at real pointer target: '+JSON.stringify(hit))
  await page.mouse.move(start.x,start.y)
  await page.mouse.down()
  for(const key of modifiers)await page.keyboard.down(key)
  await page.mouse.move(start.x+dx,start.y+dy,{steps:12})
  await page.mouse.up()
  for(const key of [...modifiers].reverse())await page.keyboard.up(key)
}
try{
  for(const [delta,side] of [[[.018,-.036],'out'],[[-.018,.036],'in']]){
    const converted=freeTangentDragDelta(delta,side)
    assert(converted.every((value,index)=>Math.abs(value-[.1,-.2][index])<1e-12),'Endpoint-to-derivative scaling '+side)
  }
  assert.equal(freeTangentDragDelta([NaN,0],'in'),null,'Invalid tangent deltas must be rejected')
  const ports=await selectPorts()
  base=`http://127.0.0.1:${ports.backendPort}`
  ui=`http://127.0.0.1:${ports.uiPort}`
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(ports.backendPort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(ports.uiPort),'--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:base
  })
  await Promise.all([ready(base+'/health'),ready(ui)])
  assert(childLogs[0].stdout.includes(`listening at ${base}`),'Native endpoint belongs to this test process: '+JSON.stringify(childLogs[0]))
  assert(childLogs[1].stdout.includes(`Local:   ${ui}/`),'Vite endpoint belongs to this test process: '+JSON.stringify(childLogs[1]))
  const original=await rpc({op:'open',preset:'tshirt'})
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(request.url().endsWith('/workspace')&&request.method()==='POST'){try{const body=request.postDataJSON();if(body.op!=='snapshot')edits.push({op:body.op,revision:body.revision,kind:body.command?.kind,polygon:body.command?.polygon?.free_curve_points?.[edge]})}catch{}}})
  page.on('response',async response=>{
    if(response.status()>=400&&response.url().includes('/workspace'))
      failed.push({status:response.status(),request:response.request().postData()?.slice(0,300),response:(await response.text().catch(()=>'' )).slice(-900)})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  await page.evaluate(()=>{window.__curvePointerTrace=[];for(const type of ['pointerdown','pointermove','pointerup','gotpointercapture','lostpointercapture'])document.addEventListener(type,e=>{if(window.__curvePointerTrace.length<80)window.__curvePointerTrace.push({type,target:e.target?.getAttribute?.('data-free-curve-tangent-handle')||e.target?.tagName,x:e.clientX,y:e.clientY,buttons:e.buttons,alt:e.altKey})},true)})
  const twoDLayout=page.getByRole('button',{name:'2D only',exact:true})
  if(await twoDLayout.count())await twoDLayout.first().click()
  const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool]')}).first()
  await board.waitFor({state:'attached',timeout:12000}).catch(async error=>{
    const diagnostics=await page.evaluate(()=>({url:location.href,title:document.title,boards:[...document.querySelectorAll('.cc-board')].map(n=>({editor:n.dataset.editorMode,nativeTool:n.querySelector('svg')?.dataset.nativeTool,markup:n.outerHTML.slice(0,180)})),body:document.body.innerText.slice(0,1100)}))
    throw Error('Board not mounted: '+JSON.stringify(diagnostics)+'; '+error.message)
  })
  await board.locator('[data-2d-edge-hit="front:neck-bottom"]').first().waitFor({state:'attached',timeout:12000}).catch(async error=>{
    const diagnostic=await page.evaluate(()=>({mode:document.querySelector('.cc-board')?.getAttribute('data-2d-editor-mode'),svg:document.querySelector('.cc-board svg')?.outerHTML.slice(0,700),edgeHits:[...document.querySelectorAll('[data-2d-edge-hit]')].map(n=>n.getAttribute('data-2d-edge-hit')).slice(0,15),panels:document.querySelectorAll('[data-panel]').length,board:document.querySelector('.cc-board')?.outerHTML.slice(0,750)}))
    throw Error('Front edge missing: '+JSON.stringify(diagnostic)+'; '+error.message)
  })
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  const svg=board.locator('svg[data-native-tool="curve"]')
  await svg.waitFor({timeout:10000})
  const target=board.locator('[data-2d-edge-hit="front:neck-bottom"]').first()
  await target.waitFor({state:'attached',timeout:12000})
  const clickPoint=await target.evaluate(node=>{
    const p=node.points.getItem(Math.floor((node.points.numberOfItems-1)/2))
    const q=node.points.getItem(Math.ceil((node.points.numberOfItems-1)/2))
    const xy=new DOMPoint((p.x+q.x)/2,(p.y+q.y)/2).matrixTransform(node.getScreenCTM())
    return {x:xy.x,y:xy.y}
  })
  await page.mouse.click(clickPoint.x,clickPoint.y)
  let state=await untilRevision(original.revision)
  const created=state.template.panels.find(p=>p.id===panelId)?.polygon?.free_curve_points?.[edge]
  assert.equal(created?.length,1,'Cutline pointer click must insert exactly one free knot')
  const id=created[0].id
  const knot=board.locator('[data-free-curve-point="'+panelId+':'+edge+':'+id+'"]')
  await knot.waitFor({state:'visible',timeout:12000})
  const inHandle=board.locator('[data-free-curve-tangent-handle="'+panelId+':'+edge+':'+id+':in"]')
  const outHandle=board.locator('[data-free-curve-tangent-handle="'+panelId+':'+edge+':'+id+':out"]')
  await inHandle.waitFor({state:'visible',timeout:12000})
  await outHandle.waitFor({state:'visible',timeout:12000})
  const insertedRevision=state.revision
  await drag(inHandle,-8,8,['Alt'])
  state=await untilRevision(insertedRevision)
  assert(Array.isArray(mark(state,id)?.derivative_in),'Incoming handle should persist derivative_in; actual='+JSON.stringify({marks:state.template.panels.find(p=>p.id===panelId)?.polygon?.free_curve_points?.[edge],revision:state.revision}))
  const incoming=mark(state,id).derivative_in
  const incomingRevision=state.revision
  await page.waitForFunction(()=>!document.querySelector('.cc-board svg[data-native-tool="curve"]')?.closest('.cc-board')?.dataset.busy,{},{timeout:5000})
  await sleep(550)
  await outHandle.waitFor({state:'visible',timeout:10000})
  await drag(outHandle,10,-6)
  state=await untilRevision(incomingRevision)
  const persisted=mark(state,id)
  assert(Array.isArray(persisted?.derivative_out),'Outgoing handle should persist derivative_out')
  assert.deepEqual(persisted.derivative_in,incoming,'Outgoing edit must preserve incoming tangent')
  assert(persisted.derivative_in.some((v,i)=>Math.abs(v-persisted.derivative_out[i])>1e-5),
    'Incoming and outgoing handles must permit independent directions')
  assert(state.positions?.length>0&&state.triangles?.length>0,'Native curved garment must compile 3D mesh')
  const finalEditRevision=state.revision
  state=await rpc({op:'undo',revision:state.revision})
  assert.notDeepEqual(mark(state,id)?.derivative_out,persisted.derivative_out,'Undo should restore previous outgoing tangent')
  state=await rpc({op:'redo',revision:state.revision})
  assert.deepEqual(mark(state,id)?.derivative_out,persisted.derivative_out,'Redo should restore outgoing tangent')
  assert.deepEqual(mark(state,id)?.derivative_in,persisted.derivative_in,'Redo should preserve incoming tangent')
  const saved=await rpc({op:'save'})
  state=await rpc({op:'open',project:saved.project})
  assert.deepEqual(mark(state,id)?.derivative_in,persisted.derivative_in,'Incoming tangent survives native reopen')
  assert.deepEqual(mark(state,id)?.derivative_out,persisted.derivative_out,'Outgoing tangent survives native reopen')
  assert(state.positions?.length>0&&state.triangles?.length>0,'Reopened curved garment still has a 3D mesh')
  await page.reload({waitUntil:'domcontentloaded'})
  await board.locator('[data-2d-edge-hit="front:neck-bottom"]').first().waitFor({state:'attached',timeout:20000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await board.locator('[data-2d-edge-hit="front:neck-bottom"]').first().click({force:true})
  await board.locator('[data-free-curve-point="'+panelId+':'+edge+':'+id+'"]').waitFor({state:'visible',timeout:12000})
  assert.equal(errors.length,0,'Browser exceptions: '+errors.join('; '))
  assert.equal(failed.length,0,'Native API errors: '+JSON.stringify(failed))
  const screenshot=path.join(output,'independent-curve-handles.png')
  await board.screenshot({path:screenshot})
  console.log(JSON.stringify({pass:true,output,screenshot,knot:id,revisions:{inserted:insertedRevision,incoming:incomingRevision,independent:finalEditRevision,reopened:state.revision},derivative_in:persisted.derivative_in,derivative_out:persisted.derivative_out,meshVertices:state.positions.length,meshTriangles:state.triangles.length,undo:true,redo:true,reload:true,errors,failed},null,2))
}catch(error){
  const screenshot=path.join(output,'independent-curve-failure.png')
  await page?.screenshot({path:screenshot}).catch(()=>{})
  const pointerTrace=await page?.evaluate(()=>window.__curvePointerTrace).catch(()=>[])
  console.error(JSON.stringify({pass:false,output,screenshot,error:String(error.stack||error),errors,failed,edits,pointerDiagnostics,pointerTrace,childLogs},null,2))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
