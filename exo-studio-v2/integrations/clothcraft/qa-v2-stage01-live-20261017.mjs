// Isolated real Chrome / Vite / Rust regression for the Stage 01 3D runway.
// All persisted native data is confined to a fresh temporary directory.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-stage01-live-'))
// Native backend origin guard allows the established isolated QA UI origin.
const ui='http://127.0.0.1:5189',api='http://127.0.0.1:5284'
const children=[],checks=[]
const check=(name,data)=>{checks.push({name,...data});console.log(`PASS ${name}`)}
const ready=async url=>{for(let i=0;i<130;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}await new Promise(r=>setTimeout(r,200))}throw Error(`Service failed to start: ${url}`)}
async function snapshot(){const r=await fetch(api+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'snapshot'})});const data=await r.json();assert(data.ok,JSON.stringify(data.error));return data.data}
let browser
try{
 for(const [port,label] of [[5189,'UI'],[5284,'native bridge']]){
  try{await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(500)});throw Error(`${label} port ${port} already occupied; refusing to touch running service`)}catch(e){if(e.message.includes('already occupied'))throw e}
 }
 const rust=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
 assert(existsSync(rust),'Compiled Rust exo-session binary is required')
 const start=(bin,args,env={})=>children.push(spawn(bin,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}}))
 start(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:'5284',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:rust,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5189','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([ready(`${api}/health`),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1680,height:1050}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`${ui}/?desktop=1&engine=clothcraft&qa=stage01-live`,{waitUntil:'domcontentloaded'})
 const canvas=page.locator('.cc-viewport-3d .cc-scene canvas').first()
 await canvas.waitFor({timeout:45000})
 await page.waitForFunction(()=>Number(document.querySelector('.cc-viewport-3d .cc-scene canvas')?.dataset.native3dPanelMeshCount)>0,null,{timeout:30000})
 const initial=await snapshot()
 assert(initial.template?.panels?.length>0,'Native template must have editable garment panels')
 const initialMesh=await canvas.evaluate(e=>Number(e.dataset.native3dPanelMeshCount))
 check('native 3D garment and 2D project loaded',{panels:initial.template.panels.length,meshes:initialMesh})

 // Select Stage via the real asset browser. In native mode the Render nav
 // button may be an inactive legacy section; Stage library is authoritative.
 await page.getByRole('button',{name:'Stage',exact:true}).click()
 const stageCard=page.locator('.exo-stage-card').filter({has:page.locator('[data-stage-id="EXO01"]')}).first()
 await stageCard.waitFor({timeout:15000})
 await stageCard.click()
 const stageOption={value:'EXO01'}
 await page.waitForFunction(id=>{const d=document.querySelector('.cc-viewport-3d .cc-scene canvas')?.dataset;return d?.stageId===id&&d.stageStatus==='ready'&&Number(d.stageMeshCount)>0},stageOption.value,{timeout:30000})
 const live=await canvas.evaluate(e=>({...e.dataset}))
 assert(Number(live.native3dPanelMeshCount)>0,'Stage hid native fabric mesh')
 assert.equal(live.avatarVisible,'true','Stage hid avatar')
 check('Stage 01 GLB loaded beside native garment and avatar',{stageId:live.stageId,stageMeshes:Number(live.stageMeshCount),fabricMeshes:Number(live.native3dPanelMeshCount),avatar:live.avatarVisible})
 const screenshot=path.join(output,'stage01-native-runway.png')
 await page.screenshot({path:screenshot,fullPage:false})
 check('stage screenshot captured',{screenshot})

 // Camera buttons must remain usable with the stage loaded.
 const viewport=page.locator('.cc-viewport-3d').first()
 for(const title of ['Front camera: looking along Z','Right camera: looking along X','Perspective orbit camera']){
  await viewport.locator(`button[title="${title}"]`).first().click()
  assert((await canvas.boundingBox())?.width>140,'Camera action collapsed viewport')
 }
 for(const label of ['View Stage 01 runway','Frame avatar on stage']){
  await viewport.getByRole('button',{name:label}).click()
  assert((await canvas.boundingBox())?.height>140,`${label} broke renderer dimensions`)
 }
 const fitBefore=Number((await canvas.evaluate(e=>e.dataset.cameraFitCount))||0)
 await viewport.getByRole('button',{name:'Fit garment on stage'}).click()
 await page.waitForFunction(n=>Number(document.querySelector('.cc-viewport-3d .cc-scene canvas')?.dataset.cameraFitCount)>n,fitBefore)
 check('front/right/perspective camera and fit work',{fitBefore,fitAfter:Number(await canvas.evaluate(e=>e.dataset.cameraFitCount))})

 // Reset runs actual Rust command. Preserve native template and stage.
 const fitBeforeReset=Number((await canvas.evaluate(e=>e.dataset.cameraFitCount))||0)
 await page.getByRole('button',{name:'Reset pattern position outside avatar'}).click()
 await page.getByText('Patterns returned to their original off-body positions.',{exact:false}).waitFor({timeout:30000})
 await page.waitForFunction(n=>Number(document.querySelector('.cc-viewport-3d .cc-scene canvas')?.dataset.cameraFitCount)>n,fitBeforeReset,{timeout:15000})
 check('native reset automatically fits off-body garment',{fitBeforeReset,fitAfterReset:Number(await canvas.evaluate(e=>e.dataset.cameraFitCount))})
 const offBody=await snapshot()
 assert.equal(offBody.time,0,'Reset did not restore off-body simulation time')
 assert.deepEqual(offBody.template,initial.template,'Reset modified authored 2D patterns / seams / fabrics')
 const after=await canvas.evaluate(e=>({...e.dataset}))
 assert.equal(after.stageId,stageOption.value,'Reset removed Stage 01')
 assert.equal(after.stageStatus,'ready','Stage 01 unloaded during reset')
 assert(Number(after.native3dPanelMeshCount)>0,'Off-body cloth stopped rendering')
 assert.equal(after.avatarVisible,'true','Avatar hidden after off-body reset')
 check('off-body reset preserves 2D geometry, 3D cloth, avatar and loaded stage',{time:offBody.time,stageMeshes:Number(after.stageMeshCount),fabricMeshes:Number(after.native3dPanelMeshCount)})
 assert.deepEqual(errors,[],'Browser page exceptions')
 check('no browser exceptions',{count:errors.length})
 console.log(JSON.stringify({passed:true,checks,output},null,2))
}catch(error){console.error(JSON.stringify({passed:false,error:String(error.stack||error),checks,output},null,2));process.exitCode=1}
finally{await browser?.close().catch(()=>{});for(const child of children){try{process.kill(-child.pid,'SIGTERM')}catch{}}}
