import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
 const page=await browser.newPage({viewport:{width:1728,height:1040}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool]')}).first()
 await board.locator('[data-panel]').first().waitFor({timeout:30000})
 await page.getByRole('button',{name:'Edit Pattern',exact:true}).click()
 await board.locator('[data-edit-pattern-guide]').waitFor()
 assert.equal(await board.locator('svg[data-native-tool]').getAttribute('data-native-tool'),'point')
 const paper=await board.locator('[data-pattern-surface]').first().getAttribute('fill')
 assert.equal(paper,'#ffffff')
 await page.screenshot({path:'integrations/clothcraft/output/pattern-ui-backup-20261019/installed-after.png'})
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,installedURL:true,editPattern:true,paper,errors}))
}finally{await browser.close()}
