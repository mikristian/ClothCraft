// Isolated native Rust + EXO V2 browser acceptance for graphic layer selection,
// visibility, physical measurements and persistence. Uses no user project.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(root,'integrations/clothcraft/output/qa-v2-graphic-layer-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const api='http://127.0.0.1:5781',ui='http://127.0.0.1:5782',children=[]
const reports={output,checks:[],pageErrors:[]}
function start(binary,args,env={}){
 const child=spawn(binary,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<120;i++){
  if(children.some(child=>child.exitCode!==null))throw Error('Native QA service exited')
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,250))
 }
 throw Error('Service unavailable: '+url)
}
let browser
try{
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:'5781',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
 })
 start(path.join(root,'node_modules/.bin/vite'),['preview','--host','127.0.0.1','--port','5782','--strictPort','--outDir','dist'])
 await Promise.all([ready(api+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1600,height:1050}})
 page.on('pageerror',error=>reports.pageErrors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:api+'/workspace',headers,timeout:30000})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded',timeout:60000})
 await page.locator('.cc-board [data-panel="front"]').first().waitFor({timeout:45000})
 await page.getByRole('tab',{name:'Graphic',exact:true}).click()
 const editor=page.locator('#cc-native-graphic-editor .cc-graphic-editor')
 await editor.waitFor({state:'visible',timeout:20000})
 assert.equal(await page.locator('#cc-native-graphic-editor').count(),1)
 assert.equal(await editor.locator('.cc-graphic-list').count(),0,'Layers belong in the Object Browser')
 assert.equal(await page.locator('.clo-property-panel .clo-pe-list').count(),0,'Native graphics need dedicated lower inspector')
 reports.checks.push('Native editor mounted directly in lower Property Editor without duplicate list')
 const art1='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"><rect width="300" height="150" fill="#e3446a"/></svg>'
 await editor.locator('input[type=file]').first().setInputFiles({name:'first-print.svg',mimeType:'image/svg+xml',buffer:Buffer.from(art1)})
 const rows=page.locator('.clo-object-graphic-row')
 await rows.first().waitFor({timeout:30000})
 await page.waitForFunction(()=>document.querySelector('.clo-object-graphic-thumbnail')?.complete)
 assert.equal(await rows.count(),1)
 assert.equal(await rows.first().locator('.clo-object-graphic-toggle input').isChecked(),true)
 assert.equal(await rows.first().locator('.clo-object-graphic-thumbnail').count(),1)
 reports.checks.push('Actual artwork thumbnail and checked visibility appear in upper layer stack')
 const width=editor.locator('.cc-graphic-number-grid input').nth(2)
 await width.fill('75')
 await page.waitForFunction(()=>document.querySelector('.clo-object-graphic-row small')?.textContent.includes('75.0'))
 assert.equal(Number(await width.inputValue()),75)
 reports.checks.push('Physical width edit updates selected layer in millimeters')
 const art2='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180"><circle cx="120" cy="90" r="75" fill="#236de4"/></svg>'
 await editor.locator('input[type=file]').first().setInputFiles({name:'second-print.svg',mimeType:'image/svg+xml',buffer:Buffer.from(art2)})
 await rows.nth(1).waitFor({timeout:30000})
 assert.equal(await rows.count(),2)
 await rows.first().locator('.clo-object-select').click()
 await page.waitForFunction(()=>document.querySelector('.clo-object-graphic-row.selected .clo-object-row-name')?.textContent.includes('first-print.svg'))
 assert.equal(Number(await width.inputValue()),75)
 await rows.nth(1).locator('.clo-object-select').click()
 await page.waitForFunction(()=>document.querySelector('.clo-object-graphic-row.selected .clo-object-row-name')?.textContent.includes('second-print.svg'))
 assert.equal(Number(await width.inputValue()),100)
 reports.checks.push('Selecting each object changes lower physical controls, with independent dimensions')
 const firstCheck=rows.first().locator('input[type=checkbox]')
 await firstCheck.uncheck()
 await page.waitForFunction(()=>document.querySelector('.clo-object-graphic-row input[type=checkbox]')?.checked===false)
 assert.equal(await rows.nth(1).locator('input[type=checkbox]').isChecked(),true)
 await firstCheck.check()
 await page.waitForFunction(()=>document.querySelector('.clo-object-graphic-row input[type=checkbox]')?.checked===true)
 reports.checks.push('Visibility checkbox toggles only its graphic without changing selected layer')
 await page.waitForTimeout(950)
 await page.screenshot({path:path.join(output,'graphic-layers-and-properties.png'),fullPage:true})
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel="front"]').first().waitFor({timeout:45000})
 await page.getByRole('tab',{name:'Graphic',exact:true}).click()
 await page.locator('.clo-object-graphic-row').nth(1).waitFor({timeout:30000})
 assert.equal(await page.locator('.clo-object-graphic-row').count(),2)
 await page.locator('.clo-object-graphic-row').first().locator('.clo-object-select').click()
 assert.equal(Number(await page.locator('#cc-native-graphic-editor .cc-graphic-number-grid input').nth(2).inputValue()),75)
 reports.checks.push('Graphics and independent mm measurement survive native snapshot reload')
 assert.deepEqual(reports.pageErrors,[])
 reports.pass=true
 console.log(JSON.stringify(reports,null,2))
}catch(error){
 reports.pass=false;reports.failure=error.stack||String(error)
 console.error(JSON.stringify(reports,null,2))
 process.exitCode=1
}finally{
 writeFileSync(path.join(output,'results.json'),JSON.stringify(reports,null,2))
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
