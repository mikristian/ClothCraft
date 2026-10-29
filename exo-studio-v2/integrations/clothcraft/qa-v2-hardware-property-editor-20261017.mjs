// Hardware/trim object-layer/property regression on a disposable Rust project.
// Each visit starts Vite and the native session on isolated test ports.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-hardware-property-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativeBin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(nativeBin),'Build the Rust exo-session binary before hardware QA')
const native='http://127.0.0.1:5693',ui='http://127.0.0.1:5694',children=[]
function launch(file,args,env={}) {
  const child=spawn(file,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url) {
  for(let i=0;i<150;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(200)}
  throw Error('Isolated QA server failed: '+url)
}
let browser
try {
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5693',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:nativeBin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5694','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([ready(native+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1640,height:1000}}),errors=[],checks=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=hardware-editor',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:40000})
  const tabs=page.getByRole('tablist',{name:'Object Browser types'})
  const objectBrowser=page.getByRole('region',{name:'Object Browser'})
  const editor=page.locator('.clo-property-panel')
  const scenarios=[
    {tab:'Button',group:'Button Style & Dimensions',field:'widthMm',display:'Width',value:3.1},
    {tab:'Buttonhole',group:'Buttonhole',field:'lengthCm',display:'Length',value:29},
    {tab:'Zipper',group:'Chain, Tape & Dimensions',field:'chainWidthMm',display:'Chain Width',value:8},
    {tab:'Trim',group:'Binding Width & Construction',field:'widthCm',display:'Binding Width',value:24},
    {tab:'Topstitch',group:'Stitch',field:'stitchLengthMm',display:'Stitch Length',value:4.5},
  ]
  for(const s of scenarios){
    await tabs.getByRole('tab',{name:s.tab,exact:true}).click()
    const initial=await objectBrowser.locator('.clo-object-row').count()
    await objectBrowser.getByRole('button',{name:'+ Add '+s.tab.toLowerCase()}).click()
    await page.waitForFunction(count=>document.querySelectorAll('.clo-object-list .clo-object-row').length===count+1,initial)
    const row=objectBrowser.locator('.clo-object-select[aria-current=true]')
    await row.waitFor({timeout:10000})
    const group=editor.getByRole('button',{name:s.group,exact:true})
    await group.waitFor()
    if(await group.getAttribute('aria-expanded')!=='true')await group.click()
    const value=editor.locator(`[data-property-field="${s.field}"] input[type="number"]`)
    const range=editor.getByRole('slider',{name:'Adjust '+s.display})
    await value.waitFor({state:'visible'})
    await range.waitFor({state:'visible'})
    await value.fill(String(s.value))
    await value.press('Enter')
    await page.waitForFunction(({field,want})=>Math.abs(Number(document.querySelector(`[data-property-field="${field}"] input[type="number"]`)?.value)-want)<.00001,{field:s.field,want:s.value})
    await row.click()
    assert.equal(Number(await value.inputValue()),s.value,s.tab+' typed dimension must persist after reselect')
    // Exercise the same validated mutation via the draggable range control.
    await range.focus()
    await range.press('ArrowRight')
    await page.waitForFunction(({field,original})=>Number(document.querySelector(`[data-property-field="${field}"] input[type="number"]`)?.value)>original,{field:s.field,original:s.value})
    const fromSlider=Number(await value.inputValue())
    await row.click()
    assert.equal(Number(await value.inputValue()),fromSlider,s.tab+' slider must persist after reselect')
    // The row's checkmark is an actual visibility edit; selection stays stable.
    const visibleToggle=objectBrowser.locator('.clo-object-row.selected input[type="checkbox"]').first()
    await visibleToggle.uncheck()
    assert.equal(await objectBrowser.locator('.clo-object-row.selected.is-hidden').count(),1,s.tab+' checkbox did not hide the layer')
    await visibleToggle.check()
    assert.equal(await objectBrowser.locator('.clo-object-row.selected.is-hidden').count(),0,s.tab+' checkbox did not restore the layer')
    if(s.tab==='Buttonhole'){
      const shape=editor.locator('[data-property-field="openingShape"] select')
      await shape.selectOption('keyhole')
      await row.click()
      assert.equal(await shape.inputValue(),'keyhole','Buttonhole opening shape must persist')
    }
    const errorText=await editor.locator('.clo-pe-field-error').allInnerTexts()
    assert.equal(errorText.length,0,s.tab+' unexpectedly rejected '+JSON.stringify(errorText))
    checks.push({tab:s.tab,created:true,selectedLayer:true,numeric:true,slider:true,sliderActuallyEdits:true,visibilityToggle:true,persistedAfterReselect:true})
  }
  assert.deepEqual(errors,[],'Browser runtime exceptions')
  console.log(JSON.stringify({pass:true,isolatedNative:true,checks,errors,output},null,2))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
