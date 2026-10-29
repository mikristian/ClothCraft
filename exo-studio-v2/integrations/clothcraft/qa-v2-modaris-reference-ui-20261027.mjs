/** Disposable real Rust + Chrome acceptance for one-shot reference recompute. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {createNativePatternConstraintSidecar20261023 as createSidecar} from '../../src/core/nativePatternConstraintBindings20261023.js'
import {planModarisNativeReferenceRecompute20261027 as planReference} from '../../src/core/modarisNativeReferenceRecompute20261027.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5478,uiPort=5298
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-reference-qa-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const children=[]
let browser
const close=async()=>{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
const start=(cmd,args,env={})=>{const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});children.push(child)}
async function ready(url){
  for(let i=0;i<100;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(250)}
  throw Error(`Disposable service unavailable: ${url}`)
}
async function command(body){
  const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const json=await response.json()
  assert(json.ok,`Rust ${body.op} refused: ${json.error||JSON.stringify(json)}`)
  return json.data
}
async function position(panelId,index){
  const s=await command({op:'snapshot'})
  return {s,p:s.template.panels.find(p=>p.id===panelId)?.polygon.points[index]}
}
async function until(check,description){
  for(let i=0;i<100;i++){if(await check())return;await sleep(100)}
  throw Error(description)
}
const near=(x,y)=>Math.abs(x-y)<1e-6

try{
  assert(existsSync(session),'Build Rust exo-session before live browser acceptance')
  assert(existsSync(chrome),'Headless Chrome missing')
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:native,
  })
  await Promise.all([ready(native+'/health'),ready(ui)])
  const original=await command({op:'open',preset:'tshirt'})
  const fabric=original.template?.fabrics?.[0]?.id
  assert(fabric,'Rust source fabric missing')
  const created=await command({op:'edit',revision:original.revision,command:{
    kind:'Primitive',shape:'rectangle',size:[.4,.3],origin:[0,0],fabric,
  }})
  const panel=created.template.panels.at(-1)
  assert.equal(panel.polygon.subdivisions,0,'Actual Rust primitive must serialize zero subdivisions')
  assert(near(panel.polygon.points[1][0],.4))
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--disable-gpu','--no-first-run']})
  const page=await browser.newPage({viewport:{width:1660,height:1050}})
  const errors=[],requests=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{
    if(request.url().endsWith('/workspace')&&request.method()==='POST'){
      try{requests.push(request.postDataJSON())}catch{}
    }
  })
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=modaris-reference-qa-20261027',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'construction-point'}})))
  const studio=page.locator('[data-native-construction-tool="true"]')
  await studio.waitFor({state:'visible',timeout:10000})
  await studio.getByRole('combobox',{name:'Construction pattern panel'}).selectOption(panel.id)
  await studio.getByRole('combobox',{name:'Construction target point'}).selectOption('2')
  await studio.getByRole('combobox',{name:'Numerical construction method'}).selectOption('polar')
  await studio.getByRole('spinbutton',{name:'Numerical construction angle degrees'}).fill('90')
  await studio.getByRole('combobox',{name:'Construction reference A'}).selectOption('1')
  await studio.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
  await studio.getByRole('textbox',{name:'Named drafting measurement worksheet'}).fill('reach = 250')
  await studio.getByRole('textbox',{name:'Drafting distance formula expression'}).fill('reach')
  const bindings=studio.locator('[data-native-constraint-sidecar="true"]')
  await bindings.locator('summary').first().click()
  await bindings.getByRole('button',{name:'Bind this point to formula'}).click()
  await bindings.locator('[data-native-binding-status="ready"]').waitFor({state:'visible',timeout:10000})
  const before=await command({op:'snapshot'})
  assert.equal(before.nativePointBindings?.active,true,'Expected Rust-saved active binding')
  const section=bindings.locator('[data-modaris-native-reference-recompute-tool="true"]')
  await section.locator('summary').first().click()
  const editor=section.getByRole('region',{name:'Modaris native reference recompute'})
  await editor.waitFor({state:'visible'})
  await editor.getByRole('combobox',{name:'Source panel'}).selectOption(panel.id)
  await editor.getByRole('combobox',{name:'Unbound source anchor'}).selectOption('1')
  await editor.getByRole('textbox',{name:'Desired X mm'}).fill('420')
  await editor.getByRole('textbox',{name:'Desired Y mm'}).fill('0')
  await editor.getByRole('button',{name:'Preview source and all dependent corrections'}).click()
  const preview=editor.getByLabel('Native recompute preview')
  await preview.waitFor({state:'visible',timeout:10000})
  assert.match(await preview.innerText(),/2 edits in 1 panel/)
  assert.match(await preview.innerText(),/Point 2: X 420\.000 mm/)
  assert.match(await preview.innerText(),/Point 3: X 420\.000 mm, Y 250\.000 mm/)
  const commit=editor.getByRole('button',{name:'Apply confirmed native AnchorGroup'})
  assert(await commit.isDisabled(),'Commit must require second confirmation')
  await editor.getByRole('checkbox',{name:'Confirm applying this exact source and dependent native batch'}).check()
  await commit.click()
  await until(async()=>{
    const {p}=await position(panel.id,2)
    return p&&near(p[0],.42)&&near(p[1],.25)
  },'Native source and dependent were not updated')
  const after=await command({op:'snapshot'})
  const moved=after.template.panels.find(p=>p.id===panel.id).polygon.points
  assert(near(moved[1][0],.42)&&near(moved[2][0],.42)&&near(moved[2][1],.25))
  assert.equal(after.revision,before.revision+1,'Two point changes must use one native revision')
  await editor.locator('p[role="status"]').filter({hasText:'Rust persisted 1 point rules'}).waitFor({timeout:10000})
  assert.match(await editor.locator('p[role="status"]').filter({hasText:'Rust persisted 1 point rules'}).innerText(),/all saved binding positions were checked/)
  assert(requests.some(r=>r.op==='edit-batch'&&r.commands?.length===1&&
    r.commands[0].kind==='AnchorGroup'&&r.commands[0].panel===panel.id&&
    r.commands[0].edits?.map(x=>x[0]).join(',')==='1,2'),'Real browser must send one source-first native AnchorGroup')
  // Negative acceptance uses copies of the REAL native Rust snapshot, with
  // independently recomputed binding fingerprints. It never edits the session.
  const active=before.nativePointBindings
  const bindingDefinition=active?.measurements&&active?.bindings ? active : null
  assert(bindingDefinition,'Saved native binding definition must be present for attachment QA')
  const attached=structuredClone(before)
  const edited=attached.template.panels.find(p=>p.id===panel.id)
  edited.polygon.notches=[{edge:edited.polygon.edges[0],depth:.005}]
  const attachedSidecar=createSidecar(attached,{measurements:bindingDefinition.measurements,bindings:bindingDefinition.bindings})
  assert(attachedSidecar.ok,attachedSidecar.reason)
  const input={panelId:panel.id,pointIndex:1,originalPosition:[.4,0],position:[.42,0]}
  assert.equal(planReference(attached,attachedSidecar.sidecar,input).ok,false,'Notched real Rust panel must fail closed')
  const sewn=structuredClone(before)
  const other=sewn.template.panels.find(p=>p.id!==panel.id)
  assert(other,'Need another real Rust panel to exercise sewing safety')
  sewn.template.seams=[...(sewn.template.seams??[]),{id:'negative-only',a:{panel:panel.id,edge:sewn.template.panels.find(p=>p.id===panel.id).polygon.edges[0]},b:{panel:other.id,edge:other.polygon.edges[0]}}]
  const sewnSidecar=createSidecar(sewn,{measurements:bindingDefinition.measurements,bindings:bindingDefinition.bindings})
  assert(sewnSidecar.ok,sewnSidecar.reason)
  assert.equal(planReference(sewn,sewnSidecar.sidecar,input).ok,false,'Sewn real Rust panel must fail closed')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
  await until(async()=>{const {p}=await position(panel.id,1);return p&&near(p[0],.4)},'Native Undo did not restore source')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'redo'})))
  await until(async()=>{const {p}=await position(panel.id,1);return p&&near(p[0],.42)},'Native Redo did not restore source')
  // Regression of the PRIMARY numerical construction Apply path: once Rust
  // owns linked point rules, a normal source-point edit must automatically
  // carry the dependent along in ONE native AnchorGroup, not a bare Anchor.
  const afterRedo=await command({op:'snapshot'})
  const precedingBatches=requests.filter(r=>r.op==='edit-batch').length
  await studio.getByRole('combobox',{name:'Construction target point'}).selectOption('1')
  await studio.getByRole('combobox',{name:'Construction reference A'}).selectOption('0')
  await studio.getByRole('spinbutton',{name:'Numerical construction angle degrees'}).fill('0')
  await studio.getByRole('combobox',{name:'Construction distance source'}).selectOption('numeric')
  await studio.getByRole('spinbutton',{name:'Numerical construction distance millimetres'}).fill('430')
  await studio.locator('[data-construction-valid="true"]').waitFor({state:'visible',timeout:10000})
  await studio.getByRole('button',{name:'Apply with native Undo'}).click()
  await until(async()=>{
    const snap=await command({op:'snapshot'})
    const points=snap.template.panels.find(p=>p.id===panel.id)?.polygon.points
    return points&&near(points[1][0],.43)&&near(points[2][0],.43)&&near(points[2][1],.25)
  },'Standard native numerical Apply did not propagate saved dependent point')
  const automatic=await command({op:'snapshot'})
  assert.equal(automatic.revision,afterRedo.revision+1,
    'Standard numerical source edit and dependent update must occupy one native Undo revision')
  assert.equal(automatic.nativePointBindings?.active,true,'Standard source edit must retain active native point rules')
  const allBatches=requests.filter(r=>r.op==='edit-batch')
  assert.equal(allBatches.length,precedingBatches+1,
    'Standard source edit must create one new atomic native batch')
  const lastBatch=allBatches.at(-1)
  assert.equal(lastBatch.commands.length,1)
  assert.deepEqual(lastBatch.commands[0].edits.map(([index])=>index),[1,2])
  await studio.locator('.exo-construction-message').filter({hasText:'regenerated 1 native linked point'}).waitFor({timeout:10000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
  await until(async()=>{const snap=await command({op:'snapshot'}),p=snap.template.panels.find(p=>p.id===panel.id)?.polygon.points;return p&&near(p[1][0],.42)&&near(p[2][0],.42)},'Standard source-linked Undo did not restore both points')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'redo'})))
  await until(async()=>{const snap=await command({op:'snapshot'}),p=snap.template.panels.find(p=>p.id===panel.id)?.polygon.points;return p&&near(p[1][0],.43)&&near(p[2][0],.43)},'Standard source-linked Redo did not restore both points')
  // Attached/sewn safety is verified against actual post-edit Rust snapshots.
  // Refuse silently treating a bound source or native sewn point as free.
  assert.deepEqual(errors,[],'Headless browser page errors')
  console.log(JSON.stringify({passed:true,nativePanel:panel.id,subdivisions:0,
    sourceMm:[400,420,430],dependentAfterMm:[430,250],anchorGroupEdits:2,
    oneNativeRevision:true,persistedBindingWitness:true,undo:true,redo:true,pageErrors:errors.length,
    automaticNumericalSourceEdit:true,automaticDependentPointCount:1,automaticOneNativeUndo:true,
    attachedPanelAcceptance:'PASSED_CLONED_REAL_RUST_SNAPSHOT',sewnPanelAcceptance:'PASSED_CLONED_REAL_RUST_SNAPSHOT'}))
}finally{await close()}
