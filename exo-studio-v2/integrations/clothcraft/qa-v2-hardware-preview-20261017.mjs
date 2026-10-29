// Isolated browser-only EXO draft geometry verification.
// Native ClothCraft session/user garment files are never read or changed.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const url='http://127.0.0.1:5698'
const server=spawn(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5698','--strictPort'],{cwd:root,detached:true,stdio:'ignore',env:{...process.env}})
let browser
try {
  let ready=false
  for(let i=0;i<100;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}await sleep(200)}
  assert(ready,'Isolated Vite editor not ready')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1680,height:990}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(url+'/?desktop=1&testSession=hardware-preview',{waitUntil:'domcontentloaded'})
  const canvas=page.locator('canvas[data-hardware-binding-ribbon-count]').first()
  await canvas.waitFor({timeout:35000})
  const baseBinding=Number(await canvas.getAttribute('data-hardware-binding-ribbon-count'))
  const baseStitches=Number(await canvas.getAttribute('data-hardware-topstitch-rendered-rows'))
  const tabs=page.getByRole('tablist',{name:'Object Browser types'})
  const browserPanel=page.getByRole('region',{name:'Object Browser'})
  const editor=page.locator('.clo-property-panel')
  await tabs.getByRole('tab',{name:'Trim',exact:true}).click()
  await browserPanel.getByRole('button',{name:'+ Add trim'}).click()
  await page.waitForFunction(count=>Number(document.querySelector('canvas[data-hardware-binding-ribbon-count]')?.dataset.hardwareBindingRibbonCount)>count,baseBinding,{timeout:20000})
  const width=editor.locator('[data-property-field="widthCm"] input[type=number]')
  await width.fill('35')
  await width.press('Enter')
  await page.waitForFunction(()=>document.querySelector('canvas[data-hardware-binding-widths-mm]')?.dataset.hardwareBindingWidthsMm?.split(',').some(value=>Math.abs(Number(value)-35)<.01),null,{timeout:20000})
  const bindingCheckbox=browserPanel.locator('.clo-object-row.selected input[type=checkbox]')
  await bindingCheckbox.uncheck()
  await page.waitForFunction(count=>Number(document.querySelector('canvas[data-hardware-binding-ribbon-count]')?.dataset.hardwareBindingRibbonCount)===count,baseBinding,{timeout:20000})
  await bindingCheckbox.check()
  await page.waitForFunction(count=>Number(document.querySelector('canvas[data-hardware-binding-ribbon-count]')?.dataset.hardwareBindingRibbonCount)===count+1,baseBinding,{timeout:20000})
  await tabs.getByRole('tab',{name:'Topstitch',exact:true}).click()
  await browserPanel.getByRole('button',{name:'+ Add topstitch'}).click()
  await page.waitForFunction(count=>Number(document.querySelector('canvas[data-hardware-topstitch-rendered-rows]')?.dataset.hardwareTopstitchRenderedRows)>count,baseStitches,{timeout:20000})
  const stitches=editor.locator('[data-property-field="rows"] input[type=number]')
  await stitches.fill('3')
  await stitches.press('Enter')
  await page.waitForFunction(count=>Number(document.querySelector('canvas[data-hardware-topstitch-rendered-rows]')?.dataset.hardwareTopstitchRenderedRows)>=count+3,baseStitches,{timeout:20000})
  assert.deepEqual(errors,[],'Browser errors')
  console.log(JSON.stringify({pass:true,baseBinding,configuredBindingMm:35,bindingVisibilityWorks:true,baseStitches,threeRowTopstitch:true,errors},null,2))
}finally{
  await browser?.close().catch(()=>{})
  try{process.kill(-server.pid,'SIGTERM')}catch{}
}
