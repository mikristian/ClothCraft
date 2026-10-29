/** End-to-end CLO native Fabric Front/Back appearance editing. Disposable Rust fixture. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-front-back-material-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const native='http://127.0.0.1:5851',ui='http://127.0.0.1:5852',children=[]
const launch=(command,args,env={})=>children.push(spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}}))
async function ready(url){for(let i=0;i<135;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(850)})).ok)return}catch{}
  await sleep(220)
}throw Error('Isolated service not ready: '+url)}
const snapshot=async()=>{
  const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})
  const result=await response.json()
  assert(result.ok,result.error||'Could not read native snapshot')
  return result.data
}
async function untilAppearance(id,check,label){
  for(let i=0;i<80;i++){
    const value=(await snapshot()).propertyMetadata?.fabrics?.[id]?.appearance||{}
    if(check(value))return value
    await sleep(125)
  }
  throw Error(`Native Fabric appearance not persisted: ${label}`)
}
let browser
try{
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5851',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
    EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5852','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([ready(native+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1700,height:1120}}),pageErrors=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(`${ui}/?desktop=1&engine=clothcraft&frontBackQA=20261017`,{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:40000})
  const initial=await snapshot(),id=initial.template.fabrics[0].id
  const tabs=page.getByRole('tablist',{name:'Object Browser types'})
  await tabs.getByRole('tab',{name:'Fabric',exact:true}).click()
  await page.locator('.clo-object-list .clo-object-select').first().click()
  const editor=page.locator('.clo-property-panel')
  const material=editor.getByRole('button',{name:'Material',exact:true}).first()
  if(await material.getAttribute('aria-expanded')!=='true')await material.click()
  const faceTabs=editor.getByRole('tablist',{name:'Material faces'})
  const front=faceTabs.getByRole('tab',{name:'Front'}),back=faceTabs.getByRole('tab',{name:'Back'}),side=faceTabs.getByRole('tab',{name:'Side'})
  assert.equal(await front.getAttribute('aria-selected'),'true')
  assert(await back.isEnabled(),'Back face must be editable for native fabric')
  assert(await side.isEnabled(),'Native fabric edge appearance must be editable')
  const frontColor=editor.getByLabel('Native fabric Color',{exact:true})
  await frontColor.fill('#bb3355')
  await untilAppearance(id,a=>a.color==='#bb3355','Front color')
  await back.click()
  assert.equal(await back.getAttribute('aria-selected'),'true')
  const backColor=editor.getByLabel('Native fabric Back Color')
  assert.equal(await backColor.inputValue(),'#bb3355','Untouched Back inherits Front color')
  await backColor.fill('#3469ab')
  await untilAppearance(id,a=>a.back?.color==='#3469ab','Back color')
  const backOpacity=editor.getByRole('spinbutton',{name:'Native fabric Back Opacity'})
  await backOpacity.fill('42');await backOpacity.press('Enter')
  await untilAppearance(id,a=>a.back?.opacity===.42,'Back opacity')
  await side.click()
  assert.equal(await side.getAttribute('aria-selected'),'true')
  const sideColor=editor.getByLabel('Native fabric Side Color')
  assert.equal(await sideColor.inputValue(),'#bb3355','Untouched Side inherits Front color')
  await sideColor.fill('#47bb98')
  await untilAppearance(id,a=>a.side?.color==='#47bb98','Side color')
  const sideOpacity=editor.getByRole('spinbutton',{name:'Native fabric Side Opacity'})
  await sideOpacity.fill('73');await sideOpacity.press('Enter')
  await untilAppearance(id,a=>a.side?.opacity===.73,'Side opacity')
  await front.click()
  assert.equal(await frontColor.inputValue(),'#bb3355','Back edit must not overwrite Front')
  assert.equal(Number(await editor.getByRole('spinbutton',{name:'Native fabric Opacity',exact:true}).inputValue()),100,'Front opacity stays independent')
  const current=await snapshot()
  assert.equal(current.revision,initial.revision,'Material appearance must not touch Rust physics revision')
  assert.equal(current.time,initial.time,'Material appearance must not start simulation')
  assert.deepEqual(current.positions,initial.positions,'Cloth positions must remain identical')
  const canvas=page.locator('.cc-scene canvas')
  assert((await canvas.boundingBox())?.width>100,'3D garment canvas must stay visible')
  await page.waitForFunction(()=>{
    const materials=JSON.parse(document.querySelector('.cc-scene canvas')?.dataset.nativeFabricAppearances||'[]')
    return materials.some(entry=>entry.front?.color==='#bb3355'&&entry.back?.color==='#3469ab'&&entry.side?.color==='#47bb98'&&entry.sideEdgeCount>0&&entry.sideThicknessMeters>0)
  },null,{timeout:14000})
  await page.reload({waitUntil:'domcontentloaded'})
  await tabs.getByRole('tab',{name:'Fabric',exact:true}).click()
  await page.locator('.clo-object-list .clo-object-select').first().click()
  await back.click()
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Native fabric Back Color"]')?.value==='#3469ab',null,{timeout:10000})
  assert.equal(await editor.getByLabel('Native fabric Back Color').inputValue(),'#3469ab','Back material reloaded')
  assert.equal(Number(await editor.getByRole('spinbutton',{name:'Native fabric Back Opacity'}).inputValue()),42,'Back opacity reloaded')
  await side.click()
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Native fabric Side Color"]')?.value==='#47bb98',null,{timeout:10000})
  assert.equal(await editor.getByLabel('Native fabric Side Color').inputValue(),'#47bb98','Side material reloaded')
  assert.equal(Number(await editor.getByRole('spinbutton',{name:'Native fabric Side Opacity'}).inputValue()),73,'Side opacity reloaded')
  await editor.getByRole('button',{name:'Reset Side appearance to Front'}).click()
  await untilAppearance(id,a=>!a.side||!Object.keys(a.side).length,'Reset Side to Front')
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Native fabric Side Color"]')?.value==='#bb3355',null,{timeout:10000})
  assert.equal(await editor.getByLabel('Native fabric Side Color').inputValue(),'#bb3355','Side reset restores Front inheritance')
  await back.click()
  await editor.getByRole('button',{name:'Reset Back appearance to Front'}).click()
  await untilAppearance(id,a=>!a.back||!Object.keys(a.back).length,'Reset Back to Front')
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Native fabric Back Color"]')?.value==='#bb3355',null,{timeout:10000})
  assert.equal(await editor.getByLabel('Native fabric Back Color').inputValue(),'#bb3355','Reset restores inherited Front appearance')
  assert.deepEqual(pageErrors,[])
  console.log(JSON.stringify({passed:true,id,front:'#bb3355',back:'#3469ab',side:'#47bb98',backOpacity:42,sideOpacity:73,resetRestoredInheritance:true,nativeSolverUnchanged:true,threeDMaterialUpdated:true,pageErrors,output}))
}finally{
  await browser?.close()
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
