import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5194/?desktop=1&engine=legacy&testSession=qa-2d-arrange-pants-20261018',{waitUntil:'domcontentloaded',timeout:60000})
  await page.getByRole('button',{name:'Browse garments'}).waitFor({timeout:30000})
  await page.getByRole('navigation',{name:'Library categories'}).getByRole('button',{name:'Garment',exact:true}).click()
  const pants=page.locator('[data-library-hover-id="Garment:pants"]')
  await pants.waitFor({state:'visible',timeout:20000})
  await pants.click()
  await page.getByRole('navigation',{name:'Library categories'}).getByRole('button',{name:'Patterns',exact:true}).click()
  const arrange=page.getByRole('button',{name:'ARRANGE CURRENT 2D IN 3D'})
  await arrange.waitFor({state:'visible',timeout:12000})
  await arrange.click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.getAttribute('data-viewport-layout')==='split',{timeout:12000})
  const announcement=await page.locator('body').innerText()
  assert.match(announcement,/Arranged 4 pattern panels around the avatar/)
  assert.deepEqual(errors,[])
  console.log('PASS selected Pants library garment -> 2D drafting -> arrange four authored panels into split 3D workspace, no browser errors')
}finally{await browser.close()}
