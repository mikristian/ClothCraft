import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

// Independent fixture only. NEVER run on the user's live 5385/5386 workspace.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const storage=mkdtempSync(path.join(tmpdir(),'exo-physical-pleat-'))
const api='http://127.0.0.1:5449',ui='http://127.0.0.1:5286'
const children=[]
const start=(cmd,args,env={})=>children.push(spawn(cmd,args,{
 cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}}))
const wait=async uri=>{
 for(let i=0;i<100;i++){
  try{if((await fetch(uri,{signal:AbortSignal.timeout(750)})).ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,250))
 }throw Error('Timed out waiting for local isolated service: '+uri)
}
const request=async body=>{
 const res=await(await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify(body)})).json()
 assert.equal(res.ok,true,res.error||'Unknown native failure')
 return res.data
}
const next=async rev=>{
 let snapshot=await request({op:'snapshot'})
 for(let i=0;i<75&&snapshot.revision<=rev;i++){
  await new Promise(resolve=>setTimeout(resolve,100))
  snapshot=await request({op:'snapshot'})
 }
 assert.ok(snapshot.revision>rev,'Native physical pleat did not advance revision')
 return snapshot
}
const area=polygon=>{
 const p=polygon.points
 return Math.abs(p.reduce((sum,a,i)=>sum+
  a[0]*p[(i+1)%p.length][1]-a[1]*p[(i+1)%p.length][0],0))*0.5
}
let browser
try{
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:'5449',EXO_CLOTHCRAFT_OUTPUT_DIR:storage,
  EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')})
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5286','--strictPort'],
  {VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([wait(ui),wait(api+'/health')])
 await request({op:'open',preset:'tshirt'})
 const fixture=await request({op:'snapshot'})
 const previous=new Set(fixture.template.panels.map(panel=>panel.id))
 const vertices=[[0,0],[.4,0],[.4,.3],[0,.3]]
 await request({op:'edit',revision:fixture.revision,command:{kind:'Polygon',
  fabric:fixture.template.fabrics[0].id,points:vertices,tangents:vertices.map(()=>[0,0])}})
 const created=await request({op:'snapshot'})
 const sample=created.template.panels.find(panel=>!previous.has(panel.id))
 assert.ok(sample?.polygon,'Independent square panel failed to create')
 const cutContour=structuredClone(sample.polygon.points)
 const existingArea=area(sample.polygon),initialLines=sample.polygon.lines?.length||0
 const originalSeams=created.template.seams.length
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const page=await browser.newPage({viewport:{width:1520,height:980}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('dialog',async dialog=>{
  assert.match(dialog.message(),/EXPERIMENTAL native tuck sewing/)
  await dialog.accept()
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=physicalPleat20261025',
  {waitUntil:'domcontentloaded'})
 await page.locator('.cc-board svg[data-native-tool]').first().waitFor({state:'visible',timeout:35000})
 if((await page.locator('.workspaces').getAttribute('data-viewport-layout'))!=='2d')
  await page.locator('[data-tool-family="collapse-3d"] > button').first().click()
 await page.locator('.exo-pattern-toolpanel [data-pattern-design-tool="physical-pleat"]')
  .first().click()
 const panel=page.locator('[data-native-physical-pleat]')
 await panel.waitFor({state:'visible',timeout:10000})
 await panel.getByRole('combobox',{name:'Physical pleat pattern'}).selectOption(sample.id)
 await panel.getByRole('combobox',{name:'Physical pleat source edge'})
  .selectOption(sample.polygon.edges[0])
 await panel.getByRole('spinbutton',{name:'Physical pleat centre station (%)'}).fill('50')
 await panel.getByRole('spinbutton',{name:'Physical pleat intake per pleat (mm)'}).fill('18')
 await panel.getByRole('spinbutton',{name:'Physical pleat stitch path depth (mm)'}).fill('45')
 await panel.getByRole('spinbutton',{name:'Physical pleat number of pleats'}).fill('2')
 await panel.getByRole('spinbutton',{name:'Physical pleat centre spacing (mm)'}).fill('55')
 await page.waitForFunction(()=>document.querySelector('[data-native-physical-pleat-status]')?.dataset.nativePhysicalPleatStatus==='ready')
 assert.equal(await panel.locator('[data-native-physical-pleat-diagram]').count(),1)
 const boardPreview=page.locator(`[data-native-physical-pleat-board-preview="${sample.id}"]`)
 await boardPreview.waitFor({state:'attached',timeout:7000})
 assert.equal(await boardPreview.locator('[data-physical-pleat-pair]').count(),2,
  'Both physical tuck proposals must be located on the actual 2D pattern, not only in the inspector')
 await page.screenshot({path:path.join(root,'integrations/clothcraft/output/qa-physical-pleat-drafting-ui-20261025.png')})
 await panel.locator('[data-native-physical-pleat-apply]').click()
 const persisted=await next(created.revision)
 const after=persisted.template.panels.find(p=>p.id===sample.id)
 assert.deepEqual(after.polygon.points,cutContour)
 assert.ok(Math.abs(area(after.polygon)-existingArea)<1e-12)
 assert.equal((after.polygon.lines?.length||0)-initialLines,4)
 const recent=persisted.template.seams.slice(originalSeams)
 assert.equal(recent.length,2)
 assert.ok(recent.every(s=>s.a.panel===sample.id&&s.b.panel===sample.id&&
   s.a.edge!==s.b.edge&&!s.reverse_b&&!s.allow_ease))
 const telemetry=persisted.tuckFit||[]
 assert.equal(telemetry.filter(f=>recent.some(s=>s.id===f.seamId)).length,2)
 assert.ok(telemetry.every(f=>f.foldContactCertified===false))
 await page.waitForFunction(rev=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=rev,
  persisted.revision,{timeout:8000})
 const fitPanel=panel.locator('[data-native-physical-tuck-fit]')
 await fitPanel.waitFor({state:'visible',timeout:8000})
 assert.equal(await fitPanel.getAttribute('data-native-physical-tuck-fit'),'review-required')
 assert.ok((await fitPanel.textContent()).includes('NOT APPROVED'))
 assert.deepEqual(errors,[])
 // This batch is one single native edit-history event and must Undo atomically.
 const undone=await request({op:'undo',revision:persisted.revision})
 assert.equal(undone.template.seams.length,originalSeams)
 assert.equal(undone.template.panels.find(p=>p.id===sample.id).polygon.lines?.length||0,initialLines)
 assert.ok(Math.abs(area(undone.template.panels.find(p=>p.id===sample.id).polygon)-existingArea)<1e-12)
 console.log(JSON.stringify({pass:true,physicalTucks:recent.length,
  nativeSewnInternalPaths:4,cutContourPreserved:true,materialAreaPreserved:true,
  provisionalFitTelemetry:telemetry.length,atomicBatchUndo:true,pageErrors:0,
  nativeRevisions:[created.revision,persisted.revision,undone.revision]}))
}finally{
 await browser?.close()
 for(const child of children){try{process.kill(-child.pid,'SIGTERM')}catch{}}
}
