// Isolated Rust-backed Chrome test: imported CLO asset -> native garment mesh,
// editable material/size, Rust history, save and reopen. No user project touched.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-hardware-placement-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativeBin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(nativeBin),'Build updated Rust exo-session before running this test')
const nativePort=String(6010+Math.floor(Math.random()*160)),uiPort=String(Number(nativePort)+200)
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`,children=[]
const launch=(file,args,env={})=>{
  const child=spawn(file,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(250)}throw Error('Fixture unavailable: '+url)}
async function nativeCall(op){const result=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(9500),body:JSON.stringify(op)});const body=await result.json();assert(body.ok,JSON.stringify(body).slice(0,500));return body.data}
async function waitNative(predicate){for(let i=0;i<30;i++){const snapshot=await nativeCall({op:'snapshot'});if(predicate(snapshot))return snapshot;await sleep(150)}throw Error('Native garment did not reflect hardware property edit')}

let browser
try{
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:nativePort,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:nativeBin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',uiPort,'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([ready(native+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1730,height:1050}}),errors=[]
  page.setDefaultTimeout(8000)
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(`${ui}/?desktop=1&engine=clothcraft`,{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  await page.getByText('Hardware and Trims',{exact:true}).first().click()
  await page.locator('[data-clo-imported-library-toggle]').click()
  const importBrowser=page.locator('.clo-imported-library')
  await importBrowser.getByRole('textbox',{name:'Search imported hardware'}).fill('YKK')
  await page.waitForFunction(()=>document.querySelectorAll('.clo-imported-tile').length===21)
  await page.locator('.clo-imported-tile').first().click()
  await page.locator('[data-clo-imported-place="true"]').click()
  console.log('CHECKPOINT: clicked imported YKK place')
  const editor=page.locator('[data-imported-hardware-editor="placed"]')
  await editor.waitFor({timeout:20000})
  await page.waitForFunction(()=>Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.nativeImportedHardwareCount||0)>=1,{timeout:20000})
  console.log('CHECKPOINT: native scene rendered GLB overlay')
  let s=await nativeCall({op:'snapshot'})
  assert.equal(s.importedHardware.length,1,'Placement missing in Rust snapshot')
  assert.match(s.importedHardware[0].assetId,/ykk/i,'YKK asset ID not preserved')
  const placedId=s.importedHardware[0].id
  const property=editor.getByRole('spinbutton',{name:'Width value'})
  await property.fill('20');await property.press('Tab')
  console.log('CHECKPOINT: width edited')
  await page.waitForFunction(()=>{
    const value=document.querySelector('[data-imported-hardware-property="widthMm"] input[type=number]')?.value
    return Math.abs(Number(value)-20)<.001
  })
  await editor.locator('input[type="color"]').fill('#7395af')
  console.log('CHECKPOINT: color edited')
  await page.waitForFunction(()=>document.querySelector('#imported-hardware-color')?.value==='#7395af')
  s=await waitNative(snapshot=>snapshot.importedHardware?.[0]?.color==='#7395af')
  console.log('CHECKPOINT: native Rust color confirmed')
  assert.equal(s.importedHardware[0].id,placedId)
  assert.equal(s.importedHardware[0].color,'#7395af','Color not persisted into Rust garment')
  assert(s.importedHardware[0].scale[0]>0,'Width scale missing')
  const beforeUndo=JSON.stringify(s.importedHardware)
  await editor.getByRole('button',{name:'Undo Hardware'}).click()
  console.log('CHECKPOINT: undo clicked')
  await page.waitForTimeout(300)
  const undone=await nativeCall({op:'snapshot'})
  assert.notEqual(JSON.stringify(undone.importedHardware),beforeUndo,'Hardware undo did not change native state')
  await editor.getByRole('button',{name:'Redo Hardware'}).click()
  console.log('CHECKPOINT: redo clicked')
  await page.waitForTimeout(300)
  s=await nativeCall({op:'snapshot'})
  assert.equal(JSON.stringify(s.importedHardware),beforeUndo,'Hardware redo did not restore native state')
  const saved=await nativeCall({op:'save'})
  assert.equal(saved.project.importedHardware[0].id,placedId,'Save omitted imported hardware')
  const reopened=await nativeCall({op:'open',project:saved.project})
  assert.equal(reopened.importedHardware[0].id,placedId,'Reopen lost hardware')
  assert.deepEqual(errors,[],'Browser runtime errors')
  console.log(JSON.stringify({pass:true,disposable:true,asset:'YKK',count:reopened.importedHardware.length,
    surfaceRendered:true,color:s.importedHardware[0].color,undoRedo:true,saveReopen:true,pageErrors:errors,output},null,2))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
