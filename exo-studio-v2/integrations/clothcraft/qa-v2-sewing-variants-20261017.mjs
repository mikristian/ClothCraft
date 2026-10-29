// Disposable native Rust + headless Vite acceptance for CLO B02 / B03.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-sewing-variants-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Native Rust session binary missing')
const native='http://127.0.0.1:5687',ui='http://127.0.0.1:5688',children=[]
function launch(executable,args,env={}){const child=spawn(executable,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});children.push(child)}
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}await sleep(200)}throw Error('Server unavailable '+url)}
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:'5687',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5688','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1550,height:1000}}),errors=[],requests=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(r.url().endsWith('/workspace')&&r.method()==='POST'){try{requests.push(r.postDataJSON())}catch{}}})
 await page.route('**/workspace',async route=>{const headers={...route.request().headers()};delete headers.origin;const response=await route.fetch({url:native+'/workspace',headers});await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})})
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:40000})
 const segment=page.locator('[data-clo-slot="2d:B02"]'),free=page.locator('[data-clo-slot="2d:B03"]')
 assert.equal(await segment.getAttribute('data-clo-implementation'),'native')
 assert.equal(await free.getAttribute('data-clo-implementation'),'native')
 await segment.click()
 const panel=page.locator('[data-native-sewing-panel="true"]')
 await panel.waitFor({state:'visible'})
 await page.waitForFunction(()=>document.querySelector('[data-native-sewing-panel]')?.dataset.sewingVariant==='segment')
 assert.equal(await panel.locator('input[type=number]').count(),0,'Segment must use full ranges without editable partial range fields')
 assert.match(await panel.innerText(),/SEGMENT SEWING/)
 await free.click()
 await page.waitForFunction(()=>document.querySelector('[data-native-sewing-panel]')?.dataset.sewingVariant==='free')
 await panel.locator('summary').click()
 assert.equal(await panel.locator('input[type=number]').count(),4,'Free sewing must expose four range endpoints')
 const first=panel.getByRole('spinbutton',{name:'Free sewing edge A start'})
 await first.fill('0.2')
 assert.equal(await first.inputValue(),'0.2')
 await segment.click()
 await page.waitForFunction(()=>document.querySelector('[data-native-sewing-panel]')?.dataset.sewingVariant==='segment')
 await free.click()
 await page.waitForFunction(()=>document.querySelector('[data-native-sewing-panel]')?.dataset.sewingVariant==='free')
 await panel.locator('summary').click()
 assert.equal(await panel.getByRole('spinbutton',{name:'Free sewing edge A start'}).inputValue(),'0','Switching variants must reset full range')
 assert.deepEqual(errors,[],'Headless page exceptions')
 assert(requests.some(x=>x.op==='snapshot'),'Native backend was never queried')
 console.log(JSON.stringify({pass:true,segmentNative:true,freeNative:true,segmentFullRanges:true,freeEditableRanges:true,variantReset:true,rustSession:true,errors,output},null,2))
}finally{await browser?.close().catch(()=>{});for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}}
