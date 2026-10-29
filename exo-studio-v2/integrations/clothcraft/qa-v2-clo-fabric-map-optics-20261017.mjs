/** Disposable draft project QA for CLO Fabric Material controls. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-clo-fabric-optics-'))
const ui='http://127.0.0.1:5188'
const server=spawn(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5188','--strictPort'],{
  cwd:root,detached:true,stdio:'ignore',env:process.env,
})
let browser
try {
  let started=false
  for(let i=0;i<100;i++){
    try {started=(await fetch(ui,{signal:AbortSignal.timeout(700)})).ok; if(started)break}catch{}
    await new Promise(resolve=>setTimeout(resolve,200))
  }
  assert(started,'Vite draft fixture failed to start')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1660,height:1050}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(`${ui}/?desktop=1&cloFabricOpticsQA=20261017`,{waitUntil:'domcontentloaded'})
  const tabs=page.getByRole('tablist',{name:'Object Browser types'})
  const editor=page.locator('.clo-property-panel')
  await tabs.getByRole('tab',{name:'Fabric',exact:true}).click()
  const row=page.locator('.clo-object-list .clo-object-select').first()
  await row.waitFor();await row.click()
  assert.equal(await editor.locator('.clo-pe-list').getAttribute('data-property-context'),'fabric')
  const heading=editor.getByRole('button',{name:'Material',exact:true}).first()
  if(await heading.getAttribute('aria-expanded')!=='true')await heading.click()
  const basic=editor.getByRole('region',{name:'Basic Parameters',exact:true})
  const reflection=editor.getByRole('region',{name:'Reflection',exact:true})
  const opacity=basic.locator('[data-property-field="opacity"] input[type="number"]')
  const intensity=reflection.locator('[data-property-field="reflectionIntensity"] input[type="number"]')
  await opacity.waitFor();await intensity.waitFor()
  assert.equal(Number(await opacity.inputValue()),100,'Default draft fabric opacity should be 100%')
  await opacity.fill('45');await opacity.press('Enter')
  await intensity.fill('1.75');await intensity.press('Enter')
  await row.click()
  assert.equal(Number(await opacity.inputValue()),45,'Draft opacity must persist on selection')
  assert.equal(Number(await intensity.inputValue()),1.75,'Draft reflection intensity must persist on selection')
  const mapEntry=editor.locator('[data-fabric-map="color"]')
  await mapEntry.getByRole('button',{name:'Show texture details'}).click()
  assert(await mapEntry.locator('.clo-pe-fabric-map-preview').isVisible(),'Texture row expands to display current state')
  const fileChooser=page.waitForEvent('filechooser')
  await mapEntry.getByRole('button',{name:'Choose map for Texture'}).click()
  const chooser=await fileChooser
  await chooser.setFiles({name:'fabric-test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5Qp0MAAAAASUVORK5CYII=','base64')})
  await mapEntry.locator('.clo-pe-fabric-map-preview img').waitFor({timeout:15000})
  assert(await mapEntry.getByRole('button',{name:'Replace map for Texture'}).isEnabled())
  assert(await mapEntry.getByRole('button',{name:'Preview map for Texture'}).isEnabled())
  await mapEntry.getByRole('button',{name:'Remove map for Texture'}).click()
  assert.equal(await mapEntry.locator('img').count(),0,'Remove resets assigned image and thumbnail')
  assert.equal(await editor.locator('[data-fabric-map="roughness"]').count(),1,'Roughness map must be represented')
  await page.locator('.clo-inspector').screenshot({path:path.join(output,'fabric-material.png'),animations:'disabled'})
  assert.deepEqual(errors,[],'No app render errors')
  console.log(JSON.stringify({passed:true,draftOpacityPercent:45,reflectionIntensity:1.75,mapChoosePreviewRemove:true,roughnessRow:true,pageErrors:errors,output}))
} finally {
  await browser?.close()
  try {process.kill(-server.pid,'SIGTERM')}catch{}
}
