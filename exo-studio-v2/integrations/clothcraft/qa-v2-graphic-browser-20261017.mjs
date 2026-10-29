// Disposable native session: the Graphic Object Browser owns measurement visibility.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdirSync,mkdtempSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(root,'integrations/clothcraft/output/qa-graphic-browser-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const api='http://127.0.0.1:5495',ui='http://127.0.0.1:5496',processes=[]
const start=(command,args,env={})=>{
  const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  processes.push(child)
}
const waitFor=async url=>{
  for(let i=0;i<110;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
    if(processes.some(child=>child.exitCode!==null))throw Error('Isolated QA service exited')
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Service unavailable: '+url)
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5495',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
    EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5496','--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:api,
  })
  await Promise.all([waitFor(api+'/health'),waitFor(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=graphic-browser-20261017',{waitUntil:'domcontentloaded'})
  const tabs=page.getByRole('tablist',{name:'Object Browser types'})
  await tabs.waitFor({timeout:45000})
  await tabs.getByRole('tab',{name:'Graphic',exact:true}).click()
  const toggle=page.getByRole('switch',{name:'Show graphic measurements in 2D'})
  await toggle.waitFor({timeout:20000})
  assert.equal(await page.locator('.clo-object-graphic-measurements').count(),1,'Graphic measurement toggle belongs to Object Browser')
  assert.equal(await toggle.getAttribute('aria-checked'),'true')
  assert.equal(await page.locator('.cc-embedded-root .cc-v2-graphic-dimension-toggle').count(),0,
    'Embedded 2D canvas must not have a duplicate measurement button')
  await toggle.click()
  await page.waitForFunction(()=>localStorage.getItem('exo-v2-show-2d-graphic-measurements')==='false')
  await page.waitForFunction(()=>document.querySelector('.clo-object-graphic-measurements-toggle')?.getAttribute('aria-checked')==='false')
  assert.equal(await toggle.getAttribute('aria-checked'),'false')
  await toggle.click()
  await page.waitForFunction(()=>localStorage.getItem('exo-v2-show-2d-graphic-measurements')==='true')
  await page.waitForFunction(()=>document.querySelector('.clo-object-graphic-measurements-toggle')?.getAttribute('aria-checked')==='true')
  assert.equal(await toggle.getAttribute('aria-checked'),'true')

  const host=page.locator('#cc-native-graphic-editor .cc-graphic-editor')
  await host.waitFor({timeout:30000})
  assert.equal(await host.getByRole('checkbox',{name:'Show graphic measurements in 2D'}).count(),0,
    'Property Editor must not duplicate the measurement switch')
  const graphicTools=host.locator('details.cc-graphic-utilities')
  await graphicTools.waitFor()
  assert.equal(await graphicTools.locator('summary').innerText().then(t=>t.includes('Graphic Tools')),true)
  assert.equal(await graphicTools.getAttribute('open'),null,'Advanced tools should start collapsed')
  await graphicTools.locator('summary').click()
  assert.equal(await graphicTools.getAttribute('open'),'')
  assert.equal(await graphicTools.getByRole('button',{name:'Restore layout JSON'}).count(),1)
  assert.equal(await graphicTools.getByRole('button',{name:'Insert example'}).count(),1)
  const insertExample=graphicTools.getByRole('button',{name:'Insert example'})
  const hasNativePanel=await insertExample.isEnabled()
  if(hasNativePanel){
    await insertExample.click()
    const controls=host.locator('.cc-graphic-controls')
    await controls.waitFor({timeout:15000})
    assert.deepEqual(await controls.locator('details.cc-graphic-accordion > summary').allInnerTexts(),[
      'Placement Panel and surface','Transform Millimeters and degrees','Material Print surface',
    ],'Graphic property sections must be grouped and ordered')
    assert.equal(await controls.getByRole('spinbutton',{name:'Width (mm)'}).count(),1)
    assert.equal(await controls.getByRole('spinbutton',{name:'Height (mm)'}).count(),1)
  }
  // Keep saved user garments untouched: only the isolated Rust/test session is used.
  await page.screenshot({path:path.join(output,'graphic-object-browser-toggle.png')})
  assert.deepEqual(errors,[],'Browser threw an uncaught error')
  console.log(JSON.stringify({passed:true,measurementToggle:'Graphic Object Browser',persistedOnOff:true,
    duplicateBoardToggle:false,duplicateInspectorToggle:false,toolsCollapsible:true,
    graphicPropertyGroupsVerified:hasNativePanel,propertyGroupsSkippedReason:hasNativePanel?null:'Disposable Rust fixture has no selected panel',output,errors},null,2))
}finally{
  await browser?.close().catch(()=>{})
  for(const process of processes)try{process.kill(-process.pid,'SIGTERM')}catch{}
}
