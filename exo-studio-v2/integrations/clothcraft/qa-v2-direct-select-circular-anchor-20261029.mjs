// Real browser + native Rust regression for Direct Selection's on-canvas circle.
// This fixture uses a disposable, unsewn pattern; it does not bypass the
// separate seam-length review required when adjusting an authored sewn edge.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const dir=mkdtempSync(path.join(os.tmpdir(),'exo-direct-select-circle-'))
const api='http://127.0.0.1:5441',site='http://127.0.0.1:5286'
const processes=[],errors=[]
const start=(file,args,env={})=>{
  const child=spawn(file,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}})
  processes.push(child)
}
const ready=async url=>{
  for(let i=0;i<115;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1500)})).ok)return}catch{}
    await delay(300)
  }
  throw Error(`Unavailable ${url}`)
}
const rpc=async command=>{
  const reply=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)})
  const result=await reply.json()
  assert.equal(result.ok,true,`${command.op}: ${result.error||reply.status}`)
  return result.data
}
let browser,page
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5441',EXO_CLOTHCRAFT_OUTPUT_DIR:dir,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')})
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5286','--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([ready(api+'/health'),ready(site)])
  await rpc({op:'open',preset:'tshirt'})
  const before=await rpc({op:'snapshot'})
  const known=new Set(before.template.panels.map(p=>p.id))
  await rpc({op:'edit',revision:before.revision,command:{kind:'Polygon',fabric:before.template.fabrics[0].id,
    points:[[0,0],[.3,0],[.3,.24],[0,.24]]}})
  const authored=await rpc({op:'save'})
  const added=authored.project.template.panels.find(p=>!known.has(p.id))
  assert(added?.polygon,'Rust did not author a physical polygon')
  assert.equal(authored.project.template.seams.some(s=>s.a?.panel===added.id||s.b?.panel===added.id),false)

  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(site+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board').first()
  const svg=board.locator('svg[data-native-tool]')
  await board.locator(`[data-2d-pattern-piece="${added.id}"]`).waitFor({timeout:60000})
  const choose=async tool=>{
    await page.evaluate(name=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:name}})),tool)
    await board.locator(`svg[data-native-tool="${tool}"]`).waitFor({state:'visible'})
  }
  await choose('select')
  await board.locator(`[data-panel="${added.id}"][data-pattern-surface="drafting-paper"]`).click({force:true})
  await choose('direct-select')
  const vertex=board.locator(`[data-panel-id="${added.id}"][data-pattern-anchor-index="1"]`)
  await vertex.waitFor({state:'visible'})
  await vertex.dblclick({force:true})
  const widget=board.locator('[data-anchor-circle-kind="native"] [data-anchor-curve-handle="true"]')
  await widget.waitFor({state:'visible'})
  const material=board.locator(`[data-panel="${added.id}"][data-pattern-surface="drafting-paper"]`)
  const originalPath=await material.getAttribute('d')
  const rect=await widget.boundingBox()
  assert(rect)
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2
  await page.mouse.move(x,y)
  await page.mouse.down()
  await page.mouse.move(x+24,y+19,{steps:10})
  const previewPath=await material.getAttribute('d')
  assert.notEqual(previewPath,originalPath,'Native curve must reshape the actual drafting-paper preview during drag')
  assert(await board.locator('[data-anchor-circle-tangent-guide]').count()>=2,
    'Both incoming and outgoing tangent guidelines must be present during drag')
  await page.mouse.up()
  let saved
  for(let attempt=0;attempt<60;attempt++){
    saved=(await rpc({op:'save'})).project
    const poly=saved.template.panels.find(p=>p.id===added.id)?.polygon
    if(poly?.curves?.[poly.edges[0]]&&poly?.curves?.[poly.edges[1]])break
    await delay(150)
  }
  const changedPanel=saved.template.panels.find(p=>p.id===added.id)
  const poly=changedPanel?.polygon
  // Native Shape intentionally normalizes local material coordinates, moving
  // layout_2d by the inverse amount. Compare the physical on-canvas positions.
  const worldPoints=panel=>{
    const a=(panel.layout_rotation_degrees||0)*Math.PI/180
    const origin=panel.layout_2d||[0,0]
    return panel.polygon.points.map(([x,y])=>[
      origin[0]+x*Math.cos(a)-y*Math.sin(a),
      origin[1]+x*Math.sin(a)+y*Math.cos(a)])
  }
  for(const [i,actual] of worldPoints(changedPanel).entries()){
    const expected=worldPoints(added)[i]
    assert(actual.every((v,axis)=>Math.abs(v-expected[axis])<1e-8),
      `The physical position of corner ${i} moved during curve editing`)
  }
  const vertexPoint=poly.points[1],incoming=poly.curves?.[poly.edges[0]]?.[1],outgoing=poly.curves?.[poly.edges[1]]?.[0]
  assert(incoming&&outgoing,'Both physical cubic controls must be committed to native Rust Shape')
  const inc=incoming.map((v,i)=>v-vertexPoint[i]),out=outgoing.map((v,i)=>v-vertexPoint[i])
  assert(Math.hypot(...out)>.001,'The circular drag must create a measurable curve')
  assert(Math.abs(inc[0]*out[1]-inc[1]*out[0])<1e-8&&inc[0]*out[0]+inc[1]*out[1]<0,
    'The native edit must have aligned opposing smooth handles')
  assert.notDeepEqual(poly.curves,added.polygon.curves)
  const beforeHistory=JSON.stringify(saved)
  const nativeNow=await rpc({op:'snapshot'})
  await rpc({op:'undo',revision:nativeNow.revision})
  assert.deepEqual((await rpc({op:'save'})).project.template.panels.find(p=>p.id===added.id)?.polygon,added.polygon)
  const afterUndo=await rpc({op:'snapshot'})
  await rpc({op:'redo',revision:afterUndo.revision})
  assert.equal(JSON.stringify((await rpc({op:'save'})).project),beforeHistory,'Redo must restore authored native cubic geometry')
  const reopened=(await rpc({op:'save'})).project
  await rpc({op:'open',project:reopened})
  assert.deepEqual((await rpc({op:'save'})).project.template.panels.find(p=>p.id===added.id)?.polygon,poly,
    'Save/reopen must keep the same physical cubic controls')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,actualBrowser:true,actualNativeRust:true,widgetDrag:true,
    liveCurvePreview:true,opposedCubicHandles:true,undoRedo:true,saveReopen:true,errors}))
}catch(error){
  console.error(JSON.stringify({pass:false,reason:String(error?.stack||error),dir,errors}))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of processes)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
