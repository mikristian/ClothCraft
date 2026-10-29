import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import path from 'node:path'

const url=process.env.TECHPACK_URL||'http://127.0.0.1:6288'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const report={url,checks:[],errors:[]}
const good=(check,predicate)=>{assert(predicate,check);report.checks.push(check)}
try{
 const page=await browser.newPage({viewport:{width:1510,height:960},acceptDownloads:true})
 page.on('pageerror',e=>report.errors.push(e.message))
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000})
 await page.getByText('Technical package / Editor').waitFor({timeout:10000})
 good('Document builder renders',await page.getByText('Technical package / Editor').isVisible())
 const style=page.locator('.type-overview input').nth(2)
 await style.fill('QA-STYLE-101')
 good('Factory style number is editable',await style.inputValue()==='QA-STYLE-101')
 await page.getByRole('button',{name:'Insert widget'}).click()
 await page.getByRole('button',{name:/Rich text \/ notes/}).click()
 good('Modular widget inserted',await page.locator('.type-notes').count()===1)
 await page.getByRole('button',{name:'Save version'}).first().click()
 await page.getByRole('button',{name:'Version history'}).click()
 good('Immutable revision exists',await page.getByText('Revision 1').count()>0)
 await page.getByRole('button',{name:'Samples & fit'}).click()
 await page.getByRole('button',{name:'Add sample round'}).click()
 good('Sample timeline records proto',await page.getByText('Proto 01').count()>0)
 const firstMeasure=page.locator('.sample-review tbody tr').first()
 const target=Number(await firstMeasure.locator('td').nth(2).innerText())
 const actual=page.getByLabel('Actual sample A')
 await actual.fill(String(target+2))
 good('Measured sample outside tolerance is flagged',await firstMeasure.getByText('Review').count()===1)
 await actual.fill(String(target))
 good('Measured sample within tolerance is accepted',await firstMeasure.getByText('Pass').count()===1)
 await page.getByRole('button',{name:'Version history'}).click()
 page.once('dialog',dialog=>dialog.accept('Sample Factory A'))
 await page.getByRole('button',{name:'Save factory issue'}).click()
 good('Factory-specific frozen revision recorded',await page.getByText('Factory issue: Sample Factory A').count()===1)
 await page.getByRole('button',{name:'Costing & BOM'}).click()
 good('Live landed estimate visible',await page.getByText('Estimated landed').count()>0)
 await page.getByRole('button',{name:'Artwork & callouts'}).click()
 good('SVG annotation editor available',await page.getByLabel('Garment annotation editor').count()===1)
 await page.getByRole('button',{name:'Add pin'}).click()
 await page.locator('.tp-annotation-stage svg').click({position:{x:120,y:150}})
 good('A new callout pin was created',await page.getByText('2 CALLOUTS').count()===0&&await page.getByText('4 CALLOUTS').count()===1)
 const downloadEvent=page.waitForEvent('download')
 await page.getByRole('button',{name:'Export techpack'}).click()
 const file=await downloadEvent
 const json=JSON.parse(await readFile(await file.path(),'utf8'))
 good('JSON contains editable style, factory issue, sample measurements and callouts',json.pack.style==='QA-STYLE-101'&&json.pack.revisions.length===2&&json.pack.revisions[1].factory==='Sample Factory A'&&json.pack.samples.length===1&&json.pack.samples[0].measurements&&json.pack.annotations.length===4)
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Version history'}).click()
 good('Local edits survive browser reload',await page.getByText('Revision 1').count()>0)
 await page.screenshot({path:path.resolve('techpack-ui-qa.png')})
 good('No uncaught browser errors',report.errors.length===0)
 report.pass=true
}catch(error){report.pass=false;report.failure=error.stack||String(error);process.exitCode=1}
finally{console.log(JSON.stringify(report,null,2));await browser.close()}
