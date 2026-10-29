// Browser-level acceptance of CLO-style movable Steam and Sewing Length tools.
// Uses a disposable Chrome session and a temporary Vite instance; no garment edits.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const url='http://127.0.0.1:5697'
const server=spawn(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5697','--strictPort'],
  {cwd:root,detached:true,stdio:'ignore'})
let browser
try {
  let ready=false
  for(let i=0;i<75;i++){
    try {if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}
    await sleep(200)
  }
  assert(ready,'Disposable Vite did not respond')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1660,height:1020}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(url+'/?desktop=1&testSession=finishing-ui',{waitUntil:'domcontentloaded'})
  const seamTool=page.locator('[data-clo-slot="2d:B04"]')
  const steamTool=page.locator('[data-clo-slot="2d:B05"]')
  await seamTool.waitFor({timeout:30000})
  await seamTool.click()
  const seam=page.locator('[data-clo-floating-widget="sewing"]')
  await seam.waitFor()
  assert.equal(await seamTool.getAttribute('aria-pressed'),'true','Sewing tool highlighted')
  await seam.getByRole('spinbutton',{name:'Length Difference threshold'}).fill('0.8')
  assert.equal(await seam.getByRole('spinbutton',{name:'Length Difference threshold'}).inputValue(),'0.8')
  await steamTool.click()
  const steam=page.locator('[data-clo-floating-widget="steam"]')
  await steam.waitFor()
  assert.equal(await steamTool.getAttribute('aria-pressed'),'true','Steam tool highlighted')
  assert.equal(await seamTool.getAttribute('aria-pressed'),'false','Inactive sewing button no longer blue')
  assert.equal(await seam.count(),0,'Switching to Steam closes the previous Sewing dialog')
  const shrink=steam.getByRole('slider',{name:'Shrinkage'})
  await shrink.fill('-12')
  assert.equal(await steam.getByRole('spinbutton',{name:'Shrinkage numeric value'}).inputValue(),'-12')
  const old=await steam.boundingBox()
  assert(old?.width>=340,'Steam panel should be visible')
  const drag=steam.locator('.clo-floating-tool-header')
  const header=await drag.boundingBox()
  await page.mouse.move(header.x+header.width/2,header.y+header.height/2)
  await page.mouse.down()
  await page.mouse.move(header.x+header.width/2-85,header.y+header.height/2+110,{steps:8})
  await page.mouse.up()
  const moved=await steam.boundingBox()
  assert(Math.abs(moved.x-old.x)>40&&Math.abs(moved.y-old.y)>50,
    'Steam widget should drag in both axes')
  const steamScreenshot=path.join(root,'screenshots','exo-v2-steam-floating-widget-20261017.png')
  await page.screenshot({path:steamScreenshot})
  await steam.getByRole('button',{name:'Close Steam Brush'}).click()
  assert.equal(await steam.count(),0,'Steam widget closed')
  await seamTool.click()
  assert.equal(await seamTool.getAttribute('aria-pressed'),'true','Sewing re-activates')
  await seam.waitFor()
  assert.equal(await steam.count(),0,'Switching back to Sewing closes Steam')
  assert.equal(await seam.getByRole('spinbutton',{name:'Length Difference threshold'}).inputValue(),'0.8','Sewing tolerance persists across widget switches')
  const screenshot=path.join(root,'screenshots','exo-v2-sewing-floating-widget-20261017.png')
  await page.screenshot({path:screenshot})
  assert.deepEqual(errors,[],'Browser runtime errors')
  console.log(JSON.stringify({pass:true,singleActiveWidget:true,sewingThreshold:true,steamSlider:true,highlightSwitch:true,independentClose:true,dragged:{dx:Math.round(moved.x-old.x),dy:Math.round(moved.y-old.y)},errors,screenshot,steamScreenshot},null,2))
}finally{
  await browser?.close().catch(()=>{})
  try{process.kill(-server.pid,'SIGTERM')}catch{}
}
