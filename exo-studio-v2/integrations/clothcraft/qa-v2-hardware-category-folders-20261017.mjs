// Disposable native/Vite browser acceptance for the Hardware and Trims hierarchy.
// The real CLO license assets are served locally; user's saved garment is untouched.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-v2-hardware-folders-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativeBin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(nativeBin),'Native Rust executable unavailable')
const nativePort=5923,webPort=5924,native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${webPort}`
const children=[]
const events=[]
function start(file,args,env={}){
 const child=spawn(file,args,{cwd:root,detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,...env}})
 children.push(child)
 for(const stream of [child.stderr,child.stdout])stream.on('data',buffer=>events.push(String(buffer).slice(0,1200)))
}
async function ready(url){
 for(let i=0;i<160;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}
  await pause(250)
 }
 throw Error(`Unable to start QA service ${url}: ${events.slice(-8).join('\n')}`)
}
let browser
const logs=[]
try{
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
   EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
   EXO_CLOTHCRAFT_SESSION_BIN:nativeBin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
 })
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(webPort),'--strictPort'],{
   VITE_CLOTHCRAFT_BRIDGE_URL:native,
 })
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
   args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1640,height:1050}})
 page.on('pageerror',error=>logs.push(error.message))
 await page.route('**/workspace',async route=>{
   const headers={...route.request().headers()};delete headers.origin
   const response=await route.fetch({url:native+'/workspace',headers})
   await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=hardware-folders',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:60000})
 await page.locator('.clo-library-categories button').filter({hasText:'Hardware and Trims'}).first().click()
 const rootFolder=page.locator('[data-hardware-and-trims-toggle]')
 await rootFolder.waitFor({state:'visible',timeout:15000})
 assert.equal(await rootFolder.getAttribute('aria-expanded'),'true')
 await page.waitForFunction(()=>document.querySelector('.exo-hardware-library-summary')?.textContent?.includes('162 imported assets'),null,{timeout:20000})
 assert.equal(await page.locator('[data-clo-imported-library-toggle]').count(),0,'Obsolete monolithic CLO folder still visible')
 await rootFolder.click()
 assert.equal(await rootFolder.getAttribute('aria-expanded'),'false')
 assert.equal(await page.locator('[data-hardware-category-folder]').count(),0,'Main Hardware and Trims folder did not collapse')
 await rootFolder.click()
 assert.equal(await rootFolder.getAttribute('aria-expanded'),'true')
 const categories={button:45,buttonhole:10,slider:29,puller:52,stopper:7,tape:18,graphic:1}
 let total=0
 for(const [kind,expected] of Object.entries(categories)){
   const group=page.locator(`[data-hardware-category-folder="${kind}"]`)
   const button=group.locator('.exo-hardware-folder-toggle').first()
   await button.waitFor({state:'visible',timeout:12000})
   assert((await button.getAttribute('aria-label')).length>4)
   if((await button.getAttribute('aria-expanded'))==='false')await button.click()
   await page.waitForFunction(({kind,expected})=>document.querySelectorAll(`[data-hardware-category-folder="${kind}"] .clo-imported-tile`).length===expected,{kind,expected},{timeout:12000})
   const count=await group.locator('.clo-imported-tile').count()
   assert.equal(count,expected,`${kind} imported assets missing/misfiled`)
   total+=count
   await button.click()
   assert.equal(await group.locator('.clo-imported-tile').count(),0,`${kind} folder did not collapse`)
 }
 assert.equal(total,162,'Not all CLO imports appear in their matching folders')
 // Imported source-only objects still receive the same non-intercepting hover
 // preview as EXO hardware. Never pretend a .bth reference is a 3D mesh.
 const buttonholeFolder=page.locator('[data-hardware-category-folder="buttonhole"]')
 await buttonholeFolder.locator('.exo-hardware-folder-toggle').first().click()
 await buttonholeFolder.locator('.clo-imported-tile').first().hover()
 const referenceHover=page.locator('[data-library-preview^="hardware:"]')
 await referenceHover.waitFor({state:'visible',timeout:8000})
 await referenceHover.locator('[data-hardware-hover-reference]').waitFor({state:'visible'})
 assert.equal(await page.locator('.clo-imported-overlay').count(),0,'Hover unexpectedly opened blocking click modal')
 await buttonholeFolder.locator('.exo-hardware-folder-toggle').first().click()
 await page.getByRole('textbox',{name:'Search library'}).fill('YKK')
 await page.waitForFunction(()=>document.querySelectorAll('.clo-imported-tile').length===21,null,{timeout:10000})
 assert.equal(await page.locator('[data-hardware-category-folder="puller"] .clo-imported-tile').count(),10)
 assert.equal(await page.locator('[data-hardware-category-folder="slider"] .clo-imported-tile').count(),11)
 const ykkHoverTile=page.locator('[data-hardware-category-folder="puller"] .clo-imported-tile').first()
 await ykkHoverTile.scrollIntoViewIfNeeded()
 await page.mouse.move(5,5)
 await pause(250)
 await ykkHoverTile.hover()
 const modelHover=page.locator('[data-library-preview^="hardware:"]')
 await modelHover.waitFor({state:'visible',timeout:8000})
 await modelHover.locator('.clo-imported-model[data-model-preview-ready="true"] canvas').waitFor({state:'visible',timeout:25000})
 const geom=await modelHover.locator('canvas').boundingBox()
 assert(geom&&geom.width>100&&geom.height>100,'Hardware hover did not display a usable large 3D model')
 const hoverText=await modelHover.innerText()
 assert(!/\bCLO\b/i.test(hoverText),'Hover popup still labels item CLO')
 assert(!/\bCLO\b/i.test(await ykkHoverTile.innerText()),'Hardware tile still labels item CLO')
 await page.screenshot({path:path.join(output,'ykk-hardware-hover.png')})
 await page.locator('[data-hardware-category-folder="puller"] .clo-imported-tile').first().click()
 const preview=page.getByRole('dialog',{name:/asset preview/i})
 await preview.waitFor({state:'visible',timeout:15000})
 await preview.locator('.clo-imported-model canvas').waitFor({state:'visible',timeout:20000})
 await preview.locator('[data-clo-imported-place]').waitFor({state:'visible'})
 // The new folders must retain the original asset-selection and placement callbacks.
 await preview.locator('[data-clo-imported-place]').click()
 await page.locator('[data-imported-hardware-editor="placed"]').waitFor({state:'visible',timeout:20000})
 const snapshot=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({op:'snapshot'})}).then(r=>r.json())
 assert(snapshot.ok,'Native snapshot failed')
 assert.equal(snapshot.data.importedHardware?.length,1,'Folder preview lost native placement callback')
 assert.match(snapshot.data.importedHardware[0].assetId,/ykk/i)
 assert.deepEqual(logs,[],'Browser errors in hardware hierarchy')
 console.log(JSON.stringify({pass:true,disposable:true,mainFolderCollapsible:true,
  importedByFolder:categories,importedTotal:total,ykkSearchCount:21,
  ykkPullers:10,ykkSliders:11,modelHover:true,sourceReferenceHover:true,
  cleanLabels:true,hoverActualModelReady:true,preview:true,nativePlacement:true,pageErrors:logs.length,output},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
