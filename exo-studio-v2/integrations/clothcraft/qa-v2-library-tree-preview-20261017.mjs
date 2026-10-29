// Full library hierarchy and real imported hardware hover acceptance.
// Isolated native session and browser: never opens a user garment.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-library-tree-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativeBin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(nativeBin),'Native binary unavailable')
const nativePort=5943,webPort=5944,native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${webPort}`
const children=[],events=[],errors=[],checks=[]
function start(file,args,env={}) {
 const child=spawn(file,args,{cwd:root,detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,...env}})
 children.push(child)
 for(const stream of [child.stdout,child.stderr])stream.on('data',buffer=>events.push(String(buffer).slice(0,1000)))
}
async function ready(url) {
 for(let i=0;i<160;i++) {try {if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return} catch {} await pause(250)}
 throw Error(`Service not ready: ${url} ${events.slice(-5).join('\n')}`)
}
let browser
try {
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:nativeBin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
 })
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(webPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1720,height:1060}})
 page.on('pageerror',err=>errors.push(err.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=library-tree-preview',{waitUntil:'domcontentloaded'})
 await page.locator('.clo-library-categories').waitFor({timeout:60000})
 const categories=['Garment','Avatar','Hanger','Fabric','Hardware and Trims','Material','Stage','Patterns']
 const nav=page.locator('.clo-library-categories')
 assert.equal(await nav.locator('[data-library-tree-root]').count(),categories.length,'Expected eight top-level category roots')
 for(const name of categories) {
  const group=nav.locator(`[data-library-tree-category="${name}"]`)
  const node=nav.locator(`[data-library-tree-root="${name}"]`)
  assert.equal(await node.count(),1,`Category ${name} missing`)
  const toggle=group.getByRole('button',{name:`Toggle ${name} folders`}).or(node).first()
  if((await toggle.getAttribute('aria-expanded'))==='false')await toggle.click()
  assert.equal(await toggle.getAttribute('aria-expanded'),'true',`${name} failed expand`)
  const child=group.locator('[data-library-tree-child]').first()
  await child.waitFor({state:'visible',timeout:5000})
  const parentName=await child.innerText()
  await child.click()
  assert.equal(await node.getAttribute('aria-current'),'page',`Click child for ${name} did not open collection`)
  if((await child.getAttribute('aria-expanded'))==='true') {
   const branch=group.locator('.clo-library-tree-branch [data-library-tree-child]').first()
   await branch.waitFor({state:'visible',timeout:5000})
   await branch.click()
   assert.equal(await branch.getAttribute('aria-current'),'true',`Nested ${name} folder did not select on click`)
   await branch.dblclick()
   assert.equal(await branch.getAttribute('aria-current'),'true',`Nested ${name} folder did not select on doubleclick`)
  }
  await child.dblclick()
  assert.equal(await node.getAttribute('aria-current'),'page',`Doubleclick child for ${name} did not open collection`)
  await node.dblclick()
  assert.equal(await node.getAttribute('aria-current'),'page',`Click parent for ${name} did not navigate`)
  await node.dblclick()
  assert.equal(await node.getAttribute('aria-current'),'page',`Doubleclick parent for ${name} did not navigate`)
  if((await toggle.getAttribute('aria-expanded'))==='true')await toggle.click()
  assert.equal(await toggle.getAttribute('aria-expanded'),'false',`${name} failed collapse`)
  checks.push({category:name,child:parentName.trim(),expand:true,collapse:true,childClick:true,childDoubleClick:true,parentClick:true,parentDoubleClick:true})
 }
 // A tree folder must actually filter the assets, not merely highlight a row.
 await nav.locator('[data-library-tree-root="Garment"]').click()
 const garmentBottoms=nav.locator('[data-library-tree-category="Garment"] [data-library-tree-child="bottoms"]')
 await garmentBottoms.click()
 await nav.locator('[data-library-tree-category="Garment"] [data-library-tree-child="jeans"]').click()
 await page.waitForFunction(()=>document.querySelectorAll('.asset-library-content .garment-tile').length===2)
 assert.equal(await page.locator('.asset-library-content .garment-tile').count(),2,'Jeans folder failed to filter garment templates')
 await nav.locator('[data-library-tree-root="Hardware and Trims"]').click()
 const zipperParts=nav.locator('[data-library-tree-category="Hardware and Trims"] [data-library-tree-child="zipper-parts"]')
 await zipperParts.click()
 await nav.locator('[data-library-tree-category="Hardware and Trims"] [data-library-tree-child="puller"]').click()
 await page.waitForFunction(()=>document.querySelectorAll('.clo-imported-tile').length===52,null,{timeout:15000})
 assert.equal(await page.locator('.clo-imported-tile').count(),52,'Pullers folder failed to filter hardware assets')
 const search=page.getByRole('textbox',{name:'Search library'})
 await nav.locator('[data-library-tree-root]').filter({hasText:'Hardware and Trims'}).click()
 await search.fill('YKK')
 await page.waitForFunction(()=>document.querySelectorAll('.clo-imported-tile').length>0,null,{timeout:18000})
 assert.equal(await search.inputValue(),'YKK','Shared search lost query on category open')
 const ykkCount=await page.locator('.clo-imported-tile').count()
 assert(ykkCount>0,'Shared search did not filter hardware')
 await search.fill('')
 const folders=page.locator('[data-hardware-category-folder]')
 assert((await folders.count())>=7,'Hardware and Trims is missing its nested folders')
 const buttonFolder=page.locator('[data-hardware-category-folder="button"]')
 const buttonToggle=buttonFolder.locator('.exo-hardware-folder-toggle').first()
 if((await buttonToggle.getAttribute('aria-expanded'))==='false')await buttonToggle.click()
 assert.equal(await buttonToggle.getAttribute('aria-expanded'),'true','Button folder did not open')
 const darkButton=buttonFolder.locator('.clo-imported-tile').first()
 await darkButton.scrollIntoViewIfNeeded()
 await darkButton.hover()
 const hover=page.locator('[data-library-preview^="hardware:"]')
 await hover.waitFor({state:'visible',timeout:15000})
 const canvas=hover.locator('.clo-imported-model[data-model-preview-ready="true"] canvas')
 await canvas.waitFor({state:'visible',timeout:30000})
 await hover.screenshot({path:path.join(output,'button-full-hover.png')})
 const screenshot=path.join(output,'black-button-3d-hover.png')
 await canvas.screenshot({path:screenshot,animations:'disabled'})
 const python=`import json,sys\nfrom PIL import Image, ImageStat\nim=Image.open(sys.argv[1]).convert('RGB')\nluma=im.convert('L')\nhist=luma.histogram()\npixels=im.width*im.height\nprint(json.dumps(dict(width=im.width,height=im.height,min=next(i for i,n in enumerate(hist) if n),max=max(i for i,n in enumerate(hist) if n),bright=sum(hist[86:]),dark=sum(hist[:65]),mean=round(ImageStat.Stat(luma).mean[0],2),nontransparent=pixels)))`
 const pixels=JSON.parse(execFileSync('python3',['-c',python,screenshot],{encoding:'utf8'}))
 assert(pixels.width>=100&&pixels.height>=100,'Model preview is too small')
 assert(pixels.max-pixels.min>=45,`Dark button preview lacks visible contrast (${pixels.min}-${pixels.max})`)
 assert(pixels.bright>20&&pixels.dark>20,`Button silhouette and light highlights indistinct (${JSON.stringify(pixels)})`)
 assert.deepEqual(errors,[],'Runtime browser errors')
 console.log(JSON.stringify({pass:true,output,checks,sharedSearch:{term:'YKK',results:ykkCount},buttonHover:{actual3D:true,pixels},pageErrors:errors},null,2))
}catch(error){console.error(JSON.stringify({pass:false,error:error.message,completed:checks,errors,output},null,2));process.exitCode=1}
finally {await browser?.close().catch(()=>{});for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}}
