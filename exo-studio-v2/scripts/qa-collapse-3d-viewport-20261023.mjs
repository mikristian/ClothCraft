import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Disposable tab and tee session. Never touch an existing saved garment.
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const context=await browser.newContext({viewport:{width:1560,height:980}})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5297/?desktop=1&testSession=tee',{waitUntil:'domcontentloaded',timeout:30000})
  await page.locator('.workspaces').waitFor({state:'visible',timeout:25000})
  await page.locator('.clo-corner-toolkit-3d [data-tool-family="hand"]').waitFor({state:'attached',timeout:20000})
  const collapse=page.getByRole('button',{name:'Collapse 3D viewer for full-width 2D patterns'})
  assert.equal(await collapse.count(),1)
  const before=await page.evaluate(()=>({layout:document.querySelector('.workspaces')?.dataset.viewportLayout,project:localStorage.getItem('garment-studio-tee-first-fit-project-v2')}))
  await collapse.click()
  assert.equal(await page.locator('.workspaces').getAttribute('data-viewport-layout'),'2d')
  const editor=page.locator('.pattern-editor-shell')
  assert.ok(await editor.isVisible())
  assert.equal(await page.locator('.viewport-shell').isVisible(),false)
  const tab=page.getByRole('button',{name:'Restore 3D viewer'})
  assert.equal(await tab.count(),1)
  await tab.click()
  assert.equal(await page.locator('.workspaces').getAttribute('data-viewport-layout'),before.layout)
  assert.ok(await page.locator('.viewport-shell').isVisible())
  assert.equal(await page.evaluate(()=>localStorage.getItem('garment-studio-tee-first-fit-project-v2')),before.project)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,collapseUnderHand:true,editor2dExpanded:true,edgeRestore:true,restoredLayout:before.layout,projectPreserved:true,pageErrors:0}))
} finally {await browser.close()}
