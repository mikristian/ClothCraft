// Isolated UI integration check for draft zipper geometry/material property edits.
// Launches a disposable native Rust session; never opens a user garment project.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-zipper-material-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativeBin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(nativeBin),'Build the Rust exo-session before zipper property QA')
const native='http://127.0.0.1:5695',ui='http://127.0.0.1:5696',children=[]
function launch(file,args,env={}){
  const child=spawn(file,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){
  for(let i=0;i<150;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(200)}
  throw Error('Isolated zipper QA service unavailable: '+url)
}
let browser
try {
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5695',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:nativeBin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5696','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([ready(native+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1640,height:1000}}),errors=[],checks=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=zipper-material',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:40000})
  const tabs=page.getByRole('tablist',{name:'Object Browser types'})
  const objects=page.getByRole('region',{name:'Object Browser'})
  const editor=page.locator('.clo-property-panel')
  await tabs.getByRole('tab',{name:'Zipper',exact:true}).click()
  const before=await objects.locator('.clo-object-row').count()
  await objects.getByRole('button',{name:'+ Add zipper'}).click()
  await page.waitForFunction(n=>document.querySelectorAll('.clo-object-list .clo-object-row').length===n+1,before)
  const selected=objects.locator('.clo-object-select[aria-current=true]')
  await selected.waitFor()
  const layerName=await selected.innerText()
  assert(layerName.trim(),'Created zipper must have a named, selectable layer')
  async function openGroup(name){
    const button=editor.getByRole('button',{name,exact:true})
    await button.waitFor()
    if(await button.getAttribute('aria-expanded')!=='true')await button.click()
  }
  async function numberField(field,label,requested){
    const target=editor.locator(`[data-property-field="${field}"] input[type="number"]`)
    const slider=editor.getByRole('slider',{name:'Adjust '+label})
    await target.waitFor({state:'visible'})
    await slider.waitFor({state:'visible'})
    await target.fill(String(requested))
    await target.press('Enter')
    await page.waitForFunction(({field,value})=>Math.abs(Number(document.querySelector(`[data-property-field="${field}"] input[type="number"]`)?.value)-value)<.00001,{field,value:requested})
    await selected.click()
    assert.equal(Number(await target.inputValue()),requested,`${field} numeric edit lost on reselect`)
    const old=Number(await target.inputValue())
    await slider.focus()
    await slider.press('ArrowRight')
    await page.waitForFunction(({field,old})=>Number(document.querySelector(`[data-property-field="${field}"] input[type="number"]`)?.value)>old,{field,old})
    const changed=Number(await target.inputValue())
    await selected.click()
    assert.equal(Number(await target.inputValue()),changed,`${field} slider edit lost on reselect`)
    checks.push({field,numeric:requested,slider:changed,persisted:true})
  }
  async function colorField(field,hex){
    const target=editor.locator(`[data-property-field="${field}"] input[type="color"]`)
    await target.waitFor({state:'visible'})
    await target.fill(hex)
    await page.waitForFunction(({field,hex})=>document.querySelector(`[data-property-field="${field}"] input[type="color"]`)?.value===hex,{field,hex})
    await selected.click()
    assert.equal(await target.inputValue(),hex,`${field} material color lost on reselect`)
    checks.push({field,color:hex,persisted:true})
  }
  async function selectField(field,value){
    const target=editor.locator(`[data-property-field="${field}"] select`)
    await target.waitFor({state:'visible'})
    const choices=await target.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value))
    assert(choices.includes(value),`${field} missing material choice ${value}: ${choices.join(', ')}`)
    await target.selectOption(value)
    await selected.click()
    assert.equal(await target.inputValue(),value,`${field} selector edit lost on reselect`)
    checks.push({field,selected:value,choices,persisted:true})
  }
  await openGroup('Chain, Tape & Dimensions')
  for(const [field,label,value] of [
    ['chainWidthMm','Chain Width',8],['tapeWidthMm','Tape Width / Side',12],
    ['tapeThicknessMm','Tape Thickness',0.7],['toothPitchMm','Tooth Pitch',3],
    ['sliderWidthMm','Slider Width',12],['sliderThicknessMm','Slider Thickness',2],
    ['pullerWidthMm','Puller Width',9],['pullerLengthMm','Puller Length',24],
    ['toothThicknessMm','Tooth Thickness',1.2],['stopperThicknessMm','Stopper Thickness',2],
    ['weightGrams','Total Weight (specification)',18],
  ])await numberField(field,label,value)
  await openGroup('Component Materials & Colors')
  await selectField('tapeMaterialType','nylon')
  await selectField('teethMaterialType','plastic')
  for(const [field,hex] of [
    ['tapeColor','#573b8b'],['teethColor','#c19a62'],['sliderColor','#8495bd'],
    ['pullerColor','#d5a674'],['stopperColor','#84917f'],
  ])await colorField(field,hex)
  // Reflection was formerly in the materials section. Keep compatibility
  // with the new dedicated section while verifying the same project fields.
  await openGroup('Lighting & Reflection')
  await numberField('metalness',await editor.locator('[data-property-field="metalness"] label').innerText(),0.6)
  await numberField('roughness',await editor.locator('[data-property-field="roughness"] label').innerText(),0.4)
  for(const [field,value] of [['reflectionIntensity',1.6],['clearcoat',0.7],['tapeRoughness',0.35]]){
    const label=await editor.locator(`[data-property-field="${field}"] label`).innerText()
    await numberField(field,label,value)
  }
  assert.equal(await editor.locator('.clo-pe-field-error').count(),0,'Zipper property validation errors')
  assert.deepEqual(errors,[],'Unhandled browser errors')
  console.log(JSON.stringify({pass:true,isolatedNative:true,layerName,checks,errors,output,
    limitation:'UI + project reselect persistence verified; WebGL pixel appearance and native physical zipper mechanics are not asserted.'},null,2))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
