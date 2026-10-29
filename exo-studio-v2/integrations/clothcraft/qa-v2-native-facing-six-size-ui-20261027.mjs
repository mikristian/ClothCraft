// Real disposable native Rust + Vite + ONE headless Chrome review of the
// graded physical facing preview. Never modifies the installed user project.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import {mkdtempSync,mkdirSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const output=mkdtempSync(path.join(tmpdir(),'exo-native-facing-ui-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const children=[]
let browser
const freePort=()=>new Promise((resolve,reject)=>{
  const s=createServer();s.once('error',reject)
  s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))})
})
const start=(cmd,args,env)=>{const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',
  env:{...process.env,...env}});children.push(child)}
const ready=async url=>{
  for(let i=0;i<110;i++){
    try{
      const res=await fetch(url,{signal:AbortSignal.timeout(1200)})
      if(res.ok){
        if(url.endsWith('/health')&&(await res.json()).nativeReady===false){await sleep(200);continue}
        return
      }
    }catch{}
    await sleep(250)
  }
  throw Error(`Disposable facing UI service unavailable: ${url}`)
}
try{
  assert(existsSync(binary)&&existsSync(chrome),'Compiled Rust session and Google Chrome required')
  const [nativePort,uiPort]=await Promise.all([freePort(),freePort()])
  assert.notEqual(nativePort,uiPort)
  const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'})
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([ready(native+'/health'),ready(ui)])
  const rpc=async input=>{
    const res=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(input),signal:AbortSignal.timeout(30000)})
    const json=await res.json()
    assert(json.ok,`${input.op}: ${json.error||'native operation blocked'}`)
    return json.data
  }
  let state=await rpc({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])
    state=await rpc({op:'edit',revision:state.revision,command:{kind:'RemoveSeam',seam:seam.id}})
  const known=new Set(state.template.panels.map(p=>p.id))
  state=await rpc({op:'edit',revision:state.revision,command:{kind:'Polygon',fabric:state.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const id=state.template.panels.find(p=>!known.has(p.id))?.id
  assert(id,'No authored facing parent available')
  const original=await rpc({op:'save',revision:state.revision})
  for(const panel of original.project.template.panels){
    panel.polygon.seam_allowances=Object.fromEntries(panel.polygon.edges.map(edge=>[edge,.01]))
  }
  const edge=original.project.template.panels.find(p=>p.id===id).polygon.edges[0]
  original.project.template.panels.find(p=>p.id===id).polygon.notches={
    [edge]:[{t:.25,depth_m:.004},{t:.75,depth_m:.004}]}
  original.project.state=null;original.project.mesh_signature=null
  state=await rpc({op:'open',project:original.project})
  const base=structuredClone(state.template)
  const sizes=['XS','S','M','L','XL','XXL']
  const gradeRun={schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(base),
    gradedTemplates:sizes.map((size,i)=>{
      const grade=structuredClone(base),poly=grade.panels.find(p=>p.id===id).polygon
      poly.points[1][0]+=(i-2)*.008
      poly.points[2][0]+=(i-2)*.008
      return grade
    }),pomSpecs:[]}
  state=await rpc({op:'grade-run-commit',revision:state.revision,gradeRun})
  const before=(await rpc({op:'save',revision:state.revision})).project
  const captured=state.revision
  const rust=await rpc({op:'grade-run-cutlines',revision:captured})
  assert.equal(rust.sizes.length,6)

  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--disable-gpu','--no-first-run']})
  const page=await browser.newPage({viewport:{width:1670,height:1060}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=native-facing-six-size-ui-20261027`,{
    waitUntil:'domcontentloaded',timeout:35000})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:50000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{
    detail:{nativeAction:'pattern2d.editGrading'}})))
  const grading=page.locator('[data-native-grade-pattern="true"]')
  await grading.waitFor({state:'visible',timeout:20000})
  await grading.getByRole('tab',{name:'Seams & QA'}).click()
  const expandable=grading.locator('[data-native-facing-six-size-tool="true"]')
  await expandable.waitFor({state:'attached',timeout:15000})
  await expandable.locator('summary').click()
  const facing=expandable.locator('[data-native-facing-candidate="true"]')
  await facing.waitFor({state:'visible',timeout:10000})
  await facing.getByRole('combobox',{name:'Facing source pattern'}).selectOption(id)
  await facing.getByRole('combobox',{name:'Facing source edge'}).selectOption(edge)
  await facing.getByRole('spinbutton',{name:'Facing depth mm'}).fill('40')
  await facing.getByRole('spinbutton',{name:'Facing seam allowance mm'}).fill('10')
  const button=facing.getByRole('button',{name:'Preview all six physical facing sizes'})
  assert.equal(await button.isDisabled(),false,await facing.innerText())
  await button.click()
  const report=facing.locator('[data-facing-six-size-result="true"]')
  await report.waitFor({state:'visible',timeout:20000}).catch(async error=>{
    const context=await page.evaluate(()=>({url:location.href,
      gradePresent:Boolean(document.querySelector('[data-native-grade-pattern]')),
      facingPresent:Boolean(document.querySelector('[data-native-facing-candidate]')),
      facingText:document.querySelector('[data-native-facing-candidate]')?.textContent?.slice(0,1500),
      bodyText:document.body?.innerText?.slice(-1200)})).catch(err=>({error:err.message}))
    throw Error(`Facing preview did not render: ${error.message}; UI context ${JSON.stringify(context)}; page errors ${JSON.stringify(errors)}`)
  })
  const rows=report.getByRole('table',{name:'Native six-size facing physical construction'}).locator('tbody tr')
  assert.equal(await rows.count(),6)
  assert.deepEqual((await rows.locator('th').allTextContents()).map(x=>x.trim()),sizes)
  assert.match(await facing.innerText(),/not yet|not created|read-only|not.*saved/i)
  assert.deepEqual((await rpc({op:'save',revision:captured})).project,before,
    'Preview must not commit a new facing or modify saved native source')
  assert.equal(errors.length,0,`Facing UI page errors: ${errors.join(' | ')}`)
  console.log(JSON.stringify({passed:true,nativeRust:true,realBrowser:true,
    facingVisibleIn2DGradingQuality:true,sizes:6,parentPanelId:id,parentEdgeId:edge,
    sourceRevision:captured,previewImmutable:true,pageErrors:errors,
    manufacturingApproved:false,licensedModarisAccepted:false},null,2))
}catch(error){
  console.error(JSON.stringify({passed:false,nativeRust:true,realBrowser:true,
    reason:error?.message??String(error),manufacturingApproved:false},null,2))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
