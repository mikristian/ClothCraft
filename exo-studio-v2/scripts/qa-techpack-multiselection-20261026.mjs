import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-gpu']})
const page=await browser.newPage({viewport:{width:1650,height:960}})
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
try{
  await page.goto('http://127.0.0.1:5174/?engine=clothcraft&techpackWorkspace=1',{waitUntil:'domcontentloaded',timeout:30000})
  const front=page.locator('[data-techpack-sheet="overview"] [data-board-object="render-front"]')
  const back=page.locator('[data-techpack-sheet="overview"] [data-board-object="render-back"]')
  await front.waitFor({timeout:30000})
  await page.getByRole('button',{name:'Select tool'}).first().click()
  await front.locator('.tpws-object-transform-cover').click({force:true})
  await back.locator('.tpws-object-transform-cover').click({force:true,modifiers:['Shift']})
  await page.getByRole('group',{name:'Align selected layers'}).waitFor()
  assert.equal(await page.locator('[data-techpack-sheet="overview"] .tpws-object-selected').count(),2)
  assert.match(await page.getByText('2 selected layers').first().innerText(),/2 selected layers/)

  const firstBefore=await front.getAttribute('style')
  const secondBefore=await back.getAttribute('style')
  await page.getByRole('button',{name:'Bring forward'}).click()
  const firstAfter=await front.getAttribute('style')
  const secondAfter=await back.getAttribute('style')
  assert.notEqual(firstBefore,firstAfter)
  assert.notEqual(secondBefore,secondAfter)

  await page.getByRole('group',{name:'Align selected layers'}).getByRole('button',{name:'Left'}).click()
  assert.match(await front.getAttribute('style'),/translate\(/)
  assert.match(await back.getAttribute('style'),/translate\(/)
  await page.getByRole('button',{name:'Clear selection'}).click()
  assert.equal(await page.locator('[data-techpack-sheet="overview"] .tpws-object-selected').count(),0)
  assert.deepEqual(errors,[])
  console.log('PASS_TECHPACK_MULTI_SELECTION',{selected:2,bringForward:true,align:true,clear:true,runtimeErrors:0})
}catch(error){console.error('FAIL_TECHPACK_MULTI_SELECTION',error.stack||error.message,errors);process.exitCode=1}
finally{await browser.close()}
