import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-gpu']})
const page=await browser.newPage({viewport:{width:1650,height:960}})
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
try{
  await page.goto('http://127.0.0.1:5174/?engine=clothcraft&techpackWorkspace=1',{waitUntil:'domcontentloaded',timeout:30000})
  const front=page.locator('[data-techpack-sheet="overview"] [data-board-object="render-front"]')
  await front.waitFor({timeout:30000})
  for(const view of ['front','back','side'])assert.equal(await page.locator(`[data-techpack-sheet="overview"] [data-board-object="render-${view}"]`).count(),1)
  await page.getByRole('button',{name:'Select tool'}).first().click()
  await front.locator('.tpws-object-transform-cover').click({force:true})
  await page.getByLabel('Object x').fill('27')
  await page.getByLabel('Object x').press('Tab')
  await page.waitForFunction(()=>document.querySelector('[data-board-object="render-front"]')?.style.transform.includes('translate(27px'))
  const otherBefore=await page.locator('[data-board-object="render-back"]').getAttribute('style')
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#1263bc"/></svg>'
  await page.locator('input[aria-label="Upload techpack reference assets"]').setInputFiles({name:'render-qa.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)})
  await front.locator('.tpws-object-transform-cover').click({force:true})
  await page.getByRole('tab',{name:'Assets'}).click()
  await page.locator('.tpws-native-assets button').filter({hasText:'render-qa'}).first().click()
  await page.getByRole('button',{name:'Replace selected object',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('[data-board-object="render-front"] img')?.src.startsWith('data:image/svg+xml'))
  assert.match(await front.getAttribute('style'),/translate\(27px,/)
  assert.equal(await page.locator('[data-board-object="render-back"]').getAttribute('style'),otherBefore)
  assert.deepEqual(errors,[])
  console.log('PASS_TECHPACK_INDEPENDENT_RENDERS',{views:3,frontOffset:27,replaced:true,otherUnchanged:true})
}catch(error){console.error('FAIL_TECHPACK_INDEPENDENT_RENDERS',error.message,errors);process.exitCode=1}
finally{await browser.close()}
