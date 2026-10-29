/** Real installed EXO: grading toolbar opens per 2D entry, not per render. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
let browser,stage='launch'
const errors=[]
try{
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
 const page=await browser.newPage({viewport:{width:1680,height:1010}})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&testSession=grade-toolbar-auto-on-2d-entry',{waitUntil:'domcontentloaded'})
 const combo=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 const popup=page.locator('[data-clo-floating-widget="grading-quick-toolbar"]')
 stage='first 2D entry auto-opens'
 await combo.selectOption('2d')
 await popup.waitFor({state:'visible',timeout:25000})
 const first=await popup.evaluate(el=>({title:el.getAttribute('aria-label'),width:el.getBoundingClientRect().width,embedded:el.dataset.embeddedIn,docked:el.dataset.docked}))
 assert(first.width>=120&&!first.embedded&&first.docked==='false','Grading toolbar must float visibly on 2D entry: '+JSON.stringify(first))
 assert.equal(await page.locator('.main-layout').getAttribute('data-inspector-visible'),'false','Grading toolbar unexpectedly expanded Object Browser')
 stage='manual close respected during 2D'
 await popup.getByRole('button',{name:'Close Grading Toolbar'}).click()
 await popup.waitFor({state:'detached',timeout:5000})
 await page.waitForTimeout(300)
 assert.equal(await popup.count(),0,'Toolbar reopened despite manual dismissal')
 stage='exit 2D then return automatically opens'
 await combo.selectOption('split')
 await combo.selectOption('2d')
 await popup.waitFor({state:'visible',timeout:12000})
 assert.equal(await page.locator('.main-layout').getAttribute('data-inspector-visible'),'false','Reentry reopened inspector instead of only the grading toolbar')
 stage='second manual close persists until next entry'
 await popup.getByRole('button',{name:'Close Grading Toolbar'}).click()
 await popup.waitFor({state:'detached',timeout:5000})
 await page.waitForTimeout(200)
 assert.equal(await popup.count(),0)
 await combo.selectOption('3d')
 await combo.selectOption('2d')
 await popup.waitFor({state:'visible',timeout:12000})
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,installedEXO:true,
  openedOnInitial2dEntry:true,reopenedAfterSplitReturn:true,reopenedAfter3dReturn:true,
  manualCloseRespected:true,objectBrowserUnaffected:true,pageErrors:0}))
}catch(e){console.error(JSON.stringify({passed:false,stage,error:e.message,errors,stack:e.stack}));process.exitCode=1}
finally{await browser?.close().catch(()=>{})}
