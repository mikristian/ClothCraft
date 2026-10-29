import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-3d-viewport-'))
const backend='http://127.0.0.1:5493',ui='http://127.0.0.1:5416'
const workers=[]
function start(binary,args,env={}) {
  const child=spawn(binary,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}})
  workers.push(child)
}
async function ready(url) {
  for(let tries=0;tries<140;tries++) {
    try {if((await fetch(url,{signal:AbortSignal.timeout(800)})).ok)return} catch {}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw new Error(`Service not ready: ${url}`)
}
let browser
try {
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5493',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
    EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5416','--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:backend,
  })
  await Promise.all([ready(`${backend}/health`),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1600,height:1000}})
  const pageErrors=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  await page.addInitScript(()=>localStorage.setItem('garment-studio-workspace-windows-v1',JSON.stringify({layout:'2d',split:'bad-number'})))
  await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=3d-viewport-restore`,{waitUntil:'domcontentloaded'})
  await page.locator('.cc-embedded-root').waitFor({timeout:35000})
  const picker=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
  assert.equal(await picker.inputValue(),'split','A saved 2D-only layout must recover both viewports')
  const scene=page.locator('.cc-viewport-3d'),canvas=scene.locator('.cc-scene canvas')
  await canvas.waitFor({timeout:35000})
  try {
    await page.waitForFunction(()=>Number(document.querySelector('.cc-scene canvas')?.dataset.native3dPanelMeshCount)>0,null,{timeout:16000})
  } catch (error) {
    const diagnostics=await page.evaluate(()=>({
      info:document.querySelector('.cc-embedded-root')?.innerText.slice(0,1250),
      canvas:document.querySelector('.cc-scene canvas')?.dataset,
      viewport:document.querySelector('.cc-viewport-3d')?.getBoundingClientRect().toJSON(),
    }))
    console.error('Native viewport initialization diagnostics:',JSON.stringify({diagnostics,pageErrors}))
    throw error
  }
  const initial=await scene.boundingBox()
  assert(initial?.width>110&&initial?.height>110,'3D panel must have a usable canvas')
  assert(await canvas.evaluate(el=>el.width>0&&el.height>0),'WebGL canvas has actual dimensions')
  await picker.selectOption('2d')
  assert.equal(await scene.evaluate(el=>getComputedStyle(el).display),'none','Explicit 2D-only focus hides 3D')
  await page.getByRole('button',{name:'Restore 3D garment panel'}).click()
  assert.equal(await picker.inputValue(),'split','Restore control returns to both viewports')
  const recovered=await scene.boundingBox()
  assert(recovered?.width>110&&recovered?.height>110,'Restored 3D panel is visible')
  await page.waitForFunction(()=>Number(document.querySelector('.cc-scene canvas')?.dataset.native3dPanelMeshCount)>0,null,{timeout:18000})
  assert(await canvas.evaluate(el=>Number(el.dataset.native3dPanelMeshCount)>0),'Native Rust garment surfaces remain available')
  await picker.selectOption('3d')
  assert((await scene.boundingBox())?.width>250,'3D focus retains the garment canvas')
  await picker.selectOption('split')
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('.cc-scene canvas').waitFor({timeout:35000})
  assert.equal(await picker.inputValue(),'split','Recovered layout persists on reload')
  assert.deepEqual(pageErrors,[],'No React render errors during viewport mode changes')
  const legacy=await browser.newPage({viewport:{width:1600,height:1000}})
  await legacy.addInitScript(()=>localStorage.setItem('garment-studio-workspace-windows-v1',JSON.stringify({layout:'2d',split:50})))
  await legacy.goto(`${ui}/?desktop=1`,{waitUntil:'domcontentloaded'})
  const legacyPicker=legacy.getByRole('combobox',{name:'3D and 2D window arrangement'})
  const legacyCanvas=legacy.locator('.three-mount canvas')
  await legacyCanvas.waitFor({timeout:35000})
  assert.equal(await legacyPicker.inputValue(),'split','Legacy renderer also recovers persisted 2D-only view')
  assert((await legacyCanvas.boundingBox())?.width>110,'Legacy 3D canvas remains visible')
  await legacyPicker.selectOption('2d')
  await legacy.getByRole('button',{name:'Restore 3D garment panel'}).click()
  assert((await legacyCanvas.boundingBox())?.width>110,'Legacy renderer recovers after focus mode')
  console.log(JSON.stringify({passed:true,nativePanelMeshes:await page.locator('.cc-scene canvas').evaluate(el=>el.dataset.native3dPanelMeshCount),initialWidth:Math.round(initial.width),recoveredWidth:Math.round(recovered.width),legacyCanvasRestored:true,output}))
} finally {
  await browser?.close()
  for(const process of workers) {
    try {process.kill(-process.pid,'SIGTERM')} catch {}
  }
}
