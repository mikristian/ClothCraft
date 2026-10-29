import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const origin=process.env.EXO_QA_ORIGIN||'http://127.0.0.1:5174'
const chrome=process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-gpu']})
const page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true})
page.setDefaultTimeout(15000)
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
const pass=(name,data)=>console.log('PASS '+name+': '+JSON.stringify(data))
try{
 await page.goto(origin+'/?techpackWorkspace=1',{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('[data-techpack-sheet="patterns"]').waitFor({timeout:30000})
 const before=await page.locator('[data-techpack-sheet]').count()
 await page.getByRole('button',{name:'Add custom page'}).evaluate(node=>node.click())
 const artboard=page.locator('[data-custom-blank="true"]').last()
 await artboard.waitFor({timeout:22000})
 await page.getByRole('tab',{name:'Templates'}).click()
 await page.getByRole('button',{name:'Open Table templates templates'}).click()
 const card=page.locator('.tpws-template-card').filter({hasText:'Factory POM with tolerances'}).first()
 await card.waitFor()
 await card.getByRole('button',{name:'Insert table'}).evaluate(node=>node.click())
 const grid=artboard.locator('.tps').first()
 await grid.waitFor({timeout:17000})
 const columns=await grid.locator('th.tps-colhead').count()
 assert.equal(columns,12)
 assert.equal(await page.locator('[data-techpack-sheet]').count(),before+1)
 pass('Factory POM preset yields editable 12-column table',columns)
 await grid.locator('td').first().dblclick({force:true})
 const input=grid.locator('.tps-editor').first()
 await input.fill('=SUM(1,2,3)')
 await input.press('Enter')
 await page.waitForTimeout(1000)
 await page.waitForFunction(()=>document.querySelector('[data-custom-blank="true"] .tps-scroll td')?.textContent?.trim()==='6',null,{timeout:12000})
 await grid.locator('td').first().click({force:true})
 assert.equal(await grid.getByRole('textbox',{name:'Formula bar'}).inputValue(),'=SUM(1,2,3)')
 assert.equal((await grid.locator('.tps-result').innerText()).trim(),'6')
 pass('Formula calculates and retains raw expression','6 / =SUM(1,2,3)')
 const downloadPromise=page.waitForEvent('download',{timeout:15000})
 await page.getByRole('button',{name:'Export editable Excel workbook'}).evaluate(node=>node.click())
 const download=await downloadPromise
 assert.match(download.suggestedFilename(),/\.xlsx$/)
 pass('XLSX exported',download.suggestedFilename())
 assert.deepEqual(errors,[])
 pass('Browser JavaScript errors',0)
}catch(error){
 console.error('FAIL TECHPACK TABLE LIBRARY QA',error.stack||error.message)
 console.error('JavaScript errors',JSON.stringify(errors))
 process.exitCode=1
}finally{await browser.close()}
