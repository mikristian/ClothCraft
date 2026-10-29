// Real 2D POM gesture against a disposable native Rust bridge and isolated
// source Vite server. No installed app assets, saved project or user ports are
// changed. Run only after building the source exo-session binary.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {chromium} from 'playwright-core'

const root=path.resolve(import.meta.dirname,'../../..')
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-pom-ui-'))
// Capture before closing the listener to avoid losing address() after close.
const port=()=>new Promise((resolve,reject)=>{
  const listener=net.createServer()
  listener.once('error',reject)
  listener.listen(0,'127.0.0.1',()=>{
    const value=listener.address().port
    listener.close(()=>resolve(value))
  })
})
const allowedVitePorts=[5174,5188,5189,5416,5284,5286,5173]
const canListen=number=>new Promise(resolve=>{
  const server=net.createServer()
  server.once('error',()=>resolve(false))
  server.listen(number,'127.0.0.1',()=>server.close(()=>resolve(true)))
})
let vitePort
for(const candidate of allowedVitePorts){
  if(await canListen(candidate)){vitePort=candidate;break}
}
assert.ok(vitePort,'No available allowlisted localhost development origin for EXO native bridge')
const bridgePort=await port()
const bridge='http://127.0.0.1:'+bridgePort
const dev='http://127.0.0.1:'+vitePort
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert.ok(fs.statSync(binary).isFile(),'Build native exo-session before POM QA')
const jobs=[]
const launch=(program,args,env)=>{
  const child=spawn(program,args,{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']})
  child.log=''
  for(const stream of [child.stdout,child.stderr]){
    stream.on('data',bytes=>{child.log=(child.log+bytes).slice(-2800)})
  }
  jobs.push(child)
  return child
}
const wait=async(fn,label)=>{
  for(let tries=0;tries<140;tries++){
    try{
      const value=await fn()
      if(value)return value
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,200))
  }
  throw Error('Timed out: '+label+'\n'+jobs.map(job=>job.log).join('\n'))
}
let browser
const native=async body=>{
  const response=await fetch(bridge+'/workspace',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(30000),
  })
  const payload=await response.json()
  assert.ok(response.ok&&payload.ok,payload.error||'Native POM command rejected')
  return payload.data
}
try{
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(bridgePort),
    EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_OUTPUT_DIR:scratch,
    EXO_CLOTHCRAFT_SESSION_BIN:binary,
  })
  launch(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1',
    '--port',String(vitePort),'--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:bridge,
  })
  await wait(async()=>fetch(bridge+'/health').then(r=>r.ok),'isolated bridge')
  await wait(async()=>fetch(dev+'/').then(r=>r.ok),'source Vite')
  const initial=await native({op:'snapshot'})
  browser=await chromium.launch({headless:true,
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1590,height:1000}})
  const errors=[]
  const consoleErrors=[]
  const nativeRejections=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text().slice(0,250))})
  page.on('response',async response=>{
    if(response.url().endsWith('/workspace')&&response.status()>=400){
      nativeRejections.push({code:response.status(),body:await response.text().catch(()=>'' )})
    }
  })
  await page.goto(dev+'/?desktop=1&engine=clothcraft&qa=pom-native',{waitUntil:'domcontentloaded',timeout:45000})
  try{
    await page.locator('.cc-board [data-panel]').first().waitFor({state:'visible',timeout:30000})
  }catch(e){
    const detail={location:page.url(),pageErrors:errors,consoleErrors,
      body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1300),
      bridgeHealth:await fetch(bridge+'/health').then(r=>r.json()).catch(()=>null),
      devLog:jobs.map(job=>job.log)}
    console.error('POM_QA_BOOT_DIAGNOSTIC',JSON.stringify(detail))
    throw e
  }
  const firstPanel=initial.template.panels.find(p=>p.polygon)
  assert.ok(firstPanel,'Native POM QA requires an editable pattern')
  assert.equal(firstPanel.polygon.measurements?.length||0,0,'Disposable project starts without POMs')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'measure'}})))
  await page.locator('.cc-board svg[data-native-tool="measure"]').first().waitFor({state:'visible'})
  const sideNames=firstPanel.polygon.edges
  const pickEdge=async edge=>{
    const hit=page.locator(`.cc-board [data-2d-edge-hit="${firstPanel.id}:${edge}"]`).first()
    await hit.waitFor({state:'attached'})
    return hit.evaluate(element=>{
      const index=Math.floor(element.points.numberOfItems/2)
      const p=element.points.getItem(index)
      const m=element.getScreenCTM()
      if(!m)throw Error('2D edge has no material-to-screen transform')
      return{x:p.x*m.a+p.y*m.c+m.e,y:p.x*m.b+p.y*m.d+m.f}
    })
  }
  // Use two distinct named boundaries; the native station is snapped from
  // each clicked point, not derived from screen pixels for persistence.
  const a=await pickEdge(sideNames[0]),b=await pickEdge(sideNames[2])
  const describe=async p=>page.evaluate(({x,y})=>{
    const at=document.elementFromPoint(x,y)
    const board=document.querySelector('.cc-board')
    const svg=board?.querySelector('svg')
    return {x,y,hit:at?.tagName,hitAttrs:at?.getAttributeNames().filter(v=>v.startsWith('data-')).map(v=>[v,at.getAttribute(v)]),
      boardTool:svg?.getAttribute('data-native-tool'),boardRevision:board?.getAttribute('data-document-revision'),
      visible:at?.getBoundingClientRect?.().toJSON?.()}
  },p)
  if(process.env.EXO_QA_DEBUG==='1'){
    console.log('POM_QA_EDGE_TARGETS',JSON.stringify({a:await describe(a),b:await describe(b),edges:sideNames}))
  }
  await page.mouse.click(a.x,a.y)
  await page.mouse.click(b.x,b.y)
  const after=await wait(async()=>{
    const snapshot=await native({op:'snapshot'})
    const panel=snapshot.template.panels.find(p=>p.id===firstPanel.id)
    return panel?.polygon?.measurements?.length===1?snapshot:null
  },'two-click native POM creation').catch(async error=>{
    console.error('POM_QA_CLICK_DIAGNOSTIC',JSON.stringify({
      errors,consoleErrors,nativeRejections,
      tool:await page.locator('.cc-board svg').first().getAttribute('data-native-tool').catch(()=>null),
      editor:await page.locator('[data-native-pom-editor]').first().innerText().catch(()=>null),
      tape:await page.locator('[data-tape-measurement]').count(),
      pom:await page.locator('[data-native-pom]').count(),
      board:await page.locator('.cc-board').first().getAttribute('data-document-revision').catch(()=>null),
    }))
    throw error
  })
  let measurement=after.template.panels.find(p=>p.id===firstPanel.id).polygon.measurements[0]
  assert.equal(measurement.label,'POM 1')
  assert.ok([sideNames[0],sideNames[2]].includes(measurement.a.edge))
  assert.ok(measurement.id)
  await page.locator(`[data-native-pom="${measurement.id}"]`).first()
    .waitFor({state:'attached',timeout:10000})
  const selected=page.locator('[data-native-pom-select]').first()
  await selected.waitFor({state:'visible',timeout:10000})
  await selected.click()
  await page.getByLabel('Edit native POM label').fill('Across pattern')
  await page.locator('[data-native-pom-save-label="true"]').click()
  const renamed=await wait(async()=>{
    const snapshot=await native({op:'snapshot'})
    const found=snapshot.template.panels.find(p=>p.id===firstPanel.id)
      .polygon.measurements.find(row=>row.id===measurement.id)
    return found?.label==='Across pattern'?found:null
  },'native POM rename from board inspector')
  assert.deepEqual(renamed.a,measurement.a)
  assert.deepEqual(renamed.b,measurement.b)
  measurement=renamed
  const lastRevision=await native({op:'snapshot'})
  const audit=await native({op:'pattern-audit',revision:lastRevision.revision})
  const auditPanel=audit.panels.find(p=>p.panelId===firstPanel.id)
  assert.equal(auditPanel.pomCount,1,'Rust pattern audit must include persisted POM')
  assert.equal(auditPanel.measurements[0].id,measurement.id)
  assert.ok(auditPanel.measurements[0].lengthMm>0,'Native POM readout must be metric')
  await page.locator('[data-native-pom-select]').filter({hasText:'Across pattern'})
    .waitFor({state:'visible',timeout:12000})
  await page.locator('[data-native-pom-delete="true"]:not(:disabled)').waitFor({state:'visible',timeout:12000})
  await page.locator('[data-native-pom-delete="true"]').click()
  try{await wait(async()=>{
    const snapshot=await native({op:'snapshot'})
    const panel=snapshot.template.panels.find(p=>p.id===firstPanel.id)
    return (panel?.polygon?.measurements||[]).length===0?true:null
  },'native POM delete from board inspector')}catch(error){
    console.error('POM_DELETE_DIAGNOSTIC',JSON.stringify({
      nativeRejections,consoleErrors,pageErrors:errors,
      snapshot:(await native({op:'snapshot'}).catch(e=>({error:e.message})))?.template?.panels?.[0]?.polygon?.measurements,
      editor:(await page.locator('[data-native-pom-editor]').first().innerText().catch(()=>'' )).slice(0,800),
    }))
    throw error
  }
  const deleted=await native({op:'snapshot'})
  const restored=await native({op:'undo',revision:deleted.revision})
  assert.deepEqual(restored.template.panels.find(p=>p.id===firstPanel.id).polygon.measurements,
    [measurement],'Undo must restore a deleted POM with the same ID and anchors')
  const saved=await native({op:'save'})
  const reopened=await native({op:'open',project:saved.project})
  const retained=reopened.template.panels.find(p=>p.id===firstPanel.id).polygon.measurements
  assert.deepEqual(retained,[measurement],'Saved/reopened POM must have identical identity and anchors')
  assert.deepEqual(errors,[],'2D browser must not throw')
  console.log(JSON.stringify({pass:true,isolated:true,realBrowser:true,realRust:true,
    panel:firstPanel.id,measurementId:measurement.id,anchors:[measurement.a,measurement.b],
    editedLabel:measurement.label,deleteAndUndo:true,savedAndReopened:true,
    renderedPom:true,pageErrors:errors.length}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of jobs)child.kill('SIGTERM')
  fs.rmSync(scratch,{recursive:true,force:true})
}
