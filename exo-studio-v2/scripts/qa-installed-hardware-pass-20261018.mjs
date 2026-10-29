import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try{
 const page=await b.newPage({viewport:{width:1512,height:982}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5386/?desktop=1',{waitUntil:'domcontentloaded'});await page.locator('canvas').first().waitFor({timeout:30000});await page.waitForTimeout(1500)
 console.log(JSON.stringify({title:await page.title(),tabs:await page.getByRole('tab').allTextContents(),buttons:(await page.getByRole('button').allTextContents()).filter(s=>/ardware|ibrary|rim/.test(s)),errors}))
 await page.getByRole('button',{name:'Hardware and Trims',exact:true}).click();
 const button=page.locator('[data-library-hover-id="hardware:four-hole-shirt-button"]');await button.hover();await page.locator('[data-model-status="loaded"]').waitFor({timeout:20000});
 await page.screenshot({path:'/tmp/exo-installed-hardware-pass-20261018.png'})
 assert.deepEqual(errors,[])
}finally{await b.close()}
