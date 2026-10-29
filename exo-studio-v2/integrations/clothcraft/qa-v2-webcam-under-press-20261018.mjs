// Verify the real 3D Press toolbar slot with an isolated Rust workspace.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-camera-rail-'))
mkdirSync(path.join(output,'workspace'))
const api='http://127.0.0.1:5521',ui='http://127.0.0.1:5284'
const children=[],errors=[]
const launch=(file,args,env={})=>{
  const child=spawn(file,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}})
  children.push(child)
}
const ready=async url=>{
  for(let i=0;i<110;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error('Timed out waiting for '+url)
}
let browser,page
try{
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5521',EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5284','--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:api,
  })
  await Promise.all([ready(api+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--enable-webgl','--ignore-gpu-blocklist']})
  page=await browser.newPage({viewport:{width:1600,height:1000}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=webcam-under-press',{waitUntil:'domcontentloaded'})
  await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:45000})
  const press=page.locator('.tool-rail [data-clo-slot="3d:B18"]')
  const slot=page.locator('.tool-rail .clo-observed-3d-column [data-camera-hand-toolbar-slot="true"]')
  const control=slot.getByRole('button',{name:'Camera Fabric Hand'})
  await control.waitFor({state:'visible',timeout:20000})
  assert.equal(await page.getByRole('button',{name:'Camera Fabric Hand'}).count(),1,'One real Webcam launcher')
  assert.equal(await page.locator('.cc-camera-hand-side-toolbar').count(),0,'No overlay launch wrapper')
  assert.equal(await page.locator('.cc-scene [data-tool-family="camera-hand"] button').count(),0,'No duplicate launch in the 3D panel')
  const a=await press.boundingBox(),b=await control.boundingBox()
  assert(a&&b,'Press and Webcam must be visible')
  assert(await press.evaluate(el=>el.parentElement) !== null)
  assert.equal(await press.evaluate(el=>el.parentElement?.getAttribute('aria-label')),'3D garment column B')
  assert(b.y>=a.y+a.height+1&&b.y-a.y-a.height<=14,
    'Webcam must sit immediately below Press')
  assert(b.width<=26&&b.height<=26,'Webcam launcher must be compact')
  await control.click()
  await page.locator('.cc-embedded-main > [data-draggable-camera-widget="true"]').waitFor({state:'visible',timeout:6500})
  assert.equal(await control.getAttribute('aria-pressed'),'true')
  await page.getByRole('button',{name:'Close Camera Fabric Hand'}).click()
  assert.equal(await page.locator('[data-draggable-camera-widget="true"]').count(),0,'Camera preview should close')
  assert.equal(await control.getAttribute('aria-pressed'),'false')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,position:{pressY:Math.round(a.y),webcamY:Math.round(b.y)},
    buttonSize:{width:b.width,height:b.height},previewOpens:true,previewCloses:true,pageErrors:errors}))
}catch(error){
  console.error(JSON.stringify({pass:false,error:String(error.stack||error),pageErrors:errors,output}))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
