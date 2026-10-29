import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
 const page=await browser.newPage({viewport:{width:1640,height:980}})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&testSession=v2-collapse-qa',{waitUntil:'domcontentloaded',timeout:30000})
 const button=page.getByRole('button',{name:'Collapse 3D viewer for full-width 2D patterns'}).first()
 await button.waitFor({timeout:25000})
 const initial=await page.locator('.workspaces').getAttribute('data-viewport-layout')
 await button.click()
 await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='2d')
 const visible2d=await page.locator('.cc-viewport-2d').first().isVisible()
 const hidden3d=!(await page.locator('.cc-viewport-3d').first().isVisible())
 assert(visible2d&&hidden3d,'2D must fill viewport and 3D must hide')
 await page.getByRole('button',{name:'Restore 3D viewer'}).click()
 await page.waitForFunction(layout=>document.querySelector('.workspaces')?.dataset.viewportLayout===layout,initial)
 assert(await page.locator('.cc-viewport-3d').first().isVisible())
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,installedV2:true,initial,expanded2d:visible2d,collapsed3d:hidden3d,restored3d:true,pageErrors:0}))
} finally {await browser.close()}
