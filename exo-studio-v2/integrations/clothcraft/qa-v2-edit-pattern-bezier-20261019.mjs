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
  const hit=await locator.evaluate((node,p)=>{const top=document.elementFromPoint(p.x,p.y);return {intended:node.getAttribute('data-curve-handle'),actual:top?.getAttribute('data-curve-handle'),html:top?.outerHTML?.slice(0,250),rect:node.getBoundingClientRect().toJSON()}},start)
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

  // Exercise the real toolbar button, not only an internal dispatch event.
  const buttons=await page.locator('button').evaluateAll(ns=>ns.map(n=>({title:n.title,label:n.getAttribute('aria-label'),tool:n.dataset.tool})).filter(n=>/edit pattern|edit points/i.test((n.title||'')+' '+(n.label||''))))
  console.log('EDIT_BUTTONS',JSON.stringify(buttons))
  const button=page.locator('button').filter({hasText:/^$/}).locator('visible=true')
  const editButton=page.locator('button[title]').filter({has:page.locator('svg')})
  const realButton=page.getByRole('button',{name:'Edit Pattern',exact:true})
  assert(await realButton.count()>0,'Edit Pattern toolbar button must exist')
  await realButton.first().click()
  await board.locator('svg[data-native-tool="point"]').waitFor()
  async function clickEdge(edgeName){
    const target=board.locator('[data-2d-edge-hit="front:'+edgeName+'"]').first()
    const p=await target.evaluate(n=>{const q=n.points.getItem(Math.floor((n.points.numberOfItems-1)/2)),r=n.points.getItem(Math.ceil((n.points.numberOfItems-1)/2));const v=new DOMPoint((q.x+r.x)/2,(q.y+r.y)/2).matrixTransform(n.getScreenCTM());return {x:v.x,y:v.y}})
    await page.mouse.click(p.x,p.y)
  }
  await clickEdge(edge)
  let baseState=original
  if(!original.template.panels.find(p=>p.id==='front').polygon.curves?.[edge]){
    await page.getByRole('button',{name:'Show Bézier handles',exact:true}).click()
    baseState=await untilRevision(original.revision)
  }
  const handle=board.locator('[data-curve-handle="front:'+edge+':0"]')
  await handle.waitFor({state:'visible'})
  const initial=baseState.template.panels.find(p=>p.id==='front').polygon
  await drag(handle,10,-8,['Alt'])
  let state=await untilRevision(baseState.revision)
  let polygon=state.template.panels.find(p=>p.id==='front').polygon
  assert.notDeepEqual(polygon.curves[edge][0],initial.curves[edge][0])
  assert.deepEqual(polygon.curves[edge][1],initial.curves[edge][1],'Other control remains independent')
  const edited=structuredClone(polygon.curves[edge])
  state=await rpc({op:'undo',revision:state.revision})
  assert.deepEqual(state.template.panels.find(p=>p.id==='front').polygon.curves[edge],initial.curves[edge])
  state=await rpc({op:'redo',revision:state.revision})
  assert.deepEqual(state.template.panels.find(p=>p.id==='front').polygon.curves[edge],edited)
  await page.reload({waitUntil:'domcontentloaded'})
  await board.locator('[data-2d-edge-hit="front:neck-bottom"]').first().waitFor({state:'attached'})
  await realButton.first().click()
  const straight=initial.edges.find(e=>!initial.curves?.[e]&&!initial.free_curve_points?.[e]?.length)
  assert(straight,'Fixture needs a straight edge')
  await clickEdge(straight)
  await page.getByRole('button',{name:'Show Bézier handles',exact:true}).click()
  state=await untilRevision(state.revision)
  polygon=state.template.panels.find(p=>p.id==='front').polygon
  const i=polygon.edges.indexOf(straight),a=polygon.points[i],b=polygon.points[(i+1)%polygon.points.length]
  for(let c=0;c<2;c++)for(let j=0;j<2;j++)assert(Math.abs(polygon.curves[straight][c][j]-(a[j]+(b[j]-a[j])*(c+1)/3))<1e-6,'Showing handles must preserve straight shape')
  const converted=structuredClone(polygon.curves[straight])
  await drag(board.locator('[data-curve-handle="front:'+straight+':0"]'),8,9,['Alt'])
  state=await untilRevision(state.revision)
  polygon=state.template.panels.find(p=>p.id==='front').polygon
  assert.notDeepEqual(polygon.curves[straight],converted,'Handle drag creates a real curve')
  const saved=await rpc({op:'save'})
  state=await rpc({op:'open',project:saved.project})
  assert.deepEqual(state.template.panels.find(p=>p.id==='front').polygon.curves[straight],polygon.curves[straight])
  assert(state.positions.length>0&&state.triangles.length>0)
  assert.equal(await board.locator('[data-panel="front"]').getAttribute('fill'),'#ffffff')
  await page.screenshot({path:path.join(output,'edit-pattern-ui.png')})
  assert.deepEqual(errors,[])
  assert.deepEqual(failed,[])
  console.log(JSON.stringify({pass:true,output,toolbar:true,bezierDrag:true,straightToCurve:true,undo:true,redo:true,saveReopen:true,errors,failed},null,2))
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
