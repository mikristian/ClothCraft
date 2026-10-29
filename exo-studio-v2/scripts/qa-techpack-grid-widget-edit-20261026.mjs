import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-gpu']})
const page=await browser.newPage({viewport:{width:1630,height:960}})
page.setDefaultTimeout(12000)
try{
  await page.goto('http://127.0.0.1:5174/?engine=clothcraft&techpackWorkspace=1',{waitUntil:'domcontentloaded'})
  await page.locator('[data-techpack-sheet="patterns"]').waitFor({timeout:30000})
  await page.getByRole('button',{name:'Add custom page'}).evaluate(node=>node.click())
  const custom=page.locator('[data-custom-blank="true"]').last()
  await custom.waitFor()
  await page.getByRole('button',{name:'Insert Excel table widget'}).evaluate(node=>node.click())
  const grid=custom.locator('.tps').first()
  await grid.waitFor()
  const cell=grid.locator('td').first()
  const details=await cell.evaluate(node=>{const r=node.getBoundingClientRect();const target=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {readOnly:!node.closest('.tps').querySelector('.tps-formula input')?.disabled,rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:target?.className,hitTag:target?.tagName,layout:!!node.closest('.tpbc-layout'),cover:!!node.closest('[data-board-object]')?.querySelector('.tpws-object-transform-cover')}})
  console.log('GRID_DIAG',JSON.stringify(details))
  await cell.dblclick()
  console.log('AFTER_DBLCLICK',JSON.stringify(await grid.evaluate(node=>({editor:node.querySelectorAll('.tps-editor').length,layout:!!node.closest('.tpbc-layout'),active:document.activeElement?.className}))))
  await grid.locator('.tps-editor').first().waitFor({timeout:3000})
  await grid.locator('.tps-editor').first().fill('MATERIAL TEST')
  await grid.locator('.tps-editor').first().press('Enter')
  await page.waitForFunction(()=>document.querySelector('[data-custom-blank] .tps td')?.textContent?.trim()==='MATERIAL TEST')
  assert.equal(await cell.innerText(),'MATERIAL TEST')
  console.log('PASS grid edit from inserted custom page widget')
}catch(error){console.error('FAIL grid edit',error.message);process.exitCode=1}
finally{await browser.close()}
