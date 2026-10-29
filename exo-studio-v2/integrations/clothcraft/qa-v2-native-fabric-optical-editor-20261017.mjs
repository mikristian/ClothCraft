/** Verify native Fabric optical property controls use real Rust workspace metadata. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-fabric-editor-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const native='http://127.0.0.1:5843',ui='http://127.0.0.1:5844',children=[]
const launch=(binary,args,env={})=>{
  const process=spawn(binary,args,{cwd:root,detached:true,stdio:'ignore',env:{...globalThis.process.env,...env}})
  children.push(process)
}
async function ready(url){
  for(let i=0;i<140;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
    await sleep(200)
  }
  throw new Error(`Fixture server unavailable: ${url}`)
}
const snapshot=async()=>{
  const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})
  const result=await response.json()
  assert(result.ok,`Rust snapshot failed: ${result.error}`)
  return result.data
}
let browser
try{
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5843',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
    EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5844','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([ready(native+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1710,height:1140}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(`${ui}/?desktop=1&engine=clothcraft&opticalNativeQA=20261017`,{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  const initial=await snapshot()
  const fabricId=initial.template.fabrics[0].id
  const initialRevision=initial.revision,initialTime=initial.time
  await page.getByRole('tablist',{name:'Object Browser types'}).getByRole('tab',{name:'Fabric',exact:true}).click()
  const row=page.locator('.clo-object-list .clo-object-select').first()
  await row.waitFor();await row.click()
  const editor=page.locator('.clo-property-panel')
  const material=editor.getByRole('button',{name:'Material',exact:true}).first()
  if(await material.getAttribute('aria-expanded')!=='true')await material.click()
  const op=editor.getByRole('spinbutton',{name:'Native fabric Opacity'})
  const rough=editor.getByRole('spinbutton',{name:'Native fabric Roughness'})
  const reflection=editor.getByRole('spinbutton',{name:'Native fabric Reflection Intensity'})
  const metal=editor.getByRole('spinbutton',{name:'Native fabric Metalness'})
  const color=editor.getByLabel('Native fabric Color')
  for(const item of [op,rough,reflection,metal,color])assert(await item.isVisible(),'Native Fabric field must be visible')
  await op.fill('64');await op.press('Enter')
  await page.waitForFunction(()=>Number(document.querySelector('.clo-property-panel input[aria-label="Native fabric Opacity"]')?.value)===64)
  let value
  for(let i=0;i<90;i++){
    value=(await snapshot()).propertyMetadata?.fabrics?.[fabricId]?.appearance?.opacity
    if(value===.64)break
    await sleep(150)
  }
  assert.equal(value,.64,'Opacity did not save to native metadata')
  await reflection.fill('180');await reflection.press('Enter')
  for(let i=0;i<90;i++){
    value=(await snapshot()).propertyMetadata?.fabrics?.[fabricId]?.appearance?.reflectionIntensity
    if(value===1.8)break
    await sleep(150)
  }
  assert.equal(value,1.8,'Reflection intensity did not save to native metadata')
  await color.fill('#bc5476')
  for(let i=0;i<25;i++){
    value=(await snapshot()).propertyMetadata?.fabrics?.[fabricId]?.appearance?.color
    if(value==='#bc5476')break
    await sleep(150)
  }
  if(value!=='#bc5476')console.error('Color edit diagnostic',JSON.stringify({value,input:await color.inputValue(),alerts:await editor.locator('[role="alert"]').allTextContents(),workspaceErrors:await page.locator('.cc-error,.cc-notice').allTextContents(),appearance:(await snapshot()).propertyMetadata?.fabrics?.[fabricId]?.appearance}))
  assert.equal(value,'#bc5476','Fabric color did not save to native metadata')
  const saved=await snapshot()
  assert.equal(saved.revision,initialRevision,'Optical fields must not advance Rust solver revision')
  assert.equal(saved.time,initialTime,'Optical fields must not run simulation')
  const canvas=page.locator('.cc-scene canvas')
  assert((await canvas.boundingBox())?.width>100,'Native 3D canvas must remain visible')
  await page.waitForFunction(()=>{
    const meshes=JSON.parse(document.querySelector('.cc-scene canvas')?.dataset.nativeFabricAppearances||'[]')
    return meshes.some(entry=>entry.appearance?.color==='#bc5476'&&entry.opacity===.64&&entry.reflectionIntensity===1.8)
  },null,{timeout:12000})
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByRole('tablist',{name:'Object Browser types'}).getByRole('tab',{name:'Fabric',exact:true}).click()
  await page.locator('.clo-object-list .clo-object-select').first().click()
  await op.waitFor()
  assert.equal(Number(await op.inputValue()),64,'Opacity lost after React editor reload')
  assert.equal(Number(await reflection.inputValue()),180,'Reflection lost after editor reload')
  assert.equal(await color.inputValue(),'#bc5476','Color lost after editor reload')
  assert.deepEqual(errors,[],'No page errors during native optical property editing')
  console.log(JSON.stringify({passed:true,fabricId,opacity:.64,reflectionIntensity:1.8,color:'#bc5476',solverRevisionUnchanged:true,nativeMaterialVisible:true,nativeCanvasVisible:true,pageErrors:errors,output}))
} finally {
  await browser?.close()
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
