import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(tmpdir(),'exo-2d-vectorcraft-anchor-'))
const installed=process.argv.includes('--installed')
const api='http://127.0.0.1:5448',ui=installed?'http://127.0.0.1:5386':'http://127.0.0.1:5284'
const children=[]
const start=(command,args,env={})=>children.push(spawn(command,args,{cwd:root,detached:true,stdio:'ignore',
  env:{...process.env,...env}}))
const wait=async url=>{
  for(let n=0;n<120;n++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(850)})).ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Service not ready '+url)
}
const call=async body=>{
  const r=await (await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)})).json()
  assert.ok(r.ok,r.error||JSON.stringify(r).slice(0,350))
  return r.data
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5448',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  if(!installed)start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5284','--strictPort'],
    {VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([wait(api+'/health'),wait(ui)])
  await call({op:'open',preset:'tshirt'})
  const original=await call({op:'snapshot'})
  const fabric=original.template.fabrics[0].id
  const initialIds=new Set(original.template.panels.map(p=>p.id))
  await call({op:'edit',revision:original.revision,command:{kind:'Polygon',fabric,points:[
    [-.67,.18],[-.37,.18],[-.37,.48],[-.67,.48]],tangents:[[0,0],[0,0],[0,0],[0,0]]}})
  const first=await call({op:'snapshot'})
  const added=first.template.panels.find(p=>!initialIds.has(p.id))
  assert.ok(added?.polygon?.points?.length===4,'Independent rectangle pattern was not created')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1540,height:975}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  // Native V2 remains connected to its own user workspace. Only this
  // headless test page is routed to a separate temporary Rust session.
  if(installed)await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()}
    delete headers.origin
    const response=await route.fetch({url:api+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})
  })
  page.on('response',response=>{if(response.url().endsWith('/workspace')&&response.status()>=400)
    errors.push('HTTP '+response.status())})
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=anchor20261025',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board')
  const svg=board.locator('svg[data-native-tool]')
  await svg.waitFor({state:'visible',timeout:40000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
  await board.locator(`path[data-panel="${added.id}"]`).first().click({force:true})
  const corner=board.locator(`circle[data-pattern-anchor-index="1"][data-panel-id="${added.id}"]`)
  await corner.waitFor({state:'visible',timeout:14000})
  assert.equal(await svg.getAttribute('data-native-tool'),'select')
  await corner.dblclick({force:true})
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='direct-select')
  assert.ok(await corner.count(),'First double-click must enter Illustrator-like Direct Selection')
  // Direct Selection moves anchors rather than toggling their curve kind.
  // Existing Edit Pattern continues to provide double-click curve toggles.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'point'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='point')
  await corner.dblclick({force:true})
  await page.waitForFunction(()=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>0)
  let curved=await call({op:'snapshot'})
  for(let i=0;i<35&&curved.revision<=first.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150))
    curved=await call({op:'snapshot'})
  }
  assert.ok(curved.revision>first.revision,'Second double-click did not submit native curve conversion')
  const curvedPanel=curved.template.panels.find(p=>p.id===added.id)
  assert.ok(Object.keys(curvedPanel.polygon.curves||{}).length>=2,'Double-click did not create native Bézier handles')
  const rect=await corner.boundingBox()
  const from={x:rect.x+rect.width/2,y:rect.y+rect.height/2}
  await page.mouse.move(from.x,from.y)
  await page.mouse.down()
  await page.mouse.move(from.x-15,from.y+24,{steps:6})
  await page.mouse.up()
  let moved=await call({op:'snapshot'})
  for(let i=0;i<35&&moved.revision<=curved.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150))
    moved=await call({op:'snapshot'})
  }
  assert.ok(moved.revision>curved.revision,'Dragged corner did not update the native 2D pattern')
  const afterPoint=moved.template.panels.find(p=>p.id===added.id).polygon.points[1]
  assert.ok(Math.hypot(afterPoint[0]-curvedPanel.polygon.points[1][0],
    afterPoint[1]-curvedPanel.polygon.points[1][1])>.005,'Pocket corner did not move inward')
  // Wait until the SVG has applied the authoritative native revision. The
  // immediate third double-click can otherwise hit stale vertex coordinates.
  await page.waitForFunction(revision=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=revision,
    moved.revision,{timeout:10000})
  await corner.dblclick({force:true})
  let straight=await call({op:'snapshot'})
  for(let i=0;i<35&&straight.revision<=moved.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150))
    straight=await call({op:'snapshot'})
  }
  assert.ok(straight.revision>moved.revision,'Third double-click did not straighten the native corner')
  const last=straight.template.panels.find(p=>p.id===added.id)
  assert.equal(Object.keys(last.polygon.curves||{}).length,0)
  // The side family now includes a genuine Direct Selection tool; native
  // SplitBoundary and RemovePoint remain independent editing commands.
  const penFamily=board.locator('[data-tool-family="polygon"]')
  const penMain=penFamily.locator(':scope > button')
  const box=await penMain.boundingBox()
  assert.ok(box,'2D Pen tool icon is missing')
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2)
  await page.mouse.down()
  await page.waitForTimeout(550)
  assert.equal(await penFamily.getAttribute('data-touch-open'),'true',
    'Long-press did not open the Pen and anchor tools')
  await page.mouse.up()
  for(const label of ['Pen Tool','Anchor Point Tool','Direct Selection · A','Add Anchor Point Tool','Delete Anchor Point Tool']){
    assert.equal(await penFamily.locator('.clo-corner-tool-options').getByRole('menuitemradio',{name:label,exact:true}).count(),1,
      'Missing Pen flyout tool '+label)
  }
  assert.equal(await penFamily.locator('.clo-corner-tool-options [role="menuitemradio"]').count(),5)
  await penFamily.locator('.clo-corner-tool-options').getByRole('menuitemradio',{name:'Anchor Point Tool',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='anchor-point')
  // Native Delete and Split are preserved, but no longer nested in Pen.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'remove-anchor'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='remove-anchor')
  const beforeDelete=await call({op:'snapshot'})
  await board.locator(`circle[data-panel-id="${added.id}"][data-pattern-anchor-index="1"]`).click({force:true})
  let deleted=await call({op:'snapshot'})
  for(let i=0;i<35&&deleted.revision<=beforeDelete.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150))
    deleted=await call({op:'snapshot'})
  }
  assert.ok(deleted.revision>beforeDelete.revision,'Delete Anchor subtool did not submit native RemovePoint')
  assert.equal(deleted.template.panels.find(p=>p.id===added.id).polygon.points.length,3)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'split'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='split')
  await penMain.hover()
  await page.mouse.down()
  await page.waitForTimeout(490)
  await page.mouse.up()
  await penFamily.locator('.clo-corner-tool-options').getByRole('menuitemradio',{name:'Pen Tool',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='vector-pen')
  await svg.focus()
  await page.keyboard.down('Shift')
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='anchor-point')
  assert.equal(await svg.getAttribute('data-shift-anchor-active'),'true')
  await page.keyboard.up('Shift')
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='vector-pen')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'0')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,installed,penLongPress:true,
    penFlyoutAnchorTools:true,shiftTemporaryAnchorTool:true,nativeDeletePoint:true,
    shape:'independent 4-anchor rectangle / pocket',
    firstDoubleClick:'direct edit',secondDoubleClick:'native curved point',
    drag:'physical corner moved',thirdDoubleClick:'straight corner restored',
    revisionProgress:[first.revision,curved.revision,moved.revision,straight.revision],
    output,pageErrors:errors.length}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
