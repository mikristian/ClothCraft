/** Isolated UI regression for the 3D Studio arrow. No saved user garment is touched. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const api='http://127.0.0.1:5444'
const installed=process.argv.includes('--installed')
const app=installed?'http://127.0.0.1:5386':'http://127.0.0.1:5284'
const output=mkdtempSync(path.join(tmpdir(),'exo-3d-studio-qa-'))
const children=[]
const start=(program,args,env={})=>{
  const child=spawn(program,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
const ready=async url=>{
  for(let attempt=0;attempt<120;attempt++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
    if(children.some(child=>child.exitCode!==null))throw Error('Temporary UI QA service stopped')
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error(`Temporary UI QA service was not ready: ${url}`)
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5444',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  if(!installed)start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5284','--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:api,
  })
  await Promise.all([ready(api+'/health'),ready(app)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1500,height:950}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  // The installed app's page must never mutate its real 5385 Rust workspace.
  if(installed)await page.route('http://127.0.0.1:5385/**',async route=>{
    await route.continue({url:route.request().url().replace('http://127.0.0.1:5385',api)})
  })
  await page.goto(`${app}/?desktop=1&engine=clothcraft&testSession=studio3darrow`,{waitUntil:'domcontentloaded'})
  const button=page.getByRole('button',{name:'Open 3D Studio'})
  await button.waitFor({state:'visible',timeout:40000})
  assert.equal(await button.getAttribute('title'),'Open 3D Studio')
  const layout=page.locator('.workspaces')
  const scene=page.locator('.cc-viewport-3d')
  const board=page.locator('.cc-viewport-2d')
  await scene.locator('canvas').waitFor({state:'attached',timeout:30000})
  const initialLayout=await layout.getAttribute('data-viewport-layout')
  assert.equal(initialLayout,'split')
  const before=await scene.boundingBox()
  await page.evaluate(()=>{window.__original3DCanvas=document.querySelector('.cc-viewport-3d canvas')})

  // PRIMARY › arrow: only the split/stack workspace changes. The normal app
  // chrome remains visible; this must never trigger native/document fullscreen.
  await button.click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='3d')
  assert.equal(await scene.isVisible(),true)
  assert.equal(await board.isVisible(),false)
  assert.equal(await page.getByRole('button',{name:'Return to main studio'}).getAttribute('aria-pressed'),'true')
  const expanded=await scene.boundingBox()
  assert.ok(expanded.width>before.width*1.4,'3D viewport did not expand to fill the split workspace')
  assert.equal(await page.locator('.cc-embedded-root.cc-3d-studio-focus').count(),0,
    'Primary 3D arrow incorrectly entered full-window 3D')
  assert.ok(expanded.x>0&&expanded.y>0,'Primary 3D Studio must retain the normal app perimeter')
  assert.equal(await page.getByRole('button',{name:'Open Full Screen 3D'}).count(),0,
    'Only the 3D workspace widen arrow should remain in the glass toolbar')
  assert.equal(await page.getByRole('button',{name:'Avatar animation presets'}).count(),0,
    'Animation mode must open from the bottom simulate dropdown, not the 3D toolbar')
  assert.equal(await page.evaluate(()=>window.__original3DCanvas===document.querySelector('.cc-viewport-3d canvas')),true,
    '3D scene remounted during workspace expansion')

  await page.locator('.cc-3d-studio-glass-arrow').click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='split')
  assert.equal(await board.isVisible(),true)
  assert.equal(await page.evaluate(()=>window.__original3DCanvas===document.querySelector('.cc-viewport-3d canvas')),true,'3D scene remounted after restoration')

  // A custom stack layout must restore to stack, not force a 50/50 split.
  await page.getByRole('combobox',{name:'3D and 2D window arrangement'}).selectOption('stack')
  await page.locator('.cc-3d-studio-glass-arrow').click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='3d')
  await page.locator('.cc-3d-studio-glass-arrow').click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='stack')
  assert.equal(await board.isVisible(),true)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,installed,primaryArrow:'3D workspace only',
    workspaceExpanded:true,boardHidden:true,scenePreserved:true,
    returnedToSplit:true,returnedToStack:true,pageErrors:0,output}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
