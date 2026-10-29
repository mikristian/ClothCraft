/** Real disposable Rust + Chrome test of a guarded, user-confirmed native
 * two-panel board-linked reference operation. Never touches saved garments. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5483,uiPort=5303
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-modaris-cross-piece-ui-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const children=[]
let browser
const start=(cmd,args,env={})=>{const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});children.push(child)}
async function ready(url){for(let i=0;i<100;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  await sleep(250)
}throw Error(`Disposable cross-piece QA server unavailable: ${url}`)}
async function command(body){
  const result=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const payload=await result.json()
  assert(payload.ok,`Rust ${body.op} refused: ${payload.error||JSON.stringify(payload)}`)
  return payload.data
}
const near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<1e-6
async function until(check,why){for(let i=0;i<100;i++){
  if(await check())return
  await sleep(100)
}throw Error(why)}
const position=(s,id,index)=>s.template.panels.find(p=>p.id===id)?.polygon.points[index]
try{
  assert(existsSync(session),'A compiled exo-session Rust binary is required')
  assert(existsSync(chrome),'Local Chrome is required for real 2D UI acceptance')
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:native,
  })
  await Promise.all([ready(native+'/health'),ready(ui)])
  let state=await command({op:'open',preset:'tshirt'})
  const fabric=state.template?.fabrics?.[0]?.id
  assert(fabric)
  const made=[]
  for(const [i,width] of [0.4,0.3,0.25].entries()){
    state=await command({op:'edit',revision:state.revision,command:{
      kind:'Primitive',shape:'rectangle',size:[width,.3],origin:[i*.65,0],fabric,
    }})
    const panel=state.template.panels.at(-1)
    assert(panel.polygon.points.length===4&&near(panel.polygon.points[1][0],width))
    made.push(panel)
  }
  const [front,back,spare]=made
  const binding={id:'spare-width',panelId:spare.id,pointIndex:1,
    mode:'polar',a:0,b:3,angleDeg:0,distanceFormula:'spareWidth'}
  state=await command({op:'bindings-store',revision:state.revision,
    nativeBindings:{measurements:{spareWidth:{valueMm:250}},bindings:[binding]}})
  assert(state.nativePointBindings?.active===true)
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--disable-gpu','--no-first-run']})
  const page=await browser.newPage({viewport:{width:1660,height:1050}})
  const errors=[],batches=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{
    if(request.url().endsWith('/workspace')&&request.method()==='POST'){
      try{const body=request.postDataJSON();if(body.op==='edit-batch')batches.push(body)}catch{}
    }
  })
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=modaris-cross-piece-qa-20261027',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'construction-point'}})))
  const studio=page.locator('[data-native-construction-tool="true"]')
  await studio.waitFor({state:'visible',timeout:10000})
  await studio.getByRole('combobox',{name:'Construction pattern panel'}).selectOption(front.id)
  await studio.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
  const saved=studio.locator('[data-native-constraint-sidecar="true"]')
  await saved.locator('summary').first().click()
  await saved.locator('[data-native-binding-status="ready"]').waitFor({state:'visible',timeout:10000})
  const drawer=saved.locator('[data-modaris-cross-piece-reference-tool="true"]')
  await drawer.locator('summary').click()
  const editor=drawer.getByRole('region',{name:'Modaris native cross-panel point reference'})
  await editor.waitFor({state:'visible',timeout:10000})
  const before=await command({op:'snapshot'})
  await editor.getByRole('combobox',{name:'Cross-panel source panel'}).selectOption(front.id)
  await editor.getByRole('combobox',{name:'Cross-panel source anchor'}).selectOption('1')
  await editor.getByRole('combobox',{name:'Cross-panel target panel'}).selectOption(back.id)
  await editor.getByRole('combobox',{name:'Cross-panel target anchor'}).selectOption('1')
  await editor.getByRole('textbox',{name:'Desired source X mm'}).fill('420')
  await editor.getByRole('textbox',{name:'Desired source Y mm'}).fill('0')
  await editor.getByRole('button',{name:'Preview cross-panel source and dependent points'}).click()
  const preview=editor.getByLabel('Cross-panel native batch preview')
  await preview.waitFor({state:'visible',timeout:10000})
  assert.match(await preview.innerText(),/two AnchorGroups on separate panels/)
  assert.match(await preview.innerText(),/420\.000/)
  assert.match(await preview.innerText(),/320\.000/)
  const apply=editor.getByRole('button',{name:'Apply confirmed cross-panel native batch'})
  assert(await apply.isDisabled(),'Native batch must require explicit confirmation')
  await editor.getByRole('checkbox',{name:'Confirm this exact two-panel native transaction'}).check()
  await apply.click()
  await until(async()=>{
    const snap=await command({op:'snapshot'})
    return near(position(snap,front.id,1)[0],.42)&&near(position(snap,back.id,1)[0],.32)
  },'Cross-piece browser operation did not update both native source and target points')
  const after=await command({op:'snapshot'})
  assert.equal(after.revision,before.revision+1)
  assert.equal(after.nativePointBindings?.active,true)
  assert(near(position(after,spare.id,1)[0],.25))
  assert.equal(batches.length,1)
  assert.deepEqual(batches[0].commands.map(command=>command.panel),[front.id,back.id])
  assert.deepEqual(batches[0].commands.map(command=>command.kind),['AnchorGroup','AnchorGroup'])
  await editor.locator('p[role="status"]').filter({hasText:`witnessed at revision ${after.revision}`}).waitFor({timeout:10000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
  await until(async()=>{
    const snap=await command({op:'snapshot'})
    return near(position(snap,front.id,1)[0],.4)&&near(position(snap,back.id,1)[0],.3)
  },'Cross-piece native Undo did not restore both panels')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'redo'})))
  await until(async()=>{
    const snap=await command({op:'snapshot'})
    return near(position(snap,front.id,1)[0],.42)&&near(position(snap,back.id,1)[0],.32)
  },'Cross-piece native Redo did not restore both panels')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({passed:true,sourcePanel:front.id,targetPanel:back.id,
    sourceWidthMm:[400,420],targetWidthMm:[300,320],twoAnchorGroups:true,
    oneNativeRevision:true,undoRedo:true,rustBindingGraphStillActive:true,browserErrors:errors.length}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
