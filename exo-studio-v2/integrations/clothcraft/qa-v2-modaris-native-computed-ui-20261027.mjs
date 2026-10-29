/** Isolated Chrome → native Rust measurement RPC → persisted dependent point.
 * Never opens or modifies an installed garment, bridge, or browser profile. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5468,uiPort=5298
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-modaris-native-computed-ui-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Compile the current native exo-session before browser acceptance')
const children=[]
function start(cmd,args,env={}){
  const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){
  for(let i=0;i<100;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error(`Isolated native measurement service did not start: ${url}`)
}
async function command(body){
  const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const result=await response.json()
  assert(result.ok,`Native ${body.op} refused: ${result.error}`)
  return result.data
}
const near=(a,b)=>Math.abs(a-b)<1e-8
const direct=value=>typeof value==='number'?value:value?.valueMm
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
  const fabric=original.template.fabrics[0].id
  const authored=await command({op:'edit',revision:original.revision,command:{
    kind:'Primitive',shape:'rectangle',size:[.4,.3],origin:[0,0],fabric,
  }})
  const panel=authored.template.panels.at(-1)
  assert(panel?.polygon?.points?.length===4)
  browser=await chromium.launch({headless:true,
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--disable-gpu','--no-first-run']})
  const page=await browser.newPage({viewport:{width:1650,height:1050}})
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
  await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=native-computed-measurement-20261027`,
    {waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'construction-point'}})))
  const studio=page.locator('[data-native-construction-tool="true"]')
  await studio.waitFor({state:'visible',timeout:10000})
  await studio.getByRole('combobox',{name:'Construction pattern panel'}).selectOption(panel.id)
  await studio.getByRole('combobox',{name:'Construction target point'}).selectOption('3')
  await studio.getByRole('combobox',{name:'Numerical construction method'}).selectOption('polar')
  await studio.getByRole('combobox',{name:'Construction reference A'}).selectOption('2')
  await studio.getByRole('spinbutton',{name:'Numerical construction angle degrees'}).fill('180')
  await studio.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
  await studio.getByRole('textbox',{name:'Named drafting measurement worksheet'}).fill('halfWidth = 200\nhemWidth = halfWidth * 2')
  await studio.getByRole('textbox',{name:'Drafting distance formula expression'}).fill('hemWidth')
  const bindings=studio.locator('[data-native-constraint-sidecar="true"]')
  await bindings.locator('summary').first().click()
  await bindings.getByRole('button',{name:'Bind this point to formula'}).click()
  await bindings.locator('[data-native-binding-status="ready"]').waitFor({state:'visible',timeout:10000})
  const before=await command({op:'snapshot'})
  assert.equal(before.nativePointBindings?.active,true)
  const drawer=bindings.locator('[data-modaris-native-measurement-recompute-tool="true"]')
  await drawer.locator('summary').first().click()
  const editor=drawer.locator('[data-native-measurement-recompute="true"]')
  await editor.waitFor({state:'visible'})
  await editor.getByRole('combobox',{name:'Saved direct measurement'}).selectOption('halfWidth')
  await editor.getByRole('textbox',{name:'New native measurement millimetres'}).fill('190')
  await editor.getByRole('button',{name:'Preview Rust-owned dependency recompute'}).click()
  const confirmation=editor.locator('[aria-label="Native measurement recompute confirmation"]')
  await confirmation.waitFor({state:'visible',timeout:10000})
  const apply=editor.getByRole('button',{name:'Apply confirmed Rust measurement recompute'})
  assert(await apply.isDisabled(),'No Rust edit before explicit confirmation')
  await editor.getByRole('checkbox',{name:'Confirm native measurement and dependent geometry transaction'}).check()
  await apply.click()
  await editor.getByText(/Rust committed halfWidth = 190 mm/).waitFor({timeout:15000})
  const after=await command({op:'snapshot'})
  const point=after.template.panels.find(p=>p.id===panel.id).polygon.points[3]
  assert(near(point[0],.02)&&near(point[1],.3),'Rust must recompute P4 from P3 and 380 mm')
  assert.equal(after.revision,before.revision+1)
  assert.equal(after.nativePointBindings?.active,true)
  assert.equal(after.nativePointBindings.measurements.hemWidth.formula,'halfWidth * 2')
  assert.equal(direct(after.nativePointBindings.measurements.halfWidth),190)
  const rpc=requests.find(r=>r.op==='bindings-measurement-recompute')
  assert(rpc,'Browser must invoke Rust-owned measurement recompute RPC')
  assert.equal(rpc.measurement,'halfWidth')
  assert.deepEqual(Object.keys(rpc).sort(),
    ['op','revision','measurement','expectedValueMm','valueMm'].sort())
  assert(!('edits' in rpc)&&!('commands' in rpc),'Dependent coordinates must not be supplied by browser')
  // A second UI edit crosses the native local-origin normalization boundary.
  await editor.getByRole('textbox',{name:'New native measurement millimetres'}).fill('210')
  await editor.getByRole('button',{name:'Preview Rust-owned dependency recompute'}).click()
  await confirmation.waitFor({state:'visible',timeout:10000})
  await editor.getByRole('checkbox',{name:'Confirm native measurement and dependent geometry transaction'}).check()
  await apply.click()
  try{await editor.getByText(/Rust committed halfWidth = 210 mm/).waitFor({timeout:6000})}
  catch(error){
    const notices=await editor.locator('[role="status"]').allTextContents()
    const actual=await command({op:'snapshot'})
    throw Error(`Second native UI commit not witnessed: ${JSON.stringify(notices)}; revision ${actual.revision}; measurement ${JSON.stringify(actual.nativePointBindings?.measurements?.hemWidth)}; ${error.message}`)
  }
  const second=await command({op:'snapshot'})
  const secondPoints=second.template.panels.find(p=>p.id===panel.id).polygon.points
  assert.equal(second.revision,after.revision+1)
  assert.equal(direct(second.nativePointBindings.measurements.halfWidth),210)
  assert(near(secondPoints[2][0]-secondPoints[3][0],.42),
    'Native normalized geometry must retain the authoritative 420 mm binding')
  assert.equal(requests.filter(r=>r.op==='bindings-measurement-recompute').length,2)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
  for(let i=0;i<100;i++){
    const snap=await command({op:'snapshot'})
    if(near(snap.template.panels.find(p=>p.id===panel.id).polygon.points[3][0],.02))break
    if(i===99)throw Error('First Undo did not restore the 380 mm revision')
    await sleep(100)
  }
  const firstUndo=await command({op:'snapshot'})
  assert.equal(direct(firstUndo.nativePointBindings.measurements.halfWidth),190)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
  for(let i=0;i<100;i++){
    const snap=await command({op:'snapshot'})
    if(near(snap.template.panels.find(p=>p.id===panel.id).polygon.points[3][0],0))break
    if(i===99)throw Error('Second Undo did not restore the original 400 mm source')
    await sleep(100)
  }
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'redo'})))
  for(let i=0;i<100;i++){
    const snap=await command({op:'snapshot'})
    if(near(snap.template.panels.find(p=>p.id===panel.id).polygon.points[3][0],.02))break
    if(i===99)throw Error('First Redo did not restore 380 mm')
    await sleep(100)
  }
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'redo'})))
  for(let i=0;i<100;i++){
    const snap=await command({op:'snapshot'})
    const points=snap.template.panels.find(p=>p.id===panel.id).polygon.points
    if(near(points[2][0]-points[3][0],.42))break
    if(i===99)throw Error('Second Redo did not restore 420 mm normalized geometry')
    await sleep(100)
  }
  const saved=await command({op:'save'})
  assert.equal(direct(saved.project.native_point_bindings.measurements.halfWidth),210)
  await command({op:'open',project:saved.project})
  const reopened=await command({op:'snapshot'})
  assert.equal(reopened.nativePointBindings.active,true)
  assert.equal(reopened.nativePointBindings.measurements.hemWidth.formula,'halfWidth * 2')
  const reopenedPoints=reopened.template.panels.find(p=>p.id===panel.id).polygon.points
  assert(near(reopenedPoints[2][0]-reopenedPoints[3][0],.42))
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({passed:true,scenario:'Chrome native direct measurement → Rust computed formula dependency recompute',
    nativePanel:panel.id,valuesMm:[200,190,210],oneUndoPerEdit:true,
    twoUndo:true,twoRedo:true,normalizedOriginWitness:true,
    saveReopen:true,activePersistedGraph:true,pageErrors:errors.length}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
