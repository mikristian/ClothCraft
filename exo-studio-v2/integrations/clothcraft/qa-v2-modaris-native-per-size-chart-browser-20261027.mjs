/** Isolated real Rust + Vite + Chrome pointer acceptance of native per-size chart authoring. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {createServer} from 'node:net'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
// Each QA run must own its disposable services. Fixed ports can silently
// connect to an orphaned prior test and produce a false positive.
async function availablePort(){
  const server=createServer()
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
  const port=server.address().port
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))
  return port
}
const nativePort=await availablePort()
let uiPort=await availablePort()
while(uiPort===nativePort)uiPort=await availablePort()
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-native-size-chart-browser-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Missing compiled exo-session Rust binary')
const children=[]
function start(cmd,args,env={}){
  const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
  return child
}
async function ready(url,child){
  for(let attempt=0;attempt<120;attempt++){
    if(child.exitCode!==null||child.signalCode!==null)throw Error(`Disposable service exited before ready: ${url}`)
    try{if((await fetch(url,{signal:AbortSignal.timeout(1250)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error(`Disposable service unavailable: ${url}`)
}
let state
async function command(payload){
  const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:state?.revision,...payload})})
  const envelope=await response.json()
  assert(envelope.ok,`${payload.op}: ${envelope.error||JSON.stringify(envelope)}`)
  if(envelope.data?.template)state=envelope.data
  return envelope.data
}
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.015,S:-.007,M:0,L:.005,XL:.010,XXL:.014}
const clone=structuredClone
const width=(project,id,size)=>project.grade_run.gradedTemplates[sizes.indexOf(size)].panels.find(p=>p.id===id).polygon.points[1][0]*1000
const close=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`)
let browser,stage='start',page
const pageErrors=[],requests=[]
const workspaceResponses=[]
try{
  const nativeChild=start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
  })
  const uiChild=start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:native,
  })
  await Promise.all([ready(native+'/health',nativeChild),ready(ui,uiChild)])
  stage='seed real Rust project'
  await command({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])await command({op:'edit',revision:state.revision,command:{kind:'RemoveSeam',seam:seam.id}})
  const existing=new Set(state.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++)await command({op:'edit',revision:state.revision,command:{kind:'Polygon',fabric:state.template.fabrics[0].id,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=state.template.panels.filter(p=>!existing.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2)
  const seeded=(await command({op:'save'})).project
  for(const panel of seeded.template.panels)if(panel.polygon)
    panel.polygon.seam_allowances=Object.fromEntries(panel.polygon.edges.map(edge=>[edge,.01]))
  seeded.state=null;seeded.mesh_signature=null
  await command({op:'open',project:seeded})
  await command({op:'bindings-store',revision:state.revision,nativeBindings:{
    measurements:{halfWidth:{valueMm:200},width:{formula:'halfWidth * 2'}},
    bindings:ids.map((panelId,i)=>({id:'formula_panel_'+i,panelId,pointIndex:1,mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]})),
  }})
  const base=clone(state.template)
  await command({op:'grade-run-commit',revision:state.revision,gradeRun:{schemaVersion:1,sizes,baseSize:'M',baseTemplate:clone(base),
    gradedTemplates:sizes.map(size=>{
      const template=clone(base)
      for(const id of ids)template.panels.find(p=>p.id===id).polygon.points[1][0]+=offsets[size]
      return template
    }),pomSpecs:[{id:'width_pom',label:'Physical width',panelId:ids[0],kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:50,
      targetsMm:Object.fromEntries(sizes.map(size=>[size,null]))}],
  }})
  const originalRevision=state.revision
  const originalProject=(await command({op:'save'})).project
  stage='Chrome UI navigation'
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
  page=await browser.newPage({viewport:{width:1740,height:1100}})
  page.on('pageerror',error=>pageErrors.push(error.message))
  page.on('request',request=>{if(request.url().endsWith('/workspace')&&request.method()==='POST')try{requests.push(request.postDataJSON())}catch{}})
  page.on('response',async response=>{
    if(!response.url().endsWith('/workspace')||response.request().method()!=='POST')return
    try{
      const body=await response.json()
      workspaceResponses.push({op:response.request().postDataJSON()?.op,status:response.status(),ok:body?.ok,error:body?.error,revision:body?.data?.revision})
    }catch(error){workspaceResponses.push({status:response.status(),error:`response decode: ${error.message}`})}
  })
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=modaris-native-per-size-20261027',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'construction-point'}})))
  const studio=page.locator('[data-native-construction-tool="true"]')
  await studio.waitFor({state:'visible',timeout:12000})
  await studio.getByRole('combobox',{name:'Construction pattern panel'}).selectOption(ids[0])
  await studio.getByRole('combobox',{name:'Construction target point'}).selectOption('1')
  await studio.getByRole('combobox',{name:'Numerical construction method'}).selectOption('polar')
  await studio.getByRole('combobox',{name:'Construction reference A'}).selectOption('0')
  await studio.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
  for(let attempt=0;attempt<5&&!await studio.getByRole('textbox',{name:'Named drafting measurement worksheet'}).isVisible();attempt++){
    await studio.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
    await sleep(300)
  }
  const bindings=studio.locator('[data-native-constraint-sidecar="true"]')
  await bindings.locator('summary').first().click()
  const disclosure=bindings.locator('[data-modaris-native-per-size-chart-tool="true"]')
  const chart=disclosure.locator('[data-native-per-size-chart="authoring"]')
  for(let i=0;i<10&&!await chart.isVisible();i++){
    try{await disclosure.locator('summary').click({timeout:2500})}catch(error){if(i===9)throw error}
    await sleep(350)
  }
  await chart.waitFor({state:'visible',timeout:15000})
  stage='load native saved project from button'
  await chart.getByRole('button',{name:'Load native saved project for chart authoring'}).click()
  await chart.getByText('Loaded saved Rust project.',{exact:false}).waitFor({timeout:15000})
  stage='author 6 direct values, 24 measurement bounds, 12 physical POM bounds'
  await chart.getByRole('combobox',{name:'Native chart fabric'}).selectOption(originalProject.template.fabrics[0].id)
  await chart.getByRole('textbox',{name:'Native chart provenance'}).fill('Operator-authored six-size native browser QA physical provenance')
  for(const size of sizes){
    const half=200+offsets[size]*500,full=half*2
    await chart.getByRole('textbox',{name:`halfWidth ${size} direct millimetres`}).fill(String(half))
    for(const [name,lo,hi] of [['halfWidth',half-2,half+11],['width',full-4,full+22]]){
      await chart.getByRole('textbox',{name:`${name} ${size} min millimetres`,exact:true}).fill(String(lo))
      await chart.getByRole('textbox',{name:`${name} ${size} max millimetres`,exact:true}).fill(String(hi))
    }
    await chart.getByRole('textbox',{name:`width_pom ${size} physical min millimetres`}).fill(String(full-1))
    await chart.getByRole('textbox',{name:`width_pom ${size} physical max millimetres`}).fill(String(full+16))
  }
  stage='validate and confirm using browser controls'
  await chart.getByRole('button',{name:'Validate six-size native chart packet'}).click()
  await chart.getByRole('region',{name:'Authoritative native chart preview'}).waitFor({state:'visible',timeout:15000})
  await chart.getByRole('checkbox',{name:'Confirm native six-size chart store'}).check()
  await chart.getByRole('button',{name:'Store native chart · one Rust Undo revision'}).click()
  const outcome=await Promise.race([
    chart.locator('[data-native-chart-receipt="true"]').waitFor({state:'visible',timeout:20000}).then(()=>({receipt:true})),
    chart.getByText(/Native store refused:|Native storage may have committed;/).waitFor({state:'visible',timeout:20000}).then(async()=>({failure:await chart.getByText(/Native store refused:|Native storage may have committed;/).innerText()})),
  ])
  if(!outcome.receipt)throw Error(`Chart UI rejected store: ${outcome.failure}`)
  stage='native inspection after UI store'
  let stored=(await command({op:'save'})).project
  assert(stored.fabric_grade_envelope?.perSizeChart,'Browser chart did not persist a native per-size chart')
  assert.equal(stored.fabric_grade_envelope.perSizeChart.values.halfWidth.M.valueMm,200)
  assert.equal(stored.fabric_grade_envelope.perSizeChart.values.width.L.valueMm,405)
  await command({op:'snapshot'})
  const inspected=await command({op:'fabric-grade-envelope-inspect'})
  assert.equal(inspected.nativeAuthoritative,true)
  assert.deepEqual(inspected.envelope,stored.fabric_grade_envelope)
  await command({op:'snapshot'})
  assert.equal(state.revision,originalRevision+1)
  stage='browser-driven regeneration 400 to 410'
  await chart.getByRole('combobox',{name:'Native regeneration measurement'}).selectOption('halfWidth')
  await chart.getByRole('textbox',{name:'Native regeneration millimetres'}).fill('205')
  await chart.getByRole('button',{name:'Regenerate all six sizes through Rust'}).click()
  // A native revision becomes visible before the browser's postcommit save
  // witness has completed. Do not race an independent Undo against that save:
  // the real UI transaction is complete only after its own receipt is shown.
  await chart.locator('[data-native-chart-receipt="true"]').getByText(
    'Native regeneration returned a receipt.',{exact:true}).waitFor({state:'visible',timeout:30000})
  await command({op:'snapshot'})
  assert.equal(state.revision,originalRevision+2,'Browser did not commit regeneration')
  const regenerated=(await command({op:'save'})).project
  for(const size of sizes)close(width(regenerated,ids[0],size),410+offsets[size]*1000)
  assert(requests.some(r=>r.op==='fabric-grade-envelope-store'),'Browser must invoke native chart store')
  assert(requests.some(r=>r.op==='bindings-grade-regenerate'),'Browser must invoke native six-size regenerate')
  stage='Rust undo redo and save reopen'
  await command({op:'undo'})
  assert.deepEqual((await command({op:'save'})).project,stored)
  await command({op:'undo'})
  assert.deepEqual((await command({op:'save'})).project,originalProject)
  await command({op:'redo'})
  assert.deepEqual((await command({op:'save'})).project,stored)
  await command({op:'redo'})
  assert.deepEqual((await command({op:'save'})).project,regenerated)
  await command({op:'open',project:clone(regenerated)})
  assert.deepEqual((await command({op:'save'})).project.fabric_grade_envelope,regenerated.fabric_grade_envelope)
  assert.deepEqual(pageErrors,[],'Unexpected Chrome page errors')
  console.log(JSON.stringify({passed:true,realChrome:true,realRust:true,pointerAuthored:true,sizes:6,directCells:6,measurementBounds:24,physicalBounds:12,
    panels:2,sourceRevision:originalRevision,storeSingleRevision:true,regenerateSingleRevision:true,regeneratedBaseMm:410,
    undoRedo:true,saveReopen:true,pageErrors:pageErrors.length}))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,error:error.message,pageErrors,requestOps:requests.map(r=>r.op),workspaceResponses,stack:error.stack}))
  process.exitCode=1
}finally{
  if(browser){
    const closed=await Promise.race([browser.close().then(()=>true,()=>true),sleep(4000).then(()=>false)])
    if(!closed)try{browser.process()?.kill('SIGKILL')}catch{}
  }
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
// Playwright/Chromium can retain handles after a completed disposable QA.
// Services have been signalled and the result is final; do not leave a
// resident runner that contaminates the next test's service discovery.
process.exit(process.exitCode??0)
