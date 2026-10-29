/** Disposable real-Rust + headless-Chrome acceptance for qualified six-size
 * fabric-bound chart UI. Does not load, edit, or save the user's garment.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {fingerprintNativePatternBindingsSource20261023 as fingerprint} from '../../src/core/nativePatternConstraintBindings20261023.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5464,uiPort=5294
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-modaris-chart-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Build the native exo-session Rust binary before this acceptance run')
const children=[]
const start=(cmd,args,env={})=>{
  const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){
  for(let i=0;i<100;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1250)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error(`Isolated chart service did not start: ${url}`)
}
async function command(body){
  const result=await fetch(`${native}/workspace`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const payload=await result.json()
  assert(payload.ok,`Native command refused ${body.op}: ${payload.error||JSON.stringify(payload)}`)
  return payload.data
}
const same=(a,b,epsilon=1e-6)=>Math.abs(a-b)<epsilon
let browser
try{
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
  assert(fabric)
  const authored=await command({op:'edit',revision:original.revision,command:{
    kind:'Primitive',shape:'rectangle',size:[.4,.3],origin:[0,0],fabric,
  }})
  const panel=authored.template.panels.at(-1)
  assert(same(panel.polygon.points[1][0],.4))
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--disable-gpu','--no-first-run']})
  const page=await browser.newPage({viewport:{width:1660,height:1050}})
  const requests=[],errors=[]
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
  await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=modaris-fabric-qa-20261027`,{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'construction-point'}})))
  const studio=page.locator('[data-native-construction-tool="true"]')
  await studio.waitFor({state:'visible',timeout:10000})
  await studio.getByRole('combobox',{name:'Construction pattern panel'}).selectOption(panel.id)
  await studio.getByRole('combobox',{name:'Construction target point'}).selectOption('1')
  await studio.getByRole('combobox',{name:'Numerical construction method'}).selectOption('polar')
  await studio.getByRole('combobox',{name:'Construction reference A'}).selectOption('0')
  await studio.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
  const worksheet=studio.getByRole('textbox',{name:'Named drafting measurement worksheet'})
  for(let attempt=0;attempt<5&&!await worksheet.isVisible();attempt++){
    // A late native snapshot can remount the construction tool and reset
    // its distance-source selection while the first Rust panel is loading.
    await studio.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
    await sleep(300)
  }
  await worksheet.waitFor({state:'visible',timeout:15000})
  await worksheet.fill('width = 400')
  await studio.getByRole('textbox',{name:'Drafting distance formula expression'}).fill('width')
  const bindings=studio.locator('[data-native-constraint-sidecar="true"]')
  await bindings.locator('summary').first().click()
  await bindings.getByRole('button',{name:'Bind this point to formula'}).click()
  await bindings.locator('[data-native-binding-status="ready"]').waitFor({state:'visible',timeout:10000})
  const before=await command({op:'snapshot'})
  assert.equal(before.nativePointBindings?.active,true,'Native garment must own active saved rules')
  const linkedChart=bindings.locator('[data-modaris-fabric-bound-chart-tool="true"]')
  const chart=linkedChart.locator('[data-modaris-fabric-chart="research-reviewed"]')
  // The stored native binding can cause the inspector to remount immediately
  // after the ready status appears, closing an already-clicked <details>.
  // Retry the actual disclosure gesture rather than mistaking that React
  // remount for a missing chart feature.
  for(let attempt=0;attempt<8&&!await chart.isVisible();attempt++){
    // The source-binding inspector is remounted while the native snapshot
    // catches up. A detached summary is a transient DOM race, not proof that
    // the disclosure was opened. Retry the real pointer gesture, bounded.
    try{await linkedChart.locator('summary').first().click({timeout:2500})}
    catch(error){if(attempt===7)throw error}
    await sleep(350)
  }
  await chart.waitFor({state:'visible',timeout:15000})
  await chart.getByRole('textbox',{name:'Fabric identifier for chart'}).fill('qa-lab-cotton')
  await chart.getByRole('textbox',{name:'Fabric physical limit provenance'}).fill('Operator-authored temporary fabric limits for isolated QA only')
  const sizes=['XS','S','M','L','XL','XXL'],widths=[380,390,400,410,420,430]
  for(let i=0;i<sizes.length;i++){
    const size=sizes[i],mm=widths[i]
    await chart.getByRole('textbox',{name:`width ${size} value millimetres`}).fill(String(mm))
    await chart.getByRole('textbox',{name:`width ${size} min millimetres`}).fill(String(mm-10))
    await chart.getByRole('textbox',{name:`width ${size} max millimetres`}).fill(String(mm+10))
  }
  await chart.getByRole('combobox',{name:'Fabric chart preview size'}).selectOption('L')
  await chart.getByRole('button',{name:'Validate entire chart and preview selected native size'}).click()
  const accepted=chart.locator('[aria-label="Verified fabric chart plan"]')
  await accepted.waitFor({state:'visible',timeout:10000})
  assert.equal(await accepted.getAttribute('data-verified-sizes'),'6')
  const editButton=chart.getByRole('button',{name:'Commit bounded selected-size native point groups · ONE Rust Undo'})
  assert(await editButton.isDisabled(),'No geometry edit is permitted before explicit operator confirmation')
  const approval=chart.getByRole('checkbox',{name:'Confirm one selected-size native chart edit'})
  assert.equal(await approval.isDisabled(),false,
    `Native chart preparation unexpectedly rejected: ${await accepted.innerText()}`)
  await approval.check()
  await editButton.click()
  for(let i=0;i<100;i++){
    const snap=await command({op:'snapshot'})
    const point=snap.template.panels.find(p=>p.id===panel.id)?.polygon.points[1]
    if(point&&same(point[0],.41))break
    if(i===99)throw Error('Selected-size chart edit never reached the real Rust pattern')
    await sleep(100)
  }
  const changed=await command({op:'snapshot'})
  assert.equal(changed.revision,before.revision+1,'Atomic chart/binding edit must commit one native Undo revision')
  assert.equal(changed.nativePointBindings?.active,true,'Committed point rules must remain owned by Rust')
  assert(requests.some(r=>r.op==='edit-batch'&&r.nativeBindings&&r.commands?.some(c=>c.kind==='AnchorGroup')),
    'Qualified chart UI must send a genuine Rust AnchorGroup and current native bindings')
  // Rust's native snapshot becomes visible before the React postcommit
  // witness and browser mirror are necessarily written. Poll the actual
  // persisted artifact rather than a transient notification.
  let mirror=null
  for(let attempt=0;attempt<100;attempt++){
    mirror=await page.evaluate(()=>{
      const key=Object.keys(localStorage).find(k=>k.startsWith('exo-modaris-fabric-chart-v1:'))
      return key?JSON.parse(localStorage.getItem(key)):null
    })
    if(mirror?.schema==='exo-modaris-fabric-chart-v1'&&mirror.chart?.sourceRevision===changed.revision)break
    await sleep(100)
  }
  assert(mirror?.schema==='exo-modaris-fabric-chart-v1',
    `Postcommit source-verified chart mirror must be written; UI: ${(await chart.innerText()).slice(-600)}`)
  assert.equal(mirror.chart.sourceRevision,changed.revision)
  assert.equal(mirror.chart.measurements.width.values.L.value,410)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
  for(let i=0;i<100;i++){
    const snap=await command({op:'snapshot'})
    const point=snap.template.panels.find(p=>p.id===panel.id)?.polygon.points[1]
    if(point&&same(point[0],.4))break
    if(i===99)throw Error('Native Undo did not restore the chart-driven material point')
    await sleep(100)
  }
  // The browser mirror belongs to the postcommit source and must not be
  // admitted against the older Undo revision just because its fabric ID fits.
  await sleep(200)
  const reopen=chart.getByRole('button',{name:'Reopen previously verified browser chart for this fabric'})
  await reopen.click()
  await chart.getByText(/Saved chart mirror was refused: Stale or invalid native chart source\/revision/).waitFor({timeout:10000})
  assert.equal(await chart.locator('[aria-label="Verified fabric chart plan"]').count(),0)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'redo'})))
  for(let i=0;i<100;i++){
    const snap=await command({op:'snapshot'})
    const point=snap.template.panels.find(p=>p.id===panel.id)?.polygon.points[1]
    if(point&&same(point[0],.41))break
    if(i===99)throw Error('Native Redo did not restore the chart-driven point')
    await sleep(100)
  }
  await sleep(200)
  await reopen.click()
  const afterRedo=await command({op:'snapshot'})
  const mirrorStillMatches=afterRedo.revision===mirror.chart.sourceRevision&&
    fingerprint(afterRedo)===mirror.chart.sourceFingerprint
  if(mirrorStillMatches){
    await chart.getByText(/Recovered and revalidated the saved browser chart mirror/).waitFor({timeout:10000})
    assert.equal(await chart.locator('[aria-label="Verified fabric chart plan"]').getAttribute('data-verified-sizes'),'6')
  }else{
    // Native history can advance a revision even when Redo restores the same
    // material contour. The browser chart must refuse that obsolete source
    // until independently rebased with an explicit new provenance witness.
    await chart.getByText(/Saved chart mirror was refused:/).waitFor({timeout:10000})
    assert.equal(await chart.locator('[aria-label="Verified fabric chart plan"]').count(),0)
  }
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({passed:true,fixture:'isolated native Rust six-size chart',
    sizeCount:sizes.length,selectedSize:'L',nativePanel:panel.id,oldWidthMm:400,newWidthMm:410,
    oneRevision:true,undo:true,redo:true,undoRejectsStaleChart:true,
    redoReauthenticatesChart:mirrorStillMatches,redoRejectsStaleRevision:!mirrorStillMatches,
    nativeBindingGraphPersisted:true,browserChartMirrorSaved:true,pageErrors:errors.length}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
