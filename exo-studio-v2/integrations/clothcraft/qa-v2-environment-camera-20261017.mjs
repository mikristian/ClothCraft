import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdirSync,mkdtempSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(root,'integrations/clothcraft/output/qa-environment-camera-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const api='http://127.0.0.1:5485',ui='http://127.0.0.1:5486',children=[]
const launch=(binary,args,env={})=>{
 const child=spawn(binary,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}})
 children.push(child)
 return child
}
async function waitFor(url){
 for(let i=0;i<130;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
  if(children.some(p=>p.exitCode!==null))throw new Error('QA service exited')
  await new Promise(resolve=>setTimeout(resolve,250))
 }
 throw new Error('Timed out: '+url)
}
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:'5485',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
 })
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5486','--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:api,
 })
 await Promise.all([waitFor(api+'/health'),waitFor(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1700,height:1080}}),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=environment-camera',{waitUntil:'domcontentloaded'})
 const canvas=page.locator('.cc-scene canvas').first()
 await page.locator('canvas').first().waitFor({timeout:60000})
 const tabs=page.getByRole('tablist',{name:'Object Browser types'})
 await tabs.getByRole('tab',{name:'Object Browser category list'}).click()
 const tree=page.getByRole('navigation',{name:'Object Browser categories'})
 await tree.waitFor()
 const environment=tree.getByRole('button',{name:'Environment',exact:true})
 if(await environment.getAttribute('aria-expanded')!=='true')await environment.click()
 assert.equal(await environment.getAttribute('aria-expanded'),'true')
 const cameraFolder=tree.getByRole('button',{name:'Camera',exact:true})
 if(await cameraFolder.getAttribute('aria-expanded')!=='true')await cameraFolder.click()
 const defaultCamera=tree.getByRole('button',{name:'Default Camera',exact:true})
 await defaultCamera.click()
 assert.equal(await defaultCamera.getAttribute('aria-selected'),'true')
 assert(await tree.isVisible(),'Hierarchy should remain visible')
 const editor=page.locator('[data-scene-property-kind="camera"]')
 await editor.waitFor()
 for(const label of ['Lens','View Orientation','Clipping Plane','Physical Camera'])
  assert.equal(await editor.getByRole('button',{name:label,exact:true}).count(),1)
 const change=async(label,value,key,expected=String(value))=>{
  const input=editor.getByRole('textbox',{name:label,exact:true})
  await input.fill(String(value))
  await input.press('Enter')
  await page.waitForFunction(([attr,want])=>document.querySelector('.cc-scene canvas')?.dataset[attr]===want,[key,expected],{timeout:12000})
 }
 await change('Field of View',55,'cameraFieldOfView')
 await change('Distance',2400,'cameraDistanceMm')
 await change('Horizontal Angle',35,'cameraHorizontalAngle')
 await change('Vertical Angle',18,'cameraVerticalAngle')
 await change('Near',25,'cameraNearClipMm')
 await change('Far',125000,'cameraFarClipMm')
 await editor.getByRole('checkbox',{name:'Enable'}).check()
 await page.waitForFunction(()=>document.querySelector('.cc-scene canvas')?.dataset.cameraPhysical==='true')
 await editor.getByRole('combobox',{name:'View Type'}).selectOption('orthographic')
 await page.waitForFunction(()=>document.querySelector('.cc-scene canvas')?.dataset.cameraViewType==='orthographic')
 assert.equal(await defaultCamera.getAttribute('aria-selected'),'true')
 await page.screenshot({path:path.join(output,'camera-hierarchy-and-properties.png')})
 const lightFolder=tree.getByRole('button',{name:'Light',exact:true}).first()
 if(await lightFolder.getAttribute('aria-expanded')!=='true')await lightFolder.click()
 const light3d=tree.getByRole('button',{name:'3D',exact:true})
 if(await light3d.getAttribute('aria-expanded')!=='true')await light3d.click()
 const lights=tree.getByRole('button',{name:'Light',exact:true})
 await lights.nth(1).click()
 assert.equal(await lights.nth(1).getAttribute('aria-selected'),'true')
 const lightEditor=page.locator('[data-scene-property-kind="light"]')
 await lightEditor.waitFor()
 const before=Number(await canvas.getAttribute('data-scene-light-intensity'))
 await lightEditor.getByRole('textbox',{name:'Intensity'}).fill('2')
 await lightEditor.getByRole('textbox',{name:'Intensity'}).press('Enter')
 await page.waitForFunction(previous=>{const current=Number(document.querySelector('.cc-scene canvas')?.dataset.sceneLightIntensity);return Number.isFinite(current)&&Math.abs(current-previous)>0.01},before)
 const after=Number(await canvas.getAttribute('data-scene-light-intensity'))
 assert(after>before,`Expected key light intensity to increase: ${before} -> ${after}`)
 assert(await tree.isVisible())
 await tabs.getByRole('tab',{name:'Fabric',exact:true}).click()
 assert.equal(await page.locator('[data-scene-property-kind]').count(),0,'Changing tab should restore standard property editor')
 assert(await page.locator('.clo-property-panel .clo-pe-accordion, .clo-property-panel .clo-pe-list').count()>0,'Default property groups missing')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,cameraControls:['fov','distance','horizontal','vertical','near','far','physical','viewType'],keyIntensityBefore:before,keyIntensityAfter:after,treeStayedOpen:true,tabRestoredProperties:true,output,errors},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const p of children)try{process.kill(-p.pid,'SIGTERM')}catch{}
}
